// =============================================
// Transactions JS v5 — Khalid & Sons Petroleum
// Multi-user, per-user isolation
// =============================================

let allTx = [];
let filteredTx = [];
let txPage = 1;
const TX_PAGE_SIZE = 25;
let activePanel = 'credit';
let customerList = [];

// ── Panel switching ──────────────────────────
function switchPanel(panel, el) {
  activePanel = panel;
  document.querySelectorAll('.form-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.type-tabs .nav-link').forEach(a => a.classList.remove('active'));
  document.getElementById('panel-' + panel).classList.add('active');
  if (el) el.classList.add('active');
  return false;
}

// ── Customer search dropdowns ────────────────
async function ensureCustomerList() {
  if (customerList.length) return;
  const { data } = await supabase.from('customers')
    .select('id,name,phone,balance,category')
    .eq('user_id', window._currentUserId)
    .order('name');
  customerList = data || [];
}

async function searchCustomers(prefix) {
  await ensureCustomerList();
  const q = (document.getElementById(`${prefix}-cust-input`)?.value || '').toLowerCase().trim();
  const dd = document.getElementById(`${prefix}-cust-dropdown`);
  if (!q) { dd.style.display='none'; return; }
  const matches = customerList.filter(c =>
    c.name.toLowerCase().includes(q) || (c.phone||'').includes(q)
  ).slice(0, 10);
  if (!matches.length) { dd.style.display='none'; return; }
  dd.innerHTML = matches.map(c => {
    const bal = Number(c.balance)||0;
    const balStr = bal !== 0 ? ` | Rs.${formatNumber(Math.abs(bal))} ${bal>0?'udhaar':'advance'}` : '';
    return `<div class="cust-item" onclick="selectCustomer('${prefix}','${c.id}','${c.name.replace(/'/g,"\\'")}')">
      <strong>${c.name}</strong><small class="text-muted ms-2">${c.phone||''}${balStr}</small>
    </div>`;
  }).join('');
  dd.style.display = 'block';
}

function selectCustomer(prefix, id, name) {
  document.getElementById(`${prefix}-cust-id`).value    = id;
  document.getElementById(`${prefix}-cust-input`).value = name;
  document.getElementById(`${prefix}-cust-dropdown`).style.display = 'none';
  // Auto-fill rate from settings
  if (prefix === 'cr') {
    const fuel = document.getElementById('cr-fuel').value;
    loadFuelRateForCredit(fuel);
  }
}

async function loadFuelRateForCredit(fuel) {
  try {
    const { data } = await supabase.from('settings').select('petrol_price,diesel_price')
      .eq('user_id', window._currentUserId).maybeSingle();
    if (data) {
      const price = fuel === 'Petrol' ? data.petrol_price : data.diesel_price;
      document.getElementById('cr-rate').value = price || '';
      calcCredit();
    }
  } catch(e){}
}

document.addEventListener('DOMContentLoaded', () => {
  const fuelSel = document.getElementById('cr-fuel');
  if (fuelSel) fuelSel.addEventListener('change', () => loadFuelRateForCredit(fuelSel.value));
});

// Auto-calc credit amount
function calcCredit() {
  const liters = parseFloat(document.getElementById('cr-liters')?.value) || 0;
  const rate   = parseFloat(document.getElementById('cr-rate')?.value)   || 0;
  if (liters && rate) {
    document.getElementById('cr-amount').value = (liters * rate).toFixed(0);
  }
}

