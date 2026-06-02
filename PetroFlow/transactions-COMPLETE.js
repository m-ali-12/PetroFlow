// ============================================
// TRANSACTIONS-COMPLETE.js - FINAL VERSION
// - price_history se date-based price milti hai
// - Har transaction mein us waqt ki price save hoti hai
// - Khata mein exact price per unit dikhti hai
// ============================================
(function () {
  'use strict';

  const supabase = window.supabaseClient;
  let allTransactions = [];
  let allCustomers = [];
  let fuelPriceHistory = []; // Full history array

  window.fuelPrices = { Petrol: 0, Diesel: 0 };

  function $(id) { return document.getElementById(id); }

  function fmt(num) {
    return Number(num || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ============================================
  // PRICE BY DATE - Kisi bhi date ki price lo
  // ============================================

  function getPriceForDate(dateStr, fuelType) {
    // Agar history nahi hai to current price use karo
    if (!fuelPriceHistory || fuelPriceHistory.length === 0) {
      return window.fuelPrices[fuelType] || 0;
    }

    const targetDate = new Date(dateStr);

    // Sorted descending (latest first)
    const sorted = [...fuelPriceHistory].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Us date ko ya us se pehle ki latest price
    const entry = sorted.find(e => new Date(e.date) <= targetDate);

    if (entry) {
      return fuelType === 'Petrol' ? parseFloat(entry.petrol) : parseFloat(entry.diesel);
    }

    // Agar koi purani entry nahi mili to sabse purani entry use karo
    const oldest = sorted[sorted.length - 1];
    return fuelType === 'Petrol' ? parseFloat(oldest.petrol) : parseFloat(oldest.diesel);
  }

  // ============================================
  // FUEL PRICES - SETTINGS SE LOAD
  // ============================================

  async function loadFuelPricesFromSettings() {
    try {
      console.log('🔍 Settings se fuel prices load ho rahe hain...');

      const { data, error } = await supabase
        .from('settings')
        .select('price_history')
        .limit(10);

      if (error) {
        console.error('❌ Settings error:', error.message);
        return;
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ Settings table empty. Settings page par prices set karein.');
        showToast('warning', 'Prices Set Karein', 'Settings page par Petrol/Diesel price set karein!');
        return;
      }

      // Saari rows se price_history merge karo
      let allHistory = [];
      data.forEach(row => {
        if (row.price_history && Array.isArray(row.price_history)) {
          allHistory = allHistory.concat(row.price_history);
        }
      });

      // Duplicates remove - same date ki latest entry raho
      const uniqueHistory = [];
      const seenDates = new Set();
      allHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
      allHistory.forEach(entry => {
        if (!seenDates.has(entry.date)) {
          seenDates.add(entry.date);
          uniqueHistory.push(entry);
        }
      });

      fuelPriceHistory = uniqueHistory;
      console.log('📋 Price history loaded:', fuelPriceHistory);

      if (fuelPriceHistory.length > 0) {
        // Today ki price set karo (ya latest available)
        const today = new Date().toISOString().split('T')[0];
        window.fuelPrices.Petrol = getPriceForDate(today, 'Petrol');
        window.fuelPrices.Diesel = getPriceForDate(today, 'Diesel');

        console.log('✅ Current fuel prices:', window.fuelPrices);

        const src = document.getElementById('sale-price-source');
        if (src) {
          src.textContent = `Settings se: Petrol Rs.${window.fuelPrices.Petrol} | Diesel Rs.${window.fuelPrices.Diesel}`;
          src.className = 'text-success small';
        }
      } else {
        console.warn('⚠️ Price history empty hai. Settings page par prices set karein.');
        showToast('warning', 'Prices Set Karein', 'Settings page par Petrol/Diesel price set karein!');
      }

    } catch (err) {
      console.error('❌ loadFuelPricesFromSettings exception:', err);
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
    console.log('Loading customers...');
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
    console.log('✅ Summary updated');
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
      const fuelDesc = t.description || '';
      const fuelType = fuelDesc.includes('Petrol') ? 'Petrol' : fuelDesc.includes('Diesel') ? 'Diesel' : '-';

      // Unit price: pehle saved unit_price use karo, warna history se nikalo
      let displayPrice = '-';
      if (t.unit_price && t.unit_price > 0) {
        displayPrice = 'Rs. ' + fmt(t.unit_price);
      } else if (fuelType !== '-') {
        const txDate = date.toISOString().split('T')[0];
        const histPrice = getPriceForDate(txDate, fuelType);
        if (histPrice > 0) displayPrice = 'Rs. ' + fmt(histPrice) + ' (est.)';
      }

      return `<tr>
        <td>${date.toLocaleDateString('en-PK')}<br>
          <small class="text-muted">${date.toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'})}</small>
        </td>
        <td>${t.customers?.name || 'N/A'} <small class="text-muted">(${t.customers?.sr_no || '-'})</small></td>
        <td><span class="badge ${typeClass}">${t.transaction_type}</span></td>
        <td>${fuelType}</td>
        <td>${(t.liters > 0) ? fmt(t.liters) + ' L' : '-'}</td>
        <td>${displayPrice}</td>
        <td><strong>Rs. ${fmt(t.amount)}</strong></td>
        <td>${t.description || '-'}</td>
        <td><button class="btn btn-sm btn-outline-danger" onclick="window.deleteTransaction(${t.id})">
          <i class="bi bi-trash"></i></button></td>
      </tr>`;
    }).join('');
  }

  // ============================================
  // FUEL PRICE FUNCTIONS
  // ============================================

  window.updateSaleFuelPrice = function () {
    const fuel = $('sale-fuel-type')?.value;
    if (!fuel) return;
    const price = window.fuelPrices[fuel] || 0;
    if ($('sale-unit-price')) $('sale-unit-price').value = price;

    const src = $('sale-price-source');
    if (src) {
      if (price > 0) {
        src.textContent = `Settings se: ${fuel} = Rs. ${price} (aaj ki price)`;
        src.className = 'text-success small';
      } else {
        src.textContent = '⚠️ Price 0 hai! Settings page par price set karein.';
        src.className = 'text-danger small fw-bold';
      }
    }
    window.calcSaleFromLiters();
  };

  window.calcSaleFromLiters = function () {
    const liters = parseFloat($('sale-liters')?.value) || 0;
    const rate = parseFloat($('sale-unit-price')?.value) || 0;
    const amountEl = $('sale-amount');
    if (amountEl) amountEl.value = (liters > 0 && rate > 0) ? (liters * rate).toFixed(2) : '';
  };

  window.calcSaleFromAmount = function () {
    const amount = parseFloat($('sale-amount-direct')?.value) || 0;
    const rate = parseFloat($('sale-unit-price')?.value) || 0;
    if ($('sale-amount')) $('sale-amount').value = amount > 0 ? amount.toFixed(2) : '';
    if ($('sale-liters') && rate > 0 && amount > 0) $('sale-liters').value = (amount / rate).toFixed(2);
  };

  window.toggleSaleMethod = function (method) {
    const lSec = $('sale-liters-section');
    const aSec = $('sale-amount-section');
    if (method === 'liters') { if(lSec) lSec.style.display='block'; if(aSec) aSec.style.display='none'; }
    else { if(lSec) lSec.style.display='none'; if(aSec) aSec.style.display='block'; }
  };

  window.calculateVasooliAmount = function () {
    const fuel = $('vasooli-fuel-category')?.value;
    const liters = parseFloat($('vasooli-liters')?.value) || 0;
    if (!fuel || !liters) return;
    const price = window.fuelPrices[fuel] || 0;
    if ($('vasooli-amount')) $('vasooli-amount').value = (liters * price).toFixed(2);
  };

  // ============================================
  // NEW SALE - Unit price bhi save hoti hai
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
    if (!amount || amount <= 0) { alert('Amount enter karein'); return; }

    try {
      const { error } = await supabase.from('transactions').insert([{
        customer_id: parseInt(customerId),
        transaction_type: paymentType === 'cash' ? 'Debit' : 'Credit',
        amount: amount,
        liters: liters || null,
        unit_price: unitPrice || null,  // Us waqt ki price save hoti hai
        description: `${fuelType} sale${description ? ' - ' + description : ''}`
      }]);
      if (error) throw error;
      showToast('success', 'Kamyab!', `${fuelType} sale Rs.${fmt(amount)} record ho gayi!`);
      closeModal('newSaleModal');
      loadInitialTransactions();
    } catch (err) {
      console.error('Sale error:', err);
      alert('Error: ' + err.message);
    }
  }

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
      fullDesc = `Payment for ${d.toLocaleDateString('en-US',{month:'long',year:'numeric'})}`;
    }
    if (fuelCat) fullDesc += ` (${fuelCat})`;
    if (description) fullDesc += ` - ${description}`;

    try {
      const { error } = await supabase.from('transactions').insert([{
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
      alert('Error: ' + err.message);
    }
  }

  async function handleExpense() {
    const amount = parseFloat($('expense-amount')?.value) || 0;
    const description = $('expense-description')?.value;
    const expenseType = $('expense-type')?.value;
    const account = $('expense-account')?.value;

    if (!amount) { alert('Amount enter karein'); return; }
    if (!description) { alert('Description enter karein'); return; }
    if (!expenseType) { alert('Expense type select karein'); return; }
    if (!account) { alert('Account select karein'); return; }

    try {
      let customerId = null;
      const { data: owner } = await supabase.from('customers').select('id').eq('category','Owner').maybeSingle();
      if (owner) {
        customerId = owner.id;
      } else {
        const { data: newOwner, error: ce } = await supabase
          .from('customers').insert([{sr_no:0,name:'Owner',category:'Owner',balance:0}]).select().single();
        if (ce) throw ce;
        customerId = newOwner.id;
      }
      const { error } = await supabase.from('transactions').insert([{
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
      alert('Error: ' + err.message);
    }
  }

  window.deleteTransaction = async function (id) {
    if (!confirm('Delete karein?')) return;
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      showToast('success', 'Delete', 'Transaction delete ho gaya!');
      loadInitialTransactions();
    } catch (err) { alert('Error: ' + err.message); }
  };

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
    toastEl.className = `toast ${type==='success'?'bg-success text-white':type==='warning'?'bg-warning':'bg-danger text-white'}`;
    new bootstrap.Toast(toastEl, { delay: 3500 }).show();
  }

  function setupEventListeners() {
    const saleForm = $('newSaleForm');
    if (saleForm) saleForm.addEventListener('submit', e => { e.preventDefault(); handleNewSale(); });

    const vasooliForm = $('vasooliForm');
    if (vasooliForm) vasooliForm.addEventListener('submit', e => { e.preventDefault(); handleVasooli(); });

    const expenseForm = $('expenseForm');
    if (expenseForm) expenseForm.addEventListener('submit', e => { e.preventDefault(); handleExpense(); });

    const fuelSelect = $('sale-fuel-type');
    if (fuelSelect) fuelSelect.addEventListener('change', window.updateSaleFuelPrice);

    const litersInput = $('sale-liters');
    if (litersInput) litersInput.addEventListener('input', window.calcSaleFromLiters);

    const amountDirect = $('sale-amount-direct');
    if (amountDirect) amountDirect.addEventListener('input', window.calcSaleFromAmount);

    const lblLiters = $('lbl-by-liters');
    const lblAmount = $('lbl-by-amount');
    if (lblLiters) lblLiters.addEventListener('click', () => window.toggleSaleMethod('liters'));
    if (lblAmount) lblAmount.addEventListener('click', () => window.toggleSaleMethod('amount'));

    const vasFuelCat = $('vasooli-fuel-category');
    const vasLiters = $('vasooli-liters');
    if (vasFuelCat) vasFuelCat.addEventListener('change', window.calculateVasooliAmount);
    if (vasLiters) vasLiters.addEventListener('input', window.calculateVasooliAmount);

    const btnApply = $('btn-apply-filter');
    const btnClear = $('btn-clear-filter');
    if (btnApply) btnApply.addEventListener('click', window.applyFilters);
    if (btnClear) btnClear.addEventListener('click', window.clearTransactionFilters);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (document.body.getAttribute('data-page') !== 'transactions') return;
    console.log('🚀 Transactions page initializing...');
    await loadFuelPricesFromSettings();
    await loadCustomers();
    await loadInitialTransactions();
    setupEventListeners();
    console.log('✅ Ready! Fuel Prices:', window.fuelPrices);
  });

  window.loadInitialTransactions = loadInitialTransactions;

})();