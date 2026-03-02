/**
 * daily-readings.js
 * Khalid & Sons Petroleum — Daily Machine Readings
 *
 * DB Strategy:
 *   → Nayi table nahi banayi.
 *   → Existing `transactions` table use hoti hai.
 *   → transaction_type = 'CashSale'
 *   → description = JSON: {fuel, machine, opening, closing, liters, rate, udhaar, testing, notes}
 *   → charges = Net Cash Sale amount (gross - udhaar)
 *   → fuel_type = 'Petrol' | 'Diesel'
 *   → entry_method = 'machine_reading'
 *   → customer_id = NULL (cash sale, koi customer nahi)
 *
 * Profit & Loss mein:
 *   → transaction_type = 'CashSale' filter karke machine readings ki income show karo
 */

(function () {
  'use strict';

  /* ─── Helpers ─────────────────────────────────────────────── */
  const el    = id => document.getElementById(id);
  const fmt   = n  => Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtL  = n  => Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const fmtD  = d  => {
    if (!d) return '—';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-PK', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  function showToast(type, title, msg) {
    const t = el('liveToast');
    if (!t) { alert(title + ': ' + msg); return; }
    el('toast-title').textContent   = title;
    el('toast-message').textContent = msg;
    t.className = 'toast ' + (
      type === 'success' ? 'bg-success text-white' :
      type === 'danger'  ? 'bg-danger text-white'  :
                           'bg-warning text-dark'
    );
    new bootstrap.Toast(t, { delay: 3500 }).show();
  }

  /* ─── State ────────────────────────────────────────────────── */
  let _rows          = [];    // loaded transactions (CashSale type)
  let _petrolCount   = 0;
  let _dieselCount   = 0;

  /* ─── Date Range ───────────────────────────────────────────── */
  function getRange() {
    const period = el('period-select').value;
    const now    = new Date();
    const Y = now.getFullYear(), M = now.getMonth(), D = now.getDate();
    const pad = v => String(v).padStart(2, '0');
    const ds  = (yr, mo, dy) => `${yr}-${pad(mo + 1)}-${pad(dy)}`;

    let from, to;
    switch (period) {
      case 'today':      from = to = ds(Y,M,D); break;
      case 'this_week':  {
        const s = new Date(Y, M, D - now.getDay());
        from = ds(s.getFullYear(), s.getMonth(), s.getDate()); to = ds(Y,M,D); break;
      }
      case 'this_month': from = ds(Y,M,1); to = ds(Y,M,D); break;
      case 'last_month': {
        const lm = new Date(Y,M,0);
        from = ds(Y,M-1,1); to = ds(lm.getFullYear(), lm.getMonth(), lm.getDate()); break;
      }
      case 'this_year':  from = ds(Y,0,1); to = ds(Y,M,D); break;
      case 'custom':
        from = el('date-from').value || ds(Y,M,1);
        to   = el('date-to').value   || ds(Y,M,D); break;
      default: from = '2020-01-01'; to = ds(Y,M,D);
    }
    return { from, to };
  }

  function setPeriodLabel() {
    const map = {
      today:'Aaj ki readings', this_week:'Is hafte ki readings',
      this_month:'Is mahine ki readings', last_month:'Pichle mahine ki readings',
      this_year:'Is saal ki readings', custom:'Custom range'
    };
    el('range-label').textContent = map[el('period-select').value] || 'Readings';
  }

  /* ─── Load Prices from Settings ────────────────────────────── */
  async function loadPrices() {
    const sb = window.supabaseClient;
    if (!sb) return;
    try {
      const { data: au } = await sb.auth.getUser();
      const uid = au?.user?.id;
      let q = sb.from('settings').select('petrol_price,diesel_price').limit(1);
      if (uid) q = q.eq('user_id', uid);
      const { data } = await q.maybeSingle();
      if (data) {
        el('add-petrol-price').value = data.petrol_price || '';
        el('add-diesel-price').value = data.diesel_price || '';
        el('petrol-price-hint').textContent = `Settings: Rs.${data.petrol_price || 0}/L`;
        el('diesel-price-hint').textContent = `Settings: Rs.${data.diesel_price || 0}/L`;
      }
    } catch (e) { /* silently ignore */ }
  }

  /* ─── Machine HTML builder ─────────────────────────────────── */
  function machineHTML(fuel, num) {
    const cls    = fuel.toLowerCase();   // 'petrol' | 'diesel'
    const prefix = fuel === 'Petrol' ? 'p' : 'd';
    return `
      <div class="machine-card" id="machine-card-${cls}-${num}">
        <div class="mc-head ${cls}">
          <i class="bi bi-droplet-fill"></i>
          ${fuel} Machine #${num}
          ${num > 1 ? `<button type="button" class="btn btn-sm btn-outline-danger ms-auto py-0"
            onclick="DR.removeMachine('${fuel}',${num})"><i class="bi bi-trash"></i></button>` : ''}
        </div>
        <div class="mc-body">
          <div class="row g-3">
            <div class="col-md-3">
              <label class="form-label small">Opening Reading</label>
              <input type="number" id="${prefix}-op-${num}" class="form-control"
                step="0.001" placeholder="0.000" oninput="DR.calcMachine('${fuel}',${num})">
            </div>
            <div class="col-md-3">
              <label class="form-label small">Closing Reading</label>
              <input type="number" id="${prefix}-cl-${num}" class="form-control"
                step="0.001" placeholder="0.000" oninput="DR.calcMachine('${fuel}',${num})">
            </div>
            <div class="col-md-3">
              <label class="form-label small">Udhaar Sale (Rs)
                <span class="text-muted" style="font-weight:normal;">— credit customers</span>
              </label>
              <input type="number" id="${prefix}-ud-${num}" class="form-control"
                step="0.01" placeholder="0.00" oninput="DR.calcMachine('${fuel}',${num})">
            </div>
            <div class="col-md-3">
              <label class="form-label small">Testing / Pump Test (L)</label>
              <input type="number" id="${prefix}-te-${num}" class="form-control"
                step="0.001" placeholder="0.000" oninput="DR.calcMachine('${fuel}',${num})">
            </div>
          </div>
          <div class="live-calc" id="calc-${cls}-${num}">
            <span class="text-muted">Reading enter karein — result yahan dikhega</span>
          </div>
        </div>
      </div>`;
  }

  function initMachines() {
    _petrolCount = 1;
    _dieselCount = 1;
    el('petrol-machines-wrap').innerHTML = machineHTML('Petrol', 1);
    el('diesel-machines-wrap').innerHTML = machineHTML('Diesel', 1);
    el('grand-total-box').style.display  = 'none';
    el('add-notes').value = '';
  }

  /* ─── Live calculation per machine ─────────────────────────── */
  window.DR = window.DR || {};

  DR.addMachine = function(fuel) {
    const wrap = el(fuel.toLowerCase() + '-machines-wrap');
    if (fuel === 'Petrol') { _petrolCount++; wrap.insertAdjacentHTML('beforeend', machineHTML('Petrol', _petrolCount)); }
    else                   { _dieselCount++; wrap.insertAdjacentHTML('beforeend', machineHTML('Diesel', _dieselCount)); }
  };

  DR.removeMachine = function(fuel, num) {
    const card = el('machine-card-' + fuel.toLowerCase() + '-' + num);
    if (card) card.remove();
    DR.recalcAll();
  };

  DR.calcMachine = function(fuel, num) {
    const p = fuel === 'Petrol' ? 'p' : 'd';
    const cls = fuel.toLowerCase();

    const op = parseFloat(el(`${p}-op-${num}`)?.value) || 0;
    const cl = parseFloat(el(`${p}-cl-${num}`)?.value) || 0;
    const ud = parseFloat(el(`${p}-ud-${num}`)?.value) || 0;
    const te = parseFloat(el(`${p}-te-${num}`)?.value) || 0;
    const pr = parseFloat(el(fuel === 'Petrol' ? 'add-petrol-price' : 'add-diesel-price')?.value) || 0;

    const liters = Math.max(0, cl - op - te);
    const gross  = liters * pr;
    const cash   = gross - ud;

    const badge = el(`calc-${cls}-${num}`);
    if (!badge) return;

    badge.innerHTML = `
      <div class="row text-center">
        <div class="col-3">
          <div class="small text-muted">Liters Bika</div>
          <div class="fw-bold text-primary">${fmtL(liters)} L</div>
        </div>
        <div class="col-3">
          <div class="small text-muted">Gross Sale</div>
          <div class="fw-bold">Rs.${fmt(gross)}</div>
        </div>
        <div class="col-3">
          <div class="small text-muted">Udhaar (−)</div>
          <div class="fw-bold text-danger">Rs.${fmt(ud)}</div>
        </div>
        <div class="col-3">
          <div class="small text-muted">✅ Cash Sale</div>
          <div class="fw-bold ${cash >= 0 ? 'profit-pos' : 'profit-neg'}">Rs.${fmt(cash)}</div>
        </div>
      </div>`;

    DR.updateGrandTotal();
  };

  DR.recalcAll = function() {
    for (let i = 1; i <= _petrolCount; i++) DR.calcMachine('Petrol', i);
    for (let i = 1; i <= _dieselCount; i++) DR.calcMachine('Diesel', i);
  };

  DR.updateGrandTotal = function() {
    let totL = 0, totG = 0, totC = 0;

    for (let i = 1; i <= _petrolCount; i++) {
      const op = parseFloat(el(`p-op-${i}`)?.value) || 0;
      const cl = parseFloat(el(`p-cl-${i}`)?.value) || 0;
      const ud = parseFloat(el(`p-ud-${i}`)?.value) || 0;
      const te = parseFloat(el(`p-te-${i}`)?.value) || 0;
      const pr = parseFloat(el('add-petrol-price')?.value) || 0;
      const li = Math.max(0, cl - op - te);
      totL += li; totG += li * pr; totC += (li * pr) - ud;
    }
    for (let i = 1; i <= _dieselCount; i++) {
      const op = parseFloat(el(`d-op-${i}`)?.value) || 0;
      const cl = parseFloat(el(`d-cl-${i}`)?.value) || 0;
      const ud = parseFloat(el(`d-ud-${i}`)?.value) || 0;
      const te = parseFloat(el(`d-te-${i}`)?.value) || 0;
      const pr = parseFloat(el('add-diesel-price')?.value) || 0;
      const li = Math.max(0, cl - op - te);
      totL += li; totG += li * pr; totC += (li * pr) - ud;
    }

    if (totG > 0) {
      el('grand-total-box').style.display = '';
      el('gt-liters').textContent = fmtL(totL) + ' L';
      el('gt-gross').textContent  = 'Rs. ' + fmt(totG);
      el('gt-cash').textContent   = 'Rs. ' + fmt(totC);
    }
  };

  /* ─── SAVE ──────────────────────────────────────────────────── */
  DR.save = async function() {
    const sb = window.supabaseClient;
    if (!sb) { showToast('danger', 'Error', 'Supabase connect nahi'); return; }

    const date = el('add-date').value;
    if (!date) { showToast('warning', 'Zaroorat!', 'Taareekh zaroor daalein'); return; }

    const petrolRate = parseFloat(el('add-petrol-price').value) || 0;
    const dieselRate = parseFloat(el('add-diesel-price').value) || 0;
    const notes      = el('add-notes').value || '';

    const { data: au } = await sb.auth.getUser().catch(() => ({ data: {} }));
    const userId = au?.user?.id || null;

    // Convert date to PKT midnight ISO string for created_at
    const createdAt = date + 'T00:00:01+05:00';

    const inserts = [];

    // Collect petrol machines
    for (let i = 1; i <= _petrolCount; i++) {
      const opEl = el(`p-op-${i}`);
      if (!opEl || opEl.value === '') continue;
      const op = parseFloat(opEl.value);
      const cl = parseFloat(el(`p-cl-${i}`)?.value);
      if (isNaN(op) || isNaN(cl)) continue;
      if (cl < op) {
        showToast('warning', 'Error', `Petrol Machine ${i}: Closing reading opening se kam nahi ho sakti`);
        return;
      }
      const te    = parseFloat(el(`p-te-${i}`)?.value) || 0;
      const ud    = parseFloat(el(`p-ud-${i}`)?.value) || 0;
      const liters = Math.max(0, cl - op - te);
      const gross  = liters * petrolRate;
      const cash   = gross - ud;

      inserts.push({
        transaction_type: 'CashSale',
        fuel_type:        'Petrol',
        entry_method:     'machine_reading',
        charges:          parseFloat(cash.toFixed(2)),
        description:      JSON.stringify({
          machine: i,
          opening: op, closing: cl,
          liters:  parseFloat(liters.toFixed(3)),
          rate:    petrolRate,
          gross:   parseFloat(gross.toFixed(2)),
          udhaar:  ud,
          testing: te,
          notes
        }),
        payment_method: 'Cash',
        created_at:     createdAt,
        user_id:        userId
      });
    }

    // Collect diesel machines
    for (let i = 1; i <= _dieselCount; i++) {
      const opEl = el(`d-op-${i}`);
      if (!opEl || opEl.value === '') continue;
      const op = parseFloat(opEl.value);
      const cl = parseFloat(el(`d-cl-${i}`)?.value);
      if (isNaN(op) || isNaN(cl)) continue;
      if (cl < op) {
        showToast('warning', 'Error', `Diesel Machine ${i}: Closing reading opening se kam nahi ho sakti`);
        return;
      }
      const te    = parseFloat(el(`d-te-${i}`)?.value) || 0;
      const ud    = parseFloat(el(`d-ud-${i}`)?.value) || 0;
      const liters = Math.max(0, cl - op - te);
      const gross  = liters * dieselRate;
      const cash   = gross - ud;

      inserts.push({
        transaction_type: 'CashSale',
        fuel_type:        'Diesel',
        entry_method:     'machine_reading',
        charges:          parseFloat(cash.toFixed(2)),
        description:      JSON.stringify({
          machine: i,
          opening: op, closing: cl,
          liters:  parseFloat(liters.toFixed(3)),
          rate:    dieselRate,
          gross:   parseFloat(gross.toFixed(2)),
          udhaar:  ud,
          testing: te,
          notes
        }),
        payment_method: 'Cash',
        created_at:     createdAt,
        user_id:        userId
      });
    }

    if (!inserts.length) {
      showToast('warning', 'Zaroorat!', 'Kam az kam ek machine ki opening aur closing reading daalein');
      return;
    }

    try {
      const { error } = await sb.from('transactions').insert(inserts);
      if (error) throw error;

      showToast('success', 'Saved! ✅', `${inserts.length} machine(s) ki reading save ho gayi`);
      bootstrap.Modal.getInstance(el('addReadingModal'))?.hide();
      initMachines();
      DR.load();
    } catch (e) {
      showToast('danger', 'Error', e.message);
    }
  };

  /* ─── LOAD ──────────────────────────────────────────────────── */
  DR.load = async function() {
    const sb = window.supabaseClient;
    if (!sb) { setTimeout(DR.load, 200); return; }

    setPeriodLabel();
    const { from, to } = getRange();
    const fuelFilter   = el('filter-fuel').value;

    el('readings-tbody').innerHTML = `<tr><td colspan="11" class="text-center py-4 text-muted">
      <div class="spinner-border spinner-border-sm me-2"></div>Loading...
    </td></tr>`;

    try {
      const { data: au } = await sb.auth.getUser().catch(() => ({ data: {} }));
      const uid = au?.user?.id || null;

      let q = sb.from('transactions')
        .select('id, transaction_type, fuel_type, charges, description, created_at, entry_method')
        .eq('transaction_type', 'CashSale')
        .eq('entry_method', 'machine_reading')
        .gte('created_at', from + 'T00:00:00+05:00')
        .lte('created_at', to   + 'T23:59:59+05:00')
        .order('created_at', { ascending: false });

      if (uid)        q = q.eq('user_id', uid);
      if (fuelFilter) q = q.eq('fuel_type', fuelFilter);

      const { data, error } = await q;
      if (error) throw error;

      _rows = (data || []).map(r => {
        let meta = {};
        try { meta = JSON.parse(r.description || '{}'); } catch (e) {}
        return { ...r, meta };
      });

      renderTable();
      renderDailySummary();
      renderSummaryCards();

    } catch (e) {
      el('readings-tbody').innerHTML = `<tr><td colspan="11" class="text-center py-3 text-danger">
        Error: ${e.message}
      </td></tr>`;
    }
  };

  /* ─── RENDER TABLE ──────────────────────────────────────────── */
  function renderTable() {
    el('table-count').textContent = `${_rows.length} records`;

    if (!_rows.length) {
      el('readings-tbody').innerHTML = `<tr><td colspan="11" class="text-center py-4 text-muted">
        Is period mein koi reading nahi — "Nai Reading Darj Karein" se add karein
      </td></tr>`;
      el('readings-tfoot').innerHTML = '';
      return;
    }

    let totL = 0, totG = 0, totU = 0, totC = 0;

    el('readings-tbody').innerHTML = _rows.map(r => {
      const m     = r.meta;
      const liters = m.liters  || 0;
      const gross  = m.gross   || 0;
      const udhaar = m.udhaar  || 0;
      const cash   = parseFloat(r.charges) || 0;
      const date   = r.created_at ? r.created_at.split('T')[0] : '';

      totL += liters; totG += gross; totU += udhaar; totC += cash;

      const fBadge = r.fuel_type === 'Petrol'
        ? '<span class="badge" style="background:#d4edda;color:#155724;">Petrol</span>'
        : '<span class="badge" style="background:#fff3cd;color:#856404;">Diesel</span>';

      return `<tr>
        <td><strong>${fmtD(date)}</strong></td>
        <td>${fBadge}</td>
        <td>M#${m.machine || 1}</td>
        <td class="text-end">${fmtL(m.opening || 0)}</td>
        <td class="text-end">${fmtL(m.closing || 0)}</td>
        <td class="text-end text-primary fw-semibold">${fmtL(liters)} L</td>
        <td class="text-end">Rs.${fmt(m.rate || 0)}</td>
        <td class="text-end">Rs.${fmt(gross)}</td>
        <td class="text-end text-danger">Rs.${fmt(udhaar)}</td>
        <td class="text-end fw-bold ${cash >= 0 ? 'profit-pos' : 'profit-neg'}">Rs.${fmt(cash)}</td>
        <td class="text-center no-print">
          <button class="btn btn-sm btn-outline-warning me-1" onclick="DR.openEdit(${r.id})">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="DR.del(${r.id})">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>`;
    }).join('');

    el('readings-tfoot').innerHTML = `<tr class="tfoot-total">
      <td colspan="5"><strong>TOTAL</strong></td>
      <td class="text-end text-primary fw-bold">${fmtL(totL)} L</td>
      <td></td>
      <td class="text-end fw-bold">Rs.${fmt(totG)}</td>
      <td class="text-end text-danger fw-bold">Rs.${fmt(totU)}</td>
      <td class="text-end fw-bold ${totC >= 0 ? 'profit-pos' : 'profit-neg'}">Rs.${fmt(totC)}</td>
      <td class="no-print"></td>
    </tr>`;
  }

  /* ─── RENDER DAILY SUMMARY ──────────────────────────────────── */
  function renderDailySummary() {
    const days = {};

    _rows.forEach(r => {
      const d = r.created_at ? r.created_at.split('T')[0] : '?';
      if (!days[d]) days[d] = { petrolL: 0, dieselL: 0, petrolCash: 0, dieselCash: 0 };
      const m    = r.meta;
      const cash = parseFloat(r.charges) || 0;
      if (r.fuel_type === 'Petrol') {
        days[d].petrolL    += m.liters || 0;
        days[d].petrolCash += cash;
      } else {
        days[d].dieselL    += m.liters || 0;
        days[d].dieselCash += cash;
      }
    });

    const keys = Object.keys(days).sort().reverse();

    if (!keys.length) {
      el('daily-tbody').innerHTML = '<tr><td colspan="7" class="text-center py-3 text-muted">Koi data nahi</td></tr>';
      return;
    }

    el('daily-tbody').innerHTML = keys.map(d => {
      const day   = days[d];
      const total = day.petrolCash + day.dieselCash;
      const badge = total >= 0
        ? '<span class="badge" style="background:#d4edda;color:#155724;">✅ OK</span>'
        : '<span class="badge" style="background:#f8d7da;color:#721c24;">⚠ Check</span>';

      return `<tr>
        <td><strong>${fmtD(d)}</strong></td>
        <td class="text-end text-success">${fmtL(day.petrolL)} L</td>
        <td class="text-end" style="color:#856404">${fmtL(day.dieselL)} L</td>
        <td class="text-end text-success">Rs.${fmt(day.petrolCash)}</td>
        <td class="text-end" style="color:#856404">Rs.${fmt(day.dieselCash)}</td>
        <td class="text-end fw-bold ${total >= 0 ? 'profit-pos' : 'profit-neg'}">Rs.${fmt(total)}</td>
        <td class="text-center">${badge}</td>
      </tr>`;
    }).join('');
  }

  /* ─── RENDER SUMMARY CARDS ──────────────────────────────────── */
  function renderSummaryCards() {
    let totL = 0, totG = 0, totU = 0, totC = 0;
    _rows.forEach(r => {
      totL += r.meta.liters  || 0;
      totG += r.meta.gross   || 0;
      totU += r.meta.udhaar  || 0;
      totC += parseFloat(r.charges) || 0;
    });
    el('sum-cash').textContent   = 'Rs. ' + fmt(totC);
    el('sum-liters').textContent = fmtL(totL) + ' L';
    el('sum-udhaar').textContent = 'Rs. ' + fmt(totU);
    el('sum-gross').textContent  = 'Rs. ' + fmt(totG);
  }

  /* ─── EDIT ──────────────────────────────────────────────────── */
  DR.openEdit = function(id) {
    const r = _rows.find(x => x.id === id);
    if (!r) return;
    const m = r.meta;
    el('edit-txn-id').value  = id;
    el('edit-date').value    = r.created_at ? r.created_at.split('T')[0] : '';
    el('edit-rate').value    = m.rate    || 0;
    el('edit-opening').value = m.opening || 0;
    el('edit-closing').value = m.closing || 0;
    el('edit-udhaar').value  = m.udhaar  || 0;
    el('edit-testing').value = m.testing || 0;
    DR.calcEditBadge();
    new bootstrap.Modal(el('editReadingModal')).show();
  };

  DR.calcEditBadge = function() {
    const op = parseFloat(el('edit-opening').value) || 0;
    const cl = parseFloat(el('edit-closing').value) || 0;
    const ud = parseFloat(el('edit-udhaar').value)  || 0;
    const te = parseFloat(el('edit-testing').value) || 0;
    const pr = parseFloat(el('edit-rate').value)    || 0;
    const li = Math.max(0, cl - op - te);
    const gr = li * pr;
    const ca = gr - ud;

    el('edit-calc-badge').innerHTML = `
      <strong>${fmtL(li)} L</strong> bika &nbsp;|&nbsp;
      Gross: <strong>Rs.${fmt(gr)}</strong> &nbsp;|&nbsp;
      Udhaar: <span class="text-danger">Rs.${fmt(ud)}</span> &nbsp;|&nbsp;
      <strong class="${ca >= 0 ? 'profit-pos' : 'profit-neg'}">Cash Sale: Rs.${fmt(ca)}</strong>`;
  };

  DR.update = async function() {
    const sb = window.supabaseClient;
    const id = parseInt(el('edit-txn-id').value);
    if (!sb || !id) return;

    const op = parseFloat(el('edit-opening').value) || 0;
    const cl = parseFloat(el('edit-closing').value) || 0;
    const ud = parseFloat(el('edit-udhaar').value)  || 0;
    const te = parseFloat(el('edit-testing').value) || 0;
    const pr = parseFloat(el('edit-rate').value)    || 0;

    if (cl < op) { showToast('warning', 'Error', 'Closing reading opening se kam nahi ho sakti'); return; }

    const li   = Math.max(0, cl - op - te);
    const gr   = li * pr;
    const cash = gr - ud;
    const date = el('edit-date').value;

    // Get existing row to preserve fuel_type and other fields
    const orig = _rows.find(r => r.id === id);
    const origMeta = orig?.meta || {};

    const newMeta = {
      ...origMeta,
      opening: op, closing: cl,
      liters:  parseFloat(li.toFixed(3)),
      rate:    pr,
      gross:   parseFloat(gr.toFixed(2)),
      udhaar:  ud,
      testing: te
    };

    try {
      const { error } = await sb.from('transactions').update({
        charges:     parseFloat(cash.toFixed(2)),
        description: JSON.stringify(newMeta),
        created_at:  date + 'T00:00:01+05:00'
      }).eq('id', id);
      if (error) throw error;

      showToast('success', 'Updated ✅', 'Reading update ho gayi');
      bootstrap.Modal.getInstance(el('editReadingModal'))?.hide();
      DR.load();
    } catch (e) {
      showToast('danger', 'Error', e.message);
    }
  };

  /* ─── DELETE ────────────────────────────────────────────────── */
  DR.del = async function(id) {
    if (!confirm('Yeh reading delete karein?')) return;
    const sb = window.supabaseClient;
    try {
      const { error } = await sb.from('transactions').delete().eq('id', id);
      if (error) throw error;
      showToast('success', 'Deleted', 'Reading delete ho gayi');
      DR.load();
    } catch (e) {
      showToast('danger', 'Error', e.message);
    }
  };

  /* ─── INIT ──────────────────────────────────────────────────── */
  function tryInit() {
    if (!window.supabaseClient) { setTimeout(tryInit, 200); return; }
    initMachines();
    loadPrices();
    DR.load();
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Set today's date
    el('add-date').value  = new Date().toISOString().split('T')[0];
    const now = new Date();
    el('date-from').value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    el('date-to').value   = new Date().toISOString().split('T')[0];

    // Period select toggle
    el('period-select').addEventListener('change', function() {
      el('custom-range').style.display = this.value === 'custom' ? '' : 'none';
      if (this.value !== 'custom') DR.load();
    });

    // Reload prices when modal opens
    el('addReadingModal')?.addEventListener('show.bs.modal', () => {
      el('add-date').value = new Date().toISOString().split('T')[0];
      loadPrices();
    });

    tryInit();
  });

})();