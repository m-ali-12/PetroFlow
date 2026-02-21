// =============================================
// CUSTOMERS - COMPLETE FIX
// =============================================
(function() {
'use strict';

let allCustomers = [];
let currentUserId = null;

function $(id) { return document.getElementById(id); }
function fmt(n) {
  return Number(n||0).toLocaleString('en-PK',{minimumFractionDigits:2,maximumFractionDigits:2});
}

function getSupabase() {
  return window.supabaseClient;
}

// ════════════════════════════════════════════
// AUTH (disabled — works without login)
// ════════════════════════════════════════════
async function getUser() {
  try {
    const sb = getSupabase();
    if (sb?.auth?.getUser) {
      const { data, error } = await sb.auth.getUser();
      if (!error && data?.user?.id) {
        currentUserId = data.user.id;
        console.log('✅ User:', data.user.email);
        return data.user;
      }
    }
  } catch (e) { /* auth disabled, continue without user */ }
  console.log('ℹ️ No auth user — loading all data');
  return null; // don't redirect
}

// ════════════════════════════════════════════
// LOAD
// ════════════════════════════════════════════
async function loadCustomers() {
  const sb = getSupabase();
  if (!sb) { console.error('❌ Supabase not ready'); return; }
  console.log('Loading customers...');
  try {
    let query = sb.from('customers').select('*').order('sr_no');
    // Only filter by user_id if auth is enabled and user is logged in
    if (currentUserId) query = query.eq('user_id', currentUserId);
    const { data, error } = await query;
    if (error) throw error;
    allCustomers = data || [];
    console.log('✅ Customers:', allCustomers.length);
    display(allCustomers);
    updateSummary();
  } catch (e) {
    console.error('❌ Load error:', e);
    toast('Error: ' + e.message, 'danger');
  }
}

function display(list) {
  const tbody = $('customers-table');
  if (!tbody) return;
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No customers found</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(c => {
    const balCls = c.balance > 0 ? 'text-danger fw-bold' : 
                   c.balance < 0 ? 'text-success fw-bold' : 'text-muted';
    const balTxt = c.balance > 0 ? `Rs. ${fmt(c.balance)} (Udhaar)` :
                   c.balance < 0 ? `Rs. ${fmt(Math.abs(c.balance))} (Advance)` : 'Rs. 0.00';
    const catCls = c.category === 'Member' ? 'bg-primary' :
                   c.category === 'Company' ? 'bg-info' :
                   c.category === 'Owner' ? 'bg-success' : 'bg-secondary';
    return `<tr>
      <td>${c.sr_no}</td>
      <td>${c.name}</td>
      <td>${c.phone || '-'}</td>
      <td><span class="badge ${catCls}">${c.category || '-'}</span></td>
      <td class="${balCls}">${balTxt}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary" onclick="window.viewLedger(${c.id})">
          <i class="bi bi-eye"></i>
        </button>
        <button class="btn btn-sm btn-outline-warning" onclick="window.editCust(${c.id})">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="window.delCust(${c.id})">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>`;
  }).join('');
}

function updateSummary() {
  let total = allCustomers.length;
  let udhaar = 0, advance = 0, companies = 0;
  allCustomers.forEach(c => {
    if (c.balance > 0) udhaar += c.balance;
    else if (c.balance < 0) advance += Math.abs(c.balance);
    if (c.category === 'Company') companies++;
  });
  const set = (id,v) => { const el=$(id); if(el) el.textContent=v; };
  set('total-customers', total);
  set('total-udhaar', 'Rs. ' + fmt(udhaar));
  set('total-advance', 'Rs. ' + fmt(advance));
  set('total-companies', companies);
  console.log('✅ Summary updated');
}

// ════════════════════════════════════════════
// FILTER
// ════════════════════════════════════════════
function filter() {
  const s = $('search-input')?.value.toLowerCase() || '';
  const c = $('filter-category')?.value || '';
  const filtered = allCustomers.filter(x => {
    const nm = x.name.toLowerCase().includes(s);
    const sr = x.sr_no.toString().includes(s);
    const ct = !c || x.category === c;
    return (nm || sr) && ct;
  });
  display(filtered);
}

function clearFilter() {
  const s = $('search-input'); if (s) s.value = '';
  const c = $('filter-category'); if (c) c.value = '';
  display(allCustomers);
}

// ════════════════════════════════════════════
// ADD CUSTOMER
// ════════════════════════════════════════════
async function addCustomer() {
  const sb = getSupabase();
  if (!sb) { alert('Database not ready'); return; }

  const sr = parseInt($('customer-sr-no')?.value);
  const nm = $('customer-name')?.value?.trim();
  const ph = $('customer-phone')?.value?.trim();
  const ct = $('customer-category')?.value;
  const bl = parseFloat($('customer-balance')?.value) || 0;

  if (!sr || !nm || !ct) {
    alert('Fill SR No, Name, Category'); 
    return;
  }

  // Check duplicate
  if (allCustomers.find(c => c.sr_no === sr)) {
    alert(`SR ${sr} already exists`);
    return;
  }

  try {
    const insertData = { sr_no: sr, name: nm, phone: ph || null, category: ct, balance: bl };
    if (currentUserId) insertData.user_id = currentUserId;

    const { error } = await sb.from('customers').insert([insertData]);
    if (error) throw error;

    console.log('✅ Customer added');
    toast('Customer added successfully!', 'success');
    closeModal('addCustomerModal');
    await loadCustomers();
  } catch (e) {
    console.error('❌ Add error:', e);
    alert('Error adding customer: ' + e.message);
  }
}

// ════════════════════════════════════════════
// EDIT CUSTOMER
// ════════════════════════════════════════════
window.editCust = function(id) {
  const c = allCustomers.find(x => x.id === id);
  if (!c) return;
  $('edit-customer-id').value = c.id;
  $('edit-sr-no').value = c.sr_no;
  $('edit-name').value = c.name;
  $('edit-phone').value = c.phone || '';
  $('edit-category').value = c.category;
  $('edit-balance').value = c.balance;
  new bootstrap.Modal($('editCustomerModal')).show();
};

async function updateCustomer() {
  const sb = getSupabase();
  if (!sb) { alert('Database not ready'); return; }

  const id = parseInt($('edit-customer-id').value);
  const sr = parseInt($('edit-sr-no').value);
  const nm = $('edit-name').value.trim();
  const ph = $('edit-phone').value.trim();
  const ct = $('edit-category').value;
  const bl = parseFloat($('edit-balance').value) || 0;

  if (!sr || !nm || !ct) {
    alert('Fill all required fields');
    return;
  }

  try {
    let query = sb.from('customers')
      .update({ sr_no: sr, name: nm, phone: ph || null, category: ct, balance: bl })
      .eq('id', id);
    if (currentUserId) query = query.eq('user_id', currentUserId);
    const { error } = await query;
    if (error) throw error;

    toast('Customer updated!', 'success');
    closeModal('editCustomerModal');
    await loadCustomers();
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

// ════════════════════════════════════════════
// DELETE
// ════════════════════════════════════════════
window.delCust = async function(id) {
  const sb = getSupabase();
  if (!sb) { alert('Database not ready'); return; }
  const c = allCustomers.find(x => x.id === id);
  if (!c || !confirm(`Delete ${c.name}? This cannot be undone.`)) return;

  try {
    let query = sb.from('customers').delete().eq('id', id);
    if (currentUserId) query = query.eq('user_id', currentUserId);
    const { error } = await query;
    if (error) throw error;

    toast('Customer deleted', 'success');
    await loadCustomers();
  } catch (e) {
    alert('Error: ' + e.message);
  }
};

// ════════════════════════════════════════════
// LEDGER
// ════════════════════════════════════════════
window.viewLedger = function(id) {
  const c = allCustomers.find(x => x.id === id);
  if (!c) return;
  sessionStorage.setItem('selected_customer', JSON.stringify(c));
  window.location.href = 'customer-details.html?id=' + id;
};

// ════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════
function closeModal(id) {
  const el = $(id);
  if (!el) return;
  const m = bootstrap.Modal.getInstance(el);
  if (m) m.hide();
  const f = el.querySelector('form');
  if (f) f.reset();
}

function toast(msg, type = 'info') {
  const el = $('liveToast');
  if (!el) return;
  $('toast-title').textContent = type === 'success' ? 'Success' : 'Info';
  $('toast-message').textContent = msg;
  new bootstrap.Toast(el).show();
}

// ════════════════════════════════════════════
// EVENTS
// ════════════════════════════════════════════
function bind() {
  const addForm = $('addCustomerForm');
  if (addForm) addForm.addEventListener('submit', e => { e.preventDefault(); addCustomer(); });

  const editForm = $('editCustomerForm');
  if (editForm) editForm.addEventListener('submit', e => { e.preventDefault(); updateCustomer(); });

  const srch = $('search-input');
  if (srch) srch.addEventListener('input', filter);

  const cat = $('filter-category');
  if (cat) cat.addEventListener('change', filter);

  const clr = $('clear-filters');
  if (clr) clr.addEventListener('click', clearFilter);
}

// ════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.getAttribute('data-page') !== 'customers') return;

  console.log('🚀 Customers starting...');

  // Wait for supabase to be ready
  await new Promise(resolve => {
    function check() { if (window.supabaseClient) return resolve(); setTimeout(check, 100); }
    check();
  });

  await getUser(); // try auth but don't redirect if fails
  bind();
  await loadCustomers();

  console.log('✅ Customers ready!');
});

window.loadCustomers = loadCustomers;

})();
// Customers Page Management
// (function() {
// 'use strict';

