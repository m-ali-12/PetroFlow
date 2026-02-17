// =============================================
// TRANSACTIONS PAGE - COMPLETE FIXED VERSION
// No inline handlers. Auth waits properly.
// =============================================
(function () {
  'use strict';

  const supabase = window.supabaseClient;

  let allTransactions  = [];
  let filteredList     = [];
  let allCustomers     = [];
  let isSubmitting     = false;
  let fuelPrices       = { Petrol: 285, Diesel: 305 };
  let currentUserId    = null;

  // Pagination
  let currentPage  = 1;
  let itemsPerPage = 10;
  let sortOrder    = 'desc';

  function $(id) { return document.getElementById(id); }

  function fmt(n) {
    return Number(n || 0).toLocaleString('en-PK', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  }

  // ─────────────────────────────────────────
  // 1. AUTH — wait until Supabase session ready
  // ─────────────────────────────────────────
  async function getUser() {
    // Try up to 3 times (session may take a tick to load)
    for (let i = 0; i < 3; i++) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id) {
        currentUserId = user.id;
        console.log('✅ User:', user.email, '| ID:', user.id);
        return user;
      }
      await new Promise(r => setTimeout(r, 400));
    }

    // Not logged in → redirect
    console.warn('❌ No user session — redirecting to login');
    window.location.href = 'login.html';
    return null;
  }

  // ─────────────────────────────────────────
  // 2. LOAD FUEL PRICES (per user)
  // ─────────────────────────────────────────
  async function loadFuelPrices() {
    if (!currentUserId) return;
    try {
      const { data } = await supabase
        .from('settings')
        .select('petrol_price, diesel_price')
        .eq('user_id', currentUserId)
        .maybeSingle();

      if (data) {
        fuelPrices = {
          Petrol: parseFloat(data.petrol_price) || 285,
          Diesel: parseFloat(data.diesel_price) || 305
        };
      }
      console.log('✅ Prices:', fuelPrices);
    } catch (_) {
      console.log('Using default prices');
    }
  }

  // ─────────────────────────────────────────
  // 3. LOAD CUSTOMERS (per user)
  // ─────────────────────────────────────────
  async function loadCustomers() {
    if (!currentUserId) return;
    console.log('Loading customers...');
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', currentUserId)
        .order('sr_no');

      if (error) throw error;
      allCustomers = data || [];
      console.log('✅ Customers:', allCustomers.length);
      fillCustomerDropdowns();
    } catch (e) {
      console.error('❌ Customers error:', e.message);
    }
  }

  function fillCustomerDropdowns() {
    const sale    = $('sale-customer');
    const vasooli = $('vasooli-customer');

    if (sale) {
      sale.innerHTML = '<option value="">Select Customer</option>' +
        allCustomers.map(c =>
          `<option value="${c.id}">${c.sr_no} – ${c.name}</option>`
        ).join('');
    }

    if (vasooli) {
      vasooli.innerHTML = '<option value="">Select Customer</option>' +
        allCustomers
          .filter(c => c.category !== 'Owner')
          .map(c =>
            `<option value="${c.id}">${c.sr_no} – ${c.name} (Bal: Rs. ${fmt(c.balance)})</option>`
          ).join('');
    }
  }

  // ─────────────────────────────────────────
  // 4. LOAD TRANSACTIONS (per user)
  // ─────────────────────────────────────────
  async function loadTransactions() {
    if (!currentUserId) return;
    console.log('Loading transactions...');
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`*, customers(name, sr_no)`)
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: sortOrder === 'asc' })
        .limit(2000);

      if (error) throw error;
      allTransactions = data || [];
      filteredList    = [...allTransactions];
      console.log('✅ Transactions:', allTransactions.length);

      currentPage = 1;
      renderTable(filteredList);
      updateSummary(filteredList);
    } catch (e) {
      console.error('❌ Transactions error:', e.message);
    }
  }

  window.loadInitialTransactions = loadTransactions;

  // ─────────────────────────────────────────
  // 5. FILTERS
  // ─────────────────────────────────────────
  function applyFilters() {
    const type      = $('filter-type')?.value || '';
    const dateFrom  = $('filter-date-from')?.value;
    const dateTo    = $('filter-date-to')?.value;

    filteredList = allTransactions.filter(t => {
      if (type && t.transaction_type !== type) return false;
      const d = new Date(t.created_at);
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo   && d > new Date(dateTo + 'T23:59:59')) return false;
      return true;
    });
    currentPage = 1;
    renderTable(filteredList);
    updateSummary(filteredList);
  }

  function clearFilters() {
    const ids = ['filter-type','filter-date-from','filter-date-to'];
    ids.forEach(id => { const el = $(id); if (el) el.value = ''; });
    filteredList = [...allTransactions];
    currentPage  = 1;
    renderTable(filteredList);
    updateSummary(filteredList);
  }

  // ─────────────────────────────────────────
  // 6. SUMMARY CARDS
  // ─────────────────────────────────────────
  function updateSummary(list) {
    let credit = 0, debit = 0, expense = 0;
    let cc = 0, dc = 0, ec = 0;
    list.forEach(t => {
      const a = parseFloat(t.amount) || 0;
      if      (t.transaction_type === 'Credit')  { credit  += a; cc++; }
      else if (t.transaction_type === 'Debit')   { debit   += a; dc++; }
      else if (t.transaction_type === 'Expense') { expense += a; ec++; }
    });
    const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
    set('total-credit',  'Rs. ' + fmt(credit));
    set('credit-count',  cc + ' transactions');
    set('total-debit',   'Rs. ' + fmt(debit));
    set('debit-count',   dc + ' transactions');
    set('total-expense', 'Rs. ' + fmt(expense));
    set('expense-count', ec + ' transactions');
    set('net-balance',   'Rs. ' + fmt(credit - expense));
    console.log('✅ Summary updated');
  }

  // ─────────────────────────────────────────
  // 7. TABLE RENDER + PAGINATION
  // ─────────────────────────────────────────
  function renderTable(list) {
    const tbody = $('transactions-table');
    const badge = $('transaction-count');
    if (!tbody) return;

    const total     = list.length;
    const pages     = Math.max(1, Math.ceil(total / itemsPerPage));
    currentPage     = Math.min(currentPage, pages);
    const start     = (currentPage - 1) * itemsPerPage;
    const slice     = list.slice(start, start + itemsPerPage);

    if (badge) badge.textContent =
      total === 0 ? '0 transactions'
                  : `Showing ${start + 1}–${start + slice.length} of ${total}`;

    if (slice.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-muted">No transactions found</td></tr>';
    } else {
      tbody.innerHTML = slice.map(t => {
        const d = new Date(t.created_at);
        const badge =
          t.transaction_type === 'Credit'  ? 'bg-success text-white' :
          t.transaction_type === 'Debit'   ? 'bg-primary text-white' :
                                             'bg-warning text-dark';
        return `<tr>
          <td>${d.toLocaleDateString('en-PK')}<br>
              <small class="text-muted">${d.toLocaleTimeString('en-PK', {hour:'2-digit', minute:'2-digit'})}</small></td>
          <td>${t.customers?.name || 'N/A'} (${t.customers?.sr_no ?? '-'})</td>
          <td><span class="badge ${badge}">${t.transaction_type}</span></td>
          <td>${t.fuel_type || '-'}</td>
          <td>${t.liters > 0 ? fmt(t.liters) + ' L' : '-'}</td>
          <td>${t.unit_price ? 'Rs. ' + fmt(t.unit_price) : '-'}</td>
          <td><strong>Rs. ${fmt(t.amount)}</strong></td>
          <td><small>${t.description || '-'}</small></td>
          <td>
            <button class="btn btn-danger btn-sm"
              onclick="window.deleteTx(${t.id})">×</button>
          </td>
        </tr>`;
      }).join('');
    }

    renderPagination(pages);
  }

  function renderPagination(pages) {
    document.getElementById('pagination-bar')?.remove();
    if (pages <= 1 && allTransactions.length <= itemsPerPage) return;

    const bar = document.createElement('div');
    bar.id = 'pagination-bar';
    bar.className = 'p-3 border-top d-flex justify-content-between align-items-center flex-wrap gap-2 bg-light';
    bar.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-sm btn-outline-primary" ${currentPage <= 1 ? 'disabled' : ''}
          onclick="window.goPage(${currentPage - 1})">← Prev</button>
        <span class="text-muted small">Page ${currentPage} / ${pages}</span>
        <button class="btn btn-sm btn-outline-primary" ${currentPage >= pages ? 'disabled' : ''}
          onclick="window.goPage(${currentPage + 1})">Next →</button>
      </div>
      <div class="d-flex align-items-center gap-2">
        <select class="form-select form-select-sm" style="width:auto"
          onchange="window.changePerPage(this.value)">
          ${[10,25,50,100,999999].map(n =>
            `<option value="${n}" ${itemsPerPage===n?'selected':''}>${n===999999?'All':n+' / page'}</option>`
          ).join('')}
        </select>
        <select class="form-select form-select-sm" style="width:auto"
          onchange="window.changeSortOrder(this.value)">
          <option value="desc" ${sortOrder==='desc'?'selected':''}>Newest First</option>
          <option value="asc"  ${sortOrder==='asc' ?'selected':''}>Oldest First</option>
        </select>
      </div>`;

    // Attach under the card
    const card = $('transactions-table')?.closest('.card');
    if (card) card.appendChild(bar);
  }

  window.goPage        = p  => { currentPage = p; renderTable(filteredList); };
  window.changePerPage = v  => { itemsPerPage = parseInt(v); currentPage = 1; renderTable(filteredList); };
  window.changeSortOrder = async v => { sortOrder = v; await loadTransactions(); };

  window.deleteTx = async function (id) {
    if (!confirm('Delete this transaction?')) return;
    await supabase.from('transactions').delete()
      .eq('id', id).eq('user_id', currentUserId);
    await loadTransactions();
  };

  // ─────────────────────────────────────────
  // 8. NEW SALE
  // ─────────────────────────────────────────
  async function saveSale() {
    if (isSubmitting) return;
    const custId  = $('sale-customer')?.value;
    const fuel    = $('sale-fuel-type')?.value;
    const liters  = parseFloat($('sale-liters')?.value)     || 0;
    const price   = parseFloat($('sale-unit-price')?.value) || 0;
    const amount  = parseFloat($('sale-amount')?.value)     || 0;
    const payType = $('sale-payment-type')?.value || 'cash';
    const desc    = $('sale-description')?.value  || '';

    if (!custId || !fuel || !amount) {
      alert('Customer, Fuel Type aur Amount zaroor fill karein'); return;
    }

    isSubmitting = true;
    try {
      const { error } = await supabase.from('transactions').insert([{
        user_id:          currentUserId,
        customer_id:      parseInt(custId),
        transaction_type: payType === 'cash' ? 'Debit' : 'Credit',
        amount,
        liters:     liters || null,
        unit_price: price  || null,
        fuel_type:  fuel,
        description: desc || `${fuel} sale`
      }]);
      if (error) throw error;
      bootstrap.Modal.getInstance($('newSaleModal'))?.hide();
      $('newSaleForm')?.reset();
      showToast('Sale recorded!', 'success');
      await loadTransactions();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      isSubmitting = false;
    }
  }

  // ─────────────────────────────────────────
  // 9. VASOOLI
  // ─────────────────────────────────────────
  async function saveVasooli() {
    if (isSubmitting) return;
    const custId = $('vasooli-customer')?.value;
    const amount = parseFloat($('vasooli-amount')?.value)   || 0;
    const fuel   = $('vasooli-fuel-category')?.value        || '';
    const liters = parseFloat($('vasooli-liters')?.value)   || 0;
    const date   = $('vasooli-date')?.value;
    const month  = $('vasooli-month')?.value;
    const desc   = $('vasooli-description')?.value || '';

    if (!custId || !amount) { alert('Customer aur Amount zaroor fill karein'); return; }

    const customer = allCustomers.find(c => c.id === parseInt(custId));
    if (!customer) { alert('Customer not found'); return; }

    let fullDesc = fuel ? `${fuel} payment` : 'Payment received';
    if (liters > 0) fullDesc += ` (${liters}L)`;
    if (month) {
      fullDesc += ` for ${new Date(month + '-01').toLocaleDateString('en-US', { month:'long', year:'numeric' })}`;
    }
    fullDesc += ` from ${customer.name}`;
    if (desc) fullDesc += ` — ${desc}`;

    isSubmitting = true;
    try {
      const row = {
        user_id:          currentUserId,
        customer_id:      parseInt(custId),
        transaction_type: 'Debit',
        amount,
        liters:     liters || null,
        unit_price: (fuel && liters > 0) ? fuelPrices[fuel] : null,
        fuel_type:  fuel   || null,
        description: fullDesc,
        payment_month: month || null
      };
      if (date) row.created_at = new Date(date).toISOString();

      const { error } = await supabase.from('transactions').insert([row]);
      if (error) throw error;
      bootstrap.Modal.getInstance($('vasooliModal'))?.hide();
      $('vasooliForm')?.reset();
      showToast('Payment recorded!', 'success');
      await loadTransactions();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      isSubmitting = false;
    }
  }

  // ─────────────────────────────────────────
  // 10. EXPENSE
  // ─────────────────────────────────────────
  async function saveExpense() {
    if (isSubmitting) return;
    const amount  = parseFloat($('expense-amount')?.value) || 0;
    const desc    = $('expense-description')?.value;
    const exType  = $('expense-type')?.value;
    const exAcct  = $('expense-account')?.value;

    if (!amount || !desc) { alert('Amount aur Description zaroor fill karein'); return; }

    isSubmitting = true;
    try {
      let owner = allCustomers.find(c => c.category === 'Owner');
      if (!owner) {
        const { data, error } = await supabase
          .from('customers')
          .insert([{ user_id: currentUserId, sr_no: 0, name: 'Owner', category: 'Owner', balance: 0 }])
          .select().single();
        if (error) throw error;
        owner = data;
        await loadCustomers();
      }

      const { error } = await supabase.from('transactions').insert([{
        user_id:          currentUserId,
        customer_id:      owner.id,
        transaction_type: 'Expense',
        amount,
        description:      `${exType || 'Expense'}: ${desc} (From: ${exAcct || 'N/A'})`,
        expense_type:     exType,
        expense_account:  exAcct
      }]);
      if (error) throw error;
      bootstrap.Modal.getInstance($('expenseModal'))?.hide();
      $('expenseForm')?.reset();
      showToast('Expense recorded!', 'success');
      await loadTransactions();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      isSubmitting = false;
    }
  }

  // ─────────────────────────────────────────
  // 11. AUTO-CALCULATE (no inline handlers needed)
  // ─────────────────────────────────────────
  function setupCalculators() {
    const fuelSel  = $('sale-fuel-type');
    const litersIn = $('sale-liters');
    const priceIn  = $('sale-unit-price');
    const amtOut   = $('sale-amount');
    const amtDirect= $('sale-amount-direct');
    const byLiters = $('sale-by-liters');
    const byAmt    = $('sale-by-amount');
    const litSec   = $('sale-liters-section');
    const amtSec   = $('sale-amount-section');

    // Toggle sections
    byLiters?.addEventListener('change', () => {
      if (litSec) litSec.style.display = '';
      if (amtSec) amtSec.style.display = 'none';
    });
    byAmt?.addEventListener('change', () => {
      if (litSec) litSec.style.display = 'none';
      if (amtSec) amtSec.style.display = '';
    });

    // Update price on fuel change
    fuelSel?.addEventListener('change', () => {
      if (priceIn) priceIn.value = fuelPrices[fuelSel.value] || '';
      calcSale();
    });
    litersIn?.addEventListener('input', calcSale);
    priceIn?.addEventListener('input', calcSale);
    function calcSale() {
      const l = parseFloat(litersIn?.value) || 0;
      const p = parseFloat(priceIn?.value)  || 0;
      if (amtOut && l > 0 && p > 0) amtOut.value = (l * p).toFixed(2);
    }

    amtDirect?.addEventListener('input', () => {
      if (amtOut) amtOut.value = amtDirect.value;
    });

    // Vasooli auto-calc
    const vFuel  = $('vasooli-fuel-category');
    const vLiters= $('vasooli-liters');
    const vAmt   = $('vasooli-amount');
    vFuel?.addEventListener('change', calcVasooli);
    vLiters?.addEventListener('input', calcVasooli);
    function calcVasooli() {
      const f = vFuel?.value;
      const l = parseFloat(vLiters?.value) || 0;
      if (f && l > 0 && vAmt) {
        vAmt.value = (l * (fuelPrices[f] || 285)).toFixed(2);
      }
    }
  }

  // ─────────────────────────────────────────
  // 12. TOAST
  // ─────────────────────────────────────────
  function showToast(msg, type = 'info') {
    const el = $('liveToast');
    if (!el) return;
    $('toast-title').textContent = type === 'success' ? 'Success' : 'Info';
    $('toast-message').textContent = msg;
    new bootstrap.Toast(el).show();
  }

  // ─────────────────────────────────────────
  // 13. EVENT LISTENERS (all in JS, none in HTML)
  // ─────────────────────────────────────────
  function bindEvents() {
    // Forms
    $('newSaleForm') ?.addEventListener('submit', e => { e.preventDefault(); saveSale();    });
    $('vasooliForm') ?.addEventListener('submit', e => { e.preventDefault(); saveVasooli(); });
    $('expenseForm') ?.addEventListener('submit', e => { e.preventDefault(); saveExpense(); });

    // Filters
    $('apply-filters-btn')?.addEventListener('click', applyFilters);
    $('clear-filters-btn')?.addEventListener('click', clearFilters);

    // Set today's date in vasooli
    const vDate = $('vasooli-date');
    if (vDate) vDate.value = new Date().toISOString().split('T')[0];
  }

  // ─────────────────────────────────────────
  // 14. INIT
  // ─────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', async () => {
    if (document.body.getAttribute('data-page') !== 'transactions') return;

    console.log('🚀 Transactions starting...');

    const user = await getUser();
    if (!user) return;   // redirect happened

    await loadFuelPrices();
    await loadCustomers();
    await loadTransactions();
    setupCalculators();
    bindEvents();

    console.log('✅ Ready!');
  });

})();

// TRANSACTIONS - WITH PAGINATION & FUEL PRICE IN VASOOLI
// (function() {
// 'use strict';

// const supabase = window.supabaseClient;
// let allTransactions = [];
// let allCustomers = [];
// let isSubmitting = false;
// let fuelPrices = { Petrol: 285, Diesel: 305 };

// // Pagination state
// let currentPage = 1;
// let itemsPerPage = 10;
// let sortOrder = 'desc'; // desc = newest first, asc = oldest first

// function $(id) { return document.getElementById(id); }

// function formatNumber(num) {
//   return Number(num || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// }

// // ============================================
// // LOAD PRICES FROM SETTINGS
// // ============================================

// async function loadFuelPrices() {
//   console.log('Loading fuel prices from settings...');
  
//   try {
//     const { data, error } = await supabase
//       .from('settings')
//       .select('petrol_price, diesel_price')
//       .maybeSingle();

//     if (error || !data) {
//       console.log('No settings found, using defaults');
//       return;
//     }

//     fuelPrices = {
//       Petrol: parseFloat(data.petrol_price) || 285,
//       Diesel: parseFloat(data.diesel_price) || 305
//     };
//     console.log('✅ Loaded prices:', fuelPrices);
//   } catch (error) {
//     console.log('Using default prices');
//   }
// }

// // ============================================
// // LOAD DATA
// // ============================================

// async function loadInitialTransactions() {
//   console.log('Loading transactions...');
  
//   try {
//     const { data, error } = await supabase
//       .from('transactions')
//       .select('*, customers!inner(name, sr_no)')
//       .order('created_at', { ascending: sortOrder === 'asc' })
//       .limit(1000); // Load more for pagination

//     if (error) throw error;

//     allTransactions = data || [];
//     console.log('✅ Loaded:', allTransactions.length);
    
//     displayTransactions(allTransactions);
//     updateSummaryCards(allTransactions);
//   } catch (error) {
//     console.error('❌ Error:', error);
//   }
// }

// async function loadCustomers() {
//   console.log('Loading customers...');
  
//   try {
//     const { data, error } = await supabase
//       .from('customers')
//       .select('*')
//       .order('sr_no');

//     if (error) throw error;

//     allCustomers = data || [];
//     console.log('✅ Customers:', allCustomers.length);
    
//     populateCustomerDropdowns();
//   } catch (error) {
//     console.error('❌ Error:', error);
//   }
// }

// function populateCustomerDropdowns() {
//   const saleSelect = $('sale-customer');
//   const vasooliSelect = $('vasooli-customer');

//   if (saleSelect) {
//     let html = '<option value="">Select Customer</option>';
//     allCustomers.forEach(c => {
//       html += `<option value="${c.id}">${c.sr_no} - ${c.name}</option>`;
//     });
//     saleSelect.innerHTML = html;
//   }

//   if (vasooliSelect) {
//     let html = '<option value="">Select Customer</option>';
//     allCustomers.forEach(c => {
//       if (c.category !== 'Owner') {
//         html += `<option value="${c.id}">${c.sr_no} - ${c.name} (Balance: Rs. ${formatNumber(c.balance || 0)})</option>`;
//       }
//     });
//     vasooliSelect.innerHTML = html;
//   }
// }

// // ============================================
// // PAGINATION
// // ============================================

// function displayTransactions(transactions) {
//   const tbody = $('transactions-table');
//   if (!tbody) return;

//   if (transactions.length === 0) {
//     tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4">No transactions found</td></tr>';
//     updatePaginationInfo(0);
//     return;
//   }

//   // Calculate pagination
//   const totalItems = transactions.length;
//   const totalPages = Math.ceil(totalItems / itemsPerPage);
//   const start = (currentPage - 1) * itemsPerPage;
//   const end = start + itemsPerPage;
//   const pageItems = transactions.slice(start, end);

//   // Display rows
//   tbody.innerHTML = pageItems.map(t => {
//     const date = new Date(t.created_at);
    
//     let badgeClass = '';
//     if (t.transaction_type === 'Credit') {
//       badgeClass = 'bg-success text-white';
//     } else if (t.transaction_type === 'Debit') {
//       badgeClass = 'bg-primary text-white';
//     } else {
//       badgeClass = 'bg-warning text-dark';
//     }
    
//     return `<tr>
//       <td>${date.toLocaleDateString('en-PK')}</td>
//       <td>${t.customers?.name || 'N/A'} (${t.customers?.sr_no || '-'})</td>
//       <td><span class="badge ${badgeClass}">${t.transaction_type}</span></td>
//       <td>${t.fuel_type || '-'}</td>
//       <td>${t.liters > 0 ? formatNumber(t.liters) + ' L' : '-'}</td>
//       <td>${t.unit_price ? 'Rs. ' + formatNumber(t.unit_price) : '-'}</td>
//       <td><strong>Rs. ${formatNumber(t.amount)}</strong></td>
//       <td>${t.description || '-'}</td>
//       <td><button class="btn btn-sm btn-danger" onclick="window.deleteTransaction(${t.id})">×</button></td>
//     </tr>`;
//   }).join('');

//   updatePaginationInfo(totalItems);
//   renderPaginationControls(totalPages);
// }

// function updatePaginationInfo(totalItems) {
//   const badge = $('transaction-count');
//   if (badge) {
//     const start = (currentPage - 1) * itemsPerPage + 1;
//     const end = Math.min(currentPage * itemsPerPage, totalItems);
//     badge.textContent = totalItems > 0 ? 
//       `Showing ${start}-${end} of ${totalItems} transactions` : 
//       '0 transactions';
//   }
// }

// function renderPaginationControls(totalPages) {
//   const container = document.querySelector('.card-body.p-0');
//   if (!container) return;

//   // Remove existing pagination
//   const existing = container.querySelector('.pagination-controls');
//   if (existing) existing.remove();

//   if (totalPages <= 1) return;

//   const paginationHTML = `
//     <div class="pagination-controls p-3 border-top d-flex justify-content-between align-items-center">
//       <div>
//         <button class="btn btn-sm btn-outline-primary" ${currentPage === 1 ? 'disabled' : ''} 
//                 onclick="window.changePage(${currentPage - 1})">
//           <i class="bi bi-chevron-left"></i> Previous
//         </button>
//         <span class="mx-3">Page ${currentPage} of ${totalPages}</span>
//         <button class="btn btn-sm btn-outline-primary" ${currentPage === totalPages ? 'disabled' : ''} 
//                 onclick="window.changePage(${currentPage + 1})">
//           Next <i class="bi bi-chevron-right"></i>
//         </button>
//       </div>
//       <div>
//         <select class="form-select form-select-sm d-inline-block w-auto" 
//                 onchange="window.changeItemsPerPage(this.value)">
//           <option value="10" ${itemsPerPage === 10 ? 'selected' : ''}>10 per page</option>
//           <option value="25" ${itemsPerPage === 25 ? 'selected' : ''}>25 per page</option>
//           <option value="50" ${itemsPerPage === 50 ? 'selected' : ''}>50 per page</option>
//           <option value="100" ${itemsPerPage === 100 ? 'selected' : ''}>100 per page</option>
//           <option value="999999" ${itemsPerPage === 999999 ? 'selected' : ''}>Show All</option>
//         </select>
//         <select class="form-select form-select-sm d-inline-block w-auto ms-2" 
//                 onchange="window.changeSortOrder(this.value)">
//           <option value="desc" ${sortOrder === 'desc' ? 'selected' : ''}>Newest First</option>
//           <option value="asc" ${sortOrder === 'asc' ? 'selected' : ''}>Oldest First</option>
//         </select>
//       </div>
//     </div>
//   `;

//   container.insertAdjacentHTML('beforeend', paginationHTML);
// }

// window.changePage = function(page) {
//   currentPage = page;
//   displayTransactions(allTransactions);
// };

// window.changeItemsPerPage = function(value) {
//   itemsPerPage = parseInt(value);
//   currentPage = 1;
//   displayTransactions(allTransactions);
// };

// window.changeSortOrder = async function(order) {
//   sortOrder = order;
//   await loadInitialTransactions();
// };

// // ============================================
// // UPDATE SUMMARY
// // ============================================

// function updateSummaryCards(transactions) {
//   let credit = 0, debit = 0, expense = 0;
//   let creditCount = 0, debitCount = 0, expenseCount = 0;

//   transactions.forEach(t => {
//     const amt = parseFloat(t.amount) || 0;
//     if (t.transaction_type === 'Credit') { credit += amt; creditCount++; }
//     else if (t.transaction_type === 'Debit') { debit += amt; debitCount++; }
//     else if (t.transaction_type === 'Expense') { expense += amt; expenseCount++; }
//   });

//   if ($('total-credit')) $('total-credit').textContent = 'Rs. ' + formatNumber(credit);
//   if ($('credit-count')) $('credit-count').textContent = creditCount + ' transactions';
//   if ($('total-debit')) $('total-debit').textContent = 'Rs. ' + formatNumber(debit);
//   if ($('debit-count')) $('debit-count').textContent = debitCount + ' transactions';
//   if ($('total-expense')) $('total-expense').textContent = 'Rs. ' + formatNumber(expense);
//   if ($('expense-count')) $('expense-count').textContent = expenseCount + ' transactions';
//   if ($('net-balance')) $('net-balance').textContent = 'Rs. ' + formatNumber(credit - expense);

//   console.log('✅ Summary updated');
// }

// // ============================================
// // NEW SALE
// // ============================================

// async function handleNewSale() {
//   if (isSubmitting) return;

//   const customerId = $('sale-customer')?.value;
//   const fuelType = $('sale-fuel-type')?.value;
//   const liters = parseFloat($('sale-liters')?.value) || 0;
//   const unitPrice = parseFloat($('sale-unit-price')?.value) || 0;
//   const amount = parseFloat($('sale-amount')?.value) || 0;
//   const paymentType = $('sale-payment-type')?.value || 'cash';

//   if (!customerId || !fuelType || !amount || !liters) {
//     alert('Please fill all required fields');
//     return;
//   }

//   isSubmitting = true;

//   try {
//     const { error } = await supabase
//       .from('transactions')
//       .insert([{
//         customer_id: parseInt(customerId),
//         transaction_type: paymentType === 'cash' ? 'Debit' : 'Credit',
//         amount: amount,
//         liters: liters,
//         unit_price: unitPrice,
//         fuel_type: fuelType,
//         description: `${fuelType} sale`
//       }]);

//     if (error) throw error;

//     alert('Sale recorded!');
//     closeModal('newSaleModal');
//     await loadInitialTransactions();
//   } catch (error) {
//     console.error('Error:', error);
//     alert('Error: ' + error.message);
//   } finally {
//     isSubmitting = false;
//   }
// }

// // ============================================
// // VASOOLI WITH FUEL PRICE CALCULATION
// // ============================================

// // Calculate vasooli amount from liters
// window.calculateVasooliAmount = function() {
//   const fuelCategory = $('vasooli-fuel-category')?.value;
//   const liters = parseFloat($('vasooli-liters')?.value) || 0;
//   const amountInput = $('vasooli-amount');

//   if (fuelCategory && liters > 0 && amountInput) {
//     const price = fuelPrices[fuelCategory] || 285;
//     const amount = liters * price;
//     amountInput.value = amount.toFixed(2);
//     console.log('Calculated:', liters, 'L x Rs.', price, '= Rs.', amount);
//   }
// };

// async function handleVasooli() {
//   if (isSubmitting) return;

//   const customerId = $('vasooli-customer')?.value;
//   const amount = parseFloat($('vasooli-amount')?.value) || 0;
//   const fuelCategory = $('vasooli-fuel-category')?.value || '';
//   const liters = parseFloat($('vasooli-liters')?.value) || 0;
//   const paymentDate = $('vasooli-date')?.value;
//   const month = $('vasooli-month')?.value;
//   const description = $('vasooli-description')?.value || '';

//   if (!customerId || !amount) {
//     alert('Please select customer and enter amount');
//     return;
//   }

//   isSubmitting = true;

//   try {
//     const customer = allCustomers.find(c => c.id === parseInt(customerId));
//     if (!customer) throw new Error('Customer not found');

//     const customerName = customer.name || 'Customer';

//     let fullDescription = '';
//     if (fuelCategory) {
//       fullDescription = `${fuelCategory} payment`;
//       if (liters > 0) {
//         fullDescription += ` (${liters} L)`;
//       }
//     } else {
//       fullDescription = 'Payment received';
//     }
    
//     if (month) {
//       const date = new Date(month + '-01');
//       const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
//       fullDescription += ` for ${monthName}`;
//     }
    
//     fullDescription += ` from ${customerName}`;
    
//     if (description) {
//       fullDescription += ` - ${description}`;
//     }

//     const transactionData = {
//       customer_id: parseInt(customerId),
//       transaction_type: 'Debit',
//       amount: amount,
//       liters: liters > 0 ? liters : null,
//       unit_price: fuelCategory && liters > 0 ? fuelPrices[fuelCategory] : null,
//       description: fullDescription,
//       payment_month: month || null,
//       fuel_type: fuelCategory || null
//     };

//     if (paymentDate) {
//       transactionData.created_at = new Date(paymentDate).toISOString();
//     }

//     const { error } = await supabase
//       .from('transactions')
//       .insert([transactionData]);

//     if (error) throw error;

//     alert('Payment recorded!');
//     closeModal('vasooliModal');
//     await loadInitialTransactions();
//   } catch (error) {
//     console.error('Error:', error);
//     alert('Error: ' + error.message);
//   } finally {
//     isSubmitting = false;
//   }
// }

// // ============================================
// // EXPENSE
// // ============================================

// async function handleExpense() {
//   if (isSubmitting) return;

//   const amount = parseFloat($('expense-amount')?.value) || 0;
//   const description = $('expense-description')?.value;
//   const expenseType = $('expense-type')?.value;
//   const expenseAccount = $('expense-account')?.value;

//   if (!amount || !description) {
//     alert('Please fill all fields');
//     return;
//   }

//   isSubmitting = true;

//   try {
//     let customerId = null;
    
//     const owner = allCustomers.find(c => c.category === 'Owner');
//     if (owner) {
//       customerId = owner.id;
//     } else if (allCustomers.length > 0) {
//       customerId = allCustomers[0].id;
//     } else {
//       const { data: newOwner, error: createError } = await supabase
//         .from('customers')
//         .insert([{ sr_no: 0, name: 'Owner', category: 'Owner', balance: 0 }])
//         .select()
//         .single();
      
//       if (createError) throw createError;
//       customerId = newOwner.id;
//       await loadCustomers();
//     }

//     const fullDescription = expenseType ? 
//       `${expenseType}: ${description} (From: ${expenseAccount || 'N/A'})` :
//       description;

//     const { error } = await supabase
//       .from('transactions')
//       .insert([{
//         customer_id: customerId,
//         transaction_type: 'Expense',
//         amount: amount,
//         description: fullDescription,
//         expense_type: expenseType,
//         expense_account: expenseAccount
//       }]);

//     if (error) throw error;

//     alert('Expense recorded!');
//     closeModal('expenseModal');
//     await loadInitialTransactions();
//   } catch (error) {
//     console.error('Error:', error);
//     alert('Error: ' + error.message);
//   } finally {
//     isSubmitting = false;
//   }
// }

// // ============================================
// // HELPERS
// // ============================================

// function closeModal(modalId) {
//   const modal = bootstrap.Modal.getInstance($(modalId));
//   if (modal) modal.hide();
//   const form = document.querySelector(`#${modalId} form`);
//   if (form) form.reset();
// }

// window.deleteTransaction = async function(id) {
//   if (!confirm('Delete?')) return;
//   try {
//     await supabase.from('transactions').delete().eq('id', id);
//     alert('Deleted!');
//     await loadInitialTransactions();
//   } catch (error) {
//     alert('Error: ' + error.message);
//   }
// };

// // ============================================
// // AUTO-CALCULATE
// // ============================================

// function setupAutoCalculate() {
//   const litersInput = $('sale-liters');
//   const priceInput = $('sale-unit-price');
//   const amountInput = $('sale-amount');
//   const fuelSelect = $('sale-fuel-type');

//   if (fuelSelect) {
//     fuelSelect.addEventListener('change', () => {
//       const price = fuelPrices[fuelSelect.value] || 285;
//       if (priceInput) priceInput.value = price;
//       calculateAmount();
//     });
//   }

//   if (litersInput) litersInput.addEventListener('input', calculateAmount);
//   if (priceInput) priceInput.addEventListener('input', calculateAmount);

//   function calculateAmount() {
//     const liters = parseFloat(litersInput?.value) || 0;
//     const price = parseFloat(priceInput?.value) || 0;
//     if (amountInput && liters > 0 && price > 0) {
//       amountInput.value = (liters * price).toFixed(2);
//     }
//   }

//   // Setup vasooli calculation
//   const vasooliLiters = $('vasooli-liters');
//   const vasooliFuel = $('vasooli-fuel-category');
  
//   if (vasooliLiters) vasooliLiters.addEventListener('input', window.calculateVasooliAmount);
//   if (vasooliFuel) vasooliFuel.addEventListener('change', window.calculateVasooliAmount);
// }

// // ============================================
// // FORM HANDLERS
// // ============================================

// function setupFormHandlers() {
//   const saleForm = $('newSaleForm');
//   if (saleForm) {
//     saleForm.addEventListener('submit', (e) => {
//       e.preventDefault();
//       if (!isSubmitting) handleNewSale();
//     });
//   }

//   const vasooliForm = $('vasooliForm');
//   if (vasooliForm) {
//     vasooliForm.addEventListener('submit', (e) => {
//       e.preventDefault();
//       if (!isSubmitting) handleVasooli();
//     });
//   }

//   const expenseForm = $('expenseForm');
//   if (expenseForm) {
//     expenseForm.addEventListener('submit', (e) => {
//       e.preventDefault();
//       if (!isSubmitting) handleExpense();
//     });
//   }
// }

// // ============================================
// // INITIALIZE
// // ============================================

// document.addEventListener('DOMContentLoaded', async () => {
//   if (document.body.getAttribute('data-page') === 'transactions') {
//     console.log('🚀 Starting transactions...');
    
//     await loadFuelPrices();
//     await loadCustomers();
//     await loadInitialTransactions();
    
//     setupAutoCalculate();
//     setupFormHandlers();
    
//     if ($('vasooli-date')) {
//       $('vasooli-date').value = new Date().toISOString().split('T')[0];
//     }
    
//     console.log('✅ Ready! Prices:', fuelPrices);
//   }
// });

// window.loadInitialTransactions = loadInitialTransactions;

// })();