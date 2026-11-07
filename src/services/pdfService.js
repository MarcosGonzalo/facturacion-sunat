const PDFDocument = require('pdfkit');

/**
 * Genera el documento PDF de representación impresa oficial de Factura o Boleta Electrónica
 * según la normativa de la SUNAT.
 */
function generateInvoicePdf(comprobante) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 36,
        info: {
          Title: `${comprobante.tipoNombre} ${comprobante.numeroCompleto}`,
          Author: comprobante.emisor?.razonSocial || 'SUNAT Facturador',
          Subject: 'Comprobante de Pago Electrónico UBL 2.1'
        }
      });

      const buffers = [];
      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const emisor = comprobante.emisor || {};
      const cliente = comprobante.cliente || {};
      const totales = comprobante.totales || {};
      const monedaSimbolo = comprobante.moneda === 'USD' ? '$' : 'S/';
      const tipoDocNombre = comprobante.tipoComprobante === '01' ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA';

      // -------------------------------------------------------------
      // 1. ENCABEZADO
      // -------------------------------------------------------------

      // Columna Izquierda: Datos del Emisor
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#1e1b4b').text(emisor.nombreComercial || emisor.razonSocial, 36, 36, { width: 320 });
      doc.font('Helvetica').fontSize(9).fillColor('#334155');
      doc.moveDown(0.3);
      doc.text(emisor.razonSocial, { width: 320 });
      doc.text(emisor.direccion || '-', { width: 320 });
      doc.text(`${emisor.distrito || ''} - ${emisor.provincia || ''} - ${emisor.departamento || ''}`, { width: 320 });
      if (emisor.telefono || emisor.correo) {
        doc.text(`Tel: ${emisor.telefono || '-'} | Email: ${emisor.correo || '-'}`, { width: 320 });
      }

      // Columna Derecha: Recuadro Oficial RUC y Comprobante
      const boxX = 370;
      const boxY = 36;
      const boxW = 190;
      const boxH = 95;

      doc.roundedRect(boxX, boxY, boxW, boxH, 8).lineWidth(1.5).strokeColor('#4f46e5').stroke();

      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(`R.U.C. N° ${emisor.ruc}`, boxX, boxY + 14, { width: boxW, align: 'center' });

      // Barra de fondo para el tipo de comprobante
      doc.rect(boxX, boxY + 34, boxW, 24).fill('#4f46e5');
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff').text(tipoDocNombre, boxX, boxY + 41, { width: boxW, align: 'center' });

      doc.font('Helvetica-Bold').fontSize(13).fillColor('#0f172a').text(comprobante.numeroCompleto, boxX, boxY + 68, { width: boxW, align: 'center' });

      // -------------------------------------------------------------
      // 2. DATOS DEL CLIENTE Y FECHA
      // -------------------------------------------------------------
      const clientBoxY = 145;
      doc.roundedRect(36, clientBoxY, 524, 60, 6).lineWidth(0.8).strokeColor('#cbd5e1').stroke();

      const docTipoCli = cliente.tipoDocumento === '6' ? 'R.U.C.' : (cliente.tipoDocumento === '1' ? 'D.N.I.' : 'DOC. IDENTIDAD');

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#475569');
      doc.text('CLIENTE / SEÑOR(ES):', 46, clientBoxY + 8);
      doc.font('Helvetica').fillColor('#0f172a').text(cliente.razonSocial || '-', 165, clientBoxY + 8, { width: 230 });

      doc.font('Helvetica-Bold').fillColor('#475569').text(`${docTipoCli}:`, 46, clientBoxY + 24);
      doc.font('Helvetica').fillColor('#0f172a').text(cliente.numeroDocumento || '-', 165, clientBoxY + 24);

      doc.font('Helvetica-Bold').fillColor('#475569').text('DIRECCIÓN FISCAL:', 46, clientBoxY + 40);
      doc.font('Helvetica').fillColor('#0f172a').text(cliente.direccion || '-', 165, clientBoxY + 40, { width: 230 });

      // Lado derecho de datos del cliente
      const rightColX = 405;
      doc.font('Helvetica-Bold').fillColor('#475569').text('FECHA EMISIÓN:', rightColX, clientBoxY + 8);
      doc.font('Helvetica').fillColor('#0f172a').text(comprobante.fechaEmision, rightColX + 85, clientBoxY + 8);

      doc.font('Helvetica-Bold').fillColor('#475569').text('MONEDA:', rightColX, clientBoxY + 24);
      doc.font('Helvetica').fillColor('#0f172a').text(comprobante.moneda === 'USD' ? 'DÓLARES ($)' : 'SOLES (PEN)', rightColX + 85, clientBoxY + 24);

      doc.font('Helvetica-Bold').fillColor('#475569').text('FORMA PAGO:', rightColX, clientBoxY + 40);
      doc.font('Helvetica').fillColor('#0f172a').text('CONTADO', rightColX + 85, clientBoxY + 40);

      // -------------------------------------------------------------
      // 3. TABLA DE ÍTEMS / DETALLE
      // -------------------------------------------------------------
      const tableY = 215;
      doc.rect(36, tableY, 524, 20).fill('#f1f5f9');

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#334155');
      doc.text('ÍTEM', 42, tableY + 6, { width: 25, align: 'center' });
      doc.text('CANT.', 72, tableY + 6, { width: 35, align: 'center' });
      doc.text('UNIDAD', 112, tableY + 6, { width: 45, align: 'center' });
      doc.text('DESCRIPCIÓN', 165, tableY + 6, { width: 220, align: 'left' });
      doc.text('VALOR UNIT.', 395, tableY + 6, { width: 75, align: 'right' });
      doc.text('TOTAL', 475, tableY + 6, { width: 75, align: 'right' });

      let currentY = tableY + 24;
      const items = comprobante.items || [];

      items.forEach((it, idx) => {
        doc.font('Helvetica').fontSize(8).fillColor('#0f172a');
        doc.text(String(idx + 1), 42, currentY, { width: 25, align: 'center' });
        doc.text(parseFloat(it.cantidad || 1).toFixed(2), 72, currentY, { width: 35, align: 'center' });
        doc.text(it.unidad || 'NIU', 112, currentY, { width: 45, align: 'center' });
        doc.text(it.descripcion || '-', 165, currentY, { width: 220 });

        const valorUnit = parseFloat(it.valorUnitario || (it.precioUnitario / 1.18)).toFixed(2);
        doc.text(valorUnit, 395, currentY, { width: 75, align: 'right' });

        const subtotal = parseFloat(it.subtotal || (it.cantidad * it.precioUnitario)).toFixed(2);
        doc.font('Helvetica-Bold').text(subtotal, 475, currentY, { width: 75, align: 'right' });

        currentY += 18;

        // Línea divisoria suave
        doc.moveTo(36, currentY - 4).lineTo(560, currentY - 4).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
      });

      // Asegurar posición mínima para totales
      const minTotalsY = Math.max(currentY + 15, 460);

      // -------------------------------------------------------------
      // 4. IMPORTE EN LETRAS & RESUMEN DE TOTALES
      // -------------------------------------------------------------
      // Caja de Monto en Letras
      doc.roundedRect(36, minTotalsY, 320, 36, 4).lineWidth(0.8).strokeColor('#e2e8f0').stroke();
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#64748b').text('IMPORTE TOTAL EN LETRAS:', 44, minTotalsY + 6);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1e293b').text(comprobante.totalLetras || '', 44, minTotalsY + 18, { width: 305 });

      // Cuadro de Totales
      const totBoxX = 368;
      const totBoxW = 192;
      const totBoxY = minTotalsY;

      doc.roundedRect(totBoxX, totBoxY, totBoxW, 95, 4).lineWidth(0.8).strokeColor('#cbd5e1').stroke();

      function printTotalRow(label, value, y, isBold = false) {
        doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor('#334155').text(label, totBoxX + 10, y);
        doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor('#0f172a').text(`${monedaSimbolo} ${parseFloat(value || 0).toFixed(2)}`, totBoxX + 90, y, { width: 92, align: 'right' });
      }

      printTotalRow('OP. GRAVADA:', totales.gravadas, totBoxY + 10);
      printTotalRow('OP. EXONERADA:', totales.exoneradas, totBoxY + 24);
      printTotalRow('OP. INAFECTA:', totales.inafectas, totBoxY + 38);
      printTotalRow('I.G.V. (18%):', totales.igv, totBoxY + 52);

      // Línea antes del total general
      doc.moveTo(totBoxX, totBoxY + 68).lineTo(totBoxX + totBoxW, totBoxY + 68).lineWidth(1).strokeColor('#cbd5e1').stroke();

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e1b4b').text('IMPORTE TOTAL:', totBoxX + 10, totBoxY + 76);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#4f46e5').text(`${monedaSimbolo} ${parseFloat(totales.total || 0).toFixed(2)}`, totBoxX + 90, totBoxY + 76, { width: 92, align: 'right' });

      // -------------------------------------------------------------
      // 5. BLOQUE CRIPTOGRÁFICO: CÓDIGO QR Y CÓDIGO HASH SUNAT
      // -------------------------------------------------------------
      const qrSectionY = minTotalsY + 48;

      if (comprobante.qrDataUrl) {
        try {
          const qrBase64Data = comprobante.qrDataUrl.replace(/^data:image\/\w+;base64,/, '');
          const qrBuffer = Buffer.from(qrBase64Data, 'base64');
          doc.image(qrBuffer, 38, qrSectionY, { width: 85, height: 85 });
        } catch (imgErr) {
          console.error('Error insertando QR en PDF:', imgErr);
        }
      }

      // Información legal y hash junto al QR
      const hashX = 132;
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#334155').text('REPRESENTACIÓN IMPRESA DEL COMPROBANTE DE PAGO ELECTRÓNICO', hashX, qrSectionY + 6);
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748b').text('Autorizado mediante Resolución de Superintendencia de la SUNAT.', hashX, qrSectionY + 18);
      doc.text('Consulte la validez de este documento informático en www.sunat.gob.pe', hashX, qrSectionY + 28);

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#334155').text('Código Hash del Comprobante (DigestValue):', hashX, qrSectionY + 42);
      doc.font('Courier').fontSize(7.5).fillColor('#0f172a').text(comprobante.digestValue || '-', hashX, qrSectionY + 52, { width: 220 });

      // -------------------------------------------------------------
      // 6. PIE DE PÁGINA
      // -------------------------------------------------------------
      doc.font('Helvetica').fontSize(7).fillColor('#94a3b8').text(
        `Emitido a través del Sistema Cliente Facturador UBL 2.1 | Estado en SUNAT: ${comprobante.estadoSunat || 'ACEPTADO'} (Cód. ${comprobante.codigoRespuestaSunat || '0'})`,
        36,
        770,
        { width: 524, align: 'center' }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateInvoicePdf };
