// Componente Configuración del Emisor, SUNAT Beta y Certificado Digital

async function renderConfig() {
  const container = document.getElementById('config-view');
  if (!container) return;

  const res = await apiFetch('/api/config');
  const config = res.config || {};
  const emisor = config.emisor || {};
  const sunat = config.sunat || {};
  const cert = config.certificado || {};

  container.innerHTML = `
    <div class="space-y-6 max-w-4xl mx-auto">
      <!-- Encabezado -->
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 class="text-xl font-bold text-slate-800">Configuración del Sistema</h2>
        <p class="text-sm text-slate-500">Parámetros del contribuyente emisor, credenciales SOL y certificado digital para firma XML</p>
      </div>

      <!-- Sección 1: Datos de la Empresa Emisora -->
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 class="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <i class="fa-solid fa-building text-indigo-500"></i> Datos de la Empresa Emisora (Contribuyente)
        </h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">RUC de Prueba (SUNAT)</label>
            <input type="text" id="cfg-ruc" value="${emisor.ruc || '20000000001'}" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono font-bold focus:ring-2 focus:ring-indigo-500">
          </div>
          <div class="md:col-span-2">
            <label class="block text-xs font-semibold text-slate-600 mb-1">Razón Social</label>
            <input type="text" id="cfg-razon" value="${emisor.razonSocial || ''}" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-semibold focus:ring-2 focus:ring-indigo-500">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Nombre Comercial</label>
            <input type="text" id="cfg-comercial" value="${emisor.nombreComercial || ''}" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Ubigeo (INEI)</label>
            <input type="text" id="cfg-ubigeo" value="${emisor.ubigeo || '150101'}" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Departamento</label>
            <input type="text" id="cfg-departamento" value="${emisor.departamento || 'LIMA'}" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500">
          </div>
          <div class="md:col-span-2">
            <label class="block text-xs font-semibold text-slate-600 mb-1">Dirección Fiscal</label>
            <input type="text" id="cfg-direccion" value="${emisor.direccion || ''}" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Distrito / Provincia</label>
            <input type="text" id="cfg-distrito" value="${emisor.distrito || 'LIMA'}" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500">
          </div>
        </div>
      </div>

      <!-- Sección 2: Configuración del Web Service SUNAT -->
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 class="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <i class="fa-solid fa-server text-indigo-500"></i> Conexión Web Service SUNAT (SOAP / SOL)
        </h3>

        <!-- Toggle Modo Simulación / SUNAT Real -->
        <div class="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center justify-between gap-4">
          <div>
            <span class="text-xs font-bold text-indigo-900 block">Modo Simulación Local (Offline / Backup)</span>
            <p class="text-[11px] text-indigo-700 mt-0.5">
              Si el servidor Beta de SUNAT presenta intermitencias o no tienes conexión a internet, este modo valida el XML UBL 2.1, ejecuta la firma digital y responde con una Constancia de Recepción (CDR) válida localmente.
            </p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer flex-shrink-0">
            <input type="checkbox" id="cfg-simulacion" ${sunat.modoSimulacion ? 'checked' : ''} class="sr-only peer">
            <div class="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div class="md:col-span-3">
            <label class="block text-xs font-semibold text-slate-600 mb-1">Endpoint SOAP Beta de Facturas/Boletas</label>
            <input type="text" id="cfg-endpoint" value="${sunat.endpoint || 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService'}" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Usuario SOL de Prueba</label>
            <input type="text" id="cfg-sol-user" value="${sunat.solUser || 'MODDATOS'}" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono font-bold focus:ring-2 focus:ring-indigo-500">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Clave SOL de Prueba</label>
            <input type="password" id="cfg-sol-pass" value="${sunat.solPass || 'moddatos'}" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500">
          </div>
          <div class="flex items-end">
            <button type="button" onclick="probarConexionSunatConfig()" class="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-satellite-dish"></i> Testear Endpoint
            </button>
          </div>
        </div>
      </div>

      <!-- Sección 3: Certificado Digital (Firma Electrónica) -->
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <i class="fa-solid fa-certificate text-indigo-500"></i> Certificado Digital PKCS#12 (.p12 / .pfx)
          </h3>
          <span class="text-xs px-2.5 py-0.5 rounded-full font-semibold ${cert.path ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
            ${cert.path ? 'Certificado Instalado' : 'Sin Certificado'}
          </span>
        </div>

        <!-- Estado del Certificado Actual -->
        <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs text-slate-600">
          <div><span class="font-bold text-slate-500">Archivo:</span> <span class="font-mono">${cert.fileName || 'Ninguno'}</span></div>
          <div><span class="font-bold text-slate-500">Sujeto (CN):</span> ${cert.subject || '-'}</div>
          <div><span class="font-bold text-slate-500">Válido hasta:</span> ${cert.validoHasta ? formatDate(cert.validoHasta.split('T')[0]) : '-'}</div>
          <div><span class="font-bold text-slate-500">Tipo:</span> ${cert.autoGenerado ? 'Auto-generado X.509 RSA 2048' : 'Certificado Externo Importado'}</div>
        </div>

        <!-- Acciones del Certificado -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <!-- Opción A: Generar Automáticamente -->
          <div class="p-4 border border-dashed border-slate-300 rounded-xl text-center space-y-2">
            <h4 class="font-bold text-xs text-slate-800">Generar Certificado Digital de Prueba</h4>
            <p class="text-[11px] text-slate-500">Crea un par de llaves RSA 2048 y emite un certificado X.509 autofirmado válido para Beta.</p>
            <button type="button" onclick="generarCertificadoPrueba()" class="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition-colors">
              <i class="fa-solid fa-wand-magic-sparkles mr-1"></i> Generar Certificado Automático
            </button>
          </div>

          <!-- Opción B: Subir Certificado Propio -->
          <div class="p-4 border border-dashed border-slate-300 rounded-xl space-y-2">
            <h4 class="font-bold text-xs text-slate-800">Subir Certificado (.pfx / .p12)</h4>
            <input type="file" id="cert-file-input" accept=".pfx,.p12" class="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200">
            <input type="password" id="cert-file-pass" placeholder="Contraseña del certificado" class="w-full px-2 py-1.5 text-xs border border-slate-200 rounded">
            <button type="button" onclick="subirCertificadoDigital()" class="w-full py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors">
              <i class="fa-solid fa-upload mr-1"></i> Importar Certificado
            </button>
          </div>
        </div>
      </div>

      <!-- Botón de Guardado General -->
      <div class="flex justify-end pt-2">
        <button type="button" onclick="guardarConfiguracionGeneral()" class="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-md">
          <i class="fa-solid fa-floppy-disk mr-1"></i> Guardar Cambios de Configuración
        </button>
      </div>
    </div>
  `;
}

