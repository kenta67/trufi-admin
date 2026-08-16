const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Cliente con permisos de servicio (para operaciones admin)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Cliente con permisos públicos (para operaciones de lectura)
const supabasePublic = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = { supabaseAdmin, supabasePublic };
