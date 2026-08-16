const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { requireRole } = require('../middleware/auth');

/**
 * GET /api/reports
 * Listar reportes con filtros y paginación
 */
router.get('/', async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('reports')
      .select(`
        *,
        client:client_id(full_name, email, avatar_url),
        operator:operator_id(full_name),
        technician:technician_id(full_name)
      `, { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (type) query = query.eq('type', type);
    if (search) query = query.ilike('description', `%${search}%`);

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
    console.error('Error listando reportes:', error);
    res.status(500).json({ error: 'Error obteniendo reportes' });
  }
});

/**
 * GET /api/reports/:id
 * Obtener un reporte específico
 */
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('reports')
      .select(`
        *,
        client:client_id(full_name, email, avatar_url),
        operator:operator_id(full_name, email),
        technician:technician_id(full_name, email)
      `)
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Reporte no encontrado' });

    res.json(data);
  } catch (error) {
    console.error('Error obteniendo reporte:', error);
    res.status(500).json({ error: 'Error obteniendo reporte' });
  }
});

/**
 * PATCH /api/reports/:id/approve
 * Operador aprueba un reporte y lo pasa al técnico
 */
router.patch('/:id/approve', requireRole('administrador', 'operador'), async (req, res) => {
  try {
    const { technician_id, operator_notes } = req.body;

    const updateData = {
      status: technician_id ? 'en_resolucion' : 'aprobado',
      operator_id: req.user.id,
    };

    if (operator_notes) updateData.operator_notes = operator_notes;
    if (technician_id) updateData.technician_id = technician_id;

    const { data, error } = await supabaseAdmin
      .from('reports')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Reporte aprobado', data });
  } catch (error) {
    console.error('Error aprobando reporte:', error);
    res.status(500).json({ error: 'Error aprobando reporte' });
  }
});

/**
 * PATCH /api/reports/:id/reject
 * Operador rechaza un reporte
 */
router.patch('/:id/reject', requireRole('administrador', 'operador'), async (req, res) => {
  try {
    const { operator_notes } = req.body;

    const { data, error } = await supabaseAdmin
      .from('reports')
      .update({
        status: 'rechazado',
        operator_id: req.user.id,
        operator_notes: operator_notes || 'Reporte rechazado'
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Reporte rechazado', data });
  } catch (error) {
    console.error('Error rechazando reporte:', error);
    res.status(500).json({ error: 'Error rechazando reporte' });
  }
});

/**
 * PATCH /api/reports/:id/resolve
 * Técnico marca un reporte como resuelto
 */
router.patch('/:id/resolve', requireRole('administrador', 'tecnico'), async (req, res) => {
  try {
    const { technician_notes } = req.body;

    const { data, error } = await supabaseAdmin
      .from('reports')
      .update({
        status: 'resuelto',
        technician_id: req.user.id,
        technician_notes: technician_notes || 'Resuelto'
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Reporte resuelto', data });
  } catch (error) {
    console.error('Error resolviendo reporte:', error);
    res.status(500).json({ error: 'Error resolviendo reporte' });
  }
});

/**
 * DELETE /api/reports/:id
 * Solo administrador puede eliminar reportes
 */
router.delete('/:id', requireRole('administrador'), async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('reports')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Reporte eliminado' });
  } catch (error) {
    console.error('Error eliminando reporte:', error);
    res.status(500).json({ error: 'Error eliminando reporte' });
  }
});

module.exports = router;
