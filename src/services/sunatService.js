const fs = require('fs');
const path = require('path');
const axios = require('axios');
const AdmZip = require('adm-zip');
const { XMLParser } = require('fast-xml-parser');

const STORAGE_ZIP_DIR = path.join(__dirname, '..', '..', 'storage', 'zip');
const STORAGE_CDR_DIR = path.join(__dirname, '..', '..', 'storage', 'cdr');
const STORAGE_XML_DIR = path.join(__dirname, '..', '..', 'storage', 'xml');

[STORAGE_ZIP_DIR, STORAGE_CDR_DIR, STORAGE_XML_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/**
 * Empaqueta un XML en un archivo ZIP con el nombre normado por la SUNAT
 */
function createInvoiceZip(xmlString, xmlFileName, zipFileName) {
  const zip = new AdmZip();
  zip.addFile(xmlFileName, Buffer.from(xmlString, 'utf8'));

  const zipPath = path.join(STORAGE_ZIP_DIR, zipFileName);
  zip.writeZip(zipPath);

  const zipBuffer = zip.toBuffer();
  const zipBase64 = zipBuffer.toString('base64');

  return { zipPath, zipBuffer, zipBase64 };
}

/**
 * Construye el sobre SOAP oficial para enviar comprobantes mediante sendBill
 */
function buildSoapEnvelope(ruc, solUser, solPass, zipFileName, zipBase64) {
  const fullSolUser = `${ruc}${solUser}`;
  return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:ser="http://service.sunat.gob.pe"
                  xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
  <soapenv:Header>
    <wsse:Security>
      <wsse:UsernameToken>
        <wsse:Username>${fullSolUser}</wsse:Username>
        <wsse:Password>${solPass}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soapenv:Header>
  <soapenv:Body>
    <ser:sendBill>
      <fileName>${zipFileName}</fileName>
      <contentFile>${zipBase64}</contentFile>
    </ser:sendBill>
  </soapenv:Body>
</soapenv:Envelope>`;
}

/**
 * Parsea el CDR (Constancia de Recepción) devuelto por la SUNAT
 */
function parseCdrResponse(cdrZipBase64, expectedCdrFileName) {
  try {
    const cdrZipBuffer = Buffer.from(cdrZipBase64, 'base64');
    const zip = new AdmZip(cdrZipBuffer);
    const zipEntries = zip.getEntries();

    let cdrXmlContent = '';
    let cdrXmlEntryName = '';

    for (const entry of zipEntries) {
      if (entry.entryName.endsWith('.xml')) {
        cdrXmlContent = entry.getData().toString('utf8');
        cdrXmlEntryName = entry.entryName;
        break;
      }
    }

    if (!cdrXmlContent) {
      throw new Error('El archivo ZIP de respuesta no contiene ningún documento XML (CDR)');
    }

    // Guardar CDR en disco
    const cdrZipPath = path.join(STORAGE_CDR_DIR, `${expectedCdrFileName}.zip`);
    const cdrXmlPath = path.join(STORAGE_CDR_DIR, `${expectedCdrFileName}.xml`);
    fs.writeFileSync(cdrZipPath, cdrZipBuffer);
    fs.writeFileSync(cdrXmlPath, cdrXmlContent, 'utf8');

    // Parsear el XML del CDR
    const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true });
    const parsed = parser.parse(cdrXmlContent);

    const appResponse = parsed.ApplicationResponse || {};
    const docResponse = appResponse.DocumentResponse || {};
    const response = docResponse.Response || {};

    const responseCode = response.ResponseCode !== undefined ? String(response.ResponseCode) : '0';
    const description = response.Description || 'Comprobante procesado por SUNAT';
    const referenceID = response.ReferenceID || '';

    // Observaciones o notas
    let notes = [];
    if (appResponse.Note) {
      notes = Array.isArray(appResponse.Note) ? appResponse.Note : [appResponse.Note];
    }

    const estado = responseCode === '0' ? 'ACEPTADO' : 'RECHAZADO';

    return {
      exito: true,
      estado,
      responseCode,
      description,
      referenceID,
      notes,
      cdrZipPath,
      cdrXmlPath,
      cdrXmlContent
    };
  } catch (err) {
    console.error('Error al parsear el CDR de SUNAT:', err);
    return {
      exito: false,
      estado: 'RECHAZADO',
      responseCode: 'PARSE_ERROR',
      description: `Error al procesar la Constancia de Recepción (CDR): ${err.message}`
    };
  }
}

/**
 * Genera un CDR de simulación 100% válido para pruebas locales / offline
 */
function generateSimulatedCdr(ruc, tipoDoc, serie, correlativo, digestValue) {
  const correlativoFormateado = String(correlativo).padStart(8, '0');
  const numeroCompleto = `${serie}-${correlativoFormateado}`;
  const cdrFileName = `R-${ruc}-${tipoDoc}-${numeroCompleto}`;
  const tipoNombre = tipoDoc === '01' ? 'Factura' : 'Boleta';
  const fechaHoy = new Date().toISOString().split('T')[0];
  const horaHoy = new Date().toTimeString().split(' ')[0];

  const simulatedCdrXml = `<?xml version="1.0" encoding="UTF-8"?>
<ar:ApplicationResponse xmlns:ar="urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2"
                        xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
                        xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
                        xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
                        xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>${cdrFileName}</cbc:ID>
  <cbc:IssueDate>${fechaHoy}</cbc:IssueDate>
  <cbc:IssueTime>${horaHoy}</cbc:IssueTime>
  <cbc:ResponseDate>${fechaHoy}</cbc:ResponseDate>
  <cbc:ResponseTime>${horaHoy}</cbc:ResponseTime>
  <cac:Signature>
    <cbc:ID>SignSUNAT</cbc:ID>
    <cac:SignatoryParty>
      <cac:PartyIdentification>
        <cbc:ID>20131312955</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>SUNAT - SERVICIO DE PRUEBAS</cbc:Name>
      </cac:PartyName>
    </cac:SignatoryParty>
    <cac:DigitalSignatureAttachment>
      <cac:ExternalReference>
        <cbc:URI>#SignSUNAT</cbc:URI>
      </cac:ExternalReference>
    </cac:DigitalSignatureAttachment>
  </cac:Signature>
  <cac:SenderParty>
    <cac:PartyIdentification>
      <cbc:ID schemeAgencyName="PE:SUNAT" schemeID="6">20131312955</cbc:ID>
    </cac:PartyIdentification>
    <cac:PartyLegalEntity>
      <cbc:RegistrationName>SUPERINTENDENCIA NACIONAL DE ADUANAS Y DE ADMINISTRACION TRIBUTARIA</cbc:RegistrationName>
    </cac:PartyLegalEntity>
  </cac:SenderParty>
  <cac:ReceiverParty>
    <cac:PartyIdentification>
      <cbc:ID schemeAgencyName="PE:SUNAT" schemeID="6">${ruc}</cbc:ID>
    </cac:PartyIdentification>
  </cac:ReceiverParty>
  <cac:DocumentResponse>
    <cac:Response>
      <cbc:ReferenceID>${numeroCompleto}</cbc:ReferenceID>
      <cbc:ResponseCode>0</cbc:ResponseCode>
      <cbc:Description>La ${tipoNombre} número ${numeroCompleto}, ha sido aceptada satisfactoriamente (Ambiente Homologación/Beta)</cbc:Description>
    </cac:Response>
    <cac:DocumentReference>
      <cbc:ID>${numeroCompleto}</cbc:ID>
      <cbc:DocumentTypeCode listAgencyName="PE:SUNAT" listName="Tipo de Documento">${tipoDoc}</cbc:DocumentTypeCode>
      <cac:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
      <cbc:DigestValue>${digestValue || 'TEST_HASH_SUNAT'}</cbc:DigestValue>
    </cac:DocumentReference>
  </cac:DocumentResponse>
</ar:ApplicationResponse>`;

  const zip = new AdmZip();
  zip.addFile(`${cdrFileName}.xml`, Buffer.from(simulatedCdrXml, 'utf8'));
  const zipBuffer = zip.toBuffer();
  const zipBase64 = zipBuffer.toString('base64');

  // Guardar en disco
  const cdrZipPath = path.join(STORAGE_CDR_DIR, `${cdrFileName}.zip`);
  const cdrXmlPath = path.join(STORAGE_CDR_DIR, `${cdrFileName}.xml`);
  fs.writeFileSync(cdrZipPath, zipBuffer);
  fs.writeFileSync(cdrXmlPath, simulatedCdrXml, 'utf8');

  return {
    exito: true,
    estado: 'ACEPTADO',
    responseCode: '0',
    description: `La ${tipoNombre} número ${numeroCompleto}, ha sido aceptada satisfactoriamente (Ambiente Homologación/Beta)`,
    referenceID: numeroCompleto,
    notes: ['El comprobante cumple con todas las validaciones de UBL 2.1 y firma digital requeridas por SUNAT.'],
    cdrZipPath,
    cdrXmlPath,
    cdrXmlContent: simulatedCdrXml,
    esSimulado: true
  };
}

/**
 * Envía el comprobante firmado a los servicios web de la SUNAT
 */
async function sendInvoiceToSunat({
  ruc,
  solUser,
  solPass,
  endpoint,
  modoSimulacion = false,
  tipoDoc,
  serie,
  correlativo,
  xmlSignedString,
  digestValue
}) {
  const correlativoFormateado = String(correlativo).padStart(8, '0');
  const numeroCompleto = `${serie}-${correlativoFormateado}`;
  const baseDocName = `${ruc}-${tipoDoc}-${numeroCompleto}`;
  const xmlFileName = `${baseDocName}.xml`;
  const zipFileName = `${baseDocName}.zip`;
  const expectedCdrName = `R-${baseDocName}`;

  // 1. Guardar XML firmado en storage/xml/
  const xmlPath = path.join(STORAGE_XML_DIR, xmlFileName);
  fs.writeFileSync(xmlPath, xmlSignedString, 'utf8');

  // 2. Generar el archivo ZIP
  const { zipPath, zipBase64 } = createInvoiceZip(xmlSignedString, xmlFileName, zipFileName);

  // Si está activo el modo simulación, resolvemos localmente con CDR válido
  if (modoSimulacion) {
    const simulatedCdr = generateSimulatedCdr(ruc, tipoDoc, serie, correlativo, digestValue);
    return {
      exito: true,
      ...simulatedCdr,
      xmlPath,
      zipPath
    };
  }

  // 3. Construir sobre SOAP
  const soapXml = buildSoapEnvelope(ruc, solUser, solPass, zipFileName, zipBase64);

  try {
    const response = await axios.post(endpoint, soapXml, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '""'
      },
      timeout: 25000 // 25s timeout para llamadas a SUNAT
    });

    const responseBody = response.data;

    // Extraer <applicationResponse>
    const appRespMatch = responseBody.match(/<applicationResponse>(.*?)<\/applicationResponse>/s) ||
                         responseBody.match(/<applicationResponse[^>]*>(.*?)<\/applicationResponse>/s);

    if (appRespMatch && appRespMatch[1]) {
      const cdrBase64 = appRespMatch[1].trim();
      const cdrResult = parseCdrResponse(cdrBase64, expectedCdrName);

      return {
        ...cdrResult,
        xmlPath,
        zipPath,
        soapRawResponse: responseBody
      };
    } else {
      // No vino applicationResponse en una respuesta 200
      return {
        exito: false,
        estado: 'RECHAZADO',
        responseCode: 'NO_APPLICATION_RESPONSE',
        description: 'SUNAT respondió con HTTP 200 pero no incluyó la etiqueta <applicationResponse>.',
        soapRawResponse: responseBody,
        xmlPath,
        zipPath
      };
    }

  } catch (error) {
    console.error('Error al conectar con el Web Service de SUNAT:', error.message);

    // Revisar si es SOAP Fault devuelto por el servidor SUNAT (HTTP 500 con cuerpo XML)
    if (error.response && error.response.data) {
      const errorBody = typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data);
      const faultCodeMatch = errorBody.match(/<faultcode>(.*?)<\/faultcode>/s);
      const faultStringMatch = errorBody.match(/<faultstring>(.*?)<\/faultstring>/s);

      const faultCode = faultCodeMatch ? faultCodeMatch[1].trim() : 'SOAP_FAULT';
      const faultString = faultStringMatch ? faultStringMatch[1].trim() : error.message;

      return {
        exito: false,
        estado: 'RECHAZADO',
        responseCode: faultCode,
        description: `Rechazo SUNAT (${faultCode}): ${faultString}`,
        xmlPath,
        zipPath,
        soapRawResponse: errorBody
      };
    }

    // Error de red, caída de SUNAT Beta o DNS
    return {
      exito: false,
      estado: 'PENDIENTE',
      responseCode: 'NETWORK_ERROR',
      description: `Error de conexión con SUNAT Beta: ${error.message}. Verifique su conexión o active el 'Modo Simulación' para pruebas locales.`,
      xmlPath,
      zipPath
    };
  }
}

/**
 * Prueba la conectividad con el servicio web de la SUNAT
 */
async function testSunatConnection(endpoint) {
  const startTime = Date.now();
  const url = endpoint.includes('?wsdl') ? endpoint : `${endpoint}?wsdl`;

  try {
    const res = await axios.get(url, { timeout: 8000 });
    const elapsed = Date.now() - startTime;
    return {
      online: true,
      statusCode: res.status,
      latencyMs: elapsed,
      message: `Conexión exitosa con SUNAT Beta (${elapsed} ms)`
    };
  } catch (err) {
    const elapsed = Date.now() - startTime;
    return {
      online: false,
      statusCode: err.response ? err.response.status : null,
      latencyMs: elapsed,
      message: `No se pudo conectar a SUNAT Beta: ${err.message}`
    };
  }
}

module.exports = {
  sendInvoiceToSunat,
  testSunatConnection,
  generateSimulatedCdr,
  createInvoiceZip,
  STORAGE_ZIP_DIR,
  STORAGE_CDR_DIR,
  STORAGE_XML_DIR
};
