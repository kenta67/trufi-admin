const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { requireRole } = require('../middleware/auth');

/**
 * GET /api/users
 * Listar todos los usuarios con filtros
 */
router.get('/', async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact' });

    if (role) query = query.eq('role', role);
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    query = query.order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    res.json({
      data,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error listando usuarios:', error);
    res.status(500).json({ error: 'Error obteniendo usuarios' });
  }
});

/**
 * GET /api/users/staff
 * Listar solo personal administrativo (para asignar técnicos)
 */
router.get('/staff', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, role')
      .in('role', ['administrador', 'operador', 'tecnico'])
      .eq('is_active', true)
      .order('full_name');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo staff' });
  }
});

/**
 * GET /api/users/technicians
 * Listar solo técnicos disponibles
 */
router.get('/technicians', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'tecnico')
      .eq('is_active', true)
      .order('full_name');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo técnicos' });
  }
});

/**
 * POST /api/users
 * Crear un nuevo usuario administrativo (solo admin)
 */
router.post('/', requireRole('administrador'), async (req, res) => {
  try {
    const { email, password, full_name, role } = req.body;

    if (!email || !password || !full_name || !role) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const allowedRoles = ['operador', 'tecnico', 'administrador'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Rol no válido para usuario administrativo' });
    }

    const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role }
    });

    if (error) {
      if (error.message.includes('already been registered')) {
        return res.status(409).json({ error: 'El email ya está registrado' });
      }
      throw error;
    }

    res.status(201).json({ message: 'Usuario creado exitosamente', user: user.user });
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ error: 'Error creando usuario' });
  }
});

/**
 * PATCH /api/users/:id/role
 * Cambiar el rol de un usuario (solo admin)
 */
router.patch('/:id/role', requireRole('administrador'), async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['operador', 'tecnico', 'administrador'];
    
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Rol no válido' });
    }

    // Verificar si es cliente
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', req.params.id).single();
    if (profile && profile.role === 'cliente') {
      return res.status(403).json({ error: 'No se pueden editar clientes' });
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ role })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Rol actualizado', data });
  } catch (error) {
    console.error('Error actualizando rol:', error);
    res.status(500).json({ error: 'Error actualizando rol' });
  }
});

/**
 * PATCH /api/users/:id/toggle-active
 * Activar/Desactivar un usuario (solo admin)
 */
router.patch('/:id/toggle-active', requireRole('administrador'), async (req, res) => {
  try {
    // Obtener estado actual y rol
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_active, role')
      .eq('id', req.params.id)
      .single();

    if (profile && profile.role === 'cliente') {
      return res.status(403).json({ error: 'No se pueden editar clientes' });
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ is_active: !profile.is_active })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: `Usuario ${data.is_active ? 'activado' : 'desactivado'}`, data });
  } catch (error) {
    console.error('Error toggling usuario:', error);
    res.status(500).json({ error: 'Error actualizando estado del usuario' });
  }
});

/**
 * DELETE /api/users/:id
 * Eliminar un usuario (solo admin)
 */
router.delete('/:id', requireRole('administrador'), async (req, res) => {
  try {
    // No permitir eliminarse a sí mismo
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    }

    // Verificar si es cliente
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', req.params.id).single();
    if (profile && profile.role === 'cliente') {
      return res.status(403).json({ error: 'No se pueden eliminar clientes' });
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(req.params.id);
    if (error) throw error;

    res.json({ message: 'Usuario eliminado' });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({ error: 'Error eliminando usuario' });
  }
});

/**
 * PUT /api/users/:id
 * Actualizar datos de un usuario administrativo
 */
router.put('/:id', requireRole('administrador'), async (req, res) => {
  try {
    const { full_name, role, password } = req.body;

    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', req.params.id).single();
    if (profile && profile.role === 'cliente') {
      return res.status(403).json({ error: 'No se pueden editar usuarios clientes' });
    }

    // Actualizar contraseña si se proporciona
    if (password) {
      const { error: pwdError } = await supabaseAdmin.auth.admin.updateUserById(req.params.id, { password });
      if (pwdError) throw pwdError;
    }

    // Actualizar metadatos de auth
    const authUpdate = {};
    if (full_name) authUpdate.full_name = full_name;
    if (role) authUpdate.role = role;
    if (Object.keys(authUpdate).length > 0) {
      await supabaseAdmin.auth.admin.updateUserById(req.params.id, { user_metadata: authUpdate });
    }

    // Actualizar perfil público
    const profileUpdate = {};
    if (full_name) profileUpdate.full_name = full_name;
    if (role) profileUpdate.role = role;
    if (Object.keys(profileUpdate).length > 0) {
      await supabaseAdmin.from('profiles').update(profileUpdate).eq('id', req.params.id);
    }

    res.json({ message: 'Usuario actualizado correctamente' });
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ error: 'Error actualizando usuario' });
  }
});

module.exports = router;