// ── Save Transaction ─────────────────────────
async function saveTransaction() {
  const uid = window._currentUserId;
  let insertData = null;

  try {
    if (activePanel === 'credit') {
      const custId  = document.getElementById('cr-cust-id').value;
      const custName= document.getElementById('cr-cust-input').value;
      const liters  = parseFloat(document.getElementById('cr-liters').value) || 0;
      const rate    = parseFloat(document.getElementById('cr-rate').value)   || 0;
      const amount  = parseFloat(document.getElementById('cr-amount').value) || 0;
      const fuel    = document.getElementById('cr-fuel').value;
      const notes   = document.getElementById('cr-notes').value.trim();
      const date    = document.getElementById('cr-date').value;
      if (!custId)  { showToast('Please select a customer', 'warning'); return; }
      if (!amount)  { showToast('Amount is required', 'warning'); return; }

      insertData = {
        user_id: uid, customer_id: custId,
        transaction_type: 'Credit',
        charges: amount, liters, unit_price: rate, fuel_type: fuel,
        description: JSON.stringify({ note: notes, fuel, customer: custName }),
        payment_method: 'Credit',
        created_at: date ? date + 'T00:00:00' : undefined
      };

      // Update customer balance
      await supabase.from('customers')
        .update({ balance: supabase.rpc ? undefined : null }) // handled via trigger ideally
        .eq('id', custId);
      // Simple increment
      const { data: cust } = await supabase.from('customers').select('balance').eq('id',custId).single();
      const newBal = (Number(cust?.balance)||0) + amount;
      await supabase.from('customers').update({ balance: newBal }).eq('id',custId);

    } else if (activePanel === 'debit') {
      const custId  = document.getElementById('db-cust-id').value;
      const custName= document.getElementById('db-cust-input').value;
      const amount  = parseFloat(document.getElementById('db-amount').value) || 0;
      const notes   = document.getElementById('db-notes').value.trim();
      const date    = document.getElementById('db-date').value;
      if (!custId) { showToast('Please select a customer', 'warning'); return; }
      if (!amount) { showToast('Amount is required', 'warning'); return; }

      insertData = {
        user_id: uid, customer_id: custId,
        transaction_type: 'Debit',
        charges: amount, amount: amount,
        description: JSON.stringify({ note: notes, customer: custName }),
        payment_method: 'Cash',
        created_at: date ? date + 'T00:00:00' : undefined
      };

      // Reduce customer balance
      const { data: cust } = await supabase.from('customers').select('balance').eq('id',custId).single();
      const newBal = (Number(cust?.balance)||0) - amount;
      await supabase.from('customers').update({ balance: newBal }).eq('id',custId);

    } else if (activePanel === 'expense') {
      const amount   = parseFloat(document.getElementById('ex-amount').value) || 0;
      const category = document.getElementById('ex-category').value;
      const notes    = document.getElementById('ex-notes').value.trim();
      const date     = document.getElementById('ex-date').value;
      if (!amount) { showToast('Amount is required', 'warning'); return; }

      insertData = {
        user_id: uid, customer_id: null,
        transaction_type: 'Expense',
        charges: amount,
        description: JSON.stringify({ note: notes, category }),
        payment_method: 'Cash',
        created_at: date ? date + 'T00:00:00' : undefined
      };

    } else if (activePanel === 'advance') {
      const custId  = document.getElementById('ad-cust-id').value;
      const custName= document.getElementById('ad-cust-input').value;
      const amount  = parseFloat(document.getElementById('ad-amount').value) || 0;
      const reason  = document.getElementById('ad-reason').value.trim();
      const date    = document.getElementById('ad-date').value;
      if (!custId) { showToast('Please select a customer/employee', 'warning'); return; }
      if (!amount) { showToast('Amount is required', 'warning'); return; }

      insertData = {
        user_id: uid, customer_id: custId,
        transaction_type: 'Advance',
        charges: amount,
        description: JSON.stringify({ note: reason, customer: custName }),
        payment_method: 'Cash',
        created_at: date ? date + 'T00:00:00' : undefined
      };
    }

    if (!insertData) return;
    // Remove undefined keys
    Object.keys(insertData).forEach(k => insertData[k] === undefined && delete insertData[k]);

    const { error } = await supabase.from('transactions').insert(insertData);
    if (error) throw error;

    showToast('Transaction saved!', 'success');
    bootstrap.Modal.getInstance(document.getElementById('addTxModal'))?.hide();
    clearForms();
    await loadTransactions();
    customerList = []; // refresh

  } catch(e) {
    showToast('Error: ' + e.message, 'danger');
    console.error(e);
  }
}

function clearForms() {
  ['cr-cust-input','cr-cust-id','cr-liters','cr-rate','cr-amount','cr-notes',
   'db-cust-input','db-cust-id','db-amount','db-notes',
   'ex-amount','ex-notes',
   'ad-cust-input','ad-cust-id','ad-amount','ad-reason'].forEach(id => {
    const el = document.getElementById(id); if(el) el.value = '';
  });
}

// ── Load Transactions ────────────────────────
async function loadTransactions() {
  const uid = window._currentUserId;
  try {
    const { data, error } = await supabase.from('transactions')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    allTx = data || [];

    // Get customer names
    const custIds = [...new Set(allTx.map(t=>t.customer_id).filter(Boolean))];
    if (custIds.length) {
      const { data: custs } = await supabase.from('customers').select('id,name').in('id', custIds);
      window._custMap = {};
      (custs||[]).forEach(c => window._custMap[c.id] = c.name);
    }

    // Check URL params for customer filter
    const urlParams = new URLSearchParams(window.location.search);
    const custParam = urlParams.get('customer');
    if (custParam) {
      document.getElementById('tx-search').value = urlParams.get('name') || '';
    }

    applyFilters();
  } catch(e) {
    showToast('Error loading transactions: ' + e.message, 'danger');
    console.error(e);
  }
}

