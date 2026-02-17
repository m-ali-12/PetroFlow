// TRANSACTIONS - MULTI-TENANT VERSION WITH USER_ID FILTERING
(function() {
'use strict';

const supabase = window.supabaseClient;
let allTransactions = [];
let allCustomers = [];
let isSubmitting = false;
let fuelPrices = { Petrol: 285, Diesel: 305 };
let currentUserId = null;

// Pagination state
let currentPage = 1;
let itemsPerPage = 10;
let sortOrder = 'desc';

function $(id) { return document.getElementById(id); }

function formatNumber(num) {
  return Number(num || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ============================================
// GET CURRENT USER - CRITICAL FOR MULTI-TENANT
// ============================================

async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!user) throw new Error('Not logged in');
    currentUserId = user.id;
    console.log('✅ User:', user.email);
    return user;
  } catch (error) {
    console.error('❌ Auth error:', error);
    window.location.href = 'login.html';
    return null;
  }
}

// ============================================
// LOAD FUEL PRICES FROM SETTINGS
// ============================================

async function loadFuelPrices() {
  if (!currentUserId) return;
  
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('petrol_price, diesel_price')
      .eq('user_id', currentUserId)
      .maybeSingle();

    if (error || !data) {
      console.log('No settings found, using defaults');
      return;
    }

    fuelPrices = {
      Petrol: parseFloat(data.petrol_price) || 285,
      Diesel: parseFloat(data.diesel_price) || 305
    };
    console.log('✅ Prices:', fuelPrices);
  } catch (error) {
    console.log('Using default prices');
  }
}

// ============================================
// LOAD DATA - WITH USER_ID FILTER
// ============================================

async function loadInitialTransactions() {
  if (!currentUserId) return;
  console.log('Loading transactions...');
  
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, customers!inner(name, sr_no)')
      .eq('user_id', currentUserId)  // ← ONLY THIS USER'S DATA
      .order('created_at', { ascending: sortOrder === 'asc' })
      .limit(1000);

    if (error) throw error;

    allTransactions = data || [];
    console.log('✅ Transactions:', allTransactions.length);
    
    currentPage = 1;
    displayTransactions(allTransactions);
    updateSummaryCards(allTransactions);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function loadCustomers() {
  if (!currentUserId) return;
  console.log('Loading customers...');
  
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', currentUserId)  // ← ONLY THIS USER'S CUSTOMERS
      .order('sr_no');

    if (error) throw error;

    allCustomers = data || [];
    console.log('✅ Customers:', allCustomers.length);
    
    populateCustomerDropdowns();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

function populateCustomerDropdowns() {
  const saleSelect = $('sale-customer');
  const vasooliSelect = $('vasooli-customer');

  if (saleSelect) {
    let html = '<option value="">Select Customer</option>';
    allCustomers.forEach(c => {
      html += `<option value="${c.id}">${c.sr_no} - ${c.name}</option>`;
    });
    saleSelect.innerHTML = html;
  }

  if (vasooliSelect) {
    let html = '<option value="">Select Customer</option>';
    allCustomers.forEach(c => {
      if (c.category !== 'Owner') {
        html += `<option value="${c.id}">${c.sr_no} - ${c.name} (Balance: Rs. ${formatNumber(c.balance || 0)})</option>`;
      }
    });
    vasooliSelect.innerHTML = html;
  }
}

// ============================================
// PAGINATION & DISPLAY
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
    tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4">No transactions found</td></tr>';
    updatePaginationBadge(0);
    return;
  }

  const totalItems = transactions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const start = (currentPage - 1) * itemsPerPage;
  const end = Math.min(start + itemsPerPage, totalItems);
  const pageItems = transactions.slice(start, end);

  tbody.innerHTML = pageItems.map(t => {
    const date = new Date(t.created_at);
    let badgeClass = t.transaction_type === 'Credit' ? 'bg-success text-white' :
                     t.transaction_type === 'Debit' ? 'bg-primary text-white' :
                     'bg-warning text-dark';
    
    return `<tr>
      <td>${date.toLocaleDateString('en-PK')}, ${date.toLocaleTimeString('en-PK', {hour:'2-digit', minute:'2-digit'})}</td>
      <td>${t.customers?.name || 'N/A'} (${t.customers?.sr_no || '-'})</td>
      <td><span class="badge ${badgeClass}">${t.transaction_type}</span></td>
      <td>${t.fuel_type || '-'}</td>
      <td>${t.liters > 0 ? formatNumber(t.liters) + ' L' : '-'}</td>
      <td>${t.unit_price ? 'Rs. ' + formatNumber(t.unit_price) : '-'}</td>
      <td><strong>Rs. ${formatNumber(t.amount)}</strong></td>
      <td>${t.description || '-'}</td>
      <td><button class="btn btn-sm btn-danger" onclick="window.deleteTransaction(${t.id})">×</button></td>
    </tr>`;
  }).join('');

  updatePaginationBadge(totalItems);
  renderPagination(totalPages);
}

