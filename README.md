# 🚀 Sistema Cliente de Facturación Electrónica con Integración SUNAT (UBL 2.1)

Aplicación cliente de facturación electrónica completa, interactiva y normada, diseñada para generar, firmar digitalmente y transmitir comprobantes de pago (Facturas y Boletas de Venta) hacia los servicios web de prueba (Homologación / Beta) de la **SUNAT** conforme a la normativa tributaria peruana y el estándar internacional **UBL 2.1 (Universal Business Language)**.

---

## 📋 Cumplimiento de Requerimientos del Trabajo Práctico

| Módulo | Requerimiento Oficial | Implementación en el Sistema |
| :--- | :--- | :--- |
| **A. Catálogos y Datos Básicos** | Registro de Emisor, Clientes y Catálogo de Productos/Servicios con afectación al IGV | CRUD completo con validación matemática de RUC (Módulo 11) y DNI, unidades de medida SUNAT (Catálogo 03: NIU, ZZ, etc.) y tipos de afectación (Catálogo 07: 10, 20, 30). |
| **B. Emisión de Comprobantes** | Formulario interactivo, Estructuración XML UBL 2.1 y Firma Digital X.509 | Emisión interactiva de Facturas (01) y Boletas (03), cálculo automático de IGV (18%), monto en letras automático, firma digital XMLDSig RSA-SHA256 con extracción de `DigestValue` (Hash). |
| **C. Web Service SUNAT** | Conexión SOAP Beta, autenticación SOL (WS-Security), empaquetado ZIP y recepción de CDR | Conexión directa a `https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService`, autenticación SOL con `MODDATOS` / `moddatos`, parseo de Constancia de Recepción (CDR) y manejo de errores. |
| **D. Visualización y Almacén** | Representación impresa (PDF / Ticket) con Código QR oficial y Hash, base de datos local | Vista previa e impresión en Formato A4 y Formato Ticket (80mm), generación del Código QR oficial (SUNAT Anexo V), almacenamiento persistente y trazabilidad de estados. |

---

## 🛠️ Tecnologías y Arquitectura

