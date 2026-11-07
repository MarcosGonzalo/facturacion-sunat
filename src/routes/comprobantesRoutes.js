const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const db = require('../db/jsonStore');
const { buildInvoiceXml } = require('../services/ublBuilder');
const { signXml } = require('../services/xmlSigner');
const { generateSunatQr } = require('../services/qrService');
const { sendInvoiceToSunat } = require('../services/sunatService');
const { loadCertificate, generateTestCertificate } = require('../services/certService');
const { validarComprobante } = require('../services/validatorService');
const { generateInvoicePdf } = require('../services/pdfService');

// GET /api/comprobantes
router.get('/', (req, res) => {
  try {
    const { tipo, estado, q } = req.query;
    let comprobantes = db.getComprobantes();

    if (tipo) {
      comprobantes = comprobantes.filter(c => c.tipoComprobante === tipo);
    }
    if (estado) {
      comprobantes = comprobantes.filter(c => c.estadoSunat === estado);
    }
    if (q) {
      const term = q.toLowerCase();
      comprobantes = comprobantes.filter(c =>
        c.numeroCompleto.toLowerCase().includes(term) ||
        c.cliente.razonSocial.toLowerCase().includes(term) ||
        (c.cliente.numeroDocumento && c.cliente.numeroDocumento.includes(term))
      );
    }

    // Ordenar de más reciente a más antiguo
    comprobantes.sort((a, b) => new Date(b.createdAt || b.fechaEmision) - new Date(a.createdAt || a.fechaEmision));

    res.json({ exito: true, comprobantes });
  } catch (err) {
    res.status(500).json({ exito: false, mensaje: err.message });
  }
});

// GET /api/comprobantes/:id
router.get('/:id', (req, res) => {
  try {
    const comprobantes = db.getComprobantes();
    const doc = comprobantes.find(c => c.id === req.params.id);
    if (!doc) {
      return res.status(404).json({ exito: false, mensaje: 'Comprobante no encontrado' });
    }
    res.json({ exito: true, comprobante: doc });
  } catch (err) {
    res.status(500).json({ exito: false, mensaje: err.message });
  }
});

