// ============================================
// TRANSACTIONS-COMPLETE.js - FINAL FIXED VERSION
// Fuel prices: Supabase settings table se aate hain
// No redirect, no auth check
// ============================================
(function () {
  'use strict';

  const supabase = window.supabaseClient;
  let allTransactions = [];
  let allCustomers = [];

  // Fuel prices - Supabase se load honge
  window.fuelPrices = { Petrol: 0, Diesel: 0 };

  function $(id) { return document.getElementById(id); }

  function fmt(num) {
    return Number(num || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ============================================
  // FUEL PRICES - SUPABASE SETTINGS SE LOAD
  // ============================================

  async function loadFuelPricesFromSettings() {
    try {
      // settings table se current prices lo
      const { data, error } = await supabase
        .from('settings')
        .select('current_petrol, current_diesel, price_history')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('⚠️ Settings load error:', error.message);
        // Fallback: hardcoded default (sirf agar settings table nahi hai)
        window.fuelPrices = { Petrol: 285, Diesel: 305 };
        return;
      }

      if (data && data.current_petrol && data.current_diesel) {
        window.fuelPrices.Petrol = parseFloat(data.current_petrol);
        window.fuelPrices.Diesel = parseFloat(data.current_diesel);
        console.log('✅ Fuel prices loaded from Settings:', window.fuelPrices);

        // Price source label update karo
        const src = document.getElementById('sale-price-source');
        if (src) src.textContent = `Settings se: Petrol Rs.${window.fuelPrices.Petrol} | Diesel Rs.${window.fuelPrices.Diesel}`;
      } else {
        console.warn('⚠️ Settings mein prices nahi hain. Settings page par jaa kar prices set karein.');
        window.fuelPrices = { Petrol: 0, Diesel: 0 };
        showToast('warning', 'Fuel Prices Set Karein', 'Settings page par petrol/diesel prices set karein pehle.');
      }
    } catch (err) {
      console.error('❌ loadFuelPricesFromSettings error:', err);
      window.fuelPrices = { Petrol: 0, Diesel: 0 };
    }
  }

  // ============================================
  // LOAD DATA
  // ============================================

  async function loadInitialTransactions() {
    console.log('Loading transactions...');
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, customers!inner(name, sr_no)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      allTransactions = data || [];
      console.log('✅ Loaded:', allTransactions.length, 'transactions');
      displayTransactions(allTransactions);
      updateSummaryCards(allTransactions);
      updateTransactionCount(allTransactions.length);
    } catch (err) {
      console.error('❌ Error loading transactions:', err);
    }
  }

  async function loadCustomers() {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('sr_no');

      if (error) throw error;
      allCustomers = data || [];
      console.log('✅ Loaded:', allCustomers.length, 'customers');
      populateCustomerDropdowns();
    } catch (err) {
      console.error('❌ Error loading customers:', err);
    }
  }

  function populateCustomerDropdowns() {
    if ($('sale-customer')) {
      let html = '<option value="">Select Customer</option>';
      allCustomers.forEach(c => {
        html += `<option value="${c.id}">${c.sr_no} - ${c.name}</option>`;
      });
      $('sale-customer').innerHTML = html;
    }

    if ($('vasooli-customer')) {
      let html = '<option value="">Select Customer</option>';
      allCustomers.forEach(c => {
        if (c.category !== 'Owner') {
          html += `<option value="${c.id}">${c.sr_no} - ${c.name}</option>`;
        }
      });
      $('vasooli-customer').innerHTML = html;
    }
  }

  // ============================================
  // DISPLAY & SUMMARY
  // ============================================

  function updateTransactionCount(count) {
    if ($('transaction-count')) $('transaction-count').textContent = count + ' transactions';
  }

  function updateSummaryCards(transactions) {
    let credit = 0, debit = 0, expense = 0;
    let creditCount = 0, debitCount = 0, expenseCount = 0;

    transactions.forEach(t => {
      const amt = parseFloat(t.amount) || 0;
      if (t.transaction_type === 'Credit') { credit += amt; creditCount++; }
      else if (t.transaction_type === 'Debit') { debit += amt; debitCount++; }
      else if (t.transaction_type === 'Expense') { expense += amt; expenseCount++; }
    });

    if ($('total-credit')) $('total-credit').textContent = 'Rs. ' + fmt(credit);
    if ($('credit-count')) $('credit-count').textContent = creditCount + ' transactions';
    if ($('total-debit')) $('total-debit').textContent = 'Rs. ' + fmt(debit);
    if ($('debit-count')) $('debit-count').textContent = debitCount + ' transactions';
    if ($('total-expense')) $('total-expense').textContent = 'Rs. ' + fmt(expense);
    if ($('expense-count')) $('expense-count').textContent = expenseCount + ' transactions';
    if ($('net-balance')) $('net-balance').textContent = 'Rs. ' + fmt(credit - expense);
  }

  function displayTransactions(transactions) {
    const tbody = $('transactions-table');
    if (!tbody) return;

    if (transactions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-muted">Koi transaction nahi mila</td></tr>';
      return;
    }

    tbody.innerHTML = transactions.map(t => {
      const date = new Date(t.created_at);
      const typeClass = t.transaction_type === 'Credit' ? 'bg-success' :
                        t.transaction_type === 'Debit' ? 'bg-primary' : 'bg-warning text-dark';
      const fuelDesc = t.description || '-';
      const fuelType = fuelDesc.includes('Petrol') ? 'Petrol' : fuelDesc.includes('Diesel') ? 'Diesel' : '-';

      return `<tr>
        <td>${date.toLocaleDateString('en-PK')}<br><small class="text-muted">${date.toLocaleTimeString('en-PK', {hour:'2-digit',minute:'2-digit'})}</small></td>
        <td>${t.customers?.name || 'N/A'} <small class="text-muted">(${t.customers?.sr_no || '-'})</small></td>
        <td><span class="badge ${typeClass}">${t.transaction_type}</span></td>
        <td>${fuelType}</td>
        <td>${t.liters > 0 ? fmt(t.liters) + ' L' : '-'}</td>
        <td>${t.unit_price ? 'Rs. ' + fmt(t.unit_price) : '-'}</td>
        <td><strong>Rs. ${fmt(t.amount)}</strong></td>
        <td>${t.description || '-'}</td>
        <td><button class="btn btn-sm btn-outline-danger" onclick="window.deleteTransaction(${t.id})"><i class="bi bi-trash"></i></button></td>
      </tr>`;
    }).join('');
  }

  // ============================================
  // FUEL PRICE FUNCTIONS (window pe expose)
  // ============================================

  window.updateSaleFuelPrice = function () {
    const fuel = $('sale-fuel-type')?.value;
    if (!fuel) return;

    const price = window.fuelPrices[fuel] || 0;

    if ($('sale-unit-price')) $('sale-unit-price').value = price;

    // Price source info
    const src = $('sale-price-source');
    if (src) {
      if (price > 0) {
        src.textContent = `Settings se: ${fuel} = Rs. ${price}`;
        src.className = 'text-success small';
      } else {
        src.textContent = '⚠️ Price 0 hai! Settings page par price set karein.';
        src.className = 'text-danger small';
      }
    }

    // Recalculate agar liters already entered hain
    window.calcSaleFromLiters();
  };

  window.calcSaleFromLiters = function () {
    const liters = parseFloat($('sale-liters')?.value) || 0;
    const rate = parseFloat($('sale-unit-price')?.value) || 0;
    const amountEl = $('sale-amount');
    if (amountEl) {
      amountEl.value = (liters > 0 && rate > 0) ? (liters * rate).toFixed(2) : '';
    }
  };

  window.calcSaleFromAmount = function () {
    const amount = parseFloat($('sale-amount-direct')?.value) || 0;
    const rate = parseFloat($('sale-unit-price')?.value) || 0;
    if ($('sale-amount')) $('sale-amount').value = amount > 0 ? amount.toFixed(2) : '';
    if ($('sale-liters') && rate > 0 && amount > 0) {
      $('sale-liters').value = (amount / rate).toFixed(2);
    }
  };

  window.toggleSaleMethod = function (method) {
    const litersSection = $('sale-liters-section');
    const amountSection = $('sale-amount-section');
    if (method === 'liters') {
      if (litersSection) litersSection.style.display = 'block';
      if (amountSection) amountSection.style.display = 'none';
    } else {
      if (litersSection) litersSection.style.display = 'none';
      if (amountSection) amountSection.style.display = 'block';
    }
  };

  window.calculateVasooliAmount = function () {
    const fuel = $('vasooli-fuel-category')?.value;
    const liters = parseFloat($('vasooli-liters')?.value) || 0;
    if (!fuel || !liters) return;
    const price = window.fuelPrices[fuel] || 0;
    if ($('vasooli-amount')) $('vasooli-amount').value = (liters * price).toFixed(2);
  };

  // ============================================
  // NEW SALE SUBMIT
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
    if (!amount || amount <= 0) { alert('Amount enter karein (Liters ya Amount method use karein)'); return; }

    try {
      const { error } = await supabase
        .from('transactions')
        .insert([{
          customer_id: parseInt(customerId),
          transaction_type: paymentType === 'cash' ? 'Debit' : 'Credit',
          amount: amount,
          liters: liters || null,
          unit_price: unitPrice || null,
          description: `${fuelType} sale${description ? ' - ' + description : ''}`
        }]);

      if (error) throw error;

      showToast('success', 'Kamyab!', 'Sale record ho gayi!');
      closeModal('newSaleModal');
      loadInitialTransactions();
    } catch (err) {
      console.error('Sale error:', err);
      alert('Error: ' + err.message);
    }
  }

  // ============================================
  // VASOOLI SUBMIT
  // ============================================

  async function handleVasooli() {
    const customerId = $('vasooli-customer')?.value;
    const amount = parseFloat($('vasooli-amount')?.value) || 0;
    const month = $('vasooli-month')?.value || '';
    const description = $('vasooli-description')?.value || '';
    const fuelCat = $('vasooli-fuel-category')?.value || '';

    if (!customerId) { alert('Customer select karein'); return; }
    if (!amount || amount <= 0) { alert('Amount enter karein'); return; }

    let fullDesc = 'Payment received';
    if (month) {
      const d = new Date(month + '-01');
      fullDesc = `Payment for ${d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    }
    if (fuelCat) fullDesc += ` (${fuelCat})`;
    if (description) fullDesc += ` - ${description}`;

    try {
      const { error } = await supabase
        .from('transactions')
        .insert([{
          customer_id: parseInt(customerId),
          transaction_type: 'Debit',
          amount: amount,
          description: fullDesc
        }]);

      if (error) throw error;

      showToast('success', 'Kamyab!', 'Payment record ho gayi!');
      closeModal('vasooliModal');
      loadInitialTransactions();
    } catch (err) {
      console.error('Vasooli error:', err);
      alert('Error: ' + err.message);
    }
  }

  // ============================================
  // EXPENSE SUBMIT
  // ============================================

  async function handleExpense() {
    const amount = parseFloat($('expense-amount')?.value) || 0;
    const description = $('expense-description')?.value;
    const expenseType = $('expense-type')?.value;
    const account = $('expense-account')?.value;

    if (!amount || amount <= 0) { alert('Amount enter karein'); return; }
    if (!description) { alert('Description enter karein'); return; }
    if (!expenseType) { alert('Expense type select karein'); return; }
    if (!account) { alert('Account select karein'); return; }

    try {
      // Owner customer dhundo
      let customerId = null;
      const { data: owner } = await supabase
        .from('customers')
        .select('id')
        .eq('category', 'Owner')
        .maybeSingle();

      if (owner) {
        customerId = owner.id;
      } else {
        const { data: newOwner, error: createError } = await supabase
          .from('customers')
          .insert([{ sr_no: 0, name: 'Owner', category: 'Owner', balance: 0 }])
          .select()
          .single();
        if (createError) throw createError;
        customerId = newOwner.id;
      }

      const { error } = await supabase
        .from('transactions')
        .insert([{
          customer_id: customerId,
          transaction_type: 'Expense',
          amount: amount,
          description: `${expenseType}: ${description} (From: ${account})`
        }]);

      if (error) throw error;

      showToast('success', 'Kamyab!', 'Expense record ho gaya!');
      closeModal('expenseModal');
      loadInitialTransactions();
    } catch (err) {
      console.error('Expense error:', err);
      alert('Error: ' + err.message);
    }
  }

  // ============================================
  // DELETE
  // ============================================

  window.deleteTransaction = async function (id) {
    if (!confirm('Kya aap yeh transaction delete karna chahte hain?')) return;
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      showToast('success', 'Delete', 'Transaction delete ho gaya!');
      loadInitialTransactions();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // ============================================
  // FILTERS
  // ============================================

  window.applyFilters = function () {
    const type = $('filter-type')?.value;
    const from = $('filter-date-from')?.value;
    const to = $('filter-date-to')?.value;

    let filtered = [...allTransactions];
    if (type) filtered = filtered.filter(t => t.transaction_type === type);
    if (from) filtered = filtered.filter(t => new Date(t.created_at) >= new Date(from));
    if (to) filtered = filtered.filter(t => new Date(t.created_at) <= new Date(to + 'T23:59:59'));

    displayTransactions(filtered);
    updateSummaryCards(filtered);
    updateTransactionCount(filtered.length);
  };

  window.clearTransactionFilters = function () {
    if ($('filter-type')) $('filter-type').value = '';
    if ($('filter-date-from')) $('filter-date-from').value = '';
    if ($('filter-date-to')) $('filter-date-to').value = '';
    displayTransactions(allTransactions);
    updateSummaryCards(allTransactions);
    updateTransactionCount(allTransactions.length);
  };

  // ============================================
  // HELPERS
  // ============================================

  function closeModal(modalId) {
    const el = $(modalId);
    if (el) {
      const m = bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el);
      m.hide();
    }
    const form = document.querySelector(`#${modalId} form`);
    if (form) form.reset();
    // Reset sale-unit-price bhi
    if (modalId === 'newSaleModal') {
      if ($('sale-unit-price')) $('sale-unit-price').value = '';
      if ($('sale-amount')) $('sale-amount').value = '';
    }
  }

  function showToast(type, title, message) {
    const toastEl = $('liveToast');
    const titleEl = $('toast-title');
    const msgEl = $('toast-message');
    if (!toastEl) return;
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    toastEl.className = `toast bg-${type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'danger'} text-white`;
    const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
    toast.show();
  }

  // ============================================
  // EVENT LISTENERS SETUP
  // ============================================

  function setupEventListeners() {
    // Sale form submit
    const saleForm = $('newSaleForm');
    if (saleForm) {
      saleForm.addEventListener('submit', (e) => { e.preventDefault(); handleNewSale(); });
    }

    // Vasooli form submit
    const vasooliForm = $('vasooliForm');
    if (vasooliForm) {
      vasooliForm.addEventListener('submit', (e) => { e.preventDefault(); handleVasooli(); });
    }

    // Expense form submit
    const expenseForm = $('expenseForm');
    if (expenseForm) {
      expenseForm.addEventListener('submit', (e) => { e.preventDefault(); handleExpense(); });
    }

    // Fuel type change → price update
    const fuelSelect = $('sale-fuel-type');
    if (fuelSelect) {
      fuelSelect.addEventListener('change', window.updateSaleFuelPrice);
    }

    // Liters input → calculate amount
    const litersInput = $('sale-liters');
    if (litersInput) {
      litersInput.addEventListener('input', window.calcSaleFromLiters);
    }

    // Amount direct input
    const amountDirect = $('sale-amount-direct');
    if (amountDirect) {
      amountDirect.addEventListener('input', window.calcSaleFromAmount);
    }

    // Entry method toggle
    const lblLiters = $('lbl-by-liters');
    const lblAmount = $('lbl-by-amount');
    if (lblLiters) lblLiters.addEventListener('click', () => window.toggleSaleMethod('liters'));
    if (lblAmount) lblAmount.addEventListener('click', () => window.toggleSaleMethod('amount'));

    // Vasooli calculations
    const vasFuelCat = $('vasooli-fuel-category');
    const vasLiters = $('vasooli-liters');
    if (vasFuelCat) vasFuelCat.addEventListener('change', window.calculateVasooliAmount);
    if (vasLiters) vasLiters.addEventListener('input', window.calculateVasooliAmount);

    // Filter buttons
    const btnApply = $('btn-apply-filter');
    const btnClear = $('btn-clear-filter');
    if (btnApply) btnApply.addEventListener('click', window.applyFilters);
    if (btnClear) btnClear.addEventListener('click', window.clearTransactionFilters);
  }

  // ============================================
  // INIT - SIRF TRANSACTIONS PAGE PAR CHALE
  // ============================================

  document.addEventListener('DOMContentLoaded', async () => {
    if (document.body.getAttribute('data-page') !== 'transactions') return;

    console.log('🚀 Transactions page initializing...');

    // Pehle fuel prices load karo settings se
    await loadFuelPricesFromSettings();

    // Phir data load karo
    await loadCustomers();
    await loadInitialTransactions();

    // Events setup karo
    setupEventListeners();

    console.log('✅ Transactions ready! Fuel Prices:', window.fuelPrices);
  });

  // Global expose
  window.loadInitialTransactions = loadInitialTransactions;
  window.applyFilters = window.applyFilters;
  window.clearTransactionFilters = window.clearTransactionFilters;

})();

