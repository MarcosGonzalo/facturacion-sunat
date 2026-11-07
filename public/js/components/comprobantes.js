// Componente Listado de Comprobantes Emitidos & Auditoría SUNAT

let comprobantesFilter = {
  tipo: '',
  estado: '',
  q: ''
};

async function renderComprobantes() {
  const container = document.getElementById('comprobantes-view');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-6">
      <!-- Encabezado con Filtros -->
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold text-slate-800">Comprobantes de Pago Emitidos</h2>
            <p class="text-sm text-slate-500">Historial completo con estado de recepción en SUNAT, descargas de XML firmado y CDR</p>
          </div>
          <button onclick="switchTab('emision')" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 self-start md:self-auto">
            <i class="fa-solid fa-plus"></i> Nueva Emisión
          </button>
        </div>

        <!-- Barra de Búsqueda y Filtros -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div class="md:col-span-2">
            <input type="text" id="filtro-q" oninput="debounceComprobantesFilter()" placeholder="Buscar por serie-número o nombre de cliente..." class="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500">
          </div>
          <div>
            <select id="filtro-tipo" onchange="aplicarFiltrosComprobantes()" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg">
              <option value="">Todos los Tipos</option>
              <option value="01">Facturas Electrónicas (01)</option>
              <option value="03">Boletas de Venta (03)</option>
            </select>
          </div>
          <div>
            <select id="filtro-estado" onchange="aplicarFiltrosComprobantes()" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg">
              <option value="">Todos los Estados</option>
              <option value="ACEPTADO">Aceptados por SUNAT</option>
              <option value="RECHAZADO">Rechazados</option>
              <option value="PENDIENTE">Pendientes / Conexión</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Tabla de Comprobantes -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-600">
            <thead class="bg-slate-50 uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th class="px-5 py-3">Comprobante</th>
                <th class="px-5 py-3">Cliente</th>
                <th class="px-5 py-3">Fecha y Hora</th>
                <th class="px-5 py-3 text-right">Total</th>
                <th class="px-5 py-3 text-center">Estado SUNAT</th>
                <th class="px-5 py-3">Respuesta / CDR</th>
                <th class="px-5 py-3 text-center">Descargas & Acciones</th>
              </tr>
            </thead>
            <tbody id="comprobantes-table-body" class="divide-y divide-slate-100">
              <tr><td colspan="7" class="px-5 py-8 text-center text-slate-400">Cargando comprobantes...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  await loadComprobantesTable();
}

let debounceTimer;
function debounceComprobantesFilter() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    aplicarFiltrosComprobantes();
  }, 300);
}

function aplicarFiltrosComprobantes() {
  comprobantesFilter.q = document.getElementById('filtro-q')?.value || '';
  comprobantesFilter.tipo = document.getElementById('filtro-tipo')?.value || '';
  comprobantesFilter.estado = document.getElementById('filtro-estado')?.value || '';
  loadComprobantesTable();
}