// POST /api/comprobantes/emitir
router.post('/emitir', async (req, res) => {
  try {
    const config = db.getConfig();
    const payload = req.body;

    // Asignar emisor actual desde la configuración si no viene en el payload
    const emisor = config.emisor;
    const tipoComprobante = payload.tipoComprobante || '01'; // '01' Factura, '03' Boleta
    const serie = payload.serie || (tipoComprobante === '01' ? (config.series?.factura || 'F001') : (config.series?.boleta || 'B001'));

    // Obtener correlativo
    let correlativo = payload.correlativo;
    if (!correlativo) {
      correlativo = tipoComprobante === '01'
        ? (config.series?.correlativoFactura || 1)
        : (config.series?.correlativoBoleta || 1);
    }

    const fechaEmision = payload.fechaEmision || new Date().toISOString().split('T')[0];
    const horaEmision = payload.horaEmision || new Date().toTimeString().split(' ')[0];
    const moneda = payload.moneda || 'PEN';
    const items = payload.items || [];
    const cliente = payload.cliente;

    // Calcular totales
    let gravadas = 0;
    let exoneradas = 0;
    let inafectas = 0;
    let igv = 0;

    const itemsCalculados = items.map(item => {
      const cantidad = parseFloat(item.cantidad || 1);
      const precioUnit = parseFloat(item.precioUnitario || 0);
      const tipoAfec = item.tipoAfectacion || '10';

      let valorUnitario = precioUnit;
      let precioUnitarioConIgv = precioUnit;
      let igvItem = 0;
      let subtotalItem = 0;

      if (tipoAfec === '10') { // Gravado
        valorUnitario = +(precioUnit / 1.18).toFixed(2);
        subtotalItem = +(valorUnitario * cantidad).toFixed(2);
        igvItem = +(subtotalItem * 0.18).toFixed(2);
        precioUnitarioConIgv = precioUnit;
        gravadas += subtotalItem;
        igv += igvItem;
      } else if (tipoAfec === '20') { // Exonerado
        valorUnitario = precioUnit;
        precioUnitarioConIgv = precioUnit;
        subtotalItem = +(valorUnitario * cantidad).toFixed(2);
        igvItem = 0;
        exoneradas += subtotalItem;
      } else if (tipoAfec === '30') { // Inafecto
        valorUnitario = precioUnit;
        precioUnitarioConIgv = precioUnit;
        subtotalItem = +(valorUnitario * cantidad).toFixed(2);
        igvItem = 0;
        inafectas += subtotalItem;
      }

      return {
        ...item,
        cantidad,
        precioUnitario: precioUnit,
        valorUnitario,
        precioUnitarioConIgv,
        subtotal: subtotalItem,
        igv: igvItem,
        tipoAfectacion: tipoAfec
      };
    });

    const valorVentaTotal = +(gravadas + exoneradas + inafectas).toFixed(2);
    const totalPagar = +(gravadas + exoneradas + inafectas + igv).toFixed(2);

    const totales = {
      gravadas: +gravadas.toFixed(2),
      exoneradas: +exoneradas.toFixed(2),
      inafectas: +inafectas.toFixed(2),
      valorVenta: valorVentaTotal,
      igv: +igv.toFixed(2),
      total: totalPagar
    };

    const docData = {
      emisor,
      cliente,
      tipoComprobante,
      serie,
      correlativo,
      fechaEmision,
      horaEmision,
      moneda,
      items: itemsCalculados,
      totales
    };

    // 1. Validar reglas de negocio
    const validacion = validarComprobante(docData);
    if (!validacion.valido) {
      return res.status(400).json({
        exito: false,
        mensaje: 'Errores de validación en los datos del comprobante',
        errores: validacion.errores
      });
    }

    // 2. Asegurar que existe certificado digital (si no existe, auto-generar uno de prueba)
    let certData;
    if (config.certificado && config.certificado.path && fs.existsSync(config.certificado.path)) {
      certData = loadCertificate(config.certificado.path, config.certificado.password);
    } else {
      const generated = generateTestCertificate(emisor, '123456');
      config.certificado = {
        path: generated.filePath,
        fileName: generated.fileName,
        password: '123456',
        validoDesde: generated.validoDesde,
        validoHasta: generated.validoHasta,
        subject: generated.subject,
        autoGenerado: true
      };
      db.saveConfig(config);
      certData = loadCertificate(generated.filePath, '123456');
    }

    // 3. Generar XML UBL 2.1
    const { xml, numeroCompleto, fileName, zipFileName, totalLetras } = buildInvoiceXml(docData);

    // 4. Firmar Digitalmente el XML
    const { signedXml, digestValue, signatureValue } = signXml(xml, certData.privateKeyPem, certData.certPem, 'Sign-SUNAT');

    // 5. Generar Código QR Oficial SUNAT Anexo V
    const { qrText, qrDataUrl } = await generateSunatQr({
      rucEmisor: emisor.ruc,
      tipoComprobante,
      serie,
      correlativo,
      montoIgv: totales.igv,
      montoTotal: totales.total,
      fechaEmision,
      tipoDocCliente: cliente.tipoDocumento,
      numDocCliente: cliente.numeroDocumento,
      digestValue
    });

    // 6. Enviar a SUNAT (o modo simulación)
    const sunatResult = await sendInvoiceToSunat({
      ruc: emisor.ruc,
      solUser: config.sunat.solUser,
      solPass: config.sunat.solPass,
      endpoint: config.sunat.endpoint,
      modoSimulacion: config.sunat.modoSimulacion,
      tipoDoc: tipoComprobante,
      serie,
      correlativo,
      xmlSignedString: signedXml,
      digestValue
    });

    // 7. Actualizar correlativo en configuración
    if (tipoComprobante === '01') {
      config.series.correlativoFactura = parseInt(correlativo) + 1;
    } else {
      config.series.correlativoBoleta = parseInt(correlativo) + 1;
    }
    db.saveConfig(config);

    // 8. Crear y guardar registro del comprobante
    const id = uuidv4();
    const nuevoComprobante = {
      id,
      tipoComprobante,
      tipoNombre: tipoComprobante === '01' ? 'Factura Electrónica' : 'Boleta de Venta Electrónica',
      serie,
      correlativo,
      numeroCompleto,
      fechaEmision,
      horaEmision,
      moneda,
      emisor,
      cliente,
      items: itemsCalculados,
      totales,
      totalLetras,
      digestValue,
      signatureValue,
      qrText,
      qrDataUrl,
      fileName,
      zipFileName,
      // Estado ante SUNAT
      estadoSunat: sunatResult.estado, // 'ACEPTADO', 'RECHAZADO', 'PENDIENTE'
      codigoRespuestaSunat: sunatResult.responseCode,
      descripcionSunat: sunatResult.description,
      notasSunat: sunatResult.notes || [],
      esSimulado: !!sunatResult.esSimulado,
      createdAt: new Date().toISOString()
    };

    const comprobantes = db.getComprobantes();
    comprobantes.push(nuevoComprobante);
    db.saveComprobantes(comprobantes);

    res.json({
      exito: true,
      mensaje: sunatResult.estado === 'ACEPTADO'
        ? `Comprobante ${numeroCompleto} emitido y aceptado por SUNAT`
        : `Comprobante ${numeroCompleto} emitido con estado: ${sunatResult.estado}`,
      comprobante: nuevoComprobante,
      sunat: sunatResult
    });

  } catch (err) {
    console.error('Error al emitir comprobante:', err);
    res.status(500).json({
      exito: false,
      mensaje: `Error al procesar el comprobante: ${err.message}`
    });
  }
});

