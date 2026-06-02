// =============================================
// FILE: js/bank-deposits.js
// Bank Cash Deposit Management
// Multiple banks, date-wise, summary cards
// =============================================
(function () {
  'use strict';

  const PAGE_SIZE = 20;
  let allDeposits  = [];
  let allBanks     = [];
  let currentPage  = 1;

  const sb = () => window.supabaseClient;
  const fmt = n => Number(n||0).toLocaleString('en-PK',{minimumFractionDigits:2,maximumFractionDigits:2});
  const today = () => new Date().toISOString().slice(0,10);


  async function getOwnerCustomerId() {
    try {
      const { data } = await sb().from('customers').select('id').eq('category','Owner').maybeSingle();
      if (data?.id) return data.id;
      const { data: created, error } = await sb().from('customers')
        .insert([{ sr_no: 0, name: 'Owner / Cash', category: 'Owner', balance: 0 }])
        .select('id').single();
      if (error) throw error;
      return created?.id || null;
    } catch (e) {
      console.warn('Owner account not available for bank deposit transaction:', e.message);
      return null;
    }
  }

  function missingColumn(message){
    const m = String(message || '').match(/'([^']+)' column|column ['"]?([a-zA-Z0-9_]+)['"]?/i);
    return m ? (m[1] || m[2]) : null;
  }

  async function safeInsertBankDepositTransaction(payload) {
    let row = { ...payload };
    const removable = ['cash_deposit_id','reference_no','payment_mode','balance_before','balance_after','entry_method'];
    for (let i=0; i<8; i++) {
      const { error } = await sb().from('transactions').insert([row]);
      if (!error) return true;
      const col = missingColumn(error.message || error.details || '');
      if (col && Object.prototype.hasOwnProperty.call(row, col)) { delete row[col]; continue; }
      const rm = removable.find(k => Object.prototype.hasOwnProperty.call(row,k));
      if (rm && /schema cache|column/i.test(error.message || error.details || '')) { delete row[rm]; continue; }
      console.warn('Bank deposit transaction insert skipped:', error.message);
      return false;
    }
    return false;
  }

  // ── Bootstrap modal helpers ──────────────────────────────────
  let _depositModal, _bankModal;
  function depositModal() { return _depositModal || (_depositModal = new bootstrap.Modal(document.getElementById('depositModal'))); }
  function bankModal()    { return _bankModal    || (_bankModal    = new bootstrap.Modal(document.getElementById('bankModal'))); }

  // ── Init ─────────────────────────────────────────────────────
  window.addEventListener('DOMContentLoaded', () => waitReady(init));

  function waitReady(cb, n=0) {
    if (window.supabaseClient && window.PETRO_SESSION_READY) return setTimeout(cb, 400);
    if (n>80) return;
    setTimeout(() => waitReady(cb, n+1), 100);
  }

  async function init() {
    // Permission check
    if (!window.hasPermission('canManageBanks')) {
      document.querySelector('.container-fluid')?.insertAdjacentHTML('afterbegin',
        `<div class="alert alert-danger"><i class="bi bi-lock me-2"></i>You do not have permission to access Bank Deposits.</div>`);
      return;
    }

    // Set default date range: 1st of current month → today
    const now = new Date();
    const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    document.getElementById('filter-from').value = firstOfMonth;
    document.getElementById('filter-to').value   = today();

    await Promise.all([loadBanks(), loadDeposits()]);
    loadSummary();
  }

  // ── BANKS ─────────────────────────────────────────────────────
  async function loadBanks() {
    const { data, error } = await sb().from('banks').select('*').order('name');
    if (error) { console.error('Banks load error:', error.message); return; }
    allBanks = data || [];
    renderBanksList();
    populateBankDropdowns();
    document.getElementById('stat-banks').textContent = allBanks.length;
  }

  function renderBanksList() {
    const el = document.getElementById('banks-list');
    if (!allBanks.length) {
      el.innerHTML = '<div class="text-center py-3 text-muted small">No banks added yet.<br>Click "Add Bank" to start.</div>';
      return;
    }
    el.innerHTML = allBanks.map(b => `
      <div class="d-flex align-items-center justify-content-between py-2 border-bottom">
        <div>
          <span class="badge bg-${b.color||'primary'} me-2">${esc(b.name)}</span>
          ${b.account_number ? `<span class="text-muted small">${esc(b.account_number)}</span>` : ''}
        </div>
        <div>
          <button class="btn btn-link btn-sm p-0 me-2 text-primary" onclick="openBankModal('${b.id}')">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-link btn-sm p-0 text-danger" onclick="deleteBank('${b.id}')">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>`).join('');
  }

  function populateBankDropdowns() {
    ['dep-bank','filter-bank'].forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const val = sel.value;
      // Keep "All Banks" option in filter-bank
      sel.innerHTML = id === 'filter-bank'
        ? '<option value="">All Banks</option>'
        : '<option value="">— Select Bank —</option>';
      allBanks.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = b.name;
        sel.appendChild(opt);
      });
      if (val) sel.value = val;
    });
  }

  window.openBankModal = function (bankId) {
    document.getElementById('bank-edit-id').value = bankId || '';
    document.getElementById('modal-bank-title').textContent = bankId ? 'Edit Bank' : 'Add Bank';
    if (bankId) {
      const b = allBanks.find(x => x.id == bankId);
      if (b) {
        document.getElementById('bank-name').value    = b.name || '';
        document.getElementById('bank-account').value = b.account_number || '';
        document.getElementById('bank-branch').value  = b.branch || '';
        document.getElementById('bank-color').value   = b.color || 'primary';
      }
    } else {
      document.getElementById('bank-name').value    = '';
      document.getElementById('bank-account').value = '';
      document.getElementById('bank-branch').value  = '';
      document.getElementById('bank-color').value   = 'primary';
    }
    bankModal().show();
  };

  window.saveBank = async function () {
    const id      = document.getElementById('bank-edit-id').value;
    const name    = document.getElementById('bank-name').value.trim();
    const account = document.getElementById('bank-account').value.trim();
    const branch  = document.getElementById('bank-branch').value.trim();
    const color   = document.getElementById('bank-color').value;
    if (!name) { toast('Bank name is required.', 'warning'); return; }

    const row = { name, account_number: account, branch, color };
    let error;
    if (id) {
      ({ error } = await sb().from('banks').update(row).eq('id', id));
    } else {
      ({ error } = await sb().from('banks').insert({ ...row, created_at: new Date().toISOString() }));
    }
    if (error) { toast('Error saving bank: ' + error.message, 'danger'); return; }
    bankModal().hide();
    toast('✅ Bank saved!', 'success');
    await loadBanks();
    await loadDeposits();
  };

  window.deleteBank = async function (bankId) {
    // Check if any deposits use this bank
    const used = allDeposits.some(d => d.bank_id == bankId);
    if (used) { toast('Cannot delete — deposits exist for this bank. Remove them first.', 'danger'); return; }
    if (!confirm('Delete this bank?')) return;
    const { error } = await sb().from('banks').delete().eq('id', bankId);
    if (error) { toast('Error: ' + error.message, 'danger'); return; }
    toast('Bank deleted.', 'warning');
    await loadBanks();
  };

  // ── DEPOSITS ──────────────────────────────────────────────────
  window.loadDeposits = async function () {
    const from = document.getElementById('filter-from').value;
    const to   = document.getElementById('filter-to').value;
    const bank = document.getElementById('filter-bank').value;

    let query = sb().from('cash_deposits').select('*').order('deposit_date', { ascending: false });
    if (from) query = query.gte('deposit_date', from);
    if (to)   query = query.lte('deposit_date', to);
    if (bank) query = query.eq('bank_id', bank);

    const { data, error } = await query;
    if (error) { toast('Error loading deposits: ' + error.message, 'danger'); return; }

    allDeposits = data || [];
    currentPage = 1;
    renderDeposits();
    loadSummary();
  };

  function renderDeposits() {
    const tbody = document.getElementById('deposits-tbody');
    if (!allDeposits.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-muted">
        <i class="bi bi-inbox fs-2 d-block mb-2"></i>No deposits found for this period.</td></tr>`;
      document.getElementById('pagination-info').textContent = 'Showing 0 records';
      document.getElementById('pagination-btns').innerHTML  = '';
      return;
    }

    const start  = (currentPage - 1) * PAGE_SIZE;
    const slice  = allDeposits.slice(start, start + PAGE_SIZE);
    const total  = allDeposits.length;
    const pages  = Math.ceil(total / PAGE_SIZE);

    tbody.innerHTML = slice.map(d => {
      const bank  = allBanks.find(b => b.id == d.bank_id);
      const bName = bank ? bank.name : (d.bank_name || 'Unknown');
      const bColor= bank ? (bank.color || 'primary') : 'secondary';
      return `<tr class="deposit-row">
        <td class="fw-semibold">${fmtDate(d.deposit_date)}</td>
        <td><span class="badge bg-${bColor} badge-bank">${esc(bName)}</span></td>
        <td class="text-success fw-bold">Rs. ${fmt(d.amount)}</td>
        <td class="small text-muted">${esc(d.deposited_by||'—')}</td>
        <td class="small text-muted">${esc(d.reference||'—')}</td>
        <td class="small text-muted">${esc(d.note||'—')}</td>
        <td>
          <button class="btn btn-link btn-sm p-0 me-2 text-primary" onclick="openEditDeposit(${d.id})">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-link btn-sm p-0 text-danger" onclick="deleteDeposit(${d.id})">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>`;
    }).join('');

    document.getElementById('pagination-info').textContent =
      `Showing ${start+1}–${Math.min(start+PAGE_SIZE, total)} of ${total} records`;
    renderPagination(pages);
  }

  function renderPagination(pages) {
    const el = document.getElementById('pagination-btns');
    if (pages <= 1) { el.innerHTML = ''; return; }
    let html = '<nav><ul class="pagination pagination-sm mb-0">';
    html += `<li class="page-item ${currentPage===1?'disabled':''}">
      <a class="page-link" href="#" onclick="goPage(${currentPage-1});return false">‹</a></li>`;
    for (let i=1; i<=pages; i++) {
      html += `<li class="page-item ${i===currentPage?'active':''}">
        <a class="page-link" href="#" onclick="goPage(${i});return false">${i}</a></li>`;
    }
    html += `<li class="page-item ${currentPage===pages?'disabled':''}">
      <a class="page-link" href="#" onclick="goPage(${currentPage+1});return false">›</a></li>`;
    html += '</ul></nav>';
    el.innerHTML = html;
  }

  window.goPage = function(p) { currentPage = p; renderDeposits(); };

  // ── Summary ───────────────────────────────────────────────────
  function loadSummary() {
    const now     = new Date();
    const todayStr= today();
    const y = now.getFullYear(), m = String(now.getMonth()+1).padStart(2,'0');
    const monthStart = `${y}-${m}-01`;

    // All deposits for today (regardless of filter)
    const todayTotal = allDeposits
      .filter(d => d.deposit_date === todayStr)
      .reduce((s, d) => s + Number(d.amount||0), 0);

    // All deposits in current month  
    const monthTotal = allDeposits
      .filter(d => d.deposit_date >= monthStart)
      .reduce((s, d) => s + Number(d.amount||0), 0);
    const monthCount = allDeposits.filter(d => d.deposit_date >= monthStart).length;

    document.getElementById('stat-today').textContent  = 'Rs. ' + fmt(todayTotal);
    document.getElementById('stat-month').textContent  = 'Rs. ' + fmt(monthTotal);
    document.getElementById('stat-count').textContent  = monthCount;

    // Bank-wise summary (filtered period)
    const bankTotals = {};
    allDeposits.forEach(d => {
      const k = d.bank_id || 'unknown';
      bankTotals[k] = (bankTotals[k]||0) + Number(d.amount||0);
    });

    const summEl = document.getElementById('bank-summary-list');
    const entries = Object.entries(bankTotals).sort((a,b) => b[1]-a[1]);
    if (!entries.length) {
      summEl.innerHTML = '<div class="text-center text-muted py-2 small">No data</div>';
      return;
    }
    const grandTotal = entries.reduce((s,[,v])=>s+v,0);
    summEl.innerHTML = entries.map(([bankId, total]) => {
      const bank  = allBanks.find(b => b.id == bankId);
      const bName = bank ? bank.name : 'Unknown';
      const bColor= bank ? (bank.color||'primary') : 'secondary';
      const pct   = grandTotal > 0 ? Math.round(total/grandTotal*100) : 0;
      return `<div class="mb-3">
        <div class="d-flex justify-content-between mb-1">
          <span class="badge bg-${bColor} badge-bank">${esc(bName)}</span>
          <strong class="small">Rs. ${fmt(total)}</strong>
        </div>
        <div class="progress" style="height:6px">
          <div class="progress-bar bg-${bColor}" style="width:${pct}%"></div>
        </div>
        <div class="text-muted" style="font-size:11px;text-align:right">${pct}% of total</div>
      </div>`;
    }).join('') + `<div class="border-top pt-2 d-flex justify-content-between">
      <strong class="small">Grand Total</strong>
      <strong class="small text-success">Rs. ${fmt(grandTotal)}</strong>
    </div>`;
  }

  // ── Add / Edit deposit ────────────────────────────────────────
  window.openAddDepositModal = function () {
    document.getElementById('dep-id').value     = '';
    document.getElementById('dep-date').value   = today();
    document.getElementById('dep-bank').value   = '';
    document.getElementById('dep-amount').value = '';
    document.getElementById('dep-by').value     = window.currentUserProfile?.full_name || '';
    document.getElementById('dep-ref').value    = '';
    document.getElementById('dep-note').value   = '';
    document.getElementById('modal-deposit-title').textContent = 'New Cash Deposit';
    depositModal().show();
  };

  window.openEditDeposit = function (id) {
    const d = allDeposits.find(x => x.id === id);
    if (!d) return;
    document.getElementById('dep-id').value     = d.id;
    document.getElementById('dep-date').value   = d.deposit_date || '';
    document.getElementById('dep-bank').value   = d.bank_id || '';
    document.getElementById('dep-amount').value = d.amount || '';
    document.getElementById('dep-by').value     = d.deposited_by || '';
    document.getElementById('dep-ref').value    = d.reference || '';
    document.getElementById('dep-note').value   = d.note || '';
    document.getElementById('modal-deposit-title').textContent = 'Edit Deposit';
    depositModal().show();
  };

  window.saveDeposit = async function () {
    const id     = document.getElementById('dep-id').value;
    const date   = document.getElementById('dep-date').value;
    const bankId = document.getElementById('dep-bank').value;
    const amount = parseFloat(document.getElementById('dep-amount').value);
    const by     = document.getElementById('dep-by').value.trim();
    const ref    = document.getElementById('dep-ref').value.trim();
    const note   = document.getElementById('dep-note').value.trim();

    if (!date)           { toast('Date is required.', 'warning'); return; }
    if (!bankId)         { toast('Please select a bank.', 'warning'); return; }
    if (!amount || amount <= 0) { toast('Amount must be greater than 0.', 'warning'); return; }

    const row = {
      deposit_date: date,
      bank_id:      bankId,
      amount:       amount,
      deposited_by: by || null,
      reference:    ref || null,
      note:         note || null,
      created_by:   window.currentUser?.id || null
    };

    let error, savedDeposit = null;
    if (id) {
      ({ error } = await sb().from('cash_deposits').update(row).eq('id', id));
      savedDeposit = { ...row, id };
    } else {
      row.created_at = new Date().toISOString();
      const res = await sb().from('cash_deposits').insert(row).select().single();
      error = res.error;
      savedDeposit = res.data;
    }
    if (error) { toast('Error saving deposit: ' + error.message, 'danger'); return; }

    // New deposit ko transaction history mein bhi record karo, taake daily sale → next-day bank deposit manage ho sake.
    if (!id && savedDeposit) {
      const bank = allBanks.find(b => String(b.id) === String(bankId));
      const ownerId = await getOwnerCustomerId();
      await safeInsertBankDepositTransaction({
        customer_id: ownerId,
        transaction_type: 'BankDeposit',
        amount: amount,
        charges: amount,
        cash_deposit_id: savedDeposit.id,
        reference_no: ref || null,
        payment_mode: bank?.name || 'Bank',
        entry_method: 'bank_deposit',
        description: `Bank Deposit to ${bank?.name || 'Bank'}${ref ? ' | Ref: '+ref : ''}${note ? ' | '+note : ''}`,
        created_at: new Date(date + 'T12:00:00').toISOString()
      });
    }

    depositModal().hide();
    toast('✅ Deposit saved!', 'success');
    await loadDeposits();
  };

  window.deleteDeposit = async function (id) {
    if (!confirm('Delete this deposit record?')) return;
    const { error } = await sb().from('cash_deposits').delete().eq('id', id);
    if (error) { toast('Error: ' + error.message, 'danger'); return; }
    toast('Deposit deleted.', 'warning');
    await loadDeposits();
  };

  window.resetFilters = function () {
    const now = new Date();
    const first = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    document.getElementById('filter-from').value = first;
    document.getElementById('filter-to').value   = today();
    document.getElementById('filter-bank').value = '';
    loadDeposits();
  };

  // ── Helpers ───────────────────────────────────────────────────
  function fmtDate(d) {
    if (!d) return '—';
    try { return new Date(d+'T00:00:00').toLocaleDateString('en-PK',{day:'2-digit',month:'short',year:'numeric',weekday:'short'}); }
    catch { return d; }
  }
  function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function toast(msg, type='success') {
    const t = document.getElementById('liveToast');
    const m = document.getElementById('toast-message');
    if (!t||!m) return;
    m.textContent = msg;
    t.className = `toast bg-${type==='danger'?'danger':type==='warning'?'warning':'success'} text-white`;
    new bootstrap.Toast(t,{delay:3500}).show();
  }

  console.log('✅ bank-deposits.js loaded');
})();
