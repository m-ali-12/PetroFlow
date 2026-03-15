// Shop Rent Management System (FIXED: auth + user_id, flow intact, design unchanged)
(function() {
'use strict';

const supabase = window.supabaseClient;

let currentUserId = null;

function $(id) { return document.getElementById(id); }

function formatNumber(num) {
  return Number(num || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-PK', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

// ---------- AUTH ----------
async function getUserOrNull() {
  try {
    if (window.auth && typeof window.auth.getCurrentUser === 'function') {
      const u = await window.auth.getCurrentUser();
      if (u?.id) return u;
      if (u?.user?.id) return u.user;
      if (u?.data?.user?.id) return u.data.user;
    }
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

function isMissingColumnError(err, column) {
  const msg = (err?.message || '').toLowerCase();
  return msg.includes('column') && msg.includes(column.toLowerCase()) && msg.includes('does not exist');
}

async function safeQueryCustomers(queryBuilder) {
  // Adds user_id filter if available, fallback if schema doesn't have it
  let q = queryBuilder(supabase.from('customers'));
  if (currentUserId) q = q.eq('user_id', currentUserId);
  let res = await q;
  if (res.error && currentUserId && isMissingColumnError(res.error, 'user_id')) {
    res = await queryBuilder(supabase.from('customers'));
  }
  return res;
}

async function safeQueryTransactions(queryBuilder) {
  let q = queryBuilder(supabase.from('transactions'));
  if (currentUserId) q = q.eq('user_id', currentUserId);
  let res = await q;
  if (res.error && currentUserId && isMissingColumnError(res.error, 'user_id')) {
    res = await queryBuilder(supabase.from('transactions'));
  }
  return res;
}

async function safeInsertCustomer(row) {
  const payload = { ...row };
  if (currentUserId) payload.user_id = currentUserId;

  let res = await supabase.from('customers').insert([payload]).select().single();
  if (res.error && currentUserId && isMissingColumnError(res.error, 'user_id')) {
    const { user_id, ...rest } = payload;
    res = await supabase.from('customers').insert([rest]).select().single();
  }
  return res;
}

async function safeInsertTransaction(row) {
  const payload = { ...row };
  if (currentUserId) payload.user_id = currentUserId;

  let res = await supabase.from('transactions').insert([payload]);
  if (res.error && currentUserId && isMissingColumnError(res.error, 'user_id')) {
    const { user_id, ...rest } = payload;
    res = await supabase.from('transactions').insert([rest]);
  }
  return res;
}

// Get next sr_no (keeps list ordered and avoids huge Date.now())
async function getNextCustomerSrNo() {
  const res = await safeQueryCustomers(t => t.select('sr_no').order('sr_no', { ascending: false }).limit(1));
  if (res.error) return Date.now();
  const max = res.data?.[0]?.sr_no;
  const n = parseInt(max, 10);
  if (!Number.isFinite(n)) return 1;
  return n + 1;
}

// ------------------------------
// Add New Shop
// ------------------------------
window.addShop = async function() {
  const shopName = $('shop-name')?.value;
  const tenantName = $('tenant-name')?.value;
  const phone = $('tenant-phone')?.value;
  const monthlyRent = parseFloat($('monthly-rent')?.value);
  const dueDay = parseInt($('due-day')?.value, 10);
  const startDate = $('agreement-start')?.value;
  const notes = $('shop-notes')?.value;

  if (!shopName || !tenantName || !monthlyRent || !startDate) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  try {
    if (!currentUserId) await requireUserId();

    // Store shop specific metadata in localStorage (kept as-is for your current UI)
    const shopMeta = {
      tenant_name: tenantName,
      monthly_rent: monthlyRent,
      due_day: Number.isFinite(dueDay) ? dueDay : 1,
      start_date: startDate,
      notes: notes || ''
    };

    const srNo = await getNextCustomerSrNo();

    // Create shop as a customer with category 'Shop'
    const { data, error } = await safeInsertCustomer({
      name: shopName,
      phone: phone || '',
      category: 'Shop',
      sr_no: srNo,
      balance: 0
    });

    if (error) throw error;

    localStorage.setItem(`shop_${data.id}`, JSON.stringify(shopMeta));

    showToast('Shop added successfully!', 'success');

    const modalEl = $('addShopModal');
    const modal = modalEl ? bootstrap.Modal.getInstance(modalEl) : null;
    if (modal) modal.hide();
    if ($('addShopForm')) $('addShopForm').reset();

    loadShops();
    loadSummary();
  } catch (error) {
    console.error('Error adding shop:', error);
    showToast('Error: ' + (error?.message || error), 'error');
  }
};

// ------------------------------
// Generate Monthly Rent Entries
// ------------------------------
window.generateMonthlyRent = async function() {
  if (!confirm('Generate rent entries for all shops for current month?')) return;

  try {
    if (!currentUserId) await requireUserId();

    const shopsRes = await safeQueryCustomers(t => t.select('*').eq('category', 'Shop'));
    if (shopsRes.error) throw shopsRes.error;
    const shops = shopsRes.data || [];

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    let created = 0;
    let skipped = 0;

    for (const shop of shops) {
      // Check if entry already exists for this month (per user)
      const existRes = await safeQueryTransactions(t => t
        .select('id')
        .eq('customer_id', shop.id)
        .eq('transaction_type', 'Rent')
        .gte('created_at', new Date(year, month - 1, 1).toISOString())
        .lt('created_at', new Date(year, month, 1).toISOString())
      );
      const existing = existRes.data || [];
      if (existing.length > 0) { skipped++; continue; }

      // Get shop data
      const shopData = JSON.parse(localStorage.getItem(`shop_${shop.id}`) || '{}');
      const monthlyRent = parseFloat(shopData.monthly_rent) || 0;
      const dueDay = parseInt(shopData.due_day, 10) || 1;

      if (!monthlyRent) { skipped++; continue; }

      const dueDate = new Date(year, month - 1, dueDay);

      const ins = await safeInsertTransaction({
        customer_id: shop.id,
        tank_id: null,
        transaction_type: 'Rent',
        amount: monthlyRent,
        liters: 0,
        unit_price: null,
        description: `Rent for ${shop.name} - ${month}/${year}`,
        created_at: dueDate.toISOString()
      });
      if (ins.error) throw ins.error;
      created++;
    }

    showToast(`Generated ${created} rent entries, ${skipped} skipped (already exist)`, 'success');
    loadRentPayments();
    loadUnpaidRentDropdown();
    loadSummary();
  } catch (error) {
    console.error('Error generating rent:', error);
    showToast('Error: ' + (error?.message || error), 'error');
  }
};

// ------------------------------
// Record Payment
// ------------------------------
window.recordPayment = async function() {
  const rentId = parseInt($('rent-entry-select')?.value, 10);
  const paymentDate = $('payment-date')?.value;
  const amount = parseFloat($('payment-amount')?.value);
  const method = $('payment-method')?.value;
  const notes = $('payment-notes')?.value;

  if (!rentId || !paymentDate || !amount) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  try {
    if (!currentUserId) await requireUserId();

    const rentRes = await safeQueryTransactions(t => t.select('*').eq('id', rentId).single());
    if (rentRes.error) throw rentRes.error;
    const rentTrans = rentRes.data;

    const updatedDescription = `${rentTrans.description} | PAID: ${paymentDate} | Amount: ${amount} | Method: ${method || 'N/A'}${notes ? ' | ' + notes : ''}`;

    const updRes = await safeQueryTransactions(t => t.update({ description: updatedDescription }).eq('id', rentId));
    if (updRes.error) throw updRes.error;

    const paymentData = {
      rent_id: rentId,
      paid_date: paymentDate,
      amount: amount,
      method: method || '',
      notes: notes || '',
      paid_at: new Date().toISOString()
    };
    localStorage.setItem(`payment_${rentId}`, JSON.stringify(paymentData));

    showToast('Payment recorded successfully!', 'success');

    const modalEl = $('recordPaymentModal');
    const modal = modalEl ? bootstrap.Modal.getInstance(modalEl) : null;
    if (modal) modal.hide();
    if ($('recordPaymentForm')) $('recordPaymentForm').reset();

    loadRentPayments();
    loadUnpaidRentDropdown();
    loadSummary();
  } catch (error) {
    console.error('Error recording payment:', error);
    showToast('Error: ' + (error?.message || error), 'error');
  }
};

// ------------------------------
// Load Shops
// ------------------------------
async function loadShops() {
  try {
    if (!currentUserId) return;

    const res = await safeQueryCustomers(t => t.select('*').eq('category', 'Shop').order('name'));
    if (res.error) throw res.error;

    const tbody = $('shops-table');
    if (!tbody) return;

    const data = res.data || [];
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No shops registered yet</td></tr>';
      return;
    }

    let html = '';
    data.forEach(shop => {
      const shopData = JSON.parse(localStorage.getItem(`shop_${shop.id}`) || '{}');
      const monthlyRent = shopData.monthly_rent || 0;
      const tenant = shopData.tenant_name || '-';

      html += `
        <tr>
          <td><strong>${shop.name}</strong></td>
          <td>${tenant}</td>
          <td><strong>Rs. ${formatNumber(monthlyRent)}</strong></td>
          <td>${shop.phone || '-'}</td>
          <td><span class="badge bg-success">Active</span></td>
          <td>
            <button class="btn btn-sm btn-outline-primary" onclick="viewShopDetails(${shop.id})">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteShop(${shop.id})">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  } catch (error) {
    console.error('Error loading shops:', error);
  }
}

// ------------------------------
// Load Rent Payments (current month)
// ------------------------------
async function loadRentPayments() {
  try {
    if (!currentUserId) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const res = await safeQueryTransactions(t => t
      .select(`*, customer:customers(name)`)
      .eq('transaction_type', 'Rent')
      .gte('created_at', new Date(year, month - 1, 1).toISOString())
      .lt('created_at', new Date(year, month, 1).toISOString())
      .order('created_at', { ascending: false })
    );
    if (res.error) throw res.error;

    const tbody = $('rent-payments-table');
    if (!tbody) return;

    const data = res.data || [];
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No rent entries for this month</td></tr>';
      return;
    }

    let html = '';
    data.forEach(rent => {
      const paymentData = JSON.parse(localStorage.getItem(`payment_${rent.id}`) || 'null');
      const isPaid = paymentData !== null;
      const dueDate = new Date(rent.created_at);
      const isOverdue = !isPaid && new Date() > dueDate;

      const statusClass = isPaid ? 'bg-success' : isOverdue ? 'bg-danger' : 'bg-warning';
      const statusText = isPaid ? 'Paid' : isOverdue ? 'Overdue' : 'Pending';

      html += `
        <tr>
          <td><strong>${rent.customer?.name || 'Unknown'}</strong></td>
          <td>${month}/${year}</td>
          <td><strong>Rs. ${formatNumber(rent.amount)}</strong></td>
          <td>${formatDate(dueDate)}</td>
          <td><span class="badge ${statusClass}">${statusText}</span></td>
          <td>${isPaid ? formatDate(paymentData.paid_date) : '-'}</td>
          <td>
            ${!isPaid ? `
              <button class="btn btn-sm btn-success" onclick="quickPayRent(${rent.id})">
                <i class="bi bi-cash"></i> Pay
              </button>
            ` : ''}
            <button class="btn btn-sm btn-outline-danger" onclick="deleteRent(${rent.id})">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  } catch (error) {
    console.error('Error loading rent payments:', error);
  }
}

// ------------------------------
// Load Unpaid Rent Dropdown
// ------------------------------
async function loadUnpaidRentDropdown() {
  try {
    if (!currentUserId) return;

    const res = await safeQueryTransactions(t => t
      .select(`*, customer:customers(name)`)
      .eq('transaction_type', 'Rent')
      .order('created_at', { ascending: false })
      .limit(200)
    );
    if (res.error) throw res.error;

    const select = $('rent-entry-select');
    if (!select) return;

    const all = res.data || [];
    const unpaid = all.filter(r => !localStorage.getItem(`payment_${r.id}`));

    if (unpaid.length === 0) {
      select.innerHTML = '<option value="">No unpaid rent entries</option>';
      return;
    }

    select.innerHTML = '<option value="">Select rent entry</option>';
    unpaid.forEach(rent => {
      const date = new Date(rent.created_at);
      const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
      select.innerHTML += `<option value="${rent.id}">${rent.customer?.name || 'Unknown'} - ${monthYear} - Rs. ${formatNumber(rent.amount)}</option>`;
    });
  } catch (error) {
    console.error('Error loading unpaid rent:', error);
  }
}

// ------------------------------
// Load Summary
// ------------------------------
async function loadSummary() {
  try {
    if (!currentUserId) return;

    const shopsRes = await safeQueryCustomers(t => t.select('id').eq('category', 'Shop'));
    if (shopsRes.error) throw shopsRes.error;
    if ($('total-shops')) $('total-shops').textContent = (shopsRes.data || []).length;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const rentRes = await safeQueryTransactions(t => t
      .select('*')
      .eq('transaction_type', 'Rent')
      .gte('created_at', new Date(year, month - 1, 1).toISOString())
      .lt('created_at', new Date(year, month, 1).toISOString())
    );
    if (rentRes.error) throw rentRes.error;

    const rentData = rentRes.data || [];
    let totalMonthRent = 0;
    let paidAmount = 0;
    let pendingCount = 0;

    rentData.forEach(rent => {
      totalMonthRent += parseFloat(rent.amount) || 0;
      const paidMeta = localStorage.getItem(`payment_${rent.id}`);
      if (paidMeta) paidAmount += parseFloat(rent.amount) || 0;
      else pendingCount++;
    });

    if ($('month-rent')) $('month-rent').textContent = 'Rs. ' + formatNumber(totalMonthRent);
    if ($('paid-rent')) $('paid-rent').textContent = 'Rs. ' + formatNumber(paidAmount);
    if ($('pending-rent')) $('pending-rent').textContent = pendingCount;
  } catch (error) {
    console.error('Error loading summary:', error);
  }
}

// Quick Pay Rent
window.quickPayRent = function(rentId) {
  if ($('rent-entry-select')) $('rent-entry-select').value = rentId;
  if ($('payment-date')) $('payment-date').value = new Date().toISOString().split('T')[0];

  safeQueryTransactions(t => t.select('amount').eq('id', rentId).single())
    .then(({ data }) => {
      if (data && $('payment-amount')) $('payment-amount').value = data.amount;
    });

  const modalEl = $('recordPaymentModal');
  if (modalEl) new bootstrap.Modal(modalEl).show();
};

// View Shop Details
window.viewShopDetails = function(shopId) {
  alert('Shop details view - Coming soon!');
};

// Delete Shop
window.deleteShop = async function(shopId) {
  if (!confirm('Are you sure you want to delete this shop?')) return;

  try {
    if (!currentUserId) await requireUserId();

    const res = await safeQueryCustomers(t => t.delete().eq('id', shopId));
    if (res.error) throw res.error;

    localStorage.removeItem(`shop_${shopId}`);
    showToast('Shop deleted successfully!', 'success');
    loadShops();
    loadSummary();
  } catch (error) {
    console.error('Error deleting shop:', error);
    showToast('Error: ' + (error?.message || error), 'error');
  }
};

// Delete Rent Entry
window.deleteRent = async function(rentId) {
  if (!confirm('Are you sure you want to delete this rent entry?')) return;

  try {
    if (!currentUserId) await requireUserId();

    const res = await safeQueryTransactions(t => t.delete().eq('id', rentId));
    if (res.error) throw res.error;

    localStorage.removeItem(`payment_${rentId}`);
    showToast('Rent entry deleted successfully!', 'success');
    loadRentPayments();
    loadUnpaidRentDropdown();
    loadSummary();
  } catch (error) {
    console.error('Error deleting rent:', error);
    showToast('Error: ' + (error?.message || error), 'error');
  }
};

// View History
window.viewRentHistory = function() {
  window.location.href = 'transactions.html?filter=rent';
};

// Month filter change (kept)
if ($('month-filter')) {
  $('month-filter').addEventListener('change', function() {
    loadRentPayments();
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.getAttribute('data-page') === 'rent') {
    await requireUserId();

    const today = new Date().toISOString().split('T')[0];
    if ($('payment-date')) $('payment-date').value = today;
    if ($('agreement-start')) $('agreement-start').value = today;

    loadShops();
    loadRentPayments();
    loadUnpaidRentDropdown();
    loadSummary();

    console.log('✅ Rent management initialized (auth-safe)');
  }
});

})();