// change the previous code 


// COMPLETE ALL-IN-ONE TRANSACTIONS - GUARANTEED WORKING
// (function() {
// 'use strict';

// const supabase = window.supabaseClient;
// let allTransactions = [];
// let allCustomers = [];

// function $(id) { return document.getElementById(id); }

// function formatNumber(num) {
//   return Number(num || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
//       .order('created_at', { ascending: false })
//       .limit(100);

//     if (error) throw error;

//     allTransactions = data || [];
//     console.log('✅ Loaded transactions:', allTransactions.length);
    
//     displayTransactions(allTransactions);
//     updateSummaryCards(allTransactions);
//   } catch (error) {
//     console.error('❌ Error loading transactions:', error);
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
//     console.log('✅ Loaded customers:', allCustomers.length);
    
//     populateCustomerDropdowns();
//   } catch (error) {
//     console.error('❌ Error loading customers:', error);
//   }
// }

// function populateCustomerDropdowns() {
//   // Sale customer dropdown
//   if ($('sale-customer')) {
//     let html = '<option value="">Select Customer</option>';
//     allCustomers.forEach(c => {
//       html += `<option value="${c.id}">${c.sr_no} - ${c.name}</option>`;
//     });
//     $('sale-customer').innerHTML = html;
//   }

//   // Vasooli customer dropdown
//   if ($('vasooli-customer')) {
//     let html = '<option value="">Select Customer</option>';
//     allCustomers.forEach(c => {
//       if (c.category !== 'Owner') {
//         html += `<option value="${c.id}">${c.sr_no} - ${c.name}</option>`;
//       }
//     });
//     $('vasooli-customer').innerHTML = html;
//   }
// }

