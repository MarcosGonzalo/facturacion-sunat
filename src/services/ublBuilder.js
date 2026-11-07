const { numeroALetras } = require('./numberToWords');

/**
 * Constructor de XML UBL 2.1 conforme a estándares SUNAT (Resolución 097-2012/SUNAT y modificatorias)
 */
function buildInvoiceXml(data) {
  const {
    emisor,
    cliente,
    tipoComprobante, // '01' Factura, '03' Boleta
    serie,
    correlativo,
    fechaEmision,
    horaEmision,
    moneda = 'PEN',
    items,
    totales
  } = data;

  const correlativoFormateado = String(correlativo).padStart(8, '0');
  const numeroCompleto = `${serie}-${correlativoFormateado}`;
  const totalLetras = numeroALetras(totales.total, moneda);

  // XML Subtotales de Impuestos
  let taxSubtotalsXml = '';

  // 1. Operaciones Gravadas (Catálogo 07: 10, Tributo 1000 - IGV)
  if (parseFloat(totales.gravadas || 0) > 0 || (parseFloat(totales.exoneradas || 0) === 0 && parseFloat(totales.inafectas || 0) === 0)) {
    taxSubtotalsXml += `
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${moneda}">${parseFloat(totales.gravadas || 0).toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${moneda}">${parseFloat(totales.igv || 0).toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID schemeAgencyName="United Nations Economic Commission for Europe" schemeID="UN/ECE 5305" schemeName="Tax Category Identifier">S</cbc:ID>
        <cbc:Percent>18.00</cbc:Percent>
        <cbc:TaxExemptionReasonCode listAgencyName="PE:SUNAT" listName="Afectacion del IGV" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo07">10</cbc:TaxExemptionReasonCode>
        <cac:TaxScheme>
          <cbc:ID schemeAgencyName="PE:SUNAT" schemeID="UN/ECE 5153" schemeName="Codigo de tributos">1000</cbc:ID>
          <cbc:Name>IGV</cbc:Name>
          <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>`;
  }

  // 2. Operaciones Exoneradas (Catálogo 07: 20, Tributo 9997 - EXO)
  if (parseFloat(totales.exoneradas || 0) > 0) {
    taxSubtotalsXml += `
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${moneda}">${parseFloat(totales.exoneradas).toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${moneda}">0.00</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID schemeAgencyName="United Nations Economic Commission for Europe" schemeID="UN/ECE 5305" schemeName="Tax Category Identifier">E</cbc:ID>
        <cbc:Percent>0.00</cbc:Percent>
        <cbc:TaxExemptionReasonCode listAgencyName="PE:SUNAT" listName="Afectacion del IGV" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo07">20</cbc:TaxExemptionReasonCode>
        <cac:TaxScheme>
          <cbc:ID schemeAgencyName="PE:SUNAT" schemeID="UN/ECE 5153" schemeName="Codigo de tributos">9997</cbc:ID>
          <cbc:Name>EXO</cbc:Name>
          <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>`;
  }

  // 3. Operaciones Inafectas (Catálogo 07: 30, Tributo 9998 - INA)
  if (parseFloat(totales.inafectas || 0) > 0) {
    taxSubtotalsXml += `
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${moneda}">${parseFloat(totales.inafectas).toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${moneda}">0.00</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID schemeAgencyName="United Nations Economic Commission for Europe" schemeID="UN/ECE 5305" schemeName="Tax Category Identifier">O</cbc:ID>
        <cbc:Percent>0.00</cbc:Percent>
        <cbc:TaxExemptionReasonCode listAgencyName="PE:SUNAT" listName="Afectacion del IGV" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo07">30</cbc:TaxExemptionReasonCode>
        <cac:TaxScheme>
          <cbc:ID schemeAgencyName="PE:SUNAT" schemeID="UN/ECE 5153" schemeName="Codigo de tributos">9998</cbc:ID>
          <cbc:Name>INA</cbc:Name>
          <cbc:TaxTypeCode>FRE</cbc:TaxTypeCode>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>`;
  }

  // XML Líneas de Detalle (InvoiceLine)
  const linesXml = items.map((item, index) => {
    const idx = index + 1;
    const cantidad = parseFloat(item.cantidad || 1).toFixed(2);
    const precioConIgv = parseFloat(item.precioUnitarioConIgv || item.precioUnitario).toFixed(2);
    const valorUnitarioSinIgv = parseFloat(item.valorUnitario || (item.tipoAfectacion === '10' ? item.precioUnitario / 1.18 : item.precioUnitario)).toFixed(2);
    const valorVentaLinea = parseFloat(item.subtotal || (valorUnitarioSinIgv * cantidad)).toFixed(2);
    const igvLinea = parseFloat(item.igv || (item.tipoAfectacion === '10' ? valorVentaLinea * 0.18 : 0)).toFixed(2);

    let catId = 'S';
    let codTributo = '1000';
    let nomTributo = 'IGV';
    let tipoTributo = 'VAT';
    let porcentaje = '18.00';

    if (item.tipoAfectacion === '20') {
      catId = 'E';
      codTributo = '9997';
      nomTributo = 'EXO';
      tipoTributo = 'VAT';
      porcentaje = '0.00';
    } else if (item.tipoAfectacion === '30') {
      catId = 'O';
      codTributo = '9998';
      nomTributo = 'INA';
      tipoTributo = 'FRE';
      porcentaje = '0.00';
    }

    return `
  <cac:InvoiceLine>
    <cbc:ID>${idx}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${item.unidad || 'NIU'}" unitCodeListAgencyName="United Nations Economic Commission for Europe" unitCodeListID="UN/ECE rec 20">${cantidad}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${moneda}">${valorVentaLinea}</cbc:LineExtensionAmount>
    <cac:PricingReference>
      <cac:AlternativeConditionPrice>
        <cbc:PriceAmount currencyID="${moneda}">${precioConIgv}</cbc:PriceAmount>
        <cbc:PriceTypeCode listAgencyName="PE:SUNAT" listName="Tipo de Precio" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo16">01</cbc:PriceTypeCode>
      </cac:AlternativeConditionPrice>
    </cac:PricingReference>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="${moneda}">${igvLinea}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="${moneda}">${valorVentaLinea}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="${moneda}">${igvLinea}</cbc:TaxAmount>
        <cac:TaxCategory>
          <cbc:ID schemeAgencyName="United Nations Economic Commission for Europe" schemeID="UN/ECE 5305" schemeName="Tax Category Identifier">${catId}</cbc:ID>
          <cbc:Percent>${porcentaje}</cbc:Percent>
          <cbc:TaxExemptionReasonCode listAgencyName="PE:SUNAT" listName="Afectacion del IGV" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo07">${item.tipoAfectacion || '10'}</cbc:TaxExemptionReasonCode>
          <cac:TaxScheme>
            <cbc:ID schemeAgencyName="PE:SUNAT" schemeID="UN/ECE 5153" schemeName="Codigo de tributos">${codTributo}</cbc:ID>
            <cbc:Name>${nomTributo}</cbc:Name>
            <cbc:TaxTypeCode>${tipoTributo}</cbc:TaxTypeCode>
          </cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Description><![CDATA[${item.descripcion}]]></cbc:Description>
      <cac:SellersItemIdentification>
        <cbc:ID>${item.codigo || `ITEM${idx}`}</cbc:ID>
      </cac:SellersItemIdentification>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${moneda}">${valorUnitarioSinIgv}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`;
  }).join('');

  // XML Completo
  const xml = `<?xml version="1.0" encoding="ISO-8859-1"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ccts="urn:un:unece:uncefact:documentation:2"
         xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
         xmlns:qdt="urn:oasis:names:specification:ubl:schema:xsd:QualifiedDatatypes-2"
         xmlns:udt="urn:un:unece:uncefact:data:specification:UnqualifiedDataTypesSchemaModule:2"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
      </ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID schemeAgencyName="PE:SUNAT">2.0</cbc:CustomizationID>
  <cbc:ID>${numeroCompleto}</cbc:ID>
  <cbc:IssueDate>${fechaEmision}</cbc:IssueDate>
  <cbc:IssueTime>${horaEmision || '12:00:00'}</cbc:IssueTime>
  <cbc:InvoiceTypeCode listAgencyName="PE:SUNAT" listName="Tipo de Documento" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01" listID="0101" name="Tipo de Operacion">${tipoComprobante}</cbc:InvoiceTypeCode>
  <cbc:Note languageLocaleID="1000"><![CDATA[${totalLetras}]]></cbc:Note>
  <cbc:DocumentCurrencyCode listAgencyName="United Nations Economic Commission for Europe" listID="ISO 4217 Alpha" listName="Currency">${moneda}</cbc:DocumentCurrencyCode>
  <cac:Signature>
    <cbc:ID>${emisor.ruc}</cbc:ID>
    <cac:SignatoryParty>
      <cac:PartyIdentification>
        <cbc:ID>${emisor.ruc}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name><![CDATA[${emisor.razonSocial}]]></cbc:Name>
      </cac:PartyName>
    </cac:SignatoryParty>
    <cac:DigitalSignatureAttachment>
      <cac:ExternalReference>
        <cbc:URI>#Sign-SUNAT</cbc:URI>
      </cac:ExternalReference>
    </cac:DigitalSignatureAttachment>
  </cac:Signature>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeAgencyName="PE:SUNAT" schemeID="6" schemeName="Documento de Identidad" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">${emisor.ruc}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name><![CDATA[${emisor.nombreComercial || emisor.razonSocial}]]></cbc:Name>
      </cac:PartyName>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName><![CDATA[${emisor.razonSocial}]]></cbc:RegistrationName>
        <cac:RegistrationAddress>
          <cbc:ID schemeAgencyName="PE:INEI" schemeName="Ubigeos">${emisor.ubigeo || '150101'}</cbc:ID>
          <cbc:AddressTypeCode listAgencyName="PE:SUNAT" listName="Establecimientos anexos">0000</cbc:AddressTypeCode>
          <cbc:CitySubdivisionName><![CDATA[${emisor.urbanizacion || '-'}]]></cbc:CitySubdivisionName>
          <cbc:CityName><![CDATA[${emisor.provincia || 'LIMA'}]]></cbc:CityName>
          <cbc:CountrySubentity><![CDATA[${emisor.departamento || 'LIMA'}]]></cbc:CountrySubentity>
          <cbc:District><![CDATA[${emisor.distrito || 'LIMA'}]]></cbc:District>
          <cac:AddressLine>
            <cbc:Line><![CDATA[${emisor.direccion || 'LIMA'}]]></cbc:Line>
          </cac:AddressLine>
          <cac:Country>
            <cbc:IdentificationCode listAgencyName="United Nations Economic Commission for Europe" listID="ISO 3166-1" listName="Country">PE</cbc:IdentificationCode>
          </cac:Country>
        </cac:RegistrationAddress>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeAgencyName="PE:SUNAT" schemeID="${cliente.tipoDocumento || '6'}" schemeName="Documento de Identidad" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">${cliente.numeroDocumento || '-'}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName><![CDATA[${cliente.razonSocial}]]></cbc:RegistrationName>
        <cac:RegistrationAddress>
          <cac:AddressLine>
            <cbc:Line><![CDATA[${cliente.direccion || '-'}]]></cbc:Line>
          </cac:AddressLine>
          <cac:Country>
            <cbc:IdentificationCode listAgencyName="United Nations Economic Commission for Europe" listID="ISO 3166-1" listName="Country">PE</cbc:IdentificationCode>
          </cac:Country>
        </cac:RegistrationAddress>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:PaymentTerms>
    <cbc:ID>FormaPago</cbc:ID>
    <cbc:PaymentMeansID>Contado</cbc:PaymentMeansID>
  </cac:PaymentTerms>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${moneda}">${parseFloat(totales.igv || 0).toFixed(2)}</cbc:TaxAmount>${taxSubtotalsXml}
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${moneda}">${parseFloat(totales.valorVenta || totales.gravadas || 0).toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxInclusiveAmount currencyID="${moneda}">${parseFloat(totales.total || 0).toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${moneda}">${parseFloat(totales.total || 0).toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>${linesXml}
</Invoice>`;

  return {
    xml,
    numeroCompleto,
    fileName: `${emisor.ruc}-${tipoComprobante}-${numeroCompleto}.xml`,
    zipFileName: `${emisor.ruc}-${tipoComprobante}-${numeroCompleto}.zip`,
    totalLetras
  };
}

module.exports = { buildInvoiceXml };
