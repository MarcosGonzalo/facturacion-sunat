const QRCode = require('qrcode');

/**
 * Genera el código QR oficial según Anexo V de la SUNAT
 * Formato:
 * RUC|TipoComprobante|Serie|Numero|MontoIGV|MontoTotal|FechaEmision|TipoDocCliente|NumDocCliente|DigestValue|
 */
async function generateSunatQr({
  rucEmisor,
  tipoComprobante,
  serie,
  correlativo,
  montoIgv,
  montoTotal,
  fechaEmision,
  tipoDocCliente,
  numDocCliente,
  digestValue
}) {
  const correlativoFormateado = String(correlativo).padStart(8, '0');
  const igvStr = parseFloat(montoIgv || 0).toFixed(2);
  const totalStr = parseFloat(montoTotal || 0).toFixed(2);
  const hash = digestValue || '';

  const qrText = [
    rucEmisor,
    tipoComprobante,
    serie,
    correlativoFormateado,
    igvStr,
    totalStr,
    fechaEmision,
    tipoDocCliente || '-',
    numDocCliente || '-',
    hash,
    '' // Trailing pipe according to SUNAT format
  ].join('|');

  try {
    const qrDataUrl = await QRCode.toDataURL(qrText, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 250,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    return { qrText, qrDataUrl };
  } catch (err) {
    console.error('Error generating QR code:', err);
    throw err;
  }
}

module.exports = { generateSunatQr };
