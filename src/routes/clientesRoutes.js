const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/jsonStore');
const { validarRuc, validarDni } = require('../services/validatorService');

// GET /api/clientes
router.get('/', (req, res) => {
  try {
    const clientes = db.getClientes();
    res.json({ exito: true, clientes });
  } catch (err) {
    res.status(500).json({ exito: false, mensaje: err.message });
  }
});

// GET /api/clientes/validar-doc?tipo=6&numero=20000000001
router.get('/validar-doc', (req, res) => {
  const { tipo, numero } = req.query;
  let esValido = false;
  let mensaje = '';

  if (tipo === '6') { // RUC
    esValido = validarRuc(numero);
    mensaje = esValido ? 'RUC válido según algoritmo SUNAT (Módulo 11)' : 'El RUC ingresado no cumple con el algoritmo Módulo 11 de SUNAT';
  } else if (tipo === '1') { // DNI
    esValido = validarDni(numero);
    mensaje = esValido ? 'DNI con formato válido' : 'El DNI debe contener exactamente 8 dígitos numéricos';
  } else {
    esValido = !!numero && numero.length >= 3;
    mensaje = esValido ? 'Documento válido' : 'El documento debe contener al menos 3 caracteres';
  }

  res.json({ exito: true, esValido, mensaje });
});

// POST /api/clientes
router.post('/', (req, res) => {
  try {
    const { tipoDocumento, numeroDocumento, razonSocial, direccion, correo, telefono } = req.body;

    if (!tipoDocumento || !numeroDocumento || !razonSocial) {
      return res.status(400).json({ exito: false, mensaje: 'Tipo de documento, número y razón social son obligatorios' });
    }

    const clientes = db.getClientes();
    const existe = clientes.find(c => c.tipoDocumento === tipoDocumento && c.numeroDocumento === numeroDocumento);
    if (existe) {
      return res.status(400).json({ exito: false, mensaje: 'Ya existe un cliente registrado con ese tipo y número de documento' });
    }

    const nuevoCliente = {
      id: uuidv4(),
      tipoDocumento,
      numeroDocumento,
      razonSocial: razonSocial.trim().toUpperCase(),
      direccion: direccion ? direccion.trim().toUpperCase() : '',
      correo: correo ? correo.trim() : '',
      telefono: telefono ? telefono.trim() : ''
    };

    clientes.push(nuevoCliente);
    db.saveClientes(clientes);

    res.json({ exito: true, mensaje: 'Cliente registrado exitosamente', cliente: nuevoCliente });
  } catch (err) {
    res.status(500).json({ exito: false, mensaje: err.message });
  }
});

// PUT /api/clientes/:id
router.put('/:id', (req, res) => {
  try {
    const clientes = db.getClientes();
    const index = clientes.findIndex(c => c.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ exito: false, mensaje: 'Cliente no encontrado' });
    }

    const { tipoDocumento, numeroDocumento, razonSocial, direccion, correo, telefono } = req.body;
    clientes[index] = {
      ...clientes[index],
      tipoDocumento: tipoDocumento || clientes[index].tipoDocumento,
      numeroDocumento: numeroDocumento || clientes[index].numeroDocumento,
      razonSocial: razonSocial ? razonSocial.trim().toUpperCase() : clientes[index].razonSocial,
      direccion: direccion !== undefined ? direccion.trim().toUpperCase() : clientes[index].direccion,
      correo: correo !== undefined ? correo.trim() : clientes[index].correo,
      telefono: telefono !== undefined ? telefono.trim() : clientes[index].telefono
    };

    db.saveClientes(clientes);
    res.json({ exito: true, mensaje: 'Cliente actualizado exitosamente', cliente: clientes[index] });
  } catch (err) {
    res.status(500).json({ exito: false, mensaje: err.message });
  }
});

// DELETE /api/clientes/:id
router.delete('/:id', (req, res) => {
  try {
    let clientes = db.getClientes();
    const existe = clientes.some(c => c.id === req.params.id);
    if (!existe) {
      return res.status(404).json({ exito: false, mensaje: 'Cliente no encontrado' });
    }

    clientes = clientes.filter(c => c.id !== req.params.id);
    db.saveClientes(clientes);
    res.json({ exito: true, mensaje: 'Cliente eliminado exitosamente' });
  } catch (err) {
    res.status(500).json({ exito: false, mensaje: err.message });
  }
});

module.exports = router;
