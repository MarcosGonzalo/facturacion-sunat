// Componente Visor de Representación Impresa (Formato A4 y Ticket 80mm con Código QR Oficial y Hash)

let visorCurrentDoc = null;
let visorCurrentFormat = 'a4'; // 'a4' | 'ticket'

async function openVisorModal(id) {
  const modal = document.getElementById('visor-modal');
  const printArea = document.getElementById('print-area');
  const downloadBtn = document.getElementById('visor-btn-download-pdf');
  if (!modal || !printArea) return;

  modal.classList.remove('hidden');
  printArea.innerHTML = '<div class="p-12 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin text-2xl mb-2"></i><br>Cargando representación impresa...</div>';

  if (downloadBtn) {
    downloadBtn.href = `/api/comprobantes/${id}/pdf`;
  }

  try {
    const res = await apiFetch(`/api/comprobantes/${id}`);
    visorCurrentDoc = res.comprobante;
    renderVisorContent();
  } catch (err) {
    printArea.innerHTML = `<div class="p-8 text-center text-rose-600 font-bold">Error al cargar comprobante: ${err.message}</div>`;
  }
}

function setVisorFormat(format) {
  visorCurrentFormat = format;
  const btnA4 = document.getElementById('visor-btn-a4');
  const btnTicket = document.getElementById('visor-btn-ticket');

  if (btnA4 && btnTicket) {
    if (format === 'a4') {
      btnA4.className = 'px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white';
      btnTicket.className = 'px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200';
    } else {
      btnTicket.className = 'px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white';
      btnA4.className = 'px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200';
    }
  }

  renderVisorContent();
}

