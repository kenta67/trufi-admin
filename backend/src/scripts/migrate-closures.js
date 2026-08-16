require('dotenv').config();
const { Client } = require('pg');

async function migrate() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Crear tabla route_closures
    const sql = `
      CREATE TABLE IF NOT EXISTS route_closures (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        reason TEXT NOT NULL,
        description TEXT,
        coordinates JSONB NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_by UUID REFERENCES auth.users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );

      ALTER TABLE route_closures ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Closures viewable by all" ON route_closures;
      CREATE POLICY "Closures viewable by all" ON route_closures
        FOR SELECT USING (true);

      DROP POLICY IF EXISTS "Staff can manage closures" ON route_closures;
      CREATE POLICY "Staff can manage closures" ON route_closures
        FOR ALL USING (true);
    `;

    await client.query(sql);
    console.log('✅ Migración de cierres completada');
  } catch (error) {
    console.error('❌ Error en migración:', error);
  } finally {
    await client.end();
  }
}

migrate();
