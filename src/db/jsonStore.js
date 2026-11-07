const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getFilePath(collection) {
  return path.join(DATA_DIR, `${collection}.json`);
}

function readCollection(collection, defaultValue = []) {
  const filePath = getFilePath(collection);
  if (!fs.existsSync(filePath)) {
    saveCollection(collection, defaultValue);
    return defaultValue;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${collection}.json:`, err);
    return defaultValue;
  }
}

function saveCollection(collection, data) {
  const filePath = getFilePath(collection);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// Initial default configuration
const defaultConfig = {
  emisor: {
    ruc: '20000000001',
    razonSocial: 'SERVICIOS TECNOLOGICOS DEL PERU S.A.C.',
    nombreComercial: 'SERVITEC PERU',
    ubigeo: '150101',
    direccion: 'AV. JAVIER PRADO ESTE 1234, OF. 501',
    departamento: 'LIMA',
    provincia: 'LIMA',
    distrito: 'SAN ISIDRO',
    urbanizacion: 'JARDIN',
    telefono: '(01) 456-7890',
    correo: 'facturacion@servitecperu.com'
  },
  sunat: {
    solUser: 'MODDATOS',
    solPass: 'moddatos',
    endpoint: 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService',
    modoSimulacion: false // true: responde localmente con CDR simulado; false: envía a SUNAT Beta
  },
  certificado: {
    path: '',
    password: '',
    validoHasta: null,
    subject: '',
    autoGenerado: false
  },
  series: {
    factura: 'F001',
    correlativoFactura: 1,
    boleta: 'B001',
    correlativoBoleta: 1
  }
};

// Initial default products
const defaultProductos = [
  {
    id: 'prod-001',
    codigo: 'SRV-001',
    descripcion: 'SERVICIO DE DESARROLLO DE SOFTWARE',
    unidad: 'ZZ', // Catálogo 03: Unidad de Medida (ZZ = Servicios)
    precioUnitario: 1500.00,
    tipoAfectacion: '10', // Catálogo 07: 10 = Gravado - Operación Onerosa
    porcentajeIgv: 18.00
  },
  {
    id: 'prod-002',
    codigo: 'SRV-002',
    descripcion: 'CONSULTORÍA EN INFRAESTRUCTURA CLOUD',
    unidad: 'ZZ',
    precioUnitario: 800.00,
    tipoAfectacion: '10',
    porcentajeIgv: 18.00
  },
  {
    id: 'prod-003',
    codigo: 'PRD-101',
    descripcion: 'LICENCIA DE SOFTWARE FACTURADOR ERP ANUAL',
    unidad: 'NIU', // NIU = Unidades
    precioUnitario: 350.00,
    tipoAfectacion: '10',
    porcentajeIgv: 18.00
  },
  {
    id: 'prod-004',
    codigo: 'CUR-201',
    descripcion: 'CAPACITACIÓN TÉCNICA EN FACTURACIÓN SUNAT',
    unidad: 'ZZ',
    precioUnitario: 250.00,
    tipoAfectacion: '20', // 20 = Exonerado - Operación Onerosa
    porcentajeIgv: 0.00
  },
  {
    id: 'prod-005',
    codigo: 'LIB-301',
    descripcion: 'MANUAL TÉCNICO UBL 2.1 SUNAT (LIBRO TRIBUTARIO)',
    unidad: 'NIU',
    precioUnitario: 120.00,
    tipoAfectacion: '30', // 30 = Inafecto - Operación Onerosa
    porcentajeIgv: 0.00
  }
];

// Initial default clients
const defaultClientes = [
  {
    id: 'cli-001',
    tipoDocumento: '6', // Catálogo 06: 6 = RUC
    numeroDocumento: '20100070970',
    razonSocial: 'BANCO DE CREDITO DEL PERU',
    direccion: 'CALLE CENTENARIO 156, LA MOLINA, LIMA',
    correo: 'contacto@bcp.com.pe',
    telefono: '987654321'
  },
  {
    id: 'cli-002',
    tipoDocumento: '6',
    numeroDocumento: '20504794637',
    razonSocial: 'PETROLEOS DEL PERU PETROPERU S.A.',
    direccion: 'AV. ENRIQUE CANAVAL Y MOREYRA 150, SAN ISIDRO',
    correo: 'comprobantes@petroperu.com.pe',
    telefono: '998877665'
  },
  {
    id: 'cli-003',
    tipoDocumento: '1', // Catálogo 06: 1 = DNI
    numeroDocumento: '45678901',
    razonSocial: 'JUAN CARLOS PÉREZ GÓMEZ',
    direccion: 'JR. HUANCAVELICA 234, LIMA',
    correo: 'jcperez@gmail.com',
    telefono: '945123456'
  },
  {
    id: 'cli-004',
    tipoDocumento: '1',
    numeroDocumento: '71234567',
    razonSocial: 'MARIA ELENA ROJAS BENITEZ',
    direccion: 'AV. ALFREDO MENDIOLA 1200, LOS OLIVOS',
    correo: 'mrojas@outlook.com',
    telefono: '912345678'
  }
];

// Initialize default files if they do not exist
function initDatabase() {
  if (!fs.existsSync(getFilePath('config'))) {
    saveCollection('config', defaultConfig);
  }
  if (!fs.existsSync(getFilePath('productos'))) {
    saveCollection('productos', defaultProductos);
  }
  if (!fs.existsSync(getFilePath('clientes'))) {
    saveCollection('clientes', defaultClientes);
  }
  if (!fs.existsSync(getFilePath('comprobantes'))) {
    saveCollection('comprobantes', []);
  }
}

initDatabase();

module.exports = {
  getConfig: () => readCollection('config', defaultConfig),
  saveConfig: (data) => saveCollection('config', data),

  getClientes: () => readCollection('clientes', defaultClientes),
  saveClientes: (data) => saveCollection('clientes', data),

  getProductos: () => readCollection('productos', defaultProductos),
  saveProductos: (data) => saveCollection('productos', data),

  getComprobantes: () => readCollection('comprobantes', []),
  saveComprobantes: (data) => saveCollection('comprobantes', data)
};
