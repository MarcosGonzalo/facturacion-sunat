/**
 * Validaciones de reglas de negocio y normativas de SUNAT
 */

/**
 * Valida un RUC peruano usando el algoritmo de Módulo 11 oficial de SUNAT
 */
function validarRuc(ruc) {
  if (!ruc || typeof ruc !== 'string') return false;
  if (!/^\d{11}$/.test(ruc)) return false;

  const primerosDos = ruc.substring(0, 2);
  // RUC válidos empiezan con 10, 15, 17, 20
  if (!['10', '15', '17', '20'].includes(primerosDos)) return false;

  const factores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let suma = 0;
  for (let i = 0; i < 10; i++) {
    suma += parseInt(ruc.charAt(i), 10) * factores[i];
  }

  const resto = suma % 11;
  const digitoVerificadorEsperado = 11 - resto;
  let digitoCalculado = digitoVerificadorEsperado;

  if (digitoVerificadorEsperado === 10) digitoCalculado = 0;
  else if (digitoVerificadorEsperado === 11) digitoCalculado = 1;

  const digitoReal = parseInt(ruc.charAt(10), 10);
  return digitoReal === digitoCalculado;
}

/**
 * Valida un DNI peruano (8 dígitos numéricos)
 */
function validarDni(dni) {
  if (!dni || typeof dni !== 'string') return false;
  return /^\d{8}$/.test(dni);
}

/**
 * Valida las reglas comerciales y tributarias antes de generar el XML del comprobante
 */
function validarComprobante(data) {
  const errores = [];

  // 1. Tipo de Comprobante
  if (!['01', '03'].includes(data.tipoComprobante)) {
    errores.push('Tipo de comprobante inválido. Debe ser 01 (Factura) o 03 (Boleta).');
  }

  // 2. Serie y Correlativo
  if (!data.serie || !/^[FB][A-Z0-9]{3}$/.test(data.serie)) {
    errores.push(`Serie inválida (${data.serie}). Facturas inician con F (ej. F001) y Boletas con B (ej. B001).`);
  }
  if (data.tipoComprobante === '01' && !data.serie.startsWith('F')) {
    errores.push('La serie de una Factura debe iniciar con la letra F (ej. F001).');
  }
  if (data.tipoComprobante === '03' && !data.serie.startsWith('B')) {
    errores.push('La serie de una Boleta debe iniciar con la letra B (ej. B001).');
  }
  if (!data.correlativo || parseInt(data.correlativo) <= 0) {
    errores.push('El número correlativo debe ser un entero positivo mayor a 0.');
  }

  // 3. Emisor
  if (!data.emisor || !data.emisor.ruc) {
    errores.push('Los datos del emisor son obligatorios (RUC requerido).');
  }

  // 4. Cliente
  if (!data.cliente) {
    errores.push('Los datos del cliente son obligatorios.');
  } else {
    if (data.tipoComprobante === '01') {
      if (data.cliente.tipoDocumento !== '6') {
        errores.push('Para emitir una Factura Electrónica, el cliente debe poseer RUC (Tipo de documento 6).');
      }
      if (!data.cliente.numeroDocumento || data.cliente.numeroDocumento.length !== 11) {
        errores.push('El RUC del cliente debe tener exactamente 11 dígitos.');
      }
    } else if (data.tipoComprobante === '03') {
      const total = parseFloat(data.totales?.total || 0);
      if (total >= 700 && (!data.cliente.numeroDocumento || data.cliente.tipoDocumento === '0')) {
        errores.push('Según normativa SUNAT, para boletas mayores o iguales a S/ 700.00 es obligatorio identificar al cliente (DNI u otro).');
      }
    }
  }

  // 5. Ítems
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errores.push('El comprobante debe contener al menos un ítem o producto.');
  } else {
    data.items.forEach((item, index) => {
      const idx = index + 1;
      if (!item.descripcion || item.descripcion.trim() === '') {
        errores.push(`El ítem #${idx} debe tener una descripción.`);
      }
      if (!item.cantidad || parseFloat(item.cantidad) <= 0) {
        errores.push(`La cantidad del ítem #${idx} debe ser mayor a 0.`);
      }
      if (item.precioUnitario === undefined || parseFloat(item.precioUnitario) < 0) {
        errores.push(`El precio unitario del ítem #${idx} no puede ser negativo.`);
      }
    });
  }

  return {
    valido: errores.length === 0,
    errores
  };
}

module.exports = {
  validarRuc,
  validarDni,
  validarComprobante
};