function renderVisorContent() {
  const printArea = document.getElementById('print-area');
  if (!printArea || !visorCurrentDoc) return;

  const doc = visorCurrentDoc;
  const emisor = doc.emisor || {};
  const cliente = doc.cliente || {};
  const totales = doc.totales || {};
  const monedaSimbolo = doc.moneda === 'USD' ? '$' : 'S/';

  if (visorCurrentFormat === 'ticket') {
    // FORMATO TICKET 80MM (TÉRMICO)
    printArea.innerHTML = `
      <div id="printable-ticket" class="ticket-preview mx-auto bg-white p-4 text-slate-900 border border-slate-200 shadow-sm max-w-[340px]">
        <!-- Cabecera Ticket -->
        <div class="text-center pb-3 border-b border-dashed border-slate-300">
          <h2 class="font-bold text-sm tracking-wide uppercase">${emisor.nombreComercial || emisor.razonSocial}</h2>
          <p class="text-[10px] text-slate-600 font-medium">${emisor.razonSocial}</p>
          <p class="text-[10px] text-slate-500">${emisor.direccion || ''}</p>
          <p class="text-[10px] text-slate-500">${emisor.distrito || ''} - ${emisor.provincia || ''} - ${emisor.departamento || ''}</p>
          <p class="text-[10px] font-bold mt-1">R.U.C. N° ${emisor.ruc}</p>
        </div>

        <!-- Tipo y Número de Comprobante -->
        <div class="text-center py-2 border-b border-dashed border-slate-300">
          <h3 class="font-extrabold text-xs tracking-wider uppercase">${doc.tipoNombre}</h3>
          <p class="font-mono font-bold text-sm">${doc.numeroCompleto}</p>
        </div>

        <!-- Datos del Cliente & Emisión -->
        <div class="py-2 text-[10px] space-y-1 border-b border-dashed border-slate-300">
          <div><span class="font-bold">FECHA EMISIÓN:</span> ${formatDate(doc.fechaEmision)} ${doc.horaEmision || ''}</div>
          <div><span class="font-bold">MONEDA:</span> ${doc.moneda === 'USD' ? 'DÓLARES AMERICANOS' : 'SOLES'}</div>
          <div><span class="font-bold">CLIENTE:</span> ${cliente.razonSocial}</div>
          <div><span class="font-bold">${formatDocType(cliente.tipoDocumento)}:</span> ${cliente.numeroDocumento || '-'}</div>
          <div><span class="font-bold">DIRECCIÓN:</span> ${cliente.direccion || '-'}</div>
          <div><span class="font-bold">FORMA PAGO:</span> CONTADO</div>
        </div>

        <!-- Detalle de Productos -->
        <div class="py-2 border-b border-dashed border-slate-300">
          <table class="w-full text-[10px]">
            <thead>
              <tr class="border-b border-slate-200 text-slate-600 font-bold">
                <th class="text-left pb-1">CANT/DESCRIPCION</th>
                <th class="text-right pb-1">TOTAL</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-dotted divide-slate-200">
              ${doc.items.map(it => `
                <tr class="py-1">
                  <td class="py-1 pr-1">
                    <span class="font-bold">${it.cantidad} ${it.unidad || 'NIU'}</span> x ${parseFloat(it.precioUnitarioConIgv || it.precioUnitario).toFixed(2)}<br>
                    <span class="text-slate-700">${it.descripcion}</span>
                  </td>
                  <td class="text-right font-mono font-bold align-top pt-1">
                    ${parseFloat(it.subtotal + (it.igv || 0)).toFixed(2)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Totales -->
        <div class="py-2 space-y-1 text-[10px] border-b border-dashed border-slate-300">
          <div class="flex justify-between"><span>OP. GRAVADA:</span> <span class="font-mono">${monedaSimbolo} ${parseFloat(totales.gravadas || 0).toFixed(2)}</span></div>
          <div class="flex justify-between"><span>OP. EXONERADA:</span> <span class="font-mono">${monedaSimbolo} ${parseFloat(totales.exoneradas || 0).toFixed(2)}</span></div>
          <div class="flex justify-between"><span>OP. INAFECTA:</span> <span class="font-mono">${monedaSimbolo} ${parseFloat(totales.inafectas || 0).toFixed(2)}</span></div>
          <div class="flex justify-between"><span>I.G.V. (18%):</span> <span class="font-mono">${monedaSimbolo} ${parseFloat(totales.igv || 0).toFixed(2)}</span></div>
          <div class="flex justify-between text-xs font-black pt-1 border-t border-slate-300">
            <span>IMPORTE TOTAL:</span>
            <span class="font-mono">${monedaSimbolo} ${parseFloat(totales.total || 0).toFixed(2)}</span>
          </div>
        </div>

        <!-- Monto en Letras -->
        <div class="py-2 text-[10px] italic border-b border-dashed border-slate-300 text-center">
          ${doc.totalLetras}
        </div>

        <!-- Código QR & Resumen Hash -->
        <div class="pt-3 text-center space-y-2">
          ${doc.qrDataUrl ? `
            <img src="${doc.qrDataUrl}" alt="Código QR SUNAT" class="w-32 h-32 mx-auto border border-slate-200 p-1 bg-white">
          ` : ''}
          <div class="text-[9px] font-mono break-all text-slate-500">
            HASH: ${doc.digestValue || ''}
          </div>
          <p class="text-[9px] text-slate-500 uppercase tracking-tight">
            Representación impresa del comprobante electrónico.<br>Consulte su validez en www.sunat.gob.pe
          </p>
        </div>
      </div>
    `;
  } else {
    // FORMATO A4 ESTÁNDAR
    printArea.innerHTML = `
      <div id="printable-a4" class="max-w-[760px] mx-auto bg-white p-8 border border-slate-200 shadow-sm rounded-lg text-slate-800 text-xs">
        <!-- Encabezado A4 -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-6 border-b border-slate-200 items-start">
          <!-- Columna 1 y 2: Emisor -->
          <div class="sm:col-span-2 space-y-1">
            <h1 class="text-lg font-black text-slate-900 tracking-wide uppercase">${emisor.nombreComercial || emisor.razonSocial}</h1>
            <p class="font-semibold text-slate-700 text-xs">${emisor.razonSocial}</p>
            <p class="text-slate-500 text-[11px]">${emisor.direccion || '-'}</p>
            <p class="text-slate-500 text-[11px]">${emisor.distrito || ''} - ${emisor.provincia || ''} - ${emisor.departamento || ''}</p>
            <div class="flex items-center gap-4 pt-1 text-[11px] text-slate-600">
              ${emisor.telefono ? `<span><i class="fa-solid fa-phone text-slate-400"></i> ${emisor.telefono}</span>` : ''}
              ${emisor.correo ? `<span><i class="fa-solid fa-envelope text-slate-400"></i> ${emisor.correo}</span>` : ''}
            </div>
          </div>

          <!-- Columna 3: Recuadro Oficial RUC y Comprobante -->
          <div class="border-2 border-indigo-600 rounded-xl p-4 text-center space-y-1.5 bg-indigo-50/20">
            <div class="text-xs font-bold tracking-wider text-slate-800">R.U.C. N° ${emisor.ruc}</div>
            <div class="py-1 px-2 bg-indigo-600 text-white font-extrabold uppercase text-xs tracking-wider rounded">
              ${doc.tipoNombre}
            </div>
            <div class="text-base font-black font-mono text-slate-900 tracking-wider">
              ${doc.numeroCompleto}
            </div>
          </div>
        </div>

        <!-- Datos del Cliente y Emisión -->
        <div class="grid grid-cols-2 gap-4 py-4 border-b border-slate-200 text-[11px]">
          <div class="space-y-1">
            <div><span class="font-bold text-slate-500">SEÑOR(ES):</span> <span class="font-semibold text-slate-800">${cliente.razonSocial}</span></div>
            <div><span class="font-bold text-slate-500">${formatDocType(cliente.tipoDocumento)}:</span> <span class="font-mono font-semibold">${cliente.numeroDocumento || '-'}</span></div>
            <div><span class="font-bold text-slate-500">DIRECCIÓN:</span> <span>${cliente.direccion || '-'}</span></div>
          </div>
          <div class="space-y-1 text-right">
            <div><span class="font-bold text-slate-500">FECHA DE EMISIÓN:</span> <span class="font-semibold">${formatDate(doc.fechaEmision)}</span></div>
            <div><span class="font-bold text-slate-500">HORA DE EMISIÓN:</span> <span class="font-mono">${doc.horaEmision || '-'}</span></div>
            <div><span class="font-bold text-slate-500">MONEDA:</span> <span class="font-semibold">${doc.moneda === 'USD' ? 'DÓLARES AMERICANOS ($)' : 'SOLES (S/)'}</span></div>
            <div><span class="font-bold text-slate-500">FORMA DE PAGO:</span> <span class="font-semibold">CONTADO</span></div>
          </div>
        </div>

        <!-- Tabla de Ítems A4 -->
        <div class="py-4">
          <table class="w-full text-left text-[11px] border border-slate-200 rounded overflow-hidden">
            <thead class="bg-slate-100 font-bold uppercase text-slate-700 border-b border-slate-200">
              <tr>
                <th class="px-3 py-2 w-12 text-center">Ítem</th>
                <th class="px-3 py-2 w-20 text-center">Unidad</th>
                <th class="px-3 py-2 w-16 text-center">Cant.</th>
                <th class="px-3 py-2">Descripción</th>
                <th class="px-3 py-2 w-24 text-right">Valor Unit.</th>
                <th class="px-3 py-2 w-24 text-right">Importe</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${doc.items.map((it, idx) => `
                <tr class="hover:bg-slate-50">
                  <td class="px-3 py-2 text-center text-slate-400 font-mono">${idx + 1}</td>
                  <td class="px-3 py-2 text-center text-slate-600 font-mono">${it.unidad || 'NIU'}</td>
                  <td class="px-3 py-2 text-center font-bold font-mono">${it.cantidad}</td>
                  <td class="px-3 py-2 text-slate-800 font-medium">${it.descripcion}</td>
                  <td class="px-3 py-2 text-right font-mono">${parseFloat(it.valorUnitario || (it.precioUnitario / 1.18)).toFixed(2)}</td>
                  <td class="px-3 py-2 text-right font-mono font-bold">${parseFloat(it.subtotal || (it.cantidad * it.precioUnitario)).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Totales y Resumen -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2 items-start">
          <!-- Columna 1 y 2: Monto en Letras y Leyenda -->
          <div class="sm:col-span-2 space-y-3">
            <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700">
              <span class="font-bold text-slate-500 uppercase block text-[10px]">Importe en Letras:</span>
              <span class="font-semibold italic">${doc.totalLetras}</span>
            </div>

            <!-- Bloque Criptográfico QR y Hash -->
            <div class="flex items-center gap-4 p-3 border border-slate-200 rounded-lg bg-slate-50/50">
              ${doc.qrDataUrl ? `
                <img src="${doc.qrDataUrl}" alt="Código QR SUNAT" class="w-24 h-24 border border-slate-200 bg-white p-1 rounded">
              ` : ''}
              <div class="space-y-1 text-[10px] text-slate-600 overflow-hidden">
                <div class="font-bold text-slate-800 uppercase tracking-wide">Representación Impresa Electrónica</div>
                <div class="font-mono text-slate-500 break-all text-[9px]">Código Hash (DigestValue):<br>${doc.digestValue || '-'}</div>
                <div class="text-[9px] text-slate-400 pt-1">
                  Autorizado mediante Resolución de Superintendencia de la SUNAT.<br>
                  Consulte la validez de este documento en el portal de SUNAT.
                </div>
              </div>
            </div>
          </div>

          <!-- Columna 3: Cuadro de Totales -->
          <div class="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-1.5 text-[11px]">
            <div class="flex justify-between text-slate-600">
              <span>Op. Gravada:</span>
              <span class="font-mono font-semibold">${monedaSimbolo} ${parseFloat(totales.gravadas || 0).toFixed(2)}</span>
            </div>
            <div class="flex justify-between text-slate-600">
              <span>Op. Exonerada:</span>
              <span class="font-mono font-semibold">${monedaSimbolo} ${parseFloat(totales.exoneradas || 0).toFixed(2)}</span>
            </div>
            <div class="flex justify-between text-slate-600">
              <span>Op. Inafecta:</span>
              <span class="font-mono font-semibold">${monedaSimbolo} ${parseFloat(totales.inafectas || 0).toFixed(2)}</span>
            </div>
            <div class="flex justify-between text-slate-600">
              <span>I.G.V. (18.00%):</span>
              <span class="font-mono font-semibold">${monedaSimbolo} ${parseFloat(totales.igv || 0).toFixed(2)}</span>
            </div>
            <div class="flex justify-between font-black text-sm text-slate-900 pt-2 border-t border-slate-200">
              <span>TOTAL:</span>
              <span class="font-mono text-indigo-700 text-base">${monedaSimbolo} ${parseFloat(totales.total || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

/**
 * Imprime el comprobante utilizando un iframe aislado para garantizar fidelidad del 100%
 * y eliminar cualquier problema de páginas en blanco al imprimir o guardar en PDF.
 */
function triggerPrint() {
  const printArea = document.getElementById('print-area');
  if (!printArea) return;

  const content = printArea.innerHTML;
  let printIframe = document.getElementById('sunat-print-iframe');

  if (!printIframe) {
    printIframe = document.createElement('iframe');
    printIframe.id = 'sunat-print-iframe';
    printIframe.style.position = 'fixed';
    printIframe.style.right = '0';
    printIframe.style.bottom = '0';
    printIframe.style.width = '0';
    printIframe.style.height = '0';
    printIframe.style.border = '0';
    document.body.appendChild(printIframe);
  }

  const iframeDoc = printIframe.contentWindow.document;
  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>${visorCurrentDoc?.numeroCompleto || 'Comprobante'}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        body {
          margin: 0;
          padding: ${visorCurrentFormat === 'ticket' ? '0' : '20px'};
          background: #ffffff !important;
          color: #0f172a;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        @media print {
          body {
            padding: 0 !important;
          }
          @page {
            margin: ${visorCurrentFormat === 'ticket' ? '2mm' : '8mm'};
            size: auto;
          }
        }
        .ticket-preview {
          width: 80mm;
          margin: 0 auto;
          padding: 8px;
          background: #ffffff;
          font-family: 'Courier New', Courier, monospace;
          font-size: 11px;
          line-height: 1.3;
        }
      </style>
    </head>
    <body>
      ${content}
    </body>
    </html>
  `);
  iframeDoc.close();

  setTimeout(() => {
    printIframe.contentWindow.focus();
    printIframe.contentWindow.print();
  }, 400);
}
