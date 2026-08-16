/**
 * Script para crear tablas directamente en PostgreSQL usando el driver pg.
 * Ejecutar: node src/scripts/create-tables-pg.js
 */
require('dotenv').config();
const { Client } = require('pg');

async function createTables() {
  console.log('📋 Conectando directamente a PostgreSQL...\n');

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos\n');

    const sql = `
      -- Crear ENUMs si no existen
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('cliente', 'administrador', 'operador', 'tecnico');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE report_type AS ENUM ('calle_cerrada', 'bache', 'cambio_ruta', 'actividad_civica', 'otro');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE report_status AS ENUM ('pendiente', 'aprobado', 'rechazado', 'en_resolucion', 'resuelto');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      -- Tabla de perfiles
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT,
        avatar_url TEXT,
        role user_role DEFAULT 'cliente'::user_role NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );

      -- Tabla de rutas favoritas
      CREATE TABLE IF NOT EXISTS favorite_routes (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
        route_id TEXT NOT NULL,
        route_name TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        UNIQUE(user_id, route_id)
      );

      -- Tabla de reportes
      CREATE TABLE IF NOT EXISTS reports (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        client_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
        type report_type NOT NULL,
        description TEXT NOT NULL,
        image_url TEXT,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        status report_status DEFAULT 'pendiente'::report_status NOT NULL,
        operator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
        technician_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
        operator_notes TEXT,
        technician_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );

      -- Tabla de tarifas
      CREATE TABLE IF NOT EXISTS tariffs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        line_name TEXT,
        passenger_type TEXT NOT NULL,
        price DECIMAL(5,2) NOT NULL,
        description TEXT,
        updated_by UUID REFERENCES profiles(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );

      -- Tabla de versiones GTFS
      CREATE TABLE IF NOT EXISTS gtfs_versions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        version_hash TEXT NOT NULL UNIQUE,
        file_path TEXT NOT NULL,
        file_size BIGINT,
        changes_description TEXT,
        uploaded_by UUID REFERENCES profiles(id),
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `;

    console.log('📦 Creando tablas...');
    await client.query(sql);
    console.log('✅ Tablas creadas exitosamente\n');

    // RLS
    console.log('🔒 Configurando Row Level Security...');
    const rlsSQL = `
      ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE favorite_routes ENABLE ROW LEVEL SECURITY;
      ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
      ALTER TABLE tariffs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE gtfs_versions ENABLE ROW LEVEL SECURITY;
    `;
    await client.query(rlsSQL);
    console.log('✅ RLS habilitado\n');

    // Políticas
    console.log('📜 Creando políticas de seguridad...');
    const policies = [
      `DROP POLICY IF EXISTS "profiles_select" ON profiles; CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);`,
      `DROP POLICY IF EXISTS "profiles_update" ON profiles; CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);`,
      `DROP POLICY IF EXISTS "reports_select" ON reports; CREATE POLICY "reports_select" ON reports FOR SELECT USING (true);`,
      `DROP POLICY IF EXISTS "reports_insert" ON reports; CREATE POLICY "reports_insert" ON reports FOR INSERT WITH CHECK (true);`,
      `DROP POLICY IF EXISTS "reports_update" ON reports; CREATE POLICY "reports_update" ON reports FOR UPDATE USING (true);`,
      `DROP POLICY IF EXISTS "reports_delete" ON reports; CREATE POLICY "reports_delete" ON reports FOR DELETE USING (true);`,
      `DROP POLICY IF EXISTS "tariffs_all" ON tariffs; CREATE POLICY "tariffs_all" ON tariffs FOR ALL USING (true);`,
      `DROP POLICY IF EXISTS "gtfs_all" ON gtfs_versions; CREATE POLICY "gtfs_all" ON gtfs_versions FOR ALL USING (true);`,
      `DROP POLICY IF EXISTS "favorites_all" ON favorite_routes; CREATE POLICY "favorites_all" ON favorite_routes FOR ALL USING (true);`,
    ];
    for (const p of policies) {
      await client.query(p);
    }
    console.log('✅ Políticas creadas\n');

    // Triggers
    console.log('⚡ Creando triggers y funciones...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger AS $$
      BEGIN
        INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
        VALUES (
          new.id,
          new.email,
          COALESCE(new.raw_user_meta_data->>'full_name', ''),
          new.raw_user_meta_data->>'avatar_url',
          COALESCE((new.raw_user_meta_data->>'role')::user_role, 'cliente'::user_role)
        );
        RETURN new;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
    `);

    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = timezone('utc'::text, now());
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS reports_updated_at ON reports;
      CREATE TRIGGER reports_updated_at
        BEFORE UPDATE ON reports FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

      DROP TRIGGER IF EXISTS tariffs_updated_at ON tariffs;
      CREATE TRIGGER tariffs_updated_at
        BEFORE UPDATE ON tariffs FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
    `);
    console.log('✅ Triggers creados\n');

    console.log('🎉 ¡Base de datos configurada completamente!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Tablas: profiles, favorite_routes, reports, tariffs, gtfs_versions');
    console.log('  RLS: Habilitado en todas las tablas');
    console.log('  Triggers: handle_new_user, update_updated_at');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📌 Siguiente paso: npm run init-db (para crear usuarios y datos de ejemplo)\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

createTables();
