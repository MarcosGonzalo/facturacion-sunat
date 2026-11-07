const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/jsonStore');

// GET /api/productos
router.get('/', (req, res) => {
  try {
    const productos = db.getProductos();
    res.json({ exito: true, productos });
  } catch (err) {
    res.status(500).json({ exito: false, mensaje: err.message });
  }
});

// POST /api/productos
router.post('/', (req, res) => {
  try {
    const { codigo, descripcion, unidad, precioUnitario, tipoAfectacion } = req.body;

    if (!codigo || !descripcion || precioUnitario === undefined) {
      return res.status(400).json({ exito: false, mensaje: 'Código, descripción y precio unitario son obligatorios' });
    }

    const productos = db.getProductos();
    const existe = productos.find(p => p.codigo.trim().toUpperCase() === codigo.trim().toUpperCase());
    if (existe) {
      return res.status(400).json({ exito: false, mensaje: 'Ya existe un ítem con ese código interno' });
    }

    const nuevoProducto = {
      id: uuidv4(),
      codigo: codigo.trim().toUpperCase(),
      descripcion: descripcion.trim().toUpperCase(),
      unidad: unidad || 'NIU',
      precioUnitario: parseFloat(precioUnitario),
      tipoAfectacion: tipoAfectacion || '10',
      porcentajeIgv: tipoAfectacion === '10' ? 18.00 : 0.00
    };

    productos.push(nuevoProducto);
    db.saveProductos(productos);

    res.json({ exito: true, mensaje: 'Ítem registrado exitosamente', producto: nuevoProducto });
  } catch (err) {
    res.status(500).json({ exito: false, mensaje: err.message });
  }
});

// PUT /api/productos/:id
router.put('/:id', (req, res) => {
  try {
    const productos = db.getProductos();
    const index = productos.findIndex(p => p.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ exito: false, mensaje: 'Ítem no encontrado' });
    }

    const { codigo, descripcion, unidad, precioUnitario, tipoAfectacion } = req.body;
    const afectacion = tipoAfectacion || productos[index].tipoAfectacion;

    productos[index] = {
      ...productos[index],
      codigo: codigo ? codigo.trim().toUpperCase() : productos[index].codigo,
      descripcion: descripcion ? descripcion.trim().toUpperCase() : productos[index].descripcion,
      unidad: unidad || productos[index].unidad,
      precioUnitario: precioUnitario !== undefined ? parseFloat(precioUnitario) : productos[index].precioUnitario,
      tipoAfectacion: afectacion,
      porcentajeIgv: afectacion === '10' ? 18.00 : 0.00
    };

    db.saveProductos(productos);
    res.json({ exito: true, mensaje: 'Ítem actualizado exitosamente', producto: productos[index] });
  } catch (err) {
    res.status(500).json({ exito: false, mensaje: err.message });
  }
});

// DELETE /api/productos/:id
router.delete('/:id', (req, res) => {
  try {
    let productos = db.getProductos();
    const existe = productos.some(p => p.id === req.params.id);
    if (!existe) {
      return res.status(404).json({ exito: false, mensaje: 'Ítem no encontrado' });
    }

    productos = productos.filter(p => p.id !== req.params.id);
    db.saveProductos(productos);
    res.json({ exito: true, mensaje: 'Ítem eliminado exitosamente' });
  } catch (err) {
    res.status(500).json({ exito: false, mensaje: err.message });
  }
});

module.exports = router;
