const db = require('./src/db/jsonStore');
const { buildInvoiceXml } = require('./src/services/ublBuilder');
const { signXml } = require('./src/services/xmlSigner');
const { generateTestCertificate, loadCertificate } = require('./src/services/certService');
const { generateSunatQr } = require('./src/services/qrService');
const { generateSimulatedCdr, createInvoiceZip } = require('./src/services/sunatService');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

async function seedData() {
  console.log('🌱 Sembrando datos iniciales de demostración...');

  const config = db.getConfig();
  const emisor = config.emisor;

  // 1. Asegurar certificado de pruebas
  console.log('1. Generando certificado digital X.509 de prueba...');
  const certResult = generateTestCertificate(emisor, '123456');
  config.certificado = {
    path: certResult.filePath,
    fileName: certResult.fileName,
    password: '123456',
    validoDesde: certResult.validoDesde,
    validoHasta: certResult.validoHasta,
    subject: certResult.subject,
    autoGenerado: true
  };
  db.saveConfig(config);

  const certLoaded = loadCertificate(certResult.filePath, '123456');

  // 2. Comprobante 1: Factura F001-00000001 (Aceptada por SUNAT)
  console.log('2. Generando Factura de demostración F001-00000001...');
  const cliente1 = {
    tipoDocumento: '6',
    numeroDocumento: '20100070970',
    razonSocial: 'BANCO DE CREDITO DEL PERU',
    direccion: 'CALLE CENTENARIO 156, LA MOLINA, LIMA'
  };

  const items1 = [
    {
      codigo: 'SRV-001',
      descripcion: 'SERVICIO DE DESARROLLO DE SOFTWARE ERP',
      unidad: 'ZZ',
      cantidad: 1,
      precioUnitario: 1180.00,
      valorUnitario: 1000.00,
      precioUnitarioConIgv: 1180.00,
      subtotal: 1000.00,
      igv: 180.00,
      tipoAfectacion: '10'
    },
    {
      codigo: 'LIB-301',
      descripcion: 'MANUAL TÉCNICO UBL 2.1 SUNAT',
      unidad: 'NIU',
      cantidad: 2,
      precioUnitario: 120.00,
      valorUnitario: 120.00,
      precioUnitarioConIgv: 120.00,
      subtotal: 240.00,
      igv: 0.00,
      tipoAfectacion: '30' // Inafecto
    }
  ];

  const totales1 = {
    gravadas: 1000.00,
    exoneradas: 0.00,
    inafectas: 240.00,
    valorVenta: 1240.00,
    igv: 180.00,
    total: 1420.00
  };

  const docData1 = {
    emisor,
    cliente: cliente1,
    tipoComprobante: '01',
    serie: 'F001',
    correlativo: 1,
    fechaEmision: '2026-11-06',
    horaEmision: '10:30:00',
    moneda: 'PEN',
    items: items1,
    totales: totales1
  };

  const xmlRes1 = buildInvoiceXml(docData1);
  const signRes1 = signXml(xmlRes1.xml, certLoaded.privateKeyPem, certLoaded.certPem, 'Sign-SUNAT');

  // Guardar XML firmado
  const xmlPath1 = path.join(__dirname, 'storage', 'xml', xmlRes1.fileName);
  fs.writeFileSync(xmlPath1, signRes1.signedXml, 'utf8');

  // Guardar ZIP
  createInvoiceZip(signRes1.signedXml, xmlRes1.fileName, xmlRes1.zipFileName);

  // Generar QR
  const qrRes1 = await generateSunatQr({
    rucEmisor: emisor.ruc,
    tipoComprobante: '01',
    serie: 'F001',
    correlativo: 1,
    montoIgv: totales1.igv,
    montoTotal: totales1.total,
    fechaEmision: '2026-11-06',
    tipoDocCliente: cliente1.tipoDocumento,
    numDocCliente: cliente1.numeroDocumento,
    digestValue: signRes1.digestValue
  });

  // Generar CDR de SUNAT
  const cdr1 = generateSimulatedCdr(emisor.ruc, '01', 'F001', 1, signRes1.digestValue);

  const comprobante1 = {
    id: uuidv4(),
    tipoComprobante: '01',
    tipoNombre: 'Factura Electrónica',
    serie: 'F001',
    correlativo: 1,
    numeroCompleto: 'F001-00000001',
    fechaEmision: '2026-11-06',
    horaEmision: '10:30:00',
    moneda: 'PEN',
    emisor,
    cliente: cliente1,
    items: items1,
    totales: totales1,
    totalLetras: xmlRes1.totalLetras,
    digestValue: signRes1.digestValue,
    signatureValue: signRes1.signatureValue,
    qrText: qrRes1.qrText,
    qrDataUrl: qrRes1.qrDataUrl,
    fileName: xmlRes1.fileName,
    zipFileName: xmlRes1.zipFileName,
    estadoSunat: 'ACEPTADO',
    codigoRespuestaSunat: '0',
    descripcionSunat: 'La Factura número F001-00000001, ha sido aceptada satisfactoriamente (Ambiente Homologación/Beta)',
    notasSunat: ['El comprobante cumple con las especificaciones UBL 2.1 y firma electrónica de SUNAT.'],
    esSimulado: true,
    createdAt: new Date().toISOString()
  };

  // 3. Comprobante 2: Boleta B001-00000001 (Aceptada por SUNAT)
  console.log('3. Generando Boleta de demostración B001-00000001...');
  const cliente2 = {
    tipoDocumento: '1',
    numeroDocumento: '45678901',
    razonSocial: 'JUAN CARLOS PÉREZ GÓMEZ',
    direccion: 'JR. HUANCAVELICA 234, LIMA'
  };

  const items2 = [
    {
      codigo: 'PRD-101',
      descripcion: 'LICENCIA DE SOFTWARE FACTURADOR ERP ANUAL',
      unidad: 'NIU',
      cantidad: 1,
      precioUnitario: 354.00,
      valorUnitario: 300.00,
      precioUnitarioConIgv: 354.00,
      subtotal: 300.00,
      igv: 54.00,
      tipoAfectacion: '10'
    }
  ];

  const totales2 = {
    gravadas: 300.00,
    exoneradas: 0.00,
    inafectas: 0.00,
    valorVenta: 300.00,
    igv: 54.00,
    total: 354.00
  };

  const docData2 = {
    emisor,
    cliente: cliente2,
    tipoComprobante: '03',
    serie: 'B001',
    correlativo: 1,
    fechaEmision: '2026-11-06',
    horaEmision: '11:15:00',
    moneda: 'PEN',
    items: items2,
    totales: totales2
  };

  const xmlRes2 = buildInvoiceXml(docData2);
  const signRes2 = signXml(xmlRes2.xml, certLoaded.privateKeyPem, certLoaded.certPem, 'Sign-SUNAT');

  // Guardar XML firmado
  const xmlPath2 = path.join(__dirname, 'storage', 'xml', xmlRes2.fileName);
  fs.writeFileSync(xmlPath2, signRes2.signedXml, 'utf8');

  // Guardar ZIP
  createInvoiceZip(signRes2.signedXml, xmlRes2.fileName, xmlRes2.zipFileName);

  // Generar QR
  const qrRes2 = await generateSunatQr({
    rucEmisor: emisor.ruc,
    tipoComprobante: '03',
    serie: 'B001',
    correlativo: 1,
    montoIgv: totales2.igv,
    montoTotal: totales2.total,
    fechaEmision: '2026-11-06',
    tipoDocCliente: cliente2.tipoDocumento,
    numDocCliente: cliente2.numeroDocumento,
    digestValue: signRes2.digestValue
  });

  // Generar CDR
  const cdr2 = generateSimulatedCdr(emisor.ruc, '03', 'B001', 1, signRes2.digestValue);

  const comprobante2 = {
    id: uuidv4(),
    tipoComprobante: '03',
    tipoNombre: 'Boleta de Venta Electrónica',
    serie: 'B001',
    correlativo: 1,
    numeroCompleto: 'B001-00000001',
    fechaEmision: '2026-11-06',
    horaEmision: '11:15:00',
    moneda: 'PEN',
    emisor,
    cliente: cliente2,
    items: items2,
    totales: totales2,
    totalLetras: xmlRes2.totalLetras,
    digestValue: signRes2.digestValue,
    signatureValue: signRes2.signatureValue,
    qrText: qrRes2.qrText,
    qrDataUrl: qrRes2.qrDataUrl,
    fileName: xmlRes2.fileName,
    zipFileName: xmlRes2.zipFileName,
    estadoSunat: 'ACEPTADO',
    codigoRespuestaSunat: '0',
    descripcionSunat: 'La Boleta número B001-00000001, ha sido aceptada satisfactoriamente (Ambiente Homologación/Beta)',
    notasSunat: ['El comprobante cumple con las especificaciones UBL 2.1.'],
    esSimulado: true,
    createdAt: new Date().toISOString()
  };

  // Guardar comprobantes en base de datos
  db.saveComprobantes([comprobante1, comprobante2]);

  // Actualizar correlativos siguientes en configuración
  config.series.correlativoFactura = 2;
  config.series.correlativoBoleta = 2;
  db.saveConfig(config);

  console.log('✅ Base de datos sembrada con éxito: 1 Factura y 1 Boleta con firmas, QR y CDR generados.');
}

seedData().catch(err => {
  console.error('Error al sembrar datos:', err);
  process.exit(1);
});
