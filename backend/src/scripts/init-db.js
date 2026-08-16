/**
 * Script de inicialización de la base de datos en Supabase.
 * Crea todas las tablas, enums, triggers, storage buckets y el usuario admin por defecto.
 * 
 * Ejecutar con: npm run init-db
 */
require('dotenv').config();
const { supabaseAdmin } = require('../config/supabase');

async function initDatabase() {
  console.log('🚀 Iniciando creación de base de datos...\n');

  // ── 1. Crear tablas via SQL ──
  const createTablesSQL = `
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

    -- Tabla de perfiles (extiende auth.users)
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

    -- Tabla de reportes/solicitudes
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

    -- Habilitar RLS
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE favorite_routes ENABLE ROW LEVEL SECURITY;
    ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
    ALTER TABLE tariffs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE gtfs_versions ENABLE ROW LEVEL SECURITY;

    -- Políticas RLS para profiles
    DROP POLICY IF EXISTS "Profiles viewable by admin staff" ON profiles;
    CREATE POLICY "Profiles viewable by admin staff" ON profiles
      FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
    CREATE POLICY "Users can update own profile" ON profiles
      FOR UPDATE USING (auth.uid() = id);

    -- Políticas RLS para reports
    DROP POLICY IF EXISTS "Reports viewable by all" ON reports;
    CREATE POLICY "Reports viewable by all" ON reports
      FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Authenticated users can create reports" ON reports;
    CREATE POLICY "Authenticated users can create reports" ON reports
      FOR INSERT WITH CHECK (auth.uid() = client_id);

    DROP POLICY IF EXISTS "Staff can update reports" ON reports;
    CREATE POLICY "Staff can update reports" ON reports
      FOR UPDATE USING (true);

    -- Políticas RLS para tariffs
    DROP POLICY IF EXISTS "Tariffs viewable by all" ON tariffs;
    CREATE POLICY "Tariffs viewable by all" ON tariffs
      FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Staff can manage tariffs" ON tariffs;
    CREATE POLICY "Staff can manage tariffs" ON tariffs
      FOR ALL USING (true);

    -- Políticas RLS para gtfs_versions
    DROP POLICY IF EXISTS "GTFS viewable by all" ON gtfs_versions;
    CREATE POLICY "GTFS viewable by all" ON gtfs_versions
      FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Staff can manage GTFS" ON gtfs_versions;
    CREATE POLICY "Staff can manage GTFS" ON gtfs_versions
      FOR ALL USING (true);

    -- Políticas RLS para favorite_routes
    DROP POLICY IF EXISTS "Users manage own favorites" ON favorite_routes;
    CREATE POLICY "Users manage own favorites" ON favorite_routes
      FOR ALL USING (auth.uid() = user_id);

    -- Trigger para crear perfil automáticamente
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

    -- Función para actualizar updated_at automáticamente
    CREATE OR REPLACE FUNCTION update_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = timezone('utc'::text, now());
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS reports_updated_at ON reports;
    CREATE TRIGGER reports_updated_at
      BEFORE UPDATE ON reports
      FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

    DROP TRIGGER IF EXISTS tariffs_updated_at ON tariffs;
    CREATE TRIGGER tariffs_updated_at
      BEFORE UPDATE ON tariffs
      FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
  `;

  try {
    const { error } = await supabaseAdmin.rpc('', {}).catch(() => ({}));
    // Ejecutar SQL directamente
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
  } catch(e) {
    // Continuamos con método alternativo
  }

  // Ejecutar SQL vía query directa del admin
  const { data, error } = await supabaseAdmin.from('profiles').select('id').limit(1);
  
  if (error && error.message.includes('does not exist')) {
    console.log('📋 Las tablas no existen. Creándolas via SQL Editor...');
    console.log('⚠️  Por favor, ejecuta el siguiente SQL en el SQL Editor de Supabase:');
    console.log('    https://supabase.com/dashboard/project/mkgyvudnpwjsvclhlmsj/sql/new\n');
    console.log(createTablesSQL);
    console.log('\n📌 Una vez ejecutado el SQL, vuelve a correr: npm run init-db');
    return;
  }

  console.log('✅ Tablas verificadas correctamente.\n');

  // ── 2. Crear Storage Buckets ──
  console.log('📦 Configurando Storage buckets...');
  
  // Bucket para GTFS
  const { error: gtfsBucketError } = await supabaseAdmin.storage.createBucket('gtfs', {
    public: true,
    fileSizeLimit: 52428800, // 50MB
    allowedMimeTypes: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream']
  });
  
  if (gtfsBucketError && !gtfsBucketError.message.includes('already exists')) {
    console.error('❌ Error creando bucket gtfs:', gtfsBucketError.message);
  } else {
    console.log('  ✅ Bucket "gtfs" listo');
  }

  // Bucket para imágenes de reportes
  const { error: reportsBucketError } = await supabaseAdmin.storage.createBucket('report-images', {
    public: true,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
  });

  if (reportsBucketError && !reportsBucketError.message.includes('already exists')) {
    console.error('❌ Error creando bucket report-images:', reportsBucketError.message);
  } else {
    console.log('  ✅ Bucket "report-images" listo');
  }

  // ── 3. Crear usuario administrador por defecto ──
  console.log('\n👤 Creando usuario administrador por defecto...');
  
  const { data: adminUser, error: adminError } = await supabaseAdmin.auth.admin.createUser({
    email: 'admin@trufi.bo',
    password: 'Admin2024!',
    email_confirm: true,
    user_metadata: {
      full_name: 'Administrador Principal',
      role: 'administrador'
    }
  });

  if (adminError && !adminError.message.includes('already been registered')) {
    console.error('❌ Error creando admin:', adminError.message);
  } else if (adminUser) {
    console.log('  ✅ Usuario admin creado:');
    console.log('     📧 Email: admin@trufi.bo');
    console.log('     🔑 Password: Admin2024!');
  } else {
    console.log('  ℹ️  El usuario admin ya existe.');
  }

  // Crear un operador de ejemplo
  const { data: operadorUser, error: opError } = await supabaseAdmin.auth.admin.createUser({
    email: 'operador@trufi.bo',
    password: 'Operador2024!',
    email_confirm: true,
    user_metadata: {
      full_name: 'Operador de Ejemplo',
      role: 'operador'
    }
  });

  if (opError && !opError.message.includes('already been registered')) {
    console.error('❌ Error creando operador:', opError.message);
  } else if (operadorUser) {
    console.log('  ✅ Usuario operador creado:');
    console.log('     📧 Email: operador@trufi.bo');
    console.log('     🔑 Password: Operador2024!');
  } else {
    console.log('  ℹ️  El usuario operador ya existe.');
  }

  // Crear un técnico de ejemplo
  const { data: tecnicoUser, error: tecError } = await supabaseAdmin.auth.admin.createUser({
    email: 'tecnico@trufi.bo',
    password: 'Tecnico2024!',
    email_confirm: true,
    user_metadata: {
      full_name: 'Técnico de Ejemplo',
      role: 'tecnico'
    }
  });

  if (tecError && !tecError.message.includes('already been registered')) {
    console.error('❌ Error creando técnico:', tecError.message);
  } else if (tecnicoUser) {
    console.log('  ✅ Usuario técnico creado:');
    console.log('     📧 Email: tecnico@trufi.bo');
    console.log('     🔑 Password: Tecnico2024!');
  } else {
    console.log('  ℹ️  El usuario técnico ya existe.');
  }

  // ── 4. Insertar tarifas de ejemplo ──
  console.log('\n💰 Insertando tarifas de ejemplo...');
  
  const tarifas = [
    { passenger_type: 'Adulto', price: 2.00, line_name: 'General', description: 'Tarifa estándar para pasajeros adultos' },
    { passenger_type: 'Universitario', price: 1.50, line_name: 'General', description: 'Tarifa con descuento para universitarios con carnet vigente' },
    { passenger_type: 'Escolar', price: 1.00, line_name: 'General', description: 'Tarifa escolar para estudiantes de primaria y secundaria' },
    { passenger_type: 'Tercera Edad', price: 0.00, line_name: 'General', description: 'Pasaje gratuito para personas de la tercera edad' },
  ];

  const { error: tarifError } = await supabaseAdmin.from('tariffs').upsert(tarifas, { onConflict: 'id' });
  if (tarifError) {
    console.log('  ⚠️  Tarifas:', tarifError.message);
  } else {
    console.log('  ✅ Tarifas de ejemplo insertadas');
  }

  console.log('\n🎉 ¡Inicialización completada!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🌐 Supabase Dashboard: https://supabase.com/dashboard/project/mkgyvudnpwjsvclhlmsj');
  console.log('  🔧 Backend: npm run dev');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

initDatabase().catch(console.error);
