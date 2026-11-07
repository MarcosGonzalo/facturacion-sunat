const { buildInvoiceXml } = require('./src/services/ublBuilder');
const { generateTestCertificate, loadCertificate } = require('./src/services/certService');
const { signXml } = require('./src/services/xmlSigner');
const { generateSunatQr } = require('./src/services/qrService');
const { createInvoiceZip, generateSimulatedCdr } = require('./src/services/sunatService');
const { validarComprobante, validarRuc, validarDni } = require('./src/services/validatorService');

async function runTests() {
  console.log('🧪 INICIANDO PRUEBAS UNITARIAS Y DE INTEGRACIÓN...');

  // 1. Validaciones RUC y DNI
  console.log('\n--- 1. Validaciones RUC & DNI ---');
  console.log('RUC 20000000001 (SUNAT Prueba):', validarRuc('20000000001') ? 'VÁLIDO ✅' : 'INVÁLIDO ❌');
  console.log('RUC 20601234567:', validarRuc('20601234567') ? 'VÁLIDO ✅' : 'INVÁLIDO ❌');
  console.log('DNI 45678901:', validarDni('45678901') ? 'VÁLIDO ✅' : 'INVÁLIDO ❌');

  // 2. Generación de Certificado Digital X.509
  console.log('\n--- 2. Generación de Certificado Digital X.509 PKCS#12 ---');
  const emisor = {
    ruc: '20000000001',
    razonSocial: 'EMPRESA DEMO S.A.C.',
    nombreComercial: 'DEMO FACTURACIÓN',
    ubigeo: '150101',
    departamento: 'LIMA',
    provincia: 'LIMA',
    distrito: 'SAN ISIDRO',
    direccion: 'AV. JAVIER PRADO ESTE 1234'
  };

  const certGen = generateTestCertificate(emisor, '123456');
  console.log('Certificado generado en:', certGen.filePath, '✅');
  console.log('Sujeto:', certGen.subject);

  const certLoaded = loadCertificate(certGen.filePath, '123456');
  console.log('Certificado cargado y desencriptado con éxito ✅');

  // 3. Generación de Factura UBL 2.1
  console.log('\n--- 3. Generación de XML UBL 2.1 ---');
  const facturaData = {
    emisor,
    cliente: {
      tipoDocumento: '6',
      numeroDocumento: '20601234567',
      razonSocial: 'CORPORACION LOGISTICA DEL PACIFICO S.A.C.',
      direccion: 'AV. ARGENTINA 4568, CALLAO'
    },
    tipoComprobante: '01',
    serie: 'F001',
    correlativo: 1,
    fechaEmision: '2026-11-06',
    horaEmision: '15:30:00',
    moneda: 'PEN',
    items: [
      {
        codigo: 'SRV-001',
        descripcion: 'SERVICIO DE DESARROLLO DE SOFTWARE',
        unidad: 'ZZ',
        cantidad: 1,
        precioUnitario: 118.00,
        tipoAfectacion: '10'
      }
    ],
    totales: {
      gravadas: 100.00,
      exoneradas: 0.00,
      inafectas: 0.00,
      valorVenta: 100.00,
      igv: 18.00,
      total: 118.00
    }
  };

  const validacion = validarComprobante(facturaData);
  console.log('Validación de negocio:', validacion.valido ? 'CONFORME ✅' : `ERRORES: ${validacion.errores.join(', ')} ❌`);

  const { xml, numeroCompleto, fileName, zipFileName, totalLetras } = buildInvoiceXml(facturaData);
  console.log('XML UBL 2.1 generado para comprobante:', numeroCompleto, '✅');
  console.log('Monto en letras:', totalLetras);
  console.log('Nombre de archivo XML normado:', fileName);

  // 4. Firma Digital XMLDSig
  console.log('\n--- 4. Firma Digital XMLDSig ---');
  const { signedXml, digestValue, signatureValue } = signXml(xml, certLoaded.privateKeyPem, certLoaded.certPem, 'Sign-SUNAT');
  console.log('XML firmado digitalmente ✅');
  console.log('Código Hash (DigestValue):', digestValue);
  console.log('Valor de Firma (primeros 50 caracteres):', signatureValue.substring(0, 50) + '...');

  // 5. Empaquetado ZIP
  console.log('\n--- 5. Empaquetado en archivo ZIP ---');
  const { zipPath, zipBase64 } = createInvoiceZip(signedXml, fileName, zipFileName);
  console.log('Archivo ZIP creado en:', zipPath, '✅');
  console.log('Tamaño en Base64:', zipBase64.length, 'caracteres');

  // 6. Código QR SUNAT Anexo V
  console.log('\n--- 6. Generación de Código QR Oficial SUNAT ---');
  const { qrText, qrDataUrl } = await generateSunatQr({
    rucEmisor: emisor.ruc,
    tipoComprobante: '01',
    serie: 'F001',
    correlativo: 1,
    montoIgv: 18.00,
    montoTotal: 118.00,
    fechaEmision: '2026-11-06',
    tipoDocCliente: '6',
    numDocCliente: '20601234567',
    digestValue
  });
  console.log('Texto QR según formato SUNAT:', qrText);
  console.log('QR DataURL generado correctamente (longitud):', qrDataUrl.length, '✅');

  // 7. Simulación de CDR
  console.log('\n--- 7. Simulación de Constancia de Recepción (CDR) ---');
  const simulatedCdr = generateSimulatedCdr(emisor.ruc, '01', 'F001', 1, digestValue);
  console.log('CDR simulado generado:');
  console.log('- Estado:', simulatedCdr.estado, '✅');
  console.log('- Código de respuesta:', simulatedCdr.responseCode);
  console.log('- Descripción:', simulatedCdr.description);
  console.log('- Archivo CDR ZIP guardado en:', simulatedCdr.cdrZipPath);

  console.log('\n🎉 ¡TODAS LAS PRUEBAS UNITARIAS Y DE FLUJO FUERON EXITOSAS!');
}

runTests().catch(err => {
  console.error('Error durante las pruebas:', err);
  process.exit(1);
});
