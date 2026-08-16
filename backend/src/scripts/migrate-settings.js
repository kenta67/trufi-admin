require('dotenv').config();
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrateSettings() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL');

    // 1. Crear tabla app_settings
    const sql = `
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );

      ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Settings viewable by all" ON app_settings;
      CREATE POLICY "Settings viewable by all" ON app_settings
        FOR SELECT USING (true);

      DROP POLICY IF EXISTS "Staff can manage settings" ON app_settings;
      CREATE POLICY "Staff can manage settings" ON app_settings
        FOR ALL USING (true);

      -- Storage policies para system-assets
      DROP POLICY IF EXISTS "Allow all to read system-assets" ON storage.objects;
      CREATE POLICY "Allow all to read system-assets" ON storage.objects
        FOR SELECT USING (bucket_id = 'system-assets');

      DROP POLICY IF EXISTS "Allow all to manage system-assets" ON storage.objects;
      CREATE POLICY "Allow all to manage system-assets" ON storage.objects
        FOR ALL USING (bucket_id = 'system-assets');
    `;
    await client.query(sql);
    console.log('✅ Tabla app_settings y políticas de storage creadas');

    // 2. Crear bucket
    const { error: bucketError } = await supabaseAdmin.storage.createBucket('system-assets', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
    });
    if (bucketError && !bucketError.message.includes('already exists')) {
      console.log('⚠️ Warning al crear bucket (puede que ya exista):', bucketError.message);
    } else {
      console.log('✅ Bucket system-assets configurado');
    }

    // 3. Subir imagen original y establecerla en settings
    const originalImagePath = 'C:/Users/kenta/.gemini/antigravity-ide/brain/73569068-73b8-427f-80e0-b6283f7017c2/.tempmediaStorage/media_73569068-73b8-427f-80e0-b6283f7017c2_1786914376542.png';
    
    if (fs.existsSync(originalImagePath)) {
      const fileBuffer = fs.readFileSync(originalImagePath);
      const fileName = 'logo-default.png';
      
      const { error: uploadError } = await supabaseAdmin.storage
        .from('system-assets')
        .upload(fileName, fileBuffer, { contentType: 'image/png', upsert: true });

      if (uploadError) {
        console.error('❌ Error subiendo el logo:', uploadError);
      } else {
        const { data: urlData } = supabaseAdmin.storage.from('system-assets').getPublicUrl(fileName);
        
        // Guardar URL en app_settings
        await supabaseAdmin.from('app_settings').upsert({
          key: 'system_logo_url',
          value: urlData.publicUrl
        });
        
        console.log('✅ Logo inicial subido y guardado en app_settings:', urlData.publicUrl);
      }
    } else {
      console.log('⚠️ No se encontró la imagen original de logo para subir por defecto.');
    }

  } catch (error) {
    console.error('❌ Error general en migración:', error);
  } finally {
    await client.end();
  }
}

migrateSettings();
