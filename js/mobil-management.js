// =============================================
// MOBIL OIL MANAGEMENT - COMPLETE FIXED
// Auth disabled - works without user_id
// All window functions defined at top level
// =============================================
(function () {
  'use strict';

  const supabase = window.supabaseClient;

  function $(id) { return document.getElementById(id); }

  function formatNumber(num) {
    return Number(num || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function showToast(message, type = 'info') {
    const toast = $('liveToast');
    if (!toast) { alert(message); return; }
    const toastTitle = $('toast-title');
    const toastMessage = $('toast-message');
    const titles = { success: 'Kamyab!', error: 'Ghalati', warning: 'Khabardar', info: 'Info' };
    if (toastTitle) toastTitle.textContent = titles[type] || 'Info';
    if (toastMessage) toastMessage.textContent = message;
    toast.className = `toast align-items-center text-white border-0 ${
      type === 'success' ? 'bg-success' :
      type === 'error'   ? 'bg-danger'  :
      type === 'warning' ? 'bg-warning text-dark' : 'bg-secondary'
    }`;
    new bootstrap.Toast(toast, { delay: 3500 }).show();
  }

  // ── NO AUTH – settings page ki tarah direct DB access ──────────────────

  function isMissingColumnError(err, col) {
    const msg = (err?.message || '').toLowerCase();
    return msg.includes('column') && msg.includes(col.toLowerCase()) && msg.includes('does not exist');
  }

  // ── DB HELPERS (no user_id filter) ─────────────────────────────────────

  async function getAllCustomers() {
    const { data, error } = await supabase
      .from('customers')
      .select('id, sr_no, name, category, balance');
    if (error) throw error;
    return data || [];
  }

  async function getTankByName(name) {
    const { data, error } = await supabase
      .from('tanks')
      .select('*')
      .eq('name', name)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function updateTankStock(id, newStock) {
    const { error } = await supabase
      .from('tanks')
      .update({ current_stock: newStock, last_updated: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  async function insertTransaction(row) {
    const { error } = await supabase.from('transactions').insert([row]);
    if (error) throw error;
  }

  async function getCustomerById(id) {
    const { data, error } = await supabase
      .from('customers')
      .select('id, balance')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function updateCustomerBalance(id, balance) {
    const { error } = await supabase
      .from('customers')
      .update({ balance })
      .eq('id', id);
    if (error) throw error;
  }

  async function getOrCreateOwner() {
    // Try to find existing Owner
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('category', 'Owner')
      .maybeSingle();

    if (!error && data) return data;

    // Create owner if not found
    const pump = (window.auth && window.auth.getPumpDetails) ? window.auth.getPumpDetails() : null;
    const payload = {
      name: pump?.owner || 'Owner',
      phone: pump?.phone || '',
      category: 'Owner',
      sr_no: 0,
      balance: 0
    };
    const ins = await supabase.from('customers').insert([payload]).select().single();
    if (ins.error) throw ins.error;
    return ins.data;
  }

  async function getMobilPricesFromSettings() {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('mobil_history')
        .limit(1)
        .maybeSingle();
      if (error || !data?.mobil_history?.length) return null;
      const sorted = [...data.mobil_history].sort((a, b) => new Date(b.date) - new Date(a.date));
      return sorted[0];
    } catch (e) {
      console.warn('getMobilPricesFromSettings error:', e);
      return null;
    }
  }

  // ── AUTO CALCULATE ─────────────────────────────────────────────────────

  function setupAutoCalculate(qtyId, rateId, amountId) {
    const qty = $(qtyId), rate = $(rateId), amount = $(amountId);
    if (!qty || !rate || !amount) return;
    const calc = () => {
      amount.value = ((parseFloat(qty.value) || 0) * (parseFloat(rate.value) || 0)).toFixed(2);
    };
    qty.addEventListener('input', calc);
    rate.addEventListener('input', calc);
  }

  // ── CUSTOMER DROPDOWN ──────────────────────────────────────────────────

  async function loadCustomerDropdown() {
    try {
      const customers = await getAllCustomers();
      const select = $('sale-customer');
      if (!select) return;
      select.innerHTML = '<option value="">-- Customer Select Karein --</option>';
      customers
        .filter(c => (c.category || '').toLowerCase() !== 'owner')
        .sort((a, b) => (a.sr_no || 0) - (b.sr_no || 0))
        .forEach(c => {
          select.innerHTML += `<option value="${c.id}">${c.sr_no || ''} - ${c.name}</option>`;
        });
    } catch (err) {
      console.error('loadCustomerDropdown error:', err);
    }
  }

  // ── PRICE AUTO-FILL SETUP ──────────────────────────────────────────────

  async function setupSaleModalPriceAutoFill() {
    const saleMobilModal = document.getElementById('saleMobilModal');
    if (!saleMobilModal) return;

    saleMobilModal.addEventListener('show.bs.modal', async () => {
      const mobilTypeSelect = $('sale-mobil-type');
      const rateInput = $('sale-rate');
      if (!mobilTypeSelect || !rateInput) return;

      const prices = await getMobilPricesFromSettings();
      if (!prices) return;

      function applyRate() {
        const type = mobilTypeSelect.value;
        if (type === 'Car Mobil' && prices.car_mobil) {
          rateInput.value = prices.car_mobil;
        } else if (type === 'Open Mobil' && prices.open_mobil) {
          rateInput.value = prices.open_mobil;
        }
        const qty = $('sale-quantity');
        const amt = $('sale-amount');
        if (qty && amt) {
          amt.value = ((parseFloat(qty.value) || 0) * (parseFloat(rateInput.value) || 0)).toFixed(2);
        }
      }

      applyRate();
      mobilTypeSelect.removeEventListener('change', applyRate); // prevent duplicates
      mobilTypeSelect.addEventListener('change', applyRate);
    });
  }

  // ── LOAD STOCK ─────────────────────────────────────────────────────────

  async function loadMobilStock() {
    try {
      const { data, error } = await supabase
        .from('tanks')
        .select('*')
        .in('name', ['Car Mobil', 'Open Mobil']);
      if (error) throw error;

      const carTank  = (data || []).find(t => t.name === 'Car Mobil');
      const openTank = (data || []).find(t => t.name === 'Open Mobil');

      if ($('mobil-car-stock-page'))
        $('mobil-car-stock-page').textContent = carTank ? formatNumber(carTank.current_stock) : '0.00';
      if ($('mobil-open-stock-page'))
        $('mobil-open-stock-page').textContent = openTank ? formatNumber(openTank.current_stock) : '0.00';
    } catch (err) {
      console.error('loadMobilStock error:', err);
    }
  }

  // ── LOAD TRANSACTIONS ──────────────────────────────────────────────────

  async function loadMobilTransactions() {
    const tbody = $('mobil-transactions-table');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Loading...</td></tr>';

    try {
      // Get mobil tank IDs
      const { data: tanks, error: tankErr } = await supabase
        .from('tanks')
        .select('id, name')
        .in('name', ['Car Mobil', 'Open Mobil']);
      if (tankErr) throw tankErr;

      const tankIds = (tanks || []).map(t => t.id);
      if (tankIds.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-warning py-4">⚠️ Koi Mobil tank nahi mila. Pehle tanks table mein "Car Mobil" aur "Open Mobil" add karein.</td></tr>';
        return;
      }

      const { data, error } = await supabase
        .from('transactions')
        .select('*, customer:customers(name, sr_no), tank:tanks(name)')
        .in('tank_id', tankIds)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;

      if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Abhi koi transaction nahi hai</td></tr>';
        return;
      }

      tbody.innerHTML = data.map(t => {
        const date = new Date(t.created_at).toLocaleDateString('en-PK');
        let typeLabel, badgeColor;
        if (t.transaction_type === 'Credit') {
          typeLabel = 'Sale'; badgeColor = 'bg-success';
        } else if (t.transaction_type === 'Expense' && t.liters > 0) {
          typeLabel = 'Purchase'; badgeColor = 'bg-primary';
        } else if (t.transaction_type === 'Expense') {
          typeLabel = 'Expense'; badgeColor = 'bg-danger';
        } else {
          typeLabel = t.transaction_type; badgeColor = 'bg-secondary';
        }
        return `
          <tr>
            <td>${date}</td>
            <td><span class="badge ${badgeColor}">${typeLabel}</span></td>
            <td>${t.tank?.name || '-'}</td>
            <td>${t.customer?.name || '-'}</td>
            <td>${formatNumber(t.liters)} L</td>
            <td>Rs. ${formatNumber(t.unit_price || 0)}</td>
            <td><strong>Rs. ${formatNumber(t.amount)}</strong></td>
            <td>
              <button class="btn btn-sm btn-outline-danger" onclick="deleteMobilTransaction('${t.id}')">
                <i class="bi bi-trash"></i>
              </button>
            </td>
          </tr>`;
      }).join('');

    } catch (err) {
      console.error('loadMobilTransactions error:', err);
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-4">Error: ${err?.message || err}</td></tr>`;
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // WINDOW FUNCTIONS – yeh sabse pehle define hote hain, auth se pehle
  // ══════════════════════════════════════════════════════════════════════

  // ── RECEIVE STOCK ──────────────────────────────────────────────────────
  window.receiveMobilStock = async function () {
    const mobilType = $('receive-mobil-type')?.value;
    const supplier  = $('receive-supplier')?.value;
    const quantity  = parseFloat($('receive-quantity')?.value);
    const rate      = parseFloat($('receive-rate')?.value);
    const amount    = parseFloat($('receive-amount')?.value) || (quantity * rate);
    const date      = $('receive-date')?.value;
    const invoice   = $('receive-invoice')?.value;
    const notes     = $('receive-notes')?.value;

    if (!mobilType || !quantity || !rate || !date) {
      showToast('Mobil Type, Quantity, Rate aur Date zaroor bharein', 'error');
      return;
    }

    try {
      const tank = await getTankByName(mobilType);
      if (!tank) {
        showToast(`Tank nahi mila: "${mobilType}" — Supabase mein tanks table mein yeh add karein`, 'error');
        return;
      }

      const newStock = (parseFloat(tank.current_stock) || 0) + quantity;
      await updateTankStock(tank.id, newStock);

      const owner = await getOrCreateOwner();
      await insertTransaction({
        customer_id: owner.id,
        tank_id: tank.id,
        transaction_type: 'Expense',
        amount: amount,
        liters: quantity,
        unit_price: rate,
        description: `Mobil Purchase: ${mobilType} - ${supplier || 'Supplier'} - Invoice: ${invoice || 'N/A'}${notes ? ' | ' + notes : ''}`,
        created_at: new Date(date).toISOString()
      });

      showToast(`${quantity} Ltr ${mobilType} stock add! Kul: ${formatNumber(newStock)} Ltr`, 'success');

      const modalEl = $('receiveMobilModal');
      const modal = modalEl ? bootstrap.Modal.getInstance(modalEl) : null;
      if (modal) modal.hide();
      if ($('receiveMobilForm')) $('receiveMobilForm').reset();

      // Reset date
      const today = new Date().toISOString().split('T')[0];
      if ($('receive-date')) $('receive-date').value = today;

      loadMobilStock();
      loadMobilTransactions();

    } catch (err) {
      console.error('receiveMobilStock error:', err);
      showToast('Error: ' + (err?.message || err), 'error');
    }
  };

  // ── SALE ───────────────────────────────────────────────────────────────
  window.saleMobilOil = async function () {
    const customerId  = $('sale-customer')?.value;
    const mobilType   = $('sale-mobil-type')?.value;
    const quantity    = parseFloat($('sale-quantity')?.value);
    const rate        = parseFloat($('sale-rate')?.value);
    const amount      = parseFloat($('sale-amount')?.value) || (quantity * rate);
    const date        = $('sale-date')?.value;
    const paymentType = $('sale-payment-type')?.value;
    const notes       = $('sale-notes')?.value;

    if (!customerId || !mobilType || !quantity || !rate || !date) {
      showToast('Customer, Mobil Type, Quantity, Rate aur Date zaroor bharein', 'error');
      return;
    }

    try {
      const tank = await getTankByName(mobilType);
      if (!tank) {
        showToast(`Tank nahi mila: "${mobilType}"`, 'error');
        return;
      }

      const currentStock = parseFloat(tank.current_stock) || 0;
      if (currentStock < quantity) {
        showToast(`Stock kam hai! Abhi sirf ${formatNumber(currentStock)} Ltr available hai`, 'error');
        return;
      }

      const newStock = currentStock - quantity;
      await updateTankStock(tank.id, newStock);

      await insertTransaction({
        customer_id: parseInt(customerId, 10),
        tank_id: tank.id,
        transaction_type: 'Credit',
        amount: amount,
        liters: quantity,
        unit_price: rate,
        description: `Mobil Sale: ${mobilType}${notes ? ' | ' + notes : ''} | ${(paymentType || 'cash').toUpperCase()}`,
        created_at: new Date(date).toISOString()
      });

      if ((paymentType || '').toLowerCase() === 'credit') {
        const customer = await getCustomerById(parseInt(customerId, 10));
        const newBalance = (parseFloat(customer?.balance) || 0) + amount;
        await updateCustomerBalance(parseInt(customerId, 10), newBalance);
        showToast(`Sale! Rs.${formatNumber(amount)} Udhaar add ho gaya`, 'success');
      } else {
        showToast(`Sale! Rs.${formatNumber(amount)} Cash`, 'success');
      }

      const modalEl = $('saleMobilModal');
      const modal = modalEl ? bootstrap.Modal.getInstance(modalEl) : null;
      if (modal) modal.hide();
      if ($('saleMobilForm')) $('saleMobilForm').reset();

      // Reset date
      const today = new Date().toISOString().split('T')[0];
      if ($('sale-date')) $('sale-date').value = today;

      loadMobilStock();
      loadMobilTransactions();

    } catch (err) {
      console.error('saleMobilOil error:', err);
      showToast('Error: ' + (err?.message || err), 'error');
    }
  };

  // ── EXPENSE ────────────────────────────────────────────────────────────
  window.addMobilExpense = async function () {
    const expenseType   = $('expense-type')?.value;
    const amount        = parseFloat($('expense-amount-mobil')?.value);
    const date          = $('expense-date')?.value;
    const description   = $('expense-description-mobil')?.value;

    if (!expenseType || !amount || !date || !description) {
      showToast('Tamam fields zaroor bharein', 'error');
      return;
    }

    try {
      const owner = await getOrCreateOwner();
      await insertTransaction({
        customer_id: owner.id,
        tank_id: null,
        transaction_type: 'Expense',
        amount: amount,
        liters: 0,
        unit_price: null,
        description: `Mobil Expense - ${expenseType}: ${description}`,
        created_at: new Date(date).toISOString()
      });

      showToast('Expense save ho gaya!', 'success');

      const modalEl = $('mobilExpenseModal');
      const modal = modalEl ? bootstrap.Modal.getInstance(modalEl) : null;
      if (modal) modal.hide();
      if ($('mobilExpenseForm')) $('mobilExpenseForm').reset();

      // Reset date
      const today = new Date().toISOString().split('T')[0];
      if ($('expense-date')) $('expense-date').value = today;

      loadMobilTransactions();

    } catch (err) {
      console.error('addMobilExpense error:', err);
      showToast('Error: ' + (err?.message || err), 'error');
    }
  };

  // ── DELETE TRANSACTION ─────────────────────────────────────────────────
  window.deleteMobilTransaction = async function (id) {
    if (!confirm('Yeh transaction delete karni hai?')) return;
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      showToast('Transaction delete ho gayi!', 'success');
      loadMobilTransactions();
      loadMobilStock();
    } catch (err) {
      console.error('deleteMobilTransaction error:', err);
      showToast('Error: ' + (err?.message || err), 'error');
    }
  };

  // ── VIEW HISTORY ───────────────────────────────────────────────────────
  window.viewMobilHistory = function () {
    window.location.href = 'transactions.html?filter=mobil';
  };

  // ── INIT ───────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', async () => {
    if (document.body.getAttribute('data-page') !== 'mobil') return;

    console.log('🚀 Mobil Management init (auth disabled)...');

    // Default dates
    const today = new Date().toISOString().split('T')[0];
    if ($('receive-date')) $('receive-date').value = today;
    if ($('sale-date'))    $('sale-date').value    = today;
    if ($('expense-date')) $('expense-date').value = today;

    // Auto calculate
    setupAutoCalculate('receive-quantity', 'receive-rate', 'receive-amount');
    setupAutoCalculate('sale-quantity',    'sale-rate',    'sale-amount');

    // Settings se price auto-fill
    await setupSaleModalPriceAutoFill();

    // Data load
    await loadCustomerDropdown();
    await loadMobilStock();
    await loadMobilTransactions();

    console.log('✅ Mobil Management ready!');
  });

})();

// athentication rmove and also the many other error 
// =============================================
// // MOBIL OIL MANAGEMENT - COMPLETE FIXED
// // Settings se price auto-load + stock fix
// // =============================================
// (function () {
//   'use strict';

//   const supabase = window.supabaseClient;
//   let currentUserId = null;

//   function $(id) { return document.getElementById(id); }

//   function formatNumber(num) {
//     return Number(num || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
//   }

//   function showToast(message, type = 'info') {
//     const toast = $('liveToast');
//     if (!toast) { alert(message); return; }
//     const toastTitle = $('toast-title');
//     const toastMessage = $('toast-message');
//     const titles = { success: 'Kamyab!', error: 'Ghalati', warning: 'Khabardar', info: 'Info' };
//     if (toastTitle) toastTitle.textContent = titles[type] || 'Info';
//     if (toastMessage) toastMessage.textContent = message;
//     toast.className = `toast ${type === 'success' ? 'bg-success text-white' : type === 'error' ? 'bg-danger text-white' : type === 'warning' ? 'bg-warning' : ''}`;
//     new bootstrap.Toast(toast, { delay: 3500 }).show();
//   }

//   // ---------- AUTH ----------
//   async function getUserOrNull() {
//     try {
//       if (window.auth && typeof window.auth.getCurrentUser === 'function') {
//         const u = await window.auth.getCurrentUser();
//         if (u?.id) return u;
//         if (u?.user?.id) return u.user;
//         if (u?.data?.user?.id) return u.data.user;
//       }
//       const { data, error } = await supabase.auth.getUser();
//       if (error) return null;
//       return data?.user || null;
//     } catch (e) { return null; }
//   }

//   async function requireUserId() {
//     const user = await getUserOrNull();
//     if (!user?.id) { window.location.href = 'login.html'; return null; }
//     currentUserId = user.id;
//     return currentUserId;
//   }

//   function isMissingColumnError(err, column) {
//     const msg = (err?.message || '').toLowerCase();
//     return msg.includes('column') && msg.includes(column.toLowerCase()) && msg.includes('does not exist');
//   }

//   // ---------- SAFE DB HELPERS ----------
//   async function safeSelectCustomers(fields) {
//     let q = supabase.from('customers').select(fields);
//     if (currentUserId) q = q.eq('user_id', currentUserId);
//     const res = await q;
//     if (res.error && currentUserId && isMissingColumnError(res.error, 'user_id'))
//       return await supabase.from('customers').select(fields);
//     return res;
//   }

//   async function safeSelectTankByName(name) {
//     let q = supabase.from('tanks').select('*').eq('name', name);
//     if (currentUserId) q = q.eq('user_id', currentUserId);
//     const res = await q.maybeSingle();
//     if (res.error && currentUserId && isMissingColumnError(res.error, 'user_id'))
//       return await supabase.from('tanks').select('*').eq('name', name).maybeSingle();
//     return res;
//   }

//   async function safeUpdateTank(id, patch) {
//     let q = supabase.from('tanks').update(patch).eq('id', id);
//     if (currentUserId) q = q.eq('user_id', currentUserId);
//     const res = await q;
//     if (res.error && currentUserId && isMissingColumnError(res.error, 'user_id'))
//       return await supabase.from('tanks').update(patch).eq('id', id);
//     return res;
//   }

//   async function safeInsertTransaction(row) {
//     const payload = { ...row };
//     if (currentUserId) payload.user_id = currentUserId;
//     const res = await supabase.from('transactions').insert([payload]);
//     if (res.error && currentUserId && isMissingColumnError(res.error, 'user_id')) {
//       const { user_id, ...rest } = payload;
//       return await supabase.from('transactions').insert([rest]);
//     }
//     return res;
//   }

//   async function safeGetCustomer(customerId) {
//     let q = supabase.from('customers').select('id,balance').eq('id', customerId);
//     if (currentUserId) q = q.eq('user_id', currentUserId);
//     const res = await q.maybeSingle();
//     if (res.error && currentUserId && isMissingColumnError(res.error, 'user_id'))
//       return await supabase.from('customers').select('id,balance').eq('id', customerId).maybeSingle();
//     return res;
//   }

//   async function safeUpdateCustomerBalance(id, balance) {
//     let q = supabase.from('customers').update({ balance }).eq('id', id);
//     if (currentUserId) q = q.eq('user_id', currentUserId);
//     const res = await q;
//     if (res.error && currentUserId && isMissingColumnError(res.error, 'user_id'))
//       return await supabase.from('customers').update({ balance }).eq('id', id);
//     return res;
//   }

//   async function getOrCreateOwner() {
//     let q = supabase.from('customers').select('*').eq('category', 'Owner');
//     if (currentUserId) q = q.eq('user_id', currentUserId);
//     const res = await q.maybeSingle();
//     if (!res.error && res.data) return res.data;

//     if (res.error && currentUserId && isMissingColumnError(res.error, 'user_id')) {
//       const r2 = await supabase.from('customers').select('*').eq('category', 'Owner').maybeSingle();
//       if (!r2.error && r2.data) return r2.data;
//     }

//     const pump = (window.auth && window.auth.getPumpDetails) ? window.auth.getPumpDetails() : null;
//     const payload = {
//       name: pump?.owner || 'Owner',
//       phone: pump?.phone || '',
//       category: 'Owner',
//       sr_no: 0,
//       balance: 0
//     };
//     if (currentUserId) payload.user_id = currentUserId;
//     let ins = await supabase.from('customers').insert([payload]).select().single();
//     if (ins.error && currentUserId && isMissingColumnError(ins.error, 'user_id')) {
//       const { user_id, ...rest } = payload;
//       ins = await supabase.from('customers').insert([rest]).select().single();
//     }
//     if (ins.error) throw ins.error;
//     return ins.data;
//   }

//   // ---------- AUTO CALCULATE ----------
//   function setupAutoCalculate(qtyId, rateId, amountId) {
//     const qty = $(qtyId), rate = $(rateId), amount = $(amountId);
//     if (!qty || !rate || !amount) return;
//     const calc = () => { amount.value = ((parseFloat(qty.value) || 0) * (parseFloat(rate.value) || 0)).toFixed(2); };
//     qty.addEventListener('input', calc);
//     rate.addEventListener('input', calc);
//   }

//   // ---------- SETTINGS SE MOBIL PRICES LOAD ----------
//   async function getMobilPricesFromSettings() {
//     try {
//       const { data, error } = await supabase.from('settings').select('mobil_history').limit(1).maybeSingle();
//       if (error || !data?.mobil_history?.length) return null;
//       const sorted = [...data.mobil_history].sort((a, b) => new Date(b.date) - new Date(a.date));
//       return sorted[0]; // { car_mobil, open_mobil, date }
//     } catch (e) {
//       console.warn('Could not load mobil prices from settings:', e);
//       return null;
//     }
//   }

//   // Sale modal open hone par settings se price auto-fill karo
//   async function setupSaleModalPriceAutoFill() {
//     const saleMobilModal = document.getElementById('saleMobilModal');
//     if (!saleMobilModal) return;

//     saleMobilModal.addEventListener('show.bs.modal', async () => {
//       const mobilTypeSelect = $('sale-mobil-type');
//       const rateInput = $('sale-rate');
//       if (!mobilTypeSelect || !rateInput) return;

//       const prices = await getMobilPricesFromSettings();
//       if (!prices) return;

//       // Jab modal khule, current selected type ka rate set karo
//       function applyRate() {
//         const type = mobilTypeSelect.value;
//         if (type === 'Car Mobil' && prices.car_mobil) {
//           rateInput.value = prices.car_mobil;
//         } else if (type === 'Open Mobil' && prices.open_mobil) {
//           rateInput.value = prices.open_mobil;
//         }
//         // Amount recalculate
//         const qty = $('sale-quantity');
//         const amt = $('sale-amount');
//         if (qty && amt) {
//           amt.value = ((parseFloat(qty.value) || 0) * (parseFloat(rateInput.value) || 0)).toFixed(2);
//         }
//       }

//       applyRate();
//       mobilTypeSelect.addEventListener('change', applyRate);
//     });
//   }

//   // ---------- CUSTOMERS DROPDOWN ----------
//   async function loadCustomerDropdown() {
//     try {
//       const { data, error } = await safeSelectCustomers('id, sr_no, name, category');
//       if (error) throw error;
//       const select = $('sale-customer');
//       if (!select) return;
//       select.innerHTML = '<option value="">-- Customer Select Karein --</option>';
//       (data || [])
//         .filter(c => (c.category || '').toLowerCase() !== 'owner')
//         .sort((a, b) => (a.sr_no || 0) - (b.sr_no || 0))
//         .forEach(c => {
//           select.innerHTML += `<option value="${c.id}">${c.sr_no || ''} - ${c.name}</option>`;
//         });
//     } catch (err) {
//       console.error('Customer dropdown error:', err);
//     }
//   }

//   // ---------- RECEIVE STOCK ----------
//   window.receiveMobilStock = async function () {
//     const mobilType = $('receive-mobil-type')?.value;
//     const supplier = $('receive-supplier')?.value;
//     const quantity = parseFloat($('receive-quantity')?.value);
//     const rate = parseFloat($('receive-rate')?.value);
//     const amount = parseFloat($('receive-amount')?.value) || (quantity * rate);
//     const date = $('receive-date')?.value;
//     const invoice = $('receive-invoice')?.value;
//     const notes = $('receive-notes')?.value;

//     if (!mobilType || !quantity || !rate || !date) {
//       showToast('Mobil Type, Quantity, Rate aur Date zaroor bharein', 'error');
//       return;
//     }

//     try {
//       if (!currentUserId) await requireUserId();

//       // Tank dhundho
//       const { data: tank, error: tankError } = await safeSelectTankByName(mobilType);
//       if (tankError) throw tankError;
//       if (!tank) throw new Error(`Tank nahi mila: "${mobilType}" - Pehle tanks table mein yeh tank add karein`);

//       // Stock update karo
//       const newStock = (parseFloat(tank.current_stock) || 0) + quantity;
//       const { error: updateError } = await safeUpdateTank(tank.id, {
//         current_stock: newStock,
//         last_updated: new Date().toISOString()
//       });
//       if (updateError) throw updateError;

//       // Purchase transaction save karo (Owner ke naam par, Expense type)
//       const owner = await getOrCreateOwner();
//       const { error: transError } = await safeInsertTransaction({
//         customer_id: owner.id,
//         tank_id: tank.id,
//         transaction_type: 'Expense',
//         amount: amount,
//         liters: quantity,
//         unit_price: rate,
//         description: `Mobil Purchase: ${mobilType} - ${supplier || 'Supplier'} - Invoice: ${invoice || 'N/A'}${notes ? ' | ' + notes : ''}`,
//         created_at: new Date(date).toISOString()
//       });
//       if (transError) throw transError;

//       showToast(`${quantity} Ltr ${mobilType} stock add ho gaya! Kul stock: ${formatNumber(newStock)} Ltr`, 'success');

//       // Modal band karo
//       const modalEl = $('receiveMobilModal');
//       const modal = modalEl ? bootstrap.Modal.getInstance(modalEl) : null;
//       if (modal) modal.hide();
//       if ($('receiveMobilForm')) $('receiveMobilForm').reset();

//       // Reload data
//       loadMobilStock();
//       loadMobilTransactions();
//     } catch (err) {
//       console.error('receiveMobilStock error:', err);
//       showToast('Error: ' + (err?.message || err), 'error');
//     }
//   };

//   // ---------- SALE ----------
//   window.saleMobilOil = async function () {
//     const customerId = $('sale-customer')?.value;
//     const mobilType = $('sale-mobil-type')?.value;
//     const quantity = parseFloat($('sale-quantity')?.value);
//     const rate = parseFloat($('sale-rate')?.value);
//     const amount = parseFloat($('sale-amount')?.value) || (quantity * rate);
//     const date = $('sale-date')?.value;
//     const paymentType = $('sale-payment-type')?.value;
//     const notes = $('sale-notes')?.value;

//     if (!customerId || !mobilType || !quantity || !rate || !date) {
//       showToast('Customer, Mobil Type, Quantity, Rate aur Date zaroor bharein', 'error');
//       return;
//     }

//     try {
//       if (!currentUserId) await requireUserId();

//       // Tank dhundho
//       const { data: tank, error: tankError } = await safeSelectTankByName(mobilType);
//       if (tankError) throw tankError;
//       if (!tank) throw new Error(`Tank nahi mila: "${mobilType}"`);

//       // Stock check
//       const currentStock = parseFloat(tank.current_stock) || 0;
//       if (currentStock < quantity) {
//         showToast(`Stock kam hai! Abhi sirf ${formatNumber(currentStock)} Ltr available hai`, 'error');
//         return;
//       }

//       // Stock ghata do
//       const newStock = currentStock - quantity;
//       const { error: updateError } = await safeUpdateTank(tank.id, {
//         current_stock: newStock,
//         last_updated: new Date().toISOString()
//       });
//       if (updateError) throw updateError;

//       // Sale transaction save karo
//       const { error: transError } = await safeInsertTransaction({
//         customer_id: parseInt(customerId, 10),
//         tank_id: tank.id,
//         transaction_type: 'Credit',
//         amount: amount,
//         liters: quantity,
//         unit_price: rate,
//         description: `Mobil Sale: ${mobilType}${notes ? ' | ' + notes : ''} | ${(paymentType || 'cash').toUpperCase()}`,
//         created_at: new Date(date).toISOString()
//       });
//       if (transError) throw transError;

//       // Agar credit (Udhaar) hai to customer balance update karo
//       if ((paymentType || '').toLowerCase() === 'credit') {
//         const { data: customer, error: cErr } = await safeGetCustomer(parseInt(customerId, 10));
//         if (cErr) throw cErr;
//         const newBalance = (parseFloat(customer?.balance) || 0) + amount;
//         const { error: bErr } = await safeUpdateCustomerBalance(parseInt(customerId, 10), newBalance);
//         if (bErr) throw bErr;
//         showToast(`Sale hogi! Rs.${formatNumber(amount)} Udhaar add ho gaya`, 'success');
//       } else {
//         showToast(`Sale hogi! Rs.${formatNumber(amount)} Cash`, 'success');
//       }

//       // Modal band karo
//       const modalEl = $('saleMobilModal');
//       const modal = modalEl ? bootstrap.Modal.getInstance(modalEl) : null;
//       if (modal) modal.hide();
//       if ($('saleMobilForm')) $('saleMobilForm').reset();

//       // Reload
//       loadMobilStock();
//       loadMobilTransactions();
//     } catch (err) {
//       console.error('saleMobilOil error:', err);
//       showToast('Error: ' + (err?.message || err), 'error');
//     }
//   };

//   // ---------- EXPENSE ----------
//   window.addMobilExpense = async function () {
//     const expenseType = $('expense-type')?.value;
//     const amount = parseFloat($('expense-amount-mobil')?.value);
//     const date = $('expense-date')?.value;
//     const description = $('expense-description-mobil')?.value;

//     if (!expenseType || !amount || !date || !description) {
//       showToast('Tamam fields zaroor bharein', 'error');
//       return;
//     }

//     try {
//       if (!currentUserId) await requireUserId();
//       const owner = await getOrCreateOwner();

//       const { error } = await safeInsertTransaction({
//         customer_id: owner.id,
//         tank_id: null,
//         transaction_type: 'Expense',
//         amount: amount,
//         liters: 0,
//         unit_price: null,
//         description: `Mobil Expense - ${expenseType}: ${description}`,
//         created_at: new Date(date).toISOString()
//       });
//       if (error) throw error;

//       showToast('Expense save ho gaya!', 'success');

//       const modalEl = $('mobilExpenseModal');
//       const modal = modalEl ? bootstrap.Modal.getInstance(modalEl) : null;
//       if (modal) modal.hide();
//       if ($('mobilExpenseForm')) $('mobilExpenseForm').reset();

//       loadMobilTransactions();
//     } catch (err) {
//       console.error('addMobilExpense error:', err);
//       showToast('Error: ' + (err?.message || err), 'error');
//     }
//   };

//   // ---------- LOAD STOCK ----------
//   async function loadMobilStock() {
//     try {
//       let q = supabase.from('tanks').select('*').in('name', ['Car Mobil', 'Open Mobil']);
//       if (currentUserId) q = q.eq('user_id', currentUserId);
//       let { data, error } = await q;
//       if (error && currentUserId && isMissingColumnError(error, 'user_id'))
//         ({ data, error } = await supabase.from('tanks').select('*').in('name', ['Car Mobil', 'Open Mobil']));
//       if (error) throw error;

//       const carTank = (data || []).find(t => t.name === 'Car Mobil');
//       const openTank = (data || []).find(t => t.name === 'Open Mobil');

//       if ($('mobil-car-stock-page'))
//         $('mobil-car-stock-page').textContent = carTank ? formatNumber(carTank.current_stock) : '0.00';
//       if ($('mobil-open-stock-page'))
//         $('mobil-open-stock-page').textContent = openTank ? formatNumber(openTank.current_stock) : '0.00';
//     } catch (err) {
//       console.error('loadMobilStock error:', err);
//     }
//   }

//   // ---------- LOAD TRANSACTIONS ----------
//   async function loadMobilTransactions() {
//     const tbody = $('mobil-transactions-table');
//     if (!tbody) return;
//     tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Loading...</td></tr>';

//     try {
//       // Pehle mobil tank IDs lo
//       let tq = supabase.from('tanks').select('id,name').in('name', ['Car Mobil', 'Open Mobil']);
//       if (currentUserId) tq = tq.eq('user_id', currentUserId);
//       let tanksRes = await tq;
//       if (tanksRes.error && currentUserId && isMissingColumnError(tanksRes.error, 'user_id'))
//         tanksRes = await supabase.from('tanks').select('id,name').in('name', ['Car Mobil', 'Open Mobil']);
//       if (tanksRes.error) throw tanksRes.error;

//       const tankIds = (tanksRes.data || []).map(t => t.id);
//       if (tankIds.length === 0) {
//         tbody.innerHTML = '<tr><td colspan="8" class="text-center text-warning py-4">⚠️ Koi Mobil tank nahi mila. Pehle tanks table mein "Car Mobil" aur "Open Mobil" add karein.</td></tr>';
//         return;
//       }

//       let q = supabase
//         .from('transactions')
//         .select('*, customer:customers(name, sr_no), tank:tanks(name)')
//         .in('tank_id', tankIds)
//         .order('created_at', { ascending: false })
//         .limit(100);
//       if (currentUserId) q = q.eq('user_id', currentUserId);

//       let { data, error } = await q;
//       if (error && currentUserId && isMissingColumnError(error, 'user_id')) {
//         ({ data, error } = await supabase
//           .from('transactions')
//           .select('*, customer:customers(name, sr_no), tank:tanks(name)')
//           .in('tank_id', tankIds)
//           .order('created_at', { ascending: false })
//           .limit(100));
//       }
//       if (error) throw error;

//       if (!data || data.length === 0) {
//         tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Abhi koi transaction nahi hai</td></tr>';
//         return;
//       }

//       tbody.innerHTML = data.map(t => {
//         const date = new Date(t.created_at).toLocaleDateString('en-PK');
//         const badgeColor = t.transaction_type === 'Credit' ? 'bg-success' : t.transaction_type === 'Expense' ? 'bg-danger' : 'bg-secondary';
//         const typeLabel = t.transaction_type === 'Credit' ? 'Sale' : t.transaction_type === 'Expense' ? (t.liters > 0 ? 'Purchase' : 'Expense') : t.transaction_type;
//         return `
//           <tr>
//             <td>${date}</td>
//             <td><span class="badge ${badgeColor}">${typeLabel}</span></td>
//             <td>${t.tank?.name || '-'}</td>
//             <td>${t.customer?.name || '-'}</td>
//             <td>${formatNumber(t.liters)} L</td>
//             <td>Rs. ${formatNumber(t.unit_price || 0)}</td>
//             <td><strong>Rs. ${formatNumber(t.amount)}</strong></td>
//             <td>
//               <button class="btn btn-sm btn-outline-danger" onclick="deleteMobilTransaction('${t.id}')">
//                 <i class="bi bi-trash"></i>
//               </button>
//             </td>
//           </tr>`;
//       }).join('');
//     } catch (err) {
//       console.error('loadMobilTransactions error:', err);
//       tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-4">Error: ${err?.message || err}</td></tr>`;
//     }
//   }

//   // ---------- DELETE TRANSACTION ----------
//   window.deleteMobilTransaction = async function (id) {
//     if (!confirm('Yeh transaction delete karni hai?')) return;
//     try {
//       if (!currentUserId) await requireUserId();
//       let q = supabase.from('transactions').delete().eq('id', id);
//       if (currentUserId) q = q.eq('user_id', currentUserId);
//       let res = await q;
//       if (res.error && currentUserId && isMissingColumnError(res.error, 'user_id'))
//         res = await supabase.from('transactions').delete().eq('id', id);
//       if (res.error) throw res.error;
//       showToast('Transaction delete ho gayi!', 'success');
//       loadMobilTransactions();
//       loadMobilStock();
//     } catch (err) {
//       console.error('deleteMobilTransaction error:', err);
//       showToast('Error: ' + (err?.message || err), 'error');
//     }
//   };

//   // ---------- VIEW HISTORY ----------
//   window.viewMobilHistory = function () {
//     window.location.href = 'transactions.html?filter=mobil';
//   };

//   // ---------- INIT ----------
//   document.addEventListener('DOMContentLoaded', async () => {
//     if (document.body.getAttribute('data-page') !== 'mobil') return;

//     console.log('🚀 Mobil Management init...');

//     await requireUserId();
//     if (!currentUserId) return;

//     // Default dates
//     const today = new Date().toISOString().split('T')[0];
//     if ($('receive-date')) $('receive-date').value = today;
//     if ($('sale-date')) $('sale-date').value = today;
//     if ($('expense-date')) $('expense-date').value = today;

//     // Auto calculate
//     setupAutoCalculate('receive-quantity', 'receive-rate', 'receive-amount');
//     setupAutoCalculate('sale-quantity', 'sale-rate', 'sale-amount');

//     // Settings se price auto-fill setup
//     await setupSaleModalPriceAutoFill();

//     // Data load
//     loadCustomerDropdown();
//     loadMobilStock();
//     loadMobilTransactions();

//     console.log('✅ Mobil Management ready! User:', currentUserId);
//   });

// })();