// =============================================
// Customers Page JS — Khalid & Sons Petroleum
// =============================================

let allCustomers = [];
let filteredCustomers = [];
let currentPage = 1;
const PAGE_SIZE = 20;

async function loadCustomers() {
  const uid = window._currentUserId;
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', uid)
      .order('sr_no', { ascending: true });

    if (error) throw error;
    allCustomers = data || [];
    filteredCustomers = [...allCustomers];
    currentPage = 1;
    updateStats();
    renderTable();
  } catch(e) {
    console.error('loadCustomers error:', e);
    showToast('Error loading customers: ' + e.message, 'danger');
  }
}

function updateStats() {
  document.getElementById('stat-total').textContent = allCustomers.length;
  const totalReceivable = allCustomers.reduce((s,c) => s + Math.max(0, Number(c.balance)||0), 0);
  document.getElementById('stat-receivable').textContent = 'Rs. ' + formatNumber(totalReceivable);
  const pos  = allCustomers.filter(c => (Number(c.balance)||0) > 0).length;
  const zero = allCustomers.filter(c => (Number(c.balance)||0) === 0).length;
  document.getElementById('stat-pos').textContent  = pos;
  document.getElementById('stat-zero').textContent = zero;
}

function filterCustomers() {
  const q = (document.getElementById('searchInput').value || '').toLowerCase().trim();
  const cat = document.getElementById('categoryFilter').value;
  filteredCustomers = allCustomers.filter(c => {
    const matchQ = !q || c.name?.toLowerCase().includes(q) || (c.phone||'').includes(q);
    const matchC = !cat || c.category === cat;
    return matchQ && matchC;
  });
  currentPage = 1;
  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('customers-tbody');
  const total = filteredCustomers.length;
  document.getElementById('total-count').textContent = total + ' customer' + (total !== 1 ? 's' : '');

  const start = (currentPage - 1) * PAGE_SIZE;
  const page  = filteredCustomers.slice(start, start + PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  document.getElementById('page-info').textContent =
    `Page ${currentPage} of ${totalPages} (${total} total)`;
  document.getElementById('prevBtn').disabled = currentPage <= 1;
  document.getElementById('nextBtn').disabled = currentPage >= totalPages;

  if (page.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted"><i class="bi bi-inbox me-2"></i>No customers found</td></tr>';
    return;
  }

  tbody.innerHTML = page.map((c, i) => {
    const bal = Number(c.balance) || 0;
    const balClass = bal > 0 ? 'text-danger fw-bold' : bal < 0 ? 'text-success fw-bold' : 'text-muted';
    const catBadge = {
      Regular: 'bg-secondary', VIP: 'bg-warning text-dark',
      Dealer: 'bg-primary', Staff: 'bg-success'
    }[c.category] || 'bg-secondary';
    return `<tr>
      <td>${(start + i + 1)}</td>
      <td><strong>${escapeHtml(c.name || '')}</strong></td>
      <td>${c.phone || '<span class="text-muted">—</span>'}</td>
      <td><span class="badge ${catBadge}">${c.category || 'Regular'}</span></td>
      <td class="${balClass}">Rs. ${formatNumber(Math.abs(bal))}${bal < 0 ? ' <small class="text-success">(advance)</small>' : ''}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="openEdit(${JSON.stringify(c).replace(/"/g,'&quot;')})">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-info me-1" onclick="viewLedger('${c.id}','${escapeHtml(c.name)}')">
          <i class="bi bi-journal-text"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteCustomer('${c.id}','${escapeHtml(c.name)}')">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>`;
  }).join('');
}

function changePage(dir) {
  const totalPages = Math.ceil(filteredCustomers.length / PAGE_SIZE);
  currentPage = Math.max(1, Math.min(totalPages, currentPage + dir));
  renderTable();
}

async function addCustomer() {
  const name = document.getElementById('add-name').value.trim();
  if (!name) { showToast('Customer name is required', 'warning'); return; }

  const uid = window._currentUserId;
  let srNo = Number(document.getElementById('add-srno').value) || null;
  if (!srNo) {
    srNo = allCustomers.length > 0 ? Math.max(...allCustomers.map(c => c.sr_no || 0)) + 1 : 1;
  }

  try {
    const { error } = await supabase.from('customers').insert({
      user_id:  uid,
      name:     name,
      phone:    document.getElementById('add-phone').value.trim() || null,
      category: document.getElementById('add-category').value,
      balance:  Number(document.getElementById('add-balance').value) || 0,
      sr_no:    srNo
    });
    if (error) throw error;
    showToast('Customer added successfully!', 'success');
    bootstrap.Modal.getInstance(document.getElementById('addCustomerModal'))?.hide();
    ['add-name','add-phone','add-balance','add-srno'].forEach(id => {
      const e = document.getElementById(id); if(e) e.value = '';
    });
    await loadCustomers();
  } catch(e) {
    showToast('Error: ' + e.message, 'danger');
  }
}

function openEdit(c) {
  document.getElementById('edit-cust-id').value       = c.id;
  document.getElementById('edit-cust-name').value     = c.name || '';
  document.getElementById('edit-cust-phone').value    = c.phone || '';
  document.getElementById('edit-cust-category').value = c.category || 'Regular';
  document.getElementById('edit-cust-balance').value  = c.balance || 0;
  new bootstrap.Modal(document.getElementById('editCustomerModal')).show();
}

async function updateCustomer() {
  const id   = document.getElementById('edit-cust-id').value;
  const name = document.getElementById('edit-cust-name').value.trim();
  if (!name) { showToast('Name required', 'warning'); return; }

  try {
    const { error } = await supabase.from('customers').update({
      name:     name,
      phone:    document.getElementById('edit-cust-phone').value.trim() || null,
      category: document.getElementById('edit-cust-category').value,
      balance:  Number(document.getElementById('edit-cust-balance').value) || 0
    }).eq('id', id).eq('user_id', window._currentUserId);
    if (error) throw error;
    showToast('Customer updated!', 'success');
    bootstrap.Modal.getInstance(document.getElementById('editCustomerModal'))?.hide();
    await loadCustomers();
  } catch(e) {
    showToast('Error: ' + e.message, 'danger');
  }
}

async function deleteCustomer(id, name) {
  if (!confirm(`Delete customer "${name}"? This cannot be undone.`)) return;
  try {
    const { error } = await supabase.from('customers')
      .delete().eq('id', id).eq('user_id', window._currentUserId);
    if (error) throw error;
    showToast('Customer deleted', 'success');
    await loadCustomers();
  } catch(e) {
    showToast('Error: ' + e.message, 'danger');
  }
}

function viewLedger(custId, custName) {
  window.location.href = `transactions.html?customer=${custId}&name=${encodeURIComponent(custName)}`;
}

function escapeHtml(s) {
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
