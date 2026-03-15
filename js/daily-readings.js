// =============================================
// Daily Readings JS — Khalid & Sons Petroleum
// Enhanced: Online/Account Payment option
// Per-user data isolation
// =============================================

'use strict';

let _petrolPrice = 0;
let _dieselPrice = 0;
let _readings    = [];

async function loadFuelPrices() {
  const uid = window._currentUserId;
  if (!uid) return;
  try {
    const { data } = await supabase.from('settings')
      .select('petrol_price,diesel_price,price_history')
      .eq('user_id', uid).maybeSingle();
    if (data) {
      if (data.price_history?.length) {
        const sorted = [...data.price_history].sort((a,b) => (b.date||'').localeCompare(a.date||''));
        _petrolPrice = parseFloat(sorted[0].petrol) || 0;
        _dieselPrice = parseFloat(sorted[0].diesel) || 0;
      } else {
        _petrolPrice = parseFloat(data.petrol_price) || 0;
        _dieselPrice = parseFloat(data.diesel_price) || 0;
      }
      const pEl = document.getElementById('petrolPrice');
      const dEl = document.getElementById('dieselPrice');
      if (pEl && !pEl.value) pEl.value = _petrolPrice || '';
      if (dEl && !dEl.value) dEl.value = _dieselPrice || '';
    }
  } catch(e) { console.warn('loadFuelPrices:', e.message); }
}

function renderMachines() {
  const n  = parseInt(document.getElementById('numMachines')?.value) || 2;
  const container = document.getElementById('machines-container');
  if (!container) return;

  let html = '';
  for (let i = 1; i <= n; i++) {
    const fuel    = i % 2 === 0 ? 'Diesel' : 'Petrol';
    const fuelLbl = fuel === 'Petrol'
      ? '<span class="badge bg-success me-2">Petrol</span>'
      : '<span class="badge bg-warning text-dark me-2">Diesel</span>';
    const prefix  = fuel === 'Petrol' ? 'p' : 'd';

    html += `
    <div class="col-md-6">
      <div class="machine-card">
        <div class="machine-title">${fuelLbl}Pump #${i}</div>
        <div class="row g-2">
          <div class="col-6">
            <label class="form-label small fw-bold mb-1">Opening Meter</label>
            <input type="number" id="op-${prefix}-${i}" class="form-control form-control-sm"
                   placeholder="0.000" step="0.001" oninput="calcMachine(${i},'${fuel}')"/>
          </div>
          <div class="col-6">
            <label class="form-label small fw-bold mb-1">Closing Meter</label>
            <input type="number" id="cl-${prefix}-${i}" class="form-control form-control-sm"
                   placeholder="0.000" step="0.001" oninput="calcMachine(${i},'${fuel}')"/>
          </div>
          <div class="col-6">
            <label class="form-label small fw-bold mb-1 text-danger">Udhaar (Rs.)</label>
            <input type="number" id="ud-${prefix}-${i}" class="form-control form-control-sm"
                   placeholder="0" oninput="calcMachine(${i},'${fuel}')"/>
          </div>
          <div class="col-6">
            <label class="form-label small fw-bold mb-1 text-info">
              <i class="bi bi-bank me-1"></i>Online/Acct (Rs.)
            </label>
            <input type="number" id="on-${prefix}-${i}" class="form-control form-control-sm border-info"
                   placeholder="0" oninput="calcMachine(${i},'${fuel}')"/>
          </div>
          <div class="col-12">
            <label class="form-label small fw-bold mb-1">Payment Method</label>
            <select id="pm-${prefix}-${i}" class="form-select form-select-sm"
                    onchange="calcMachine(${i},'${fuel}')">
              <option value="Cash">Cash</option>
              <option value="Online">Online/Account</option>
              <option value="Bank">Bank Transfer</option>
              <option value="Mixed">Mixed</option>
            </select>
          </div>
        </div>
        <div class="live-calc mt-2" id="lc-${i}">
          <span class="text-muted small">Meter enter karein...</span>
        </div>
      </div>
    </div>`;
  }
  container.innerHTML = html;
  recalcAll();
}

