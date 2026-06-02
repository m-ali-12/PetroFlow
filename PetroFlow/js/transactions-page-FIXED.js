// =============================================
// TRANSACTIONS PAGE — FIXED (Settings price sync + manual override + Vasooli pending+rate info)
// Design unchanged. Functionality preserved. Auth + per-user data.
// =============================================
(function () {
  'use strict';

  const supabase = window.supabaseClient;

  // Data caches
  let allTransactions = [];
  let filteredList = [];
  let allCustomers = [];

  // State
  let isSubmitting = false;
  let fuelPrices = { Petrol: 285, Diesel: 305 };
  let currentUserId = null;

  // Pagination / sorting
  let currentPage = 1;
  let itemsPerPage = 10;
  let sortOrder = 'desc';

  function $(id) { return document.getElementById(id); }

  function fmt(n) {
    return Number(n || 0).toLocaleString('en-PK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // ─────────────────────────────────────────
  // AUTH
  // ─────────────────────────────────────────
  async function getUser() {
    // Prefer shared auth helper if present
    try {
      if (window.auth && typeof window.auth.getCurrentUser === 'function') {
        const u = await window.auth.getCurrentUser();
        const user = u?.id ? u : (u?.user?.id ? u.user : (u?.data?.user?.id ? u.data.user : null));
        if (user?.id) {
          currentUserId = user.id;
          return user;
        }
      }
    } catch (_) {}

    // Supabase auth (retry a few times)
    for (let i = 0; i < 3; i++) {
      const { data } = await supabase.auth.getUser();
      const user = data?.user || null;
      if (user?.id) {
        currentUserId = user.id;
        return user;
      }
      await new Promise(r => setTimeout(r, 350));
    }

    window.location.href = 'login.html';
    return null;
  }

  function isMissingColumnError(err, column) {
    const msg = (err?.message || '').toLowerCase();
    return msg.includes('column') && msg.includes(column.toLowerCase()) && msg.includes('does not exist');
  }

  // ─────────────────────────────────────────
  // LOAD FUEL PRICES — robust (Supabase per-user → fallback global row → localStorage)
  // This fixes: "Transactions page default price; Settings price not applying"
  // ─────────────────────────────────────────
  async function loadFuelPrices() {
    // 1) localStorage first (fast + works offline)
    try {
      const cached = JSON.parse(localStorage.getItem('fuel_prices') || 'null');
      if (cached && (cached.Petrol || cached.Diesel)) {
        fuelPrices = {
          Petrol: parseFloat(cached.Petrol) || fuelPrices.Petrol,
          Diesel: parseFloat(cached.Diesel) || fuelPrices.Diesel
        };
      }
    } catch (_) {}

    // 2) Supabase settings row
    try {
      // Try per-user settings first
      if (currentUserId) {
        const res = await supabase
          .from('settings')
          .select('petrol_price, diesel_price, user_id')
          .eq('user_id', currentUserId)
          .maybeSingle();

        if (!res.error && res.data) {
          fuelPrices = {
            Petrol: parseFloat(res.data.petrol_price) || fuelPrices.Petrol,
            Diesel: parseFloat(res.data.diesel_price) || fuelPrices.Diesel
          };
          return;
        }

        // If user_id column doesn't exist OR no row found, fallback to global single row
        if (res.error && isMissingColumnError(res.error, 'user_id')) {
          const res2 = await supabase
            .from('settings')
            .select('petrol_price, diesel_price')
            .maybeSingle();

          if (!res2.error && res2.data) {
            fuelPrices = {
              Petrol: parseFloat(res2.data.petrol_price) || fuelPrices.Petrol,
              Diesel: parseFloat(res2.data.diesel_price) || fuelPrices.Diesel
            };
          }
          return;
        }
      } else {
        // No user id yet — global fallback
        const res3 = await supabase
          .from('settings')
          .select('petrol_price, diesel_price')
          .maybeSingle();

        if (!res3.error && res3.data) {
          fuelPrices = {
            Petrol: parseFloat(res3.data.petrol_price) || fuelPrices.Petrol,
            Diesel: parseFloat(res3.data.diesel_price) || fuelPrices.Diesel
          };
        }
      }
    } catch (e) {
      console.warn('loadFuelPrices fallback:', e?.message || e);
    }
  }

  // ─────────────────────────────────────────
  // LOAD CUSTOMERS
  // ─────────────────────────────────────────
  async function loadCustomers() {
    if (!currentUserId) return;
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', currentUserId)
        .order('sr_no');

      if (error) throw error;
      allCustomers = data || [];
      fillCustomerDropdowns();
    } catch (e) {
      console.error('Customers load error:', e.message);
      showToast('Customers load error: ' + e.message, 'error');
    }
  }

  function fillCustomerDropdowns() {
    const sale = $('sale-customer');
    const vasooli = $('vasooli-customer');

    const base = '<option value="">Select Customer</option>';
    const opts = allCustomers.map(c => `<option value="${c.id}">${c.sr_no} – ${c.name}</option>`).join('');

    if (sale) sale.innerHTML = base + opts;

    if (vasooli) {
      const opts2 = allCustomers
        .filter(c => c.category !== 'Owner')
        .map(c => `<option value="${c.id}">${c.sr_no} – ${c.name} (Bal: Rs. ${fmt(c.balance)})</option>`)
        .join('');
      vasooli.innerHTML = base + opts2;
    }
  }

  // ─────────────────────────────────────────
  // LOAD TRANSACTIONS
  // ─────────────────────────────────────────
  async function loadTransactions() {
    if (!currentUserId) return;
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, customers(name, sr_no)')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: sortOrder === 'asc' })
        .limit(2000);

      if (error) throw error;
      allTransactions = data || [];
      filteredList = [...allTransactions];

      renderTable();
      updateStats();
    } catch (e) {
      console.error('Transactions load error:', e.message);
      showToast('Transactions load error: ' + e.message, 'error');
    }
  }

  // ─────────────────────────────────────────
  // TABLE + STATS
  // ─────────────────────────────────────────
  function updateStats() {
    const totalDebit = allTransactions.filter(t => t.transaction_type === 'Debit').reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalCredit = allTransactions.filter(t => t.transaction_type === 'Credit').reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalExpense = allTransactions.filter(t => t.transaction_type === 'Expense').reduce((s, t) => s + Number(t.amount || 0), 0);

    if ($('total-debit')) $('total-debit').textContent = fmt(totalDebit);
    if ($('total-credit')) $('total-credit').textContent = fmt(totalCredit);
    if ($('total-expense')) $('total-expense').textContent = fmt(totalExpense);
    if ($('net-balance')) $('net-balance').textContent = fmt(totalDebit - totalCredit - totalExpense);

    if ($('transaction-count')) $('transaction-count').textContent = String(allTransactions.length);
    if ($('debit-count')) $('debit-count').textContent = `${allTransactions.filter(t => t.transaction_type === 'Debit').length} transactions`;
    if ($('credit-count')) $('credit-count').textContent = `${allTransactions.filter(t => t.transaction_type === 'Credit').length} transactions`;
    if ($('expense-count')) $('expense-count').textContent = `${allTransactions.filter(t => t.transaction_type === 'Expense').length} transactions`;
  }

  function renderTable() {
    const table = $('transactions-table');
    if (!table) return;

    const start = (currentPage - 1) * itemsPerPage;
    const pageItems = filteredList.slice(start, start + itemsPerPage);

    const rows = pageItems.map(t => {
      const date = t.created_at ? new Date(t.created_at).toLocaleString('en-PK') : '';
      const cust = t.customers ? `${t.customers.sr_no} – ${t.customers.name}` : '';
      const liters = t.liters ? `${fmt(t.liters)} L` : '';
      const rate = t.unit_price ? `Rs. ${fmt(t.unit_price)}/L` : '';
      const fuel = t.fuel_type ? t.fuel_type : '';
      const meta = [fuel, liters, rate].filter(Boolean).join(' • ');
      return `
        <tr>
          <td>${date}</td>
          <td>${cust}</td>
          <td>${t.transaction_type || ''}</td>
          <td>Rs. ${fmt(t.amount)}</td>
          <td>${meta}</td>
          <td>${t.description || ''}</td>
        </tr>
      `;
    }).join('');

    table.querySelector('tbody') ? (table.querySelector('tbody').innerHTML = rows) : (table.innerHTML = rows);
  }

  // ─────────────────────────────────────────
  // HELPERS: customer pending + last rate
  // ─────────────────────────────────────────
  function getCustomerById(id) {
    const n = Number(id);
    return allCustomers.find(c => Number(c.id) === n) || null;
  }

  function getLastFuelDebitTx(customerId) {
    const n = Number(customerId);
    const list = allTransactions
      .filter(t => Number(t.customer_id) === n && t.transaction_type === 'Debit' && (t.fuel_type === 'Petrol' || t.fuel_type === 'Diesel'))
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return list[0] || null;
  }

  function updateVasooliInfo(customerId) {
    const form = $('vasooliForm');
    if (!form) return;

    // We will reuse the existing small text (design unchanged)
    const smalls = form.querySelectorAll('small.text-muted');
    const infoSmall = smalls && smalls.length ? smalls[0] : null; // "Kis fuel ki vasooli hai"
    if (!infoSmall) return;

    if (!customerId) {
      infoSmall.textContent = 'Kis fuel ki vasooli hai';
      return;
    }

    const c = getCustomerById(customerId);
    const pending = c ? Number(c.balance || 0) : 0;

    const lastTx = getLastFuelDebitTx(customerId);
    const rateTxt = lastTx?.unit_price ? `Last Rate: Rs. ${fmt(lastTx.unit_price)}/L (${lastTx.fuel_type})` : 'Last Rate: N/A';

    // Pending bill (positive balance = customer owes)
    const pendingTxt = pending > 0 ? `Pending: Rs. ${fmt(pending)}` : (pending < 0 ? `Advance: Rs. ${fmt(Math.abs(pending))}` : 'Pending: Rs. 0.00');

    infoSmall.textContent = `${pendingTxt} • ${rateTxt}`;
  }

  // ─────────────────────────────────────────
  // FORM LOGIC: New Sale (Debit)
  // - Price auto from Settings
  // - User can override manually
  // - Amount auto-calculated: liters × unit_price
  // ─────────────────────────────────────────
  function setupAutoCalculate() {
    // New Sale
    const fuelSel = $('sale-fuel-type');
    const litersIn = $('sale-liters');
    const priceIn = $('sale-unit-price');
    const amountIn = $('sale-amount');

    // manual override tracking (no UI change)
    let lastAutoPrice = null;

    function applyAutoPrice() {
      if (!fuelSel || !priceIn) return;
      const f = fuelSel.value;
      const auto = fuelPrices[f] || '';
      // Only overwrite if input empty OR equals last auto (user didn't override)
      const current = parseFloat(priceIn.value);
      const autoNum = parseFloat(auto);
      if (!priceIn.value || (lastAutoPrice !== null && !isNaN(current) && Math.abs(current - lastAutoPrice) < 0.0001)) {
        priceIn.value = auto ? String(autoNum) : '';
      }
      lastAutoPrice = auto ? autoNum : null;
    }

    function calcSale() {
      if (!amountIn) return;
      const l = parseFloat(litersIn?.value) || 0;
      const p = parseFloat(priceIn?.value) || 0;
      if (l > 0 && p > 0) {
        amountIn.value = (l * p).toFixed(2);
      }
    }

    // On load, set price from current selected fuel
    applyAutoPrice();
    calcSale();

    fuelSel?.addEventListener('change', () => {
      applyAutoPrice();
      calcSale();
    });
    litersIn?.addEventListener('input', calcSale);
    priceIn?.addEventListener('input', () => {
      // user override — just recalc
      calcSale();
    });

    // Vasooli auto amount (optional)
    const vCust = $('vasooli-customer');
    const vFuel = $('vasooli-fuel-category');
    const vLiters = $('vasooli-liters');
    const vAmt = $('vasooli-amount');

    function calcVasooli() {
      const f = vFuel?.value;
      const l = parseFloat(vLiters?.value) || 0;
      if (f && (f === 'Petrol' || f === 'Diesel') && l > 0 && vAmt) {
        const price = fuelPrices[f] || (f === 'Petrol' ? 285 : 305);
        vAmt.value = (l * price).toFixed(2);
      }
    }

    vFuel?.addEventListener('change', calcVasooli);
    vLiters?.addEventListener('input', calcVasooli);

    // Update pending + last rate info on customer select
    vCust?.addEventListener('change', () => {
      updateVasooliInfo(vCust.value);
    });
  }

  // ─────────────────────────────────────────
  // SUBMIT HELPERS
  // ─────────────────────────────────────────
  async function updateCustomerBalance(customerId, delta) {
    const id = Number(customerId);
    const c = getCustomerById(id);
    if (!c) return;

    const newBal = Number(c.balance || 0) + Number(delta || 0);

    // Update DB
    const { error } = await supabase
      .from('customers')
      .update({ balance: newBal })
      .eq('id', id)
      .eq('user_id', currentUserId);

    if (error) throw error;

    // Update cache
    c.balance = newBal;
    fillCustomerDropdowns();
  }

  // ─────────────────────────────────────────
  // HANDLE: New Sale (Debit)
  // Stores unit_price used (either settings or manual) + liters + fuel_type
  // ─────────────────────────────────────────
  async function handleNewSale() {
    if (isSubmitting) return;
    isSubmitting = true;

    try {
      const custId = $('sale-customer')?.value;
      const fuel = $('sale-fuel-type')?.value;
      const liters = parseFloat($('sale-liters')?.value) || 0;
      const unitPrice = parseFloat($('sale-unit-price')?.value) || 0;
      const amount = parseFloat($('sale-amount')?.value) || 0;
      const desc = ($('sale-description')?.value || '').trim();
      const payType = $('sale-payment-type')?.value || null;
      const byAmount = $('sale-by-amount')?.checked;
      const directAmount = parseFloat($('sale-amount-direct')?.value) || 0;

      if (!custId) throw new Error('Please select customer');
      if (!fuel) throw new Error('Please select fuel type');

      // If user used "by amount", allow direct amount; keep unitPrice if provided, else null
      const finalAmount = byAmount ? (directAmount > 0 ? directAmount : amount) : amount;

      if (!(finalAmount > 0)) throw new Error('Amount is required');

      // If liters given and unitPrice missing, fallback to settings
      let finalUnitPrice = unitPrice;
      if (!finalUnitPrice && liters > 0 && (fuel === 'Petrol' || fuel === 'Diesel')) {
        finalUnitPrice = fuelPrices[fuel] || 0;
      }

      const fullDesc = desc || `Fuel Sale (${fuel})`;

      const row = {
        user_id: currentUserId,
        customer_id: Number(custId),
        transaction_type: 'Debit',
        amount: finalAmount,
        liters: liters > 0 ? liters : null,
        unit_price: (liters > 0 && finalUnitPrice > 0) ? finalUnitPrice : null,
        fuel_type: fuel || null,
        description: fullDesc,
        payment_type: payType
      };

      const { error } = await supabase.from('transactions').insert([row]);
      if (error) throw error;

      // Update balance: Debit increases balance
      await updateCustomerBalance(custId, finalAmount);

      showToast('Sale recorded successfully', 'success');

      // Reload
      await loadTransactions();
      updateVasooliInfo($('vasooli-customer')?.value || '');

      // Close modal if exists
      try { bootstrap.Modal.getInstance($('newSaleModal'))?.hide(); } catch (_) {}

      // Reset form
      const f = $('newSaleForm');
      if (f) f.reset();
    } catch (e) {
      console.error(e);
      showToast(e.message || 'Failed to record sale', 'error');
    } finally {
      isSubmitting = false;
    }
  }

  // ─────────────────────────────────────────
  // HANDLE: Vasooli (Credit)
  // ─────────────────────────────────────────
  async function handleVasooli() {
    if (isSubmitting) return;
    isSubmitting = true;

    try {
      const custId = $('vasooli-customer')?.value;
      const amount = parseFloat($('vasooli-amount')?.value) || 0;
      const date = $('vasooli-date')?.value;
      const month = $('vasooli-month')?.value || null;
      const notes = ($('vasooli-description')?.value || '').trim();
      const fuelCat = $('vasooli-fuel-category')?.value || null;
      const liters = parseFloat($('vasooli-liters')?.value) || 0;

      if (!custId) throw new Error('Please select customer');
      if (!(amount > 0)) throw new Error('Please enter amount');

      const row = {
        user_id: currentUserId,
        customer_id: Number(custId),
        transaction_type: 'Credit',
        amount,
        fuel_type: (fuelCat && fuelCat !== 'Select Category') ? fuelCat : null,
        liters: liters > 0 ? liters : null,
        description: notes || 'Payment received',
        payment_month: month
      };

      if (date) row.created_at = new Date(date).toISOString();

      const { error } = await supabase.from('transactions').insert([row]);
      if (error) throw error;

      // Credit reduces balance
      await updateCustomerBalance(custId, -amount);

      showToast('Payment recorded successfully', 'success');

      await loadTransactions();
      updateVasooliInfo(custId);

      const f = $('vasooliForm');
      if (f) f.reset();
    } catch (e) {
      console.error(e);
      showToast(e.message || 'Failed to record payment', 'error');
    } finally {
      isSubmitting = false;
    }
  }

  // ─────────────────────────────────────────
  // HANDLE: Expense
  // ─────────────────────────────────────────
  async function handleExpense() {
    if (isSubmitting) return;
    isSubmitting = true;

    try {
      const type = $('expense-type')?.value;
      const amount = parseFloat($('expense-amount')?.value) || 0;
      const desc = ($('expense-description')?.value || '').trim();
      const account = $('expense-account')?.value || null;

      if (!type) throw new Error('Please select expense type');
      if (!(amount > 0)) throw new Error('Please enter amount');

      const row = {
        user_id: currentUserId,
        transaction_type: 'Expense',
        amount,
        description: desc || type,
        expense_type: type,
        expense_account: account
      };

      const { error } = await supabase.from('transactions').insert([row]);
      if (error) throw error;

      showToast('Expense recorded successfully', 'success');

      await loadTransactions();

      const f = $('expenseForm');
      if (f) f.reset();

      try { bootstrap.Modal.getInstance($('expenseModal'))?.hide(); } catch (_) {}
    } catch (e) {
      console.error(e);
      showToast(e.message || 'Failed to record expense', 'error');
    } finally {
      isSubmitting = false;
    }
  }

  // ─────────────────────────────────────────
  // TOAST
  // ─────────────────────────────────────────
  function showToast(message, type = 'info') {
    const toast = $('liveToast');
    if (!toast) return;

    const toastTitle = $('toast-title');
    const toastMessage = $('toast-message');
    const titles = { success: 'Success', error: 'Error', warning: 'Warning', info: 'Info' };

    if (toastTitle) toastTitle.textContent = titles[type] || 'Notification';
    if (toastMessage) toastMessage.textContent = message;

    try {
      const bsToast = new bootstrap.Toast(toast);
      bsToast.show();
    } catch (_) {
      alert(message);
    }
  }

  // ─────────────────────────────────────────
  // BIND FORMS
  // ─────────────────────────────────────────
  function bindForms() {
    const newSaleForm = $('newSaleForm');
    if (newSaleForm) {
      newSaleForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleNewSale();
      });
    }

    const vasooliForm = $('vasooliForm');
    if (vasooliForm) {
      vasooliForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleVasooli();
      });
    }

    const expenseForm = $('expenseForm');
    if (expenseForm) {
      expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleExpense();
      });
    }
  }

  // ─────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', async () => {
    // Only on transactions page
    if (document.body.getAttribute('data-page') && document.body.getAttribute('data-page') !== 'transactions') return;

    const user = await getUser();
    if (!user) return;

    // Load prices first, then data
    await loadFuelPrices();
    await loadCustomers();
    await loadTransactions();

    // Setup UI logic and forms
    setupAutoCalculate();
    bindForms();

    // default date
    if ($('vasooli-date')) $('vasooli-date').value = new Date().toISOString().split('T')[0];

    // Make sure New Sale price reflects settings immediately
    const fuelSel = $('sale-fuel-type');
    const priceIn = $('sale-unit-price');
    if (fuelSel && priceIn && fuelSel.value) {
      const auto = fuelPrices[fuelSel.value];
      if (auto) priceIn.value = String(auto);
    }
  });

})();
