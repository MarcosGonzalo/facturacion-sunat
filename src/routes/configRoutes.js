const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db/jsonStore');
const certService = require('../services/certService');

// Multer setup for certificate uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, certService.CERT_STORAGE_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `cert-${uniqueSuffix}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.pfx', '.p12'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de certificado con extensión .pfx o .p12'));
    }
  }
});

// GET /api/config
router.get('/', (req, res) => {
  try {
    const config = db.getConfig();
    res.json({ exito: true, config });
  } catch (err) {
    res.status(500).json({ exito: false, mensaje: err.message });
  }
});

// POST /api/config
router.post('/', (req, res) => {
  try {
    const current = db.getConfig();
    const updated = {
      ...current,
      ...req.body,
      emisor: { ...current.emisor, ...(req.body.emisor || {}) },
      sunat: { ...current.sunat, ...(req.body.sunat || {}) },
      series: { ...current.series, ...(req.body.series || {}) }
    };
    db.saveConfig(updated);
    res.json({ exito: true, mensaje: 'Configuración guardada exitosamente', config: updated });
  } catch (err) {
    res.status(500).json({ exito: false, mensaje: err.message });
  }
});

// POST /api/config/certificado/generar
router.post('/certificado/generar', (req, res) => {
  try {
    const config = db.getConfig();
    const password = req.body.password || '123456';
    const certResult = certService.generateTestCertificate(config.emisor, password);

    config.certificado = {
      path: certResult.filePath,
      fileName: certResult.fileName,
      password: password,
      validoDesde: certResult.validoDesde,
      validoHasta: certResult.validoHasta,
      subject: certResult.subject,
      autoGenerado: true
    };
    db.saveConfig(config);

    res.json({
      exito: true,
      mensaje: 'Certificado de prueba generado y configurado exitosamente',
      certificado: config.certificado
    });
  } catch (err) {
    res.status(500).json({ exito: false, mensaje: `Error al generar certificado: ${err.message}` });
  }
});

// POST /api/config/certificado/upload
router.post('/certificado/upload', upload.single('certificado'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ exito: false, mensaje: 'No se subió ningún archivo de certificado' });
    }

    const password = req.body.password || '';
    const filePath = req.file.path;

    // Verificar si la clave es correcta intentando cargarlo
    try {
      const certData = certService.loadCertificate(filePath, password);
      const config = db.getConfig();

      config.certificado = {
        path: filePath,
        fileName: req.file.originalname,
        password: password,
        validoDesde: certData.validoDesde,
        validoHasta: certData.validoHasta,
        subject: certData.subject,
        issuer: certData.issuer,
        autoGenerado: false
      };
      db.saveConfig(config);

      res.json({
        exito: true,
        mensaje: 'Certificado digital importado y validado correctamente',
        certificado: config.certificado
      });
    } catch (certErr) {
      // Eliminar archivo si la contraseña no funcionó
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({
        exito: false,
        mensaje: `No se pudo desencriptar el certificado. Verifique la contraseña proporcionada: ${certErr.message}`
      });
    }
  } catch (err) {
    res.status(500).json({ exito: false, mensaje: err.message });
  }
});

module.exports = router;
