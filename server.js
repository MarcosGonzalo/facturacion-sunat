const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const configRoutes = require('./src/routes/configRoutes');
const clientesRoutes = require('./src/routes/clientesRoutes');
const productosRoutes = require('./src/routes/productosRoutes');
const comprobantesRoutes = require('./src/routes/comprobantesRoutes');
const sunatRoutes = require('./src/routes/sunatRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static frontend
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/config', configRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/comprobantes', comprobantesRoutes);
app.use('/api/sunat', sunatRoutes);

// SPA fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('===========================================================');
  console.log(`🚀 SERVIDOR DE FACTURACIÓN ELECTRÓNICA SUNAT (UBL 2.1)`);
  console.log(`🌐 Acceso Web: http://localhost:${PORT}`);
  console.log(`📁 Directorio de almacenamiento: ${path.join(__dirname, 'storage')}`);
  console.log('===========================================================');
});

module.exports = { app, server };