function calcMachine(num, fuel) {
  const prefix  = fuel === 'Petrol' ? 'p' : 'd';
  const price   = fuel === 'Petrol'
    ? (parseFloat(document.getElementById('petrolPrice')?.value) || _petrolPrice)
    : (parseFloat(document.getElementById('dieselPrice')?.value) || _dieselPrice);

  const op     = parseFloat(document.getElementById('op-'+prefix+'-'+num)?.value) || 0;
  const cl     = parseFloat(document.getElementById('cl-'+prefix+'-'+num)?.value) || 0;
  const udhaar = parseFloat(document.getElementById('ud-'+prefix+'-'+num)?.value) || 0;
  const online = parseFloat(document.getElementById('on-'+prefix+'-'+num)?.value) || 0;
  const pm     = document.getElementById('pm-'+prefix+'-'+num)?.value || 'Cash';

  const liters  = Math.max(0, cl - op);
  const gross   = liters * price;
  const netCash = gross - udhaar - online;

  const pmColors = { Cash:'pay-cash', Online:'pay-online', Bank:'pay-bank', Mixed:'pay-mixed' };
  const pmBadge  = '<span class="pay-badge '+(pmColors[pm]||'pay-cash')+'">'+pm+'</span>';

  const lcEl = document.getElementById('lc-'+num);
  if (lcEl) {
    lcEl.innerHTML =
      '<div class="lc-row"><span>Liters:</span><span class="fw-bold">'+liters.toFixed(3)+' L</span></div>' +
      '<div class="lc-row"><span>Gross ('+liters.toFixed(2)+'L x Rs.'+price+'):</span><span class="fw-bold">Rs. '+formatNumber(gross)+'</span></div>' +
      '<div class="lc-row text-danger"><span>Udhaar (-):</span><span>Rs. '+formatNumber(udhaar)+'</span></div>' +
      '<div class="lc-row text-info"><span>Online/Acct (-):</span><span>Rs. '+formatNumber(online)+'</span></div>' +
      '<div class="lc-row lc-total '+(netCash<0?'text-danger':'text-success')+'"><span>Net Cash:</span><span>Rs. '+formatNumber(netCash)+' '+pmBadge+'</span></div>';
  }
  recalcAll();
}

function recalcAll() {
  const n       = parseInt(document.getElementById('numMachines')?.value) || 2;
  const udhaarG = parseFloat(document.getElementById('globalUdhaar')?.value) || 0;
  let totalLiters=0, totalGross=0, totalOnline=0, totalUdhaar=udhaarG;

  for (let i = 1; i <= n; i++) {
    const fuel   = i % 2 === 0 ? 'Diesel' : 'Petrol';
    const prefix = fuel === 'Petrol' ? 'p' : 'd';
    const price  = fuel === 'Petrol'
      ? (parseFloat(document.getElementById('petrolPrice')?.value) || _petrolPrice)
      : (parseFloat(document.getElementById('dieselPrice')?.value) || _dieselPrice);

    const op = parseFloat(document.getElementById('op-'+prefix+'-'+i)?.value) || 0;
    const cl = parseFloat(document.getElementById('cl-'+prefix+'-'+i)?.value) || 0;
    const ud = parseFloat(document.getElementById('ud-'+prefix+'-'+i)?.value) || 0;
    const on = parseFloat(document.getElementById('on-'+prefix+'-'+i)?.value) || 0;

    const liters = Math.max(0, cl - op);
    totalLiters += liters;
    totalGross  += liters * price;
    totalUdhaar += ud;
    totalOnline += on;
  }

  const totalNet = totalGross - totalUdhaar - totalOnline;
  const setEl = (id, val) => { const e=document.getElementById(id); if(e) e.textContent=val; };
  setEl('gt-liters', totalLiters.toFixed(2)+' L');
  setEl('gt-gross',  'Rs. '+formatNumber(totalGross));
  setEl('gt-online', 'Rs. '+formatNumber(totalOnline));
  setEl('gt-net',    'Rs. '+formatNumber(totalNet));
  const netEl = document.getElementById('gt-net');
  if (netEl) netEl.style.color = totalNet >= 0 ? '#a8e6cf' : '#ffb3b3';
}

function showReadingForm() {
  const sec = document.getElementById('readings-section');
  if (sec) {
    sec.style.display = 'block';
    sec.scrollIntoView({ behavior:'smooth', block:'start' });
    renderMachines();
  }
}

