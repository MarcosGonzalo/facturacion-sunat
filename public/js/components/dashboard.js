// Componente Dashboard

async function renderDashboard() {
  const container = document.getElementById('dashboard-view');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-6">
      <!-- Encabezado con estado del servicio SUNAT -->
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-slate-800">Panel de Control & Monitoreo SUNAT</h2>
          <p class="text-sm text-slate-500">Sistema cliente de Facturación Electrónica con estándar UBL 2.1 (Entorno Homologación / Beta)</p>
        </div>
        <div class="flex items-center gap-3">
          <div id="sunat-status-badge" class="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
            <span class="w-2.5 h-2.5 rounded-full bg-slate-400 animate-pulse"></span>
            Verificando SUNAT...
          </div>
          <button onclick="checkSunatHealth()" class="px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1.5">
            <i class="fa-solid fa-rotate"></i> Probar Conexión
          </button>
        </div>
      </div>

      <!-- Tarjetas de Métricas -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-cards">
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Emitidos</span>
            <div class="text-2xl font-black text-slate-800 mt-1" id="kpi-total">0</div>
            <span class="text-xs text-slate-500">Facturas y Boletas</span>
          </div>
          <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
            <i class="fa-solid fa-file-invoice"></i>
          </div>
        </div>

        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span class="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Aceptados SUNAT</span>
            <div class="text-2xl font-black text-emerald-600 mt-1" id="kpi-aceptados">0</div>
            <span class="text-xs text-slate-500">Con CDR oficial (Código 0)</span>
          </div>
          <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
            <i class="fa-solid fa-circle-check"></i>
          </div>
        </div>

        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span class="text-xs font-semibold text-rose-500 uppercase tracking-wider">Rechazados</span>
            <div class="text-2xl font-black text-rose-600 mt-1" id="kpi-rechazados">0</div>
            <span class="text-xs text-slate-500">Con observaciones/error</span>
          </div>
          <div class="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl">
            <i class="fa-solid fa-circle-xmark"></i>
          </div>
        </div>

        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span class="text-xs font-semibold text-amber-500 uppercase tracking-wider">Monto Facturado</span>
            <div class="text-2xl font-black text-slate-800 mt-1" id="kpi-monto">S/ 0.00</div>
            <span class="text-xs text-slate-500">Total en Soles (PEN)</span>
          </div>
          <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
            <i class="fa-solid fa-coins"></i>
          </div>
        </div>
      </div>

      <!-- Accesos Rápidos y Últimos Comprobantes -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Columna Izquierda: Últimos comprobantes -->
        <div class="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 class="font-bold text-slate-800 flex items-center gap-2">
              <i class="fa-solid fa-clock-rotate-left text-indigo-500"></i> Últimos Comprobantes Emitidos
            </h3>
            <button onclick="switchTab('comprobantes')" class="text-xs font-medium text-indigo-600 hover:text-indigo-700">
              Ver todos &rarr;
            </button>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-slate-600">
              <thead class="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th class="px-5 py-3">Comprobante</th>
                  <th class="px-5 py-3">Cliente</th>
                  <th class="px-5 py-3">Fecha</th>
                  <th class="px-5 py-3 text-right">Total</th>
                  <th class="px-5 py-3 text-center">Estado SUNAT</th>
                  <th class="px-5 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody id="dashboard-recent-table" class="divide-y divide-slate-100">
                <tr><td colspan="6" class="px-5 py-6 text-center text-slate-400">Cargando comprobantes...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Columna Derecha: Tarjeta de Estado del Emisor y Certificado -->
        <div class="space-y-4">
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 class="font-bold text-slate-800 text-sm flex items-center gap-2 mb-3">
              <i class="fa-solid fa-building text-slate-500"></i> Datos del Emisor Activo
            </h3>
            <div id="dashboard-emisor-info" class="space-y-2 text-xs text-slate-600">
              <div class="flex justify-between py-1 border-b border-slate-50">
                <span class="text-slate-400">RUC:</span>
                <span class="font-semibold text-slate-700" id="dash-ruc">-</span>
              </div>
              <div class="flex justify-between py-1 border-b border-slate-50">
                <span class="text-slate-400">Razón Social:</span>
                <span class="font-semibold text-slate-700 text-right truncate max-w-[180px]" id="dash-razon">-</span>
              </div>
              <div class="flex justify-between py-1 border-b border-slate-50">
                <span class="text-slate-400">Usuario SOL:</span>
                <span class="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700" id="dash-sol-user">MODDATOS</span>
              </div>
              <div class="flex justify-between py-1">
                <span class="text-slate-400">Ambiente:</span>
                <span class="font-semibold text-indigo-600" id="dash-ambiente">SUNAT Beta (Homologación)</span>
              </div>
            </div>
          </div>

          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 class="font-bold text-slate-800 text-sm flex items-center gap-2 mb-3">
              <i class="fa-solid fa-certificate text-amber-500"></i> Certificado Digital
            </h3>
            <div id="dashboard-cert-info" class="space-y-2 text-xs text-slate-600">
              <div class="flex items-center gap-2 text-emerald-600 font-semibold" id="dash-cert-status">
                <i class="fa-solid fa-circle-check"></i> Certificado Activo
              </div>
              <p class="text-slate-500 text-[11px]" id="dash-cert-subject">Cargando información...</p>
              <div class="pt-2">
                <button onclick="switchTab('config')" class="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors">
                  Gestionar Certificado & Configuración
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  await loadDashboardData();
}