// const supabase = window.supabaseClient;
// let allCustomers = [];

// function $(id) { return document.getElementById(id); }

// function formatNumber(num) {
//   return Number(num || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// }

// function showToast(message, type = 'info') {
//   const toast = $('liveToast');
//   if (!toast) return;

//   const toastTitle = $('toast-title');
//   const toastMessage = $('toast-message');

//   const titles = { success: 'Success', error: 'Error', warning: 'Warning', info: 'Information' };
//   toastTitle.textContent = titles[type] || 'Notification';
//   toastMessage.textContent = message;

//   const bsToast = new bootstrap.Toast(toast);
//   bsToast.show();
// }

// // Load Customers
// async function loadCustomers() {
//   try {
//     const { data, error } = await supabase
//       .from('customers')
//       .select('*')
//       .order('sr_no');

//     if (error) throw error;

//     allCustomers = data || [];
//     displayCustomers(allCustomers);
//     updateSummaryCards(allCustomers);
//   } catch (error) {
//     console.error('Error loading customers:', error);
//     showToast('Error loading customers', 'error');
//   }
// }

// // Display Customers in Table
// function displayCustomers(customers) {
//   const tbody = $('customers-table');
//   if (!tbody) return;

//   if (customers.length === 0) {
//     tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No customers found</td></tr>';
//     return;
//   }