function updatePaginationBadge(totalItems) {
  const badge = $('transaction-count');
  if (!badge) return;
  
  if (totalItems === 0) {
    badge.textContent = '0 transactions';
    return;
  }
  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);
  badge.textContent = `Showing ${start}-${end} of ${totalItems}`;
}

function renderPagination(totalPages) {
  const existing = document.getElementById('pagination-bar');
  if (existing) existing.remove();
  if (totalPages <= 1) return;

  const bar = document.createElement('div');
  bar.id = 'pagination-bar';
  bar.className = 'p-3 border-top d-flex justify-content-between align-items-center flex-wrap gap-2';
  bar.innerHTML = `
    <div class="d-flex align-items-center gap-2">
      <button class="btn btn-sm btn-outline-primary" ${currentPage === 1 ? 'disabled' : ''} 
              onclick="window.changePage(${currentPage - 1})">← Previous</button>
      <span class="text-muted">Page ${currentPage} of ${totalPages}</span>
      <button class="btn btn-sm btn-outline-primary" ${currentPage === totalPages ? 'disabled' : ''} 
              onclick="window.changePage(${currentPage + 1})">Next →</button>
    </div>
    <div class="d-flex align-items-center gap-2">
      <select class="form-select form-select-sm" style="width:auto" 
              onchange="window.changeItemsPerPage(this.value)">
        <option value="10" ${itemsPerPage===10?'selected':''}>10 per page</option>
        <option value="25" ${itemsPerPage===25?'selected':''}>25 per page</option>
        <option value="50" ${itemsPerPage===50?'selected':''}>50 per page</option>
        <option value="100" ${itemsPerPage===100?'selected':''}>100 per page</option>
        <option value="999999" ${itemsPerPage===999999?'selected':''}>Show All</option>
      </select>
      <select class="form-select form-select-sm" style="width:auto"
              onchange="window.changeSortOrder(this.value)">
        <option value="desc" ${sortOrder==='desc'?'selected':''}>Newest First</option>
        <option value="asc" ${sortOrder==='asc'?'selected':''}>Oldest First</option>
      </select>
    </div>
  `;
  
  const tbody = $('transactions-table');
  if (tbody?.parentElement) tbody.parentElement.parentElement?.appendChild(bar);
}

window.changePage = function(page) { currentPage = page; displayTransactions(allTransactions); };
window.changeItemsPerPage = function(v) { itemsPerPage = parseInt(v); currentPage = 1; displayTransactions(allTransactions); };
window.changeSortOrder = async function(o) { sortOrder = o; await loadInitialTransactions(); };

// ============================================
// NEW SALE - WITH USER_ID
// ============================================

async function handleNewSale() {
  if (isSubmitting || !currentUserId) return;

  const customerId = $('sale-customer')?.value;
  const fuelType = $('sale-fuel-type')?.value;
  const liters = parseFloat($('sale-liters')?.value) || 0;
  const unitPrice = parseFloat($('sale-unit-price')?.value) || 0;
  const amount = parseFloat($('sale-amount')?.value) || 0;
  const paymentType = $('sale-payment-type')?.value || 'cash';

  if (!customerId || !fuelType || !amount || !liters) {
    alert('Please fill all required fields');
    return;
  }

  isSubmitting = true;

  try {
    const { error } = await supabase
      .from('transactions')
      .insert([{
        user_id: currentUserId,  // ← TAG WITH USER_ID
        customer_id: parseInt(customerId),
        transaction_type: paymentType === 'cash' ? 'Debit' : 'Credit',
        amount: amount,
        liters: liters,
        unit_price: unitPrice,
        fuel_type: fuelType,
        description: `${fuelType} sale`
      }]);

    if (error) throw error;

    alert('Sale recorded!');
    closeModal('newSaleModal');
    await loadInitialTransactions();
  } catch (error) {
    console.error('Error:', error);
    alert('Error: ' + error.message);
  } finally {
    isSubmitting = false;
  }
}

