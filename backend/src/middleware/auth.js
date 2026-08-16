const { supabaseAdmin } = require('../config/supabase');
const jwt = require('jsonwebtoken');

/**
 * Middleware que verifica el JWT de la sesión y 
 * solo permite acceso a roles administrativos (no clientes).
 */
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];

    // Verificar el token con Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    // Obtener el perfil con el rol
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ error: 'Perfil no encontrado' });
    }

    // Solo permitir roles administrativos
    const allowedRoles = ['administrador', 'operador', 'tecnico'];
    if (!allowedRoles.includes(profile.role)) {
      return res.status(403).json({ error: 'Acceso denegado. Solo personal administrativo.' });
    }

    if (!profile.is_active) {
      return res.status(403).json({ error: 'Cuenta desactivada. Contacte al administrador.' });
    }

    // Adjuntar info del usuario al request
    req.user = {
      id: user.id,
      email: user.email,
      ...profile
    };

    next();
  } catch (error) {
    console.error('Error en auth middleware:', error);
    return res.status(500).json({ error: 'Error interno de autenticación' });
  }
}

/**
 * Middleware que restringe el acceso solo a ciertos roles.
 * Uso: requireRole('administrador', 'operador')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Acceso denegado. Se requiere rol: ${roles.join(' o ')}` 
      });
    }
    next();
  };
}

module.exports = { authMiddleware, requireRole };