//   let html = '';
//   customers.forEach(c => {
//     const balanceClass = c.balance > 0 ? 'text-danger' : c.balance < 0 ? 'text-success' : 'text-muted';
//     const balanceText = c.balance > 0 ? `Udhaar: Rs. ${formatNumber(c.balance)}` :
//       c.balance < 0 ? `Advance: Rs. ${formatNumber(Math.abs(c.balance))}` : 'Zero';

//     const categoryColors = {
//       'Member': 'primary',
//       'Company': 'success',
//       'Government': 'info',
//       'VIP': 'warning',
//       'Owner': 'danger'
//     };
//     const categoryColor = categoryColors[c.category] || 'secondary';

//     html += `
//       <tr>
//         <td><strong>${c.sr_no}</strong></td>
//         <td>${c.name}</td>
//         <td>${c.phone || '-'}</td>
//         <td><span class="badge bg-${categoryColor}">${c.category}</span></td>
//         <td class="${balanceClass}"><strong>${balanceText}</strong></td>
//         <td>
//           <div class="btn-group btn-group-sm">
//             <button class="btn btn-outline-primary" onclick="viewCustomerDetails(${c.id})" title="View Details">
//               <i class="bi bi-eye"></i>
//             </button>
//             <button class="btn btn-outline-info" onclick="printCustomerBill(${c.id})" title="Print Monthly Bill">
//               <i class="bi bi-printer"></i>
//             </button>
//             <button class="btn btn-outline-danger" onclick="deleteCustomer(${c.id})" title="Delete">
//               <i class="bi bi-trash"></i>
//             </button>
//           </div>
//         </td>
//       </tr>
//     `;
//   });

//   tbody.innerHTML = html;
// }

// // Update Summary Cards
// function updateSummaryCards(customers) {
//   let totalCustomers = customers.length;
//   let totalUdhaar = 0;
//   let totalAdvance = 0;
//   let totalCompanies = 0;

//   customers.forEach(c => {
//     if (c.balance > 0) totalUdhaar += c.balance;
//     if (c.balance < 0) totalAdvance += Math.abs(c.balance);
//     if (c.category === 'Company' || c.category === 'Government') totalCompanies++;
//   });

