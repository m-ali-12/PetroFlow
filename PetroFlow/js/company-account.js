// ============================================================
// company-account.js — GO Company Account (Account No. 10)
// Khalid & Sons Petroleum
// Fixes: initial credit, correct b2b_company_id saving, filtered ledgers,
// repayment visibility, smooth print statement, safe rendering.
// ============================================================

(function () {
  'use strict';

  const GO_ACCOUNT_SR_NO = 10;
  const COMPANY_DISPLAY_NAME = 'GO Company cc';

  const sb = () => window.supabaseClient;
  const el = id => document.getElementById(id);
  const fmt = n => Number(n || 0).toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const num = v => {
    const n = parseFloat(String(v ?? '').replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  };
  const dateOnly = d => d ? new Date(d).toLocaleDateString('en-PK') : '—';
  const isoToday = () => new Date().toISOString().split('T')[0];
  const setText = (id, v) => { const x = el(id); if (x) x.textContent = v; };
  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  let ddMcu, ddDre, ddPaid;
  let allCustomers = [];
  let lastCompanyTransactions = [];
  let lastCompanySummary = null;
  let cachedCompanyAccount = null;

  function showToast(type, title, msg) {
    const t = el('liveToast');
    if (!t) { alert(`${title}: ${msg}`); return; }
    setText('toast-title', title);
    setText('toast-message', msg);
    t.className = 'toast ' + (
      type === 'success' ? 'bg-success text-white' :
      type === 'warning' ? 'bg-warning text-dark' :
      'bg-danger text-white'
    );
    new bootstrap.Toast(t, { delay: 4000 }).show();
  }

  async function getCurrentUser() {
    try {
      const { data } = await sb().auth.getUser();
      return data?.user || null;
    } catch {
      return null;
    }
  }

  async function getCurrentUserId() {
    const user = await getCurrentUser();
    return user?.id || null;
  }

  async function getTenantCompanyId() {
    try {
      if (window.currentUserProfile?.company_id) return window.currentUserProfile.company_id;
      const userId = await getCurrentUserId();
      if (!userId) return null;
      const { data } = await sb()
        .from('user_profiles')
        .select('company_id')
        .eq('user_id', userId)
        .maybeSingle();
      return data?.company_id || null;
    } catch {
      return null;
    }
  }

  async function getCompanyAccount(force = false) {
    if (cachedCompanyAccount && !force) return cachedCompanyAccount;

    const { data, error } = await sb()
      .from('customers')
      .select('*')
      .eq('sr_no', GO_ACCOUNT_SR_NO)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      throw new Error('GO Company Account No. 10 nahi mila. COMPANY_ACCOUNT_FINAL_FIX.sql Supabase SQL editor mein run karein.');
    }

    cachedCompanyAccount = data;
    return data;
  }

  function companyTxnBasePayload(account, userId) {
    const payload = {
      user_id: userId,
      b2b_company_id: account.id
    };

    // company_id is tenant UUID in the repaired schema. If unavailable, DB default get_my_company() will handle it.
    if (account.company_id) payload.company_id = account.company_id;
    return payload;
  }

  // ============================================================
  // Searchable Dropdown Engine
  // ============================================================
  function makeSearchDropdown(options) {
    const {
      searchId, listId, clearId, hiddenId,
      balanceId = null,
      items = [],
      valueKey = 'id',
      labelFn = null,
      showBalance = true,
    } = options;

    const searchEl = el(searchId);
    const listEl = el(listId);
    const clearEl = el(clearId);
    const hiddenEl = el(hiddenId);
    const balEl = balanceId ? el(balanceId) : null;

    if (!searchEl || !listEl) return { reset: () => {}, getSelected: () => null };

    let selectedItem = null;

    function renderList(query) {
      const q = (query || '').toLowerCase().trim();
      const filtered = q
        ? items.filter(c =>
            String(c.name || '').toLowerCase().includes(q) ||
            String(c.sr_no || '').includes(q))
        : items;

      if (!filtered.length) {
        listEl.innerHTML = `<div class="sd-empty">Koi result nahi — "${esc(query)}" se koi match nahi</div>`;
        return;
      }

      listEl.innerHTML = filtered.map(c => {
        const isSelected = selectedItem && selectedItem[valueKey] == c[valueKey];
        const label = labelFn ? labelFn(c) : c.name;
        const bal = num(c.balance);
        const balClr = bal > 0 ? '#dc3545' : bal < 0 ? '#198754' : '#999';
        const balText = bal > 0 ? `Rs.${fmt(bal)}` : bal < 0 ? `Rs.${fmt(Math.abs(bal))}` : 'Zero';
        const balIcon = bal > 0 ? '⬆️' : bal < 0 ? '⬇️' : '';

        return `<div class="sd-item${isSelected ? ' selected' : ''}" data-val="${esc(c[valueKey])}">
          <span style="display:flex;align-items:center;gap:0;">
            <span class="sd-badge" style="background:#0d6efd;">#${esc(c.sr_no)}</span>
            <span>${esc(label)}</span>
          </span>
          ${showBalance ? `<span class="sd-bal" style="color:${balClr};">${balIcon} ${balText}</span>` : ''}
        </div>`;
      }).join('');

      listEl.querySelectorAll('.sd-item').forEach(item => {
        item.addEventListener('mousedown', e => {
          e.preventDefault();
          const found = items.find(c => String(c[valueKey]) === item.dataset.val);
          if (found) pickItem(found);
        });
      });
    }

    function pickItem(c) {
      selectedItem = c;
      const label = labelFn ? labelFn(c) : `#${c.sr_no} — ${c.name}`;
      searchEl.value = label;
      if (hiddenEl) hiddenEl.value = c[valueKey];
      if (clearEl) clearEl.style.display = 'inline';
      listEl.style.display = 'none';

      if (balEl && showBalance) {
        const bal = num(c.balance);
        if (bal > 0) { balEl.textContent = `⚠️ Baqi: Rs.${fmt(bal)} (Udhaar)`; balEl.style.color = '#dc3545'; }
        else if (bal < 0) { balEl.textContent = `✅ Advance: Rs.${fmt(Math.abs(bal))}`; balEl.style.color = '#198754'; }
        else { balEl.textContent = '✅ Baqi: Zero'; balEl.style.color = '#198754'; }
      }
    }

    function reset() {
      selectedItem = null;
      searchEl.value = '';
      if (hiddenEl) hiddenEl.value = '';
      if (clearEl) clearEl.style.display = 'none';
      if (balEl) balEl.textContent = '';
      listEl.style.display = 'none';
    }

    searchEl.addEventListener('input', () => {
      renderList(searchEl.value);
      listEl.style.display = 'block';
      if (clearEl) clearEl.style.display = searchEl.value ? 'inline' : 'none';
    });
    searchEl.addEventListener('focus', () => { renderList(searchEl.value); listEl.style.display = 'block'; });
    searchEl.addEventListener('blur', () => setTimeout(() => { listEl.style.display = 'none'; }, 180));
    searchEl.addEventListener('keydown', e => { if (e.key === 'Escape') { listEl.style.display = 'none'; searchEl.blur(); } });
    if (clearEl) clearEl.addEventListener('click', reset);

    const parentModal = searchEl.closest('.modal');
    if (parentModal) parentModal.addEventListener('show.bs.modal', reset);

    return { reset, pickItem, getSelected: () => selectedItem };
  }

  // ============================================================
  // Load Dropdowns
  // ============================================================
  async function loadAllDropdowns() {
    try {
      const userId = await getCurrentUserId();
      let q = sb().from('customers').select('id,sr_no,name,category,balance').order('sr_no');
      if (userId) q = q.eq('user_id', userId);
      const { data: customers, error } = await q;
      if (error) throw error;

      allCustomers = customers || [];

      ddMcu = makeSearchDropdown({
        searchId: 'mcu-search', listId: 'mcu-list', clearId: 'mcu-clear', hiddenId: 'mcu-member-id',
        balanceId: 'mcu-balance-info',
        items: allCustomers.filter(c => c.category !== 'Owner' && Number(c.sr_no) !== GO_ACCOUNT_SR_NO),
        showBalance: true,
      });

      ddDre = makeSearchDropdown({
        searchId: 'dre-search', listId: 'dre-list', clearId: 'dre-clear', hiddenId: 'dre-account-id',
        items: allCustomers,
        showBalance: true,
      });

      const paidItems = [{ id: 'Cash', sr_no: '—', name: 'Cash (Haath Mein)', balance: 0, category: 'cash' }, ...allCustomers];
      ddPaid = makeSearchDropdown({
        searchId: 'paid-search', listId: 'paid-list', clearId: 'paid-clear', hiddenId: 'dre-paid-from',
        items: paidItems,
        valueKey: 'name',
        labelFn: c => c.category === 'cash' ? '💵 Cash (Haath Mein)' : c.name,
        showBalance: false,
      });
    } catch (e) {
      console.error('loadAllDropdowns:', e);
      showToast('warning', 'Dropdown', 'Customer list load nahi hui: ' + e.message);
    }

    try {
      const { data } = await sb().from('expense_categories').select('name,icon').order('name');
      const cats = (data && data.length) ? data : [
        { name:'Bijli Bill', icon:'⚡' }, { name:'Gas Bill', icon:'🔥' },
        { name:'Paani Bill', icon:'💧' }, { name:'Kiraaya', icon:'🏠' },
        { name:'Petrol/Diesel Stock', icon:'⛽' }, { name:'Mazdoor Tankhwah', icon:'👷' },
        { name:'Machine Repair', icon:'🔧' }, { name:'Khaana/Chai', icon:'☕' },
        { name:'Transport', icon:'🚛' }, { name:'Stationery', icon:'📋' },
        { name:'Bank Charges', icon:'🏦' }, { name:'Mobile/Internet', icon:'📱' },
        { name:'Miscellaneous', icon:'📦' },
      ];
      const sel = el('dre-expense-type');
      if (sel) sel.innerHTML = '<option value="">-- Category --</option>' +
        cats.map(c => `<option value="${esc(c.name)}">${esc(c.icon || '')} ${esc(c.name)}</option>`).join('');
    } catch (e) {
      console.warn('expense_categories:', e.message);
    }
  }

  // ============================================================
  // Summary Dashboard
  // ============================================================
  window.loadCompanySummary = async function () {
    try {
      let data = null;
      let viewError = null;
      const { data: viewData, error } = await sb()
        .from('v_company_account_summary')
        .select('*')
        .eq('sr_no', GO_ACCOUNT_SR_NO)
        .maybeSingle();
      if (error) viewError = error;
      else data = viewData;

      const account = await getCompanyAccount(true);

      if (!data) {
        if (viewError) console.warn('v_company_account_summary fallback:', viewError.message);
        data = {
          id: account.id,
          name: account.name,
          company_name: account.company_name || account.name || COMPANY_DISPLAY_NAME,
          sr_no: account.sr_no,
          credit_limit: num(account.credit_limit),
          initial_credit: num(account.initial_credit),
          total_stock_purchased: 0,
          total_charges: 0,
          total_repaid: 0,
          total_linked_expenses: 0,
          grand_total_expenses: 0,
          net_payable_to_company: num(account.initial_credit),
          remaining_credit_limit: Math.max(0, num(account.credit_limit) - num(account.initial_credit))
        };
      }

      lastCompanySummary = data;

      setText('sum-company-name', data.company_name || data.name || COMPANY_DISPLAY_NAME);
      setText('sum-initial-credit', 'Rs. ' + fmt(data.initial_credit));
      setText('sum-stock-purchased', 'Rs. ' + fmt(data.total_stock_purchased ?? data.total_amount));
      setText('sum-total-charges', 'Rs. ' + fmt(data.total_charges));
      setText('sum-total-repaid', 'Rs. ' + fmt(data.total_repaid ?? data.total_repayments));
      setText('sum-net-payable', 'Rs. ' + fmt(data.net_payable_to_company ?? data.balance));
      setText('sum-linked-expenses', 'Rs. ' + fmt(data.total_linked_expenses));
      setText('sum-grand-expenses', 'Rs. ' + fmt(data.grand_total_expenses));
      setText('sum-remaining-credit', 'Rs. ' + fmt(data.remaining_credit_limit));
      setText('credit-limit-label', 'Limit: Rs. ' + fmt(data.credit_limit));

      const npEl = el('sum-net-payable');
      if (npEl) npEl.style.color = num(data.net_payable_to_company ?? data.balance) > 0 ? '#c0392b' : '#1a6b3c';

      const limit = Math.max(1, num(data.credit_limit));
      const used = Math.max(0, num(data.net_payable_to_company ?? data.balance));
      const pct = limit > 1 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
      const bar = el('credit-usage-bar');
      if (bar) {
        bar.style.width = pct + '%';
        bar.className = 'progress-bar ' + (pct > 80 ? 'bg-danger' : pct > 50 ? 'bg-warning' : 'bg-success');
        bar.textContent = pct + '% used';
      }

      const today = isoToday();
      if (el('ic-current-credit')) el('ic-current-credit').value = num(data.initial_credit || account.initial_credit).toFixed(2);
      if (el('ic-credit-limit')) el('ic-credit-limit').value = num(data.credit_limit || account.credit_limit).toFixed(2);
      if (el('ic-opening-date')) el('ic-opening-date').value = account.initial_opening_date || account.initial_posting_date || today;
      if (el('ic-closing-date')) el('ic-closing-date').value = account.initial_closing_date || '';
      if (el('ic-posting-date')) el('ic-posting-date').value = account.initial_posting_date || account.initial_opening_date || today;
      if (el('ic-document-date')) el('ic-document-date').value = account.initial_document_date || account.initial_opening_date || today;
      if (el('ic-document-no')) el('ic-document-no').value = account.initial_document_no || '';
      if (el('ic-reference')) el('ic-reference').value = account.initial_reference_no || '';
      if (el('ic-doc-type')) el('ic-doc-type').value = account.initial_doc_type || 'OP';
      if (el('ic-description')) el('ic-description').value = account.initial_description || 'Opening / Initial Credit from GO Company';
      if (el('ic-notes')) el('ic-notes').value = account.notes || '';
    } catch (e) {
      console.warn('loadCompanySummary:', e.message);
      showToast('warning', 'Company Account', e.message);
    }
  };

  // ============================================================
  // Transaction Table
  // ============================================================
  window.loadCompanyTransactions = async function (filters = {}) {
    const tbody = el('company-txn-table');
    if (tbody) tbody.innerHTML = '<tr><td colspan="11" class="text-center py-3 text-muted"><div class="spinner-border spinner-border-sm me-2"></div>Loading...</td></tr>';

    try {
      const account = await getCompanyAccount();
      let q = sb().from('company_transactions')
        .select('*')
        .eq('b2b_company_id', account.id)
        .order('txn_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (filters.dateFrom) q = q.gte('txn_date', filters.dateFrom);
      if (filters.dateTo) q = q.lte('txn_date', filters.dateTo);
      if (filters.type) q = q.eq('txn_type', filters.type);

      const { data, error } = await q;
      if (error) throw error;

      const txns = data || [];
      txns.forEach(t => { if (t.member_id) t.members = allCustomers.find(c => String(c.id) === String(t.member_id)); });
      lastCompanyTransactions = txns;
      renderTxnTable(txns);
      updateTxnTotals(txns);
    } catch (e) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="11" class="text-center text-danger py-3">Error: ${esc(e.message)}</td></tr>`;
    }
  };

  function txnConfig(type) {
    return {
      initial_credit: { label:'🏦 Initial Credit', bg:'#d1ecf1', clr:'#0c5460' },
      stock_purchase: { label:'📦 Stock Purchase', bg:'#d4edda', clr:'#155724' },
      member_usage: { label:'💳 Member Card', bg:'#cce5ff', clr:'#004085' },
      atm_charge: { label:'🏦 ATM Charge', bg:'#fff3cd', clr:'#856404' },
      misc_charge: { label:'📋 Misc Charge', bg:'#fff3cd', clr:'#856404' },
      repayment_check: { label:'✅ Repay (Check)', bg:'#d1ecf1', clr:'#0c5460' },
      repayment_online: { label:'✅ Repay (Online)', bg:'#d1ecf1', clr:'#0c5460' },
      repayment_cash: { label:'✅ Repay (Cash)', bg:'#d1ecf1', clr:'#0c5460' },
      repayment_other: { label:'✅ Repay (Other)', bg:'#d1ecf1', clr:'#0c5460' },
      adjustment: { label:'⚙️ Adjustment', bg:'#e2e3e5', clr:'#383d41' },
    }[type] || { label: type || 'Transaction', bg:'#f8f9fa', clr:'#333' };
  }

  function docTypeFor(t) {
    const type = String(t.txn_type || '').toLowerCase();
    if (type === 'stock_purchase') return 'FL';
    if (type.includes('repayment')) return 'DZ';
    if (type === 'member_usage') return 'RV';
    if (type === 'initial_credit') return 'OP';
    if (type.includes('charge') || type === 'adjustment') return 'JV';
    return 'TR';
  }

  function docNoFor(t, i) {
    return t.document_no || t.doc_no || t.invoice_no || t.slip_no || t.id || (900000 + i);
  }

  function referenceFor(t) {
    return t.reference_no || t.reference || t.invoice_no || t.card_no || t.bank_ref || '-';
  }

  function renderTxnTable(txns) {
    const tbody = el('company-txn-table');
    if (!tbody) return;
    if (!txns.length) {
      tbody.innerHTML = '<tr><td colspan="11" class="text-center py-4 text-muted"><i class="bi bi-inbox fs-4 d-block mb-2"></i>Koi transaction nahi</td></tr>';
      return;
    }

    const chronological = [...txns].sort((a, b) => new Date(a.txn_date || a.created_at || 0) - new Date(b.txn_date || b.created_at || 0));
    const initialBalance = num(lastCompanySummary?.initial_credit ?? cachedCompanyAccount?.initial_credit) || 0;
    let running = initialBalance;

    tbody.innerHTML = chronological.map((t, i) => {
      const c = txnConfig(t.txn_type);
      const net = Math.abs(num(t.net_amount) || (num(t.amount) + num(t.charges)) || 0);
      const isOut = t.direction === 'out';
      const debit = isOut ? net : 0;
      const credit = isOut ? 0 : net;
      running = running + debit - credit;
      const desc = t.description || c.label || '-';
      const openingClosing = i === 0
        ? `Open: ${dateOnly(cachedCompanyAccount?.initial_opening_date || t.txn_date || t.created_at)}${cachedCompanyAccount?.initial_closing_date ? '<br>Close: ' + dateOnly(cachedCompanyAccount.initial_closing_date) : ''}<br>Rs.${fmt(initialBalance)}`
        : '0.00';
      const badgeStyle = `padding:2px 8px;border-radius:4px;font-size:11px;font-weight:800;background:${c.bg};color:${c.clr};white-space:nowrap;`;

      return `<tr>
        <td style="font-size:12px;white-space:nowrap;">${dateOnly(t.created_at || t.txn_date)}</td>
        <td style="font-size:12px;white-space:nowrap;">${dateOnly(t.txn_date || t.created_at)}</td>
        <td style="font-size:12px;font-weight:700;">${esc(docNoFor(t, i))}</td>
        <td style="font-size:12px;">${esc(referenceFor(t))}</td>
        <td><span style="${badgeStyle}">${esc(docTypeFor(t))}</span></td>
        <td style="font-size:12px;min-width:220px;">${esc(desc)}</td>
        <td class="text-end" style="font-size:12px;">${openingClosing}</td>
        <td class="text-end" style="font-weight:800;color:#dc3545;">${debit ? 'Rs.' + fmt(debit) : '-'}</td>
        <td class="text-end" style="font-weight:800;color:#198754;">${credit ? 'Rs.' + fmt(credit) : '-'}</td>
        <td class="text-end" style="font-weight:900;color:${running >= 0 ? '#dc3545' : '#198754'};">Rs.${fmt(Math.abs(running))}${running < 0 ? ' Adv' : ''}</td>
        <td><button onclick="window.deleteCompanyTxn(${Number(t.id)})" class="btn btn-sm btn-outline-danger" title="Delete"><i class="bi bi-trash"></i></button></td>
      </tr>`;
    }).join('');
  }

  function updateTxnTotals(txns) {
    let debit = 0, credit = 0;
    txns.forEach(t => {
      const net = Math.abs(num(t.net_amount) || (num(t.amount) + num(t.charges)) || 0);
      if (t.direction === 'in') credit += net;
      else debit += net;
    });
    setText('ctxn-total-in', 'Rs. ' + fmt(credit));
    setText('cxtn-total-out', 'Rs. ' + fmt(debit));
    setText('cxtn-net', 'Rs. ' + fmt(debit - credit));
  }

  // ============================================================
  // Initial Credit
  // ============================================================
  window.handleInitialCredit = async function () {
    const initialCredit = num(el('ic-current-credit')?.value);
    const creditLimit = num(el('ic-credit-limit')?.value);
    const openingDate = el('ic-opening-date')?.value || isoToday();
    const closingDate = el('ic-closing-date')?.value || null;
    const postingDate = el('ic-posting-date')?.value || openingDate;
    const documentDate = el('ic-document-date')?.value || openingDate;
    const documentNo = el('ic-document-no')?.value?.trim() || `OPEN-${openingDate}`;
    const referenceNo = el('ic-reference')?.value?.trim() || '';
    const docType = el('ic-doc-type')?.value || 'OP';
    const description = el('ic-description')?.value?.trim() || 'Opening / Initial Credit from GO Company';
    const notes = el('ic-notes')?.value?.trim() || '';

    if (initialCredit < 0) { alert('Initial credit negative nahi ho sakta.'); return; }
    if (creditLimit < 0) { alert('Credit limit negative nahi ho sakti.'); return; }
    if (!openingDate || !postingDate || !documentDate) { alert('Opening, Posting aur Document date zaroor enter karein.'); return; }

    try {
      const account = await getCompanyAccount(true);
      const payload = {
        name: account.name || COMPANY_DISPLAY_NAME,
        company_name: COMPANY_DISPLAY_NAME,
        category: 'Company',
        is_company: true,
        account_type: 'company',
        initial_credit: initialCredit,
        credit_limit: creditLimit,
        initial_opening_date: openingDate,
        initial_closing_date: closingDate,
        initial_posting_date: postingDate,
        initial_document_date: documentDate,
        initial_document_no: documentNo,
        initial_reference_no: referenceNo,
        initial_doc_type: docType,
        initial_description: description,
        notes,
        updated_at: new Date().toISOString()
      };

      let { error } = await sb().from('customers').update(payload).eq('id', account.id);
      if (error && /schema cache|column|initial_/i.test(error.message || '')) {
        // Old DB without the new detail columns: keep the app working, but SQL must be run for full print details.
        const fallback = { ...payload };
        ['initial_opening_date','initial_closing_date','initial_posting_date','initial_document_date','initial_document_no','initial_reference_no','initial_doc_type','initial_description'].forEach(k => delete fallback[k]);
        const retry = await sb().from('customers').update(fallback).eq('id', account.id);
        error = retry.error;
      }
      if (error) throw error;

      // Keep a visible opening entry in company_transactions too, but mark it as zero-value detail entry
      // so it will not double-count the initial_credit summary. The print uses customer opening fields.
      const userId = await getCurrentUserId();
      const detailPayload = {
        ...companyTxnBasePayload(account, userId),
        txn_type: 'initial_credit',
        direction: 'out',
        amount: 0,
        charges: 0,
        reference_no: referenceNo,
        document_no: documentNo,
        posting_date: postingDate,
        document_date: documentDate,
        opening_date: openingDate,
        closing_date: closingDate,
        doc_type: docType,
        txn_date: documentDate,
        description: `${description} | Opening: ${openingDate}${closingDate ? ' | Closing: ' + closingDate : ''} | Amount: Rs.${fmt(initialCredit)} | Doc: ${documentNo}`,
        notes
      };
      try {
        await sb().from('company_transactions').delete()
          .eq('b2b_company_id', account.id).eq('txn_type', 'initial_credit').eq('amount', 0).eq('charges', 0);
        let ins = await sb().from('company_transactions').insert([detailPayload]);
        if (ins.error && /schema cache|column|document_no|posting_date|opening_date|doc_type/i.test(ins.error.message || '')) {
          const fallbackDetail = { ...detailPayload };
          ['document_no','posting_date','document_date','opening_date','closing_date','doc_type'].forEach(k => delete fallbackDetail[k]);
          ins = await sb().from('company_transactions').insert([fallbackDetail]);
        }
      } catch (_) {}

      cachedCompanyAccount = null;
      showToast('success', 'Initial Credit Saved', `Rs.${fmt(initialCredit)} initial credit update ho gaya ✓`);
      closeModal('initialCreditModal');
      await window.loadCompanySummary();
      await window.loadCompanyTransactions();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  // ============================================================
  // Stock Purchase
  // ============================================================
  window.handleStockPurchase = async function () {
    const fuelType = el('sp-fuel-type')?.value;
    const liters = num(el('sp-liters')?.value);
    const unitPrice = num(el('sp-unit-price')?.value);
    const charges = num(el('sp-charges')?.value);
    const invoiceNo = el('sp-invoice-no')?.value?.trim() || '';
    const truckNo = el('sp-truck-no')?.value?.trim() || '';
    const purchDate = el('sp-date')?.value || isoToday();
    const notes = el('sp-notes')?.value?.trim() || '';

    if (!fuelType) { alert('Fuel type select karein'); return; }
    if (liters <= 0) { alert('Liters enter karein'); return; }
    if (unitPrice <= 0) { alert('Unit price enter karein'); return; }

    try {
      const userId = await getCurrentUserId();
      const account = await getCompanyAccount();
      const totalAmt = liters * unitPrice;

      const { data: ctxn, error: cErr } = await sb().from('company_transactions').insert([{
        ...companyTxnBasePayload(account, userId),
        txn_type: 'stock_purchase', direction: 'out',
        amount: totalAmt, charges,
        fuel_type: fuelType, liters, unit_price: unitPrice,
        reference_no: invoiceNo || truckNo || null,
        txn_date: purchDate,
        description: `${fuelType} stock — ${fmt(liters)}L @ Rs.${fmt(unitPrice)}`,
        notes
      }]).select().single();
      if (cErr) throw cErr;

      const stockPurchasePayload = {
        user_id: userId,
        company_txn_id: ctxn.id,
        b2b_company_id: account.id,
        fuel_type: fuelType,
        liters,
        unit_price: unitPrice,
        charges,
        total_amount: totalAmt,
        invoice_no: invoiceNo || null,
        truck_no: truckNo || null,
        supplier: COMPANY_DISPLAY_NAME,
        purchase_date: purchDate,
        notes
      };
      if (account.company_id) stockPurchasePayload.company_id = account.company_id;
      const { error: spErr } = await sb().from('stock_purchases').insert([stockPurchasePayload]);
      if (spErr) console.warn('stock_purchases:', spErr.message);

      const stockEntryPayload = {
        user_id: userId,
        fuel_type: fuelType === 'Mobil Oil' ? 'Mobil' : fuelType,
        entry_type: 'purchase',
        liters,
        unit_price: unitPrice,
        price_per_liter: unitPrice,
        total_cost: totalAmt,
        total_amount: totalAmt,
        charges,
        net_payable: totalAmt + charges,
        supplier: COMPANY_DISPLAY_NAME,
        supplier_name: COMPANY_DISPLAY_NAME,
        invoice_no: invoiceNo || null,
        invoice_number: invoiceNo || null,
        truck_no: truckNo || null,
        truck_number: truckNo || null,
        purchase_date: purchDate,
        notes
      };
      if (account.company_id) stockEntryPayload.company_id = account.company_id;
      const { error: seErr } = await sb().from('stock_entries').insert([stockEntryPayload]);
      if (seErr) console.warn('stock_entries:', seErr.message);

      showToast('success', 'Purchase Recorded!', `${fuelType} ${fmt(liters)}L — Rs.${fmt(totalAmt + charges)} ✓`);
      closeModal('stockPurchaseModal');
      await window.loadCompanySummary();
      await window.loadCompanyTransactions();
      await window.loadStockHistory();
    } catch (e) {
      alert('Error: ' + e.message + '\n\nAgar column error aaye to COMPANY_ACCOUNT_FINAL_FIX.sql Supabase mein run karein.');
    }
  };

  // ============================================================
  // Member Card Usage
  // ============================================================
  window.handleMemberCardUsage = async function () {
    const memberId = parseInt(el('mcu-member-id')?.value) || 0;
    const memberName = el('mcu-search')?.value || '';
    const fuelType = el('mcu-fuel-type')?.value;
    const liters = num(el('mcu-liters')?.value);
    const unitPrice = num(el('mcu-unit-price')?.value);
    const atmCharge = num(el('mcu-atm-charges')?.value);
    const miscCharge = num(el('mcu-misc-charges')?.value);
    const usageDate = el('mcu-date')?.value || isoToday();
    const notes = el('mcu-notes')?.value?.trim() || '';

    if (!memberId) { alert('Member search box mein naam ya SR No likho, phir list mein se select karein'); return; }
    if (!fuelType) { alert('Fuel type select karein'); return; }
    if (liters <= 0) { alert('Liters enter karein'); return; }
    if (unitPrice <= 0) { alert('Unit price enter karein'); return; }

    const stockValue = liters * unitPrice;
    const totalCharges = atmCharge + miscCharge;

    try {
      const userId = await getCurrentUserId();
      const account = await getCompanyAccount();

      const { data: ctxn, error: cErr } = await sb().from('company_transactions').insert([{
        ...companyTxnBasePayload(account, userId),
        txn_type: 'member_usage', direction: 'out',
        amount: stockValue, charges: totalCharges,
        fuel_type: fuelType, liters, unit_price: unitPrice,
        member_id: memberId, txn_date: usageDate,
        description: `${memberName} card — ${fuelType} ${fmt(liters)}L`,
        notes
      }]).select().single();
      if (cErr) throw cErr;

      const usagePayload = {
        user_id: userId,
        b2b_company_id: account.id,
        member_id: memberId,
        company_txn_id: ctxn.id,
        fuel_type: fuelType,
        liters,
        unit_price: unitPrice,
        stock_value: stockValue,
        atm_charges: atmCharge,
        misc_charges: miscCharge,
        total_charges: totalCharges,
        usage_date: usageDate,
        notes
      };
      if (account.company_id) usagePayload.company_id = account.company_id;
      const { error: uErr } = await sb().from('member_card_usage').insert([usagePayload]);
      if (uErr) throw uErr;

      showToast('success', 'Usage Recorded!', `${memberName} — Rs.${fmt(stockValue + totalCharges)} deducted ✓`);
      closeModal('memberCardModal');
      if (ddMcu) ddMcu.reset();
      await window.loadCompanySummary();
      await window.loadCompanyTransactions();
      await window.loadMemberUsageSummary();
    } catch (e) {
      alert('Error: ' + e.message + '\n\nAgar column error aaye to COMPANY_ACCOUNT_FINAL_FIX.sql Supabase mein run karein.');
    }
  };

  // ============================================================
  // Repayment
  // ============================================================
  window.handleRepayment = async function () {
    const amount = num(el('rp-amount')?.value);
    const payMode = el('rp-payment-mode')?.value;
    const refNo = el('rp-reference-no')?.value?.trim() || '';
    const payDate = el('rp-date')?.value || isoToday();
    const notes = el('rp-notes')?.value?.trim() || '';

    if (amount <= 0) { alert('Amount enter karein'); return; }
    if (!payMode) { alert('Payment method select karein'); return; }

    try {
      const userId = await getCurrentUserId();
      const account = await getCompanyAccount();
      const txnType = payMode === 'check' ? 'repayment_check' : payMode === 'online' ? 'repayment_online' : payMode === 'cash' ? 'repayment_cash' : 'repayment_other';

      const { data: ctxn, error: cErr } = await sb().from('company_transactions').insert([{
        ...companyTxnBasePayload(account, userId),
        txn_type: txnType, direction: 'in',
        amount, charges: 0, payment_mode: payMode,
        reference_no: refNo || null, txn_date: payDate,
        description: `Repayment via ${payMode}${refNo ? ' — Ref: ' + refNo : ''}`,
        notes
      }]).select().single();
      if (cErr) throw cErr;

      const repayPayload = {
        user_id: userId,
        b2b_company_id: account.id,
        company_txn_id: ctxn.id,
        amount,
        payment_mode: payMode,
        reference_no: refNo || null,
        payment_date: payDate,
        notes,
        verified: true
      };
      if (account.company_id) repayPayload.company_id = account.company_id;
      const { error: rErr } = await sb().from('company_repayments').insert([repayPayload]);
      if (rErr) throw rErr;

      showToast('success', 'Repayment Recorded!', `Rs.${fmt(amount)} via ${payMode} ✓`);
      closeModal('repaymentModal');
      await window.loadCompanySummary();
      await window.loadCompanyTransactions();
      await window.loadRepaymentHistory();
    } catch (e) {
      alert('Error: ' + e.message + '\n\nAgar repayment save ho kar show nahi ho rahi thi, COMPANY_ACCOUNT_FINAL_FIX.sql run karein.');
    }
  };

  // ============================================================
  // Expense Entry
  // ============================================================
  window.handleDualRoleExpense = async function () {
    const accountId = parseInt(el('dre-account-id')?.value) || 0;
    const amount = num(el('dre-amount')?.value);
    const expType = el('dre-expense-type')?.value;
    const desc = el('dre-description')?.value?.trim();
    const paidFrom = el('dre-paid-from')?.value;
    const expDate = el('dre-date')?.value || isoToday();

    if (!accountId) { alert('Account search mein naam ya SR No likho, phir select karein'); return; }
    if (amount <= 0) { alert('Amount enter karein'); return; }
    if (!expType) { alert('Category select karein'); return; }
    if (!desc) { alert('Description enter karein'); return; }
    if (!paidFrom) { alert('Paid From search mein source select karein'); return; }

    try {
      const userId = await getCurrentUserId();

      const expensePayload = {
        user_id: userId,
        customer_id: accountId,
        transaction_type: 'Expense',
        amount,
        charges: amount,
        expense_type: expType,
        expense_account: paidFrom,
        description: `${expType}: ${desc}`,
        created_at: expDate + 'T00:00:00+05:00'
      };
      const { error: e1 } = await sb().from('transactions').insert([expensePayload]);
      if (e1) throw e1;

      const ledgerPayload = {
        user_id: userId,
        customer_id: accountId,
        transaction_type: 'Credit',
        amount,
        charges: amount,
        description: `Expense payment: ${expType} — ${desc}`,
        created_at: expDate + 'T00:00:00+05:00'
      };
      const { error: e2 } = await sb().from('transactions').insert([ledgerPayload]);
      if (e2) throw e2;

      const { data: acc } = await sb().from('customers').select('balance').eq('id', accountId).single();
      const { error: e3 } = await sb().from('customers').update({ balance: num(acc?.balance) + amount }).eq('id', accountId);
      if (e3) throw e3;

      showToast('success', 'Expense Recorded!', `Rs.${fmt(amount)} — ${expType} — Expense + Ledger update ✓`);
      closeModal('dualExpenseModal');
      if (ddDre) ddDre.reset();
      if (ddPaid) ddPaid.reset();
      await window.loadExpenseLedger();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  // ============================================================
  // Calculators
  // ============================================================
  window.calcStockTotal = function () {
    const total = num(el('sp-liters')?.value) * num(el('sp-unit-price')?.value) + num(el('sp-charges')?.value);
    const box = el('sp-total-display');
    if (box) { box.textContent = total > 0 ? `Total: Rs. ${fmt(total)}` : ''; box.style.display = total > 0 ? 'block' : 'none'; }
  };

  window.calcMcuTotal = function () {
    const total = num(el('mcu-liters')?.value) * num(el('mcu-unit-price')?.value) + num(el('mcu-atm-charges')?.value) + num(el('mcu-misc-charges')?.value);
    const box = el('mcu-total-display');
    if (box) { box.textContent = total > 0 ? `Grand Total: Rs. ${fmt(total)}` : ''; box.style.display = total > 0 ? 'block' : 'none'; }
  };

  window.setSpFuelPrice = function () {
    const prices = window.fuelPrices || window.config?.FUEL_PRICES || {};
    const p = prices[el('sp-fuel-type')?.value] || 0;
    if (p && el('sp-unit-price')) el('sp-unit-price').value = p;
    window.calcStockTotal();
  };

  window.setMcuFuelPrice = function () {
    const prices = window.fuelPrices || window.config?.FUEL_PRICES || {};
    const p = prices[el('mcu-fuel-type')?.value] || 0;
    if (p && el('mcu-unit-price')) el('mcu-unit-price').value = p;
    window.calcMcuTotal();
  };

  // ============================================================
  // Tab Loaders
  // ============================================================
  window.loadStockHistory = async function () {
    const tbody = el('stock-breakdown-table');
    if (!tbody) return;
    try {
      const account = await getCompanyAccount();
      const { data, error } = await sb().from('v_stock_by_fuel').select('*').eq('b2b_company_id', account.id);
      if (error) throw error;
      if (!data?.length) { tbody.innerHTML = '<tr><td colspan="7" class="text-center py-3 text-muted">Koi stock nahi</td></tr>'; return; }
      let gt = 0;
      tbody.innerHTML = data.map(r => {
        gt += num(r.total_net_payable);
        return `<tr>
          <td class="fw-bold">${esc(r.fuel_type)}</td><td>${esc(r.purchase_count || 0)}</td>
          <td>${fmt(r.total_liters)} L</td><td>Rs. ${fmt(r.avg_unit_price)}</td>
          <td>Rs. ${fmt(r.total_value)}</td><td class="text-danger">Rs. ${fmt(r.total_charges)}</td>
          <td class="fw-bold text-danger">Rs. ${fmt(r.total_net_payable)}</td>
        </tr>`;
      }).join('') + `<tr class="table-secondary fw-bold"><td colspan="6" class="text-end">TOTAL:</td><td class="text-danger">Rs. ${fmt(gt)}</td></tr>`;
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-danger text-center py-2">${esc(e.message)}</td></tr>`;
    }
  };

  window.loadMemberUsageSummary = async function () {
    const tbody = el('member-usage-summary-table');
    if (!tbody) return;
    try {
      const account = await getCompanyAccount();
      const { data, error } = await sb().from('v_member_usage_summary').select('*').eq('b2b_company_id', account.id);
      if (error) throw error;
      if (!data?.length) { tbody.innerHTML = '<tr><td colspan="8" class="text-center py-3 text-muted">Koi usage nahi</td></tr>'; return; }
      let gt = 0;
      tbody.innerHTML = data.map((r, i) => {
        gt += num(r.grand_total);
        return `<tr>
          <td>${i + 1}</td><td class="fw-bold">#${esc(r.member_no)} ${esc(r.member_name)}</td><td>${esc(r.fuel_type || '-')}</td>
          <td>${esc(r.usage_count || 0)}</td><td>${fmt(r.total_liters)} L</td>
          <td>Rs. ${fmt(r.stock_value)}</td><td class="text-warning">Rs. ${fmt(r.total_charges)}</td>
          <td class="fw-bold text-danger">Rs. ${fmt(r.grand_total)}</td>
        </tr>`;
      }).join('') + `<tr class="table-secondary fw-bold"><td colspan="7" class="text-end">TOTAL:</td><td class="text-danger">Rs. ${fmt(gt)}</td></tr>`;
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-danger text-center py-2">${esc(e.message)}</td></tr>`;
    }
  };

  window.loadRepaymentHistory = async function () {
    const tbody = el('repayment-history-table');
    if (!tbody) return;
    try {
      const account = await getCompanyAccount();
      const { data, error } = await sb()
        .from('company_repayments')
        .select('*')
        .eq('b2b_company_id', account.id)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      let total = 0;
      if (!data?.length) { tbody.innerHTML = '<tr><td colspan="7" class="text-center py-3 text-muted">Koi repayment nahi</td></tr>'; setText('repayment-total', '—'); return; }
      tbody.innerHTML = data.map((r, i) => {
        total += num(r.amount);
        const mode = r.payment_mode || '-';
        return `<tr>
          <td>${i + 1}</td><td style="font-size:12px;">${dateOnly(r.payment_date)}</td>
          <td class="fw-bold text-success">Rs. ${fmt(r.amount)}</td>
          <td><span class="badge ${mode === 'check' ? 'bg-success' : 'bg-primary'}">${esc(mode)}</span></td>
          <td style="font-size:12px;">${esc(r.reference_no || '-')}</td>
          <td style="font-size:12px;">${esc(r.notes || '-')}</td>
          <td><span class="badge ${r.verified === false ? 'bg-warning text-dark' : 'bg-success'}">${r.verified === false ? '⏳ Pending' : '✅ Verified'}</span></td>
        </tr>`;
      }).join('');
      setText('repayment-total', 'Rs. ' + fmt(total));
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-danger text-center py-2">${esc(e.message)}</td></tr>`;
    }
  };

  window.loadExpenseLedger = async function () {
    const tbody = el('expense-ledger-table');
    if (!tbody) return;
    try {
      const { data, error } = await sb().from('v_expense_ledger').select('*').limit(100);
      if (error) throw error;
      if (!data?.length) { tbody.innerHTML = '<tr><td colspan="7" class="text-center py-3 text-muted">Koi expense nahi</td></tr>'; return; }
      tbody.innerHTML = data.map(r => `<tr>
        <td style="font-size:12px;">${dateOnly(r.expense_date || r.created_at)}</td>
        <td class="fw-bold">#${esc(r.account_no || '-')}</td>
        <td>${esc(r.account_name || r.customer_name || '-')}${r.is_expense_also ? '<span class="badge bg-warning text-dark ms-1" style="font-size:10px;">DUAL</span>' : ''}</td>
        <td style="font-size:12px;">${esc(r.category || '-')}</td>
        <td class="fw-bold text-danger">Rs. ${fmt(r.amount)}</td>
        <td style="font-size:12px;color:#555;">${esc(r.description || '-')}</td>
        <td style="font-size:12px;">${esc(r.paid_from || '-')}</td>
      </tr>`).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-danger text-center py-2">${esc(e.message)}</td></tr>`;
    }
  };

  // ============================================================
  // Delete
  // ============================================================
  window.deleteCompanyTxn = async function (id) {
    if (!confirm('Is transaction ko delete karein?')) return;
    try {
      const { error } = await sb().from('company_transactions').delete().eq('id', id);
      if (error) throw error;
      showToast('success', 'Deleted', 'Transaction delete ho gaya!');
      await window.loadCompanyTransactions();
      await window.loadCompanySummary();
      await window.loadRepaymentHistory();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  // ============================================================
  // Print Statement — prints only the clean statement, not screenshot/UI
  // ============================================================
  window.printCompanyStatement = async function () {
    try {
      const account = await getCompanyAccount();
      await window.loadCompanySummary();

      let q = sb().from('company_transactions')
        .select('*')
        .eq('b2b_company_id', account.id)
        .order('txn_date', { ascending: true })
        .order('created_at', { ascending: true });
      const from = el('cfilter-date-from')?.value;
      const to = el('cfilter-date-to')?.value;
      const type = el('cfilter-type')?.value;
      if (from) q = q.gte('txn_date', from);
      if (to) q = q.lte('txn_date', to);
      if (type) q = q.eq('txn_type', type);
      const { data, error } = await q;
      if (error) throw error;

      const txns = data || [];
      const initial = num(lastCompanySummary?.initial_credit || account.initial_credit);
      let balance = initial;
      let debitTotal = 0;
      let creditTotal = 0;

      const rows = [];
      rows.push({
        postingDate: account.initial_posting_date || from || account.initial_opening_date || isoToday(),
        docDate: account.initial_document_date || account.initial_opening_date || from || isoToday(),
        docNo: account.initial_document_no || 'OPENING',
        reference: account.initial_reference_no || '',
        docType: account.initial_doc_type || 'OP',
        description: account.initial_description || 'Opening / Initial Credit',
        opening: initial,
        openingClosing: `Open: ${dateOnly(account.initial_opening_date || from || isoToday())}${account.initial_closing_date ? '<br>Close: ' + dateOnly(account.initial_closing_date) : ''}<br>Rs.${fmt(initial)}`,
        debit: 0,
        credit: 0,
        balance
      });

      txns.forEach(t => {
        const net = Math.abs(num(t.net_amount) || (num(t.amount) + num(t.charges)) || 0);
        const isDebit = t.direction === 'out';
        const debit = isDebit ? net : 0;
        const credit = isDebit ? 0 : net;
        debitTotal += debit;
        creditTotal += credit;
        balance += debit - credit;
        const cfg = txnConfig(t.txn_type);
        rows.push({
          postingDate: t.posting_date || t.created_at || t.txn_date,
          docDate: t.document_date || t.txn_date,
          docNo: t.document_no || docNoFor(t, rows.length),
          reference: referenceFor(t),
          docType: t.doc_type || docTypeFor(t),
          description: (t.description || cfg.label || t.txn_type || '').replace(/[📦💳🏦📋✅⚙️]/g, '').trim(),
          opening: 0,
          openingClosing: t.opening_date || t.closing_date ? `Open: ${dateOnly(t.opening_date || t.txn_date)}${t.closing_date ? '<br>Close: ' + dateOnly(t.closing_date) : ''}` : '0.00',
          debit,
          credit,
          balance
        });
      });

      const period = `${from || 'Start'} to ${to || isoToday()}`;
      const summaryRows = rows.reduce((acc, r) => {
        const key = r.description || 'Other';
        acc[key] = (acc[key] || 0) + r.debit - r.credit;
        return acc;
      }, {});

      const html = `<!doctype html><html><head><meta charset="utf-8"><title>GO Company Statement</title>
<style>
@page{size:A4 portrait;margin:10mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;background:#fff}.sheet{padding:4mm}.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #222;padding-bottom:6px;margin-bottom:8px}.brand h1{font-family:Georgia,serif;font-size:24px;margin:0;font-style:italic}.brand .sub{font-size:11px;font-weight:700}.meta{text-align:right;font-size:11px;line-height:1.5}.box{border:1px solid #333;padding:7px;margin:7px 0;font-size:12px}.statement-title{text-align:center;font-weight:800;font-size:15px;margin:8px 0;text-transform:uppercase}table{width:100%;border-collapse:collapse;font-size:10.5px}th,td{border:1px solid #333;padding:4px 5px;vertical-align:middle}th{background:#e9ecef;font-weight:800;text-align:center;-webkit-print-color-adjust:exact;print-color-adjust:exact}.num{text-align:right;font-family:Courier New,monospace}.desc{font-weight:600}.debit{background:#ffd6e1;-webkit-print-color-adjust:exact;print-color-adjust:exact}.credit{background:#ffe1a8;-webkit-print-color-adjust:exact;print-color-adjust:exact}.fuel{background:#e8ff6a;-webkit-print-color-adjust:exact;print-color-adjust:exact}.total-row td{font-weight:800;background:#f1f3f5}.summary{margin-top:16px;width:55%;font-size:11px}.sign{margin-top:28px;text-align:right;font-size:12px}.muted{color:#555}.no-print{margin:12px 0;text-align:center}@media print{.no-print{display:none}}
</style></head><body><div class="sheet">
<div class="no-print"><button onclick="window.print()" style="padding:8px 18px;font-weight:700">Print Statement</button></div>
<div class="top"><div class="brand"><div style="font-size:20px;font-weight:800">GO</div><h1>Khalid &amp; Sons<br>Petroleum Services</h1><div class="sub">GO Pump · Account No. ${GO_ACCOUNT_SR_NO}</div></div><div class="meta"><strong>Print Date:</strong> ${dateOnly(new Date())}<br><strong>Period:</strong> ${esc(period)}<br><strong>Account:</strong> ${esc(account.name || COMPANY_DISPLAY_NAME)}</div></div>
<div class="box"><strong>To:</strong> ${esc(account.name || COMPANY_DISPLAY_NAME)}<br><strong>From:</strong> ${esc(from || 'Opening')} &nbsp;&nbsp; <strong>To:</strong> ${esc(to || isoToday())}</div>
<div class="statement-title">Company Account Statement</div>
<table><thead><tr><th>Posting Date</th><th>Document Date</th><th>Document No.</th><th>Reference</th><th>Doc Type</th><th>Description</th><th>Opening / Closing</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead><tbody>
${rows.map(r => `<tr><td>${dateOnly(r.postingDate)}</td><td>${dateOnly(r.docDate)}</td><td>${esc(r.docNo)}</td><td>${esc(r.reference || '')}</td><td style="text-align:center">${esc(r.docType)}</td><td class="desc ${r.docType === 'FL' ? 'fuel' : ''}">${esc(r.description)}</td><td class="num">${r.openingClosing || (r.opening ? fmt(r.opening) : '0.00')}</td><td class="num ${r.debit ? 'debit' : ''}">${r.debit ? fmt(r.debit) : '0.00'}</td><td class="num ${r.credit ? 'credit' : ''}">${r.credit ? fmt(r.credit) : '0.00'}</td><td class="num">${fmt(r.balance)}</td></tr>`).join('')}
<tr class="total-row"><td colspan="7" style="text-align:right">TOTAL</td><td class="num">${fmt(debitTotal)}</td><td class="num">${fmt(creditTotal)}</td><td class="num">${fmt(balance)}</td></tr>
</tbody></table>
<table class="summary"><thead><tr><th>Summary</th><th>Amount</th></tr></thead><tbody>${Object.entries(summaryRows).slice(0,8).map(([k,v])=>`<tr><td>${esc(k)}</td><td class="num">${fmt(v)}</td></tr>`).join('')}<tr class="total-row"><td>Total Closing Balance</td><td class="num">${fmt(balance)}</td></tr></tbody></table>
<div class="sign">Authorized Signature ____________________</div>
<div class="muted" style="font-size:10px;margin-top:8px">Generated by PetroFlow · This print contains only statement data, not the full application screenshot.</div>
</div><script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script></body></html>`;

      const w = window.open('', '_blank', 'width=1100,height=800');
      if (!w) { alert('Popup blocked. Browser mein popups allow karein.'); return; }
      w.document.write(html);
      w.document.close();
    } catch (e) {
      alert('Print error: ' + e.message);
    }
  };

  // ============================================================
  // Modal / Events / Init
  // ============================================================
  function closeModal(id) {
    const m = el(id); if (!m) return;
    const inst = bootstrap.Modal.getInstance(m);
    if (inst) inst.hide();
    const f = m.querySelector('form'); if (f) f.reset();
    m.querySelectorAll('.sd-input').forEach(i => i.value = '');
    m.querySelectorAll('.sd-list').forEach(l => l.style.display = 'none');
    m.querySelectorAll('.sd-clear').forEach(c => c.style.display = 'none');
    m.querySelectorAll('input[type="hidden"]').forEach(h => h.value = '');
    m.querySelectorAll('.sd-balance-info').forEach(b => b.textContent = '');
    m.querySelectorAll('.total-box').forEach(b => { b.textContent = ''; b.style.display = 'none'; });
  }

  function setupEvents() {
    el('initialCreditForm')?.addEventListener('submit', e => { e.preventDefault(); window.handleInitialCredit(); });
    el('stockPurchaseForm')?.addEventListener('submit', e => { e.preventDefault(); window.handleStockPurchase(); });
    el('memberCardForm')?.addEventListener('submit', e => { e.preventDefault(); window.handleMemberCardUsage(); });
    el('repaymentForm')?.addEventListener('submit', e => { e.preventDefault(); window.handleRepayment(); });
    el('dualExpenseForm')?.addEventListener('submit', e => { e.preventDefault(); window.handleDualRoleExpense(); });

    el('sp-liters')?.addEventListener('input', window.calcStockTotal);
    el('sp-unit-price')?.addEventListener('input', window.calcStockTotal);
    el('sp-charges')?.addEventListener('input', window.calcStockTotal);
    el('sp-fuel-type')?.addEventListener('change', window.setSpFuelPrice);
    el('mcu-liters')?.addEventListener('input', window.calcMcuTotal);
    el('mcu-unit-price')?.addEventListener('input', window.calcMcuTotal);
    el('mcu-atm-charges')?.addEventListener('input', window.calcMcuTotal);
    el('mcu-misc-charges')?.addEventListener('input', window.calcMcuTotal);
    el('mcu-fuel-type')?.addEventListener('change', window.setMcuFuelPrice);

    el('btn-apply-company-filter')?.addEventListener('click', () => {
      window.loadCompanyTransactions({
        dateFrom: el('cfilter-date-from')?.value,
        dateTo: el('cfilter-date-to')?.value,
        type: el('cfilter-type')?.value,
      });
    });
    el('btn-clear-company-filter')?.addEventListener('click', () => {
      ['cfilter-date-from', 'cfilter-date-to', 'cfilter-type'].forEach(id => { if (el(id)) el(id).value = ''; });
      window.loadCompanyTransactions();
    });

    document.querySelectorAll('.modal').forEach(m => {
      m.addEventListener('show.bs.modal', async () => {
        const today = isoToday();
        m.querySelectorAll('input[type="date"]').forEach(i => { if (!i.value) i.value = today; });
        if (m.id === 'initialCreditModal') await window.loadCompanySummary();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (document.body.getAttribute('data-page') !== 'company-account') return;

    await new Promise(resolve => {
      function check() { if (window.supabaseClient) return resolve(); setTimeout(check, 100); }
      check();
    });

    setupEvents();
    await loadAllDropdowns();
    await window.loadCompanySummary();
    await window.loadCompanyTransactions();
    await window.loadRepaymentHistory();
    console.log('✅ GO Company Account ready');
  });

})();
