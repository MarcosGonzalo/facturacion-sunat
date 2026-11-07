// Componente Emisión de Comprobantes de Pago (Facturas y Boletas)

let emisionState = {
  tipoComprobante: '01', // '01' Factura, '03' Boleta
  serie: 'F001',
  correlativo: 1,
  clienteId: '',
  moneda: 'PEN',
  items: [],
  clientesList: [],
  productosList: []
};

async function renderEmision() {
  const container = document.getElementById('emision-view');
  if (!container) return;

  // Cargar datos de configuración, clientes y productos
  const [configRes, clientesRes, productosRes] = await Promise.all([
    apiFetch('/api/config'),
    apiFetch('/api/clientes'),
    apiFetch('/api/productos')
  ]);

  const config = configRes.config || {};
  emisionState.clientesList = clientesRes.clientes || [];
  emisionState.productosList = productosRes.productos || [];

  emisionState.serie = emisionState.tipoComprobante === '01'
    ? (config.series?.factura || 'F001')
    : (config.series?.boleta || 'B001');

  emisionState.correlativo = emisionState.tipoComprobante === '01'
    ? (config.series?.correlativoFactura || 1)
    : (config.series?.correlativoBoleta || 1);

  // Si no hay ítems, agregar 1 ítem por defecto
  if (emisionState.items.length === 0 && emisionState.productosList.length > 0) {
    const prod = emisionState.productosList[0];
    emisionState.items.push({
      codigo: prod.codigo,
      descripcion: prod.descripcion,
      unidad: prod.unidad || 'NIU',
      cantidad: 1,
      precioUnitario: prod.precioUnitario,
      tipoAfectacion: prod.tipoAfectacion || '10'
    });
  }

  const hoy = new Date().toISOString().split('T')[0];
  const ahora = new Date().toTimeString().split(' ')[0].substring(0, 5);

  container.innerHTML = `
    <div class="space-y-6 max-w-5xl mx-auto">
      <!-- Encabezado de Emisión -->
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-slate-800">Emisión de Comprobante Electrónico (UBL 2.1)</h2>
          <p class="text-sm text-slate-500">Generación interactiva, cálculo automático de impuestos, firma digital y envío a SUNAT</p>
        </div>
        <!-- Selector Tipo de Comprobante -->
        <div class="flex items-center bg-slate-100 p-1 rounded-xl">
          <button id="btn-tipo-01" onclick="setTipoComprobante('01')" class="px-4 py-2 text-xs font-bold rounded-lg transition-all ${emisionState.tipoComprobante === '01' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}">
            <i class="fa-solid fa-file-invoice mr-1"></i> Factura (01)
          </button>
          <button id="btn-tipo-03" onclick="setTipoComprobante('03')" class="px-4 py-2 text-xs font-bold rounded-lg transition-all ${emisionState.tipoComprobante === '03' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}">
            <i class="fa-solid fa-receipt mr-1"></i> Boleta (03)
          </button>
        </div>
      </div>

      <!-- Formulario de Datos Generales -->
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
        <h3 class="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <i class="fa-solid fa-sliders text-indigo-500"></i> Datos del Comprobante & Cliente
        </h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Serie</label>
            <input type="text" id="emision-serie" value="${emisionState.serie}" class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg uppercase font-mono font-bold bg-slate-50" readonly>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Correlativo</label>
            <input type="number" id="emision-correlativo" value="${emisionState.correlativo}" class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono font-bold bg-slate-50" readonly>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Fecha Emisión</label>
            <input type="date" id="emision-fecha" value="${hoy}" class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Moneda</label>
            <select id="emision-moneda" onchange="updateTotalesEmision()" class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-semibold">
              <option value="PEN" selected>PEN - Soles (S/)</option>
              <option value="USD">USD - Dólares ($)</option>
            </select>
          </div>
        </div>

        <!-- Selección de Cliente -->
        <div class="border-t border-slate-100 pt-4">
          <div class="flex items-center justify-between mb-2">
            <label class="block text-xs font-semibold text-slate-600">
              Cliente Requerido (${emisionState.tipoComprobante === '01' ? 'Factura exige RUC' : 'DNI o RUC'})
            </label>
            <button onclick="openNuevoClienteModal()" class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1">
              <i class="fa-solid fa-user-plus"></i> + Registrar Nuevo Cliente
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="md:col-span-2">
              <select id="emision-cliente-select" onchange="onClienteSelected(this.value)" class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500">
                <option value="">-- Seleccionar Cliente del Directorio --</option>
                ${emisionState.clientesList
                  .filter(c => emisionState.tipoComprobante === '03' || c.tipoDocumento === '6')
                  .map(c => `
                    <option value="${c.id}" ${emisionState.clienteId === c.id ? 'selected' : ''}>
                      ${formatDocType(c.tipoDocumento)}: ${c.numeroDocumento} - ${c.razonSocial}
                    </option>
                  `).join('')}
              </select>
            </div>
            <div id="cliente-doc-badge" class="flex items-center px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 truncate">
              Seleccione un cliente para continuar
            </div>
          </div>
        </div>
      </div>

      <!-- Detalle de Ítems / Productos / Servicios -->
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 class="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <i class="fa-solid fa-boxes-stacked text-indigo-500"></i> Detalle de Ítems / Servicios
          </h3>
          <div class="flex items-center gap-2">
            <select id="add-catalogo-select" class="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg max-w-[200px]">
              <option value="">Seleccionar del catálogo...</option>
              ${emisionState.productosList.map(p => `<option value="${p.id}">${p.codigo} - ${p.descripcion}</option>`).join('')}
            </select>
            <button onclick="agregarItemDesdeCatalogo()" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors">
              <i class="fa-solid fa-plus"></i> Catálogo
            </button>
            <button onclick="agregarItemVacio()" class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors">
              <i class="fa-solid fa-plus"></i> Ítem Libre
            </button>
          </div>
        </div>

        <!-- Tabla de Ítems Dinámica -->
        <div class="overflow-x-auto border border-slate-200 rounded-lg">
          <table class="w-full text-left text-xs text-slate-600">
            <thead class="bg-slate-50 uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th class="px-3 py-2 w-10">#</th>
                <th class="px-3 py-2 min-w-[220px]">Descripción del Ítem</th>
                <th class="px-3 py-2 w-24">Unidad</th>
                <th class="px-3 py-2 w-20">Cant.</th>
                <th class="px-3 py-2 w-28">P. Unit (c/IGV)</th>
                <th class="px-3 py-2 w-36">Afectación IGV</th>
                <th class="px-3 py-2 w-28 text-right">Subtotal</th>
                <th class="px-3 py-2 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody id="items-tbody" class="divide-y divide-slate-100">
              <!-- Renderizado dinámico -->
            </tbody>
          </table>
        </div>

        <!-- Panel de Totales y Conversión a Letras -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
          <div class="md:col-span-2 space-y-2">
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monto en Letras (SUNAT Catálogo 52)</span>
            <div id="monto-en-letras" class="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 italic">
              SON: CERO CON 00/100 SOLES
            </div>
            <p class="text-[11px] text-slate-400">
              <i class="fa-solid fa-circle-info"></i> El documento se generará en formato XML UBL 2.1 estándar y se firmará con certificado digital antes de ser enviado a SUNAT.
            </p>
          </div>

          <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div class="flex justify-between text-slate-600">
              <span>Op. Gravadas:</span>
              <span class="font-semibold font-mono" id="tot-gravadas">S/ 0.00</span>
            </div>
            <div class="flex justify-between text-slate-600">
              <span>Op. Exoneradas:</span>
              <span class="font-semibold font-mono" id="tot-exoneradas">S/ 0.00</span>
            </div>
            <div class="flex justify-between text-slate-600">
              <span>Op. Inafectas:</span>
              <span class="font-semibold font-mono" id="tot-inafectas">S/ 0.00</span>
            </div>
            <div class="flex justify-between text-slate-600">
              <span>IGV (18.00%):</span>
              <span class="font-semibold font-mono" id="tot-igv">S/ 0.00</span>
            </div>
            <div class="flex justify-between text-slate-900 font-bold text-sm pt-2 border-t border-slate-200">
              <span>TOTAL A PAGAR:</span>
              <span class="font-mono text-indigo-600 text-base" id="tot-pagar">S/ 0.00</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Barra de Acciones de Emisión -->
      <div class="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
        <button onclick="previewXmlModal()" class="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2">
          <i class="fa-solid fa-code"></i> Inspeccionar XML UBL 2.1
        </button>

        <button id="btn-emitir-sunat" onclick="emitirComprobanteSunat()" class="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-all shadow-md hover:shadow-indigo-500/20 flex items-center justify-center gap-2">
          <i class="fa-solid fa-paper-plane"></i> Emitir, Firmar y Transmitir a SUNAT
        </button>
      </div>
    </div>
  `;

  renderItemsTable();
  updateTotalesEmision();
}

