// Shop Rent Management System
(function() {
'use strict';

const supabase = window.supabaseClient;

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
  toastTitle.textContent = titles[type] || 'Notification';
  toastMessage.textContent = message;

  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();
}

// Note: Using 'customers' table to store shop data with category='Shop'
// Using 'transactions' table to store rent payments

// Add New Shop
window.addShop = async function() {
  const shopName = $('shop-name').value;
  const tenantName = $('tenant-name').value;
  const phone = $('tenant-phone').value;
  const monthlyRent = parseFloat($('monthly-rent').value);
  const dueDay = parseInt($('due-day').value);
  const startDate = $('agreement-start').value;
  const notes = $('shop-notes').value;

  if (!shopName || !tenantName || !monthlyRent || !startDate) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  try {
    // Create shop as a customer with category 'Shop'
    // Store additional data in description field as JSON
    const shopData = {
      monthly_rent: monthlyRent,
      due_day: dueDay,
      start_date: startDate,
      notes: notes
    };

    const { data, error } = await supabase
      .from('customers')
      .insert([{
        name: shopName,
        phone: phone,
        category: 'Shop',
        sr_no: Date.now(), // Using timestamp as unique identifier
        balance: 0,
        // Store shop-specific data in a JSON column if available, or use description
      }])
      .select()
      .single();

    if (error) throw error;

    // Store shop metadata separately
    localStorage.setItem(`shop_${data.id}`, JSON.stringify(shopData));

    showToast('Shop added successfully!', 'success');
    
    const modal = bootstrap.Modal.getInstance($('addShopModal'));
    if (modal) modal.hide();
    $('addShopForm').reset();

    loadShops();
    loadSummary();
  } catch (error) {
    console.error('Error adding shop:', error);
    showToast('Error: ' + error.message, 'error');
  }
};

// Generate Monthly Rent Entries
window.generateMonthlyRent = async function() {
  if (!confirm('Generate rent entries for all shops for current month?')) return;

  try {
    const { data: shops, error: shopsError } = await supabase
      .from('customers')
      .select('*')
      .eq('category', 'Shop');

    if (shopsError) throw shopsError;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    let created = 0;
    let skipped = 0;

    for (const shop of shops) {
      // Check if entry already exists for this month
      const { data: existing } = await supabase
        .from('transactions')
        .select('id')
        .eq('customer_id', shop.id)
        .eq('transaction_type', 'Rent')
        .gte('created_at', new Date(year, month - 1, 1).toISOString())
        .lt('created_at', new Date(year, month, 1).toISOString());

      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }

      // Get shop data
      const shopData = JSON.parse(localStorage.getItem(`shop_${shop.id}`) || '{}');
      const monthlyRent = shopData.monthly_rent || 0;
      const dueDay = shopData.due_day || 1;

      if (!monthlyRent) {
        skipped++;
        continue;
      }

      // Create rent entry
      const dueDate = new Date(year, month - 1, dueDay);
      
      await supabase
        .from('transactions')
        .insert([{
          customer_id: shop.id,
          tank_id: null,
          transaction_type: 'Rent',
          amount: monthlyRent,
          liters: 0,
          unit_price: null,
          description: `Rent for ${shop.name} - ${month}/${year}`,
          created_at: dueDate.toISOString()
        }]);

      created++;
    }

    showToast(`Generated ${created} rent entries, ${skipped} skipped (already exist)`, 'success');
    loadRentPayments();
    loadSummary();
  } catch (error) {
    console.error('Error generating rent:', error);
    showToast('Error: ' + error.message, 'error');
  }
};

// Record Payment
window.recordPayment = async function() {
  const rentId = parseInt($('rent-entry-select').value);
  const paymentDate = $('payment-date').value;
  const amount = parseFloat($('payment-amount').value);
  const method = $('payment-method').value;
  const notes = $('payment-notes').value;

  if (!rentId || !paymentDate || !amount) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  try {
    // Get the rent transaction
    const { data: rentTrans, error: rentError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', rentId)
      .single();

    if (rentError) throw rentError;

    // Update transaction with payment info
    const updatedDescription = `${rentTrans.description} | PAID: ${paymentDate} | Method: ${method}${notes ? ' | ' + notes : ''}`;
    
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        description: updatedDescription
      })
      .eq('id', rentId);

    if (updateError) throw updateError;

    // Store payment metadata
    const paymentData = {
      rent_id: rentId,
      paid_date: paymentDate,
      amount: amount,
      method: method,
      notes: notes,
      paid_at: new Date().toISOString()
    };
    localStorage.setItem(`payment_${rentId}`, JSON.stringify(paymentData));

    showToast('Payment recorded successfully!', 'success');
    
    const modal = bootstrap.Modal.getInstance($('recordPaymentModal'));
    if (modal) modal.hide();
    $('recordPaymentForm').reset();

    loadRentPayments();
    loadUnpaidRentDropdown();
    loadSummary();
  } catch (error) {
    console.error('Error recording payment:', error);
    showToast('Error: ' + error.message, 'error');
  }
};

