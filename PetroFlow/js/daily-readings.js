/**
 * daily-readings.js  v3.0
 * Khalid & Sons Petroleum — Daily Machine Readings
 *
 * ─── DB THEORY (transactions-COMPLETE-v5.js se samjha) ───────────
 *   transactions table key fields:
 *     charges    = amount (NOT NULL) — yahan cash sale store hogi
 *     amount     = same as charges (NOT NULL constraint)
 *     liters     = total liters sold
 *     unit_price = rate per liter
 *     fuel_type  = 'Petrol' | 'Diesel'
 *     transaction_type = 'CashSale'
 *     entry_method     = 'machine_reading'
 *     description      = JSON string with full reading details
 *
 *   settings table:
 *     price_history = JSONB array [{date, petrol, diesel, updated_by}]
 *     Sabse latest entry sorted by date desc = current price
 *     (settings-page.js ka logic exactly yahi hai)
 *
 *   Credit transactions (customer udhaar):
 *     transaction_type = 'Credit', fuel_type = 'Petrol'/'Diesel'
 *     charges = sale amount
 *     (transactions-COMPLETE-v5.js handleNewSale line 2628-2633)
 *
 * ─── SUMMARY CARDS LOGIC ─────────────────────────────────────────
 *   Machine Reading page pe summary cards:
 *     GROSS REVENUE  = sum of (liters * rate) for all CashSale readings
 *     UDHAAR SALE    = sum of udhaar stored in description JSON
 *     CASH SALE (NET) = sum of charges (gross - udhaar)
 *     TOTAL LITERS   = sum of liters field
 *
 *   NOTE: Customer Credit transactions (jab transaction page pe sale enter
 *   hoti hai) woh alag table mein hain. Daily readings page pe sirf
 *   machine reading se calculated udhaar dikhti hai jo user khud darj karta hai.
 */