//   if ($('total-customers')) $('total-customers').textContent = totalCustomers;
//   if ($('total-udhaar')) $('total-udhaar').textContent = 'Rs. ' + formatNumber(totalUdhaar);
//   if ($('total-advance')) $('total-advance').textContent = 'Rs. ' + formatNumber(totalAdvance);
//   if ($('total-companies')) $('total-companies').textContent = totalCompanies;
// }

// // Add Customer
// window.addCustomer = async function() {
//   const srNo = parseInt($('new-sr-no').value);
//   const name = $('new-name').value;
//   const phone = $('new-phone').value;
//   const category = $('new-category').value;
//   const balance = parseFloat($('new-balance').value) || 0;

//   if (!srNo || !name) {
//     showToast('Please fill all required fields', 'error');
//     return;
//   }

//   try {
//     const { error } = await supabase
//       .from('customers')
//       .insert([{
//         sr_no: srNo,
//         name: name,
//         phone: phone || null,
//         category: category,
//         balance: balance
//       }]);

//     if (error) throw error;

//     showToast('Customer added successfully!', 'success');
    
//     const modal = bootstrap.Modal.getInstance($('addCustomerModal'));
//     if (modal) modal.hide();
//     $('addCustomerForm').reset();

//     loadCustomers();
//   } catch (error) {
//     console.error('Error adding customer:', error);
//     if (error.code === '23505') {
//       showToast('SR No already exists! Please use a different number.', 'error');
//     } else {
//       showToast('Error adding customer: ' + error.message, 'error');
//     }
//   }
// };

// // View Customer Details
// window.viewCustomerDetails = function(customerId) {
//   window.location.href = `customer-details.html?id=${customerId}`;
// };

// // Print Customer Bill
// window.printCustomerBill = function(customerId) {
//   const now = new Date();
//   const year = now.getFullYear();
//   const month = now.getMonth() + 1;
  
//   if (window.printMonthlyBill) {
//     window.printMonthlyBill(customerId, year, month);
//   } else {
//     showToast('Please include monthly-ledger.js', 'error');
//   }
// };

// // Delete Customer
// window.deleteCustomer = async function(customerId) {
//   const customer = allCustomers.find(c => c.id === customerId);
  
//   if (!customer) return;

//   if (customer.balance !== 0) {
//     if (!confirm(`Customer has balance of Rs. ${formatNumber(Math.abs(customer.balance))}. Are you sure you want to delete?`)) {
//       return;
//     }
//   }

//   if (!confirm(`Delete customer "${customer.name}"? This action cannot be undone.`)) {
//     return;
//   }

//   try {
//     const { error } = await supabase
//       .from('customers')
//       .delete()
//       .eq('id', customerId);

//     if (error) throw error;

//     showToast('Customer deleted successfully!', 'success');
//     loadCustomers();
//   } catch (error) {
//     console.error('Error deleting customer:', error);
//     showToast('Error deleting customer: ' + error.message, 'error');
//   }
// };

// // Search Functionality
// function setupSearch() {
//   const searchInput = $('search-customer');
//   if (!searchInput) return;

//   searchInput.addEventListener('input', function() {
//     filterCustomers();
//   });
// }

// // Filter Functionality
// function setupFilter() {
//   const filterSelect = $('filter-category');
//   if (!filterSelect) return;

//   filterSelect.addEventListener('change', function() {
//     filterCustomers();
//   });
// }

// // Filter Customers
// function filterCustomers() {
//   const searchTerm = $('search-customer')?.value.toLowerCase() || '';
//   const categoryFilter = $('filter-category')?.value || '';

//   let filtered = allCustomers;

//   // Apply search
//   if (searchTerm) {
//     filtered = filtered.filter(c => {
//       return c.name.toLowerCase().includes(searchTerm) ||
//              c.sr_no.toString().includes(searchTerm) ||
//              (c.phone && c.phone.includes(searchTerm));
//     });
//   }

//   // Apply category filter
//   if (categoryFilter) {
//     filtered = filtered.filter(c => c.category === categoryFilter);
//   }

//   displayCustomers(filtered);
// }

// // Clear Filters
// window.clearFilters = function() {
//   if ($('search-customer')) $('search-customer').value = '';
//   if ($('filter-category')) $('filter-category').value = '';
//   displayCustomers(allCustomers);
// };

// // Initialize Page
// document.addEventListener('DOMContentLoaded', () => {
//   if (document.body.getAttribute('data-page') === 'customers') {
//     loadCustomers();
//     setupSearch();
//     setupFilter();
    
//     console.log('✅ Customers page initialized');
//   }
// });

// })();