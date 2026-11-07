const { SignedXml } = require('xml-crypto');

/**
 * Firma digitalmente un XML UBL 2.1 conforme a los estándares técnicos de la SUNAT
 */
function signXml(xmlString, privateKeyPem, certPem, signatureId = 'Sign-SUNAT') {
  if (!xmlString) throw new Error('El contenido XML es obligatorio');
  if (!privateKeyPem) throw new Error('Se requiere la llave privada PEM para firmar');
  if (!certPem) throw new Error('Se requiere el certificado público PEM para firmar');

  const sig = new SignedXml({
    privateKey: privateKeyPem,
    publicCert: certPem,
    signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    canonicalizationAlgorithm: 'http://www.w3.org/2001/10/xml-exc-c14n#'
  });

  // SUNAT exige referencia al documento completo mediante URI="" y transformación enveloped
  sig.addReference({
    xpath: '/*',
    isEmptyUri: true,
    transforms: ['http://www.w3.org/2000/09/xmldsig#enveloped-signature'],
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256'
  });

  // Inserta el elemento ds:Signature dentro del primer ext:ExtensionContent
  sig.computeSignature(xmlString, {
    prefix: 'ds',
    attrs: { Id: signatureId },
    location: {
      reference: "//*[local-name(.)='ExtensionContent']",
      action: 'append'
    }
  });

  const signedXml = sig.getSignedXml();

  // Extraer el DigestValue (Código Hash para el comprobante impreso y el código QR)
  let digestValue = '';
  const digestMatch = signedXml.match(/<ds:DigestValue>(.*?)<\/ds:DigestValue>/) ||
                      signedXml.match(/<DigestValue>(.*?)<\/DigestValue>/);
  if (digestMatch && digestMatch[1]) {
    digestValue = digestMatch[1];
  }

  // Extraer el SignatureValue
  let signatureValue = '';
  const sigValueMatch = signedXml.match(/<ds:SignatureValue>(.*?)<\/ds:SignatureValue>/) ||
                        signedXml.match(/<SignatureValue>(.*?)<\/SignatureValue>/);
  if (sigValueMatch && sigValueMatch[1]) {
    signatureValue = sigValueMatch[1].replace(/\r?\n|\r/g, '');
  }

  return {
    signedXml,
    digestValue,
    signatureValue
  };
}

module.exports = { signXml };
