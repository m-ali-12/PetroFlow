// Mobil Oil Management System
(function() {
'use strict';

const supabase = window.supabaseClient;

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
  toastTitle.textContent = titles[type] || 'Notification';
  toastMessage.textContent = message;

  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();
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
    const { data, error } = await supabase
      .from('customers')
      .select('id, sr_no, name')
      .order('sr_no');

    if (error) throw error;

    const select = $('sale-customer');
    if (!select) return;

    select.innerHTML = '<option value="">Select Customer</option>';
    data.forEach(c => {
      select.innerHTML += `<option value="${c.id}">${c.sr_no} - ${c.name}</option>`;
    });
  } catch (error) {
    console.error('Error loading customers:', error);
  }
}

// Receive Mobil Stock
window.receiveMobilStock = async function() {
  const mobilType = $('receive-mobil-type').value;
  const supplier = $('receive-supplier').value;
  const quantity = parseFloat($('receive-quantity').value);
  const rate = parseFloat($('receive-rate').value);
  const amount = parseFloat($('receive-amount').value);
  const date = $('receive-date').value;
  const invoice = $('receive-invoice').value;
  const notes = $('receive-notes').value;

  if (!mobilType || !quantity || !rate || !date) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  try {
    // Find the mobil tank
    const { data: tanks, error: tankError } = await supabase
      .from('tanks')
      .select('*')
      .eq('name', mobilType)
      .single();

    if (tankError) throw tankError;

    // Update tank stock
    const newStock = tanks.current_stock + quantity;
    const { error: updateError } = await supabase
      .from('tanks')
      .update({ 
        current_stock: newStock,
        last_updated: new Date().toISOString()
      })
      .eq('id', tanks.id);

    if (updateError) throw updateError;

    // Create expense transaction for purchase
    const owner = await supabase
      .from('customers')
      .select('*')
      .eq('category', 'Owner')
      .eq('sr_no', 0)
      .single();

    if (!owner.error && owner.data) {
      await supabase
        .from('transactions')
        .insert([{
          customer_id: owner.data.id,
          tank_id: tanks.id,
          transaction_type: 'Expense',
          amount: amount,
          liters: quantity,
          unit_price: rate,
          description: `Mobil Purchase: ${mobilType} - ${supplier || 'Supplier'} - Invoice: ${invoice || 'N/A'} - ${notes || ''}`,
          created_at: new Date(date).toISOString()
        }]);
    }

    showToast('Stock received successfully!', 'success');
    
    const modal = bootstrap.Modal.getInstance($('receiveMobilModal'));
    if (modal) modal.hide();
    $('receiveMobilForm').reset();

    loadMobilStock();
    loadMobilTransactions();
  } catch (error) {
    console.error('Error receiving stock:', error);
    showToast('Error: ' + error.message, 'error');
  }
};

// Sale Mobil Oil
window.saleMobilOil = async function() {
  const customerId = $('sale-customer').value;
  const mobilType = $('sale-mobil-type').value;
  const quantity = parseFloat($('sale-quantity').value);
  const rate = parseFloat($('sale-rate').value);
  const amount = parseFloat($('sale-amount').value);
  const date = $('sale-date').value;
  const paymentType = $('sale-payment-type').value;
  const notes = $('sale-notes').value;

  if (!customerId || !mobilType || !quantity || !rate || !date) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  try {
    // Find the mobil tank
    const { data: tank, error: tankError } = await supabase
      .from('tanks')
      .select('*')
      .eq('name', mobilType)
      .single();

    if (tankError) throw tankError;

    // Check stock
    if (tank.current_stock < quantity) {
      showToast(`Not enough stock! Available: ${tank.current_stock} L`, 'error');
      return;
    }

    // Update tank stock
    const newStock = tank.current_stock - quantity;
    const { error: updateError } = await supabase
      .from('tanks')
      .update({ 
        current_stock: newStock,
        last_updated: new Date().toISOString()
      })
      .eq('id', tank.id);

    if (updateError) throw updateError;

    // Create sale transaction
    const { error: transError } = await supabase
      .from('transactions')
      .insert([{
        customer_id: parseInt(customerId),
        tank_id: tank.id,
        transaction_type: 'Credit',
        amount: amount,
        liters: quantity,
        unit_price: rate,
        description: `Mobil Sale: ${mobilType} - ${notes || ''}`,
        created_at: new Date(date).toISOString()
      }]);

    if (transError) throw transError;

    // Update customer balance if credit
    if (paymentType === 'credit') {
      const { data: customer } = await supabase
        .from('customers')
        .select('balance')
        .eq('id', customerId)
        .single();

      if (customer) {
        await supabase
          .from('customers')
          .update({ balance: parseFloat(customer.balance) + amount })
          .eq('id', customerId);
      }
    }

    showToast('Sale completed successfully!', 'success');
    
    const modal = bootstrap.Modal.getInstance($('saleMobilModal'));
    if (modal) modal.hide();
    $('saleMobilForm').reset();

    loadMobilStock();
    loadMobilTransactions();
  } catch (error) {
    console.error('Error completing sale:', error);
    showToast('Error: ' + error.message, 'error');
  }
};

