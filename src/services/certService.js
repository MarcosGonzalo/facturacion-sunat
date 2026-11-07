const fs = require('fs');
const path = require('path');
const forge = require('node-forge');

const CERT_STORAGE_DIR = path.join(__dirname, '..', '..', 'storage', 'certificates');

if (!fs.existsSync(CERT_STORAGE_DIR)) {
  fs.mkdirSync(CERT_STORAGE_DIR, { recursive: true });
}

/**
 * Carga y desencripta un certificado PKCS#12 (.p12 / .pfx)
 */
function loadCertificate(pfxPath, password) {
  if (!fs.existsSync(pfxPath)) {
    throw new Error(`El archivo de certificado no existe en: ${pfxPath}`);
  }

  const p12Buffer = fs.readFileSync(pfxPath);
  const p12Der = p12Buffer.toString('binary');
  const p12Asn1 = forge.asn1.fromDer(p12Der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password || '');

  // Extract private key
  let privateKeyPem = null;
  for (const safeContent of p12.safeContents) {
    for (const safeBag of safeContent.safeBags) {
      if (safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag || safeBag.key) {
        privateKeyPem = forge.pki.privateKeyToPem(safeBag.key);
        break;
      }
    }
    if (privateKeyPem) break;
  }

  // Extract certificate
  let certPem = null;
  let certObj = null;
  for (const safeContent of p12.safeContents) {
    for (const safeBag of safeContent.safeBags) {
      if (safeBag.type === forge.pki.oids.certBag && safeBag.cert) {
        certObj = safeBag.cert;
        certPem = forge.pki.certificateToPem(safeBag.cert);
        break;
      }
    }
    if (certPem) break;
  }

  if (!privateKeyPem || !certPem) {
    throw new Error('No se pudo extraer la llave privada o el certificado del archivo PKCS#12');
  }

  return {
    privateKeyPem,
    certPem,
    subject: certObj ? certObj.subject.attributes.map(a => `${a.shortName || a.name}=${a.value}`).join(', ') : 'N/A',
    issuer: certObj ? certObj.issuer.attributes.map(a => `${a.shortName || a.name}=${a.value}`).join(', ') : 'N/A',
    validoDesde: certObj ? certObj.validity.notBefore : null,
    validoHasta: certObj ? certObj.validity.notAfter : null
  };
}

/**
 * Genera un certificado digital X.509 PKCS#12 (.p12) válido para pruebas de homologación/beta SUNAT
 */
function generateTestCertificate(emisorData, password = '123456') {
  const pki = forge.pki;
  const keys = pki.rsa.generateKeyPair(2048);
  const cert = pki.createCertificate();

  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01' + Date.now();
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 3);

  const attrs = [
    { name: 'countryName', value: 'PE' },
    { shortName: 'ST', value: emisorData.departamento || 'Lima' },
    { name: 'localityName', value: emisorData.distrito || 'Lima' },
    { name: 'organizationName', value: emisorData.razonSocial || 'EMPRESA DEMO S.A.C.' },
    { shortName: 'OU', value: 'Facturación Electrónica SUNAT' },
    { name: 'commonName', value: `${emisorData.ruc || '20000000001'} - ${emisorData.razonSocial || 'EMPRESA DEMO'}` }
  ];

  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  // Self-sign with SHA-256
  cert.sign(keys.privateKey, forge.md.sha256.create());

  // Package as PKCS#12
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password);
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();

  const fileName = `certificado_prueba_${emisorData.ruc || '20000000001'}.p12`;
  const filePath = path.join(CERT_STORAGE_DIR, fileName);

  fs.writeFileSync(filePath, Buffer.from(p12Der, 'binary'));

  const privateKeyPem = pki.privateKeyToPem(keys.privateKey);
  const certPem = pki.certificateToPem(cert);

  return {
    filePath,
    fileName,
    password,
    privateKeyPem,
    certPem,
    subject: attrs.map(a => `${a.shortName || a.name}=${a.value}`).join(', '),
    validoDesde: cert.validity.notBefore,
    validoHasta: cert.validity.notAfter
  };
}

module.exports = {
  loadCertificate,
  generateTestCertificate,
  CERT_STORAGE_DIR
};