// ============================================
// VASOOLI - WITH USER_ID
// ============================================

async function handleVasooli() {
  if (isSubmitting || !currentUserId) return;

  const customerId = $('vasooli-customer')?.value;
  const amount = parseFloat($('vasooli-amount')?.value) || 0;
  const fuelCategory = $('vasooli-fuel-category')?.value || '';
  const liters = parseFloat($('vasooli-liters')?.value) || 0;
  const paymentDate = $('vasooli-date')?.value;
  const month = $('vasooli-month')?.value;
  const description = $('vasooli-description')?.value || '';

  if (!customerId || !amount) {
    alert('Please select customer and enter amount');
    return;
  }

  isSubmitting = true;

  try {
    const customer = allCustomers.find(c => c.id === parseInt(customerId));
    if (!customer) throw new Error('Customer not found');

    let fullDescription = fuelCategory ? `${fuelCategory} payment` : 'Payment received';
    if (liters > 0) fullDescription += ` (${liters} L)`;
    if (month) {
      const monthName = new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      fullDescription += ` for ${monthName}`;
    }
    fullDescription += ` from ${customer.name}`;
    if (description) fullDescription += ` - ${description}`;

    const transactionData = {
      user_id: currentUserId,  // ← TAG WITH USER_ID
      customer_id: parseInt(customerId),
      transaction_type: 'Debit',
      amount: amount,
      liters: liters > 0 ? liters : null,
      unit_price: fuelCategory && liters > 0 ? fuelPrices[fuelCategory] : null,
      description: fullDescription,
      payment_month: month || null,
      fuel_type: fuelCategory || null
    };

    if (paymentDate) transactionData.created_at = new Date(paymentDate).toISOString();

    const { error } = await supabase.from('transactions').insert([transactionData]);
    if (error) throw error;

    alert('Payment recorded!');
    closeModal('vasooliModal');
    await loadInitialTransactions();
  } catch (error) {
    console.error('Error:', error);
    alert('Error: ' + error.message);
  } finally {
    isSubmitting = false;
  }
}

// ============================================
// EXPENSE - WITH USER_ID
// ============================================

async function handleExpense() {
  if (isSubmitting || !currentUserId) return;

  const amount = parseFloat($('expense-amount')?.value) || 0;
  const description = $('expense-description')?.value;
  const expenseType = $('expense-type')?.value;
  const expenseAccount = $('expense-account')?.value;

  if (!amount || !description) {
    alert('Please fill all fields');
    return;
  }

  isSubmitting = true;

  try {
    // Find Owner for THIS user only
    let customerId = null;
    const owner = allCustomers.find(c => c.category === 'Owner');
    
    if (owner) {
      customerId = owner.id;
    } else {
      // Create Owner for this user
      const { data: newOwner, error: createError } = await supabase
        .from('customers')
        .insert([{ user_id: currentUserId, sr_no: 0, name: 'Owner', category: 'Owner', balance: 0 }])
        .select()
        .single();
      
      if (createError) throw createError;
      customerId = newOwner.id;
      await loadCustomers();
    }

    const fullDescription = expenseType ? 
      `${expenseType}: ${description} (From: ${expenseAccount || 'N/A'})` :
      description;

    const { error } = await supabase
      .from('transactions')
      .insert([{
        user_id: currentUserId,  // ← TAG WITH USER_ID
        customer_id: customerId,
        transaction_type: 'Expense',
        amount: amount,
        description: fullDescription,
        expense_type: expenseType,
        expense_account: expenseAccount
      }]);

    if (error) throw error;

    alert('Expense recorded!');
    closeModal('expenseModal');
    await loadInitialTransactions();
  } catch (error) {
    console.error('Error:', error);
    alert('Error: ' + error.message);
  } finally {
    isSubmitting = false;
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
    await supabase.from('transactions').delete().eq('id', id).eq('user_id', currentUserId);
    await loadInitialTransactions();
  } catch (error) {
    alert('Error: ' + error.message);
  }
};

// ============================================
// AUTO-CALCULATE
// ============================================