(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════
     HELPERS
  ═══════════════════════════════════════════════════════════ */
  const el   = id => document.getElementById(id);
  const fmt  = n  => Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtL = n  => Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const fmtD = d  => {
    if (!d) return '—';
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString('en-PK', {
        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
      });
    } catch(e) { return d; }
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

  /* ═══════════════════════════════════════════════════════════
     STATE
  ═══════════════════════════════════════════════════════════ */
  let _rows        = [];
  let _petrolCount = 0;
  let _dieselCount = 0;

  /* ═══════════════════════════════════════════════════════════
     SETTINGS — PRICE HISTORY (exact same logic as settings-page.js)
     price_history JSONB array: [{date, petrol, diesel, updated_by}]
     Sort by date desc → index 0 = latest price
  ═══════════════════════════════════════════════════════════ */
  async function loadPrices() {
    const sb = window.supabaseClient;
    if (!sb) return;
    try {
      // Load all settings, no user_id filter (settings-page.js bhi yahi karta hai)
      const { data, error } = await sb
        .from('settings')
        .select('price_history, petrol_price, diesel_price')
        .limit(1)
        .maybeSingle();

      if (error) { console.warn('Settings load error:', error.message); return; }
      if (!data) { console.warn('No settings row found'); return; }

      let petrolPrice = 0;
      let dieselPrice = 0;

      // price_history JSONB array se latest price nikalo (settings-page.js ka exact logic)
      if (data.price_history && data.price_history.length > 0) {
        const today = new Date();
        const sorted = [...data.price_history].map(h => ({...h, start: h.start_date || h.date, end: h.end_date || ''}))
          .filter(h => h.start)
          .sort((a, b) => new Date(b.start) - new Date(a.start));
        const latest = sorted.find(h => new Date(h.start) <= today && (!h.end || today <= new Date(h.end + 'T23:59:59'))) || sorted[0];
        petrolPrice = parseFloat(latest.petrol) || 0;
        dieselPrice = parseFloat(latest.diesel) || 0;
        console.log('Prices from price_history:', latest.start, latest.end ? ('to '+latest.end) : 'current', '→ Petrol:', petrolPrice, 'Diesel:', dieselPrice);
      }
      // Fallback: direct columns (purani entries ke liye)
      else if (data.petrol_price || data.diesel_price) {
        petrolPrice = parseFloat(data.petrol_price) || 0;
        dieselPrice = parseFloat(data.diesel_price) || 0;
        console.log('Prices from columns:', petrolPrice, dieselPrice);
      }

      if (el('add-petrol-price')) el('add-petrol-price').value = petrolPrice || '';
      if (el('add-diesel-price')) el('add-diesel-price').value = dieselPrice || '';
      if (el('petrol-price-hint')) el('petrol-price-hint').textContent = `Settings: Rs.${petrolPrice}/L`;
      if (el('diesel-price-hint')) el('diesel-price-hint').textContent = `Settings: Rs.${dieselPrice}/L`;

    } catch (e) {
      console.warn('loadPrices exception:', e.message);
    }
  }

  /* ═══════════════════════════════════════════════════════════
     DATE RANGE
  ═══════════════════════════════════════════════════════════ */
  function getRange() {
    const period = el('period-select')?.value || 'this_month';
    const now    = new Date();
    const Y = now.getFullYear(), M = now.getMonth(), D = now.getDate();
    const pad = v => String(v).padStart(2, '0');
    const ds  = (yr, mo, dy) => `${yr}-${pad(mo + 1)}-${pad(dy)}`;

    let from, to;
    switch (period) {
      case 'today':
        from = to = ds(Y, M, D); break;
      case 'this_week': {
        const s = new Date(Y, M, D - now.getDay());
        from = ds(s.getFullYear(), s.getMonth(), s.getDate());
        to   = ds(Y, M, D); break;
      }
      case 'this_month':
        from = ds(Y, M, 1); to = ds(Y, M, D); break;
      case 'last_month': {
        const lm = new Date(Y, M, 0);
        from = ds(Y, M - 1, 1);
        to   = ds(lm.getFullYear(), lm.getMonth(), lm.getDate()); break;
      }
      case 'this_year':
        from = ds(Y, 0, 1); to = ds(Y, M, D); break;
      case 'since_april':
        from = `${Y}-04-01`; to = ds(Y, M, D); break;
      case 'all_time':
        from = '2020-01-01'; to = ds(Y, M, D); break;
      case 'custom':
        from = el('date-from')?.value || ds(Y, M, 1);
        to   = el('date-to')?.value   || ds(Y, M, D); break;
      default:
        from = '2020-01-01'; to = ds(Y, M, D);
    }
    return { from, to };
  }

  function setPeriodLabel() {
    const map = {
      today: 'Aaj ki readings',
      this_week: 'Is hafte ki readings',
      this_month:   'Is mahine ki readings',
      last_month:   'Pichle mahine ki readings',
      since_april:  'April 2026 se ab tak ki readings',
      all_time:     'Tamam entries',
      this_year: 'Is saal ki readings',
      custom: 'Custom range'
    };
    const lbl = el('range-label');
    if (lbl) lbl.textContent = map[el('period-select')?.value] || '';
  }

  /* ═══════════════════════════════════════════════════════════
     MACHINE CARD HTML
  ═══════════════════════════════════════════════════════════ */
  function machineHTML(fuel, num) {
    const cls    = fuel.toLowerCase();
    const prefix = fuel === 'Petrol' ? 'p' : 'd';
    const removeBtn = num > 1
      ? `<button type="button" class="btn btn-sm btn-outline-danger ms-auto py-0"
           onclick="DR.removeMachine('${fuel}',${num})"><i class="bi bi-trash"></i></button>`
      : '';

    return `
      <div class="machine-card" id="machine-card-${cls}-${num}">
        <div class="mc-head ${cls}">
          <i class="bi bi-droplet-fill"></i>
          ${fuel} Machine #${num}
          ${removeBtn}
        </div>
        <div class="mc-body">
          <div class="row g-3">
            <div class="col-md-4">
              <label class="form-label small fw-semibold">Liters Bika (24 Hours) <span class="text-danger">*</span></label>
              <input type="number" id="${prefix}-li-${num}" class="form-control"
                step="0.001" placeholder="Total liters sold" oninput="DR.calcMachine('${fuel}',${num})" 
                style="border:2px solid ${fuel==='Petrol'?'#198754':'#f1c40f'};">
            </div>
            <div class="col-md-4">
              <label class="form-label small fw-semibold">
                Udhaar Sale (Rs)
              </label>
              <input type="number" id="${prefix}-ud-${num}" class="form-control"
                step="0.01" placeholder="0.00" oninput="DR.calcMachine('${fuel}',${num})">
            </div>
            <div class="col-md-4">
              <label class="form-label small fw-semibold">Testing (L)</label>
              <input type="number" id="${prefix}-te-${num}" class="form-control"
                step="0.001" placeholder="0.000" oninput="DR.calcMachine('${fuel}',${num})">
            </div>
          </div>
          <div class="live-calc" id="calc-${cls}-${num}">
            <span class="text-muted">Total liters enter karein — result yahan dikhega</span>
          </div>
        </div>
      </div>`;
  }

  function initMachines() {
    _petrolCount = 1;
    _dieselCount = 1;
    if (el('petrol-machines-wrap')) el('petrol-machines-wrap').innerHTML = machineHTML('Petrol', 1);
    if (el('diesel-machines-wrap')) el('diesel-machines-wrap').innerHTML = machineHTML('Diesel', 1);
    if (el('grand-total-box')) el('grand-total-box').style.display = 'none';
    if (el('add-notes')) el('add-notes').value = '';
  }

  /* ═══════════════════════════════════════════════════════════
     LIVE CALCULATIONS
  ═══════════════════════════════════════════════════════════ */
  window.DR = window.DR || {};

  DR.addMachine = function(fuel) {
    const wrap = el(fuel.toLowerCase() + '-machines-wrap');
    if (!wrap) return;
    if (fuel === 'Petrol') { _petrolCount++; wrap.insertAdjacentHTML('beforeend', machineHTML('Petrol', _petrolCount)); }
    else                   { _dieselCount++; wrap.insertAdjacentHTML('beforeend', machineHTML('Diesel', _dieselCount)); }
  };

  DR.removeMachine = function(fuel, num) {
    const card = el('machine-card-' + fuel.toLowerCase() + '-' + num);
    if (card) card.remove();
    DR.recalcAll();
  };

  DR.calcMachine = function(fuel, num) {
    const p   = fuel === 'Petrol' ? 'p' : 'd';
    const cls = fuel.toLowerCase();

    const litersInput = parseFloat(el(`${p}-li-${num}`)?.value) || 0;
    const ud = parseFloat(el(`${p}-ud-${num}`)?.value) || 0;
    const te = parseFloat(el(`${p}-te-${num}`)?.value) || 0;
    const pr = parseFloat(el(fuel === 'Petrol' ? 'add-petrol-price' : 'add-diesel-price')?.value) || 0;

    const liters = Math.max(0, litersInput - te);
    const gross  = liters * pr;
    const cash   = gross - ud;

    const badge = el(`calc-${cls}-${num}`);
    if (!badge) return;

    badge.innerHTML = `
      <div class="row text-center g-0">
        <div class="col-3">
          <div class="small text-muted">Liters (Net)</div>
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
      if (!el(`p-li-${i}`)) continue;
      const liInput = parseFloat(el(`p-li-${i}`)?.value) || 0;
      const ud = parseFloat(el(`p-ud-${i}`)?.value) || 0;
      const te = parseFloat(el(`p-te-${i}`)?.value) || 0;
      const pr = parseFloat(el('add-petrol-price')?.value) || 0;
      const li = Math.max(0, liInput - te);
      totL += li; totG += li * pr; totC += (li * pr) - ud;
    }
    for (let i = 1; i <= _dieselCount; i++) {
      if (!el(`d-li-${i}`)) continue;
      const liInput = parseFloat(el(`d-li-${i}`)?.value) || 0;
      const ud = parseFloat(el(`d-ud-${i}`)?.value) || 0;
      const te = parseFloat(el(`d-te-${i}`)?.value) || 0;
      const pr = parseFloat(el('add-diesel-price')?.value) || 0;
      const li = Math.max(0, liInput - te);
      totL += li; totG += li * pr; totC += (li * pr) - ud;
    }

    const gtBox = el('grand-total-box');
    if (totG > 0 && gtBox) {
      gtBox.style.display = '';
      el('gt-liters').textContent = fmtL(totL) + ' L';
      el('gt-gross').textContent  = 'Rs. ' + fmt(totG);
      el('gt-cash').textContent   = 'Rs. ' + fmt(totC);
    }
  };

  /* ═══════════════════════════════════════════════════════════
     SAVE — transactions table exact same format as transactions-COMPLETE-v5.js
     charges = amount = NET cash sale value (NOT NULL required)
     liters  = total liters
     unit_price = rate per liter
     fuel_type = 'Petrol'/'Diesel'
     description = JSON with full reading details
  ═══════════════════════════════════════════════════════════ */
  DR.save = async function() {
    const sb = window.supabaseClient;
    if (!sb) { showToast('danger', 'Error', 'Database connect nahi'); return; }

    const date = el('add-date')?.value;
    if (!date) { showToast('warning', 'Zaroorat!', 'Taareekh zaroor daalein'); return; }

    const petrolRate = parseFloat(el('add-petrol-price')?.value) || 0;
    const dieselRate = parseFloat(el('add-diesel-price')?.value) || 0;
    const notes      = el('add-notes')?.value || '';

    // User ID (optional, may be null)
    let userId = null;
    try {
      const { data: au } = await sb.auth.getUser();
      userId = au?.user?.id || null;
    } catch(e) { /* auth optional */ }

    // PKT midnight timestamp
    const createdAt = date + 'T00:00:01+05:00';

    const inserts = [];

    /* ── Petrol machines ── */
    for (let i = 1; i <= _petrolCount; i++) {
      const liEl = el(`p-li-${i}`);
      if (!liEl || liEl.value === '') continue;
      const litersRaw = parseFloat(liEl.value);
      if (isNaN(litersRaw) || litersRaw <= 0) continue;

      const te    = parseFloat(el(`p-te-${i}`)?.value) || 0;
      const ud    = parseFloat(el(`p-ud-${i}`)?.value) || 0;
      const liters = parseFloat(Math.max(0, litersRaw - te).toFixed(3));
      const gross  = parseFloat((liters * petrolRate).toFixed(2));
      const cash   = parseFloat((gross - ud).toFixed(2));

      inserts.push({
        transaction_type: 'CashSale',
        fuel_type:        'Petrol',
        entry_method:     'machine_reading',
        charges:          cash,
        amount:           cash,
        liters:           liters,
        unit_price:       petrolRate,
        description:      JSON.stringify({
          machine: i,
          liters_input: litersRaw,
          liters,
          rate:    petrolRate,
          gross,
          udhaar:  ud,
          testing: te,
          notes
        }),
        payment_method: 'Cash',
        created_at:     createdAt,
        ...(userId ? { user_id: userId } : {})
      });
    }

    /* ── Diesel machines ── */
    for (let i = 1; i <= _dieselCount; i++) {
      const liEl = el(`d-li-${i}`);
      if (!liEl || liEl.value === '') continue;
      const litersRaw = parseFloat(liEl.value);
      if (isNaN(litersRaw) || litersRaw <= 0) continue;

      const te    = parseFloat(el(`d-te-${i}`)?.value) || 0;
      const ud    = parseFloat(el(`d-ud-${i}`)?.value) || 0;
      const liters = parseFloat(Math.max(0, litersRaw - te).toFixed(3));
      const gross  = parseFloat((liters * dieselRate).toFixed(2));
      const cash   = parseFloat((gross - ud).toFixed(2));

      inserts.push({
        transaction_type: 'CashSale',
        fuel_type:        'Diesel',
        entry_method:     'machine_reading',
        charges:          cash,
        amount:           cash,
        liters:           liters,
        unit_price:       dieselRate,
        description:      JSON.stringify({
          machine: i,
          liters_input: litersRaw,
          liters,
          rate:    dieselRate,
          gross,
          udhaar:  ud,
          testing: te,
          notes
        }),
        payment_method: 'Cash',
        created_at:     createdAt,
        ...(userId ? { user_id: userId } : {})
      });
    }

    if (!inserts.length) {
      showToast('warning', 'Zaroorat!', 'Kam az kam ek machine ki opening aur closing reading daalein');
      return;
    }

    try {
      const { error } = await sb.from('transactions').insert(inserts);
      if (error) throw error;

      showToast('success', 'Saved! ✅', `${inserts.length} machine reading(s) save ho gayi!`);

      const modal = bootstrap.Modal.getInstance(el('addReadingModal'));
      if (modal) modal.hide();

      initMachines();
      DR.load();

    } catch (e) {
      console.error('DR.save error:', e);
      showToast('danger', 'Save Error', e.message);
    }
  };

  /* ═══════════════════════════════════════════════════════════
     LOAD — readings + is period mein Credit transactions bhi
     CashSale = machine reading se aaya cash
     Credit = customer transactions se aaya udhaar (transaction page se)
  ═══════════════════════════════════════════════════════════ */
  DR.load = async function() {
    const sb = window.supabaseClient;
    if (!sb) { setTimeout(DR.load, 200); return; }

    setPeriodLabel();
    const { from, to } = getRange();
    const fuelFilter = el('filter-fuel')?.value || '';

    const tbody = el('readings-tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="11" class="text-center py-4 text-muted">
      <div class="spinner-border spinner-border-sm me-2"></div>Loading...
    </td></tr>`;

    try {
      // Machine readings query
      let q = sb.from('transactions')
        .select('id, transaction_type, fuel_type, charges, amount, liters, unit_price, description, created_at, entry_method')
        .eq('transaction_type', 'CashSale')
        .eq('entry_method', 'machine_reading')
        .gte('created_at', from + 'T00:00:00+05:00')
        .lte('created_at', to   + 'T23:59:59+05:00')
        .order('created_at', { ascending: false });

      if (fuelFilter) q = q.eq('fuel_type', fuelFilter);

      const { data: readingsData, error: readingsErr } = await q;
      if (readingsErr) throw readingsErr;

      // Credit transactions (customer udhaar) — same period mein
      // Yeh summary cards mein "Udhaar Sale (Credit customers)" ke liye hai
      let creditQ = sb.from('transactions')
        .select('id, transaction_type, fuel_type, charges, amount')
        .eq('transaction_type', 'Credit')
        .gte('created_at', from + 'T00:00:00+05:00')
        .lte('created_at', to   + 'T23:59:59+05:00');

      if (fuelFilter) creditQ = creditQ.eq('fuel_type', fuelFilter);

      const { data: creditData } = await creditQ;
      const totalCreditUdhaar = (creditData || []).reduce((sum, t) => sum + (parseFloat(t.charges) || 0), 0);

      // Parse machine readings
      _rows = (readingsData || []).map(r => {
        let meta = {};
        try { meta = JSON.parse(r.description || '{}'); } catch(e) {}
        return { ...r, meta };
      });

      renderTable();
      renderDailySummary();
      renderSummaryCards(totalCreditUdhaar);

    } catch (e) {
      console.error('DR.load error:', e);
      if (tbody) tbody.innerHTML = `<tr><td colspan="11" class="text-center py-3 text-danger">
        Error: ${e.message}
      </td></tr>`;
    }
  };

  /* ═══════════════════════════════════════════════════════════
     RENDER TABLE
  ═══════════════════════════════════════════════════════════ */
  function renderTable() {
    const tbody = el('readings-tbody');
    const count = el('table-count');
    if (count) count.textContent = `${_rows.length} records`;

    if (!_rows.length) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="11" class="text-center py-4 text-muted">
        Is period mein koi reading nahi — "Nai Reading Darj Karein" se add karein
      </td></tr>`;
      if (el('readings-tfoot')) el('readings-tfoot').innerHTML = '';
      return;
    }

    let totL = 0, totG = 0, totU = 0, totC = 0;

    const html = _rows.map(r => {
      const m      = r.meta;
      const liters = parseFloat(r.liters) || m.liters  || 0;
      const rate   = parseFloat(r.unit_price) || m.rate || 0;
      const gross  = m.gross  || (liters * rate);
      const udhaar = m.udhaar || 0;
      const cash   = parseFloat(r.charges) || 0;
      const dateStr = r.created_at ? r.created_at.split('T')[0] : '';

      totL += liters; totG += gross; totU += udhaar; totC += cash;

      const fBadge = r.fuel_type === 'Petrol'
        ? '<span class="badge" style="background:#d4edda;color:#155724;padding:4px 10px;">⛽ Petrol</span>'
        : '<span class="badge" style="background:#fff3cd;color:#856404;padding:4px 10px;">🛢 Diesel</span>';

      const hasOpenClose = (m.opening || m.closing);
      const openCloseInfo = hasOpenClose 
        ? `<div class="small text-muted" style="font-size:10px;">O: ${fmtL(m.opening)} | C: ${fmtL(m.closing)}</div>`
        : '';

      return `<tr>
        <td><strong>${fmtD(dateStr)}</strong></td>
        <td>${fBadge}</td>
        <td class="text-center">M#${m.machine || 1}</td>
        <td class="text-end">
          <div class="text-primary fw-bold">${fmtL(liters)} L</div>
          ${openCloseInfo}
        </td>
        <td class="text-end">Rs.${fmt(rate)}</td>
        <td class="text-end">Rs.${fmt(gross)}</td>
        <td class="text-end text-danger">Rs.${fmt(udhaar)}</td>
        <td class="text-end fw-bold ${cash >= 0 ? 'profit-pos' : 'profit-neg'}">Rs.${fmt(cash)}</td>
        <td class="text-center no-print">
          <button class="btn btn-sm btn-outline-danger" onclick="DR.del(${r.id})" title="Delete">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>`;
    }).join('');

    if (tbody) tbody.innerHTML = html;
    if (el('readings-tfoot')) el('readings-tfoot').innerHTML = `
      <tr class="tfoot-total">
        <td colspan="5"><strong>TOTAL (${_rows.length} entries)</strong></td>
        <td class="text-end text-primary fw-bold">${fmtL(totL)} L</td>
        <td></td>
        <td class="text-end fw-bold">Rs.${fmt(totG)}</td>
        <td class="text-end text-danger fw-bold">Rs.${fmt(totU)}</td>
        <td class="text-end fw-bold profit-pos">Rs.${fmt(totC)}</td>
        <td class="no-print"></td>
      </tr>`;
  }

  /* ═══════════════════════════════════════════════════════════
     RENDER DAILY SUMMARY
  ═══════════════════════════════════════════════════════════ */
  function renderDailySummary() {
    const days = {};

    _rows.forEach(r => {
      const d = r.created_at ? r.created_at.split('T')[0] : '?';
      if (!days[d]) days[d] = { petrolL: 0, dieselL: 0, petrolCash: 0, dieselCash: 0 };
      const liters = parseFloat(r.liters) || r.meta.liters || 0;
      const cash   = parseFloat(r.charges) || 0;

      if (r.fuel_type === 'Petrol') {
        days[d].petrolL    += liters;
        days[d].petrolCash += cash;
      } else {
        days[d].dieselL    += liters;
        days[d].dieselCash += cash;
      }
    });

    const tbody = el('daily-tbody');
    const keys  = Object.keys(days).sort().reverse();

    if (!keys.length) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center py-3 text-muted">Koi data nahi</td></tr>';
      return;
    }

    if (tbody) tbody.innerHTML = keys.map(d => {
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

  /* ═══════════════════════════════════════════════════════════
     RENDER SUMMARY CARDS
     Machine readings se:
       GROSS REVENUE  = liters * rate
       UDHAAR (machine) = jo reading mein darj kiya
       CASH SALE NET  = gross - udhaar
       TOTAL LITERS   = liters field
     Plus info note agar credit transactions bhi hain is period mein
  ═══════════════════════════════════════════════════════════ */
  function renderSummaryCards(totalCreditUdhaar) {
    let totL = 0, totG = 0, totU = 0, totC = 0;

    _rows.forEach(r => {
      totL += parseFloat(r.liters) || r.meta.liters  || 0;
      totG += r.meta.gross         || 0;
      totU += r.meta.udhaar        || 0;
      totC += parseFloat(r.charges) || 0;
    });

    if (el('sum-cash'))   el('sum-cash').textContent   = 'Rs. ' + fmt(totC);
    if (el('sum-liters')) el('sum-liters').textContent = fmtL(totL) + ' L';
    if (el('sum-gross'))  el('sum-gross').textContent  = 'Rs. ' + fmt(totG);

    // Udhaar card: machine reading ka udhaar + credit transactions ka udhaar
    const totalUdhaar = totU + totalCreditUdhaar;
    if (el('sum-udhaar')) el('sum-udhaar').textContent = 'Rs. ' + fmt(totalUdhaar);

    // Hint: agar credit transactions bhi hain to note karo
    const udhaarCard = el('sum-udhaar')?.closest('.s-card');
    if (udhaarCard) {
      const existingNote = udhaarCard.querySelector('.udhaar-note');
      if (existingNote) existingNote.remove();
      if (totalCreditUdhaar > 0) {
        const note = document.createElement('small');
        note.className = 'text-muted udhaar-note d-block mt-1';
        note.style.fontSize = '10px';
        note.innerHTML = `Machine: Rs.${fmt(totU)}<br>Txn page: Rs.${fmt(totalCreditUdhaar)}`;
        udhaarCard.appendChild(note);
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════
     EDIT
  ═══════════════════════════════════════════════════════════ */
  DR.openEdit = function(id) {
    const r = _rows.find(x => x.id === id);
    if (!r) return;
    const m = r.meta;

    el('edit-txn-id').value  = id;
    el('edit-date').value    = r.created_at ? r.created_at.split('T')[0] : '';
    el('edit-rate').value    = parseFloat(r.unit_price) || m.rate    || 0;
    el('edit-liters').value  = m.liters_input || m.liters || 0;
    el('edit-udhaar').value  = m.udhaar  || 0;
    el('edit-testing').value = m.testing || 0;

    DR.calcEditBadge();
    new bootstrap.Modal(el('editReadingModal')).show();
  };

  DR.calcEditBadge = function() {
    const liInput = parseFloat(el('edit-liters')?.value) || 0;
    const ud = parseFloat(el('edit-udhaar')?.value)  || 0;
    const te = parseFloat(el('edit-testing')?.value) || 0;
    const pr = parseFloat(el('edit-rate')?.value)    || 0;

    const li = Math.max(0, liInput - te);
    const gr = li * pr;
    const ca = gr - ud;

    const badge = el('edit-calc-badge');
    if (badge) badge.innerHTML = `
      <strong>${fmtL(li)} L</strong> bika &nbsp;|&nbsp;
      Gross: <strong>Rs.${fmt(gr)}</strong> &nbsp;|&nbsp;
      Udhaar: <span class="text-danger">Rs.${fmt(ud)}</span> &nbsp;|&nbsp;
      <strong class="${ca >= 0 ? 'profit-pos' : 'profit-neg'}">Cash Sale: Rs.${fmt(ca)}</strong>`;
  };

  DR.update = async function() {
    const sb = window.supabaseClient;
    const id = parseInt(el('edit-txn-id')?.value);
    if (!sb || !id) return;

    const liInput = parseFloat(el('edit-liters')?.value) || 0;
    const ud = parseFloat(el('edit-udhaar')?.value)  || 0;
    const te = parseFloat(el('edit-testing')?.value) || 0;
    const pr = parseFloat(el('edit-rate')?.value)    || 0;
    const date = el('edit-date')?.value;

    const li   = parseFloat(Math.max(0, liInput - te).toFixed(3));
    const gr   = parseFloat((li * pr).toFixed(2));
    const cash = parseFloat((gr - ud).toFixed(2));

    const orig     = _rows.find(r => r.id === id);
    const origMeta = orig?.meta || {};

    const newMeta = {
      ...origMeta,
      liters_input: liInput,
      liters: li, rate: pr,
      gross: gr, udhaar: ud, testing: te
    };

    try {
      const { error } = await sb.from('transactions').update({
        charges:    cash,
        amount:     cash,
        liters:     li,
        unit_price: pr,
        description: JSON.stringify(newMeta),
        ...(date ? { created_at: date + 'T00:00:01+05:00' } : {})
      }).eq('id', id);

      if (error) throw error;

      showToast('success', 'Updated ✅', 'Reading update ho gayi');
      bootstrap.Modal.getInstance(el('editReadingModal'))?.hide();
      DR.load();

    } catch (e) {
      showToast('danger', 'Update Error', e.message);
    }
  };

  /* ═══════════════════════════════════════════════════════════
     DELETE
  ═══════════════════════════════════════════════════════════ */
  DR.del = async function(id) {
    if (!confirm('Yeh reading delete karein? Yeh action undo nahi ho sakta.')) return;
    const sb = window.supabaseClient;
    try {
      const { error } = await sb.from('transactions').delete().eq('id', id);
      if (error) throw error;
      showToast('success', 'Deleted', 'Reading delete ho gayi');
      DR.load();
    } catch (e) {
      showToast('danger', 'Delete Error', e.message);
    }
  };

  /* ═══════════════════════════════════════════════════════════
     INIT — same pattern as transactions-COMPLETE-v5.js
  ═══════════════════════════════════════════════════════════ */
  function tryInit() {
    if (!window.supabaseClient) { setTimeout(tryInit, 200); return; }
    console.log('✅ daily-readings.js init with supabaseClient');
    initMachines();
    loadPrices();
    DR.load();
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Default dates
    const today = new Date().toISOString().split('T')[0];
    const now   = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;

    if (el('add-date'))  el('add-date').value  = today;
    if (el('date-from')) el('date-from').value = monthStart;
    if (el('date-to'))   el('date-to').value   = today;

    // Period select — custom range toggle
    el('period-select')?.addEventListener('change', function() {
      const cr = el('custom-range');
      if (cr) cr.style.display = this.value === 'custom' ? '' : 'none';
      if (this.value !== 'custom') DR.load();
    });

    // Modal open → reload prices + reset date
    el('addReadingModal')?.addEventListener('show.bs.modal', () => {
      el('add-date').value = new Date().toISOString().split('T')[0];
      loadPrices();
    });

    tryInit();
  });

})();