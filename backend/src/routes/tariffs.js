const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { requireRole } = require('../middleware/auth');

/**
 * GET /api/tariffs
 * Listar todas las tarifas
 */
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('tariffs')
      .select(`
        *,
        updater:updated_by(full_name)
      `)
      .order('line_name')
      .order('passenger_type');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error listando tarifas:', error);
    res.status(500).json({ error: 'Error obteniendo tarifas' });
  }
});

/**
 * POST /api/tariffs
 * Crear una nueva tarifa (admin/técnico)
 */
router.post('/', requireRole('administrador', 'tecnico'), async (req, res) => {
  try {
    const { line_name, passenger_type, price, description } = req.body;

    if (!passenger_type || price === undefined) {
      return res.status(400).json({ error: 'Tipo de pasajero y precio son requeridos' });
    }

    const { data, error } = await supabaseAdmin
      .from('tariffs')
      .insert({
        line_name,
        passenger_type,
        price,
        description,
        updated_by: req.user.id
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ message: 'Tarifa creada', data });
  } catch (error) {
    console.error('Error creando tarifa:', error);
    res.status(500).json({ error: 'Error creando tarifa' });
  }
});

/**
 * PUT /api/tariffs/:id
 * Actualizar una tarifa
 */
router.put('/:id', requireRole('administrador', 'tecnico'), async (req, res) => {
  try {
    const { line_name, passenger_type, price, description } = req.body;

    const { data, error } = await supabaseAdmin
      .from('tariffs')
      .update({
        line_name,
        passenger_type,
        price,
        description,
        updated_by: req.user.id
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Tarifa actualizada', data });
  } catch (error) {
    console.error('Error actualizando tarifa:', error);
    res.status(500).json({ error: 'Error actualizando tarifa' });
  }
});

/**
 * DELETE /api/tariffs/:id
 * Eliminar una tarifa (solo admin)
 */
router.delete('/:id', requireRole('administrador'), async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('tariffs')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Tarifa eliminada' });
  } catch (error) {
    console.error('Error eliminando tarifa:', error);
    res.status(500).json({ error: 'Error eliminando tarifa' });
  }
});

module.exports = router;
