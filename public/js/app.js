// Enrutador y Controlador Principal de la Aplicación (SPA)

let currentActiveTab = 'dashboard';

document.addEventListener('DOMContentLoaded', () => {
  // Inicializar enrutador
  initRouter();
  // Cargar vista inicial
  switchTab('dashboard');
  // Probar conectividad con SUNAT de fondo
  setTimeout(checkSunatHealth, 1000);

  // Escuchar cierre de modales con tecla ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });
});

function initRouter() {
  const navLinks = document.querySelectorAll('.nav-tab-btn');
  navLinks.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      if (targetTab) switchTab(targetTab);
    });
  });
}

function switchTab(tabId) {
  currentActiveTab = tabId;

  // Actualizar botones de navegación
  const navBtns = document.querySelectorAll('.nav-tab-btn');
  navBtns.forEach(btn => {
    const isTarget = btn.getAttribute('data-tab') === tabId;
    if (isTarget) {
      btn.className = 'nav-tab-btn px-3 py-2 rounded-lg text-xs font-bold transition-all bg-indigo-600 text-white shadow-sm flex items-center gap-2';
    } else {
      btn.className = 'nav-tab-btn px-3 py-2 rounded-lg text-xs font-semibold transition-all text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-2';
    }
  });

  // Ocultar todas las vistas
  const views = document.querySelectorAll('.view-pane');
  views.forEach(v => {
    v.classList.add('hidden');
    v.classList.remove('active');
  });

  // Mostrar vista objetivo
  const targetView = document.getElementById(`${tabId}-view`);
  if (targetView) {
    targetView.classList.remove('hidden');
    targetView.classList.add('active', 'tab-content');
  }

  // Ejecutar renderizado del componente correspondiente
  switch (tabId) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'emision':
      renderEmision();
      break;
    case 'comprobantes':
      renderComprobantes();
      break;
    case 'clientes':
      renderClientes();
      break;
    case 'productos':
      renderProductos();
      break;
    case 'config':
      renderConfig();
      break;
    case 'validador':
      renderValidador();
      break;
  }
}

function closeAllModals() {
  const modals = [
    'visor-modal',
    'trace-modal',
    'cliente-modal',
    'producto-modal',
    'xml-preview-modal'
  ];
  modals.forEach(id => {
    document.getElementById(id)?.classList.add('hidden');
  });
}