async function loadComprobantesTable() {
  const tbody = document.getElementById('comprobantes-table-body');
  if (!tbody) return;

  const params = new URLSearchParams();
  if (comprobantesFilter.q) params.append('q', comprobantesFilter.q);
  if (comprobantesFilter.tipo) params.append('tipo', comprobantesFilter.tipo);
  if (comprobantesFilter.estado) params.append('estado', comprobantesFilter.estado);

  try {
    const res = await apiFetch(`/api/comprobantes?${params.toString()}`);
    const docs = res.comprobantes || [];

    if (docs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="px-5 py-10 text-center text-slate-400">No se encontraron comprobantes emitidos con los filtros seleccionados.</td></tr>`;
      return;
    }

    tbody.innerHTML = docs.map(doc => {
      let badgeClass = 'bg-slate-100 text-slate-700';
      let icon = 'fa-clock';
      if (doc.estadoSunat === 'ACEPTADO') {
        badgeClass = 'bg-emerald-100 text-emerald-800';
        icon = 'fa-circle-check';
      } else if (doc.estadoSunat === 'RECHAZADO') {
        badgeClass = 'bg-rose-100 text-rose-800';
        icon = 'fa-circle-xmark';
      } else if (doc.estadoSunat === 'PENDIENTE') {
        badgeClass = 'bg-amber-100 text-amber-800';
        icon = 'fa-triangle-exclamation';
      }

      const hashPreview = doc.digestValue ? doc.digestValue.substring(0, 16) + '...' : '-';

      return `
        <tr class="hover:bg-slate-50 transition-colors">
          <td class="px-5 py-3 font-semibold text-slate-800">
            <span class="text-sm font-bold font-mono">${doc.numeroCompleto}</span>
            <span class="block text-[11px] text-slate-400 font-normal">${doc.tipoNombre}</span>
          </td>
          <td class="px-5 py-3 max-w-[200px]">
            <div class="font-medium text-slate-700 truncate" title="${doc.cliente?.razonSocial || '-'}">${doc.cliente?.razonSocial || '-'}</div>
            <div class="text-[11px] text-slate-400">${formatDocType(doc.cliente?.tipoDocumento)}: ${doc.cliente?.numeroDocumento || '-'}</div>
          </td>
          <td class="px-5 py-3 whitespace-nowrap">
            <div class="text-slate-700">${formatDate(doc.fechaEmision)}</div>
            <div class="text-[11px] text-slate-400 font-mono">${doc.horaEmision || ''}</div>
          </td>
          <td class="px-5 py-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
            ${formatCurrency(doc.totales?.total, doc.moneda)}
          </td>
          <td class="px-5 py-3 text-center whitespace-nowrap">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${badgeClass}">
              <i class="fa-solid ${icon}"></i> ${doc.estadoSunat}
            </span>
            ${doc.esSimulado ? '<span class="block text-[10px] text-blue-600 font-medium">Motor Local</span>' : ''}
          </td>
          <td class="px-5 py-3 max-w-[220px]">
            <div class="text-[11px] text-slate-600 truncate" title="${doc.descripcionSunat || '-'}">
              <span class="font-bold">Cód: ${doc.codigoRespuestaSunat || '0'}</span> - ${doc.descripcionSunat || 'Sin respuesta'}
            </div>
            <div class="text-[10px] font-mono text-slate-400 truncate" title="Hash DigestValue: ${doc.digestValue || ''}">
              Hash: ${hashPreview}
            </div>
          </td>
          <td class="px-5 py-3 text-center whitespace-nowrap">
            <div class="flex items-center justify-center gap-1">
              <!-- Representación Impresa -->
              <button onclick="openVisorModal('${doc.id}')" class="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Ver Representación Impresa (A4 / Ticket)">
                <i class="fa-solid fa-print"></i>
              </button>

              <!-- Descargar PDF Oficial -->
              <a href="/api/comprobantes/${doc.id}/pdf" target="_blank" download class="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Descargar Representación Impresa (PDF)">
                <i class="fa-solid fa-file-pdf"></i>
              </a>

              <!-- Descargar XML firmado -->
              <a href="/api/comprobantes/${doc.id}/xml" download class="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Descargar XML UBL 2.1 Firmado">
                <i class="fa-solid fa-file-code"></i>
              </a>

              <!-- Descargar CDR ZIP -->
              <a href="/api/comprobantes/${doc.id}/cdr-zip" download class="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Descargar Constancia de Recepción (CDR ZIP)">
                <i class="fa-solid fa-shield-halved"></i>
              </a>

              <!-- Trazabilidad / Respuesta detallada -->
              <button onclick="openTraceModal('${doc.id}')" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Ver Trazabilidad y Datos Técnicos">
                <i class="fa-solid fa-circle-info"></i>
              </button>

              <!-- Reintentar envío si está pendiente o rechazado -->
              ${doc.estadoSunat !== 'ACEPTADO' ? `
                <button onclick="reenviarComprobante('${doc.id}')" class="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Reintentar Envío a SUNAT">
                  <i class="fa-solid fa-rotate-right"></i>
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error al cargar tabla de comprobantes:', err);
  }
}

async function reenviarComprobante(id) {
  if (!confirm('¿Desea reintentar el envío de este comprobante al Web Service de SUNAT?')) return;

  showToast('Reenviando comprobante a SUNAT...', 'info');
  try {
    const res = await apiFetch(`/api/comprobantes/${id}/reenviar`, { method: 'POST' });
    if (res.exito) {
      showToast(res.mensaje, res.comprobante.estadoSunat === 'ACEPTADO' ? 'success' : 'error');
      loadComprobantesTable();
    } else {
      showToast(res.mensaje, 'error');
    }
  } catch (err) {
    showToast(`Error de reenvío: ${err.message}`, 'error');
  }
}

async function openTraceModal(id) {
  const modal = document.getElementById('trace-modal');
  const content = document.getElementById('trace-modal-content');
  if (!modal || !content) return;

  modal.classList.remove('hidden');
  content.innerHTML = '<div class="p-8 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin text-2xl mb-2"></i><br>Cargando información técnica...</div>';

  try {
    const res = await apiFetch(`/api/comprobantes/${id}`);
    const doc = res.comprobante;

    content.innerHTML = `
      <div class="space-y-4 text-xs">
        <div class="p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm font-bold text-slate-800">${doc.tipoNombre} ${doc.numeroCompleto}</span>
            <span class="px-2.5 py-0.5 rounded-full font-bold ${doc.estadoSunat === 'ACEPTADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
              ${doc.estadoSunat}
            </span>
          </div>
          <p class="text-slate-600 font-medium">${doc.descripcionSunat || 'Sin descripción'}</p>
          <div class="mt-2 text-slate-400 font-mono text-[11px]">Código de Respuesta: ${doc.codigoRespuestaSunat || 'N/A'}</div>
        </div>

        <div class="space-y-2">
          <h4 class="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Evidencias Criptográficas & Normativas</h4>
          <div class="p-3 bg-slate-900 text-emerald-400 font-mono rounded-lg overflow-x-auto text-[11px] space-y-1">
            <div><span class="text-slate-400">Archivo XML:</span> ${doc.fileName}</div>
            <div><span class="text-slate-400">Archivo ZIP:</span> ${doc.zipFileName}</div>
            <div><span class="text-slate-400">DigestValue (Hash):</span> ${doc.digestValue}</div>
            <div><span class="text-slate-400">Signature Algorithm:</span> RSA-SHA256 (Canonicalization: C14N Exclusive)</div>
            <div><span class="text-slate-400">Firma Digital:</span> ${doc.signatureValue ? doc.signatureValue.substring(0, 60) + '...' : '-'}</div>
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Cadena QR Generada (SUNAT Anexo V)</h4>
          <textarea class="w-full p-2 bg-slate-50 border border-slate-200 rounded font-mono text-[11px] text-slate-600" rows="2" readonly>${doc.qrText || ''}</textarea>
        </div>

        ${doc.notasSunat && doc.notasSunat.length > 0 ? `
          <div class="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
            <div class="font-bold mb-1"><i class="fa-solid fa-triangle-exclamation"></i> Observaciones de SUNAT:</div>
            <ul class="list-disc list-inside space-y-0.5">
              ${doc.notasSunat.map(n => `<li>${n}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <div class="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
          <a href="/api/comprobantes/${doc.id}/xml" download class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold flex items-center gap-1">
            <i class="fa-solid fa-download"></i> Descargar XML
          </a>
          <a href="/api/comprobantes/${doc.id}/cdr-zip" download class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1">
            <i class="fa-solid fa-shield-halved"></i> Descargar CDR
          </a>
        </div>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div class="p-4 text-rose-600 font-semibold">Error al cargar datos: ${err.message}</div>`;
  }
}
