// =============================================
// MOBIL OIL MANAGEMENT - NO AUTH VERSION
// Settings se mobil price auto-load + calculate
// =============================================
(function () {
  'use strict';

  const supabase = window.supabaseClient;

  function $(id) { return document.getElementById(id); }

  function fmt(num) {
    return Number(num || 0).toLocaleString('en-PK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function showToast(message, type = 'info') {
    const toast = $('liveToast');
    if (!toast) { alert(message); return; }
    if ($('toast-title')) {
      const titles = { success: 'Kamyab!', error: 'Ghalati', warning: 'Khabardar', info: 'Info' };
      $('toast-title').textContent = titles[type] || 'Info';
    }
    if ($('toast-message')) $('toast-message').textContent = message;
    toast.className = `toast align-items-center border-0 ${
      type === 'success' ? 'bg-success text-white' :
      type === 'error'   ? 'bg-danger text-white'  :
      type === 'warning' ? 'bg-warning'             : 'bg-secondary text-white'
    }`;
    new bootstrap.Toast(toast, { delay: 3500 }).show();
  }

  // ─────────────────────────────────────────────────────
  // SETTINGS SE LATEST MOBIL PRICES LOAD KARO
  // ─────────────────────────────────────────────────────
  async function getMobilPricesFromSettings() {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('mobil_history')
        .limit(1)
        .maybeSingle();

      if (error || !data?.mobil_history?.length) return null;

      const sorted = [...data.mobil_history].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
      return sorted[0]; // { car_mobil, open_mobil, date }
    } catch (e) {
      console.warn('getMobilPricesFromSettings error:', e);
      return null;
    }
  }

  // ─────────────────────────────────────────────────────
  // AUTO CALCULATE: qty x rate = amount
  // ─────────────────────────────────────────────────────
  function setupAutoCalculate(qtyId, rateId, amountId) {
    const qtyEl    = $(qtyId);
    const rateEl   = $(rateId);
    const amountEl = $(amountId);
    if (!qtyEl || !rateEl || !amountEl) return;
    const calc = () => {
      const q = parseFloat(qtyEl.value)  || 0;
      const r = parseFloat(rateEl.value) || 0;
      amountEl.value = (q * r).toFixed(2);
    };
    qtyEl.addEventListener('input', calc);
    rateEl.addEventListener('input', calc);
  }

  // ─────────────────────────────────────────────────────
  // SALE MODAL: SETTINGS SE PRICE AUTO-FILL + AUTO-CALC
  // ─────────────────────────────────────────────────────
  async function setupSalePriceAutoFill() {
    const saleMobilModal  = document.getElementById('saleMobilModal');
    const mobilTypeSelect = $('sale-mobil-type');
    const rateInput       = $('sale-rate');
    const qtyInput        = $('sale-quantity');
    const amountInput     = $('sale-amount');

    if (!mobilTypeSelect || !rateInput) return;

    // Settings se prices lo
    const prices = await getMobilPricesFromSettings();

    function applyRate() {
      if (!prices) return;
      const type = mobilTypeSelect.value;
      if (type === 'Car Mobil' && prices.car_mobil) {
        rateInput.value = prices.car_mobil;
      } else if (type === 'Open Mobil' && prices.open_mobil) {
        rateInput.value = prices.open_mobil;
      }
      // Amount recalculate
      if (qtyInput && amountInput) {
        const q = parseFloat(qtyInput.value)  || 0;
        const r = parseFloat(rateInput.value) || 0;
        amountInput.value = (q * r).toFixed(2);
      }
    }

    // Mobil type change hone par rate set karo
    mobilTypeSelect.addEventListener('change', applyRate);

    // Modal khulte waqt bhi apply karo
    if (saleMobilModal) {
      saleMobilModal.addEventListener('show.bs.modal', () => {
        applyRate();
      });
    }

    // Pehli dafa bhi chalao
    applyRate();
  }

  // ─────────────────────────────────────────────────────
  // CUSTOMERS DROPDOWN
  // ─────────────────────────────────────────────────────
  async function loadCustomerDropdown() {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, sr_no, name, category')
        .order('sr_no', { ascending: true });
      if (error) throw error;

      const select = $('sale-customer');
      if (!select) return;

      select.innerHTML = '<option value="">-- Customer Select Karein --</option>';
      (data || [])
        .filter(c => (c.category || '').toLowerCase() !== 'owner')
        .forEach(c => {
          select.innerHTML += `<option value="${c.id}">${c.sr_no || ''} - ${c.name}</option>`;
        });
    } catch (err) {
      console.error('loadCustomerDropdown error:', err);
    }
  }

  // ─────────────────────────────────────────────────────
  // OWNER GET / CREATE
  // ─────────────────────────────────────────────────────
  async function getOrCreateOwner() {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('category', 'Owner')
      .maybeSingle();

    if (!error && data) return data;

    const ins = await supabase
      .from('customers')
      .insert([{ name: 'Owner', phone: '', category: 'Owner', sr_no: 0, balance: 0 }])
      .select()
      .single();
    if (ins.error) throw ins.error;
    return ins.data;
  }

  // ─────────────────────────────────────────────────────
  // LOAD MOBIL STOCK
  // ─────────────────────────────────────────────────────
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
        $('mobil-car-stock-page').textContent = carTank ? fmt(carTank.current_stock) : '0.00';
      if ($('mobil-open-stock-page'))
        $('mobil-open-stock-page').textContent = openTank ? fmt(openTank.current_stock) : '0.00';
    } catch (err) {
      console.error('loadMobilStock error:', err);
    }
  }

  // ─────────────────────────────────────────────────────
  // LOAD TRANSACTIONS TABLE
  // ─────────────────────────────────────────────────────
  async function loadMobilTransactions() {
    const tbody = $('mobil-transactions-table');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Loading...</td></tr>';

    try {
      const { data: tanks, error: tankErr } = await supabase
        .from('tanks')
        .select('id, name')
        .in('name', ['Car Mobil', 'Open Mobil']);
      if (tankErr) throw tankErr;

      const tankIds = (tanks || []).map(t => t.id);
      if (tankIds.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-warning py-4">
          <i class="bi bi-exclamation-triangle me-2"></i>
          Koi Mobil tank nahi mila. Supabase <code>tanks</code> table mein
          "Car Mobil" aur "Open Mobil" naam se rows add karein.
        </td></tr>`;
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
        let typeLabel, badgeClass;
        if (t.transaction_type === 'Credit') {
          typeLabel = 'Sale'; badgeClass = 'bg-success';
        } else if (t.liters > 0) {
          typeLabel = 'Purchase'; badgeClass = 'bg-primary';
        } else {
          typeLabel = 'Expense'; badgeClass = 'bg-danger';
        }
        return `<tr>
          <td>${date}</td>
          <td><span class="badge ${badgeClass}">${typeLabel}</span></td>
          <td>${t.tank?.name || '-'}</td>
          <td>${t.customer?.name || '-'}</td>
          <td>${fmt(t.liters)} L</td>
          <td>Rs. ${fmt(t.unit_price || 0)}</td>
          <td><strong>Rs. ${fmt(t.amount)}</strong></td>
          <td>
            <button class="btn btn-sm btn-outline-danger"
              onclick="deleteMobilTransaction('${t.id}')">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>`;
      }).join('');

    } catch (err) {
      console.error('loadMobilTransactions error:', err);
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-4">
        Error: ${err?.message || err}
      </td></tr>`;
    }
  }

  // ═══════════════════════════════════════════════════════
  // WINDOW FUNCTIONS — HTML buttons/forms inhe call karte hain
  // ═══════════════════════════════════════════════════════

  // 1. RECEIVE STOCK
  window.receiveMobilStock = async function () {
    const mobilType = $('receive-mobil-type')?.value;
    const supplier  = $('receive-supplier')?.value || 'Supplier';
    const quantity  = parseFloat($('receive-quantity')?.value);
    const rate      = parseFloat($('receive-rate')?.value);
    const amount    = parseFloat($('receive-amount')?.value) || (quantity * rate);
    const date      = $('receive-date')?.value;
    const invoice   = $('receive-invoice')?.value || 'N/A';
    const notes     = $('receive-notes')?.value || '';

    if (!mobilType || !quantity || !rate || !date) {
      showToast('Mobil Type, Quantity, Rate aur Date zaroor bharein', 'error');
      return;
    }

    try {
      const { data: tank, error: tankErr } = await supabase
        .from('tanks').select('*').eq('name', mobilType).maybeSingle();
      if (tankErr) throw tankErr;
      if (!tank) {
        showToast(`Tank nahi mila: "${mobilType}" — Supabase tanks table mein add karein`, 'error');
        return;
      }

      const newStock = (parseFloat(tank.current_stock) || 0) + quantity;
      const { error: upErr } = await supabase
        .from('tanks')
        .update({ current_stock: newStock, last_updated: new Date().toISOString() })
        .eq('id', tank.id);
      if (upErr) throw upErr;

      const owner = await getOrCreateOwner();

      const { error: txErr } = await supabase.from('transactions').insert([{
        customer_id:      owner.id,
        tank_id:          tank.id,
        transaction_type: 'Expense',
        amount:           amount,
        liters:           quantity,
        unit_price:       rate,
        description:      `Mobil Purchase: ${mobilType} - ${supplier} - Invoice: ${invoice}${notes ? ' | ' + notes : ''}`,
        created_at:       new Date(date + 'T00:00:00').toISOString()
      }]);
      if (txErr) throw txErr;

      showToast(`${quantity} Ltr ${mobilType} receive hua! Kul stock: ${fmt(newStock)} Ltr`, 'success');

      const modal = bootstrap.Modal.getInstance($('receiveMobilModal'));
      if (modal) modal.hide();
      if ($('receiveMobilForm')) $('receiveMobilForm').reset();
      if ($('receive-date')) $('receive-date').value = new Date().toISOString().split('T')[0];

      loadMobilStock();
      loadMobilTransactions();

    } catch (err) {
      console.error('receiveMobilStock error:', err);
      showToast('Error: ' + (err?.message || err), 'error');
    }
  };

  // 2. SALE
  window.saleMobilOil = async function () {
    const customerId  = $('sale-customer')?.value;
    const mobilType   = $('sale-mobil-type')?.value;
    const quantity    = parseFloat($('sale-quantity')?.value);
    const rate        = parseFloat($('sale-rate')?.value);
    const amount      = parseFloat($('sale-amount')?.value) || (quantity * rate);
    const date        = $('sale-date')?.value;
    const paymentType = $('sale-payment-type')?.value || 'cash';
    const notes       = $('sale-notes')?.value || '';

    if (!customerId || !mobilType || !quantity || !rate || !date) {
      showToast('Customer, Mobil Type, Quantity, Rate aur Date zaroor bharein', 'error');
      return;
    }

    try {
      const { data: tank, error: tankErr } = await supabase
        .from('tanks').select('*').eq('name', mobilType).maybeSingle();
      if (tankErr) throw tankErr;
      if (!tank) {
        showToast(`Tank nahi mila: "${mobilType}"`, 'error');
        return;
      }

      const currentStock = parseFloat(tank.current_stock) || 0;
      if (currentStock < quantity) {
        showToast(`Stock kam hai! Sirf ${fmt(currentStock)} Ltr available hai`, 'error');
        return;
      }

      const newStock = currentStock - quantity;
      const { error: upErr } = await supabase
        .from('tanks')
        .update({ current_stock: newStock, last_updated: new Date().toISOString() })
        .eq('id', tank.id);
      if (upErr) throw upErr;

      const { error: txErr } = await supabase.from('transactions').insert([{
        customer_id:      parseInt(customerId, 10),
        tank_id:          tank.id,
        transaction_type: 'Credit',
        amount:           amount,
        liters:           quantity,
        unit_price:       rate,
        description:      `Mobil Sale: ${mobilType}${notes ? ' | ' + notes : ''} | ${paymentType.toUpperCase()}`,
        created_at:       new Date(date + 'T00:00:00').toISOString()
      }]);
      if (txErr) throw txErr;

      // Udhaar hai to customer ka balance update karo
      if (paymentType.toLowerCase() === 'credit') {
        const { data: cust, error: cErr } = await supabase
          .from('customers').select('balance').eq('id', customerId).maybeSingle();
        if (cErr) throw cErr;
        const newBal = (parseFloat(cust?.balance) || 0) + amount;
        const { error: bErr } = await supabase
          .from('customers').update({ balance: newBal }).eq('id', customerId);
        if (bErr) throw bErr;
        showToast(`Sale! Rs.${fmt(amount)} Udhaar add ho gaya`, 'success');
      } else {
        showToast(`Sale! Rs.${fmt(amount)} Cash`, 'success');
      }

      const modal = bootstrap.Modal.getInstance($('saleMobilModal'));
      if (modal) modal.hide();
      if ($('saleMobilForm')) $('saleMobilForm').reset();
      if ($('sale-date')) $('sale-date').value = new Date().toISOString().split('T')[0];

      // Form reset ke baad dobara price apply karo
      await setupSalePriceAutoFill();
      loadMobilStock();
      loadMobilTransactions();

    } catch (err) {
      console.error('saleMobilOil error:', err);
      showToast('Error: ' + (err?.message || err), 'error');
    }
  };

  // 3. EXPENSE
  window.addMobilExpense = async function () {
    const expenseType = $('expense-type')?.value;
    const amount      = parseFloat($('expense-amount-mobil')?.value);
    const date        = $('expense-date')?.value;
    const description = $('expense-description-mobil')?.value;

    if (!expenseType || !amount || !date || !description) {
      showToast('Tamam fields zaroor bharein', 'error');
      return;
    }

    try {
      const owner = await getOrCreateOwner();

      const { error } = await supabase.from('transactions').insert([{
        customer_id:      owner.id,
        tank_id:          null,
        transaction_type: 'Expense',
        amount:           amount,
        liters:           0,
        unit_price:       null,
        description:      `Mobil Expense - ${expenseType}: ${description}`,
        created_at:       new Date(date + 'T00:00:00').toISOString()
      }]);
      if (error) throw error;

      showToast('Expense save ho gaya!', 'success');

      const modal = bootstrap.Modal.getInstance($('mobilExpenseModal'));
      if (modal) modal.hide();
      if ($('mobilExpenseForm')) $('mobilExpenseForm').reset();
      if ($('expense-date')) $('expense-date').value = new Date().toISOString().split('T')[0];

      loadMobilTransactions();

    } catch (err) {
      console.error('addMobilExpense error:', err);
      showToast('Error: ' + (err?.message || err), 'error');
    }
  };

  // 4. DELETE TRANSACTION
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

  // 5. VIEW HISTORY
  window.viewMobilHistory = function () {
    window.location.href = 'transactions.html?filter=mobil';
  };

  // ═══════════════════════════════════════════════════════
  // PAGE INIT
  // ═══════════════════════════════════════════════════════
  document.addEventListener('DOMContentLoaded', async () => {
    if (document.body.getAttribute('data-page') !== 'mobil') return;

    console.log('Mobil Management init (No Auth)...');

    // Default dates
    const today = new Date().toISOString().split('T')[0];
    if ($('receive-date')) $('receive-date').value = today;
    if ($('sale-date'))    $('sale-date').value    = today;
    if ($('expense-date')) $('expense-date').value = today;

    // Auto calculate
    setupAutoCalculate('receive-quantity', 'receive-rate', 'receive-amount');
    setupAutoCalculate('sale-quantity',    'sale-rate',    'sale-amount');

    // Settings se mobil price auto-fill (Car Mobil / Open Mobil)
    await setupSalePriceAutoFill();

    // Data load karo
    await loadCustomerDropdown();
    await loadMobilStock();
    await loadMobilTransactions();

    console.log('Mobil Management ready!');
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