// Add Mobil Expense
window.addMobilExpense = async function() {
  const expenseType = $('expense-type').value;
  const amount = parseFloat($('expense-amount-mobil').value);
  const date = $('expense-date').value;
  const description = $('expense-description-mobil').value;

  if (!expenseType || !amount || !date || !description) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  try {
    // Find owner account
    const { data: owner, error: ownerError } = await supabase
      .from('customers')
      .select('*')
      .eq('category', 'Owner')
      .eq('sr_no', 0)
      .single();

    if (ownerError || !owner) {
      showToast('Owner account not found. Please create one first.', 'error');
      return;
    }

    // Create expense transaction
    const { error } = await supabase
      .from('transactions')
      .insert([{
        customer_id: owner.id,
        tank_id: null,
        transaction_type: 'Expense',
        amount: amount,
        liters: 0,
        unit_price: null,
        description: `Mobil Expense - ${expenseType}: ${description}`,
        created_at: new Date(date).toISOString()
      }]);

    if (error) throw error;

    showToast('Expense recorded successfully!', 'success');
    
    const modal = bootstrap.Modal.getInstance($('mobilExpenseModal'));
    if (modal) modal.hide();
    $('mobilExpenseForm').reset();

    loadMobilTransactions();
  } catch (error) {
    console.error('Error recording expense:', error);
    showToast('Error: ' + error.message, 'error');
  }
};

// Load Mobil Stock
async function loadMobilStock() {
  try {
    const { data, error } = await supabase
      .from('tanks')
      .select('*')
      .in('name', ['Car Mobil', 'Open Mobil']);

    if (error) throw error;

    const carMobil = data.find(t => t.name === 'Car Mobil');
    const openMobil = data.find(t => t.name === 'Open Mobil');

    if (carMobil && $('mobil-car-stock-page')) {
      $('mobil-car-stock-page').textContent = formatNumber(carMobil.current_stock);
    }

    if (openMobil && $('mobil-open-stock-page')) {
      $('mobil-open-stock-page').textContent = formatNumber(openMobil.current_stock);
    }
  } catch (error) {
    console.error('Error loading mobil stock:', error);
  }
}

// Load Mobil Transactions
async function loadMobilTransactions() {
  try {
    const { data: tanks } = await supabase
      .from('tanks')
      .select('id')
      .in('name', ['Car Mobil', 'Open Mobil']);

    const tankIds = tanks.map(t => t.id);

    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        customer:customers(name, sr_no),
        tank:tanks(name)
      `)
      .in('tank_id', tankIds)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const tbody = $('mobil-transactions-table');
    if (!tbody) return;

    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No transactions yet</td></tr>';
      return;
    }

    let html = '';
    data.forEach(t => {
      const date = new Date(t.created_at).toLocaleDateString('en-PK');
      const typeClass = t.transaction_type === 'Credit' ? 'badge-success' : 'badge-warning';
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
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    showToast('Transaction deleted successfully!', 'success');
    loadMobilTransactions();
  } catch (error) {
    console.error('Error deleting transaction:', error);
    showToast('Error: ' + error.message, 'error');
  }
};

// View History (redirect to transactions page filtered)
window.viewMobilHistory = function() {
  window.location.href = 'transactions.html?filter=mobil';
};

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  if (document.body.getAttribute('data-page') === 'mobil') {
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

    console.log('✅ Mobil management initialized');
  }
});

})();