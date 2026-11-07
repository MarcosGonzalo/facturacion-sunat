// Utilidades generales de interfaz

function formatCurrency(amount, currency = 'PEN') {
  const symbol = currency === 'USD' ? '$' : 'S/';
  const val = parseFloat(amount || 0).toFixed(2);
  return `${symbol} ${Number(val).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function formatDocType(type) {
  const types = {
    '6': 'RUC',
    '1': 'DNI',
    '4': 'C.E.',
    '7': 'PASAPORTE',
    '0': 'DOC.TRIB.NO.DOM'
  };
  return types[type] || 'DOC';
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-600' : (type === 'error' ? 'bg-rose-600' : 'bg-blue-600');
  const icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info');

  toast.className = `${bg} text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 mb-2 transition-all transform duration-300 opacity-0 translate-y-2 text-sm z-50`;
  toast.innerHTML = `
    <i class="fa-solid ${icon} text-base"></i>
    <span class="font-medium flex-1">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove('opacity-0', 'translate-y-2');
    toast.classList.add('opacity-100', 'translate-y-0');
  }, 10);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

async function apiFetch(endpoint, options = {}) {
  try {
    const res = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}
