const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');

/**
 * GET /api/dashboard/stats
 * Obtener estadísticas generales para el dashboard principal
 */
router.get('/stats', async (req, res) => {
  try {
    // Total de usuarios por rol
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('role');

    if (profilesError) throw profilesError;

    const userStats = {
      total: profiles.length,
      clientes: profiles.filter(p => p.role === 'cliente').length,
      administradores: profiles.filter(p => p.role === 'administrador').length,
      operadores: profiles.filter(p => p.role === 'operador').length,
      tecnicos: profiles.filter(p => p.role === 'tecnico').length,
    };

    // Reportes por estado
    const { data: reports, error: reportsError } = await supabaseAdmin
      .from('reports')
      .select('status, type');

    if (reportsError) throw reportsError;

    const reportStats = {
      total: reports.length,
      pendientes: reports.filter(r => r.status === 'pendiente').length,
      aprobados: reports.filter(r => r.status === 'aprobado').length,
      en_resolucion: reports.filter(r => r.status === 'en_resolucion').length,
      resueltos: reports.filter(r => r.status === 'resuelto').length,
      rechazados: reports.filter(r => r.status === 'rechazado').length,
    };

    const reportsByType = {
      calle_cerrada: reports.filter(r => r.type === 'calle_cerrada').length,
      bache: reports.filter(r => r.type === 'bache').length,
      cambio_ruta: reports.filter(r => r.type === 'cambio_ruta').length,
      actividad_civica: reports.filter(r => r.type === 'actividad_civica').length,
      otro: reports.filter(r => r.type === 'otro').length,
    };

    // Última versión GTFS
    const { data: gtfs, error: gtfsError } = await supabaseAdmin
      .from('gtfs_versions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Tarifas
    const { count: tariffCount } = await supabaseAdmin
      .from('tariffs')
      .select('*', { count: 'exact', head: true });

    res.json({
      users: userStats,
      reports: reportStats,
      reportsByType,
      gtfsVersion: gtfs || null,
      tariffCount: tariffCount || 0,
    });
  } catch (error) {
    console.error('Error en dashboard stats:', error);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

/**
 * GET /api/dashboard/recent-reports
 * Últimos 10 reportes recientes
 */
router.get('/recent-reports', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('reports')
      .select(`
        *,
        client:client_id(full_name, email),
        operator:operator_id(full_name),
        technician:technician_id(full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error en recent reports:', error);
    res.status(500).json({ error: 'Error obteniendo reportes recientes' });
  }
});

/**
 * GET /api/dashboard/recent-users
 * Últimos 10 usuarios registrados
 */
router.get('/recent-users', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error en recent users:', error);
    res.status(500).json({ error: 'Error obteniendo usuarios recientes' });
  }
});

module.exports = router;