// // ============================================
// // DISPLAY & UPDATE
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

// function displayTransactions(transactions) {
//   const tbody = $('transactions-table');
//   if (!tbody) return;

//   if (transactions.length === 0) {
//     tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4">No transactions</td></tr>';
//     return;
//   }

//   tbody.innerHTML = transactions.map(t => {
//     const date = new Date(t.created_at);
//     const typeClass = t.transaction_type === 'Credit' ? 'bg-success' :
//                       t.transaction_type === 'Debit' ? 'bg-primary' : 'bg-warning';
    
//     return `<tr>
//       <td>${date.toLocaleDateString('en-PK')}</td>
//       <td>${t.customers?.name || 'N/A'} (${t.customers?.sr_no || '-'})</td>
//       <td><span class="badge ${typeClass}">${t.transaction_type}</span></td>
//       <td>-</td>
//       <td>${t.liters > 0 ? formatNumber(t.liters) + ' L' : '-'}</td>
//       <td>${t.unit_price ? 'Rs. ' + formatNumber(t.unit_price) : '-'}</td>
//       <td><strong>Rs. ${formatNumber(t.amount)}</strong></td>
//       <td>${t.description || '-'}</td>
//       <td><button class="btn btn-sm btn-danger" onclick="window.deleteTransaction(${t.id})">×</button></td>
//     </tr>`;
//   }).join('');
// }

