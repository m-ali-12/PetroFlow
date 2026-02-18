// Mobil Oil Management System (FIXED: auth + user_id + owner auto-create, design unchanged)
(function() {
'use strict';

const supabase = window.supabaseClient;

let currentUserId = null;

function $(id) { return document.getElementById(id); }

function formatNumber(num) {
  return Number(num || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function showToast(message, type = 'info') {
  const toast = $('liveToast');
  if (!toast) return;

  const toastTitle = $('toast-title');
  const toastMessage = $('toast-message');

  const titles = { success: 'Success', error: 'Error', warning: 'Warning', info: 'Information' };
  if (toastTitle) toastTitle.textContent = titles[type] || 'Notification';
  if (toastMessage) toastMessage.textContent = message;

  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();
}

// ---------- AUTH (reliable across Vercel/GitHub static + Supabase) ----------
async function getUserOrNull() {
  try {
    // Your wrapper (auth.js)
    if (window.auth && typeof window.auth.getCurrentUser === 'function') {
      const u = await window.auth.getCurrentUser();
      if (u?.id) return u;
      if (u?.user?.id) return u.user;
      if (u?.data?.user?.id) return u.data.user;
    }
    // Supabase native
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data?.user || null;
  } catch (e) {
    console.error('getUserOrNull error:', e);
    return null;
  }
}

async function requireUserId() {
  const user = await getUserOrNull();
  if (!user?.id) {
    window.location.href = 'login.html';
    return null;
  }
  currentUserId = user.id;
  return currentUserId;
}

// ---------- Helpers: add user_id filter safely ----------
function isMissingColumnError(err, column) {
  const msg = (err?.message || '').toLowerCase();
  return msg.includes('column') && msg.includes(column.toLowerCase()) && msg.includes('does not exist');
}

async function safeSelectCustomers(selectFields) {
  // customers table MUST be per-user; if user_id column missing, fallback without filter
  let q = supabase.from('customers').select(selectFields);
  if (currentUserId) q = q.eq('user_id', currentUserId);
  const res = await q;
  if (res.error && currentUserId && isMissingColumnError(res.error, 'user_id')) {
    return await supabase.from('customers').select(selectFields);
  }
  return res;
}

async function safeSelectTanksByName(name) {
  let q = supabase.from('tanks').select('*').eq('name', name);
  if (currentUserId) q = q.eq('user_id', currentUserId);
  const res = await q.maybeSingle();
  if (res.error && currentUserId && isMissingColumnError(res.error, 'user_id')) {
    return await supabase.from('tanks').select('*').eq('name', name).maybeSingle();
  }
  return res;
}

async function safeUpdateTankById(id, patch) {
  let q = supabase.from('tanks').update(patch).eq('id', id);
  if (currentUserId) q = q.eq('user_id', currentUserId);
  const res = await q;
  if (res.error && currentUserId && isMissingColumnError(res.error, 'user_id')) {
    return await supabase.from('tanks').update(patch).eq('id', id);
  }
  return res;
}

async function safeInsertTransaction(row) {
  const payload = { ...row };
  if (currentUserId) payload.user_id = currentUserId;

  let q = supabase.from('transactions').insert([payload]);
  const res = await q;
  if (res.error && currentUserId && isMissingColumnError(res.error, 'user_id')) {
    // retry without user_id if schema doesn't have it (older DB)
    const { user_id, ...rest } = payload;
    return await supabase.from('transactions').insert([rest]);
  }
  return res;
}

async function safeSelectCustomerBalance(customerId) {
  let q = supabase.from('customers').select('id,balance').eq('id', customerId);
  if (currentUserId) q = q.eq('user_id', currentUserId);
  const res = await q.maybeSingle();
  if (res.error && currentUserId && isMissingColumnError(res.error, 'user_id')) {
    return await supabase.from('customers').select('id,balance').eq('id', customerId).maybeSingle();
  }
  return res;
}

async function safeUpdateCustomerBalance(customerId, newBalance) {
  let q = supabase.from('customers').update({ balance: newBalance }).eq('id', customerId);
  if (currentUserId) q = q.eq('user_id', currentUserId);
  const res = await q;
  if (res.error && currentUserId && isMissingColumnError(res.error, 'user_id')) {
    return await supabase.from('customers').update({ balance: newBalance }).eq('id', customerId);
  }
  return res;
}

// Ensure Owner account exists for this user
async function getOrCreateOwner() {
  let q = supabase.from('customers').select('*').eq('category', 'Owner');
  if (currentUserId) q = q.eq('user_id', currentUserId);
  const res = await q.maybeSingle();
  if (!res.error && res.data) return res.data;

  // If user_id column missing, fallback
  if (res.error && currentUserId && isMissingColumnError(res.error, 'user_id')) {
    const r2 = await supabase.from('customers').select('*').eq('category', 'Owner').maybeSingle();
    if (!r2.error && r2.data) return r2.data;
  }

  // Create
  const pump = (window.auth && window.auth.getPumpDetails) ? window.auth.getPumpDetails() : null;
  const ownerName = pump?.owner || 'Owner';
  const payload = {
    name: ownerName,
    phone: pump?.phone || '',
    category: 'Owner',
    sr_no: 0,
    balance: 0
  };
  if (currentUserId) payload.user_id = currentUserId;

  let ins = await supabase.from('customers').insert([payload]).select().single();
  if (ins.error && currentUserId && isMissingColumnError(ins.error, 'user_id')) {
    const { user_id, ...rest } = payload;
    ins = await supabase.from('customers').insert([rest]).select().single();
  }
  if (ins.error) throw ins.error;
  return ins.data;
}

// Auto-calculate amount on quantity/rate change
function setupAutoCalculate(quantityId, rateId, amountId) {
  const qtyInput = $(quantityId);
  const rateInput = $(rateId);
  const amountInput = $(amountId);

  if (!qtyInput || !rateInput || !amountInput) return;

  const calculate = () => {
    const qty = parseFloat(qtyInput.value) || 0;
    const rate = parseFloat(rateInput.value) || 0;
    amountInput.value = (qty * rate).toFixed(2);
  };

  qtyInput.addEventListener('input', calculate);
  rateInput.addEventListener('input', calculate);
}

// Load customer dropdown
async function loadCustomerDropdown() {
  try {
    if (!currentUserId) return;
    const { data, error } = await safeSelectCustomers('id, sr_no, name, category');
    if (error) throw error;

    const select = $('sale-customer');
    if (!select) return;

    select.innerHTML = '<option value="">Select Customer</option>';
    (data || [])
      .filter(c => (c.category || '').toLowerCase() !== 'owner')
      .sort((a,b) => (a.sr_no||0) - (b.sr_no||0))
      .forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.sr_no} - ${c.name}</option>`;
      });
  } catch (error) {
    console.error('Error loading customers:', error);
  }
}

// Receive Mobil Stock
window.receiveMobilStock = async function() {
  const mobilType = $('receive-mobil-type')?.value;
  const supplier = $('receive-supplier')?.value;
  const quantity = parseFloat($('receive-quantity')?.value);
  const rate = parseFloat($('receive-rate')?.value);
  const amount = parseFloat($('receive-amount')?.value);
  const date = $('receive-date')?.value;
  const invoice = $('receive-invoice')?.value;
  const notes = $('receive-notes')?.value;

  if (!mobilType || !quantity || !rate || !date) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  try {
    if (!currentUserId) await requireUserId();

    // Find the mobil tank
    const { data: tank, error: tankError } = await safeSelectTanksByName(mobilType);
    if (tankError) throw tankError;
    if (!tank) throw new Error('Mobil tank not found: ' + mobilType);

    // Update tank stock
    const newStock = (parseFloat(tank.current_stock) || 0) + quantity;
    const { error: updateError } = await safeUpdateTankById(tank.id, {
      current_stock: newStock,
      last_updated: new Date().toISOString()
    });
    if (updateError) throw updateError;

    // Create expense transaction for purchase (Owner)
    const owner = await getOrCreateOwner();

    await safeInsertTransaction({
      customer_id: owner.id,
      tank_id: tank.id,
      transaction_type: 'Expense',
      amount: amount || (quantity * rate),
      liters: quantity,
      unit_price: rate,
      description: `Mobil Purchase: ${mobilType} - ${supplier || 'Supplier'} - Invoice: ${invoice || 'N/A'}${notes ? ' - ' + notes : ''}`,
      created_at: new Date(date).toISOString()
    });

    showToast('Stock received successfully!', 'success');

    const modalEl = $('receiveMobilModal');
    const modal = modalEl ? bootstrap.Modal.getInstance(modalEl) : null;
    if (modal) modal.hide();
    if ($('receiveMobilForm')) $('receiveMobilForm').reset();

    loadMobilStock();
    loadMobilTransactions();
  } catch (error) {
    console.error('Error receiving stock:', error);
    showToast('Error: ' + (error?.message || error), 'error');
  }
};

// Sale Mobil Oil
window.saleMobilOil = async function() {
  const customerId = $('sale-customer')?.value;
  const mobilType = $('sale-mobil-type')?.value;
  const quantity = parseFloat($('sale-quantity')?.value);
  const rate = parseFloat($('sale-rate')?.value);
  const amount = parseFloat($('sale-amount')?.value);
  const date = $('sale-date')?.value;
  const paymentType = $('sale-payment-type')?.value; // 'cash' or 'credit'
  const notes = $('sale-notes')?.value;

  if (!customerId || !mobilType || !quantity || !rate || !date) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  try {
    if (!currentUserId) await requireUserId();

    // Find the mobil tank
    const { data: tank, error: tankError } = await safeSelectTanksByName(mobilType);
    if (tankError) throw tankError;
    if (!tank) throw new Error('Mobil tank not found: ' + mobilType);

    // Check stock
    if ((parseFloat(tank.current_stock) || 0) < quantity) {
      showToast(`Not enough stock! Available: ${formatNumber(tank.current_stock)} L`, 'error');
      return;
    }

    // Update tank stock
    const newStock = (parseFloat(tank.current_stock) || 0) - quantity;
    const { error: updateError } = await safeUpdateTankById(tank.id, {
      current_stock: newStock,
      last_updated: new Date().toISOString()
    });
    if (updateError) throw updateError;

    // Create sale transaction (always record sale as Credit)
    const { error: transError } = await safeInsertTransaction({
      customer_id: parseInt(customerId, 10),
      tank_id: tank.id,
      transaction_type: 'Credit',
      amount: amount || (quantity * rate),
      liters: quantity,
      unit_price: rate,
      description: `Mobil Sale: ${mobilType}${notes ? ' - ' + notes : ''}${paymentType ? ' | ' + paymentType.toUpperCase() : ''}`,
      created_at: new Date(date).toISOString()
    });
    if (transError) throw transError;

    // Update customer balance only for CREDIT (Udhaar)
    if ((paymentType || '').toLowerCase() === 'credit') {
      const { data: customer, error: cErr } = await safeSelectCustomerBalance(customerId);
      if (cErr) throw cErr;
      const oldBal = parseFloat(customer?.balance) || 0;
      const newBal = oldBal + (amount || (quantity * rate));
      const { error: bErr } = await safeUpdateCustomerBalance(customerId, newBal);
      if (bErr) throw bErr;
    }

    showToast('Sale completed successfully!', 'success');

    const modalEl = $('saleMobilModal');
    const modal = modalEl ? bootstrap.Modal.getInstance(modalEl) : null;
    if (modal) modal.hide();
    if ($('saleMobilForm')) $('saleMobilForm').reset();

    loadMobilStock();
    loadMobilTransactions();
  } catch (error) {
    console.error('Error completing sale:', error);
    showToast('Error: ' + (error?.message || error), 'error');
  }
};

// Add Mobil Expense
window.addMobilExpense = async function() {
  const expenseType = $('expense-type')?.value;
  const amount = parseFloat($('expense-amount-mobil')?.value);
  const date = $('expense-date')?.value;
  const description = $('expense-description-mobil')?.value;

  if (!expenseType || !amount || !date || !description) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  try {
    if (!currentUserId) await requireUserId();

    const owner = await getOrCreateOwner();

    const { error } = await safeInsertTransaction({
      customer_id: owner.id,
      tank_id: null,
      transaction_type: 'Expense',
      amount: amount,
      liters: 0,
      unit_price: null,
      description: `Mobil Expense - ${expenseType}: ${description}`,
      created_at: new Date(date).toISOString()
    });
    if (error) throw error;

    showToast('Expense recorded successfully!', 'success');

    const modalEl = $('mobilExpenseModal');
    const modal = modalEl ? bootstrap.Modal.getInstance(modalEl) : null;
    if (modal) modal.hide();
    if ($('mobilExpenseForm')) $('mobilExpenseForm').reset();

    loadMobilTransactions();
  } catch (error) {
    console.error('Error recording expense:', error);
    showToast('Error: ' + (error?.message || error), 'error');
  }
};

// Load Mobil Stock
async function loadMobilStock() {
  try {
    if (!currentUserId) return;

    let q = supabase.from('tanks').select('*').in('name', ['Car Mobil', 'Open Mobil']);
    if (currentUserId) q = q.eq('user_id', currentUserId);
    let { data, error } = await q;
    if (error && currentUserId && isMissingColumnError(error, 'user_id')) {
      ({ data, error } = await supabase.from('tanks').select('*').in('name', ['Car Mobil', 'Open Mobil']));
    }
    if (error) throw error;

    const carMobil = (data || []).find(t => t.name === 'Car Mobil');
    const openMobil = (data || []).find(t => t.name === 'Open Mobil');

    if (carMobil && $('mobil-car-stock-page')) $('mobil-car-stock-page').textContent = formatNumber(carMobil.current_stock);
    if (openMobil && $('mobil-open-stock-page')) $('mobil-open-stock-page').textContent = formatNumber(openMobil.current_stock);
  } catch (error) {
    console.error('Error loading mobil stock:', error);
  }
}

// Load Mobil Transactions
async function loadMobilTransactions() {
  try {
    if (!currentUserId) return;

    // Get tank IDs
    let tq = supabase.from('tanks').select('id').in('name', ['Car Mobil', 'Open Mobil']);
    if (currentUserId) tq = tq.eq('user_id', currentUserId);
    let tanksRes = await tq;
    if (tanksRes.error && currentUserId && isMissingColumnError(tanksRes.error, 'user_id')) {
      tanksRes = await supabase.from('tanks').select('id').in('name', ['Car Mobil', 'Open Mobil']);
    }
    if (tanksRes.error) throw tanksRes.error;

    const tankIds = (tanksRes.data || []).map(t => t.id);
    if (tankIds.length === 0) {
      const tbody = $('mobil-transactions-table');
      if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No tanks found</td></tr>';
      return;
    }

    let q = supabase
      .from('transactions')
      .select(`
        *,
        customer:customers(name, sr_no),
        tank:tanks(name)
      `)
      .in('tank_id', tankIds)
      .order('created_at', { ascending: false })
      .limit(50);

    if (currentUserId) q = q.eq('user_id', currentUserId);

    let { data, error } = await q;
    if (error && currentUserId && isMissingColumnError(error, 'user_id')) {
      ({ data, error } = await supabase
        .from('transactions')
        .select(`*, customer:customers(name, sr_no), tank:tanks(name)`)
        .in('tank_id', tankIds)
        .order('created_at', { ascending: false })
        .limit(50));
    }
    if (error) throw error;

    const tbody = $('mobil-transactions-table');
    if (!tbody) return;

    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No transactions yet</td></tr>';
      return;
    }

    let html = '';
    data.forEach(t => {
      const date = new Date(t.created_at).toLocaleDateString('en-PK');
      const typeClass = t.transaction_type === 'Credit' ? 'badge-success' : (t.transaction_type === 'Expense' ? 'badge-danger' : 'badge-warning');
      const customerName = t.customer?.name || 'Owner';

      html += `
        <tr>
          <td>${date}</td>
          <td><span class="badge ${typeClass}">${t.transaction_type}</span></td>
          <td>${t.tank?.name || '-'}</td>
          <td>${customerName}</td>
          <td>${formatNumber(t.liters)} L</td>
          <td>Rs. ${formatNumber(t.unit_price || 0)}</td>
          <td><strong>Rs. ${formatNumber(t.amount)}</strong></td>
          <td>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteMobilTransaction(${t.id})">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  } catch (error) {
    console.error('Error loading transactions:', error);
  }
}

// Delete Mobil Transaction
window.deleteMobilTransaction = async function(id) {
  if (!confirm('Are you sure you want to delete this transaction?')) return;

  try {
    if (!currentUserId) await requireUserId();

    let q = supabase.from('transactions').delete().eq('id', id);
    if (currentUserId) q = q.eq('user_id', currentUserId);
    let res = await q;
    if (res.error && currentUserId && isMissingColumnError(res.error, 'user_id')) {
      res = await supabase.from('transactions').delete().eq('id', id);
    }
    if (res.error) throw res.error;

    showToast('Transaction deleted successfully!', 'success');
    loadMobilTransactions();
  } catch (error) {
    console.error('Error deleting transaction:', error);
    showToast('Error: ' + (error?.message || error), 'error');
  }
};

// View History (redirect to transactions page filtered)
window.viewMobilHistory = function() {
  window.location.href = 'transactions.html?filter=mobil';
};

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.getAttribute('data-page') === 'mobil') {
    await requireUserId();

    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    if ($('receive-date')) $('receive-date').value = today;
    if ($('sale-date')) $('sale-date').value = today;
    if ($('expense-date')) $('expense-date').value = today;

    // Setup auto-calculate
    setupAutoCalculate('receive-quantity', 'receive-rate', 'receive-amount');
    setupAutoCalculate('sale-quantity', 'sale-rate', 'sale-amount');

    // Load data
    loadCustomerDropdown();
    loadMobilStock();
    loadMobilTransactions();

    console.log('✅ Mobil management initialized (auth-safe)');
  }
});

})();