window.calculateVasooliAmount = function() {
  const fuelCategory = $('vasooli-fuel-category')?.value;
  const liters = parseFloat($('vasooli-liters')?.value) || 0;
  const amountInput = $('vasooli-amount');
  if (fuelCategory && liters > 0 && amountInput) {
    amountInput.value = (liters * (fuelPrices[fuelCategory] || 285)).toFixed(2);
  }
};

function setupAutoCalculate() {
  const litersInput = $('sale-liters');
  const priceInput = $('sale-unit-price');
  const amountInput = $('sale-amount');
  const fuelSelect = $('sale-fuel-type');

  if (fuelSelect) {
    fuelSelect.addEventListener('change', () => {
      if (priceInput) priceInput.value = fuelPrices[fuelSelect.value] || 285;
      calculateSaleAmount();
    });
  }
  if (litersInput) litersInput.addEventListener('input', calculateSaleAmount);
  if (priceInput) priceInput.addEventListener('input', calculateSaleAmount);

  function calculateSaleAmount() {
    const l = parseFloat(litersInput?.value) || 0;
    const p = parseFloat(priceInput?.value) || 0;
    if (amountInput && l > 0 && p > 0) amountInput.value = (l * p).toFixed(2);
  }

  const vasooliLiters = $('vasooli-liters');
  const vasooliFuel = $('vasooli-fuel-category');
  if (vasooliLiters) vasooliLiters.addEventListener('input', window.calculateVasooliAmount);
  if (vasooliFuel) vasooliFuel.addEventListener('change', window.calculateVasooliAmount);
}

// ============================================
// FORM HANDLERS
// ============================================

function setupFormHandlers() {
  const saleForm = $('newSaleForm');
  if (saleForm) {
    saleForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!isSubmitting) handleNewSale();
    });
  }

  const vasooliForm = $('vasooliForm');
  if (vasooliForm) {
    vasooliForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!isSubmitting) handleVasooli();
    });
  }

  const expenseForm = $('expenseForm');
  if (expenseForm) {
    expenseForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!isSubmitting) handleExpense();
    });
  }
}

// ============================================
// INITIALIZE
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.getAttribute('data-page') === 'transactions') {
    console.log('🚀 Starting transactions...');
    
    const user = await getCurrentUser();
    if (!user) return;
    
    await loadFuelPrices();
    await loadCustomers();
    await loadInitialTransactions();
    
    setupAutoCalculate();
    setupFormHandlers();
    
    if ($('vasooli-date')) {
      $('vasooli-date').value = new Date().toISOString().split('T')[0];
    }
    
    console.log('✅ Ready!');
  }
});

window.loadInitialTransactions = loadInitialTransactions;

})();


// TRANSACTIONS - WITH PAGINATION & FUEL PRICE IN VASOOLI
// (function() {
// 'use strict';

// const supabase = window.supabaseClient;
// let allTransactions = [];
// let allCustomers = [];
// let isSubmitting = false;
// let fuelPrices = { Petrol: 285, Diesel: 305 };

// // Pagination state
// let currentPage = 1;
// let itemsPerPage = 10;
// let sortOrder = 'desc'; // desc = newest first, asc = oldest first

// function $(id) { return document.getElementById(id); }

// function formatNumber(num) {
//   return Number(num || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// }

// // ============================================
// // LOAD PRICES FROM SETTINGS
// // ============================================

// async function loadFuelPrices() {
//   console.log('Loading fuel prices from settings...');
  
//   try {
//     const { data, error } = await supabase
//       .from('settings')
//       .select('petrol_price, diesel_price')
//       .maybeSingle();

//     if (error || !data) {
//       console.log('No settings found, using defaults');
//       return;
//     }

//     fuelPrices = {
//       Petrol: parseFloat(data.petrol_price) || 285,
//       Diesel: parseFloat(data.diesel_price) || 305
//     };
//     console.log('✅ Loaded prices:', fuelPrices);
//   } catch (error) {
//     console.log('Using default prices');
//   }
// }

// // ============================================
// // LOAD DATA
// // ============================================

// async function loadInitialTransactions() {
//   console.log('Loading transactions...');
  
//   try {
//     const { data, error } = await supabase
//       .from('transactions')
//       .select('*, customers!inner(name, sr_no)')
//       .order('created_at', { ascending: sortOrder === 'asc' })
//       .limit(1000); // Load more for pagination

//     if (error) throw error;