// // ============================================
// // NEW SALE
// // ============================================

// async function handleNewSale() {
//   const customerId = $('sale-customer')?.value;
//   const fuelType = $('sale-fuel-type')?.value;
//   const liters = parseFloat($('sale-liters')?.value) || 0;
//   const unitPrice = parseFloat($('sale-unit-price')?.value) || 285;
//   const amount = parseFloat($('sale-amount')?.value) || 0;
//   const paymentType = $('sale-payment-type')?.value || 'cash';

//   if (!customerId || !fuelType || !amount) {
//     alert('Please fill required fields');
//     return;
//   }

//   try {
//     const { error } = await supabase
//       .from('transactions')
//       .insert([{
//         customer_id: parseInt(customerId),
//         transaction_type: paymentType === 'cash' ? 'Debit' : 'Credit',
//         amount: amount,
//         liters: liters,
//         unit_price: unitPrice,
//         description: `${fuelType} sale`
//       }]);

//     if (error) throw error;

//     alert('Sale recorded!');
//     closeModal('newSaleModal');
//     loadInitialTransactions();
//   } catch (error) {
//     console.error('Error:', error);
//     alert('Error: ' + error.message);
//   }
// }

// // ============================================
// // VASOOLI
// // ============================================

// async function handleVasooli() {
//   const customerId = $('vasooli-customer')?.value;
//   const amount = parseFloat($('vasooli-amount')?.value) || 0;

