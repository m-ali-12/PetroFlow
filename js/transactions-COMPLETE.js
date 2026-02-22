// ============================================
// TRANSACTIONS-COMPLETE.js - FINAL VERSION
// Fixes: duplicates, badge text colors, print single/multiple
// ============================================
(function () {
  'use strict';

  const supabase = window.supabaseClient;
  let allTransactions = [];
  let allCustomers = [];
  let fuelPriceHistory = [];
  window.fuelPrices = { Petrol: 0, Diesel: 0 };

  let currentPage = 1;
  let pageSize = 25;
  let filteredTransactions = [];
  let selectedForPrint = new Set();

  function $(id) { return document.getElementById(id); }

  function fmt(num) {
    return Number(num || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ============================================
  // FUEL PRICES FROM SETTINGS
  // ============================================
  async function loadFuelPricesFromSettings() {
    try {
      const { data, error } = await supabase.from('settings').select('price_history').limit(10);
      if (error) { console.error('Settings error:', error.message); return; }
      if (!data || data.length === 0) { showToast('warning', 'Settings', 'Settings page par fuel prices set karein!'); return; }

      let allHistory = [];
      data.forEach(row => { if (row.price_history && Array.isArray(row.price_history)) allHistory = allHistory.concat(row.price_history); });

      const seen = new Set();
      fuelPriceHistory = allHistory
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .filter(e => { if (seen.has(e.date)) return false; seen.add(e.date); return true; });

      if (fuelPriceHistory.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        window.fuelPrices.Petrol = getPriceForDate(today, 'Petrol');
        window.fuelPrices.Diesel = getPriceForDate(today, 'Diesel');
        console.log('Fuel prices:', window.fuelPrices);
        const src = $('sale-price-source');
        if (src) { src.textContent = `Settings se: Petrol Rs.${window.fuelPrices.Petrol} | Diesel Rs.${window.fuelPrices.Diesel}`; src.className = 'text-success small'; }
      } else {
        showToast('warning', 'Settings', 'Settings page par fuel prices set karein!');
      }
    } catch (err) { console.error('loadFuelPrices error:', err); }
  }

  function getPriceForDate(dateStr, fuelType) {
    if (!fuelPriceHistory.length) return window.fuelPrices[fuelType] || 0;
    const target = new Date(dateStr);
    const sorted = [...fuelPriceHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
    const entry = sorted.find(e => new Date(e.date) <= target) || sorted[sorted.length - 1];
    return fuelType === 'Petrol' ? parseFloat(entry.petrol) : parseFloat(entry.diesel);
  }

  // ============================================
  // LOAD DATA - ID-based deduplication
  // ============================================
  async function loadInitialTransactions() {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, customers!inner(name, sr_no)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Deduplicate by id
      const seen = new Set();
      allTransactions = (data || []).filter(t => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });

      filteredTransactions = [...allTransactions];
      currentPage = 1;
      selectedForPrint.clear();
      console.log('Transactions loaded:', allTransactions.length);
      renderPage();
      updateSummaryCards(allTransactions);
    } catch (err) { console.error('Error loading transactions:', err); }
  }

  async function loadCustomers() {
    try {
      const { data, error } = await supabase.from('customers').select('*').order('sr_no');
      if (error) throw error;
      allCustomers = data || [];
      populateCustomerDropdowns();
    } catch (err) { console.error('Error loading customers:', err); }
  }

  function populateCustomerDropdowns() {
    if ($('sale-customer')) {
      $('sale-customer').innerHTML = '<option value="">Select Customer</option>' +
        allCustomers.map(c => `<option value="${c.id}">${c.sr_no} - ${c.name}</option>`).join('');
    }
    if ($('vasooli-customer')) {
      $('vasooli-customer').innerHTML = '<option value="">Select Customer</option>' +
        allCustomers.filter(c => c.category !== 'Owner').map(c => `<option value="${c.id}">${c.sr_no} - ${c.name}</option>`).join('');
    }
  }

  // ============================================
  // SUMMARY CARDS
  // ============================================
  function updateSummaryCards(transactions) {
    let credit = 0, debit = 0, expense = 0, creditC = 0, debitC = 0, expenseC = 0;
    transactions.forEach(t => {
      const amt = parseFloat(t.amount) || 0;
      if (t.transaction_type === 'Credit') { credit += amt; creditC++; }
      else if (t.transaction_type === 'Debit') { debit += amt; debitC++; }
      else if (t.transaction_type === 'Expense') { expense += amt; expenseC++; }
    });
    if ($('total-credit')) $('total-credit').textContent = 'Rs. ' + fmt(credit);
    if ($('credit-count')) $('credit-count').textContent = creditC + ' transactions';
    if ($('total-debit')) $('total-debit').textContent = 'Rs. ' + fmt(debit);
    if ($('debit-count')) $('debit-count').textContent = debitC + ' transactions';
    if ($('total-expense')) $('total-expense').textContent = 'Rs. ' + fmt(expense);
    if ($('expense-count')) $('expense-count').textContent = expenseC + ' transactions';
    if ($('net-balance')) $('net-balance').textContent = 'Rs. ' + fmt(credit - expense);
  }

  // ============================================
  // PAGINATION
  // ============================================
  function renderPage() {
    const total = filteredTransactions.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * pageSize;
    const end = Math.min(start + pageSize, total);

    displayTransactions(filteredTransactions.slice(start, end));
    updateTransactionCount(total, start + 1, end);
    renderPagination(total, totalPages);
    updatePrintSelectedBtn();
  }

  function updateTransactionCount(total, from, to) {
    const el = $('transaction-count');
    if (el) el.textContent = total > 0 ? `${from}-${to} of ${total} transactions` : '0 transactions';
  }

  function renderPagination(total, totalPages) {
    let container = $('pagination-container');
    if (!container) {
      const tableCard = document.getElementById('tx-history-card');
      if (tableCard) {
        const div = document.createElement('div');
        div.id = 'pagination-container';
        div.className = 'card-footer bg-white d-flex justify-content-between align-items-center flex-wrap gap-2 py-2 px-3';
        tableCard.appendChild(div);
        container = div;
      }
    }
    if (!container) return;

    const startNum = Math.min((currentPage - 1) * pageSize + 1, total);
    const endNum = Math.min(currentPage * pageSize, total);
    let pagesHtml = '';
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);
    for (let i = startPage; i <= endPage; i++) {
      pagesHtml += `<button class="btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-outline-secondary'} px-2 py-1" onclick="window.goToPage(${i})">${i}</button>`;
    }

    container.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        <span class="text-muted small">Show:</span>
        <select class="form-select form-select-sm" style="width:75px" onchange="window.changePageSize(this.value)">
          <option value="10" ${pageSize===10?'selected':''}>10</option>
          <option value="25" ${pageSize===25?'selected':''}>25</option>
          <option value="50" ${pageSize===50?'selected':''}>50</option>
          <option value="100" ${pageSize===100?'selected':''}>100</option>
        </select>
        <span class="text-muted small">${total > 0 ? startNum+'-'+endNum+' of '+total : '0'}</span>
      </div>
      <div class="d-flex align-items-center gap-1">
        <button class="btn btn-sm btn-outline-secondary px-2 py-1" onclick="window.goToPage(1)" ${currentPage===1?'disabled':''}>«</button>
        <button class="btn btn-sm btn-outline-secondary px-2 py-1" onclick="window.goToPage(${currentPage-1})" ${currentPage===1?'disabled':''}>‹</button>
        ${pagesHtml}
        <button class="btn btn-sm btn-outline-secondary px-2 py-1" onclick="window.goToPage(${currentPage+1})" ${currentPage===totalPages?'disabled':''}>›</button>
        <button class="btn btn-sm btn-outline-secondary px-2 py-1" onclick="window.goToPage(${totalPages})" ${currentPage===totalPages?'disabled':''}>»</button>
      </div>`;
  }

  window.goToPage = function(page) {
    const totalPages = Math.ceil(filteredTransactions.length / pageSize);
    currentPage = Math.max(1, Math.min(page, totalPages));
    renderPage();
  };

  window.changePageSize = function(size) {
    pageSize = parseInt(size);
    currentPage = 1;
    renderPage();
  };

  // ============================================
  // DISPLAY TRANSACTIONS
  // Fixed: badge colors, print checkbox, print button per row
  // ============================================
  function displayTransactions(transactions) {
    const tbody = $('transactions-table');
    if (!tbody) return;

    if (!transactions || transactions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" class="text-center py-4 text-muted">Koi transaction nahi mila</td></tr>';
      return;
    }

    tbody.innerHTML = transactions.map(t => {
      const date = new Date(t.created_at);

      // FIXED badge colors - bg-primary/success are already white text, only warning needs text-dark
      let badgeCls, badgeLabel;
      if (t.transaction_type === 'Credit') {
        badgeCls = 'badge bg-success text-white';
        badgeLabel = 'Credit';
      } else if (t.transaction_type === 'Debit') {
        badgeCls = 'badge bg-primary text-white';
        badgeLabel = 'Debit';
      } else {
        badgeCls = 'badge bg-warning text-dark';
        badgeLabel = 'Expense';
      }

      const fuelDesc = t.description || '';
      const fuelType = fuelDesc.toLowerCase().includes('petrol') ? 'Petrol'
                     : fuelDesc.toLowerCase().includes('diesel') ? 'Diesel' : '-';

      let priceDisplay = '-';
      if (t.unit_price && parseFloat(t.unit_price) > 0) {
        priceDisplay = 'Rs. ' + fmt(t.unit_price);
      } else if (fuelType !== '-' && fuelPriceHistory.length > 0) {
        const hp = getPriceForDate(date.toISOString().split('T')[0], fuelType);
        if (hp > 0) priceDisplay = `Rs. ${fmt(hp)} <small class="text-muted">(est.)</small>`;
      }

      const isChecked = selectedForPrint.has(t.id);

      return `<tr class="${isChecked ? 'table-info' : ''}">
        <td class="text-center">
          <input type="checkbox" class="form-check-input"
            data-id="${t.id}" ${isChecked ? 'checked' : ''}
            onchange="window.togglePrintSelect(${t.id}, this.checked)">
        </td>
        <td class="text-dark">
          ${date.toLocaleDateString('en-PK')}<br>
          <small class="text-muted">${date.toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'})}</small>
        </td>
        <td class="text-dark">${t.customers?.name || 'N/A'} <small class="text-muted">(${t.customers?.sr_no || '-'})</small></td>
        <td><span class="${badgeCls}">${badgeLabel}</span></td>
        <td class="text-dark">${fuelType}</td>
        <td class="text-dark">${t.liters > 0 ? fmt(t.liters) + ' L' : '-'}</td>
        <td class="text-dark">${priceDisplay}</td>
        <td class="text-dark"><strong>Rs. ${fmt(t.amount)}</strong></td>
        <td class="text-dark" style="max-width:180px;">${t.description || '-'}</td>
        <td>
          <div class="d-flex gap-1">
            <button class="btn btn-sm btn-outline-secondary" title="Print this" onclick="window.printSingle(${t.id})">
              <i class="bi bi-printer"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" title="Delete" onclick="window.deleteTransaction(${t.id})">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  // ============================================
  // PRINT - Single & Multiple selected
  // ============================================
  window.togglePrintSelect = function(id, checked) {
    if (checked) selectedForPrint.add(id);
    else selectedForPrint.delete(id);
    const row = document.querySelector(`input[data-id="${id}"]`)?.closest('tr');
    if (row) row.className = checked ? 'table-info' : '';
    updatePrintSelectedBtn();
  };

  function updatePrintSelectedBtn() {
    let btn = $('btn-print-selected');
    if (!btn) {
      const header = document.querySelector('#tx-history-card .card-header');
      if (header) {
        btn = document.createElement('button');
        btn.id = 'btn-print-selected';
        btn.className = 'btn btn-sm btn-outline-primary';
        btn.onclick = window.printSelected;
        header.appendChild(btn);
      }
    }
    if (btn) {
      if (selectedForPrint.size > 0) {
        btn.style.display = 'inline-block';
        btn.innerHTML = `<i class="bi bi-printer me-1"></i>Print Selected (${selectedForPrint.size})`;
      } else {
        btn.style.display = 'none';
      }
    }
  }

  window.printSingle = function(id) {
    const t = allTransactions.find(x => x.id === id);
    if (!t) return;
    openPrintWindow([t]);
  };

  window.printSelected = function() {
    const toPrint = allTransactions.filter(t => selectedForPrint.has(t.id));
    if (!toPrint.length) { alert('Koi transaction select nahi ki'); return; }
    openPrintWindow(toPrint);
  };

  function openPrintWindow(transactions) {
    const company = 'Khalid & Sons Petroleum';
    const printDate = new Date().toLocaleDateString('en-PK', { day:'2-digit', month:'long', year:'numeric' });

    let totalCredit = 0, totalDebit = 0, totalExpense = 0;
    transactions.forEach(t => {
      const a = parseFloat(t.amount) || 0;
      if (t.transaction_type === 'Credit') totalCredit += a;
      else if (t.transaction_type === 'Debit') totalDebit += a;
      else totalExpense += a;
    });

    const rows = transactions.map(t => {
      const date = new Date(t.created_at);
      const desc = t.description || '';
      const fuelType = desc.toLowerCase().includes('petrol') ? 'Petrol'
                     : desc.toLowerCase().includes('diesel') ? 'Diesel' : '-';
      const liters = t.liters > 0 ? fmt(t.liters) + ' L' : '-';
      const unitPrice = t.unit_price > 0 ? 'Rs. ' + fmt(t.unit_price) : '-';
      const typeColor = t.transaction_type === 'Credit' ? '#198754' : t.transaction_type === 'Debit' ? '#0d6efd' : '#fd7e14';
      const creditAmt = t.transaction_type === 'Credit' ? 'Rs. ' + fmt(t.amount) : '-';
      const debitAmt = (t.transaction_type === 'Debit' || t.transaction_type === 'Expense') ? 'Rs. ' + fmt(t.amount) : '-';

      return `<tr>
        <td>${date.toLocaleDateString('en-PK')}<br><small style="color:#888">${date.toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'})}</small></td>
        <td>${t.customers?.name || 'N/A'}<br><small style="color:#888">#${t.customers?.sr_no || '-'}</small></td>
        <td><span style="color:${typeColor};font-weight:700;">${t.transaction_type}</span></td>
        <td>${fuelType}</td>
        <td style="text-align:center;">${liters}</td>
        <td style="text-align:right;">${unitPrice}</td>
        <td style="text-align:right;font-weight:700;">Rs. ${fmt(t.amount)}</td>
        <td style="text-align:right;color:#198754;font-weight:600;">${creditAmt}</td>
        <td style="text-align:right;color:#0d6efd;font-weight:600;">${debitAmt}</td>
        <td style="max-width:150px;word-break:break-word;">${desc}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Receipt - ${company}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',Arial,sans-serif; font-size:12px; color:#1a1a1a; background:#fff; }
  .page { max-width:940px; margin:0 auto; padding:24px; }

  .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #0d6efd; padding-bottom:12px; margin-bottom:16px; }
  .header-left h1 { font-size:20px; color:#0d6efd; font-weight:700; }
  .header-left p { font-size:11px; color:#666; margin-top:2px; }
  .header-right { text-align:right; font-size:11px; color:#555; line-height:1.8; }
  .header-right strong { display:block; font-size:13px; color:#1a1a1a; }

  .summary { display:flex; gap:10px; margin-bottom:16px; }
  .sbox { flex:1; border-radius:8px; padding:10px 14px; text-align:center; }
  .sbox .slabel { font-size:10px; text-transform:uppercase; letter-spacing:0.5px; color:#666; }
  .sbox .sval { font-size:15px; font-weight:700; margin-top:3px; }
  .sbox.cr { background:#f0fdf4; border:1px solid #86efac; }
  .sbox.cr .sval { color:#198754; }
  .sbox.db { background:#eff6ff; border:1px solid #93c5fd; }
  .sbox.db .sval { color:#0d6efd; }
  .sbox.ex { background:#fff7ed; border:1px solid #fdba74; }
  .sbox.ex .sval { color:#ea580c; }
  .sbox.nt { background:#f8fafc; border:1px solid #cbd5e1; }
  .sbox.nt .sval { color:#1a1a1a; }

  table { width:100%; border-collapse:collapse; margin-bottom:20px; }
  thead tr { background:#0d6efd; }
  thead th { color:#fff; padding:7px 8px; font-size:11px; font-weight:600; text-align:left; }
  tbody tr:nth-child(even) { background:#f8fafc; }
  tbody tr { border-bottom:1px solid #e2e8f0; }
  td { padding:6px 8px; font-size:11px; vertical-align:top; }
  tfoot tr { background:#eef2ff; border-top:2px solid #0d6efd; font-weight:700; }
  tfoot td { padding:7px 8px; font-size:12px; }

  .sig-row { display:flex; justify-content:space-between; margin-top:40px; }
  .sig { text-align:center; }
  .sig-line { border-top:1px solid #333; width:160px; padding-top:5px; font-size:10px; color:#555; }

  .footer { margin-top:16px; border-top:1px solid #e2e8f0; padding-top:8px; display:flex; justify-content:space-between; font-size:10px; color:#999; }

  @media print {
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    thead tr { background:#0d6efd !important; }
    thead th { color:#fff !important; }
  }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="header-left">
      <h1>⛽ ${company}</h1>
      <p>Transaction Receipt / Khata Raseed</p>
    </div>
    <div class="header-right">
      <strong>Print Date: ${printDate}</strong>
      Total Entries: ${transactions.length}<br>
      Generated: ${new Date().toLocaleTimeString('en-PK')}
    </div>
  </div>

  <div class="summary">
    <div class="sbox cr">
      <div class="slabel">Credit (Sales)</div>
      <div class="sval">Rs. ${fmt(totalCredit)}</div>
    </div>
    <div class="sbox db">
      <div class="slabel">Debit (Received)</div>
      <div class="sval">Rs. ${fmt(totalDebit)}</div>
    </div>
    <div class="sbox ex">
      <div class="slabel">Expense</div>
      <div class="sval">Rs. ${fmt(totalExpense)}</div>
    </div>
    <div class="sbox nt">
      <div class="slabel">Net Balance</div>
      <div class="sval">Rs. ${fmt(totalCredit - totalDebit - totalExpense)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date / Time</th>
        <th>Customer</th>
        <th>Type</th>
        <th>Fuel</th>
        <th style="text-align:center;">Qty (L)</th>
        <th style="text-align:right;">Rate/L</th>
        <th style="text-align:right;">Amount</th>
        <th style="text-align:right;">Credit</th>
        <th style="text-align:right;">Debit/Exp</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="6" style="text-align:right;">TOTALS:</td>
        <td style="text-align:right;">Rs. ${fmt(totalCredit + totalDebit + totalExpense)}</td>
        <td style="text-align:right;color:#198754;">Rs. ${fmt(totalCredit)}</td>
        <td style="text-align:right;color:#0d6efd;">Rs. ${fmt(totalDebit + totalExpense)}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>

  <div class="sig-row">
    <div class="sig"><div class="sig-line">Authorized Signature</div></div>
    <div class="sig"><div class="sig-line">Customer Signature</div></div>
    <div class="sig"><div class="sig-line">Accountant</div></div>
  </div>

  <div class="footer">
    <span>${company} — Official Receipt</span>
    <span>Generated: ${new Date().toLocaleString('en-PK')}</span>
  </div>

</div>
<script>window.onload = function(){ window.print(); };<\/script>
</body>
</html>`;

    const w = window.open('', '_blank', 'width=980,height=720');
    if (w) { w.document.write(html); w.document.close(); }
    else alert('Popup blocked! Browser settings mein popup allow karein.');
  }

  // ============================================
  // FILTERS
  // ============================================
  window.applyFilters = function () {
    const type = $('filter-type')?.value;
    const from = $('filter-date-from')?.value;
    const to = $('filter-date-to')?.value;
    filteredTransactions = allTransactions.filter(t => {
      if (type && t.transaction_type !== type) return false;
      if (from && new Date(t.created_at) < new Date(from)) return false;
      if (to && new Date(t.created_at) > new Date(to + 'T23:59:59')) return false;
      return true;
    });
    currentPage = 1;
    renderPage();
    updateSummaryCards(filteredTransactions);
  };

  window.clearTransactionFilters = function () {
    if ($('filter-type')) $('filter-type').value = '';
    if ($('filter-date-from')) $('filter-date-from').value = '';
    if ($('filter-date-to')) $('filter-date-to').value = '';
    filteredTransactions = [...allTransactions];
    currentPage = 1;
    renderPage();
    updateSummaryCards(allTransactions);
  };

  // ============================================
  // FORM HANDLERS
  // ============================================
  async function handleNewSale() {
    const customerId = $('sale-customer')?.value;
    const fuelType = $('sale-fuel-type')?.value;
    const liters = parseFloat($('sale-liters')?.value) || 0;
    const unitPrice = parseFloat($('sale-unit-price')?.value) || 0;
    const amount = parseFloat($('sale-amount')?.value) || 0;
    const paymentType = $('sale-payment-type')?.value || 'cash';
    const description = $('sale-description')?.value || '';

    if (!customerId) { alert('Customer select karein'); return; }
    if (!fuelType) { alert('Fuel type select karein'); return; }
    if (!amount) { alert('Amount enter karein'); return; }

    try {
      const { error } = await supabase.from('transactions').insert([{
        customer_id: parseInt(customerId),
        transaction_type: paymentType === 'cash' ? 'Debit' : 'Credit',
        amount, liters: liters || null, unit_price: unitPrice || null,
        description: `${fuelType} sale${description ? ' - ' + description : ''}`
      }]);
      if (error) throw error;
      showToast('success', 'Kamyab!', `Sale Rs.${fmt(amount)} record ho gayi!`);
      closeModal('newSaleModal');
      await loadInitialTransactions();
    } catch (err) { alert('Error: ' + err.message); }
  }

  async function handleVasooli() {
    const customerId = $('vasooli-customer')?.value;
    const amount = parseFloat($('vasooli-amount')?.value) || 0;
    const month = $('vasooli-month')?.value || '';
    const fuelCat = $('vasooli-fuel-category')?.value || '';
    const description = $('vasooli-description')?.value || '';

    if (!customerId) { alert('Customer select karein'); return; }
    if (!amount) { alert('Amount enter karein'); return; }

    let desc = 'Payment received';
    if (month) { const d = new Date(month+'-01'); desc = `Payment for ${d.toLocaleDateString('en-US',{month:'long',year:'numeric'})}`; }
    if (fuelCat) desc += ` (${fuelCat})`;
    if (description) desc += ` - ${description}`;

    try {
      const { error } = await supabase.from('transactions').insert([{
        customer_id: parseInt(customerId), transaction_type: 'Debit', amount, description: desc
      }]);
      if (error) throw error;
      showToast('success', 'Kamyab!', 'Payment record ho gayi!');
      closeModal('vasooliModal');
      await loadInitialTransactions();
    } catch (err) { alert('Error: ' + err.message); }
  }

  async function handleExpense() {
    const amount = parseFloat($('expense-amount')?.value) || 0;
    const description = $('expense-description')?.value;
    const expenseType = $('expense-type')?.value;
    const account = $('expense-account')?.value;

    if (!amount) { alert('Amount enter karein'); return; }
    if (!description) { alert('Description enter karein'); return; }
    if (!expenseType) { alert('Type select karein'); return; }
    if (!account) { alert('Account select karein'); return; }

    try {
      let customerId = null;
      const { data: owner } = await supabase.from('customers').select('id').eq('category','Owner').maybeSingle();
      if (owner) { customerId = owner.id; }
      else {
        const { data: no, error: ce } = await supabase.from('customers')
          .insert([{sr_no:0,name:'Owner',category:'Owner',balance:0}]).select().single();
        if (ce) throw ce;
        customerId = no.id;
      }
      const { error } = await supabase.from('transactions').insert([{
        customer_id: customerId, transaction_type: 'Expense', amount,
        description: `${expenseType}: ${description} (From: ${account})`
      }]);
      if (error) throw error;
      showToast('success', 'Kamyab!', 'Expense record ho gaya!');
      closeModal('expenseModal');
      await loadInitialTransactions();
    } catch (err) { alert('Error: ' + err.message); }
  }

  window.deleteTransaction = async function (id) {
    if (!confirm('Delete karein?')) return;
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      showToast('success', 'Delete', 'Transaction delete ho gaya!');
      await loadInitialTransactions();
    } catch (err) { alert('Error: ' + err.message); }
  };

  // ============================================
  // PRICE FUNCTIONS
  // ============================================
  window.updateSaleFuelPrice = function () {
    const fuel = $('sale-fuel-type')?.value;
    if (!fuel) return;
    const price = window.fuelPrices[fuel] || 0;
    if ($('sale-unit-price')) $('sale-unit-price').value = price;
    const src = $('sale-price-source');
    if (src) {
      if (price > 0) { src.textContent = `Settings se: ${fuel} = Rs. ${price}`; src.className = 'text-success small'; }
      else { src.textContent = '⚠️ Settings page par price set karein'; src.className = 'text-danger small fw-bold'; }
    }
    window.calcSaleFromLiters();
  };

  window.calcSaleFromLiters = function () {
    const liters = parseFloat($('sale-liters')?.value) || 0;
    const rate = parseFloat($('sale-unit-price')?.value) || 0;
    if ($('sale-amount')) $('sale-amount').value = (liters > 0 && rate > 0) ? (liters * rate).toFixed(2) : '';
  };

  window.calcSaleFromAmount = function () {
    const amount = parseFloat($('sale-amount-direct')?.value) || 0;
    const rate = parseFloat($('sale-unit-price')?.value) || 0;
    if ($('sale-amount')) $('sale-amount').value = amount > 0 ? amount.toFixed(2) : '';
    if ($('sale-liters') && rate > 0 && amount > 0) $('sale-liters').value = (amount / rate).toFixed(2);
  };

  window.toggleSaleMethod = function (method) {
    const lSec = $('sale-liters-section'), aSec = $('sale-amount-section');
    if (method === 'liters') { if(lSec) lSec.style.display='block'; if(aSec) aSec.style.display='none'; }
    else { if(lSec) lSec.style.display='none'; if(aSec) aSec.style.display='block'; }
  };

  window.calculateVasooliAmount = function () {
    const fuel = $('vasooli-fuel-category')?.value;
    const liters = parseFloat($('vasooli-liters')?.value) || 0;
    if (!fuel || !liters) return;
    if ($('vasooli-amount')) $('vasooli-amount').value = (liters * (window.fuelPrices[fuel]||0)).toFixed(2);
  };

  // ============================================
  // HELPERS
  // ============================================
  function closeModal(modalId) {
    const el = $(modalId);
    if (el) { const m = bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el); m.hide(); }
    const form = document.querySelector(`#${modalId} form`);
    if (form) form.reset();
    if (modalId === 'newSaleModal') {
      if ($('sale-unit-price')) $('sale-unit-price').value = '';
      if ($('sale-amount')) $('sale-amount').value = '';
    }
  }

  function showToast(type, title, message) {
    const toastEl = $('liveToast');
    if (!toastEl) { console.log(title, message); return; }
    if ($('toast-title')) $('toast-title').textContent = title;
    if ($('toast-message')) $('toast-message').textContent = message;
    toastEl.className = `toast ${type==='success'?'bg-success text-white':type==='warning'?'bg-warning text-dark':'bg-danger text-white'}`;
    new bootstrap.Toast(toastEl, { delay: 3500 }).show();
  }

  // ============================================
  // EVENT LISTENERS
  // ============================================
  function setupEventListeners() {
    const saleForm = $('newSaleForm');
    if (saleForm) saleForm.addEventListener('submit', e => { e.preventDefault(); handleNewSale(); });

    const vasooliForm = $('vasooliForm');
    if (vasooliForm) vasooliForm.addEventListener('submit', e => { e.preventDefault(); handleVasooli(); });

    const expenseForm = $('expenseForm');
    if (expenseForm) expenseForm.addEventListener('submit', e => { e.preventDefault(); handleExpense(); });

    const fuelSel = $('sale-fuel-type');
    if (fuelSel) fuelSel.addEventListener('change', window.updateSaleFuelPrice);

    const litersIn = $('sale-liters');
    if (litersIn) litersIn.addEventListener('input', window.calcSaleFromLiters);

    const amtDirect = $('sale-amount-direct');
    if (amtDirect) amtDirect.addEventListener('input', window.calcSaleFromAmount);

    const lblL = $('lbl-by-liters'), lblA = $('lbl-by-amount');
    if (lblL) lblL.addEventListener('click', () => window.toggleSaleMethod('liters'));
    if (lblA) lblA.addEventListener('click', () => window.toggleSaleMethod('amount'));

    const vasFuel = $('vasooli-fuel-category'), vasL = $('vasooli-liters');
    if (vasFuel) vasFuel.addEventListener('change', window.calculateVasooliAmount);
    if (vasL) vasL.addEventListener('input', window.calculateVasooliAmount);

    const btnApply = $('btn-apply-filter'), btnClear = $('btn-clear-filter');
    if (btnApply) btnApply.addEventListener('click', window.applyFilters);
    if (btnClear) btnClear.addEventListener('click', window.clearTransactionFilters);
  }

  // ============================================
  // INIT
  // ============================================
  document.addEventListener('DOMContentLoaded', async () => {
    if (document.body.getAttribute('data-page') !== 'transactions') return;
    console.log('Transactions initializing...');
    await loadFuelPricesFromSettings();
    await loadCustomers();
    await loadInitialTransactions();
    setupEventListeners();
    console.log('Ready!');
  });

  window.loadInitialTransactions = loadInitialTransactions;

})();

// again change and redubliction control 

// ============================================
// // TRANSACTIONS-COMPLETE.js - FINAL VERSION
// // Fixes: 404, duplicate display, pagination, text colors, price from settings
// // ============================================
// (function () {
//   'use strict';

//   const supabase = window.supabaseClient;
//   let allTransactions = [];
//   let allCustomers = [];
//   let fuelPriceHistory = [];
//   window.fuelPrices = { Petrol: 0, Diesel: 0 };

//   // Pagination state
//   let currentPage = 1;
//   let pageSize = 25;
//   let filteredTransactions = [];

//   function $(id) { return document.getElementById(id); }

//   function fmt(num) {
//     return Number(num || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
//   }

//   // ============================================
//   // FUEL PRICES FROM SETTINGS
//   // ============================================
//   async function loadFuelPricesFromSettings() {
//     try {
//       const { data, error } = await supabase
//         .from('settings')
//         .select('price_history')
//         .limit(10);

//       if (error) { console.error('Settings error:', error.message); return; }
//       if (!data || data.length === 0) {
//         showToast('warning', 'Settings', 'Settings page par fuel prices set karein!');
//         return;
//       }

//       let allHistory = [];
//       data.forEach(row => {
//         if (row.price_history && Array.isArray(row.price_history)) {
//           allHistory = allHistory.concat(row.price_history);
//         }
//       });

//       // Deduplicate by date
//       const seen = new Set();
//       fuelPriceHistory = allHistory
//         .sort((a, b) => new Date(b.date) - new Date(a.date))
//         .filter(e => { if (seen.has(e.date)) return false; seen.add(e.date); return true; });

//       if (fuelPriceHistory.length > 0) {
//         const today = new Date().toISOString().split('T')[0];
//         window.fuelPrices.Petrol = getPriceForDate(today, 'Petrol');
//         window.fuelPrices.Diesel = getPriceForDate(today, 'Diesel');
//         console.log('✅ Fuel prices:', window.fuelPrices);

//         const src = $('sale-price-source');
//         if (src) {
//           src.textContent = `Settings se: Petrol Rs.${window.fuelPrices.Petrol} | Diesel Rs.${window.fuelPrices.Diesel}`;
//           src.className = 'text-success small';
//         }
//       } else {
//         showToast('warning', 'Settings', 'Settings page par fuel prices set karein!');
//       }
//     } catch (err) {
//       console.error('loadFuelPrices error:', err);
//     }
//   }

//   function getPriceForDate(dateStr, fuelType) {
//     if (!fuelPriceHistory.length) return window.fuelPrices[fuelType] || 0;
//     const target = new Date(dateStr);
//     const sorted = [...fuelPriceHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
//     const entry = sorted.find(e => new Date(e.date) <= target) || sorted[sorted.length - 1];
//     return fuelType === 'Petrol' ? parseFloat(entry.petrol) : parseFloat(entry.diesel);
//   }

//   // ============================================
//   // LOAD DATA
//   // ============================================
//   async function loadInitialTransactions() {
//     try {
//       const { data, error } = await supabase
//         .from('transactions')
//         .select('*, customers!inner(name, sr_no)')
//         .order('created_at', { ascending: false });

//       if (error) throw error;
//       allTransactions = data || [];
//       filteredTransactions = [...allTransactions];
//       currentPage = 1;
//       console.log('✅ Transactions loaded:', allTransactions.length);
//       renderPage();
//       updateSummaryCards(allTransactions);
//     } catch (err) {
//       console.error('Error loading transactions:', err);
//     }
//   }

//   async function loadCustomers() {
//     try {
//       const { data, error } = await supabase.from('customers').select('*').order('sr_no');
//       if (error) throw error;
//       allCustomers = data || [];
//       populateCustomerDropdowns();
//     } catch (err) {
//       console.error('Error loading customers:', err);
//     }
//   }

//   function populateCustomerDropdowns() {
//     if ($('sale-customer')) {
//       $('sale-customer').innerHTML = '<option value="">Select Customer</option>' +
//         allCustomers.map(c => `<option value="${c.id}">${c.sr_no} - ${c.name}</option>`).join('');
//     }
//     if ($('vasooli-customer')) {
//       $('vasooli-customer').innerHTML = '<option value="">Select Customer</option>' +
//         allCustomers.filter(c => c.category !== 'Owner')
//           .map(c => `<option value="${c.id}">${c.sr_no} - ${c.name}</option>`).join('');
//     }
//   }

//   // ============================================
//   // PAGINATION & RENDER
//   // ============================================
//   function renderPage() {
//     const total = filteredTransactions.length;
//     const totalPages = Math.max(1, Math.ceil(total / pageSize));
//     if (currentPage > totalPages) currentPage = totalPages;

//     const start = (currentPage - 1) * pageSize;
//     const end = Math.min(start + pageSize, total);
//     const pageData = filteredTransactions.slice(start, end);

//     displayTransactions(pageData);
//     updateTransactionCount(total, start + 1, end);
//     renderPagination(total, totalPages);
//   }

//   function updateTransactionCount(total, from, to) {
//     const el = $('transaction-count');
//     if (el) el.textContent = total > 0 ? `${from}-${to} of ${total} transactions` : '0 transactions';
//   }

//   function renderPagination(total, totalPages) {
//     let container = $('pagination-container');
//     if (!container) {
//       // transactions-table ke parent card mein append karo
//       const tbody = $('transactions-table');
//       const tableCard = document.getElementById('tx-history-card');
//       if (tableCard) {
//         const div = document.createElement('div');
//         div.id = 'pagination-container';
//         div.className = 'card-footer bg-white d-flex justify-content-between align-items-center flex-wrap gap-2 py-2 px-3';
//         tableCard.appendChild(div);
//         container = div;
//       }
//     }
//     if (!container) return;

//     // Page size selector + pagination buttons
//     const startNum = Math.min((currentPage - 1) * pageSize + 1, total);
//     const endNum = Math.min(currentPage * pageSize, total);

//     let pagesHtml = '';
//     const maxButtons = 5;
//     let startPage = Math.max(1, currentPage - 2);
//     let endPage = Math.min(totalPages, startPage + maxButtons - 1);
//     if (endPage - startPage < maxButtons - 1) startPage = Math.max(1, endPage - maxButtons + 1);

//     for (let i = startPage; i <= endPage; i++) {
//       pagesHtml += `<button class="btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-outline-secondary'} px-2 py-1" onclick="window.goToPage(${i})">${i}</button>`;
//     }

//     container.innerHTML = `
//       <div class="d-flex align-items-center gap-2">
//         <span class="text-muted small">Show:</span>
//         <select class="form-select form-select-sm" style="width:75px" onchange="window.changePageSize(this.value)">
//           <option value="10" ${pageSize===10?'selected':''}>10</option>
//           <option value="25" ${pageSize===25?'selected':''}>25</option>
//           <option value="50" ${pageSize===50?'selected':''}>50</option>
//           <option value="100" ${pageSize===100?'selected':''}>100</option>
//         </select>
//         <span class="text-muted small">${total > 0 ? startNum+'-'+endNum+' of '+total : '0'}</span>
//       </div>
//       <div class="d-flex align-items-center gap-1">
//         <button class="btn btn-sm btn-outline-secondary px-2 py-1" onclick="window.goToPage(1)" ${currentPage===1?'disabled':''}>«</button>
//         <button class="btn btn-sm btn-outline-secondary px-2 py-1" onclick="window.goToPage(${currentPage-1})" ${currentPage===1?'disabled':''}>‹</button>
//         ${pagesHtml}
//         <button class="btn btn-sm btn-outline-secondary px-2 py-1" onclick="window.goToPage(${currentPage+1})" ${currentPage===totalPages?'disabled':''}>›</button>
//         <button class="btn btn-sm btn-outline-secondary px-2 py-1" onclick="window.goToPage(${totalPages})" ${currentPage===totalPages?'disabled':''}>»</button>
//       </div>`;
//   }

//   window.goToPage = function(page) {
//     const totalPages = Math.ceil(filteredTransactions.length / pageSize);
//     currentPage = Math.max(1, Math.min(page, totalPages));
//     renderPage();
//   };

//   window.changePageSize = function(size) {
//     pageSize = parseInt(size);
//     currentPage = 1;
//     renderPage();
//   };

//   // ============================================
//   // DISPLAY TRANSACTIONS - Fixed colors & duplicates
//   // ============================================
//   function updateSummaryCards(transactions) {
//     let credit = 0, debit = 0, expense = 0;
//     let creditCount = 0, debitCount = 0, expenseCount = 0;

//     transactions.forEach(t => {
//       const amt = parseFloat(t.amount) || 0;
//       if (t.transaction_type === 'Credit') { credit += amt; creditCount++; }
//       else if (t.transaction_type === 'Debit') { debit += amt; debitCount++; }
//       else if (t.transaction_type === 'Expense') { expense += amt; expenseCount++; }
//     });

//     if ($('total-credit')) $('total-credit').textContent = 'Rs. ' + fmt(credit);
//     if ($('credit-count')) $('credit-count').textContent = creditCount + ' transactions';
//     if ($('total-debit')) $('total-debit').textContent = 'Rs. ' + fmt(debit);
//     if ($('debit-count')) $('debit-count').textContent = debitCount + ' transactions';
//     if ($('total-expense')) $('total-expense').textContent = 'Rs. ' + fmt(expense);
//     if ($('expense-count')) $('expense-count').textContent = expenseCount + ' transactions';
//     if ($('net-balance')) $('net-balance').textContent = 'Rs. ' + fmt(credit - expense);
//   }

//   function displayTransactions(transactions) {
//     const tbody = $('transactions-table');
//     if (!tbody) return;

//     if (!transactions || transactions.length === 0) {
//       tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-muted">Koi transaction nahi mila</td></tr>';
//       return;
//     }

//     tbody.innerHTML = transactions.map(t => {
//       const date = new Date(t.created_at);
//       // Fixed badge colors with proper text
//       const typeInfo = t.transaction_type === 'Credit'
//         ? { cls: 'bg-success text-white', label: 'Credit' }
//         : t.transaction_type === 'Debit'
//         ? { cls: 'bg-primary text-white', label: 'Debit' }
//         : { cls: 'bg-warning text-dark', label: 'Expense' };

//       const fuelDesc = t.description || '';
//       const fuelType = fuelDesc.includes('Petrol') ? 'Petrol' : fuelDesc.includes('Diesel') ? 'Diesel' : '-';

//       // Price: saved unit_price OR history estimate
//       let priceDisplay = '-';
//       if (t.unit_price && parseFloat(t.unit_price) > 0) {
//         priceDisplay = 'Rs. ' + fmt(t.unit_price);
//       } else if (fuelType !== '-' && fuelPriceHistory.length > 0) {
//         const txDate = date.toISOString().split('T')[0];
//         const hp = getPriceForDate(txDate, fuelType);
//         if (hp > 0) priceDisplay = `<span class="text-muted small">Rs. ${fmt(hp)}<br><small>(est.)</small></span>`;
//       }

//       return `<tr>
//         <td class="text-dark">
//           ${date.toLocaleDateString('en-PK')}<br>
//           <small class="text-muted">${date.toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'})}</small>
//         </td>
//         <td class="text-dark">${t.customers?.name || 'N/A'} <small class="text-muted">(${t.customers?.sr_no || '-'})</small></td>
//         <td><span class="badge ${typeInfo.cls}">${typeInfo.label}</span></td>
//         <td class="text-dark">${fuelType}</td>
//         <td class="text-dark">${(t.liters > 0) ? fmt(t.liters) + ' L' : '-'}</td>
//         <td>${priceDisplay}</td>
//         <td class="text-dark"><strong>Rs. ${fmt(t.amount)}</strong></td>
//         <td class="text-dark">${t.description || '-'}</td>
//         <td>
//           <button class="btn btn-sm btn-outline-danger" onclick="window.deleteTransaction(${t.id})">
//             <i class="bi bi-trash"></i>
//           </button>
//         </td>
//       </tr>`;
//     }).join('');
//   }

//   // ============================================
//   // PRICE FUNCTIONS
//   // ============================================
//   window.updateSaleFuelPrice = function () {
//     const fuel = $('sale-fuel-type')?.value;
//     if (!fuel) return;
//     const price = window.fuelPrices[fuel] || 0;
//     if ($('sale-unit-price')) $('sale-unit-price').value = price;
//     const src = $('sale-price-source');
//     if (src) {
//       if (price > 0) { src.textContent = `Settings se: ${fuel} = Rs. ${price}`; src.className = 'text-success small'; }
//       else { src.textContent = '⚠️ Settings page par price set karein'; src.className = 'text-danger small fw-bold'; }
//     }
//     window.calcSaleFromLiters();
//   };

//   window.calcSaleFromLiters = function () {
//     const liters = parseFloat($('sale-liters')?.value) || 0;
//     const rate = parseFloat($('sale-unit-price')?.value) || 0;
//     if ($('sale-amount')) $('sale-amount').value = (liters > 0 && rate > 0) ? (liters * rate).toFixed(2) : '';
//   };

//   window.calcSaleFromAmount = function () {
//     const amount = parseFloat($('sale-amount-direct')?.value) || 0;
//     const rate = parseFloat($('sale-unit-price')?.value) || 0;
//     if ($('sale-amount')) $('sale-amount').value = amount > 0 ? amount.toFixed(2) : '';
//     if ($('sale-liters') && rate > 0 && amount > 0) $('sale-liters').value = (amount / rate).toFixed(2);
//   };

//   window.toggleSaleMethod = function (method) {
//     const lSec = $('sale-liters-section'), aSec = $('sale-amount-section');
//     if (method === 'liters') { if(lSec) lSec.style.display='block'; if(aSec) aSec.style.display='none'; }
//     else { if(lSec) lSec.style.display='none'; if(aSec) aSec.style.display='block'; }
//   };

//   window.calculateVasooliAmount = function () {
//     const fuel = $('vasooli-fuel-category')?.value;
//     const liters = parseFloat($('vasooli-liters')?.value) || 0;
//     if (!fuel || !liters) return;
//     if ($('vasooli-amount')) $('vasooli-amount').value = (liters * (window.fuelPrices[fuel]||0)).toFixed(2);
//   };

//   // ============================================
//   // FILTERS
//   // ============================================
//   window.applyFilters = function () {
//     const type = $('filter-type')?.value;
//     const from = $('filter-date-from')?.value;
//     const to = $('filter-date-to')?.value;
//     filteredTransactions = allTransactions.filter(t => {
//       if (type && t.transaction_type !== type) return false;
//       if (from && new Date(t.created_at) < new Date(from)) return false;
//       if (to && new Date(t.created_at) > new Date(to + 'T23:59:59')) return false;
//       return true;
//     });
//     currentPage = 1;
//     renderPage();
//     updateSummaryCards(filteredTransactions);
//   };

//   window.clearTransactionFilters = function () {
//     if ($('filter-type')) $('filter-type').value = '';
//     if ($('filter-date-from')) $('filter-date-from').value = '';
//     if ($('filter-date-to')) $('filter-date-to').value = '';
//     filteredTransactions = [...allTransactions];
//     currentPage = 1;
//     renderPage();
//     updateSummaryCards(allTransactions);
//   };

//   // ============================================
//   // FORM HANDLERS
//   // ============================================
//   async function handleNewSale() {
//     const customerId = $('sale-customer')?.value;
//     const fuelType = $('sale-fuel-type')?.value;
//     const liters = parseFloat($('sale-liters')?.value) || 0;
//     const unitPrice = parseFloat($('sale-unit-price')?.value) || 0;
//     const amount = parseFloat($('sale-amount')?.value) || 0;
//     const paymentType = $('sale-payment-type')?.value || 'cash';
//     const description = $('sale-description')?.value || '';

//     if (!customerId) { alert('Customer select karein'); return; }
//     if (!fuelType) { alert('Fuel type select karein'); return; }
//     if (!amount) { alert('Amount enter karein'); return; }

//     try {
//       const { error } = await supabase.from('transactions').insert([{
//         customer_id: parseInt(customerId),
//         transaction_type: paymentType === 'cash' ? 'Debit' : 'Credit',
//         amount, liters: liters || null, unit_price: unitPrice || null,
//         description: `${fuelType} sale${description ? ' - ' + description : ''}`
//       }]);
//       if (error) throw error;
//       showToast('success', 'Kamyab!', `Sale Rs.${fmt(amount)} record ho gayi!`);
//       closeModal('newSaleModal');
//       await loadInitialTransactions();
//     } catch (err) { alert('Error: ' + err.message); }
//   }

//   async function handleVasooli() {
//     const customerId = $('vasooli-customer')?.value;
//     const amount = parseFloat($('vasooli-amount')?.value) || 0;
//     const month = $('vasooli-month')?.value || '';
//     const fuelCat = $('vasooli-fuel-category')?.value || '';
//     const description = $('vasooli-description')?.value || '';

//     if (!customerId) { alert('Customer select karein'); return; }
//     if (!amount) { alert('Amount enter karein'); return; }

//     let desc = 'Payment received';
//     if (month) { const d = new Date(month+'-01'); desc = `Payment for ${d.toLocaleDateString('en-US',{month:'long',year:'numeric'})}`; }
//     if (fuelCat) desc += ` (${fuelCat})`;
//     if (description) desc += ` - ${description}`;

//     try {
//       const { error } = await supabase.from('transactions').insert([{
//         customer_id: parseInt(customerId), transaction_type: 'Debit', amount, description: desc
//       }]);
//       if (error) throw error;
//       showToast('success', 'Kamyab!', 'Payment record ho gayi!');
//       closeModal('vasooliModal');
//       await loadInitialTransactions();
//     } catch (err) { alert('Error: ' + err.message); }
//   }

//   async function handleExpense() {
//     const amount = parseFloat($('expense-amount')?.value) || 0;
//     const description = $('expense-description')?.value;
//     const expenseType = $('expense-type')?.value;
//     const account = $('expense-account')?.value;

//     if (!amount) { alert('Amount enter karein'); return; }
//     if (!description) { alert('Description enter karein'); return; }
//     if (!expenseType) { alert('Type select karein'); return; }
//     if (!account) { alert('Account select karein'); return; }

//     try {
//       let customerId = null;
//       const { data: owner } = await supabase.from('customers').select('id').eq('category','Owner').maybeSingle();
//       if (owner) { customerId = owner.id; }
//       else {
//         const { data: no, error: ce } = await supabase.from('customers')
//           .insert([{sr_no:0,name:'Owner',category:'Owner',balance:0}]).select().single();
//         if (ce) throw ce;
//         customerId = no.id;
//       }
//       const { error } = await supabase.from('transactions').insert([{
//         customer_id: customerId, transaction_type: 'Expense', amount,
//         description: `${expenseType}: ${description} (From: ${account})`
//       }]);
//       if (error) throw error;
//       showToast('success', 'Kamyab!', 'Expense record ho gaya!');
//       closeModal('expenseModal');
//       await loadInitialTransactions();
//     } catch (err) { alert('Error: ' + err.message); }
//   }

//   window.deleteTransaction = async function (id) {
//     if (!confirm('Delete karein?')) return;
//     try {
//       const { error } = await supabase.from('transactions').delete().eq('id', id);
//       if (error) throw error;
//       showToast('success', 'Delete', 'Transaction delete ho gaya!');
//       await loadInitialTransactions();
//     } catch (err) { alert('Error: ' + err.message); }
//   };

//   // ============================================
//   // HELPERS
//   // ============================================
//   function closeModal(modalId) {
//     const el = $(modalId);
//     if (el) { const m = bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el); m.hide(); }
//     const form = document.querySelector(`#${modalId} form`);
//     if (form) form.reset();
//     if (modalId === 'newSaleModal') {
//       if ($('sale-unit-price')) $('sale-unit-price').value = '';
//       if ($('sale-amount')) $('sale-amount').value = '';
//     }
//   }

//   function showToast(type, title, message) {
//     const toastEl = $('liveToast');
//     if (!toastEl) { console.log(title, message); return; }
//     if ($('toast-title')) $('toast-title').textContent = title;
//     if ($('toast-message')) $('toast-message').textContent = message;
//     toastEl.className = `toast ${type==='success'?'bg-success text-white':type==='warning'?'bg-warning text-dark':'bg-danger text-white'}`;
//     new bootstrap.Toast(toastEl, { delay: 3500 }).show();
//   }

//   // ============================================
//   // EVENT LISTENERS
//   // ============================================
//   function setupEventListeners() {
//     const saleForm = $('newSaleForm');
//     if (saleForm) saleForm.addEventListener('submit', e => { e.preventDefault(); handleNewSale(); });

//     const vasooliForm = $('vasooliForm');
//     if (vasooliForm) vasooliForm.addEventListener('submit', e => { e.preventDefault(); handleVasooli(); });

//     const expenseForm = $('expenseForm');
//     if (expenseForm) expenseForm.addEventListener('submit', e => { e.preventDefault(); handleExpense(); });

//     const fuelSel = $('sale-fuel-type');
//     if (fuelSel) fuelSel.addEventListener('change', window.updateSaleFuelPrice);

//     const litersIn = $('sale-liters');
//     if (litersIn) litersIn.addEventListener('input', window.calcSaleFromLiters);

//     const amtDirect = $('sale-amount-direct');
//     if (amtDirect) amtDirect.addEventListener('input', window.calcSaleFromAmount);

//     const lblL = $('lbl-by-liters'), lblA = $('lbl-by-amount');
//     if (lblL) lblL.addEventListener('click', () => window.toggleSaleMethod('liters'));
//     if (lblA) lblA.addEventListener('click', () => window.toggleSaleMethod('amount'));

//     const vasFuel = $('vasooli-fuel-category'), vasL = $('vasooli-liters');
//     if (vasFuel) vasFuel.addEventListener('change', window.calculateVasooliAmount);
//     if (vasL) vasL.addEventListener('input', window.calculateVasooliAmount);

//     const btnApply = $('btn-apply-filter'), btnClear = $('btn-clear-filter');
//     if (btnApply) btnApply.addEventListener('click', window.applyFilters);
//     if (btnClear) btnClear.addEventListener('click', window.clearTransactionFilters);
//   }

//   // ============================================
//   // INIT
//   // ============================================
//   document.addEventListener('DOMContentLoaded', async () => {
//     if (document.body.getAttribute('data-page') !== 'transactions') return;
//     console.log('🚀 Transactions initializing...');
//     await loadFuelPricesFromSettings();
//     await loadCustomers();
//     await loadInitialTransactions();
//     setupEventListeners();
//     console.log('✅ Ready!');
//   });

//   window.loadInitialTransactions = loadInitialTransactions;

// })();