// POST /api/comprobantes/:id/reenviar
router.post('/:id/reenviar', async (req, res) => {
  try {
    const comprobantes = db.getComprobantes();
    const index = comprobantes.findIndex(c => c.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ exito: false, mensaje: 'Comprobante no encontrado' });
    }

    const doc = comprobantes[index];
    const config = db.getConfig();

    // Leer el XML firmado guardado
    const xmlPath = path.join(__dirname, '..', '..', 'storage', 'xml', doc.fileName);
    if (!fs.existsSync(xmlPath)) {
      return res.status(400).json({ exito: false, mensaje: 'El archivo XML firmado original no se encontró en disco' });
    }

    const xmlSignedString = fs.readFileSync(xmlPath, 'utf8');

    // Reenviar a SUNAT
    const sunatResult = await sendInvoiceToSunat({
      ruc: doc.emisor.ruc,
      solUser: config.sunat.solUser,
      solPass: config.sunat.solPass,
      endpoint: config.sunat.endpoint,
      modoSimulacion: config.sunat.modoSimulacion,
      tipoDoc: doc.tipoComprobante,
      serie: doc.serie,
      correlativo: doc.correlativo,
      xmlSignedString,
      digestValue: doc.digestValue
    });

    doc.estadoSunat = sunatResult.estado;
    doc.codigoRespuestaSunat = sunatResult.responseCode;
    doc.descripcionSunat = sunatResult.description;
    doc.notasSunat = sunatResult.notes || [];
    doc.esSimulado = !!sunatResult.esSimulado;
    doc.updatedAt = new Date().toISOString();

    comprobantes[index] = doc;
    db.saveComprobantes(comprobantes);

    res.json({
      exito: true,
      mensaje: `Reenvío completado. Nuevo estado: ${sunatResult.estado}`,
      comprobante: doc,
      sunat: sunatResult
    });
  } catch (err) {
    res.status(500).json({ exito: false, mensaje: err.message });
  }
});

