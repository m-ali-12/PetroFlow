// =============================================
// TRANSACTIONS PAGE - COMPLETE WORKABLE VERSION
// =============================================
(function () {
  'use strict';
  const supabase = window.supabaseClient;

  let allTransactions = [];
  let allCustomers = [];
  let fuelHistory = [];
  let currentUserId = null;
  let isSubmitting = false;

  function $(id) { return document.getElementById(id); }

  function fmt(n) {
    return Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // 1. Auth & Initialization
  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      currentUserId = user.id;
      await loadPriceHistory();
      await loadCustomers();
      await loadTransactions();
      setupEventListeners();
    } else {
      window.location.href = 'index.html';
    }
  }

  // 2. Load Fuel Price History (Har 15 din ka record)
  async function loadPriceHistory() {
    try {
      const { data } = await supabase.from('settings').select('price_history').eq('user_id', currentUserId).maybeSingle();
      fuelHistory = data?.price_history || JSON.parse(localStorage.getItem('fuel_price_history')) || [];
    } catch (e) { console.error("History Load Error:", e); }
  }

  // Get Price based on Transaction Date
  function getPriceForDate(dateStr, fuelType) {
    if (!fuelHistory.length) return fuelType === 'Petrol' ? 285 : 305;
    const targetDate = new Date(dateStr);
    const sorted = [...fuelHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
    const entry = sorted.find(e => new Date(e.date) <= targetDate);
    return entry ? (fuelType === 'Petrol' ? entry.petrol : entry.diesel) : (fuelType === 'Petrol' ? 285 : 305);
  }

  // 3. Load Customers & Remaining Balance
  async function loadCustomers() {
    const { data } = await supabase.from('customers').select('*').eq('user_id', currentUserId).order('name');
    allCustomers = data || [];
    const selects = ['sale-customer', 'vasooli-customer'];
    selects.forEach(id => {
      const el = $(id);
      if (el) {
        el.innerHTML = '<option value="">Select Customer</option>' + 
          allCustomers.map(c => `<option value="${c.id}">${c.name} (Bal: ${fmt(c.balance)})</option>`).join('');
      }
    });
  }

  // 4. Auto Calculations
  function setupEventListeners() {
    const inputs = ['sale-fuel-type', 'sale-liters', 'sale-amount', 'sale-date'];
    inputs.forEach(id => $(id)?.addEventListener('input', () => {
      const type = $('sale-fuel-type').value;
      const date = $('sale-date').value || new Date().toISOString().split('T')[0];
      const price = getPriceForDate(date, type);
      
      if (document.activeElement.id === 'sale-amount') {
        $('sale-liters').value = (parseFloat($('sale-amount').value) / price).toFixed(2);
      } else {
        $('sale-amount').value = (parseFloat($('sale-liters').value) * price).toFixed(2);
      }
    }));

    // Vasooli Balance Show
    $('vasooli-customer')?.addEventListener('change', (e) => {
      const cust = allCustomers.find(c => c.id == e.target.value);
      if (cust) $('vasooli-balance-info').textContent = `Remaining Balance: Rs. ${fmt(cust.balance)}`;
    });

    $('newSaleForm')?.addEventListener('submit', handleNewSale);
    $('vasooliForm')?.addEventListener('submit', handleVasooli);
    $('expenseForm')?.addEventListener('submit', handleExpense);
  }

  // 5. CRUD Operations
  async function handleNewSale(e) {
    e.preventDefault();
    if (isSubmitting) return;
    isSubmitting = true;
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;

    const qty = parseFloat($('sale-liters').value);
    const amt = parseFloat($('sale-amount').value);
    const cid = $('sale-customer').value;

    const { error } = await supabase.from('transactions').insert([{
      user_id: currentUserId,
      type: 'Sale',
      item_name: $('sale-fuel-type').value,
      quantity: qty,
      amount: amt,
      customer_id: cid || null,
      date: $('sale-date').value
    }]);

    if (!error && cid) {
      const cust = allCustomers.find(c => c.id == cid);
      await supabase.from('customers').update({ balance: (cust.balance || 0) + amt }).eq('id', cid);
    }

    location.reload();
  }

  async function handleVasooli(e) {
    e.preventDefault();
    const cid = $('vasooli-customer').value;
    const amt = parseFloat($('vasooli-amount').value);
    
    await supabase.from('transactions').insert([{
      user_id: currentUserId,
      type: 'Vasooli',
      amount: amt,
      customer_id: cid,
      date: $('vasooli-date').value
    }]);

    const cust = allCustomers.find(c => c.id == cid);
    await supabase.from('customers').update({ balance: (cust.balance || 0) - amt }).eq('id', cid);
    location.reload();
  }

  async function handleExpense(e) {
    e.preventDefault();
    await supabase.from('transactions').insert([{
      user_id: currentUserId,
      type: 'Expense',
      item_name: $('expense-category').value,
      amount: parseFloat($('expense-amount').value),
      description: $('expense-note').value,
      date: $('expense-date').value
    }]);
    location.reload();
  }

  async function loadTransactions() {
    const { data } = await supabase.from('transactions').select('*, customers(name)').eq('user_id', currentUserId).order('date', { ascending: false }).limit(100);
    const tbody = $('transactions-tbody');
    if (tbody) {
      tbody.innerHTML = data.map(t => `
        <tr>
          <td>${t.date}</td>
          <td><span class="badge ${t.type==='Sale'?'bg-success':t.type==='Vasooli'?'bg-primary':'bg-danger'}">${t.type}</span></td>
          <td>${t.customers?.name || t.item_name || 'Cash Sale'}</td>
          <td>${t.quantity || '-'}</td>
          <td>${fmt(t.amount)}</td>
        </tr>
      `).join('');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();