function applyFilters() {
  const q    = (document.getElementById('tx-search')?.value || '').toLowerCase().trim();
  const type = document.getElementById('tx-type-filter')?.value || '';
  const from = document.getElementById('tx-from')?.value || '';
  const to   = document.getElementById('tx-to')?.value   || '';

  filteredTx = allTx.filter(t => {
    const cname = (window._custMap?.[t.customer_id] || '').toLowerCase();
    const matchQ = !q || cname.includes(q);
    const matchT = !type || t.transaction_type === type;
    const tDate  = t.created_at?.slice(0,10) || '';
    const matchF = !from || tDate >= from;
    const matchTo= !to   || tDate <= to;
    return matchQ && matchT && matchF && matchTo;
  });

  txPage = 1;
  updateSummary();
  renderTxTable();
}

function clearFilters() {
  ['tx-search','tx-type-filter','tx-from','tx-to'].forEach(id => {
    const el = document.getElementById(id); if(el) el.value = '';
  });
  applyFilters();
}

function updateSummary() {
  let credit=0, debit=0, expense=0;
  filteredTx.forEach(t => {
    if (t.transaction_type === 'Credit')  credit  += Number(t.charges)||0;
    if (t.transaction_type === 'Debit')   debit   += Number(t.amount ||t.charges)||0;
    if (t.transaction_type === 'Expense') expense += Number(t.charges)||0;
    if (t.transaction_type === 'CashSale') credit += Number(t.charges)||0;
  });
  const net = debit - credit + expense;
  document.getElementById('sum-credit').textContent  = 'Rs. ' + formatNumber(credit);
  document.getElementById('sum-debit').textContent   = 'Rs. ' + formatNumber(debit);
  document.getElementById('sum-expense').textContent = 'Rs. ' + formatNumber(expense);
  const netEl = document.getElementById('sum-net');
  netEl.textContent = 'Rs. ' + formatNumber(Math.abs(net));
  netEl.className = 's-value ' + (net <= 0 ? 'profit-pos' : 'profit-neg');
}

function renderTxTable() {
  const tbody = document.getElementById('tx-tbody');
  const total = filteredTx.length;
  document.getElementById('tx-count').textContent = total + ' records';

  const totalPages = Math.max(1, Math.ceil(total / TX_PAGE_SIZE));
  document.getElementById('tx-page-info').textContent = `Page ${txPage} of ${totalPages}`;
  document.getElementById('tx-prev').disabled = txPage <= 1;
  document.getElementById('tx-next').disabled = txPage >= totalPages;

  const start = (txPage-1) * TX_PAGE_SIZE;
  const page  = filteredTx.slice(start, start + TX_PAGE_SIZE);

  if (!page.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted"><i class="bi bi-inbox me-2"></i>No transactions found</td></tr>';
    return;
  }

  const typeMap = {
    Credit:'tx-badge-credit', Debit:'tx-badge-debit',
    Expense:'tx-badge-expense', Advance:'tx-badge-advance', CashSale:'tx-badge-cashsale'
  };

  tbody.innerHTML = page.map(t => {
    const date  = new Date(t.created_at).toLocaleDateString('en-PK');
    const cname = window._custMap?.[t.customer_id] || '<span class="text-muted">—</span>';
    const badge = `<span class="${typeMap[t.transaction_type]||'tx-badge-cashsale'}">${t.transaction_type}</span>`;
    const amt   = t.transaction_type === 'Debit' ? (t.amount||t.charges) : t.charges;
    let desc = '';
    try { const d = JSON.parse(t.description||'{}'); desc = d.note||d.category||d.machine||''; } catch(e){}
    return `<tr>
      <td>${date}</td>
      <td>${cname}</td>
      <td>${badge}</td>
      <td class="text-muted">${t.liters ? formatNumber(t.liters,2) + ' L' : '—'}</td>
      <td class="text-muted">${t.unit_price ? 'Rs.'+t.unit_price : '—'}</td>
      <td class="fw-bold">Rs. ${formatNumber(amt||0)}</td>
      <td class="text-muted small" style="max-width:160px;overflow:hidden;text-overflow:ellipsis;">${desc}</td>
      <td class="no-print">
        <button class="btn btn-sm btn-outline-danger" onclick="deleteTx('${t.id}')">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>`;
  }).join('');
}

function txChangePage(dir) {
  const total = Math.max(1, Math.ceil(filteredTx.length / TX_PAGE_SIZE));
  txPage = Math.max(1, Math.min(total, txPage + dir));
  renderTxTable();
}

async function deleteTx(id) {
  if (!confirm('Delete this transaction?')) return;
  try {
    const { error } = await supabase.from('transactions').delete()
      .eq('id', id).eq('user_id', window._currentUserId);
    if (error) throw error;
    showToast('Deleted', 'success');
    await loadTransactions();
  } catch(e) {
    showToast('Error: ' + e.message, 'danger');
  }
}

function printReport() {
  window.print();
}

// Close dropdowns on outside click
document.addEventListener('click', e => {
  if (!e.target.closest('.position-relative')) {
    document.querySelectorAll('.cust-dropdown').forEach(d => d.style.display='none');
  }
});