//     allTransactions = data || [];
//     console.log('✅ Loaded:', allTransactions.length);
    
//     displayTransactions(allTransactions);
//     updateSummaryCards(allTransactions);
//   } catch (error) {
//     console.error('❌ Error:', error);
//   }
// }

// async function loadCustomers() {
//   console.log('Loading customers...');
  
//   try {
//     const { data, error } = await supabase
//       .from('customers')
//       .select('*')
//       .order('sr_no');

//     if (error) throw error;

//     allCustomers = data || [];
//     console.log('✅ Customers:', allCustomers.length);
    
//     populateCustomerDropdowns();
//   } catch (error) {
//     console.error('❌ Error:', error);
//   }
// }

// function populateCustomerDropdowns() {
//   const saleSelect = $('sale-customer');
//   const vasooliSelect = $('vasooli-customer');

//   if (saleSelect) {
//     let html = '<option value="">Select Customer</option>';
//     allCustomers.forEach(c => {
//       html += `<option value="${c.id}">${c.sr_no} - ${c.name}</option>`;
//     });
//     saleSelect.innerHTML = html;
//   }

//   if (vasooliSelect) {
//     let html = '<option value="">Select Customer</option>';
//     allCustomers.forEach(c => {
//       if (c.category !== 'Owner') {
//         html += `<option value="${c.id}">${c.sr_no} - ${c.name} (Balance: Rs. ${formatNumber(c.balance || 0)})</option>`;
//       }
//     });
//     vasooliSelect.innerHTML = html;
//   }
// }

// // ============================================
// // PAGINATION
// // ============================================

// function displayTransactions(transactions) {
//   const tbody = $('transactions-table');
//   if (!tbody) return;

//   if (transactions.length === 0) {
//     tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4">No transactions found</td></tr>';
//     updatePaginationInfo(0);
//     return;
//   }

//   // Calculate pagination
//   const totalItems = transactions.length;
//   const totalPages = Math.ceil(totalItems / itemsPerPage);
//   const start = (currentPage - 1) * itemsPerPage;
//   const end = start + itemsPerPage;
//   const pageItems = transactions.slice(start, end);

//   // Display rows
//   tbody.innerHTML = pageItems.map(t => {
//     const date = new Date(t.created_at);
    
//     let badgeClass = '';
//     if (t.transaction_type === 'Credit') {
//       badgeClass = 'bg-success text-white';
//     } else if (t.transaction_type === 'Debit') {
//       badgeClass = 'bg-primary text-white';
//     } else {
//       badgeClass = 'bg-warning text-dark';
//     }
    
//     return `<tr>
//       <td>${date.toLocaleDateString('en-PK')}</td>
//       <td>${t.customers?.name || 'N/A'} (${t.customers?.sr_no || '-'})</td>
//       <td><span class="badge ${badgeClass}">${t.transaction_type}</span></td>
//       <td>${t.fuel_type || '-'}</td>
//       <td>${t.liters > 0 ? formatNumber(t.liters) + ' L' : '-'}</td>
//       <td>${t.unit_price ? 'Rs. ' + formatNumber(t.unit_price) : '-'}</td>
//       <td><strong>Rs. ${formatNumber(t.amount)}</strong></td>
//       <td>${t.description || '-'}</td>
//       <td><button class="btn btn-sm btn-danger" onclick="window.deleteTransaction(${t.id})">×</button></td>
//     </tr>`;
//   }).join('');

//   updatePaginationInfo(totalItems);
//   renderPaginationControls(totalPages);
// }

// function updatePaginationInfo(totalItems) {
//   const badge = $('transaction-count');
//   if (badge) {
//     const start = (currentPage - 1) * itemsPerPage + 1;
//     const end = Math.min(currentPage * itemsPerPage, totalItems);
//     badge.textContent = totalItems > 0 ? 
//       `Showing ${start}-${end} of ${totalItems} transactions` : 
//       '0 transactions';
//   }
// }

// function renderPaginationControls(totalPages) {
//   const container = document.querySelector('.card-body.p-0');
//   if (!container) return;

//   // Remove existing pagination
//   const existing = container.querySelector('.pagination-controls');
//   if (existing) existing.remove();

//   if (totalPages <= 1) return;

