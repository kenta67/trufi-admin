const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Importar rutas
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const reportsRoutes = require('./routes/reports');
const usersRoutes = require('./routes/users');
const tariffsRoutes = require('./routes/tariffs');
const gtfsRoutes = require('./routes/gtfs');
const mapRoutes = require('./routes/map');
const settingsRoutes = require('./routes/settings');

// Importar middleware
const { authMiddleware } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middlewares Globales ───
app.use(cors({
  origin: ['http://localhost:4200', 'http://localhost:4300'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Rutas Públicas (sin autenticación) ───
app.use('/api/auth', authRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Trufi Admin API',
    timestamp: new Date().toISOString() 
  });
});

// ─── Rutas Protegidas (requieren autenticación admin) ───
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/reports', authMiddleware, reportsRoutes);
app.use('/api/users', authMiddleware, usersRoutes);
app.use('/api/tariffs', authMiddleware, tariffsRoutes);
app.use('/api/gtfs', authMiddleware, gtfsRoutes);
app.use('/api/map', authMiddleware, mapRoutes);
app.use('/api/settings', settingsRoutes);

// ─── Manejo de Errores Global ───
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: `Ruta ${req.method} ${req.path} no encontrada` });
});

// ─── Iniciar Servidor ───
app.listen(PORT, () => {
  console.log(`\n🚌 urbanPLUSE API corriendo en http://localhost:${PORT}`);
  console.log(`📋 Health: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Auth:   http://localhost:${PORT}/api/auth/login`);
  console.log(`📊 Dash:   http://localhost:${PORT}/api/dashboard/stats`);
  console.log('');
});

module.exports = app;
