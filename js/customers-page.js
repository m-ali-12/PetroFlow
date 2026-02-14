// Customers Page Management
(function() {
'use strict';

const supabase = window.supabaseClient;
let allCustomers = [];

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

// Load Customers
async function loadCustomers() {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('sr_no');

    if (error) throw error;

    allCustomers = data || [];
    displayCustomers(allCustomers);
    updateSummaryCards(allCustomers);
  } catch (error) {
    console.error('Error loading customers:', error);
    showToast('Error loading customers', 'error');
  }
}

// Display Customers in Table
function displayCustomers(customers) {
  const tbody = $('customers-table');
  if (!tbody) return;

  if (customers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No customers found</td></tr>';
    return;
  }

  let html = '';
  customers.forEach(c => {
    const balanceClass = c.balance > 0 ? 'text-danger' : c.balance < 0 ? 'text-success' : 'text-muted';
    const balanceText = c.balance > 0 ? `Udhaar: Rs. ${formatNumber(c.balance)}` :
      c.balance < 0 ? `Advance: Rs. ${formatNumber(Math.abs(c.balance))}` : 'Zero';

    const categoryColors = {
      'Member': 'primary',
      'Company': 'success',
      'Government': 'info',
      'VIP': 'warning',
      'Owner': 'danger'
    };
    const categoryColor = categoryColors[c.category] || 'secondary';

    html += `
      <tr>
        <td><strong>${c.sr_no}</strong></td>
        <td>${c.name}</td>
        <td>${c.phone || '-'}</td>
        <td><span class="badge bg-${categoryColor}">${c.category}</span></td>
        <td class="${balanceClass}"><strong>${balanceText}</strong></td>
        <td>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" onclick="viewCustomerDetails(${c.id})" title="View Details">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-outline-info" onclick="printCustomerBill(${c.id})" title="Print Monthly Bill">
              <i class="bi bi-printer"></i>
            </button>
            <button class="btn btn-outline-danger" onclick="deleteCustomer(${c.id})" title="Delete">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

// Update Summary Cards
function updateSummaryCards(customers) {
  let totalCustomers = customers.length;
  let totalUdhaar = 0;
  let totalAdvance = 0;
  let totalCompanies = 0;

  customers.forEach(c => {
    if (c.balance > 0) totalUdhaar += c.balance;
    if (c.balance < 0) totalAdvance += Math.abs(c.balance);
    if (c.category === 'Company' || c.category === 'Government') totalCompanies++;
  });

  if ($('total-customers')) $('total-customers').textContent = totalCustomers;
  if ($('total-udhaar')) $('total-udhaar').textContent = 'Rs. ' + formatNumber(totalUdhaar);
  if ($('total-advance')) $('total-advance').textContent = 'Rs. ' + formatNumber(totalAdvance);
  if ($('total-companies')) $('total-companies').textContent = totalCompanies;
}

// Add Customer
window.addCustomer = async function() {
  const srNo = parseInt($('new-sr-no').value);
  const name = $('new-name').value;
  const phone = $('new-phone').value;
  const category = $('new-category').value;
  const balance = parseFloat($('new-balance').value) || 0;

  if (!srNo || !name) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  try {
    const { error } = await supabase
      .from('customers')
      .insert([{
        sr_no: srNo,
        name: name,
        phone: phone || null,
        category: category,
        balance: balance
      }]);

    if (error) throw error;

    showToast('Customer added successfully!', 'success');
    
    const modal = bootstrap.Modal.getInstance($('addCustomerModal'));
    if (modal) modal.hide();
    $('addCustomerForm').reset();

    loadCustomers();
  } catch (error) {
    console.error('Error adding customer:', error);
    if (error.code === '23505') {
      showToast('SR No already exists! Please use a different number.', 'error');
    } else {
      showToast('Error adding customer: ' + error.message, 'error');
    }
  }
};

// View Customer Details
window.viewCustomerDetails = function(customerId) {
  window.location.href = `customer-details.html?id=${customerId}`;
};

// Print Customer Bill
window.printCustomerBill = function(customerId) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  
  if (window.printMonthlyBill) {
    window.printMonthlyBill(customerId, year, month);
  } else {
    showToast('Please include monthly-ledger.js', 'error');
  }
};

// Delete Customer
window.deleteCustomer = async function(customerId) {
  const customer = allCustomers.find(c => c.id === customerId);
  
  if (!customer) return;

  if (customer.balance !== 0) {
    if (!confirm(`Customer has balance of Rs. ${formatNumber(Math.abs(customer.balance))}. Are you sure you want to delete?`)) {
      return;
    }
  }

  if (!confirm(`Delete customer "${customer.name}"? This action cannot be undone.`)) {
    return;
  }

  try {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId);

    if (error) throw error;

    showToast('Customer deleted successfully!', 'success');
    loadCustomers();
  } catch (error) {
    console.error('Error deleting customer:', error);
    showToast('Error deleting customer: ' + error.message, 'error');
  }
};

// Search Functionality
function setupSearch() {
  const searchInput = $('search-customer');
  if (!searchInput) return;

  searchInput.addEventListener('input', function() {
    filterCustomers();
  });
}

// Filter Functionality
function setupFilter() {
  const filterSelect = $('filter-category');
  if (!filterSelect) return;

  filterSelect.addEventListener('change', function() {
    filterCustomers();
  });
}

// Filter Customers
function filterCustomers() {
  const searchTerm = $('search-customer')?.value.toLowerCase() || '';
  const categoryFilter = $('filter-category')?.value || '';

  let filtered = allCustomers;

  // Apply search
  if (searchTerm) {
    filtered = filtered.filter(c => {
      return c.name.toLowerCase().includes(searchTerm) ||
             c.sr_no.toString().includes(searchTerm) ||
             (c.phone && c.phone.includes(searchTerm));
    });
  }

  // Apply category filter
  if (categoryFilter) {
    filtered = filtered.filter(c => c.category === categoryFilter);
  }

  displayCustomers(filtered);
}

// Clear Filters
window.clearFilters = function() {
  if ($('search-customer')) $('search-customer').value = '';
  if ($('filter-category')) $('filter-category').value = '';
  displayCustomers(allCustomers);
};

// Initialize Page
document.addEventListener('DOMContentLoaded', () => {
  if (document.body.getAttribute('data-page') === 'customers') {
    loadCustomers();
    setupSearch();
    setupFilter();
    
    console.log('✅ Customers page initialized');
  }
});

})();