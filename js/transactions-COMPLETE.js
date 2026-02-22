// ============================================================
// transactions-COMPLETE.js  —  FINAL VERSION (v3)
// Features:
//   ✅ Duplicate fix (ID-based dedup)
//   ✅ Badge colors fixed (CSS classes, not inline badges)
//   ✅ Search (customer name / description / type)
//   ✅ Customer filter dropdown
//   ✅ Single row print
//   ✅ Multiple row select + bulk print
//   ✅ Print: Summary view
//   ✅ Print: Monthly grouped report
//   ✅ Pagination
//   ✅ All previous form logic intact
// LOAD ORDER: config.js → auth.js → app.js → THIS FILE ONLY
// DO NOT load transactions-enhancements-WORKING.js anymore
// ============================================================
(function () {
  'use strict';

  // Guard: only run on transactions page
  if (document.body.getAttribute('data-page') !== 'transactions') return;

  // ── State ──────────────────────────────────────────────────
  const supabase = window.supabaseClient;
  let allTransactions    = [];   // raw from DB (deduped)
  let filteredTransactions = []; // after filters
  let allCustomers       = [];
  let fuelPriceHistory   = [];
  window.fuelPrices      = { Petrol: 0, Diesel: 0 };

  let currentPage  = 1;
  let pageSize     = 25;
  let selectedIds  = new Set(); // for bulk print

  let activeFilters = { type:'', dateFrom:'', dateTo:'', search:'', customerId:'' };

  // ── Helpers ────────────────────────────────────────────────
  function el(id) { return document.getElementById(id); }

  function fmt(num) {
    return Number(num || 0).toLocaleString('en-PK', { minimumFractionDigits:2, maximumFractionDigits:2 });
  }

  function showToast(type, title, message) {
    const t = el('liveToast');
    if (!t) { console.log(title, message); return; }
    el('toast-title').textContent   = title;
    el('toast-message').textContent = message;
    t.className = 'toast ' + (type==='success' ? 'bg-success text-white'
                             : type==='warning' ? 'bg-warning text-dark'
                             : 'bg-danger text-white');
    new bootstrap.Toast(t, { delay: 3500 }).show();
  }

  function closeModal(id) {
    const m = el(id);
    if (m) (bootstrap.Modal.getInstance(m) || new bootstrap.Modal(m)).hide();
    const f = document.querySelector('#'+id+' form');
    if (f) f.reset();
    if (id === 'newSaleModal') {
      if (el('sale-unit-price')) el('sale-unit-price').value = '';
      if (el('sale-amount'))     el('sale-amount').value     = '';
    }
  }

  // ── Fuel Prices from Settings ──────────────────────────────
  async function loadFuelPrices() {
    try {
      const { data, error } = await supabase.from('settings').select('price_history').limit(10);
      if (error || !data?.length) { showToast('warning','Settings','Fuel prices settings mein set karein!'); return; }

      let hist = [];
      data.forEach(r => { if (Array.isArray(r.price_history)) hist = hist.concat(r.price_history); });

      const seen = new Set();
      fuelPriceHistory = hist
        .sort((a,b) => new Date(b.date)-new Date(a.date))
        .filter(e => { if (seen.has(e.date)) return false; seen.add(e.date); return true; });

      if (fuelPriceHistory.length) {
        const today = new Date().toISOString().split('T')[0];
        window.fuelPrices.Petrol = priceFor(today,'Petrol');
        window.fuelPrices.Diesel = priceFor(today,'Diesel');
        const s = el('sale-price-source');
        if (s) { s.textContent = `Settings: Petrol Rs.${window.fuelPrices.Petrol} | Diesel Rs.${window.fuelPrices.Diesel}`; s.className='text-success small'; }
      }
    } catch(e) { console.error('loadFuelPrices:', e); }
  }

  function priceFor(dateStr, fuelType) {
    if (!fuelPriceHistory.length) return window.fuelPrices[fuelType] || 0;
    const target = new Date(dateStr);
    const sorted = [...fuelPriceHistory].sort((a,b) => new Date(b.date)-new Date(a.date));
    const entry  = sorted.find(e => new Date(e.date) <= target) || sorted[sorted.length-1];
    return fuelType === 'Petrol' ? parseFloat(entry.petrol) : parseFloat(entry.diesel);
  }

  // ── Load Transactions ──────────────────────────────────────
  async function loadTransactions() {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, customers!inner(name, sr_no)')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // DEDUP BY ID — fixes duplicate rows
      const seen = new Set();
      allTransactions = (data || []).filter(t => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });

      selectedIds.clear();
      applyFilters();
    } catch(e) {
      console.error('loadTransactions:', e);
      const tb = el('transactions-table');
      if (tb) tb.innerHTML = `<tr><td colspan="10" class="text-center text-danger py-4">Data load error. Page refresh karein.</td></tr>`;
    }
  }

  // ── Load Customers ─────────────────────────────────────────
  async function loadCustomers() {
    try {
      const { data, error } = await supabase.from('customers').select('*').order('sr_no');
      if (error) throw error;
      allCustomers = data || [];
      populateSaleCustomer();
      populateVasooliCustomer();
      populateCustomerFilter();
    } catch(e) { console.error('loadCustomers:', e); }
  }

  function populateSaleCustomer() {
    const s = el('sale-customer');
    if (!s) return;
    s.innerHTML = '<option value="">Select Customer</option>' +
      allCustomers.map(c => `<option value="${c.id}">${c.sr_no} - ${c.name}</option>`).join('');
  }

  function populateVasooliCustomer() {
    const s = el('vasooli-customer');
    if (!s) return;
    s.innerHTML = '<option value="">Select Customer</option>' +
      allCustomers.filter(c => c.category !== 'Owner').map(c => `<option value="${c.id}">${c.sr_no} - ${c.name}</option>`).join('');
  }

  function populateCustomerFilter() {
    const s = el('filter-customer');
    if (!s) return;
    s.innerHTML = '<option value="">All Customers</option>' +
      allCustomers.map(c => `<option value="${c.id}">${c.sr_no} - ${c.name}</option>`).join('');
  }

  // ── Summary Cards ──────────────────────────────────────────
  function updateCards(txns) {
    let cr=0,db=0,ex=0,crc=0,dbc=0,exc=0;
    txns.forEach(t => {
      const a = parseFloat(t.amount)||0;
      if (t.transaction_type==='Credit')  { cr+=a; crc++; }
      else if (t.transaction_type==='Debit')   { db+=a; dbc++; }
      else if (t.transaction_type==='Expense') { ex+=a; exc++; }
    });
    if (el('total-credit'))  el('total-credit').textContent  = 'Rs. '+fmt(cr);
    if (el('credit-count'))  el('credit-count').textContent  = crc+' transactions';
    if (el('total-debit'))   el('total-debit').textContent   = 'Rs. '+fmt(db);
    if (el('debit-count'))   el('debit-count').textContent   = dbc+' transactions';
    if (el('total-expense')) el('total-expense').textContent = 'Rs. '+fmt(ex);
    if (el('expense-count')) el('expense-count').textContent = exc+' transactions';
    if (el('net-balance'))   el('net-balance').textContent   = 'Rs. '+fmt(cr-ex);
  }

  // ── Filters ────────────────────────────────────────────────
  function applyFilters() {
    const { type, dateFrom, dateTo, search, customerId } = activeFilters;
    const q = (search||'').toLowerCase().trim();

    filteredTransactions = allTransactions.filter(t => {
      if (type && t.transaction_type !== type) return false;
      if (customerId && String(t.customer_id) !== String(customerId)) return false;
      if (dateFrom && new Date(t.created_at) < new Date(dateFrom)) return false;
      if (dateTo   && new Date(t.created_at) > new Date(dateTo+'T23:59:59')) return false;
      if (q) {
        const name = (t.customers?.name||'').toLowerCase();
        const desc = (t.description||'').toLowerCase();
        const typ  = (t.transaction_type||'').toLowerCase();
        if (!name.includes(q) && !desc.includes(q) && !typ.includes(q)) return false;
      }
      return true;
    });

    currentPage = 1;
    selectedIds.clear();
    renderPage();
    updateCards(filteredTransactions);
    updateBulkBar();
  }

  // Public filter functions
  window.applyFilters = function() {
    activeFilters.type       = el('filter-type')?.value      || '';
    activeFilters.dateFrom   = el('filter-date-from')?.value || '';
    activeFilters.dateTo     = el('filter-date-to')?.value   || '';
    activeFilters.customerId = el('filter-customer')?.value  || '';
    // search stays as typed
    applyFilters();
  };

  window.clearTransactionFilters = function() {
    activeFilters = { type:'', dateFrom:'', dateTo:'', search:'', customerId:'' };
    if (el('filter-type'))       el('filter-type').value       = '';
    if (el('filter-date-from'))  el('filter-date-from').value  = '';
    if (el('filter-date-to'))    el('filter-date-to').value    = '';
    if (el('filter-customer'))   el('filter-customer').value   = '';
    if (el('filter-search'))     el('filter-search').value     = '';
    applyFilters();
  };

  // ── Render Page ────────────────────────────────────────────
  function renderPage() {
    const total      = filteredTransactions.length;
    const totalPages = Math.max(1, Math.ceil(total/pageSize));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage-1)*pageSize;
    const end   = Math.min(start+pageSize, total);
    renderRows(filteredTransactions.slice(start, end));
    renderCount(total, start+1, end);
    renderPagination(total, totalPages);
  }

  function renderCount(total, from, to) {
    const e = el('transaction-count');
    if (e) e.textContent = total>0 ? `${from}-${to} of ${total} transactions` : '0 transactions';
  }

  // ── Render Rows ────────────────────────────────────────────
  function renderRows(txns) {
    const tbody = el('transactions-table');
    if (!tbody) return;

    if (!txns.length) {
      tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-muted">
        <i class="bi bi-inbox fs-3 d-block mb-2"></i>Koi transaction nahi mili</td></tr>`;
      return;
    }

    tbody.innerHTML = txns.map(t => {
      const d = new Date(t.created_at);
      const dateStr = d.toLocaleDateString('en-PK');
      const timeStr = d.toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'});

      // FIXED badge — custom CSS class, not Bootstrap badge (to avoid override)
      let badgeHtml;
      if (t.transaction_type === 'Credit') {
        badgeHtml = `<span class="tx-badge-credit">Credit</span>`;
      } else if (t.transaction_type === 'Debit') {
        badgeHtml = `<span class="tx-badge-debit">Debit</span>`;
      } else {
        badgeHtml = `<span class="tx-badge-expense">Expense</span>`;
      }

      const desc     = t.description || '';
      const fuelType = desc.toLowerCase().includes('petrol') ? 'Petrol'
                     : desc.toLowerCase().includes('diesel') ? 'Diesel' : '-';

      let unitPriceHtml = '-';
      if (t.unit_price && parseFloat(t.unit_price)>0) {
        unitPriceHtml = 'Rs. '+fmt(t.unit_price);
      } else if (fuelType!=='-' && fuelPriceHistory.length>0) {
        const hp = priceFor(d.toISOString().split('T')[0], fuelType);
        if (hp>0) unitPriceHtml = `Rs. ${fmt(hp)} <small class="text-muted">(est.)</small>`;
      }

      const litersHtml = t.liters>0 ? fmt(t.liters)+' L' : '-';
      const checked    = selectedIds.has(t.id);
      const rowClass   = checked ? 'tx-row-selected' : '';

      return `<tr class="${rowClass}" data-id="${t.id}">
        <td class="text-center">
          <input type="checkbox" class="form-check-input mt-0 tx-row-cb" data-id="${t.id}" ${checked?'checked':''}>
        </td>
        <td>${dateStr}<br><small class="text-muted">${timeStr}</small></td>
        <td>${t.customers?.name||'N/A'} <small class="text-muted">(${t.customers?.sr_no||'-'})</small></td>
        <td>${badgeHtml}</td>
        <td>${fuelType}</td>
        <td>${litersHtml}</td>
        <td>${unitPriceHtml}</td>
        <td><strong>Rs. ${fmt(t.amount)}</strong></td>
        <td style="max-width:220px;word-break:break-word;">${desc||'-'}</td>
        <td>
          <div class="d-flex gap-1">
            <button class="btn btn-sm btn-outline-info" title="Print this" onclick="window.printSingle(${t.id})">
              <i class="bi bi-printer"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" title="Delete" onclick="window.deleteTransaction(${t.id})">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>`;
    }).join('');

    // Attach checkbox events
    document.querySelectorAll('.tx-row-cb').forEach(cb => {
      cb.addEventListener('change', function() {
        const id = parseInt(this.dataset.id);
        if (this.checked) selectedIds.add(id);
        else selectedIds.delete(id);
        const row = this.closest('tr');
        if (row) row.className = this.checked ? 'tx-row-selected' : '';
        updateBulkBar();
        updateSelectAllCb();
      });
    });

    updateSelectAllCb();
  }

  function updateSelectAllCb() {
    const cb = el('select-all-cb');
    if (!cb) return;
    const pageIds = filteredTransactions
      .slice((currentPage-1)*pageSize, currentPage*pageSize)
      .map(t => t.id);
    cb.checked       = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
    cb.indeterminate = !cb.checked && pageIds.some(id => selectedIds.has(id));
  }

  // ── Bulk bar ───────────────────────────────────────────────
  function updateBulkBar() {
    const bar = el('bulk-action-bar');
    if (!bar) return;
    if (selectedIds.size > 0) {
      bar.classList.add('visible');
      const lbl = el('bulk-count-label');
      if (lbl) lbl.textContent = selectedIds.size + ' transaction(s) selected';
    } else {
      bar.classList.remove('visible');
    }
  }

  // ── Pagination ─────────────────────────────────────────────
  function renderPagination(total, totalPages) {
    const container = el('pagination-container');
    if (!container) return;

    if (total === 0) { container.innerHTML=''; return; }

    const startNum = (currentPage-1)*pageSize + 1;
    const endNum   = Math.min(currentPage*pageSize, total);

    let pagesHtml = '';
    let sp = Math.max(1, currentPage-2);
    let ep = Math.min(totalPages, sp+4);
    if (ep-sp<4) sp = Math.max(1, ep-4);
    for (let i=sp; i<=ep; i++) {
      pagesHtml += `<button class="btn btn-sm px-2 py-1 ${i===currentPage?'btn-primary':'btn-outline-secondary'}"
        onclick="window.txGoToPage(${i})">${i}</button>`;
    }

    container.innerHTML = `
      <div class="card-footer bg-white d-flex justify-content-between align-items-center flex-wrap gap-2 py-2 px-3">
        <div class="d-flex align-items-center gap-2">
          <span class="text-muted small">Show:</span>
          <select class="form-select form-select-sm" style="width:75px" onchange="window.txChangePageSize(this.value)">
            <option value="10" ${pageSize===10?'selected':''}>10</option>
            <option value="25" ${pageSize===25?'selected':''}>25</option>
            <option value="50" ${pageSize===50?'selected':''}>50</option>
            <option value="100" ${pageSize===100?'selected':''}>100</option>
          </select>
          <span class="text-muted small">${startNum}-${endNum} of ${total}</span>
        </div>
        <div class="d-flex align-items-center gap-1">
          <button class="btn btn-sm btn-outline-secondary px-2" onclick="window.txGoToPage(1)" ${currentPage===1?'disabled':''}>«</button>
          <button class="btn btn-sm btn-outline-secondary px-2" onclick="window.txGoToPage(${currentPage-1})" ${currentPage===1?'disabled':''}>‹</button>
          ${pagesHtml}
          <button class="btn btn-sm btn-outline-secondary px-2" onclick="window.txGoToPage(${currentPage+1})" ${currentPage===totalPages?'disabled':''}>›</button>
          <button class="btn btn-sm btn-outline-secondary px-2" onclick="window.txGoToPage(${totalPages})" ${currentPage===totalPages?'disabled':''}>»</button>
        </div>
      </div>`;
  }

  window.txGoToPage = function(p) {
    const tp = Math.ceil(filteredTransactions.length/pageSize);
    currentPage = Math.max(1, Math.min(p, tp));
    renderPage();
  };

  window.txChangePageSize = function(s) {
    pageSize    = parseInt(s);
    currentPage = 1;
    renderPage();
  };

  // ── Print Engine ───────────────────────────────────────────
  window.printSingle = function(id) {
    const t = allTransactions.find(x => x.id===id);
    if (!t) { alert('Transaction nahi mili'); return; }
    openPrint([t], 'summary');
  };

  window.printSelectedSummary = function() {
    const txns = allTransactions.filter(t => selectedIds.has(t.id));
    if (!txns.length) { alert('Koi transaction select nahi ki'); return; }
    openPrint(txns, 'summary');
  };

  window.printSelectedMonthly = function() {
    const txns = allTransactions.filter(t => selectedIds.has(t.id));
    if (!txns.length) { alert('Koi transaction select nahi ki'); return; }
    openPrint(txns, 'monthly');
  };

  window.printAllSummary = function() {
    if (!filteredTransactions.length) { alert('Koi data nahi hai'); return; }
    openPrint(filteredTransactions, 'summary');
  };

  window.printAllMonthly = function() {
    if (!filteredTransactions.length) { alert('Koi data nahi hai'); return; }
    openPrint(filteredTransactions, 'monthly');
  };

  function openPrint(txns, mode) {
    const company   = 'Khalid & Sons Petroleum';
    const printDate = new Date().toLocaleDateString('en-PK',{day:'2-digit',month:'long',year:'numeric'});

    let totCr=0, totDb=0, totEx=0;
    txns.forEach(t => {
      const a = parseFloat(t.amount)||0;
      if (t.transaction_type==='Credit')  totCr+=a;
      else if (t.transaction_type==='Debit')   totDb+=a;
      else totEx+=a;
    });

    // Build table body
    function buildRows(list) {
      return list.map(t => {
        const d    = new Date(t.created_at);
        const desc = t.description||'';
        const fuel = desc.toLowerCase().includes('petrol')?'Petrol':desc.toLowerCase().includes('diesel')?'Diesel':'-';
        const ltr  = t.liters>0 ? fmt(t.liters)+' L' : '-';
        const rate = t.unit_price>0 ? 'Rs.'+fmt(t.unit_price) : '-';
        const typeColor = t.transaction_type==='Credit'?'#198754':t.transaction_type==='Debit'?'#0d6efd':'#cc8800';
        const crAmt = t.transaction_type==='Credit' ? 'Rs.'+fmt(t.amount) : '-';
        const dbAmt = (t.transaction_type==='Debit'||t.transaction_type==='Expense') ? 'Rs.'+fmt(t.amount) : '-';
        return `<tr>
          <td>${d.toLocaleDateString('en-PK')}<br><small style="color:#888">${d.toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'})}</small></td>
          <td>${t.customers?.name||'N/A'} (${t.customers?.sr_no||'-'})</td>
          <td style="font-weight:700;color:${typeColor}">${t.transaction_type}</td>
          <td>${fuel}</td>
          <td style="text-align:center">${ltr}</td>
          <td style="text-align:right">${rate}</td>
          <td style="text-align:right;font-weight:700">Rs.${fmt(t.amount)}</td>
          <td style="text-align:right;color:#198754;font-weight:600">${crAmt}</td>
          <td style="text-align:right;color:#0d6efd;font-weight:600">${dbAmt}</td>
          <td style="word-break:break-word;max-width:130px">${desc}</td>
        </tr>`;
      }).join('');
    }

    const THEAD = `<tr style="background:#1a5276;color:#fff">
      <th>Date/Time</th><th>Customer</th><th>Type</th><th>Fuel</th>
      <th style="text-align:center">Qty(L)</th><th style="text-align:right">Rate/L</th>
      <th style="text-align:right">Amount</th><th style="text-align:right">Credit</th>
      <th style="text-align:right">Debit/Exp</th><th>Description</th>
    </tr>`;

    const TFOOT = `<tr style="background:#eaf0fb;font-weight:700;border-top:2px solid #1a5276">
      <td colspan="6" style="text-align:right">TOTALS:</td>
      <td style="text-align:right">Rs.${fmt(totCr+totDb+totEx)}</td>
      <td style="text-align:right;color:#198754">Rs.${fmt(totCr)}</td>
      <td style="text-align:right;color:#0d6efd">Rs.${fmt(totDb+totEx)}</td>
      <td></td>
    </tr>`;

    let bodyHtml = '';

    if (mode === 'monthly') {
      // Group by YYYY-MM
      const map = {};
      txns.forEach(t => {
        const d   = new Date(t.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        const lbl = d.toLocaleDateString('en-PK',{month:'long',year:'numeric'});
        if (!map[key]) map[key] = { lbl, list:[], cr:0, db:0, ex:0 };
        map[key].list.push(t);
        const a = parseFloat(t.amount)||0;
        if (t.transaction_type==='Credit') map[key].cr+=a;
        else if (t.transaction_type==='Debit') map[key].db+=a;
        else map[key].ex+=a;
      });

      Object.keys(map).sort((a,b)=>b.localeCompare(a)).forEach(key => {
        const m = map[key];
        bodyHtml += `
          <div style="background:#1a5276;color:#fff;padding:7px 10px;font-size:14px;font-weight:700;margin:14px 0 0;border-radius:4px 4px 0 0">
            ${m.lbl} &nbsp;·&nbsp; ${m.list.length} transactions
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:10px">
            <thead>${THEAD}</thead>
            <tbody>${buildRows(m.list)}</tbody>
            <tfoot>
              <tr style="background:#eaf0fb;font-weight:700;border-top:2px solid #1a5276">
                <td colspan="6" style="text-align:right">Month Total:</td>
                <td style="text-align:right">Rs.${fmt(m.cr+m.db+m.ex)}</td>
                <td style="text-align:right;color:#198754">Rs.${fmt(m.cr)}</td>
                <td style="text-align:right;color:#0d6efd">Rs.${fmt(m.db+m.ex)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>`;
      });
    } else {
      // Summary — all in one
      bodyHtml = `<table style="width:100%;border-collapse:collapse;font-size:10px">
        <thead>${THEAD}</thead>
        <tbody>${buildRows(txns)}</tbody>
        <tfoot>${TFOOT}</tfoot>
      </table>`;
    }

    const html = `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8">
<title>${company} - ${mode==='monthly'?'Monthly Report':'Transaction Report'}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:11px;color:#222;background:#fff}
.page{padding:16px}
.header{display:flex;justify-content:space-between;border-bottom:2px solid #1a5276;padding-bottom:10px;margin-bottom:12px}
.header h1{font-size:18px;color:#1a5276}
.header p{color:#555;font-size:11px}
.header-right{text-align:right;font-size:11px;color:#555}
.summary{display:flex;gap:8px;margin-bottom:14px}
.sbox{flex:1;border-radius:6px;padding:8px 10px}
.sbox.cr{background:#d4edda;border:1px solid #28a745}
.sbox.db{background:#cce5ff;border:1px solid #0069d9}
.sbox.ex{background:#fff3cd;border:1px solid #ffc107}
.sbox.nt{background:#e2e3e5;border:1px solid #6c757d}
.slabel{font-size:10px;color:#555}
.sval{font-size:14px;font-weight:700}
table{width:100%;border-collapse:collapse;margin-bottom:10px}
th{padding:5px 6px;font-size:10px;text-align:left}
td{padding:4px 6px;border-bottom:1px solid #eee;font-size:10px;vertical-align:top}
tr:nth-child(even) td{background:#f8f9fa}
.sig-row{display:flex;justify-content:space-around;margin-top:30px}
.sig{text-align:center;width:180px}
.sig-line{border-top:1px solid #555;padding-top:4px;font-size:10px;color:#555;margin-top:30px}
.footer{display:flex;justify-content:space-between;border-top:1px solid #ccc;margin-top:14px;padding-top:8px;font-size:10px;color:#888}
@media print{.page{padding:8px}@page{margin:10mm}}
</style></head><body><div class="page">

<div class="header">
  <div>
    <h1>⛽ ${company}</h1>
    <p>${mode==='monthly'?'Monthly Transaction Report':'Transaction Receipt / Khata Raseed'}</p>
  </div>
  <div class="header-right">
    <strong>Print Date: ${printDate}</strong><br>
    Total Entries: ${txns.length}<br>
    Generated: ${new Date().toLocaleTimeString('en-PK')}
  </div>
</div>

<div class="summary">
  <div class="sbox cr"><div class="slabel">Credit (Sales)</div><div class="sval">Rs.${fmt(totCr)}</div></div>
  <div class="sbox db"><div class="slabel">Debit (Received)</div><div class="sval">Rs.${fmt(totDb)}</div></div>
  <div class="sbox ex"><div class="slabel">Expense</div><div class="sval">Rs.${fmt(totEx)}</div></div>
  <div class="sbox nt"><div class="slabel">Net Balance</div><div class="sval">Rs.${fmt(totCr-totDb-totEx)}</div></div>
</div>

${bodyHtml}

<div class="sig-row">
  <div class="sig"><div class="sig-line">Authorized Signature</div></div>
  <div class="sig"><div class="sig-line">Customer Signature</div></div>
  <div class="sig"><div class="sig-line">Accountant</div></div>
</div>
<div class="footer">
  <span>${company} — Official Receipt</span>
  <span>Generated: ${new Date().toLocaleString('en-PK')}</span>
</div>

</div><script>window.onload=function(){window.print();}<\/script>
</body></html>`;

    const w = window.open('','_blank','width=1080,height=750');
    if (w) { w.document.write(html); w.document.close(); }
    else alert('Popup blocked! Browser mein popup allow karein.');
  }

  // ── Form Handlers ──────────────────────────────────────────
  async function handleNewSale() {
    const customerId  = el('sale-customer')?.value;
    const fuelType    = el('sale-fuel-type')?.value;
    const liters      = parseFloat(el('sale-liters')?.value)     || 0;
    const unitPrice   = parseFloat(el('sale-unit-price')?.value) || 0;
    const amount      = parseFloat(el('sale-amount')?.value)     || 0;
    const paymentType = el('sale-payment-type')?.value || 'cash';
    const description = el('sale-description')?.value || '';

    if (!customerId)  { alert('Customer select karein'); return; }
    if (!fuelType)    { alert('Fuel type select karein'); return; }
    if (!amount)      { alert('Amount enter karein'); return; }

    try {
      const { error } = await supabase.from('transactions').insert([{
        customer_id: parseInt(customerId),
        transaction_type: paymentType==='cash' ? 'Debit' : 'Credit',
        amount,
        liters: liters||null,
        unit_price: unitPrice||null,
        description: `${fuelType} sale${description?' - '+description:''}`
      }]);
      if (error) throw error;
      showToast('success','Kamyab!',`Sale Rs.${fmt(amount)} record ho gayi!`);
      closeModal('newSaleModal');
      await loadTransactions();
    } catch(e) { alert('Error: '+e.message); }
  }

  async function handleVasooli() {
    const customerId = el('vasooli-customer')?.value;
    const amount     = parseFloat(el('vasooli-amount')?.value) || 0;
    const month      = el('vasooli-month')?.value      || '';
    const fuelCat    = el('vasooli-fuel-category')?.value || '';
    const desc       = el('vasooli-description')?.value || '';

    if (!customerId) { alert('Customer select karein'); return; }
    if (!amount)     { alert('Amount enter karein'); return; }

    let fullDesc = 'Payment received';
    if (month)   { const d = new Date(month+'-01'); fullDesc = `Payment for ${d.toLocaleDateString('en-US',{month:'long',year:'numeric'})}`; }
    if (fuelCat) fullDesc += ` (${fuelCat})`;
    if (desc)    fullDesc += ` - ${desc}`;

    try {
      const { error } = await supabase.from('transactions').insert([{
        customer_id: parseInt(customerId), transaction_type: 'Debit', amount, description: fullDesc
      }]);
      if (error) throw error;
      showToast('success','Kamyab!','Payment record ho gayi!');
      closeModal('vasooliModal');
      await loadTransactions();
    } catch(e) { alert('Error: '+e.message); }
  }

  async function handleExpense() {
    const amount      = parseFloat(el('expense-amount')?.value) || 0;
    const description = el('expense-description')?.value;
    const expType     = el('expense-type')?.value;
    const account     = el('expense-account')?.value;

    if (!amount)      { alert('Amount enter karein'); return; }
    if (!description) { alert('Description enter karein'); return; }
    if (!expType)     { alert('Type select karein'); return; }
    if (!account)     { alert('Account select karein'); return; }

    try {
      let custId = null;
      const { data: owner } = await supabase.from('customers').select('id').eq('category','Owner').maybeSingle();
      if (owner) { custId = owner.id; }
      else {
        const { data: no, error: ce } = await supabase.from('customers')
          .insert([{sr_no:0,name:'Owner',category:'Owner',balance:0}]).select().single();
        if (ce) throw ce;
        custId = no.id;
      }
      const { error } = await supabase.from('transactions').insert([{
        customer_id: custId, transaction_type:'Expense', amount,
        description: `${expType}: ${description} (From: ${account})`
      }]);
      if (error) throw error;
      showToast('success','Kamyab!','Expense record ho gaya!');
      closeModal('expenseModal');
      await loadTransactions();
    } catch(e) { alert('Error: '+e.message); }
  }

  window.deleteTransaction = async function(id) {
    if (!confirm('Is transaction ko delete karein?')) return;
    try {
      const { error } = await supabase.from('transactions').delete().eq('id',id);
      if (error) throw error;
      showToast('success','Delete','Transaction delete ho gaya!');
      await loadTransactions();
    } catch(e) { alert('Error: '+e.message); }
  };

  // ── Sale Modal Helpers ─────────────────────────────────────
  window.updateSaleFuelPrice = function() {
    const fuel  = el('sale-fuel-type')?.value;
    if (!fuel) return;
    const price = window.fuelPrices[fuel] || 0;
    if (el('sale-unit-price')) el('sale-unit-price').value = price;
    const s = el('sale-price-source');
    if (s) {
      if (price>0) { s.textContent=`Settings: ${fuel} = Rs.${price}`; s.className='text-success small'; }
      else         { s.textContent='⚠️ Settings page par price set karein'; s.className='text-danger small fw-bold'; }
    }
    window.calcSaleFromLiters();
  };

  window.calcSaleFromLiters = function() {
    const l = parseFloat(el('sale-liters')?.value)     || 0;
    const r = parseFloat(el('sale-unit-price')?.value) || 0;
    if (el('sale-amount')) el('sale-amount').value = (l>0&&r>0) ? (l*r).toFixed(2) : '';
  };

  window.calcSaleFromAmount = function() {
    const a = parseFloat(el('sale-amount-direct')?.value) || 0;
    const r = parseFloat(el('sale-unit-price')?.value)    || 0;
    if (el('sale-amount'))  el('sale-amount').value  = a>0 ? a.toFixed(2) : '';
    if (el('sale-liters') && r>0 && a>0) el('sale-liters').value = (a/r).toFixed(2);
  };

  window.toggleSaleMethod = function(method) {
    const ls = el('sale-liters-section'), as_ = el('sale-amount-section');
    if (method==='liters') { if(ls) ls.style.display='block'; if(as_) as_.style.display='none'; }
    else                   { if(ls) ls.style.display='none';  if(as_) as_.style.display='block'; }
  };

  window.calculateVasooliAmount = function() {
    const fuel   = el('vasooli-fuel-category')?.value;
    const liters = parseFloat(el('vasooli-liters')?.value) || 0;
    if (!fuel||!liters) return;
    if (el('vasooli-amount')) el('vasooli-amount').value = (liters*(window.fuelPrices[fuel]||0)).toFixed(2);
  };

  // ── Event Listeners ────────────────────────────────────────
  function setupEvents() {
    // Forms
    el('newSaleForm')  ?.addEventListener('submit', e => { e.preventDefault(); handleNewSale(); });
    el('vasooliForm')  ?.addEventListener('submit', e => { e.preventDefault(); handleVasooli(); });
    el('expenseForm')  ?.addEventListener('submit', e => { e.preventDefault(); handleExpense(); });

    // Sale modal helpers
    el('sale-fuel-type')    ?.addEventListener('change', window.updateSaleFuelPrice);
    el('sale-liters')       ?.addEventListener('input',  window.calcSaleFromLiters);
    el('sale-amount-direct')?.addEventListener('input',  window.calcSaleFromAmount);
    el('lbl-by-liters')     ?.addEventListener('click',  () => window.toggleSaleMethod('liters'));
    el('lbl-by-amount')     ?.addEventListener('click',  () => window.toggleSaleMethod('amount'));

    // Vasooli helpers
    el('vasooli-fuel-category')?.addEventListener('change', window.calculateVasooliAmount);
    el('vasooli-liters')       ?.addEventListener('input',  window.calculateVasooliAmount);

    // Filter buttons
    el('btn-apply-filter') ?.addEventListener('click', window.applyFilters);
    el('btn-clear-filter') ?.addEventListener('click', window.clearTransactionFilters);

    // Print All buttons
    el('btn-print-all-summary') ?.addEventListener('click', window.printAllSummary);
    el('btn-print-all-monthly') ?.addEventListener('click', window.printAllMonthly);

    // Bulk print buttons
    el('btn-print-selected-summary') ?.addEventListener('click', window.printSelectedSummary);
    el('btn-print-selected-monthly') ?.addEventListener('click', window.printSelectedMonthly);
    el('btn-clear-selection')        ?.addEventListener('click', () => {
      selectedIds.clear();
      renderPage();
      updateBulkBar();
    });

    // Select All checkbox
    el('select-all-cb')?.addEventListener('change', function() {
      const pageIds = filteredTransactions
        .slice((currentPage-1)*pageSize, currentPage*pageSize)
        .map(t => t.id);
      pageIds.forEach(id => { if (this.checked) selectedIds.add(id); else selectedIds.delete(id); });
      renderPage();
      updateBulkBar();
    });

    // Live search with debounce
    const searchInput = el('filter-search');
    if (searchInput) {
      let debounce;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          activeFilters.search = searchInput.value;
          applyFilters();
        }, 300);
      });
    }

    // Customer filter live change
    el('filter-customer')?.addEventListener('change', function() {
      activeFilters.customerId = this.value;
      applyFilters();
    });
  }

  // ── INIT ───────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', async () => {
    console.log('Transactions v3 initializing...');
    setupEvents();
    await loadFuelPrices();
    await loadCustomers();
    await loadTransactions();
    console.log('Transactions v3 ready.');
  });

  // Export for external reload (if needed)
  window.loadInitialTransactions = loadTransactions;

})();