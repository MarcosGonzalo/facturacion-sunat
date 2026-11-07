const express = require('express');
const router = express.Router();
const { testSunatConnection } = require('../services/sunatService');
const db = require('../db/jsonStore');
const { XMLParser } = require('fast-xml-parser');

// GET /api/sunat/ping
router.get('/ping', async (req, res) => {
  try {
    const config = db.getConfig();
    const endpoint = req.query.endpoint || config.sunat.endpoint;
    const result = await testSunatConnection(endpoint);
    res.json({ exito: true, ...result });
  } catch (err) {
    res.status(500).json({ exito: false, mensaje: err.message });
  }
});

// POST /api/sunat/validar-xml
router.post('/validar-xml', (req, res) => {
  try {
    const { xmlContent } = req.body;
    if (!xmlContent) {
      return res.status(400).json({ exito: false, mensaje: 'El contenido XML es obligatorio' });
    }

    const parser = new XMLParser({
      ignoreAttributes: false,
      removeNSPrefix: false
    });

    const parsed = parser.parse(xmlContent);
    const invoice = parsed.Invoice || parsed['Invoice'];

    const checks = [];

    // Chequeos UBL 2.1
    checks.push({
      regla: 'Raíz del comprobante <Invoice>',
      cumple: !!invoice,
      detalle: invoice ? 'Etiqueta raíz Invoice detectada' : 'No se encontró la raíz Invoice'
    });

    const ublVersion = invoice?.['cbc:UBLVersionID'];
    checks.push({
      regla: 'Versión de UBL 2.1 (<cbc:UBLVersionID>)',
      cumple: ublVersion === '2.1' || ublVersion === 2.1,
      detalle: `Valor encontrado: ${ublVersion || 'No encontrado'}`
    });

    const signature = invoice?.['cac:Signature'] || invoice?.['ext:UBLExtensions'];
    checks.push({
      regla: 'Firma Digital XMLDSig',
      cumple: xmlContent.includes('<ds:Signature') || xmlContent.includes('<Signature'),
      detalle: xmlContent.includes('<ds:Signature') ? 'Firma digital XMLDSig detectada' : 'No contiene bloque de firma digital'
    });

    const emisorRuc = invoice?.['cac:AccountingSupplierParty']?.['cac:Party']?.['cac:PartyIdentification']?.['cbc:ID'];
    checks.push({
      regla: 'Identificación de Emisor (<cac:AccountingSupplierParty>)',
      cumple: !!emisorRuc,
      detalle: `RUC Emisor: ${typeof emisorRuc === 'object' ? emisorRuc['#text'] || JSON.stringify(emisorRuc) : emisorRuc || 'No encontrado'}`
    });

    const clienteDoc = invoice?.['cac:AccountingCustomerParty']?.['cac:Party']?.['cac:PartyIdentification']?.['cbc:ID'];
    checks.push({
      regla: 'Identificación de Cliente (<cac:AccountingCustomerParty>)',
      cumple: !!clienteDoc,
      detalle: `Documento Cliente: ${typeof clienteDoc === 'object' ? clienteDoc['#text'] || JSON.stringify(clienteDoc) : clienteDoc || 'No encontrado'}`
    });

    const taxTotal = invoice?.['cac:TaxTotal'];
    checks.push({
      regla: 'Desglose de Impuestos (<cac:TaxTotal>)',
      cumple: !!taxTotal,
      detalle: taxTotal ? 'Bloque de impuestos conforme' : 'No se encontró bloque TaxTotal'
    });

    const totalMonetario = invoice?.['cac:LegalMonetaryTotal'];
    checks.push({
      regla: 'Totales Monetarios (<cac:LegalMonetaryTotal>)',
      cumple: !!totalMonetario,
      detalle: totalMonetario ? 'Bloque de totales monetarios presente' : 'No se encontró bloque LegalMonetaryTotal'
    });

    const esValido = checks.every(c => c.cumple);

    res.json({
      exito: true,
      esValido,
      resumen: esValido ? 'El documento XML cumple con los requerimientos esenciales del estándar UBL 2.1 SUNAT.' : 'El documento XML presenta inconsistencias frente a la estructura normativa de SUNAT.',
      checks
    });

  } catch (err) {
    res.status(400).json({
      exito: false,
      mensaje: `Error en la estructura XML (Sintaxis no válida): ${err.message}`
    });
  }
});

module.exports = router;
