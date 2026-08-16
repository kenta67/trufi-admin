const express = require('express');
const router = express.Router();
const multer = require('multer');
const crypto = require('crypto');
const { supabaseAdmin, supabasePublic } = require('../config/supabase');
const { requireRole, authMiddleware } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'));
    }
  }
});

// GET /api/settings
// Obtiene todas las configuraciones públicas (no requiere auth)
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabasePublic
      .from('app_settings')
      .select('*');

    if (error) throw error;

    // Convertir array de {key, value} a un objeto clave-valor
    const settings = {};
    data.forEach(item => {
      settings[item.key] = item.value;
    });

    res.json(settings);
  } catch (error) {
    console.error('Error obteniendo configuraciones:', error);
    res.status(500).json({ error: 'Error interno obteniendo configuraciones' });
  }
});

// POST /api/settings/logo
// Sube un nuevo logo y actualiza app_settings (Solo admin)
router.post('/logo', authMiddleware, requireRole('administrador'), upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se envió ninguna imagen' });
    }

    const fileBuffer = req.file.buffer;
    const fileExtension = req.file.originalname.split('.').pop();
    const fileName = `logo-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${fileExtension}`;

    // Subir a Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('system-assets')
      .upload(fileName, fileBuffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Obtener URL Pública
    const { data: urlData } = supabaseAdmin.storage
      .from('system-assets')
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Actualizar app_settings
    const { error: dbError } = await supabaseAdmin.from('app_settings').upsert({
      key: 'system_logo_url',
      value: publicUrl
    });

    if (dbError) throw dbError;

    res.json({ message: 'Logo actualizado correctamente', url: publicUrl });
  } catch (error) {
    console.error('Error actualizando logo:', error);
    res.status(500).json({ error: 'Error actualizando el logotipo del sistema' });
  }
});

module.exports = router;
