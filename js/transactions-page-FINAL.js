// Transactions Page - FINAL WORKING VERSION
(function() {
'use strict';

const supabase = window.supabaseClient;
let allTransactions = [];

function $(id) { return document.getElementById(id); }

function formatNumber(num) {
  return Number(num || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Update Summary Cards
function updateSummaryCards(transactions) {
  console.log('Updating summary with', transactions.length, 'transactions');
  
  let totalCredit = 0, creditCount = 0;
  let totalDebit = 0, debitCount = 0;
  let totalExpense = 0, expenseCount = 0;

  transactions.forEach(t => {
    const amount = parseFloat(t.amount) || 0;
    if (t.transaction_type === 'Credit') {
      totalCredit += amount;
      creditCount++;
    } else if (t.transaction_type === 'Debit') {
      totalDebit += amount;
      debitCount++;
    } else if (t.transaction_type === 'Expense') {
      totalExpense += amount;
      expenseCount++;
    }
  });

  const netBalance = totalCredit - totalExpense;

  if ($('total-credit')) $('total-credit').textContent = 'Rs. ' + formatNumber(totalCredit);
  if ($('credit-count')) $('credit-count').textContent = creditCount + ' transactions';
  
  if ($('total-debit')) $('total-debit').textContent = 'Rs. ' + formatNumber(totalDebit);
  if ($('debit-count')) $('debit-count').textContent = debitCount + ' transactions';
  
  if ($('total-expense')) $('total-expense').textContent = 'Rs. ' + formatNumber(totalExpense);
  if ($('expense-count')) $('expense-count').textContent = expenseCount + ' transactions';
  
  if ($('net-balance')) $('net-balance').textContent = 'Rs. ' + formatNumber(netBalance);
  if ($('transaction-count')) $('transaction-count').textContent = transactions.length + ' transactions';

  console.log('✅ Summary updated:', { totalCredit, totalDebit, totalExpense, netBalance });
}

// Apply Filters
window.applyFilters = async function() {
  const type = $('filter-type')?.value || '';
  const dateFrom = $('filter-date-from')?.value;
  const dateTo = $('filter-date-to')?.value;

  try {
    let query = supabase
      .from('transactions')
      .select('*, customers!inner(name, sr_no)')
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('transaction_type', type);
    }

    if (dateFrom) {
      query = query.gte('created_at', new Date(dateFrom).toISOString());
    }

    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      query = query.lte('created_at', endDate.toISOString());
    }

    const { data, error } = await query.limit(200);

    if (error) throw error;

    allTransactions = data || [];
    displayTransactions(allTransactions);
    updateSummaryCards(allTransactions);
  } catch (error) {
    console.error('Error filtering transactions:', error);
  }
};

// Clear Filters
window.clearTransactionFilters = function() {
  if ($('filter-type')) $('filter-type').value = '';
  if ($('filter-date-from')) $('filter-date-from').value = '';
  if ($('filter-date-to')) $('filter-date-to').value = '';
  
  loadInitialTransactions();
};

// Display Transactions
function displayTransactions(transactions) {
  const tbody = $('transactions-table');
  if (!tbody) return;

  if (transactions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">No transactions found</td></tr>';
    return;
  }

  let html = '';
  transactions.forEach(t => {
    const date = new Date(t.created_at);
    const typeClass = t.transaction_type === 'Credit' ? 'bg-success' :
      t.transaction_type === 'Debit' ? 'bg-primary' : 'bg-warning';

    // Get fuel type from description or leave blank
    const fuelType = t.description?.includes('Petrol') ? 'Petrol' : 
                     t.description?.includes('Diesel') ? 'Diesel' : '-';

    html += `
      <tr>
        <td>${date.toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}</td>
        <td>${t.customers?.name || 'N/A'} ${t.customers?.sr_no ? '(' + t.customers.sr_no + ')' : ''}</td>
        <td><span class="badge ${typeClass}">${t.transaction_type}</span></td>
        <td>${fuelType}</td>
        <td>${t.liters > 0 ? formatNumber(t.liters) + ' L' : '-'}</td>
        <td>${t.unit_price ? 'Rs. ' + formatNumber(t.unit_price) : '-'}</td>
        <td><strong>Rs. ${formatNumber(t.amount)}</strong></td>
        <td><small>${t.description || '-'}</small></td>
        <td>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteTransaction(${t.id})">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

// Load Initial Transactions
async function loadInitialTransactions() {
  console.log('Loading initial transactions...');
  
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, customers!inner(name, sr_no)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    console.log('Loaded transactions:', data?.length || 0);

    allTransactions = data || [];
    displayTransactions(allTransactions);
    updateSummaryCards(allTransactions);
  } catch (error) {
    console.error('❌ Error loading transactions:', error);
    const tbody = $('transactions-table');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-4">
        Error: ${error.message}
      </td></tr>`;
    }
  }
}

// Load Customers for Modals
async function loadCustomersForModals() {
  console.log('Loading customers for modals...');
  
  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, sr_no, name, category')
      .order('sr_no');

    if (error) throw error;

    console.log('Loaded customers:', customers?.length || 0);

    // Populate dropdowns
    if ($('sale-customer')) {
      let html = '<option value="">Select Customer</option>';
      customers.forEach(c => {
        html += `<option value="${c.id}">${c.sr_no} - ${c.name}</option>`;
      });
      $('sale-customer').innerHTML = html;
    }

    if ($('vasooli-customer')) {
      let html = '<option value="">Select Customer</option>';
      customers.forEach(c => {
        if (c.category !== 'Owner') {
          html += `<option value="${c.id}">${c.sr_no} - ${c.name}</option>`;
        }
      });
      $('vasooli-customer').innerHTML = html;
    }

  } catch (error) {
    console.error('❌ Error loading customers:', error);
    if ($('sale-customer')) {
      $('sale-customer').innerHTML = '<option value="">Error loading</option>';
    }
  }
}

// Delete Transaction
window.deleteTransaction = async function(id) {
  if (!confirm('Are you sure?')) return;
  
  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    alert('Deleted successfully!');
    loadInitialTransactions();
  } catch (error) {
    console.error('Error deleting:', error);
    alert('Error: ' + error.message);
  }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  if (document.body.getAttribute('data-page') === 'transactions') {
    console.log('✅ Initializing transactions page...');
    
    // Set default dates
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    if ($('filter-date-from')) {
      $('filter-date-from').value = thirtyDaysAgo.toISOString().split('T')[0];
    }
    if ($('filter-date-to')) {
      $('filter-date-to').value = today.toISOString().split('T')[0];
    }

    // Load data
    loadInitialTransactions();
    loadCustomersForModals();
  }
});

window.loadInitialTransactions = loadInitialTransactions;

})();