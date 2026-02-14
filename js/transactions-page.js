// Transactions Page Enhancement
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
  let totalCredit = 0, creditCount = 0;
  let totalDebit = 0, debitCount = 0;
  let totalExpense = 0, expenseCount = 0;

  transactions.forEach(t => {
    if (t.transaction_type === 'Credit') {
      totalCredit += t.amount;
      creditCount++;
    } else if (t.transaction_type === 'Debit') {
      totalDebit += t.amount;
      debitCount++;
    } else if (t.transaction_type === 'Expense') {
      totalExpense += t.amount;
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
}

// Apply Filters
window.applyFilters = async function() {
  const type = $('filter-type')?.value || '';
  const dateFrom = $('filter-date-from')?.value;
  const dateTo = $('filter-date-to')?.value;

  try {
    let query = supabase
      .from('transactions')
      .select(`
        *,
        customer:customers(name, sr_no),
        tank:tanks(fuel_type, name)
      `)
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
  
  // Reload all transactions
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
    const typeClass = t.transaction_type === 'Credit' ? 'badge-success' :
      t.transaction_type === 'Debit' ? 'badge-primary' : 'badge-warning';

    html += `
      <tr>
        <td>${date.toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}</td>
        <td>${t.customer?.name || 'N/A'} ${t.customer?.sr_no ? '(' + t.customer.sr_no + ')' : ''}</td>
        <td><span class="badge ${typeClass}">${t.transaction_type}</span></td>
        <td>${t.tank?.fuel_type || t.tank?.name || '-'}</td>
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
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        customer:customers(name, sr_no),
        tank:tanks(fuel_type, name)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    allTransactions = data || [];
    displayTransactions(allTransactions);
    updateSummaryCards(allTransactions);
  } catch (error) {
    console.error('Error loading transactions:', error);
  }
}

// Delete Transaction (using global function)
window.deleteTransaction = window.deleteTransaction || async function(id) {
  if (!confirm('Are you sure you want to delete this transaction?')) return;
  
  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Show toast if available
    if (window.showToast) {
      window.showToast('Transaction deleted successfully!', 'success');
    }

    // Reload transactions
    if ($('filter-type')?.value || $('filter-date-from')?.value) {
      applyFilters();
    } else {
      loadInitialTransactions();
    }
  } catch (error) {
    console.error('Error deleting transaction:', error);
    if (window.showToast) {
      window.showToast('Error deleting transaction', 'error');
    }
  }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  if (document.body.getAttribute('data-page') === 'transactions') {
    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    if ($('filter-date-from')) {
      $('filter-date-from').value = thirtyDaysAgo.toISOString().split('T')[0];
    }
    if ($('filter-date-to')) {
      $('filter-date-to').value = today.toISOString().split('T')[0];
    }

    // Load initial data
    loadInitialTransactions();

    console.log('✅ Transactions page enhancements initialized');
  }
});

})();