//   const paginationHTML = `
//     <div class="pagination-controls p-3 border-top d-flex justify-content-between align-items-center">
//       <div>
//         <button class="btn btn-sm btn-outline-primary" ${currentPage === 1 ? 'disabled' : ''} 
//                 onclick="window.changePage(${currentPage - 1})">
//           <i class="bi bi-chevron-left"></i> Previous
//         </button>
//         <span class="mx-3">Page ${currentPage} of ${totalPages}</span>
//         <button class="btn btn-sm btn-outline-primary" ${currentPage === totalPages ? 'disabled' : ''} 
//                 onclick="window.changePage(${currentPage + 1})">
//           Next <i class="bi bi-chevron-right"></i>
//         </button>
//       </div>
//       <div>
//         <select class="form-select form-select-sm d-inline-block w-auto" 
//                 onchange="window.changeItemsPerPage(this.value)">
//           <option value="10" ${itemsPerPage === 10 ? 'selected' : ''}>10 per page</option>
//           <option value="25" ${itemsPerPage === 25 ? 'selected' : ''}>25 per page</option>
//           <option value="50" ${itemsPerPage === 50 ? 'selected' : ''}>50 per page</option>
//           <option value="100" ${itemsPerPage === 100 ? 'selected' : ''}>100 per page</option>
//           <option value="999999" ${itemsPerPage === 999999 ? 'selected' : ''}>Show All</option>
//         </select>
//         <select class="form-select form-select-sm d-inline-block w-auto ms-2" 
//                 onchange="window.changeSortOrder(this.value)">
//           <option value="desc" ${sortOrder === 'desc' ? 'selected' : ''}>Newest First</option>
//           <option value="asc" ${sortOrder === 'asc' ? 'selected' : ''}>Oldest First</option>
//         </select>
//       </div>
//     </div>
//   `;

//   container.insertAdjacentHTML('beforeend', paginationHTML);
// }

// window.changePage = function(page) {
//   currentPage = page;
//   displayTransactions(allTransactions);
// };

// window.changeItemsPerPage = function(value) {
//   itemsPerPage = parseInt(value);
//   currentPage = 1;
//   displayTransactions(allTransactions);
// };

// window.changeSortOrder = async function(order) {
//   sortOrder = order;
//   await loadInitialTransactions();
// };

// // ============================================
// // UPDATE SUMMARY
// // ============================================

// function updateSummaryCards(transactions) {
//   let credit = 0, debit = 0, expense = 0;
//   let creditCount = 0, debitCount = 0, expenseCount = 0;

//   transactions.forEach(t => {
//     const amt = parseFloat(t.amount) || 0;
//     if (t.transaction_type === 'Credit') { credit += amt; creditCount++; }
//     else if (t.transaction_type === 'Debit') { debit += amt; debitCount++; }
//     else if (t.transaction_type === 'Expense') { expense += amt; expenseCount++; }
//   });

//   if ($('total-credit')) $('total-credit').textContent = 'Rs. ' + formatNumber(credit);
//   if ($('credit-count')) $('credit-count').textContent = creditCount + ' transactions';
//   if ($('total-debit')) $('total-debit').textContent = 'Rs. ' + formatNumber(debit);
//   if ($('debit-count')) $('debit-count').textContent = debitCount + ' transactions';
//   if ($('total-expense')) $('total-expense').textContent = 'Rs. ' + formatNumber(expense);
//   if ($('expense-count')) $('expense-count').textContent = expenseCount + ' transactions';
//   if ($('net-balance')) $('net-balance').textContent = 'Rs. ' + formatNumber(credit - expense);

//   console.log('✅ Summary updated');
// }

// // ============================================
// // NEW SALE
// // ============================================

// async function handleNewSale() {
//   if (isSubmitting) return;

//   const customerId = $('sale-customer')?.value;
//   const fuelType = $('sale-fuel-type')?.value;
//   const liters = parseFloat($('sale-liters')?.value) || 0;
//   const unitPrice = parseFloat($('sale-unit-price')?.value) || 0;
//   const amount = parseFloat($('sale-amount')?.value) || 0;
//   const paymentType = $('sale-payment-type')?.value || 'cash';

//   if (!customerId || !fuelType || !amount || !liters) {
//     alert('Please fill all required fields');
//     return;
//   }

//   isSubmitting = true;