function setTipoComprobante(tipo) {
  emisionState.tipoComprobante = tipo;
  renderEmision();
}

function onClienteSelected(clienteId) {
  emisionState.clienteId = clienteId;
  const cliente = emisionState.clientesList.find(c => c.id === clienteId);
  const badge = document.getElementById('cliente-doc-badge');
  if (cliente && badge) {
    badge.innerHTML = `<span class="font-bold mr-1">${formatDocType(cliente.tipoDocumento)}: ${cliente.numeroDocumento}</span> (${cliente.direccion || 'Sin dirección'})`;
    badge.className = 'flex items-center px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 truncate';
  } else if (badge) {
    badge.innerText = 'Seleccione un cliente para continuar';
    badge.className = 'flex items-center px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 truncate';
  }
}

function renderItemsTable() {
  const tbody = document.getElementById('items-tbody');
  if (!tbody) return;

  if (emisionState.items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="px-4 py-6 text-center text-slate-400">No hay ítems agregados. Usa los botones superiores para agregar productos.</td></tr>`;
    return;
  }

  tbody.innerHTML = emisionState.items.map((item, idx) => {
    const cant = parseFloat(item.cantidad || 1);
    const precio = parseFloat(item.precioUnitario || 0);
    const subtotal = (cant * precio).toFixed(2);

    return `
      <tr class="hover:bg-slate-50">
        <td class="px-3 py-2 font-mono text-slate-400">${idx + 1}</td>
        <td class="px-3 py-2">
          <input type="text" value="${item.descripcion}" oninput="updateItemField(${idx}, 'descripcion', this.value)" class="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 font-medium" placeholder="Descripción del producto o servicio">
        </td>
        <td class="px-3 py-2">
          <select onchange="updateItemField(${idx}, 'unidad', this.value)" class="w-full px-1.5 py-1 text-xs border border-slate-200 rounded">
            <option value="NIU" ${item.unidad === 'NIU' ? 'selected' : ''}>NIU (Unidades)</option>
            <option value="ZZ" ${item.unidad === 'ZZ' ? 'selected' : ''}>ZZ (Servicios)</option>
            <option value="BX" ${item.unidad === 'BX' ? 'selected' : ''}>BX (Cajas)</option>
            <option value="KGM" ${item.unidad === 'KGM' ? 'selected' : ''}>KGM (Kilos)</option>
            <option value="MTR" ${item.unidad === 'MTR' ? 'selected' : ''}>MTR (Metros)</option>
          </select>
        </td>
        <td class="px-3 py-2">
          <input type="number" min="1" step="1" value="${item.cantidad}" oninput="updateItemField(${idx}, 'cantidad', this.value)" class="w-full px-2 py-1 text-xs border border-slate-200 rounded font-mono text-center">
        </td>
        <td class="px-3 py-2">
          <input type="number" min="0" step="0.01" value="${item.precioUnitario}" oninput="updateItemField(${idx}, 'precioUnitario', this.value)" class="w-full px-2 py-1 text-xs border border-slate-200 rounded font-mono text-right">
        </td>
        <td class="px-3 py-2">
          <select onchange="updateItemField(${idx}, 'tipoAfectacion', this.value)" class="w-full px-1.5 py-1 text-xs border border-slate-200 rounded">
            <option value="10" ${item.tipoAfectacion === '10' ? 'selected' : ''}>10 - Gravado (IGV 18%)</option>
            <option value="20" ${item.tipoAfectacion === '20' ? 'selected' : ''}>20 - Exonerado</option>
            <option value="30" ${item.tipoAfectacion === '30' ? 'selected' : ''}>30 - Inafecto</option>
          </select>
        </td>
        <td class="px-3 py-2 text-right font-mono font-bold text-slate-700">
          ${subtotal}
        </td>
        <td class="px-3 py-2 text-center">
          <button onclick="eliminarItem(${idx})" class="text-rose-500 hover:text-rose-700 p-1" title="Eliminar ítem">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function updateItemField(idx, field, value) {
  if (!emisionState.items[idx]) return;
  emisionState.items[idx][field] = value;
  updateTotalesEmision();
}

function agregarItemDesdeCatalogo() {
  const select = document.getElementById('add-catalogo-select');
  const prodId = select?.value;
  if (!prodId) {
    showToast('Seleccione un ítem del catálogo', 'info');
    return;
  }
  const prod = emisionState.productosList.find(p => p.id === prodId);
  if (prod) {
    emisionState.items.push({
      codigo: prod.codigo,
      descripcion: prod.descripcion,
      unidad: prod.unidad || 'NIU',
      cantidad: 1,
      precioUnitario: prod.precioUnitario,
      tipoAfectacion: prod.tipoAfectacion || '10'
    });
    renderItemsTable();
    updateTotalesEmision();
    select.value = '';
  }
}

function agregarItemVacio() {
  emisionState.items.push({
    codigo: `ITEM${emisionState.items.length + 1}`,
    descripcion: '',
    unidad: 'NIU',
    cantidad: 1,
    precioUnitario: 0.00,
    tipoAfectacion: '10'
  });
  renderItemsTable();
  updateTotalesEmision();
}

function eliminarItem(idx) {
  emisionState.items.splice(idx, 1);
  renderItemsTable();
  updateTotalesEmision();
}

function calcularTotales() {
  const moneda = document.getElementById('emision-moneda')?.value || 'PEN';
  let gravadas = 0;
  let exoneradas = 0;
  let inafectas = 0;
  let igv = 0;

  emisionState.items.forEach(item => {
    const cant = parseFloat(item.cantidad || 0);
    const precio = parseFloat(item.precioUnitario || 0);
    const tipo = item.tipoAfectacion || '10';

    if (tipo === '10') {
      const valorUnitario = +(precio / 1.18).toFixed(2);
      const subtotalItem = +(valorUnitario * cant).toFixed(2);
      const igvItem = +(subtotalItem * 0.18).toFixed(2);
      gravadas += subtotalItem;
      igv += igvItem;
    } else if (tipo === '20') {
      exoneradas += +(precio * cant).toFixed(2);
    } else if (tipo === '30') {
      inafectas += +(precio * cant).toFixed(2);
    }
  });

  const total = +(gravadas + exoneradas + inafectas + igv).toFixed(2);

  return {
    gravadas: +gravadas.toFixed(2),
    exoneradas: +exoneradas.toFixed(2),
    inafectas: +inafectas.toFixed(2),
    igv: +igv.toFixed(2),
    total,
    moneda
  };
}

function updateTotalesEmision() {
  const totales = calcularTotales();
  const symbol = totales.moneda === 'USD' ? '$' : 'S/';

  const elGravadas = document.getElementById('tot-gravadas');
  const elExoneradas = document.getElementById('tot-exoneradas');
  const elInafectas = document.getElementById('tot-inafectas');
  const elIgv = document.getElementById('tot-igv');
  const elPagar = document.getElementById('tot-pagar');
  const elLetras = document.getElementById('monto-en-letras');

  if (elGravadas) elGravadas.innerText = `${symbol} ${totales.gravadas.toFixed(2)}`;
  if (elExoneradas) elExoneradas.innerText = `${symbol} ${totales.exoneradas.toFixed(2)}`;
  if (elInafectas) elInafectas.innerText = `${symbol} ${totales.inafectas.toFixed(2)}`;
  if (elIgv) elIgv.innerText = `${symbol} ${totales.igv.toFixed(2)}`;
  if (elPagar) elPagar.innerText = `${symbol} ${totales.total.toFixed(2)}`;

  // Convertir a letras básico para vista previa
  if (elLetras) {
    elLetras.innerText = `Total a facturar: ${symbol} ${totales.total.toFixed(2)} (${totales.moneda})`;
  }
}

async function emitirComprobanteSunat() {
  const btn = document.getElementById('btn-emitir-sunat');
  if (!emisionState.clienteId) {
    showToast('Debe seleccionar un cliente para emitir el comprobante', 'error');
    return;
  }
  if (emisionState.items.length === 0) {
    showToast('Debe incluir al menos un producto o servicio', 'error');
    return;
  }

  const cliente = emisionState.clientesList.find(c => c.id === emisionState.clienteId);
  const fecha = document.getElementById('emision-fecha')?.value;
  const moneda = document.getElementById('emision-moneda')?.value || 'PEN';
  const serie = document.getElementById('emision-serie')?.value;
  const correlativo = parseInt(document.getElementById('emision-correlativo')?.value || 1);

  // Validación previa de RUC para facturas
  if (emisionState.tipoComprobante === '01' && cliente.tipoDocumento !== '6') {
    showToast('Para emitir una Factura Electrónica, el cliente seleccionado debe tener RUC (Tipo 6)', 'error');
    return;
  }

  const payload = {
    tipoComprobante: emisionState.tipoComprobante,
    serie,
    correlativo,
    fechaEmision: fecha,
    moneda,
    cliente,
    items: emisionState.items
  };

  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Generando XML, Firmando & Transmitiendo a SUNAT...`;

  try {
    const res = await apiFetch('/api/comprobantes/emitir', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.exito) {
      showToast(res.mensaje, res.comprobante.estadoSunat === 'ACEPTADO' ? 'success' : 'error');
      // Abrir modal con la constancia y representación impresa
      openVisorModal(res.comprobante.id);
      // Limpiar formulario y reiniciar correlativo
      emisionState.items = [];
      renderEmision();
    } else {
      const errDetail = res.errores ? res.errores.join(', ') : res.mensaje;
      showToast(`Error al emitir: ${errDetail}`, 'error');
    }
  } catch (err) {
    showToast(`Error de red o servidor: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Emitir, Firmar y Transmitir a SUNAT`;
  }
}

async function previewXmlModal() {
  if (!emisionState.clienteId) {
    showToast('Seleccione un cliente para ver el borrador XML', 'info');
    return;
  }
  const cliente = emisionState.clientesList.find(c => c.id === emisionState.clienteId);
  const fecha = document.getElementById('emision-fecha')?.value;
  const moneda = document.getElementById('emision-moneda')?.value || 'PEN';

  const modal = document.getElementById('xml-preview-modal');
  const codeArea = document.getElementById('xml-preview-code');
  if (modal && codeArea) {
    codeArea.innerText = 'Generando estructura UBL 2.1...';
    modal.classList.remove('hidden');

    const configRes = await apiFetch('/api/config');
    const totales = calcularTotales();

    // Generar XML en memoria vía API o frontend
    codeArea.innerText = `<!-- Estructura UBL 2.1 para ${emisionState.serie}-${emisionState.correlativo} -->
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>${emisionState.serie}-${String(emisionState.correlativo).padStart(8, '0')}</cbc:ID>
  <cbc:IssueDate>${fecha}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>${emisionState.tipoComprobante}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${moneda}</cbc:DocumentCurrencyCode>
  <!-- Emisor: ${configRes.config?.emisor?.ruc} - ${configRes.config?.emisor?.razonSocial} -->
  <!-- Cliente: ${cliente.numeroDocumento} - ${cliente.razonSocial} -->
  <!-- Total: ${moneda} ${totales.total} -->
</Invoice>`;
  }
}