//   if (!customerId || !amount) {
//     alert('Please select customer and enter amount');
//     return;
//   }

//   try {
//     const { error } = await supabase
//       .from('transactions')
//       .insert([{
//         customer_id: parseInt(customerId),
//         transaction_type: 'Debit',
//         amount: amount,
//         description: 'Payment received'
//       }]);

//     if (error) throw error;

//     alert('Payment recorded!');
//     closeModal('vasooliModal');
//     loadInitialTransactions();
//   } catch (error) {
//     console.error('Error:', error);
//     alert('Error: ' + error.message);
//   }
// }

// // ============================================
// // EXPENSE
// // ============================================

// async function handleExpense() {
//   const amount = parseFloat($('expense-amount')?.value) || 0;
//   const description = $('expense-description')?.value;

//   if (!amount || !description) {
//     alert('Please fill all fields');
//     return;
//   }

//   try {
//     // Get or create owner
//     let customerId = null;
    
//     const { data: owner } = await supabase
//       .from('customers')
//       .select('id')
//       .eq('category', 'Owner')
//       .maybeSingle();

//     if (owner) {
//       customerId = owner.id;
//     } else {
//       // Create Owner
//       const { data: newOwner, error: createError } = await supabase
//         .from('customers')
//         .insert([{ sr_no: 0, name: 'Owner', category: 'Owner', balance: 0 }])
//         .select()
//         .single();
      