async function loadDashboardData() {
  try {
    const [comprobantesRes, configRes] = await Promise.all([
      apiFetch('/api/comprobantes'),
      apiFetch('/api/config')
    ]);

    const comprobantes = comprobantesRes.comprobantes || [];
    const config = configRes.config || {};

    // KPIs
    const total = comprobantes.length;
    const aceptados = comprobantes.filter(c => c.estadoSunat === 'ACEPTADO').length;
    const rechazados = comprobantes.filter(c => c.estadoSunat === 'RECHAZADO').length;
    const totalMonto = comprobantes
      .filter(c => c.moneda === 'PEN' && c.estadoSunat === 'ACEPTADO')
      .reduce((sum, c) => sum + (c.totales?.total || 0), 0);

    document.getElementById('kpi-total').innerText = total;
    document.getElementById('kpi-aceptados').innerText = aceptados;
    document.getElementById('kpi-rechazados').innerText = rechazados;
    document.getElementById('kpi-monto').innerText = formatCurrency(totalMonto, 'PEN');

    // Emisor Info
    if (config.emisor) {
      document.getElementById('dash-ruc').innerText = config.emisor.ruc || '-';
      document.getElementById('dash-razon').innerText = config.emisor.razonSocial || '-';
    }
    if (config.sunat) {
      document.getElementById('dash-sol-user').innerText = config.sunat.solUser || 'MODDATOS';
      document.getElementById('dash-ambiente').innerText = config.sunat.modoSimulacion ? 'Modo Simulación (Offline)' : 'SUNAT Beta Oficial';
    }

    // Cert Info
    if (config.certificado && (config.certificado.path || config.certificado.subject)) {
      document.getElementById('dash-cert-status').innerHTML = '<i class="fa-solid fa-circle-check text-emerald-500"></i> Certificado Activo';
      const valido = config.certificado.validoHasta ? formatDate(config.certificado.validoHasta.split('T')[0]) : 'Válido';
      document.getElementById('dash-cert-subject').innerText = `${config.certificado.subject || 'Certificado X.509'} (Expira: ${valido})`;
    } else {
      document.getElementById('dash-cert-status').innerHTML = '<i class="fa-solid fa-triangle-exclamation text-amber-500"></i> Auto-generación activada';
      document.getElementById('dash-cert-subject').innerText = 'Se generará automáticamente un certificado al emitir';
    }

    // Recent Table
    const tableBody = document.getElementById('dashboard-recent-table');
    const recent = comprobantes.slice(0, 5);

    if (recent.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" class="px-5 py-6 text-center text-slate-400">Aún no se han emitido comprobantes. ¡Crea el primero en la pestaña Emisión!</td></tr>`;
      return;
    }

    tableBody.innerHTML = recent.map(doc => {
      let badgeClass = 'bg-slate-100 text-slate-600';
      if (doc.estadoSunat === 'ACEPTADO') badgeClass = 'bg-emerald-100 text-emerald-700';
      else if (doc.estadoSunat === 'RECHAZADO') badgeClass = 'bg-rose-100 text-rose-700';
      else if (doc.estadoSunat === 'PENDIENTE') badgeClass = 'bg-amber-100 text-amber-700';

      return `
        <tr class="hover:bg-slate-50 transition-colors">
          <td class="px-5 py-3 font-semibold text-slate-800">
            ${doc.numeroCompleto}
            <span class="block text-[11px] text-slate-400 font-normal">${doc.tipoNombre}</span>
          </td>
          <td class="px-5 py-3 truncate max-w-[200px]">
            ${doc.cliente?.razonSocial || '-'}
            <span class="block text-[11px] text-slate-400">${formatDocType(doc.cliente?.tipoDocumento)}: ${doc.cliente?.numeroDocumento || '-'}</span>
          </td>
          <td class="px-5 py-3 text-slate-500 whitespace-nowrap">${formatDate(doc.fechaEmision)}</td>
          <td class="px-5 py-3 text-right font-bold text-slate-700">${formatCurrency(doc.totales?.total, doc.moneda)}</td>
          <td class="px-5 py-3 text-center">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeClass}">
              ${doc.estadoSunat}
            </span>
          </td>
          <td class="px-5 py-3 text-center">
            <button onclick="openVisorModal('${doc.id}')" class="text-indigo-600 hover:text-indigo-800 p-1.5" title="Ver Representación Impresa">
              <i class="fa-solid fa-print"></i>
            </button>
            <button onclick="openTraceModal('${doc.id}')" class="text-slate-500 hover:text-slate-700 p-1.5" title="Ver Detalle SUNAT">
              <i class="fa-solid fa-circle-info"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('Error cargando datos del dashboard:', err);
  }
}

async function checkSunatHealth() {
  const badge = document.getElementById('sunat-status-badge');
  if (badge) {
    badge.className = 'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-600';
    badge.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Probando...`;
  }

  try {
    const configRes = await apiFetch('/api/config');
    const isSimulacion = configRes.config?.sunat?.modoSimulacion;

    if (isSimulacion) {
      if (badge) {
        badge.className = 'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700';
        badge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Modo Simulación Local Activo`;
      }
      showToast('Modo Simulación activo: Validador y motor de CDR local operativos', 'info');
      return;
    }

    const res = await apiFetch('/api/sunat/ping');
    if (res.online) {
      if (badge) {
        badge.className = 'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700';
        badge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> SUNAT Beta Conectado (${res.latencyMs}ms)`;
      }
      showToast(res.message, 'success');
    } else {
      if (badge) {
        badge.className = 'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700';
        badge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span> SUNAT Beta Inaccesible`;
      }
      showToast(`SUNAT Beta no responde: ${res.message}. Puedes activar el 'Modo Simulación' en Configuración.`, 'error');
    }
  } catch (err) {
    if (badge) {
      badge.className = 'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700';
      badge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Error de Conexión`;
    }
  }
}
