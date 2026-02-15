// Transactions Enhancements - Auto-Calculate & Tracking
(function() {
'use strict';

const supabase = window.supabaseClient;
function $(id) { return document.getElementById(id); }

// ============================================
// NEW SALE AUTO-CALCULATE FUNCTIONS
// ============================================

// Toggle between entry methods
window.toggleSaleMethod = function(method) {
  if (method === 'liters') {
    $('sale-liters-section').style.display = 'block';
    $('sale-amount-section').style.display = 'none';
    $('sale-liters').required = true;
    $('sale-amount-direct').required = false;
    $('sale-liters').value = '';
    $('sale-amount').value = '';
  } else {
    $('sale-liters-section').style.display = 'none';
    $('sale-amount-section').style.display = 'block';
    $('sale-liters').required = false;
    $('sale-amount-direct').required = true;
    $('sale-amount-direct').value = '';
    $('sale-amount').value = '';
  }
};

// Update fuel price when fuel type changes
window.updateSaleFuelPrice = function() {
  const fuelType = $('sale-fuel-type').value;
  const prices = JSON.parse(localStorage.getItem('fuel_prices') || '{}');
  
  if (fuelType && prices[fuelType]) {
    $('sale-unit-price').value = prices[fuelType];
  } else {
    // Default prices
    const defaults = { 'Petrol': 285, 'Diesel': 305 };
    $('sale-unit-price').value = defaults[fuelType] || 0;
  }
  
  // Recalculate
  const method = document.querySelector('input[name="sale-entry-method"]:checked').value;
  if (method === 'liters') {
    window.calcSaleFromLiters();
  } else {
    window.calcSaleFromAmount();
  }
};

// Calculate from liters
window.calcSaleFromLiters = function() {
  const liters = parseFloat($('sale-liters').value) || 0;
  const rate = parseFloat($('sale-unit-price').value) || 0;
  
  if (liters > 0 && rate > 0) {
    const total = liters * rate;
    $('sale-amount').value = total.toFixed(2);
  } else {
    $('sale-amount').value = '';
  }
};

// Calculate from amount
window.calcSaleFromAmount = function() {
  const amount = parseFloat($('sale-amount-direct').value) || 0;
  const rate = parseFloat($('sale-unit-price').value) || 0;
  
  if (amount > 0 && rate > 0) {
    const liters = amount / rate;
    $('sale-liters').value = liters.toFixed(2);
    $('sale-amount').value = amount.toFixed(2);
  } else {
    $('sale-amount').value = '';
  }
};

// ============================================
// VASOOLI ENHANCEMENTS
// ============================================

// Load customer balance
window.loadVasooliCustomerBalance = async function(customerId) {
  if (!customerId) {
    $('vasooli-balance-info').style.display = 'none';
    return;
  }

  try {
    const { data: customer } = await supabase
      .from('customers')
      .select('balance')
      .eq('id', customerId)
      .single();

    if (customer) {
      const formatted = Number(customer.balance || 0).toLocaleString('en-PK', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
      $('vasooli-current-balance').textContent = 'Rs. ' + formatted;
      $('vasooli-balance-info').style.display = 'block';
    }
  } catch (error) {
    console.error('Error loading balance:', error);
  }
};

// Enhanced addVasooli
window.addVasooli = async function() {
  const customerId = $('vasooli-customer').value;
  const amount = parseFloat($('vasooli-amount').value);
  const month = $('vasooli-month').value;
  const method = $('vasooli-method').value;
  const description = $('vasooli-description').value;

  if (!customerId || !amount) {
    alert('Please select customer and enter amount');
    return;
  }

  try {
    // Build description
    let fullDescription = `Payment received via ${method}`;
    if (month) {
      const date = new Date(month + '-01');
      const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      fullDescription += ` for ${monthName}`;
    }
    if (description) {
      fullDescription += ` - ${description}`;
    }

    // Create transaction
    const { error } = await supabase
      .from('transactions')
      .insert([{
        customer_id: parseInt(customerId),
        transaction_type: 'Debit',
        amount: amount,
        description: fullDescription
      }]);

    if (error) throw error;

    if (window.showToast) {
      window.showToast('Payment recorded successfully!', 'success');
    } else {
      alert('Payment recorded successfully!');
    }
    
    bootstrap.Modal.getInstance($('vasooliModal')).hide();
    $('vasooliForm').reset();
    $('vasooli-balance-info').style.display = 'none';
    
    // Reload transactions
    if (window.loadInitialTransactions) {
      window.loadInitialTransactions();
    }

  } catch (error) {
    console.error('Error adding vasooli:', error);
    alert('Error: ' + error.message);
  }
};

// ============================================
// EXPENSE ENHANCEMENTS
// ============================================

window.addExpense = async function() {
  const amount = parseFloat($('expense-amount').value);
  const description = $('expense-description').value;
  const expenseType = $('expense-type').value;
  const account = $('expense-account').value;

  if (!amount || !description || !expenseType || !account) {
    alert('Please fill all required fields');
    return;
  }

  try {
    // Find Owner customer
    const { data: owner } = await supabase
      .from('customers')
      .select('id')
      .eq('category', 'Owner')
      .single();

    if (!owner) {
      alert('Owner account not found. Please create one first.');
      return;
    }

    // Create expense transaction
    const fullDescription = `${expenseType}: ${description} (Paid from: ${account})`;
    
    const { error } = await supabase
      .from('transactions')
      .insert([{
        customer_id: owner.id,
        transaction_type: 'Expense',
        amount: amount,
        description: fullDescription
      }]);

    if (error) throw error;

    if (window.showToast) {
      window.showToast('Expense recorded successfully!', 'success');
    } else {
      alert('Expense recorded successfully!');
    }
    
    bootstrap.Modal.getInstance($('expenseModal')).hide();
    $('expenseForm').reset();
    
    // Reload transactions
    if (window.loadInitialTransactions) {
      window.loadInitialTransactions();
    }

  } catch (error) {
    console.error('Error adding expense:', error);
    alert('Error: ' + error.message);
  }
};

// ============================================
// INITIALIZE
// ============================================

console.log('✅ Transaction enhancements loaded');

})();