//   try {
//     const { error } = await supabase
//       .from('transactions')
//       .insert([{
//         customer_id: parseInt(customerId),
//         transaction_type: paymentType === 'cash' ? 'Debit' : 'Credit',
//         amount: amount,
//         liters: liters,
//         unit_price: unitPrice,
//         fuel_type: fuelType,
//         description: `${fuelType} sale`
//       }]);

//     if (error) throw error;

//     alert('Sale recorded!');
//     closeModal('newSaleModal');
//     await loadInitialTransactions();
//   } catch (error) {
//     console.error('Error:', error);
//     alert('Error: ' + error.message);
//   } finally {
//     isSubmitting = false;
//   }
// }

// // ============================================
// // VASOOLI WITH FUEL PRICE CALCULATION
// // ============================================

// // Calculate vasooli amount from liters
// window.calculateVasooliAmount = function() {
//   const fuelCategory = $('vasooli-fuel-category')?.value;
//   const liters = parseFloat($('vasooli-liters')?.value) || 0;
//   const amountInput = $('vasooli-amount');

//   if (fuelCategory && liters > 0 && amountInput) {
//     const price = fuelPrices[fuelCategory] || 285;
//     const amount = liters * price;
//     amountInput.value = amount.toFixed(2);
//     console.log('Calculated:', liters, 'L x Rs.', price, '= Rs.', amount);
//   }
// };

// async function handleVasooli() {
//   if (isSubmitting) return;

//   const customerId = $('vasooli-customer')?.value;
//   const amount = parseFloat($('vasooli-amount')?.value) || 0;
//   const fuelCategory = $('vasooli-fuel-category')?.value || '';
//   const liters = parseFloat($('vasooli-liters')?.value) || 0;
//   const paymentDate = $('vasooli-date')?.value;
//   const month = $('vasooli-month')?.value;
//   const description = $('vasooli-description')?.value || '';

//   if (!customerId || !amount) {
//     alert('Please select customer and enter amount');
//     return;
//   }

//   isSubmitting = true;

//   try {
//     const customer = allCustomers.find(c => c.id === parseInt(customerId));
//     if (!customer) throw new Error('Customer not found');

//     const customerName = customer.name || 'Customer';

//     let fullDescription = '';
//     if (fuelCategory) {
//       fullDescription = `${fuelCategory} payment`;
//       if (liters > 0) {
//         fullDescription += ` (${liters} L)`;
//       }
//     } else {
//       fullDescription = 'Payment received';
//     }
    
//     if (month) {
//       const date = new Date(month + '-01');
//       const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
//       fullDescription += ` for ${monthName}`;
//     }
    
//     fullDescription += ` from ${customerName}`;
    
//     if (description) {
//       fullDescription += ` - ${description}`;
//     }

//     const transactionData = {
//       customer_id: parseInt(customerId),
//       transaction_type: 'Debit',
//       amount: amount,
//       liters: liters > 0 ? liters : null,
//       unit_price: fuelCategory && liters > 0 ? fuelPrices[fuelCategory] : null,
//       description: fullDescription,
//       payment_month: month || null,
//       fuel_type: fuelCategory || null
//     };

//     if (paymentDate) {
//       transactionData.created_at = new Date(paymentDate).toISOString();
//     }

//     const { error } = await supabase
//       .from('transactions')
//       .insert([transactionData]);

//     if (error) throw error;

//     alert('Payment recorded!');
//     closeModal('vasooliModal');
//     await loadInitialTransactions();
//   } catch (error) {
//     console.error('Error:', error);
//     alert('Error: ' + error.message);
//   } finally {
//     isSubmitting = false;
//   }
// }

// // ============================================
// // EXPENSE
// // ============================================

// async function handleExpense() {
//   if (isSubmitting) return;

//   const amount = parseFloat($('expense-amount')?.value) || 0;
//   const description = $('expense-description')?.value;
//   const expenseType = $('expense-type')?.value;
//   const expenseAccount = $('expense-account')?.value;

//   if (!amount || !description) {
//     alert('Please fill all fields');
//     return;
//   }

//   isSubmitting = true;

//   try {
//     let customerId = null;
    
//     const owner = allCustomers.find(c => c.category === 'Owner');
//     if (owner) {
//       customerId = owner.id;
//     } else if (allCustomers.length > 0) {
//       customerId = allCustomers[0].id;
//     } else {
//       const { data: newOwner, error: createError } = await supabase
//         .from('customers')
//         .insert([{ sr_no: 0, name: 'Owner', category: 'Owner', balance: 0 }])
//         .select()
//         .single();
      
