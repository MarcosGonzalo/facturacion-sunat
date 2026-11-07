// Componente Validador de Estructura XML UBL 2.1 SUNAT

function renderValidador() {
  const container = document.getElementById('validador-view');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-6 max-w-4xl mx-auto">
      <!-- Encabezado -->
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 class="text-xl font-bold text-slate-800">Validador de Archivos XML UBL 2.1</h2>
        <p class="text-sm text-slate-500">Herramienta para comprobar la estructura técnica, esquemas y etiquetas de comprobantes electrónicos antes del envío oficial</p>
      </div>

      <!-- Editor de Entrada XML -->
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div class="flex items-center justify-between">
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-400">Pegar Contenido XML o Subir Archivo</label>
          <div class="flex items-center gap-2">
            <input type="file" id="validador-file" accept=".xml" onchange="cargarXmlDesdeArchivo(event)" class="hidden">
            <button onclick="document.getElementById('validador-file').click()" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1">
              <i class="fa-solid fa-folder-open"></i> Cargar Archivo .XML
            </button>
            <button onclick="pegarXmlEjemplo()" class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors">
              Pegar Ejemplo UBL 2.1
            </button>
          </div>
        </div>

        <textarea id="validador-input" rows="12" class="w-full p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Pegue aquí el contenido XML completo (ej. &lt;Invoice ...&gt;)"></textarea>

        <div class="flex justify-end">
          <button onclick="ejecutarValidacionXml()" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all shadow-md flex items-center gap-2">
            <i class="fa-solid fa-vial-circle-check"></i> Ejecutar Validación Técnica
          </button>
        </div>
      </div>

      <!-- Resultados de la Validación -->
      <div id="validador-resultados" class="hidden bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <!-- Renderizado dinámico de resultados -->
      </div>
    </div>
  `;
}

function cargarXmlDesdeArchivo(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById('validador-input').value = e.target.result;
    showToast(`Archivo "${file.name}" cargado en el editor`, 'info');
  };
  reader.readAsText(file);
}

function pegarXmlEjemplo() {
  const ejemplo = `<?xml version="1.0" encoding="ISO-8859-1"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <ds:Signature Id="Sign-SUNAT">
          <ds:SignedInfo>
            <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
            <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
            <ds:Reference URI="">
              <ds:Transforms><ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/></ds:Transforms>
              <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
              <ds:DigestValue>VExFUVVJUE8xMjM0NTY=</ds:DigestValue>
            </ds:Reference>
          </ds:SignedInfo>
          <ds:SignatureValue>U0lHTkFUVVJFVkFMVUU=</ds:SignatureValue>
        </ds:Signature>
      </ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID schemeAgencyName="PE:SUNAT">2.0</cbc:CustomizationID>
  <cbc:ID>F001-00000001</cbc:ID>
  <cbc:IssueDate>2026-11-06</cbc:IssueDate>
  <cbc:InvoiceTypeCode listID="0101">01</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>PEN</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID>20000000001</cbc:ID></cac:PartyIdentification>
      <cac:PartyLegalEntity><cbc:RegistrationName>EMPRESA DEMO S.A.C.</cbc:RegistrationName></cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID>20100070970</cbc:ID></cac:PartyIdentification>
      <cac:PartyLegalEntity><cbc:RegistrationName>BANCO DE CREDITO DEL PERU</cbc:RegistrationName></cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="PEN">18.00</cbc:TaxAmount>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="PEN">100.00</cbc:LineExtensionAmount>
    <cbc:PayableAmount currencyID="PEN">118.00</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`;

  document.getElementById('validador-input').value = ejemplo;
  showToast('Ejemplo UBL 2.1 cargado en el editor', 'info');
}

async function ejecutarValidacionXml() {
  const xmlContent = document.getElementById('validador-input')?.value.trim();
  const resultadosEl = document.getElementById('validador-resultados');

  if (!xmlContent) {
    showToast('Pegue el contenido XML que desea validar', 'error');
    return;
  }

  resultadosEl.classList.remove('hidden');
  resultadosEl.innerHTML = '<div class="p-6 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin text-xl mb-2"></i><br>Analizando sintaxis y etiquetas normativas...</div>';

  try {
    const res = await apiFetch('/api/sunat/validar-xml', {
      method: 'POST',
      body: JSON.stringify({ xmlContent })
    });

    if (res.exito) {
      const bannerClass = res.esValido ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800';
      const icon = res.esValido ? 'fa-circle-check text-emerald-600' : 'fa-triangle-exclamation text-rose-600';

      resultadosEl.innerHTML = `
        <div class="p-4 rounded-xl border ${bannerClass} flex items-start gap-3">
          <i class="fa-solid ${icon} text-xl mt-0.5"></i>
          <div>
            <div class="font-bold text-sm">${res.esValido ? 'Estructura Conforme con UBL 2.1' : 'Estructura No Conforme'}</div>
            <p class="text-xs mt-0.5">${res.resumen}</p>
          </div>
        </div>

        <h4 class="font-bold text-xs uppercase tracking-wider text-slate-400 pt-2">Checklist de Reglas Técnicas</h4>
        <div class="divide-y divide-slate-100 text-xs">
          ${res.checks.map(c => `
            <div class="py-2.5 flex items-center justify-between">
              <div class="space-y-0.5">
                <span class="font-semibold text-slate-800">${c.regla}</span>
                <p class="text-[11px] text-slate-500">${c.detalle}</p>
              </div>
              <span class="px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${c.cumple ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">
                <i class="fa-solid ${c.cumple ? 'fa-check' : 'fa-xmark'}"></i> ${c.cumple ? 'CUMPLE' : 'NO CUMPLE'}
              </span>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      resultadosEl.innerHTML = `
        <div class="p-4 rounded-xl border bg-rose-50 border-rose-200 text-rose-800">
          <div class="font-bold text-sm mb-1"><i class="fa-solid fa-circle-xmark"></i> Error de Sintaxis XML</div>
          <p class="text-xs font-mono">${res.mensaje}</p>
        </div>
      `;
    }
  } catch (err) {
    resultadosEl.innerHTML = `<div class="p-4 text-rose-600 font-bold">Error en la petición: ${err.message}</div>`;
  }
}
