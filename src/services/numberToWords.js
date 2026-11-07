/**
 * Conversión de números a letras en español según normativa SUNAT
 * Ejemplo: 1518.50 => "SON: UN MIL QUINIENTOS DIECIOCHO CON 50/100 SOLES"
 */

function Unidades(num) {
  switch (num) {
    case 1: return 'UN';
    case 2: return 'DOS';
    case 3: return 'TRES';
    case 4: return 'CUATRO';
    case 5: return 'CINCO';
    case 6: return 'SEIS';
    case 7: return 'SIETE';
    case 8: return 'OCHO';
    case 9: return 'NUEVE';
    default: return '';
  }
}

function DecenasY(strSin, numUnidades) {
  if (numUnidades > 0) return `${strSin} Y ${Unidades(numUnidades)}`;
  return strSin;
}

function Decenas(num) {
  const decena = Math.floor(num / 10);
  const unidad = num - (decena * 10);

  switch (decena) {
    case 1:
      switch (unidad) {
        case 0: return 'DIEZ';
        case 1: return 'ONCE';
        case 2: return 'DOCE';
        case 3: return 'TRECE';
        case 4: return 'CATORCE';
        case 5: return 'QUINCE';
        default: return `DIECI${Unidades(unidad)}`;
      }
    case 2:
      switch (unidad) {
        case 0: return 'VEINTE';
        default: return `VEINTI${Unidades(unidad)}`;
      }
    case 3: return DecenasY('TREINTA', unidad);
    case 4: return DecenasY('CUARENTA', unidad);
    case 5: return DecenasY('CINCUENTA', unidad);
    case 6: return DecenasY('SESENTA', unidad);
    case 7: return DecenasY('SETENTA', unidad);
    case 8: return DecenasY('OCHENTA', unidad);
    case 9: return DecenasY('NOVENTA', unidad);
    case 0: return Unidades(unidad);
    default: return '';
  }
}

function Centenas(num) {
  const centenas = Math.floor(num / 100);
  const decenas = num - (centenas * 100);

  switch (centenas) {
    case 1:
      if (decenas > 0) return `CIENTO ${Decenas(decenas)}`;
      return 'CIEN';
    case 2: return `DOSCIENTOS ${Decenas(decenas)}`;
    case 3: return `TRESCIENTOS ${Decenas(decenas)}`;
    case 4: return `CUATROCIENTOS ${Decenas(decenas)}`;
    case 5: return `QUINIENTOS ${Decenas(decenas)}`;
    case 6: return `SEISCIENTOS ${Decenas(decenas)}`;
    case 7: return `SETECIENTOS ${Decenas(decenas)}`;
    case 8: return `OCHOCIENTOS ${Decenas(decenas)}`;
    case 9: return `NOVECIENTOS ${Decenas(decenas)}`;
    default: return Decenas(decenas);
  }
}

function Seccion(num, divisor, strSingular, strPlural) {
  const cientos = Math.floor(num / divisor);
  const resto = num - (cientos * divisor);
  let letras = '';

  if (cientos > 0) {
    if (cientos > 1) {
      letras = `${Centenas(cientos)} ${strPlural}`;
    } else {
      letras = strSingular;
    }
  }
  if (resto > 0) {
    letras += '';
  }
  return { letras, resto };
}

function Miles(num) {
  const divisor = 1000;
  const cientos = Math.floor(num / divisor);
  const resto = num - (cientos * divisor);

  let strMiles = '';
  if (cientos === 1) {
    strMiles = 'UN MIL';
  } else if (cientos > 1) {
    strMiles = `${Centenas(cientos)} MIL`;
  }

  const strCentenas = Centenas(resto);
  if (strMiles === '') return strCentenas;
  return `${strMiles} ${strCentenas}`.trim();
}

function Millones(num) {
  const divisor = 1000000;
  const cientos = Math.floor(num / divisor);
  const resto = num - (cientos * divisor);

  let strMillones = '';
  if (cientos === 1) {
    strMillones = 'UN MILLON';
  } else if (cientos > 1) {
    strMillones = `${Centenas(cientos)} MILLONES`;
  }

  const strMiles = Miles(resto);
  if (strMillones === '') return strMiles;
  return `${strMillones} ${strMiles}`.trim();
}

function numeroALetras(cantidad, moneda = 'SOLES') {
  const num = Math.abs(parseFloat(cantidad || 0));
  const entero = Math.floor(num);
  const centavos = Math.round((num - entero) * 100);

  let letrasEntero = '';
  if (entero === 0) {
    letrasEntero = 'CERO';
  } else {
    letrasEntero = Millones(entero);
  }

  const centavosStr = centavos.toString().padStart(2, '0');
  const nombreMoneda = moneda.toUpperCase() === 'USD' ? 'DÓLARES AMERICANOS' : 'SOLES';

  return `SON: ${letrasEntero} CON ${centavosStr}/100 ${nombreMoneda}`.replace(/\s+/g, ' ').trim();
}

module.exports = { numeroALetras };
