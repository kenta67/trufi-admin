const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { supabaseAdmin } = require('../config/supabase');
const { requireRole } = require('../middleware/auth');

// Directorio local para almacenar el GTFS
const GTFS_DIR = path.join(__dirname, '..', '..', 'gtfs');
if (!fs.existsSync(GTFS_DIR)) {
  fs.mkdirSync(GTFS_DIR, { recursive: true });
}

// Configurar multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, GTFS_DIR),
  filename: (req, file, cb) => cb(null, 'cochabamba.gtfs.zip')
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || 
        file.mimetype === 'application/x-zip-compressed' ||
        file.mimetype === 'application/octet-stream' ||
        file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos .zip'));
    }
  }
});

/**
 * GET /api/gtfs/versions
 * Listar todas las versiones del GTFS
 */
router.get('/versions', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('gtfs_versions')
      .select(`
        *,
        uploader:uploaded_by(full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error listando versiones GTFS:', error);
    res.status(500).json({ error: 'Error obteniendo versiones' });
  }
});

/**
 * GET /api/gtfs/current
 * Obtener la versión activa actual del GTFS
 */
router.get('/current', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('gtfs_versions')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    // Verificar si hay archivo local
    const localPath = path.join(GTFS_DIR, 'cochabamba.gtfs.zip');
    const localExists = fs.existsSync(localPath);

    res.json({
      version: data || null,
      localFile: localExists ? {
        exists: true,
        size: fs.statSync(localPath).size,
        modified: fs.statSync(localPath).mtime
      } : { exists: false }
    });
  } catch (error) {
    console.error('Error obteniendo versión actual:', error);
    res.status(500).json({ error: 'Error obteniendo versión actual' });
  }
});

/**
 * POST /api/gtfs/upload
 * Subir un nuevo archivo GTFS. 
 * Se guarda localmente en el backend y se sube a Supabase Storage.
 * Solo técnicos y administradores.
 */
router.post('/upload', requireRole('administrador', 'tecnico'), upload.single('gtfs'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo GTFS requerido' });
    }

    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const { changes_description } = req.body;

    // Subir a Supabase Storage (reemplazar si existe)
    const storagePath = `cochabamba.gtfs.zip`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from('gtfs')
      .upload(storagePath, fileBuffer, {
        contentType: 'application/zip',
        upsert: true // Reemplaza el archivo existente
      });

    if (uploadError) {
      console.error('Error subiendo a Storage:', uploadError);
      throw uploadError;
    }

    // Obtener URL pública
    const { data: urlData } = supabaseAdmin.storage
      .from('gtfs')
      .getPublicUrl(storagePath);

    // Desactivar versiones anteriores
    await supabaseAdmin
      .from('gtfs_versions')
      .update({ is_active: false })
      .eq('is_active', true);

    // Registrar nueva versión en la BD
    const { data: version, error: versionError } = await supabaseAdmin
      .from('gtfs_versions')
      .insert({
        version_hash: fileHash,
        file_path: urlData.publicUrl,
        file_size: req.file.size,
        changes_description: changes_description || 'Nueva versión subida',
        uploaded_by: req.user.id,
        is_active: true
      })
      .select()
      .single();

    if (versionError) {
      // Si es duplicado de hash, no pasa nada
      if (versionError.message.includes('duplicate')) {
        return res.status(409).json({ error: 'Este archivo ya fue subido anteriormente (mismo hash)' });
      }
      throw versionError;
    }

    res.json({
      message: 'GTFS actualizado exitosamente',
      version,
      localPath: filePath,
      storagePath: urlData.publicUrl
    });
  } catch (error) {
    console.error('Error subiendo GTFS:', error);
    res.status(500).json({ error: 'Error subiendo archivo GTFS' });
  }
});

/**
 * GET /api/gtfs/download
 * Descargar el archivo GTFS local
 */
router.get('/download', (req, res) => {
  const filePath = path.join(GTFS_DIR, 'cochabamba.gtfs.zip');
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'No hay archivo GTFS local disponible' });
  }

  res.download(filePath, 'cochabamba.gtfs.zip');
});

module.exports = router;
