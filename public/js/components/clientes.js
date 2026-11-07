// Componente Gestión de Clientes (Directorio y Validación RUC / DNI)

async function renderClientes() {
  const container = document.getElementById('clientes-view');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-6">
      <!-- Encabezado -->
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-slate-800">Directorio de Clientes</h2>
          <p class="text-sm text-slate-500">Registro de personas naturales y empresas con validación oficial de RUC (Módulo 11) y DNI</p>
        </div>
        <button onclick="openNuevoClienteModal()" class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 self-start md:self-auto shadow-sm">
          <i class="fa-solid fa-user-plus"></i> Registrar Nuevo Cliente
        </button>
      </div>

      <!-- Tabla de Clientes -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-600">
            <thead class="bg-slate-50 uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th class="px-5 py-3">Tipo Doc</th>
                <th class="px-5 py-3">N° Documento</th>
                <th class="px-5 py-3">Razón Social / Nombres</th>
                <th class="px-5 py-3">Dirección</th>
                <th class="px-5 py-3">Contacto</th>
                <th class="px-5 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody id="clientes-table-body" class="divide-y divide-slate-100">
              <tr><td colspan="6" class="px-5 py-8 text-center text-slate-400">Cargando clientes...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  await loadClientesTable();
}

async function loadClientesTable() {
  const tbody = document.getElementById('clientes-table-body');
  if (!tbody) return;

  try {
    const res = await apiFetch('/api/clientes');
    const clientes = res.clientes || [];

    if (clientes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="px-5 py-8 text-center text-slate-400">No hay clientes registrados aún.</td></tr>`;
      return;
    }

    tbody.innerHTML = clientes.map(c => `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="px-5 py-3 whitespace-nowrap">
          <span class="px-2 py-0.5 rounded font-bold text-[11px] ${c.tipoDocumento === '6' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}">
            ${formatDocType(c.tipoDocumento)}
          </span>
        </td>
        <td class="px-5 py-3 font-mono font-bold text-slate-800 whitespace-nowrap">
          ${c.numeroDocumento}
        </td>
        <td class="px-5 py-3 font-semibold text-slate-800">
          ${c.razonSocial}
        </td>
        <td class="px-5 py-3 text-slate-600 truncate max-w-[240px]">
          ${c.direccion || '-'}
        </td>
        <td class="px-5 py-3 text-slate-500 whitespace-nowrap">
          <div>${c.correo ? `<i class="fa-solid fa-envelope text-slate-400 mr-1"></i>${c.correo}` : ''}</div>
          <div>${c.telefono ? `<i class="fa-solid fa-phone text-slate-400 mr-1"></i>${c.telefono}` : ''}</div>
        </td>
        <td class="px-5 py-3 text-center whitespace-nowrap">
          <button onclick="eliminarCliente('${c.id}')" class="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors" title="Eliminar Cliente">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error al cargar clientes:', err);
  }
}

function openNuevoClienteModal() {
  const modal = document.getElementById('cliente-modal');
  if (modal) {
    document.getElementById('modal-cli-tipo').value = '6';
    document.getElementById('modal-cli-num').value = '';
    document.getElementById('modal-cli-razon').value = '';
    document.getElementById('modal-cli-dir').value = '';
    document.getElementById('modal-cli-correo').value = '';
    document.getElementById('modal-cli-tel').value = '';
    document.getElementById('modal-cli-status').innerHTML = '';
    modal.classList.remove('hidden');
  }
}

async function validarDocumentoClienteInput() {
  const tipo = document.getElementById('modal-cli-tipo')?.value;
  const num = document.getElementById('modal-cli-num')?.value.trim();
  const statusEl = document.getElementById('modal-cli-status');

  if (!num || num.length < 5) {
    if (statusEl) statusEl.innerHTML = '';
    return;
  }

  try {
    const res = await apiFetch(`/api/clientes/validar-doc?tipo=${tipo}&numero=${num}`);
    if (statusEl) {
      if (res.esValido) {
        statusEl.innerHTML = `<span class="text-emerald-600 font-semibold"><i class="fa-solid fa-circle-check"></i> ${res.mensaje}</span>`;
      } else {
        statusEl.innerHTML = `<span class="text-rose-500 font-semibold"><i class="fa-solid fa-circle-xmark"></i> ${res.mensaje}</span>`;
      }
    }
  } catch (err) {
    console.error(err);
  }
}

async function guardarNuevoCliente(e) {
  if (e) e.preventDefault();

  const tipoDocumento = document.getElementById('modal-cli-tipo')?.value;
  const numeroDocumento = document.getElementById('modal-cli-num')?.value.trim();
  const razonSocial = document.getElementById('modal-cli-razon')?.value.trim();
  const direccion = document.getElementById('modal-cli-dir')?.value.trim();
  const correo = document.getElementById('modal-cli-correo')?.value.trim();
  const telefono = document.getElementById('modal-cli-tel')?.value.trim();

  if (!tipoDocumento || !numeroDocumento || !razonSocial) {
    showToast('Complete los campos obligatorios (*)', 'error');
    return;
  }

  try {
    const res = await apiFetch('/api/clientes', {
      method: 'POST',
      body: JSON.stringify({ tipoDocumento, numeroDocumento, razonSocial, direccion, correo, telefono })
    });

    if (res.exito) {
      showToast('Cliente guardado exitosamente', 'success');
      document.getElementById('cliente-modal')?.classList.add('hidden');
      loadClientesTable();
      // Si estamos en emisión, recargar la lista
      if (document.getElementById('emision-view')?.classList.contains('active')) {
        renderEmision();
      }
    } else {
      showToast(res.mensaje, 'error');
    }
  } catch (err) {
    showToast(`Error al guardar cliente: ${err.message}`, 'error');
  }
}

async function eliminarCliente(id) {
  if (!confirm('¿Está seguro de eliminar este cliente?')) return;

  try {
    const res = await apiFetch(`/api/clientes/${id}`, { method: 'DELETE' });
    if (res.exito) {
      showToast('Cliente eliminado', 'success');
      loadClientesTable();
    } else {
      showToast(res.mensaje, 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}
