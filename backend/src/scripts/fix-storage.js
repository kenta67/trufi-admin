require('dotenv').config();
const { Client } = require('pg');

async function fixStoragePolicies() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la BD');

    const sql = `
      -- Permisos para el bucket GTFS
      DROP POLICY IF EXISTS "Allow all to manage gtfs bucket" ON storage.objects;
      CREATE POLICY "Allow all to manage gtfs bucket" ON storage.objects
      FOR ALL USING (bucket_id = 'gtfs');

      -- Permisos para el bucket de reportes
      DROP POLICY IF EXISTS "Allow all to manage report-images bucket" ON storage.objects;
      CREATE POLICY "Allow all to manage report-images bucket" ON storage.objects
      FOR ALL USING (bucket_id = 'report-images');
    `;

    await client.query(sql);
    console.log('✅ Políticas de Storage actualizadas correctamente');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

fixStoragePolicies();