//       if (createError) throw createError;
//       customerId = newOwner.id;
//     }

//     const { error } = await supabase
//       .from('transactions')
//       .insert([{
//         customer_id: customerId,
//         transaction_type: 'Expense',
//         amount: amount,
//         description: description
//       }]);

//     if (error) throw error;

//     alert('Expense recorded!');
//     closeModal('expenseModal');
//     loadInitialTransactions();
//     loadCustomers(); // Reload if Owner was created
//   } catch (error) {
//     console.error('Error:', error);
//     alert('Error: ' + error.message);
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
//     loadInitialTransactions();
//   } catch (error) {
//     alert('Error: ' + error.message);
//   }
// };

// // ============================================
// // AUTO-CALCULATE FOR NEW SALE
// // ============================================

// function setupAutoCalculate() {
//   const litersInput = $('sale-liters');
//   const priceInput = $('sale-unit-price');
//   const amountInput = $('sale-amount');
//   const fuelSelect = $('sale-fuel-type');

//   if (fuelSelect) {
//     fuelSelect.addEventListener('change', () => {
//       const prices = { 'Petrol': 285, 'Diesel': 305 };
//       if (priceInput) priceInput.value = prices[fuelSelect.value] || 285;
//       calculateAmount();
//     });
//   }

//   if (litersInput) {
//     litersInput.addEventListener('input', calculateAmount);
//   }

//   if (priceInput) {
//     priceInput.addEventListener('input', calculateAmount);
//   }

//   function calculateAmount() {
//     const liters = parseFloat(litersInput?.value) || 0;
//     const price = parseFloat(priceInput?.value) || 0;
//     if (amountInput && liters > 0 && price > 0) {
//       amountInput.value = (liters * price).toFixed(2);
//     }
//   }
// }

// // ============================================
// // FORM SUBMISSIONS
// // ============================================

// function setupFormHandlers() {
//   const saleForm = $('newSaleForm');
//   if (saleForm) {
//     saleForm.addEventListener('submit', (e) => {
//       e.preventDefault();
//       handleNewSale();
//     });
//   }

//   const vasooliForm = $('vasooliForm');
//   if (vasooliForm) {
//     vasooliForm.addEventListener('submit', (e) => {
//       e.preventDefault();
//       handleVasooli();
//     });
//   }

//   const expenseForm = $('expenseForm');
//   if (expenseForm) {
//     expenseForm.addEventListener('submit', (e) => {
//       e.preventDefault();
//       handleExpense();
//     });
//   }
// }

// // ============================================
// // INITIALIZE
// // ============================================

// document.addEventListener('DOMContentLoaded', () => {
//   if (document.body.getAttribute('data-page') === 'transactions') {
//     console.log('🚀 Initializing transactions...');
    
//     loadInitialTransactions();
//     loadCustomers();
//     setupAutoCalculate();
//     setupFormHandlers();
    
//     console.log('✅ Ready!');
//   }
// });

// window.loadInitialTransactions = loadInitialTransactions;

// })();