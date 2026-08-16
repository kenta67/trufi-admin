require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixAdminAccounts() {
  console.log('Verificando cuentas de administrador...');
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, is_active, role');

  if (error) {
    console.error('Error obteniendo perfiles:', error);
    return;
  }

  console.log('Perfiles actuales:', data);

  // Forzar is_active = true para todos los administradores (y personal en general)
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ is_active: true })
    .in('role', ['administrador', 'operador', 'tecnico', 'cliente']);
    
  if (updateError) {
    console.error('Error actualizando is_active:', updateError);
  } else {
    console.log('✅ Todas las cuentas han sido reactivadas (is_active = true)');
  }
}

fixAdminAccounts();