async function saveReadings() {
  const uid = window._currentUserId;
  if (!uid) { showToast('Not logged in', 'warning'); return; }
  const n       = parseInt(document.getElementById('numMachines')?.value) || 2;
  const date    = document.getElementById('readingDate')?.value || new Date().toISOString().split('T')[0];
  const udhaarG = parseFloat(document.getElementById('globalUdhaar')?.value) || 0;
  const rows    = [];

  for (let i = 1; i <= n; i++) {
    const fuel   = i % 2 === 0 ? 'Diesel' : 'Petrol';
    const prefix = fuel === 'Petrol' ? 'p' : 'd';
    const price  = fuel === 'Petrol'
      ? (parseFloat(document.getElementById('petrolPrice')?.value) || _petrolPrice)
      : (parseFloat(document.getElementById('dieselPrice')?.value) || _dieselPrice);

    const op     = parseFloat(document.getElementById('op-'+prefix+'-'+i)?.value) || 0;
    const cl     = parseFloat(document.getElementById('cl-'+prefix+'-'+i)?.value) || 0;
    const udhaar = parseFloat(document.getElementById('ud-'+prefix+'-'+i)?.value) || 0;
    const online = parseFloat(document.getElementById('on-'+prefix+'-'+i)?.value) || 0;
    const pm     = document.getElementById('pm-'+prefix+'-'+i)?.value || 'Cash';

    if (!op && !cl) continue;

    const liters      = Math.max(0, cl - op);
    const gross       = liters * price;
    const machUdhaar  = i === 1 ? udhaar + udhaarG : udhaar;
    const netCash     = gross - machUdhaar - online;

    rows.push({
      user_id:          uid,
      transaction_type: 'CashSale',
      charges:          Math.max(0, netCash),
      liters,
      unit_price:       price,
      fuel_type:        fuel,
      payment_method:   pm,
      entry_method:     'machine_reading',
      description: JSON.stringify({
        machine:        'Pump #'+i,
        opening_meter:  op,
        closing_meter:  cl,
        liters:         liters.toFixed(3),
        gross_amount:   gross.toFixed(2),
        udhaar:         machUdhaar,
        online_payment: online,
        pay_method:     pm,
        reading_date:   date
      }),
      created_at: date+'T12:00:00'
    });
  }

  if (!rows.length) { showToast('Koi reading enter nahi ki', 'warning'); return; }

  try {
    const { error } = await supabase.from('transactions').insert(rows);
    if (error) throw error;
    showToast(rows.length+' machine reading(s) save ho gayi!', 'success');
    document.getElementById('globalUdhaar').value = '';
    renderMachines();
    await loadReadings();
    const sec = document.getElementById('readings-section');
    if (sec) sec.style.display = 'none';
  } catch(e) {
    showToast('Error: '+e.message, 'danger');
    console.error(e);
  }
}

async function loadReadings() {
  const uid  = window._currentUserId;
  if (!uid) return;
  const date = document.getElementById('readingDate')?.value;

  try {
    let query = supabase.from('transactions').select('*')
      .eq('user_id', uid).eq('entry_method','machine_reading')
      .order('created_at', { ascending: false });

    if (date) {
      query = query.gte('created_at', date+'T00:00:00').lte('created_at', date+'T23:59:59');
    } else {
      const d30 = new Date(Date.now()-30*24*60*60*1000).toISOString().split('T')[0];
      query = query.gte('created_at', d30+'T00:00:00');
    }

    const { data, error } = await query;
    if (error) throw error;
    _readings = data || [];
    renderReadingsTable(_readings);
  } catch(e) {
    console.error('loadReadings error:', e);
    showToast('Error loading readings: '+e.message, 'danger');
  }
}

