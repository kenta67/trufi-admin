const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');

/**
 * POST /api/auth/login
 * Login solo por email y password (para panel administrativo)
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    // Autenticar con Supabase Auth
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // Verificar que el usuario tenga rol administrativo
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      return res.status(500).json({ error: 'Error obteniendo perfil' });
    }

    const allowedRoles = ['administrador', 'operador', 'tecnico'];
    if (!allowedRoles.includes(profile.role)) {
      return res.status(403).json({ error: 'Acceso denegado. Solo personal administrativo puede acceder al panel.' });
    }

    if (!profile.is_active) {
      return res.status(403).json({ error: 'Cuenta desactivada. Contacte al administrador.' });
    }

    res.json({
      message: 'Login exitoso',
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: profile.full_name,
        role: profile.role,
        avatar_url: profile.avatar_url
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      await supabaseAdmin.auth.admin.signOut(token).catch(() => {});
    }
    res.json({ message: 'Sesión cerrada' });
  } catch (error) {
    res.status(500).json({ error: 'Error cerrando sesión' });
  }
});

/**
 * GET /api/auth/me
 * Obtener información del usuario actual
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No autenticado' });

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) return res.status(401).json({ error: 'Token inválido' });

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    res.json({
      id: user.id,
      email: user.email,
      ...profile
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
});

/**
 * POST /api/auth/refresh
 * Refrescar token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).json({ error: 'Refresh token requerido' });

    const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token });
    if (error) return res.status(401).json({ error: 'Token de refresco inválido' });

    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at
    });
  } catch (error) {
    res.status(500).json({ error: 'Error refrescando sesión' });
  }
});

module.exports = router;
