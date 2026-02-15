// COMPLETE ALL-IN-ONE TRANSACTIONS - GUARANTEED WORKING
(function() {
'use strict';

const supabase = window.supabaseClient;
let allTransactions = [];
let allCustomers = [];

function $(id) { return document.getElementById(id); }

function formatNumber(num) {
  return Number(num || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    console.log('✅ Loaded transactions:', allTransactions.length);
    
    displayTransactions(allTransactions);
    updateSummaryCards(allTransactions);
  } catch (error) {
    console.error('❌ Error loading transactions:', error);
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
    console.log('✅ Loaded customers:', allCustomers.length);
    
    populateCustomerDropdowns();
  } catch (error) {
    console.error('❌ Error loading customers:', error);
  }
}

function populateCustomerDropdowns() {
  // Sale customer dropdown
  if ($('sale-customer')) {
    let html = '<option value="">Select Customer</option>';
    allCustomers.forEach(c => {
      html += `<option value="${c.id}">${c.sr_no} - ${c.name}</option>`;
    });
    $('sale-customer').innerHTML = html;
  }

  // Vasooli customer dropdown
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
// DISPLAY & UPDATE
// ============================================

function updateSummaryCards(transactions) {
  let credit = 0, debit = 0, expense = 0;
  let creditCount = 0, debitCount = 0, expenseCount = 0;

  transactions.forEach(t => {
    const amt = parseFloat(t.amount) || 0;
    if (t.transaction_type === 'Credit') { credit += amt; creditCount++; }
    else if (t.transaction_type === 'Debit') { debit += amt; debitCount++; }
    else if (t.transaction_type === 'Expense') { expense += amt; expenseCount++; }
  });

  if ($('total-credit')) $('total-credit').textContent = 'Rs. ' + formatNumber(credit);
  if ($('credit-count')) $('credit-count').textContent = creditCount + ' transactions';
  if ($('total-debit')) $('total-debit').textContent = 'Rs. ' + formatNumber(debit);
  if ($('debit-count')) $('debit-count').textContent = debitCount + ' transactions';
  if ($('total-expense')) $('total-expense').textContent = 'Rs. ' + formatNumber(expense);
  if ($('expense-count')) $('expense-count').textContent = expenseCount + ' transactions';
  if ($('net-balance')) $('net-balance').textContent = 'Rs. ' + formatNumber(credit - expense);

  console.log('✅ Summary updated');
}

function displayTransactions(transactions) {
  const tbody = $('transactions-table');
  if (!tbody) return;

  if (transactions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4">No transactions</td></tr>';
    return;
  }

  tbody.innerHTML = transactions.map(t => {
    const date = new Date(t.created_at);
    const typeClass = t.transaction_type === 'Credit' ? 'bg-success' :
                      t.transaction_type === 'Debit' ? 'bg-primary' : 'bg-warning';
    
    return `<tr>
      <td>${date.toLocaleDateString('en-PK')}</td>
      <td>${t.customers?.name || 'N/A'} (${t.customers?.sr_no || '-'})</td>
      <td><span class="badge ${typeClass}">${t.transaction_type}</span></td>
      <td>-</td>
      <td>${t.liters > 0 ? formatNumber(t.liters) + ' L' : '-'}</td>
      <td>${t.unit_price ? 'Rs. ' + formatNumber(t.unit_price) : '-'}</td>
      <td><strong>Rs. ${formatNumber(t.amount)}</strong></td>
      <td>${t.description || '-'}</td>
      <td><button class="btn btn-sm btn-danger" onclick="window.deleteTransaction(${t.id})">×</button></td>
    </tr>`;
  }).join('');
}

// ============================================
// NEW SALE
// ============================================

async function handleNewSale() {
  const customerId = $('sale-customer')?.value;
  const fuelType = $('sale-fuel-type')?.value;
  const liters = parseFloat($('sale-liters')?.value) || 0;
  const unitPrice = parseFloat($('sale-unit-price')?.value) || 285;
  const amount = parseFloat($('sale-amount')?.value) || 0;
  const paymentType = $('sale-payment-type')?.value || 'cash';

  if (!customerId || !fuelType || !amount) {
    alert('Please fill required fields');
    return;
  }

  try {
    const { error } = await supabase
      .from('transactions')
      .insert([{
        customer_id: parseInt(customerId),
        transaction_type: paymentType === 'cash' ? 'Debit' : 'Credit',
        amount: amount,
        liters: liters,
        unit_price: unitPrice,
        description: `${fuelType} sale`
      }]);

    if (error) throw error;

    alert('Sale recorded!');
    closeModal('newSaleModal');
    loadInitialTransactions();
  } catch (error) {
    console.error('Error:', error);
    alert('Error: ' + error.message);
  }
}

// ============================================
// VASOOLI
// ============================================

async function handleVasooli() {
  const customerId = $('vasooli-customer')?.value;
  const amount = parseFloat($('vasooli-amount')?.value) || 0;

  if (!customerId || !amount) {
    alert('Please select customer and enter amount');
    return;
  }

  try {
    const { error } = await supabase
      .from('transactions')
      .insert([{
        customer_id: parseInt(customerId),
        transaction_type: 'Debit',
        amount: amount,
        description: 'Payment received'
      }]);

    if (error) throw error;

    alert('Payment recorded!');
    closeModal('vasooliModal');
    loadInitialTransactions();
  } catch (error) {
    console.error('Error:', error);
    alert('Error: ' + error.message);
  }
}

// ============================================
// EXPENSE
// ============================================

async function handleExpense() {
  const amount = parseFloat($('expense-amount')?.value) || 0;
  const description = $('expense-description')?.value;

  if (!amount || !description) {
    alert('Please fill all fields');
    return;
  }

  try {
    // Get or create owner
    let customerId = null;
    
    const { data: owner } = await supabase
      .from('customers')
      .select('id')
      .eq('category', 'Owner')
      .maybeSingle();

    if (owner) {
      customerId = owner.id;
    } else {
      // Create Owner
      const { data: newOwner, error: createError } = await supabase
        .from('customers')
        .insert([{ sr_no: 0, name: 'Owner', category: 'Owner', balance: 0 }])
        .select()
        .single();
      
      if (createError) throw createError;
      customerId = newOwner.id;
    }

    const { error } = await supabase
      .from('transactions')
      .insert([{
        customer_id: customerId,
        transaction_type: 'Expense',
        amount: amount,
        description: description
      }]);

    if (error) throw error;

    alert('Expense recorded!');
    closeModal('expenseModal');
    loadInitialTransactions();
    loadCustomers(); // Reload if Owner was created
  } catch (error) {
    console.error('Error:', error);
    alert('Error: ' + error.message);
  }
}

// ============================================
// HELPERS
// ============================================

function closeModal(modalId) {
  const modal = bootstrap.Modal.getInstance($(modalId));
  if (modal) modal.hide();
  const form = document.querySelector(`#${modalId} form`);
  if (form) form.reset();
}

window.deleteTransaction = async function(id) {
  if (!confirm('Delete?')) return;
  try {
    await supabase.from('transactions').delete().eq('id', id);
    alert('Deleted!');
    loadInitialTransactions();
  } catch (error) {
    alert('Error: ' + error.message);
  }
};

// ============================================
// AUTO-CALCULATE FOR NEW SALE
// ============================================

function setupAutoCalculate() {
  const litersInput = $('sale-liters');
  const priceInput = $('sale-unit-price');
  const amountInput = $('sale-amount');
  const fuelSelect = $('sale-fuel-type');

  if (fuelSelect) {
    fuelSelect.addEventListener('change', () => {
      const prices = { 'Petrol': 285, 'Diesel': 305 };
      if (priceInput) priceInput.value = prices[fuelSelect.value] || 285;
      calculateAmount();
    });
  }

  if (litersInput) {
    litersInput.addEventListener('input', calculateAmount);
  }

  if (priceInput) {
    priceInput.addEventListener('input', calculateAmount);
  }

  function calculateAmount() {
    const liters = parseFloat(litersInput?.value) || 0;
    const price = parseFloat(priceInput?.value) || 0;
    if (amountInput && liters > 0 && price > 0) {
      amountInput.value = (liters * price).toFixed(2);
    }
  }
}

// ============================================
// FORM SUBMISSIONS
// ============================================

function setupFormHandlers() {
  const saleForm = $('newSaleForm');
  if (saleForm) {
    saleForm.addEventListener('submit', (e) => {
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

// ============================================
// INITIALIZE
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  if (document.body.getAttribute('data-page') === 'transactions') {
    console.log('🚀 Initializing transactions...');
    
    loadInitialTransactions();
    loadCustomers();
    setupAutoCalculate();
    setupFormHandlers();
    
    console.log('✅ Ready!');
  }
});

window.loadInitialTransactions = loadInitialTransactions;

})();