- **Backend**: Node.js & Express
- **Procesamiento y Firma XML**: `xml-crypto`, `@xmldom/xmldom`, `fast-xml-parser`
- **Criptografía y Certificados X.509**: `node-forge` (generación y carga de certificados PKCS#12 `.p12` / `.pfx`)
- **Protocolo SOAP / HTTP**: `axios`, `adm-zip` (compresión/descompresión Base64 ZIP)
- **Código QR**: `qrcode` (según especificación técnica de SUNAT Anexo V)
- **Persistencia**: Almacenamiento local estructurado en JSON (`./data/`) y explorador de archivos generados (`./storage/`)
- **Frontend**: Single Page Application (SPA) responsiva con Tailwind CSS y FontAwesome 6

---

## ⚡ Guía de Inicio Rápido

### 1. Requisitos Previos
- **Node.js** v18 o superior instalado en el equipo.
- Conexión a internet (para comunicarse con los servidores Beta de SUNAT; si no cuentas con internet o el servidor de SUNAT está en mantenimiento, la app incluye un **Modo Simulación** integrado).

### 2. Instalación de Dependencias
Abre una terminal en la carpeta del proyecto y ejecuta:
```bash
npm install
```

### 3. Iniciar el Servidor
```bash
npm start
```

### 4. Abrir la Aplicación
Abre tu navegador web e ingresa a:
👉 **`http://localhost:3000`**

---

## 📌 Comandos Disponibles

- `npm start` : Inicia el servidor de facturación en el puerto 3000.
- `npm test` : Ejecuta la suite de pruebas unitarias y de validación de esquemas UBL 2.1.
- `npm run seed` : Siembra datos iniciales de prueba (1 Factura y 1 Boleta con firmas y CDRs).

---

## 🔑 Credenciales Oficiales de Prueba SUNAT

Para el entorno de homologación/beta se utilizan los valores oficiales normados:
- **RUC de Emisor de Prueba**: `20000000001`
- **Usuario SOL**: `MODDATOS`
- **Clave SOL**: `moddatos`
- **Usuario WS-Security**: `20000000001MODDATOS`
- **Endpoint SOAP Facturas/Boletas**: `https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService`
- **WSDL**: `https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService?wsdl`

---

## 📂 Estructura del Proyecto

```text
facturacion-sunat/
│
├── server.js                        # Servidor principal Express (API y estáticos)
├── package.json                     # Dependencias y scripts
├── test_backend.js                  # Suite de pruebas unitarias y de flujo
├── seed_initial_data.js             # Generador de datos iniciales
├── INFORME_TECNICO.md               # Informe técnico académico para evaluación
│
├── src/
│   ├── db/
│   │   └── jsonStore.js             # Gestor de persistencia local en archivos JSON
│   ├── services/
│   │   ├── ublBuilder.js            # Constructor de XML UBL 2.1 para Facturas y Boletas
│   │   ├── xmlSigner.js             # Motor de firma digital XMLDSig y extracción de Hash
│   │   ├── certService.js           # Carga y generación de certificados X.509 PKCS#12
│   │   ├── sunatService.js          # Cliente SOAP sendBill, empaquetado ZIP y lector de CDR
│   │   ├── qrService.js             # Generador de código QR según Anexo V de SUNAT
│   │   ├── numberToWords.js         # Conversor de importes a letras oficiales en español
│   │   └── validatorService.js      # Algoritmo Módulo 11 (RUC) y reglas tributarias
│   └── routes/
│       ├── configRoutes.js          # Configuración de emisor, credenciales y certificados
│       ├── clientesRoutes.js        # CRUD y validación de clientes
│       ├── productosRoutes.js       # CRUD de catálogo de productos/servicios
│       ├── comprobantesRoutes.js    # Emisión, reenvío y descargas de XML/ZIP/CDR
│       └── sunatRoutes.js           # Ping de conexión y validador de sintaxis XML
│
├── data/                            # Base de datos local
│   ├── config.json                  # Parámetros del sistema
│   ├── clientes.json                # Directorio de clientes
│   ├── productos.json               # Catálogo de ítems
│   └── comprobantes.json            # Historial de comprobantes emitidos
│
├── storage/                         # Archivos generados y recibidos
│   ├── certificates/                # Certificados digitales (.p12 / .pfx)
│   ├── xml/                         # Comprobantes XML generados y firmados
│   ├── zip/                         # Paquetes ZIP transmitidos a SUNAT
│   └── cdr/                         # Constancias de Recepción (ZIP y XML de SUNAT)
│
└── public/                          # Interfaz gráfica moderna (SPA)
    ├── index.html                   # Maquetación con Tailwind CSS y modales
    ├── css/custom.css               # Estilos de impresión para A4 y Ticket 80mm
    └── js/
        ├── app.js                   # Enrutador y controlador de eventos
        ├── utils.js                 # Formateadores, alertas y cliente API
        └── components/
            ├── dashboard.js         # Monitoreo y métricas en vivo
            ├── emision.js           # Formulario interactivo con cálculo en tiempo real
            ├── comprobantes.js      # Historial, filtros y auditoría
            ├── clientes.js          # Gestión de clientes y validación RUC/DNI
            ├── productos.js         # Catálogo de productos y afectaciones IGV
            ├── config.js            # Configuración de emisor y certificado
            ├── visor.js             # Representación impresa (A4 y Ticket con QR/Hash)
            └── validador.js         # Validador de archivos XML UBL 2.1
```

---

## 📑 Catálogos SUNAT Implementados

- **Catálogo 01 - Tipo de Documento**: `01` (Factura), `03` (Boleta de Venta).
- **Catálogo 03 - Unidad de Medida**: `NIU` (Unidades), `ZZ` (Servicios), `BX` (Cajas), `KGM` (Kilos), `MTR` (Metros).
- **Catálogo 06 - Documento de Identidad**: `6` (RUC), `1` (DNI), `4` (Carné de Extranjería), `7` (Pasaporte).
- **Catálogo 07 - Afectación del IGV**: `10` (Gravado - Op. Onerosa), `20` (Exonerado - Op. Onerosa), `30` (Inafecto - Op. Onerosa).
- **Catálogo 16 - Tipo de Precio**: `01` (Precio unitario incluye IGV).
- **Catálogo 51 - Código de Operación**: `0101` (Venta Interna).
- **Catálogo 52 - Leyendas**: Código `1000` (Monto en letras).