function renderReadingsTable(rows) {
  const tbody = document.getElementById('readings-tbody');
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="12" class="text-center py-4 text-muted"><i class="bi bi-inbox me-2"></i>Koi readings nahi mili is date ke liye</td></tr>';
    return;
  }

  const pmColors = { Cash:'pay-cash', Online:'pay-online', Bank:'pay-bank', Mixed:'pay-mixed' };

  tbody.innerHTML = rows.map(r => {
    let desc = {};
    try { desc = JSON.parse(r.description||'{}'); } catch(e){}
    const date   = new Date(r.created_at).toLocaleDateString('en-PK');
    const liters = parseFloat(desc.liters||r.liters||0);
    const gross  = parseFloat(desc.gross_amount||0) || (liters*(r.unit_price||0));
    const online = parseFloat(desc.online_payment||0);
    const udhaar = parseFloat(desc.udhaar||0);
    const net    = parseFloat(r.charges||0);
    const pm     = r.payment_method||'Cash';
    const pmBadge = '<span class="pay-badge '+(pmColors[pm]||'pay-cash')+'">'+pm+'</span>';
    const fuelBadge = r.fuel_type==='Petrol'
      ? '<span class="badge bg-success">Petrol</span>'
      : '<span class="badge bg-warning text-dark">Diesel</span>';

    return '<tr>' +
      '<td>'+date+'</td>' +
      '<td>'+(desc.machine||'—')+'</td>' +
      '<td>'+fuelBadge+'</td>' +
      '<td class="text-muted">'+(desc.opening_meter||0)+'</td>' +
      '<td class="text-muted">'+(desc.closing_meter||0)+'</td>' +
      '<td class="fw-bold">'+liters.toFixed(2)+' L</td>' +
      '<td>Rs. '+formatNumber(gross)+'</td>' +
      '<td class="text-info">'+(online>0?'Rs. '+formatNumber(online):'—')+'</td>' +
      '<td class="text-danger">'+(udhaar>0?'Rs. '+formatNumber(udhaar):'—')+'</td>' +
      '<td class="fw-bold text-success">Rs. '+formatNumber(net)+'</td>' +
      '<td>'+pmBadge+'</td>' +
      '<td>' +
        '<button class="btn btn-sm btn-outline-primary me-1" onclick="openEditReading(\''+r.id+'\')"><i class="bi bi-pencil"></i></button>' +
        '<button class="btn btn-sm btn-outline-danger" onclick="deleteReading(\''+r.id+'\')"><i class="bi bi-trash"></i></button>' +
      '</td>' +
    '</tr>';
  }).join('');
}

function openEditReading(id) {
  const row = _readings.find(r => r.id === id);
  if (!row) return;
  let desc = {};
  try { desc = JSON.parse(row.description||'{}'); } catch(e){}

  document.getElementById('edit-id').value        = id;
  document.getElementById('edit-opening').value   = desc.opening_meter || 0;
  document.getElementById('edit-closing').value   = desc.closing_meter || 0;
  document.getElementById('edit-online').value    = desc.online_payment || 0;
  document.getElementById('edit-udhaar').value    = desc.udhaar || 0;
  document.getElementById('edit-paymethod').value = row.payment_method || 'Cash';
  document.getElementById('edit-notes').value     = desc.note || '';
  new bootstrap.Modal(document.getElementById('editModal')).show();
}

async function updateReading() {
  const id     = document.getElementById('edit-id').value;
  const op     = parseFloat(document.getElementById('edit-opening').value) || 0;
  const cl     = parseFloat(document.getElementById('edit-closing').value) || 0;
  const online = parseFloat(document.getElementById('edit-online').value)  || 0;
  const udhaar = parseFloat(document.getElementById('edit-udhaar').value)  || 0;
  const pm     = document.getElementById('edit-paymethod').value;
  const notes  = document.getElementById('edit-notes').value.trim();

  const row = _readings.find(r => r.id === id);
  if (!row) return;

  const price   = row.unit_price || 0;
  const liters  = Math.max(0, cl - op);
  const gross   = liters * price;
  const netCash = gross - udhaar - online;
  let desc = {};
  try { desc = JSON.parse(row.description||'{}'); } catch(e){}

  try {
    const { error } = await supabase.from('transactions').update({
      liters,
      charges:        Math.max(0, netCash),
      payment_method: pm,
      description:    JSON.stringify({ ...desc, opening_meter:op, closing_meter:cl,
        liters:liters.toFixed(3), gross_amount:gross.toFixed(2),
        udhaar, online_payment:online, pay_method:pm, note:notes })
    }).eq('id', id).eq('user_id', window._currentUserId);
    if (error) throw error;
    showToast('Reading updated!', 'success');
    bootstrap.Modal.getInstance(document.getElementById('editModal'))?.hide();
    await loadReadings();
  } catch(e) {
    showToast('Error: '+e.message, 'danger');
  }
}

async function deleteReading(id) {
  if (!confirm('Yeh reading delete karein?')) return;
  try {
    const { error } = await supabase.from('transactions').delete()
      .eq('id', id).eq('user_id', window._currentUserId);
    if (error) throw error;
    showToast('Reading deleted', 'success');
    await loadReadings();
  } catch(e) {
    showToast('Error: '+e.message, 'danger');
  }
}
