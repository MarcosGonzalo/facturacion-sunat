// Componente Catálogo de Productos y Servicios (Unidades SUNAT & Tipo Afectación IGV)

async function renderProductos() {
  const container = document.getElementById('productos-view');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-6">
      <!-- Encabezado -->
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-slate-800">Catálogo de Productos y Servicios</h2>
          <p class="text-sm text-slate-500">Gestión de ítems con códigos de unidad de medida (Catálogo 03) y afectación al IGV (Catálogo 07)</p>
        </div>
        <button onclick="openNuevoProductoModal()" class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 self-start md:self-auto shadow-sm">
          <i class="fa-solid fa-plus"></i> Registrar Nuevo Ítem
        </button>
      </div>

      <!-- Tabla de Productos -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-600">
            <thead class="bg-slate-50 uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th class="px-5 py-3">Código</th>
                <th class="px-5 py-3">Descripción</th>
                <th class="px-5 py-3 text-center">Unidad SUNAT</th>
                <th class="px-5 py-3 text-center">Tipo Afectación IGV</th>
                <th class="px-5 py-3 text-right">Precio Unitario (c/IGV)</th>
                <th class="px-5 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody id="productos-table-body" class="divide-y divide-slate-100">
              <tr><td colspan="6" class="px-5 py-8 text-center text-slate-400">Cargando productos...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  await loadProductosTable();
}

async function loadProductosTable() {
  const tbody = document.getElementById('productos-table-body');
  if (!tbody) return;

  try {
    const res = await apiFetch('/api/productos');
    const productos = res.productos || [];

    if (productos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="px-5 py-8 text-center text-slate-400">No hay ítems registrados aún.</td></tr>`;
      return;
    }

    const afectaciones = {
      '10': { label: '10 - Gravado (IGV 18%)', color: 'bg-indigo-100 text-indigo-700' },
      '20': { label: '20 - Exonerado (0%)', color: 'bg-emerald-100 text-emerald-700' },
      '30': { label: '30 - Inafecto (0%)', color: 'bg-amber-100 text-amber-700' }
    };

    tbody.innerHTML = productos.map(p => {
      const afec = afectaciones[p.tipoAfectacion] || { label: p.tipoAfectacion, color: 'bg-slate-100 text-slate-700' };

      return `
        <tr class="hover:bg-slate-50 transition-colors">
          <td class="px-5 py-3 font-mono font-bold text-slate-800 whitespace-nowrap">
            ${p.codigo}
          </td>
          <td class="px-5 py-3 font-semibold text-slate-800">
            ${p.descripcion}
          </td>
          <td class="px-5 py-3 text-center whitespace-nowrap">
            <span class="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-100 text-slate-700">
              ${p.unidad || 'NIU'}
            </span>
          </td>
          <td class="px-5 py-3 text-center whitespace-nowrap">
            <span class="px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${afec.color}">
              ${afec.label}
            </span>
          </td>
          <td class="px-5 py-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
            S/ ${parseFloat(p.precioUnitario).toFixed(2)}
          </td>
          <td class="px-5 py-3 text-center whitespace-nowrap">
            <button onclick="eliminarProducto('${p.id}')" class="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors" title="Eliminar Ítem">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error cargando productos:', err);
  }
}

function openNuevoProductoModal() {
  const modal = document.getElementById('producto-modal');
  if (modal) {
    document.getElementById('modal-prod-codigo').value = '';
    document.getElementById('modal-prod-desc').value = '';
    document.getElementById('modal-prod-unidad').value = 'NIU';
    document.getElementById('modal-prod-precio').value = '';
    document.getElementById('modal-prod-afec').value = '10';
    modal.classList.remove('hidden');
  }
}

async function guardarNuevoProducto(e) {
  if (e) e.preventDefault();

  const codigo = document.getElementById('modal-prod-codigo')?.value.trim();
  const descripcion = document.getElementById('modal-prod-desc')?.value.trim();
  const unidad = document.getElementById('modal-prod-unidad')?.value;
  const precioUnitario = document.getElementById('modal-prod-precio')?.value;
  const tipoAfectacion = document.getElementById('modal-prod-afec')?.value;

  if (!codigo || !descripcion || !precioUnitario) {
    showToast('Complete todos los campos obligatorios (*)', 'error');
    return;
  }

  try {
    const res = await apiFetch('/api/productos', {
      method: 'POST',
      body: JSON.stringify({ codigo, descripcion, unidad, precioUnitario, tipoAfectacion })
    });

    if (res.exito) {
      showToast('Ítem guardado exitosamente', 'success');
      document.getElementById('producto-modal')?.classList.add('hidden');
      loadProductosTable();
    } else {
      showToast(res.mensaje, 'error');
    }
  } catch (err) {
    showToast(`Error al guardar producto: ${err.message}`, 'error');
  }
}

async function eliminarProducto(id) {
  if (!confirm('¿Está seguro de eliminar este producto del catálogo?')) return;

  try {
    const res = await apiFetch(`/api/productos/${id}`, { method: 'DELETE' });
    if (res.exito) {
      showToast('Ítem eliminado del catálogo', 'success');
      loadProductosTable();
    } else {
      showToast(res.mensaje, 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}
