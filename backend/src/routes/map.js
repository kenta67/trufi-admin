const express = require('express');
const router = express.Router();
const AdmZip = require('adm-zip');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { supabaseAdmin } = require('../config/supabase');
const { requireRole, requireAuth } = require('../middleware/auth');

const GTFS_DIR = path.join(__dirname, '..', '..', 'gtfs');
const GTFS_FILE = path.join(GTFS_DIR, 'cochabamba.gtfs.zip');

// Generar colores si el GTFS no los trae
const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'];

router.get('/lines', async (req, res) => {
  try {
    if (!fs.existsSync(GTFS_FILE)) {
      return res.json({ type: 'FeatureCollection', features: [] });
    }

    const zip = new AdmZip(GTFS_FILE);
    const zipEntries = zip.getEntries();
    
    // Funciones helper para leer CSV desde buffer
    const parseCsv = (buffer) => {
      return new Promise((resolve, reject) => {
        const results = [];
        Readable.from(buffer.toString())
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', () => resolve(results))
          .on('error', reject);
      });
    };

    const getEntryBuffer = (filename) => {
      const entry = zipEntries.find(e => e.entryName === filename);
      return entry ? entry.getData() : null;
    };

    const routesBuf = getEntryBuffer('routes.txt');
    const tripsBuf = getEntryBuffer('trips.txt');
    const shapesBuf = getEntryBuffer('shapes.txt');

    if (!routesBuf || !tripsBuf || !shapesBuf) {
      return res.status(400).json({ error: 'El GTFS no tiene routes.txt, trips.txt o shapes.txt' });
    }

    const [routes, trips, shapes] = await Promise.all([
      parseCsv(routesBuf),
      parseCsv(tripsBuf),
      parseCsv(shapesBuf)
    ]);

    // Mapear rutas
    const routeMap = {};
    let colorIndex = 0;
    routes.forEach(r => {
      routeMap[r.route_id] = {
        name: r.route_short_name || r.route_long_name || `Ruta ${r.route_id}`,
        color: r.route_color ? `#${r.route_color}` : COLORS[colorIndex++ % COLORS.length]
      };
    });

    // Mapear shape_id -> route_id (usamos el primer trip que encontremos para cada ruta)
    const shapeToRoute = {};
    const processedRoutes = new Set();
    trips.forEach(t => {
      if (t.shape_id && !processedRoutes.has(t.route_id)) {
        shapeToRoute[t.shape_id] = t.route_id;
        processedRoutes.add(t.route_id);
      }
    });

    // Agrupar shapes por shape_id
    const shapesGroups = {};
    shapes.forEach(s => {
      if (!shapesGroups[s.shape_id]) {
        shapesGroups[s.shape_id] = [];
      }
      shapesGroups[s.shape_id].push({
        lat: parseFloat(s.shape_pt_lat),
        lon: parseFloat(s.shape_pt_lon),
        seq: parseInt(s.shape_pt_sequence, 10)
      });
    });

    // Generar GeoJSON
    const features = [];
    for (const [shapeId, points] of Object.entries(shapesGroups)) {
      const routeId = shapeToRoute[shapeId];
      if (!routeId) continue;
      
      const routeInfo = routeMap[routeId];
      // Ordenar puntos por secuencia
      points.sort((a, b) => a.seq - b.seq);
      
      features.push({
        type: 'Feature',
        properties: {
          route_id: routeId,
          name: routeInfo ? routeInfo.name : 'Desconocido',
          color: routeInfo ? routeInfo.color : '#333333'
        },
        geometry: {
          type: 'LineString',
          coordinates: points.map(p => [p.lon, p.lat]) // GeoJSON usa [lon, lat]
        }
      });
    }

    res.json({
      type: 'FeatureCollection',
      features
    });
  } catch (error) {
    console.error('Error parseando GTFS para mapa:', error);
    res.status(500).json({ error: 'Error procesando mapa de líneas' });
  }
});

// GET /api/map/closures - Obtener cierres de rutas
router.get('/closures', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('route_closures')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo cierres' });
  }
});

// POST /api/map/closures - Crear un cierre de ruta
router.post('/closures', requireRole('administrador', 'tecnico'), async (req, res) => {
  try {
    const { reason, description, coordinates } = req.body;
    
    if (!reason || !coordinates) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const { data, error } = await supabaseAdmin
      .from('route_closures')
      .insert({
        reason,
        description,
        coordinates,
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error creando cierre' });
  }
});

// DELETE /api/map/closures/:id - Desactivar un cierre
router.delete('/closures/:id', requireRole('administrador', 'tecnico'), async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('route_closures')
      .update({ is_active: false })
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Cierre desactivado' });
  } catch (error) {
    res.status(500).json({ error: 'Error desactivando cierre' });
  }
});

module.exports = router;