async function guardarConfiguracionGeneral() {
  const payload = {
    emisor: {
      ruc: document.getElementById('cfg-ruc')?.value.trim(),
      razonSocial: document.getElementById('cfg-razon')?.value.trim(),
      nombreComercial: document.getElementById('cfg-comercial')?.value.trim(),
      ubigeo: document.getElementById('cfg-ubigeo')?.value.trim(),
      departamento: document.getElementById('cfg-departamento')?.value.trim(),
      direccion: document.getElementById('cfg-direccion')?.value.trim(),
      distrito: document.getElementById('cfg-distrito')?.value.trim()
    },
    sunat: {
      endpoint: document.getElementById('cfg-endpoint')?.value.trim(),
      solUser: document.getElementById('cfg-sol-user')?.value.trim(),
      solPass: document.getElementById('cfg-sol-pass')?.value.trim(),
      modoSimulacion: document.getElementById('cfg-simulacion')?.checked || false
    }
  };

  try {
    const res = await apiFetch('/api/config', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.exito) {
      showToast('Configuración actualizada correctamente', 'success');
      renderConfig();
    } else {
      showToast(res.mensaje, 'error');
    }
  } catch (err) {
    showToast(`Error al guardar: ${err.message}`, 'error');
  }
}

async function probarConexionSunatConfig() {
  const endpoint = document.getElementById('cfg-endpoint')?.value.trim();
  showToast('Conectando con SUNAT Beta...', 'info');
  try {
    const res = await apiFetch(`/api/sunat/ping?endpoint=${encodeURIComponent(endpoint)}`);
    if (res.online) {
      showToast(res.message, 'success');
    } else {
      showToast(`Fallo en conexión: ${res.message}`, 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function generarCertificadoPrueba() {
  if (!confirm('¿Desea generar un nuevo certificado digital de prueba para el RUC configurado?')) return;
  showToast('Generando certificado digital X.509...', 'info');

  try {
    const res = await apiFetch('/api/config/certificado/generar', {
      method: 'POST',
      body: JSON.stringify({ password: '123456' })
    });

    if (res.exito) {
      showToast(res.mensaje, 'success');
      renderConfig();
    } else {
      showToast(res.mensaje, 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function subirCertificadoDigital() {
  const fileInput = document.getElementById('cert-file-input');
  const passInput = document.getElementById('cert-file-pass');

  if (!fileInput.files || fileInput.files.length === 0) {
    showToast('Seleccione un archivo de certificado (.pfx o .p12)', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('certificado', fileInput.files[0]);
  formData.append('password', passInput.value);

  showToast('Subiendo y validando certificado...', 'info');

  try {
    const response = await fetch('/api/config/certificado/upload', {
      method: 'POST',
      body: formData
    });

    const res = await response.json();
    if (res.exito) {
      showToast(res.mensaje, 'success');
      renderConfig();
    } else {
      showToast(res.mensaje, 'error');
    }
  } catch (err) {
    showToast(`Error al subir certificado: ${err.message}`, 'error');
  }
}