// GET /api/comprobantes/:id/xml (Descargar XML firmado)
router.get('/:id/xml', (req, res) => {
  try {
    const comprobantes = db.getComprobantes();
    const doc = comprobantes.find(c => c.id === req.params.id);
    if (!doc) return res.status(404).send('Comprobante no encontrado');

    const filePath = path.join(__dirname, '..', '..', 'storage', 'xml', doc.fileName);
    if (!fs.existsSync(filePath)) return res.status(404).send('Archivo XML no encontrado');

    res.setHeader('Content-Disposition', `attachment; filename="${doc.fileName}"`);
    res.setHeader('Content-Type', 'application/xml');
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// GET /api/comprobantes/:id/zip (Descargar ZIP enviado)
router.get('/:id/zip', (req, res) => {
  try {
    const comprobantes = db.getComprobantes();
    const doc = comprobantes.find(c => c.id === req.params.id);
    if (!doc) return res.status(404).send('Comprobante no encontrado');

    const filePath = path.join(__dirname, '..', '..', 'storage', 'zip', doc.zipFileName);
    if (!fs.existsSync(filePath)) return res.status(404).send('Archivo ZIP no encontrado');

    res.setHeader('Content-Disposition', `attachment; filename="${doc.zipFileName}"`);
    res.setHeader('Content-Type', 'application/zip');
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// GET /api/comprobantes/:id/cdr-zip (Descargar ZIP del CDR recibido de SUNAT)
router.get('/:id/cdr-zip', (req, res) => {
  try {
    const comprobantes = db.getComprobantes();
    const doc = comprobantes.find(c => c.id === req.params.id);
    if (!doc) return res.status(404).send('Comprobante no encontrado');

    const baseName = `R-${doc.emisor.ruc}-${doc.tipoComprobante}-${doc.numeroCompleto}.zip`;
    const filePath = path.join(__dirname, '..', '..', 'storage', 'cdr', baseName);
    if (!fs.existsSync(filePath)) return res.status(404).send('Constancia CDR (ZIP) aún no disponible o comprobante rechazado antes de emitir CDR');

    res.setHeader('Content-Disposition', `attachment; filename="${baseName}"`);
    res.setHeader('Content-Type', 'application/zip');
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// GET /api/comprobantes/:id/cdr-xml (Descargar XML del CDR recibido de SUNAT)
router.get('/:id/cdr-xml', (req, res) => {
  try {
    const comprobantes = db.getComprobantes();
    const doc = comprobantes.find(c => c.id === req.params.id);
    if (!doc) return res.status(404).send('Comprobante no encontrado');

    const baseName = `R-${doc.emisor.ruc}-${doc.tipoComprobante}-${doc.numeroCompleto}.xml`;
    const filePath = path.join(__dirname, '..', '..', 'storage', 'cdr', baseName);
    if (!fs.existsSync(filePath)) return res.status(404).send('Constancia CDR (XML) no disponible');

    res.setHeader('Content-Disposition', `attachment; filename="${baseName}"`);
    res.setHeader('Content-Type', 'application/xml');
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// GET /api/comprobantes/:id/pdf (Generar y Descargar Representación Impresa PDF)
router.get('/:id/pdf', async (req, res) => {
  try {
    const comprobantes = db.getComprobantes();
    const doc = comprobantes.find(c => c.id === req.params.id);
    if (!doc) return res.status(404).send('Comprobante no encontrado');

    const pdfBuffer = await generateInvoicePdf(doc);
    const pdfFileName = `${doc.emisor.ruc}-${doc.tipoComprobante}-${doc.numeroCompleto}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${pdfFileName}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generando PDF:', err);
    res.status(500).send(`Error al generar el documento PDF: ${err.message}`);
  }
});

module.exports = router;
