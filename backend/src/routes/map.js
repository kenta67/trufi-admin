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

// ─── TRIP PLANNER ───

/**
 * Haversine distance in meters between two points
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Minimum distance from a point to any point on a polyline (array of {lat, lng} or [lon, lat])
 */
function pointToPolylineDistance(pLat, pLon, polyline, isGeoJSON = false) {
  let minDist = Infinity;
  for (const pt of polyline) {
    const lat = isGeoJSON ? pt[1] : pt.lat;
    const lon = isGeoJSON ? pt[0] : pt.lng;
    const d = haversineDistance(pLat, pLon, lat, lon);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

/**
 * Check if any segment of a route polyline passes within threshold of any closure point
 */
function routeIntersectsClosure(routeCoords, closureCoords, thresholdMeters = 50) {
  for (const rPt of routeCoords) {
    for (const cPt of closureCoords) {
      const d = haversineDistance(rPt[1], rPt[0], cPt.lat, cPt.lng);
      if (d < thresholdMeters) return true;
    }
  }
  return false;
}

// POST /api/map/plan-trip - Plan a trip and detect blocked routes
router.post('/plan-trip', async (req, res) => {
  try {
    const { origin, destination } = req.body;
    if (!origin || !destination || !origin.lat || !origin.lng || !destination.lat || !destination.lng) {
      return res.status(400).json({ error: 'Se requieren coordenadas de origen y destino' });
    }

    // 1. Read GTFS routes
    if (!fs.existsSync(GTFS_FILE)) {
      return res.json({ candidateRoutes: [], message: 'No hay datos GTFS cargados' });
    }

    const zip = new AdmZip(GTFS_FILE);
    const zipEntries = zip.getEntries();

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
      return res.json({ candidateRoutes: [], message: 'GTFS incompleto' });
    }

    const [routes, trips, shapes] = await Promise.all([
      parseCsv(routesBuf), parseCsv(tripsBuf), parseCsv(shapesBuf)
    ]);

    // Build route info map
    const routeMap = {};
    let colorIndex = 0;
    routes.forEach(r => {
      routeMap[r.route_id] = {
        name: r.route_short_name || r.route_long_name || `Ruta ${r.route_id}`,
        color: r.route_color ? `#${r.route_color}` : COLORS[colorIndex++ % COLORS.length]
      };
    });

    // Map shape_id -> route_id
    const shapeToRoute = {};
    const processedRoutes = new Set();
    trips.forEach(t => {
      if (t.shape_id && !processedRoutes.has(t.route_id)) {
        shapeToRoute[t.shape_id] = t.route_id;
        processedRoutes.add(t.route_id);
      }
    });

    // Group shapes
    const shapesGroups = {};
    shapes.forEach(s => {
      if (!shapesGroups[s.shape_id]) shapesGroups[s.shape_id] = [];
      shapesGroups[s.shape_id].push({
        lat: parseFloat(s.shape_pt_lat),
        lon: parseFloat(s.shape_pt_lon),
        seq: parseInt(s.shape_pt_sequence, 10)
      });
    });

    // 2. Find candidate routes (those that pass near both origin and destination)
    const PROXIMITY_THRESHOLD = 500; // meters
    const candidateRoutes = [];

    for (const [shapeId, points] of Object.entries(shapesGroups)) {
      const routeId = shapeToRoute[shapeId];
      if (!routeId) continue;

      const routeInfo = routeMap[routeId];
      if (!routeInfo) continue;

      points.sort((a, b) => a.seq - b.seq);
      const coords = points.map(p => [p.lon, p.lat]);

      // Check proximity to origin and destination
      const distToOrigin = pointToPolylineDistance(origin.lat, origin.lng, coords, true);
      const distToDest = pointToPolylineDistance(destination.lat, destination.lng, coords, true);

      if (distToOrigin <= PROXIMITY_THRESHOLD && distToDest <= PROXIMITY_THRESHOLD) {
        candidateRoutes.push({
          route_id: routeId,
          shape_id: shapeId,
          name: routeInfo.name,
          color: routeInfo.color,
          distToOrigin: Math.round(distToOrigin),
          distToDest: Math.round(distToDest),
          coordinates: coords,
          blocked: false,
          blockReasons: []
        });
      }
    }

    // 3. Get active closures from DB
    const { data: closures, error: closuresErr } = await supabaseAdmin
      .from('route_closures')
      .select('*')
      .eq('is_active', true);

    if (closuresErr) throw closuresErr;

    // 4. Check each candidate route against closures
    if (closures && closures.length > 0) {
      for (const route of candidateRoutes) {
        for (const closure of closures) {
          if (closure.coordinates && closure.coordinates.length > 0) {
            if (routeIntersectsClosure(route.coordinates, closure.coordinates, 50)) {
              route.blocked = true;
              const reasonLabels = {
                obra: 'Obra Pública', bloqueo: 'Bloqueo',
                actividad_civica: 'Actividad Cívica', bache: 'Bache', otro: 'Otro'
              };
              route.blockReasons.push({
                reason: reasonLabels[closure.reason] || closure.reason,
                description: closure.description || ''
              });
            }
          }
        }
      }
    }

    // 5. Sort: unblocked routes first, then by proximity
    candidateRoutes.sort((a, b) => {
      if (a.blocked !== b.blocked) return a.blocked ? 1 : -1;
      return (a.distToOrigin + a.distToDest) - (b.distToOrigin + b.distToDest);
    });

    // Remove heavy coordinate data from response (frontend already has it)
    const response = candidateRoutes.map(r => ({
      route_id: r.route_id,
      name: r.name,
      color: r.color,
      distToOrigin: r.distToOrigin,
      distToDest: r.distToDest,
      blocked: r.blocked,
      blockReasons: r.blockReasons,
      coordinates: r.coordinates
    }));

    res.json({
      candidateRoutes: response,
      totalClosures: closures ? closures.length : 0,
      message: candidateRoutes.length === 0
        ? 'No se encontraron rutas que conecten origen y destino'
        : `${candidateRoutes.filter(r => !r.blocked).length} rutas libres, ${candidateRoutes.filter(r => r.blocked).length} obstruidas`
    });
  } catch (error) {
    console.error('Error planificando viaje:', error);
    res.status(500).json({ error: 'Error al planificar el viaje' });
  }
});

module.exports = router;