// Load Shops
async function loadShops() {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('category', 'Shop')
      .order('name');

    if (error) throw error;

    const tbody = $('shops-table');
    if (!tbody) return;

    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No shops registered yet</td></tr>';
      return;
    }

    let html = '';
    data.forEach(shop => {
      const shopData = JSON.parse(localStorage.getItem(`shop_${shop.id}`) || '{}');
      const monthlyRent = shopData.monthly_rent || 0;

      html += `
        <tr>
          <td><strong>${shop.name}</strong></td>
          <td>${shop.phone || 'N/A'}</td>
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

// Load Rent Payments
async function loadRentPayments() {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        customer:customers(name)
      `)
      .eq('transaction_type', 'Rent')
      .gte('created_at', new Date(year, month - 1, 1).toISOString())
      .lt('created_at', new Date(year, month, 1).toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    const tbody = $('rent-payments-table');
    if (!tbody) return;

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

// Load Unpaid Rent Dropdown
async function loadUnpaidRentDropdown() {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        customer:customers(name)
      `)
      .eq('transaction_type', 'Rent')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    const select = $('rent-entry-select');
    if (!select) return;

    // Filter unpaid
    const unpaid = data.filter(r => !localStorage.getItem(`payment_${r.id}`));

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

// Load Summary
async function loadSummary() {
  try {
    const { data: shops } = await supabase
      .from('customers')
      .select('id')
      .eq('category', 'Shop');

    $('total-shops').textContent = shops?.length || 0;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const { data: rentData } = await supabase
      .from('transactions')
      .select('*')
      .eq('transaction_type', 'Rent')
      .gte('created_at', new Date(year, month - 1, 1).toISOString())
      .lt('created_at', new Date(year, month, 1).toISOString());

    let totalMonthRent = 0;
    let paidAmount = 0;
    let pendingCount = 0;

    rentData?.forEach(rent => {
      totalMonthRent += rent.amount;
      const paymentData = localStorage.getItem(`payment_${rent.id}`);
      if (paymentData) {
        paidAmount += rent.amount;
      } else {
        pendingCount++;
      }
    });

    $('month-rent').textContent = 'Rs. ' + formatNumber(totalMonthRent);
    $('paid-rent').textContent = 'Rs. ' + formatNumber(paidAmount);
    $('pending-rent').textContent = pendingCount;
  } catch (error) {
    console.error('Error loading summary:', error);
  }
}

// Quick Pay Rent
window.quickPayRent = function(rentId) {
  $('rent-entry-select').value = rentId;
  $('payment-date').value = new Date().toISOString().split('T')[0];
  
  // Get amount from transaction
  supabase
    .from('transactions')
    .select('amount')
    .eq('id', rentId)
    .single()
    .then(({ data }) => {
      if (data) $('payment-amount').value = data.amount;
    });

  const modal = new bootstrap.Modal($('recordPaymentModal'));
  modal.show();
};

// View Shop Details
window.viewShopDetails = function(shopId) {
  // Redirect to a details page or show modal
  alert('Shop details view - Coming soon!');
};

// Delete Shop
window.deleteShop = async function(shopId) {
  if (!confirm('Are you sure you want to delete this shop?')) return;

  try {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', shopId);

    if (error) throw error;

    localStorage.removeItem(`shop_${shopId}`);
    showToast('Shop deleted successfully!', 'success');
    loadShops();
    loadSummary();
  } catch (error) {
    console.error('Error deleting shop:', error);
    showToast('Error: ' + error.message, 'error');
  }
};

// Delete Rent Entry
window.deleteRent = async function(rentId) {
  if (!confirm('Are you sure you want to delete this rent entry?')) return;

  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', rentId);

    if (error) throw error;

    localStorage.removeItem(`payment_${rentId}`);
    showToast('Rent entry deleted successfully!', 'success');
    loadRentPayments();
    loadSummary();
  } catch (error) {
    console.error('Error deleting rent:', error);
    showToast('Error: ' + error.message, 'error');
  }
};

// View History
window.viewRentHistory = function() {
  window.location.href = 'transactions.html?filter=rent';
};

// Month filter change
if ($('month-filter')) {
  $('month-filter').addEventListener('change', function() {
    // TODO: Implement month filtering
    loadRentPayments();
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  if (document.body.getAttribute('data-page') === 'rent') {
    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    if ($('payment-date')) $('payment-date').value = today;
    if ($('agreement-start')) $('agreement-start').value = today;

    // Load data
    loadShops();
    loadRentPayments();
    loadUnpaidRentDropdown();
    loadSummary();

    console.log('✅ Rent management initialized');
  }
});

})();