//       if (createError) throw createError;
//       customerId = newOwner.id;
//       await loadCustomers();
//     }

//     const fullDescription = expenseType ? 
//       `${expenseType}: ${description} (From: ${expenseAccount || 'N/A'})` :
//       description;

//     const { error } = await supabase
//       .from('transactions')
//       .insert([{
//         customer_id: customerId,
//         transaction_type: 'Expense',
//         amount: amount,
//         description: fullDescription,
//         expense_type: expenseType,
//         expense_account: expenseAccount
//       }]);

//     if (error) throw error;

//     alert('Expense recorded!');
//     closeModal('expenseModal');
//     await loadInitialTransactions();
//   } catch (error) {
//     console.error('Error:', error);
//     alert('Error: ' + error.message);
//   } finally {
//     isSubmitting = false;
//   }
// }

// // ============================================
// // HELPERS
// // ============================================

// function closeModal(modalId) {
//   const modal = bootstrap.Modal.getInstance($(modalId));
//   if (modal) modal.hide();
//   const form = document.querySelector(`#${modalId} form`);
//   if (form) form.reset();
// }

// window.deleteTransaction = async function(id) {
//   if (!confirm('Delete?')) return;
//   try {
//     await supabase.from('transactions').delete().eq('id', id);
//     alert('Deleted!');
//     await loadInitialTransactions();
//   } catch (error) {
//     alert('Error: ' + error.message);
//   }
// };

// // ============================================
// // AUTO-CALCULATE
// // ============================================

// function setupAutoCalculate() {
//   const litersInput = $('sale-liters');
//   const priceInput = $('sale-unit-price');
//   const amountInput = $('sale-amount');
//   const fuelSelect = $('sale-fuel-type');

//   if (fuelSelect) {
//     fuelSelect.addEventListener('change', () => {
//       const price = fuelPrices[fuelSelect.value] || 285;
//       if (priceInput) priceInput.value = price;
//       calculateAmount();
//     });
//   }

//   if (litersInput) litersInput.addEventListener('input', calculateAmount);
//   if (priceInput) priceInput.addEventListener('input', calculateAmount);

//   function calculateAmount() {
//     const liters = parseFloat(litersInput?.value) || 0;
//     const price = parseFloat(priceInput?.value) || 0;
//     if (amountInput && liters > 0 && price > 0) {
//       amountInput.value = (liters * price).toFixed(2);
//     }
//   }

//   // Setup vasooli calculation
//   const vasooliLiters = $('vasooli-liters');
//   const vasooliFuel = $('vasooli-fuel-category');
  
//   if (vasooliLiters) vasooliLiters.addEventListener('input', window.calculateVasooliAmount);
//   if (vasooliFuel) vasooliFuel.addEventListener('change', window.calculateVasooliAmount);
// }

// // ============================================
// // FORM HANDLERS
// // ============================================

// function setupFormHandlers() {
//   const saleForm = $('newSaleForm');
//   if (saleForm) {
//     saleForm.addEventListener('submit', (e) => {
//       e.preventDefault();
//       if (!isSubmitting) handleNewSale();
//     });
//   }

//   const vasooliForm = $('vasooliForm');
//   if (vasooliForm) {
//     vasooliForm.addEventListener('submit', (e) => {
//       e.preventDefault();
//       if (!isSubmitting) handleVasooli();
//     });
//   }

//   const expenseForm = $('expenseForm');
//   if (expenseForm) {
//     expenseForm.addEventListener('submit', (e) => {
//       e.preventDefault();
//       if (!isSubmitting) handleExpense();
//     });
//   }
// }

// // ============================================
// // INITIALIZE
// // ============================================

// document.addEventListener('DOMContentLoaded', async () => {
//   if (document.body.getAttribute('data-page') === 'transactions') {
//     console.log('🚀 Starting transactions...');
    
//     await loadFuelPrices();
//     await loadCustomers();
//     await loadInitialTransactions();
    
//     setupAutoCalculate();
//     setupFormHandlers();
    
//     if ($('vasooli-date')) {
//       $('vasooli-date').value = new Date().toISOString().split('T')[0];
//     }
    
//     console.log('✅ Ready! Prices:', fuelPrices);
//   }
// });

// window.loadInitialTransactions = loadInitialTransactions;

// })();