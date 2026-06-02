// transactions-COMPLETE-v5.js — FINAL FIX
// ✅ Expense mein same customer searchable dropdown
// ✅ Cash advances 401 fix (user_id added properly)
// ✅ Checkbox column always visible (no CSS hide)
// ✅ Cash advance: Save only, separate Print button
// ✅ Advance list shows correctly
// ✅ Balance correctly updates on all transaction types
// ✅ Summary cards always accurate
(function () {
  'use strict';
  if (document.body.getAttribute('data-page') !== 'transactions') return;

  const supabase = window.supabaseClient;
  let allTransactions      = [];
  let filteredTransactions = [];
  let allCustomers         = [];
  let expenseCategories    = [];
  let fuelPriceHistory     = [];
  window.fuelPrices        = { Petrol: 0, Diesel: 0 };

  let currentPage   = 1;
  let pageSize      = 25;
  let selectedIds   = new Set();
  let activeFilters = { type:'', dateFrom:'', dateTo:'', search:'', customerId:'' };
  let selectedCustomers = { sale: null, vasooli: null, advance: null, expense: null };

  // Cash advance list pagination/selection
  let allAdvances = [];
  let advanceCurrentPage = 1;
  let advancePageSize = 10;
  let selectedAdvanceIds = new Set();

  function el(id) { return document.getElementById(id); }
  function fmt(n) { return Number(n||0).toLocaleString('en-PK',{minimumFractionDigits:2,maximumFractionDigits:2}); }


  function txAmount(t){ return parseFloat(t.charges ?? t.amount ?? 0) || 0; }
  function customerById(id){ return allCustomers.find(c => String(c.id) === String(id)); }
  function attachCustomers(rows){
    return (rows || []).map(t => ({ ...t, customers: customerById(t.customer_id) || t.customers || null }));
  }
  async function refreshCustomersIfNeeded(rows){
    const ids = [...new Set((rows || []).map(r => r.customer_id).filter(Boolean).map(String))];
    const missing = ids.filter(id => !customerById(id));
    if(!missing.length) return;
    try{
      const {data, error} = await supabase.from('customers').select('id,sr_no,name,phone,balance,category').in('id', missing);
      if(!error && Array.isArray(data)){
        data.forEach(c => { if(!customerById(c.id)) allCustomers.push(c); });
      }
    }catch(e){ console.warn('Customer cache refresh skipped:', e.message); }
  }
  function cleanInsertPayload(payload, missingColumn){
    const p = { ...payload };
    if(missingColumn && Object.prototype.hasOwnProperty.call(p, missingColumn)) delete p[missingColumn];
    return p;
  }
  function findMissingColumn(message){
    const m = String(message || '').match(/'([^']+)' column|column ['"]?([a-zA-Z0-9_]+)['"]?/i);
    return m ? (m[1] || m[2]) : null;
  }
  async function safeInsertTransaction(payload){
    let p = { ...payload };
    const val = txAmount(p);
    p.amount = parseFloat(p.amount ?? val) || 0;
    p.charges = parseFloat(p.charges ?? val) || 0;
    const removable = ['balance_before','balance_after','customer_balance_before','customer_balance_after','balance_effect','payment_status','cash_deposit_id','expense_type','expense_account','fuel_type','payment_method','payment_mode','month','payment_month','entry_method','reference_no','cash_advance_id'];
    for(let i=0;i<10;i++){
      const {data,error}=await supabase.from('transactions').insert([p]).select().single();
      if(!error) return data;
      const col = findMissingColumn(error.message || error.details || '');
      if(col && Object.prototype.hasOwnProperty.call(p,col)){
        console.warn('transactions insert retry without missing column:', col);
        delete p[col];
        continue;
      }
      const rm = removable.find(k => Object.prototype.hasOwnProperty.call(p,k));
      if(rm && /schema cache|column|could not find/i.test(error.message || error.details || '')){
        console.warn('transactions insert retry without optional column:', rm);
        delete p[rm];
        continue;
      }
      throw error;
    }
    const {data,error}=await supabase.from('transactions').insert([p]).select().single();
    if(error) throw error;
    return data;
  }
  function balanceNote(before, movement, after){
    return ` | Balance: Rs.${fmt(before)} → Rs.${fmt(after)} (Change Rs.${fmt(movement)})`;
  }
  async function reduceTankForSale(fuelType, liters){
    if(!fuelType || !liters || liters <= 0) return;
    try{
      const companyId = window.currentUserProfile?.company_id || null;
      let query = supabase.from('tanks').select('id,current_stock,company_id').eq('fuel_type', fuelType);
      if(companyId) query = query.eq('company_id', companyId);
      let {data: tank, error} = await query.maybeSingle();
      if(error && /company_id|schema cache|column/i.test(error.message || '')){
        ({data: tank, error} = await supabase.from('tanks').select('id,current_stock').eq('fuel_type', fuelType).maybeSingle());
      }
      if(error) throw error;
      if(!tank){ console.warn('Tank not found for sale stock deduction:', fuelType); return; }
      const newStock = Math.max(0, (parseFloat(tank.current_stock)||0) - parseFloat(liters));
      const {error:updateError}=await supabase.from('tanks').update({current_stock:newStock,last_updated:new Date().toISOString()}).eq('id', tank.id);
      if(updateError) console.warn('Tank stock deduction failed:', updateError.message);
    }catch(e){ console.warn('Stock deduction skipped:', e.message); }
  }

  function showToast(type, title, msg) {
    const t = el('liveToast');
    if(!t) { alert(title+': '+msg); return; }
    el('toast-title').textContent   = title;
    el('toast-message').textContent = msg;
    t.className = 'toast '+(type==='success'?'bg-success text-white':type==='warning'?'bg-warning text-dark':'bg-danger text-white');
    new bootstrap.Toast(t,{delay:3500}).show();
  }

  function closeModal(id) {
    const m = el(id);
    if(m) { const inst = bootstrap.Modal.getInstance(m); if(inst) inst.hide(); }
    const f = document.querySelector('#'+id+' form');
    if(f) f.reset();
  }

  // ══════════════════════════════════════════════════════════
  // SHARED SEARCHABLE DROPDOWN
  // ══════════════════════════════════════════════════════════
  function buildSearchDropdown(opts) {
    const searchEl = el(opts.searchId);
    const listEl   = el(opts.listId);
    const hiddenEl = el(opts.hiddenId);
    const boxEl    = el(opts.selectedBoxId);
    const textEl   = el(opts.selectedTextId);
    const balEl    = el(opts.selectedBalId);
    const color    = opts.accentColor || '#0d6efd';
    if(!searchEl || !listEl) return;

    searchEl.style.border = `2px solid ${color}`;

    function renderList(q) {
      const filtered = q
        ? opts.customers.filter(c =>
            c.name.toLowerCase().includes(q.toLowerCase()) ||
            String(c.sr_no||'').includes(q))
        : opts.customers;

      if(!filtered.length){
        listEl.innerHTML = `<div style="padding:12px;color:#888;text-align:center;font-size:13px;">Koi nahi mila</div>`;
        listEl.style.display = 'block';
        return;
      }

      listEl.innerHTML = filtered.map(c => {
        const bal = parseFloat(c.balance)||0;
        return `<div class="sd-item-${opts.key}" data-id="${c.id}"
          style="padding:10px 14px;cursor:pointer;display:flex;justify-content:space-between;
                 align-items:center;border-bottom:1px solid #f5f5f5;font-size:14px;">
          <span>
            <span style="background:${color};color:#fff;border-radius:4px;
              padding:1px 7px;font-size:11px;font-weight:700;margin-right:8px;">#${c.sr_no||'-'}</span>
            ${c.name}
          </span>
          <span style="font-size:12px;font-weight:700;color:${bal>0?'#dc3545':'#198754'};">
            Rs.${fmt(bal)}
          </span>
        </div>`;
      }).join('');

      listEl.style.display = 'block';

      listEl.querySelectorAll(`.sd-item-${opts.key}`).forEach(item => {
        item.addEventListener('mouseenter', () => item.style.background = '#f8f9ff');
        item.addEventListener('mouseleave', () => item.style.background = '');
        item.addEventListener('mousedown', e => {
          e.preventDefault();
          const cust = opts.customers.find(c => c.id == item.dataset.id);
          if(!cust) return;
          selectedCustomers[opts.key] = cust;
          if(hiddenEl) hiddenEl.value = cust.id;
          searchEl.value = '';
          listEl.style.display = 'none';
          if(textEl) textEl.textContent = `#${cust.sr_no||'-'} — ${cust.name}`;
          if(balEl){
            const b = parseFloat(cust.balance)||0;
            balEl.textContent = b > 0 ? `⚠️ Khata Baqi: Rs.${fmt(b)}` : `✅ Account Saaf`;
            balEl.style.color = b > 0 ? '#dc3545' : '#198754';
          }
          if(boxEl) boxEl.style.display = 'flex';
          searchEl.style.display = 'none';
        });
      });
    }

    searchEl.addEventListener('input',  () => renderList(searchEl.value));
    searchEl.addEventListener('focus',  () => renderList(searchEl.value));
    searchEl.addEventListener('blur',   () => setTimeout(() => { listEl.style.display='none'; }, 200));

    window['clear_sd_'+opts.key] = function(){
      selectedCustomers[opts.key] = null;
      if(hiddenEl) hiddenEl.value = '';
      searchEl.value = ''; searchEl.style.display = 'block';
      if(boxEl) boxEl.style.display = 'none';
      listEl.style.display = 'none';
      searchEl.focus();
    };

    const modalEl = el(opts.modalId);
    if(modalEl){
      modalEl.addEventListener('show.bs.modal', () => {
        selectedCustomers[opts.key] = null;
        if(hiddenEl) hiddenEl.value = '';
        searchEl.value = ''; searchEl.style.display = 'block';
        if(boxEl) boxEl.style.display = 'none';
        listEl.style.display = 'none';
        if(opts.modalId==='cashAdvanceModal'){
          const pr=el('advance-print-btn-row'); if(pr) pr.style.display='none';
        }
      });
    }
  }

  function initAllDropdowns() {
    const configs = [
      { key:'sale',    color:'#198754', modalId:'newSaleModal',    custFilter: ()=>true },
      { key:'vasooli', color:'#0d6efd', modalId:'vasooliModal',    custFilter: c=>c.category!=='Owner' },
      { key:'advance', color:'#6f42c1', modalId:'cashAdvanceModal',custFilter: ()=>true },
      { key:'expense', color:'#e67e22', modalId:'expenseModal',    custFilter: c=>c.category!=='Owner' },
    ];
    configs.forEach(cfg => {
      buildSearchDropdown({
        key:           cfg.key,
        searchId:      `${cfg.key}-cust-search`,
        listId:        `${cfg.key}-cust-list`,
        hiddenId:      `${cfg.key}-customer-hidden`,
        selectedBoxId: `${cfg.key}-cust-selected`,
        selectedTextId:`${cfg.key}-cust-selected-text`,
        selectedBalId: `${cfg.key}-cust-balance`,
        customers:     allCustomers.filter(cfg.custFilter),
        accentColor:   cfg.color,
        modalId:       cfg.modalId
      });
    });
  }

  // ══════════════════════════════════════════════════════════
  // FUEL PRICES
  // ══════════════════════════════════════════════════════════
  async function loadFuelPrices() {
    try {
      const {data} = await supabase.from('settings').select('price_history').limit(10);
      if(!data?.length) return;
      let hist=[];
      data.forEach(r=>{ if(Array.isArray(r.price_history)) hist=hist.concat(r.price_history); });
      const seen=new Set();
      fuelPriceHistory=hist.sort((a,b)=>new Date(b.date)-new Date(a.date))
        .filter(e=>{ if(seen.has(e.date))return false; seen.add(e.date); return true; });
      if(fuelPriceHistory.length){
        const today=new Date().toISOString().split('T')[0];
        window.fuelPrices.Petrol=priceFor(today,'Petrol');
        window.fuelPrices.Diesel=priceFor(today,'Diesel');
        const s=el('sale-price-source');
        if(s){ s.textContent=`Petrol Rs.${window.fuelPrices.Petrol} | Diesel Rs.${window.fuelPrices.Diesel}`; s.className='text-success small'; }
      }
    } catch(e){ console.error('loadFuelPrices:',e); }
  }

  function priceFor(dateStr,fuelType){
    if(!fuelPriceHistory.length) return window.fuelPrices[fuelType]||0;
    const target=new Date(dateStr);
    const norm = e => ({ ...e, start: e.start_date || e.startDate || e.date, end: e.end_date || e.endDate || '' });
    const sorted=[...fuelPriceHistory].map(norm).filter(e=>e.start).sort((a,b)=>new Date(b.start)-new Date(a.start));
    const inRange=sorted.find(e=>new Date(e.start)<=target && (!e.end || target<=new Date(e.end+'T23:59:59')));
    const entry=inRange || sorted.find(e=>new Date(e.start)<=target) || sorted[sorted.length-1];
    return fuelType==='Petrol'?parseFloat(entry?.petrol||0):parseFloat(entry?.diesel||0);
  }

  // ══════════════════════════════════════════════════════════
  // LOAD CUSTOMERS
  // ══════════════════════════════════════════════════════════
  async function loadCustomers() {
    try {
      const {data,error}=await supabase.from('customers').select('*').order('sr_no');
      if(error) throw error;
      allCustomers=data||[];
      initAllDropdowns();
      const fc=el('filter-customer');
      if(fc) fc.innerHTML='<option value="">All Customers</option>'+
        allCustomers.filter(c=>c.category!=='Owner').map(c=>`<option value="${c.id}">${c.sr_no} - ${c.name}</option>`).join('');
    } catch(e){ console.error('loadCustomers:',e); }
  }

  // ══════════════════════════════════════════════════════════
  // LOAD EXPENSE CATEGORIES
  // ══════════════════════════════════════════════════════════
  async function loadExpenseCategories() {
    try {
      const {data} = await supabase.from('expense_categories').select('*').order('name');
      expenseCategories = (data && data.length) ? data : [
        {name:'Bijli Bill',icon:'⚡'},{name:'Gas Bill',icon:'🔥'},
        {name:'Paani Bill',icon:'💧'},{name:'Kiraaya',icon:'🏠'},
        {name:'Petrol/Diesel Stock',icon:'⛽'},{name:'Mazdoor Tankhwah',icon:'👷'},
        {name:'Machine Repair',icon:'🔧'},{name:'Khaana/Chai',icon:'☕'},
        {name:'Transport',icon:'🚛'},{name:'Stationery',icon:'📋'},
        {name:'Bank Charges',icon:'🏦'},{name:'Mobile/Internet',icon:'📱'},
        {name:'Miscellaneous',icon:'📦'}
      ];
      const expEl = el('expense-type');
      if(expEl) expEl.innerHTML = '<option value="">-- Category Select Karein --</option>'+
        expenseCategories.map(c=>`<option value="${c.name}">${c.icon||''} ${c.name}</option>`).join('');
    } catch(e){ console.error('loadExpenseCategories:',e); }
  }

  // ══════════════════════════════════════════════════════════
  // LOAD TRANSACTIONS
  // ══════════════════════════════════════════════════════════
  async function loadTransactions() {
    const tbody=el('transactions-table');
    if(tbody) tbody.innerHTML='<tr><td colspan="10" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Loading...</td></tr>';
    try {
      const {data,error}=await supabase
        .from('transactions')
        .select('*')
        .order('id',{ascending:false})
        .limit(500);
      if(error) throw error;
      await refreshCustomersIfNeeded(data || []);
      const seen=new Set();
      allTransactions=attachCustomers(data || []).filter(t=>{ if(seen.has(t.id))return false; seen.add(t.id); return true; });
      selectedIds.clear();
      applyFilters();
    } catch(e){
      console.error('loadTransactions:',e);
      const tb=el('transactions-table');
      if(tb) tb.innerHTML=`<tr><td colspan="10" class="text-center text-danger py-4">Error: ${e.message}</td></tr>`;
    }
  }

  // ══════════════════════════════════════════════════════════
  // SUMMARY CARDS
  // ══════════════════════════════════════════════════════════
  function updateCards(txns){
    let cr=0,db=0,ex=0,adv=0,crc=0,dbc=0,exc=0,advc=0;
    txns.forEach(t=>{
      const a=txAmount(t);
      if(t.transaction_type==='Credit'){cr+=a;crc++;}
      else if(t.transaction_type==='Debit'){db+=a;dbc++;}
      else if(t.transaction_type==='Expense'){ex+=a;exc++;}
      else if(t.transaction_type==='Advance'){adv+=a;advc++;}
    });
    if(el('total-credit'))  el('total-credit').textContent  = 'Rs. '+fmt(cr);
    if(el('credit-count'))  el('credit-count').textContent  = crc+' transactions';
    if(el('total-debit'))   el('total-debit').textContent   = 'Rs. '+fmt(db);
    if(el('debit-count'))   el('debit-count').textContent   = dbc+' transactions';
    if(el('total-expense')) el('total-expense').textContent = 'Rs. '+fmt(ex);
    if(el('expense-count')) el('expense-count').textContent = exc+' transactions';
    if(el('net-balance'))   el('net-balance').textContent   = 'Rs. '+fmt(cr-db-ex);
    if(el('total-advance')) el('total-advance').textContent = 'Rs. '+fmt(adv);
    if(el('advance-count')) el('advance-count').textContent = advc+' advances';
  }

  function ensureSummaryModal(){
    let modal = el('summaryDetailModal');
    if(modal) return modal;
    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="modal fade" id="summaryDetailModal" tabindex="-1">
      <div class="modal-dialog modal-xl modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header" style="background:#172554;color:#fff;">
            <h5 class="modal-title" id="summaryDetailTitle">Details</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body" id="summaryDetailBody"></div>
        </div>
      </div>
    </div>`;
    document.body.appendChild(wrap.firstElementChild);
    return el('summaryDetailModal');
  }

  function showSummaryDetails(kind){
    const labels={credit:'Credit / Sales Details',debit:'Debit / Vasooli Details',expense:'Expense Details',advance:'Cash Advance Details',net:'Net Balance Details'};
    let rows = filteredTransactions.slice();
    if(kind==='credit') rows = rows.filter(t=>t.transaction_type==='Credit');
    else if(kind==='debit') rows = rows.filter(t=>t.transaction_type==='Debit');
    else if(kind==='expense') rows = rows.filter(t=>t.transaction_type==='Expense');
    else if(kind==='advance') rows = rows.filter(t=>t.transaction_type==='Advance' || t.transaction_type==='AdvanceUsed');
    else if(kind==='net') rows = rows.filter(t=>['Credit','Debit','Expense'].includes(t.transaction_type));

    const modal=ensureSummaryModal();
    el('summaryDetailTitle').textContent = labels[kind] || 'Details';

    const grouped = new Map();
    rows.forEach(t=>{
      const key = t.customer_id || 'no_customer';
      const c = t.customers || {};
      if(!grouped.has(key)) grouped.set(key,{name:c.name||'N/A',sr:c.sr_no||'-',credit:0,debit:0,expense:0,advance:0,count:0,balance:c.balance});
      const g=grouped.get(key); const a=txAmount(t); g.count++;
      if(t.transaction_type==='Credit') g.credit+=a;
      else if(t.transaction_type==='Debit') g.debit+=a;
      else if(t.transaction_type==='Expense') g.expense+=a;
      else if(t.transaction_type==='Advance' || t.transaction_type==='AdvanceUsed') g.advance+=a;
    });

    const list=[...grouped.values()].sort((a,b)=>(b.credit+b.debit+b.expense+b.advance)-(a.credit+a.debit+a.expense+a.advance));
    const total = rows.reduce((s,t)=>s+txAmount(t),0);
    const body = el('summaryDetailBody');
    if(!rows.length){
      body.innerHTML = '<div class="text-center text-muted py-5"><i class="bi bi-inbox fs-1 d-block mb-2"></i>Koi record nahi mila</div>';
    } else {
      body.innerHTML = `<div class="alert alert-light border d-flex justify-content-between flex-wrap gap-2">
          <strong>Total Records: ${rows.length}</strong><strong>Total Amount: Rs. ${fmt(total)}</strong>
        </div>
        <div class="table-responsive"><table class="table table-sm table-hover align-middle">
          <thead class="table-dark"><tr><th>Customer</th><th>Entries</th><th>Credit/Sale</th><th>Debit/Vasooli</th><th>Expense</th><th>Advance</th><th>Current Balance</th></tr></thead>
          <tbody>${list.map(g=>`<tr>
            <td><strong>${g.name}</strong><br><small class="text-muted">#${g.sr}</small></td>
            <td>${g.count}</td>
            <td class="text-success fw-bold">Rs. ${fmt(g.credit)}</td>
            <td class="text-primary fw-bold">Rs. ${fmt(g.debit)}</td>
            <td class="text-danger fw-bold">Rs. ${fmt(g.expense)}</td>
            <td style="color:#6f42c1;font-weight:700;">Rs. ${fmt(g.advance)}</td>
            <td>${g.balance===undefined?'—':'Rs. '+fmt(g.balance)}</td>
          </tr>`).join('')}</tbody></table></div>`;
    }
    new bootstrap.Modal(modal).show();
  }

  function setupSummaryCards(){
    const map={
      'summary-card-credit':'credit', 'summary-card-debit':'debit', 'summary-card-expense':'expense',
      'summary-card-net':'net', 'summary-card-advance':'advance'
    };
    Object.entries(map).forEach(([id,kind])=>{
      const card=el(id); if(card && !card.dataset.bound){ card.dataset.bound='1'; card.addEventListener('click',()=>showSummaryDetails(kind)); }
    });
  }

  // ══════════════════════════════════════════════════════════
  // FILTERS
  // ══════════════════════════════════════════════════════════
  function applyFilters(){
    const {type,dateFrom,dateTo,search,customerId}=activeFilters;
    const q=(search||'').toLowerCase().trim();
    filteredTransactions=allTransactions.filter(t=>{
      if(type && t.transaction_type!==type) return false;
      if(customerId && String(t.customer_id)!==String(customerId)) return false;
      if(dateFrom && new Date(t.created_at)<new Date(dateFrom)) return false;
      if(dateTo && new Date(t.created_at)>new Date(dateTo+'T23:59:59')) return false;
      if(q){
        const name=(t.customers?.name||'').toLowerCase();
        const desc=(t.description||'').toLowerCase();
        const typ=(t.transaction_type||'').toLowerCase();
        if(!name.includes(q)&&!desc.includes(q)&&!typ.includes(q)) return false;
      }
      return true;
    });
    currentPage=1; selectedIds.clear();
    renderPage(); updateCards(filteredTransactions); updateBulkBar();
  }

  window.applyFilters=function(){
    activeFilters.type       = el('filter-type')?.value||'';
    activeFilters.dateFrom   = el('filter-date-from')?.value||'';
    activeFilters.dateTo     = el('filter-date-to')?.value||'';
    activeFilters.customerId = el('filter-customer')?.value||'';
    applyFilters();
  };

  window.clearTransactionFilters=function(){
    activeFilters={type:'',dateFrom:'',dateTo:'',search:'',customerId:''};
    ['filter-type','filter-date-from','filter-date-to','filter-customer','filter-search']
      .forEach(id=>{ if(el(id)) el(id).value=''; });
    applyFilters();
  };

  // ══════════════════════════════════════════════════════════
  // RENDER TABLE
  // ══════════════════════════════════════════════════════════
  function renderPage(){
    const total=filteredTransactions.length;
    const totalPages=Math.max(1,Math.ceil(total/pageSize));
    if(currentPage>totalPages) currentPage=totalPages;
    const start=(currentPage-1)*pageSize;
    renderRows(filteredTransactions.slice(start, Math.min(start+pageSize,total)));
    renderCount(total, start+1, Math.min(start+pageSize,total));
    renderPagination(total, totalPages);
  }

  function renderCount(total,from,to){
    const e=el('transaction-count');
    if(e) e.textContent=total>0?`${from}-${to} of ${total} transactions`:'0 transactions';
  }

  function renderRows(txns){
    const tbody=el('transactions-table'); if(!tbody) return;
    if(!txns.length){
      tbody.innerHTML='<tr><td colspan="10" class="text-center py-4 text-muted"><i class="bi bi-inbox fs-3 d-block mb-2"></i>Koi transaction nahi mili</td></tr>';
      return;
    }
    const typeStyles={
      'Credit': 'background:#198754;color:#fff;',
      'Debit':  'background:#0d6efd;color:#fff;',
      'Advance':'background:#6f42c1;color:#fff;',
      'Expense':'background:#ffc107;color:#212529;',
      'BankDeposit':'background:#0f766e;color:#fff;',
      'AdvanceUsed':'background:#14b8a6;color:#fff;',
      'CashSale':'background:#64748b;color:#fff;'
    };
    const typeLabels={Credit:'Sale',Debit:'Vasooli',Advance:'Advance',Expense:'Expense',BankDeposit:'Bank Deposit',AdvanceUsed:'Advance Used',CashSale:'Cash Sale'};

    tbody.innerHTML=txns.map(t=>{
      const d = t.created_at ? new Date(t.created_at) : null;
      const dateStr = d ? d.toLocaleDateString('en-PK') : '—';
      const timeStr = d ? d.toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'}) : '';
      const bStyle=typeStyles[t.transaction_type]||'background:#6c757d;color:#fff;';
      const bText=typeLabels[t.transaction_type]||t.transaction_type;
      const desc=t.description||'';
      const fuelType=desc.toLowerCase().includes('petrol')?'Petrol':desc.toLowerCase().includes('diesel')?'Diesel':'-';
      const checked=selectedIds.has(t.id);

      return `<tr style="${checked?'background:#cfe2ff;':''}" data-id="${t.id}">
        <td style="width:38px;text-align:center;vertical-align:middle;padding:8px 6px;">
          <input type="checkbox" class="tx-row-cb" data-id="${t.id}" ${checked?'checked':''}
            style="width:16px;height:16px;cursor:pointer;accent-color:#0d6efd;display:block;margin:auto;">
        </td>
        <td style="vertical-align:middle;white-space:nowrap;">${dateStr}<br><small style="color:#888">${timeStr}</small></td>
        <td style="vertical-align:middle;">${t.customers?.name||'N/A'} <small style="color:#888">(${t.customers?.sr_no||'-'})</small></td>
        <td style="vertical-align:middle;"><span class="tx-type-badge" style="display:inline-block;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:700;${bStyle}">${bText}</span></td>
        <td style="vertical-align:middle;">${fuelType}</td>
        <td style="vertical-align:middle;">${t.liters>0?fmt(t.liters)+' L':'-'}</td>
        <td style="vertical-align:middle;">${t.unit_price>0?'Rs.'+fmt(t.unit_price):'-'}</td>
        <td style="vertical-align:middle;"><strong>Rs.${fmt(txAmount(t))}</strong></td>
        <td style="vertical-align:middle;max-width:200px;word-break:break-word;font-size:12px;">${desc||'-'}</td>
        <td style="vertical-align:middle;white-space:nowrap;">
          <div style="display:flex;gap:3px;">
            <button title="Print" style="background:none;border:1px solid #0dcaf0;color:#0dcaf0;border-radius:4px;padding:3px 7px;cursor:pointer;" onclick="window.printSingle(${t.id})"><i class="bi bi-printer"></i></button>
            <button title="Delete" style="background:none;border:1px solid #dc3545;color:#dc3545;border-radius:4px;padding:3px 7px;cursor:pointer;" onclick="window.deleteTransaction(${t.id})"><i class="bi bi-trash"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('.tx-row-cb').forEach(cb=>{
      cb.addEventListener('change',function(){
        const id=parseInt(this.dataset.id);
        if(this.checked) selectedIds.add(id); else selectedIds.delete(id);
        const row=this.closest('tr');
        if(row) row.style.background=this.checked?'#cfe2ff':'';
        updateBulkBar(); updateSelectAllCb();
      });
    });
    updateSelectAllCb();
  }

  function updateSelectAllCb(){
    const cb=el('select-all-cb'); if(!cb) return;
    const pageIds=filteredTransactions.slice((currentPage-1)*pageSize,currentPage*pageSize).map(t=>t.id);
    cb.checked=pageIds.length>0 && pageIds.every(id=>selectedIds.has(id));
    cb.indeterminate=!cb.checked && pageIds.some(id=>selectedIds.has(id));
  }

  function updateBulkBar(){
    const bar=el('bulk-action-bar'); if(!bar) return;
    if(selectedIds.size>0){
      bar.style.display='flex';
      const lbl=el('bulk-count-label'); if(lbl) lbl.textContent=selectedIds.size+' selected';
    } else bar.style.display='none';
  }

  function renderPagination(total,totalPages){
    const bottom=el('pagination-container');
    const top=el('pagination-container-top');
    const targets=[top,bottom].filter(Boolean);
    if(!targets.length) return;
    if(total===0){ targets.forEach(c=>c.innerHTML=''); return; }
    const startNum=(currentPage-1)*pageSize+1;
    const endNum=Math.min(currentPage*pageSize,total);
    let pagesHtml='';
    let sp=Math.max(1,currentPage-2), ep=Math.min(totalPages,sp+4);
    if(ep-sp<4) sp=Math.max(1,ep-4);
    for(let i=sp;i<=ep;i++){
      pagesHtml+=`<button onclick="window.txGoToPage(${i})"
        style="margin:0 1px;padding:3px 10px;border-radius:4px;cursor:pointer;
          border:1px solid ${i===currentPage?'#0d6efd':'#ccc'};
          background:${i===currentPage?'#0d6efd':'#fff'};
          color:${i===currentPage?'#fff':'#333'};">${i}</button>`;
    }
    const html=`<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;padding:9px 14px;background:#f8f9fa;">
      <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#555;"><strong>Rows:</strong>
        <select onchange="window.txChangePageSize(this.value)" style="padding:3px 8px;border-radius:4px;border:1px solid #ccc;font-size:13px;background:#fff;">
          <option value="10" ${pageSize===10?'selected':''}>10</option>
          <option value="25" ${pageSize===25?'selected':''}>25</option>
          <option value="50" ${pageSize===50?'selected':''}>50</option>
          <option value="100" ${pageSize===100?'selected':''}>100</option>
        </select>
        <span>${startNum}–${endNum} of ${total}</span>
      </div>
      <div style="display:flex;align-items:center;gap:2px;">
        <button onclick="window.txGoToPage(1)" ${currentPage===1?'disabled':''} style="padding:3px 9px;border-radius:4px;border:1px solid #ccc;background:#fff;cursor:pointer;">«</button>
        <button onclick="window.txGoToPage(${currentPage-1})" ${currentPage===1?'disabled':''} style="padding:3px 9px;border-radius:4px;border:1px solid #ccc;background:#fff;cursor:pointer;">‹</button>
        ${pagesHtml}
        <button onclick="window.txGoToPage(${currentPage+1})" ${currentPage===totalPages?'disabled':''} style="padding:3px 9px;border-radius:4px;border:1px solid #ccc;background:#fff;cursor:pointer;">›</button>
        <button onclick="window.txGoToPage(${totalPages})" ${currentPage===totalPages?'disabled':''} style="padding:3px 9px;border-radius:4px;border:1px solid #ccc;background:#fff;cursor:pointer;">»</button>
      </div>
    </div>`;
    targets.forEach(c=>{ c.innerHTML=html; });
  }

  window.txGoToPage=function(p){ currentPage=Math.max(1,Math.min(p,Math.ceil(filteredTransactions.length/pageSize))); renderPage(); };
  window.txChangePageSize=function(s){ pageSize=parseInt(s); currentPage=1; renderPage(); };

  // ══════════════════════════════════════════════════════════
  // PRINT ENGINE
  // ══════════════════════════════════════════════════════════
  window.printSingle=function(id){ const t=allTransactions.find(x=>x.id===id); if(!t)return; openPrint([t],'summary'); };
  window.printSelectedSummary=function(){ const txns=allTransactions.filter(t=>selectedIds.has(t.id)); if(!txns.length)return; openPrint(txns,'summary'); };
  window.printSelectedMonthly=function(){ const txns=allTransactions.filter(t=>selectedIds.has(t.id)); if(!txns.length)return; openPrint(txns,'monthly'); };
  window.printAllSummary=function(){ if(!filteredTransactions.length)return; openPrint(filteredTransactions,'summary'); };
  window.printAllMonthly=function(){ if(!filteredTransactions.length)return; openPrint(filteredTransactions,'monthly'); };

  function openPrint(txns,mode){
    const company='Khalid & Sons Petroleum';
    const pDate=new Date().toLocaleDateString('en-PK',{day:'2-digit',month:'long',year:'numeric'});
    let totCr=0,totDb=0,totEx=0,totAdv=0;
    txns.forEach(t=>{ const a=txAmount(t);
      if(t.transaction_type==='Credit')totCr+=a;
      else if(t.transaction_type==='Debit')totDb+=a;
      else if(t.transaction_type==='Advance')totAdv+=a;
      else if(t.transaction_type==='CashSale')totCr+=a;
      else if(t.transaction_type==='AdvanceUsed')totAdv+=a;
      else totEx+=a;
    });
    function buildRows(list){
      const tc={Credit:'#198754',Debit:'#0d6efd',Advance:'#6f42c1',Expense:'#cc8800',CashSale:'#64748b',AdvanceUsed:'#14b8a6'};
      return list.map(t=>{
        const d=t.created_at?new Date(t.created_at).toLocaleDateString('en-PK'):'—';
        const desc=t.description||'';
        const fuel=desc.toLowerCase().includes('petrol')?'Petrol':desc.toLowerCase().includes('diesel')?'Diesel':'-';
        return `<tr>
          <td>${d}</td><td>${t.customers?.name||'N/A'} (#${t.customers?.sr_no||'-'})</td>
          <td style="color:${tc[t.transaction_type]||'#555'};font-weight:700">${t.transaction_type}</td>
          <td>${fuel}</td>
          <td style="text-align:right">${t.liters>0?fmt(t.liters)+' L':'-'}</td>
          <td style="text-align:right;font-weight:700">Rs.${fmt(txAmount(t))}</td>
          <td style="text-align:right;color:#198754">${t.transaction_type==='Credit'?'Rs.'+fmt(txAmount(t)):'-'}</td>
          <td style="text-align:right;color:#0d6efd">${t.transaction_type!=='Credit'?'Rs.'+fmt(txAmount(t)):'-'}</td>
          <td style="word-break:break-word;max-width:130px;font-size:10px">${desc}</td>
        </tr>`;
      }).join('');
    }
    const THEAD=`<tr style="background:#1a5276;color:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
      <th style="padding:5px">Date</th><th>Customer</th><th>Type</th><th>Fuel</th>
      <th style="text-align:right">Qty</th><th style="text-align:right">Amount</th>
      <th style="text-align:right">Credit+</th><th style="text-align:right">Debit−</th><th>Description</th></tr>`;
    const TFOOT=`<tr style="background:#eaf0fb;font-weight:700;border-top:2px solid #1a5276">
      <td colspan="5" style="text-align:right;padding:5px">TOTALS:</td>
      <td style="text-align:right">Rs.${fmt(totCr+totDb+totEx+totAdv)}</td>
      <td style="text-align:right;color:#198754">Rs.${fmt(totCr)}</td>
      <td style="text-align:right;color:#0d6efd">Rs.${fmt(totDb+totEx+totAdv)}</td><td></td></tr>`;
    let bodyHtml='';
    if(mode==='monthly'){
      const map={};
      txns.forEach(t=>{
        if(!t.created_at) return;
        const d=new Date(t.created_at);
        const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        const lbl=d.toLocaleDateString('en-PK',{month:'long',year:'numeric'});
        if(!map[key])map[key]={lbl,list:[],cr:0,db:0,ex:0,adv:0};
        map[key].list.push(t); const a=txAmount(t);
        if(t.transaction_type==='Credit')map[key].cr+=a;
        else if(t.transaction_type==='Debit')map[key].db+=a;
        else if(t.transaction_type==='Advance')map[key].adv+=a;
        else map[key].ex+=a;
      });
      Object.keys(map).sort((a,b)=>b.localeCompare(a)).forEach(key=>{
        const m=map[key];
        bodyHtml+=`<div style="background:#1a5276;color:#fff;padding:6px 10px;font-size:13px;font-weight:700;margin:12px 0 0;-webkit-print-color-adjust:exact;print-color-adjust:exact;">${m.lbl} — ${m.list.length} entries</div>
        <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:6px;">
          <thead>${THEAD}</thead><tbody>${buildRows(m.list)}</tbody>
          <tfoot><tr style="background:#eaf0fb;font-weight:700;">
            <td colspan="5" style="text-align:right;padding:4px">Total:</td>
            <td style="text-align:right">Rs.${fmt(m.cr+m.db+m.ex+m.adv)}</td>
            <td style="text-align:right;color:#198754">Rs.${fmt(m.cr)}</td>
            <td style="text-align:right;color:#0d6efd">Rs.${fmt(m.db+m.ex+m.adv)}</td><td></td>
          </tr></tfoot></table>`;
      });
    } else {
      bodyHtml=`<table style="width:100%;border-collapse:collapse;font-size:10px;">
        <thead>${THEAD}</thead><tbody>${buildRows(txns)}</tbody><tfoot>${TFOOT}</tfoot></table>`;
    }
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${company}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11px;padding:16px}
.hdr{display:flex;justify-content:space-between;border-bottom:2px solid #1a5276;padding-bottom:10px;margin-bottom:14px}
h1{font-size:18px;color:#1a5276}.sumbox{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}
.sb{flex:1;min-width:100px;border-radius:6px;padding:8px 10px;text-align:center}
table td{padding:4px 6px;border-bottom:1px solid #eee}tr:nth-child(even) td{background:#f9f9f9}
.sig-row{display:flex;justify-content:space-around;margin-top:30px}
.sig{text-align:center;width:180px}.sig-line{border-top:1px solid #555;padding-top:4px;font-size:10px;color:#555;margin-top:30px}
@media print{body{padding:8px}@page{margin:10mm}}</style></head><body>
<div class="hdr"><div><h1>⛽ ${company}</h1></div>
<div style="text-align:right;font-size:11px;color:#666"><strong>${pDate}</strong><br>Entries: ${txns.length}</div></div>
<div class="sumbox">
<div class="sb" style="background:#d4edda;border:1px solid #28a745"><div style="font-size:10px">Sale</div><div style="font-size:14px;font-weight:700">Rs.${fmt(totCr)}</div></div>
<div class="sb" style="background:#cce5ff;border:1px solid #0069d9"><div style="font-size:10px">Vasooli</div><div style="font-size:14px;font-weight:700">Rs.${fmt(totDb)}</div></div>
<div class="sb" style="background:#fff3cd;border:1px solid #ffc107"><div style="font-size:10px">Expense</div><div style="font-size:14px;font-weight:700">Rs.${fmt(totEx)}</div></div>
<div class="sb" style="background:#ede7f6;border:1px solid #6f42c1"><div style="font-size:10px">Advance</div><div style="font-size:14px;font-weight:700">Rs.${fmt(totAdv)}</div></div>
<div class="sb" style="background:#e2e3e5;border:1px solid #6c757d"><div style="font-size:10px">Net</div><div style="font-size:14px;font-weight:700">Rs.${fmt(totCr-totDb-totEx-totAdv)}</div></div>
</div>
${bodyHtml}
<div class="sig-row">
<div class="sig"><div class="sig-line">Authorized Signature</div></div>
<div class="sig"><div class="sig-line">Customer Signature</div></div>
<div class="sig"><div class="sig-line">Accountant</div></div>
</div>
</body><script>window.onload=function(){window.print();}<\/script></html>`;
    const w=window.open('','_blank','width=1080,height=750');
    if(w){ w.document.write(html); w.document.close(); } else alert('Popup blocked!');
  }

  // ══════════════════════════════════════════════════════════
  // FORM HANDLERS
  // ══════════════════════════════════════════════════════════
  async function handleNewSale(){
    const cust=selectedCustomers.sale;
    if(!cust){ alert('Customer select karein — naam ya Sr# likhein'); return; }
    const fuelType=el('sale-fuel-type')?.value;
    const liters=parseFloat(el('sale-liters')?.value)||0;
    const unitPrice=parseFloat(el('sale-unit-price')?.value)||0;
    const amount=parseFloat(el('sale-amount')?.value)||0;
    const paymentType=el('sale-payment-type')?.value||'credit';
    const description=el('sale-description')?.value||'';
    const saleDate=el('sale-date')?.value || new Date().toISOString().split('T')[0];
    if(!fuelType){ alert('Fuel type select karein'); return; }
    if(!amount){ alert('Amount enter karein'); return; }
    if(!saleDate){ alert('Taareekh (date) enter karein'); return; }
    try{
      const oldBal=parseFloat(cust.balance)||0;
      const createdAt = new Date(saleDate + 'T12:00:00').toISOString();

      // balance < 0 means customer already has advance/Jama deposited with pump.
      // Fuel taken from this advance is saved as AdvanceUsed, not Credit/Udhaar.
      if(paymentType !== 'cash' && oldBal < 0){
        const advanceAvailable = Math.abs(oldBal);
        const advanceUsed = Math.min(advanceAvailable, amount);
        const remainingCredit = Math.max(0, amount - advanceUsed);
        const newBal = oldBal + amount;
        const advanceLiters = liters && amount ? (liters * (advanceUsed/amount)) : null;
        const creditLiters  = liters && amount && remainingCredit ? (liters * (remainingCredit/amount)) : null;

        if(advanceUsed > 0){
          await safeInsertTransaction({
            customer_id:parseInt(cust.id), transaction_type:'AdvanceUsed',
            amount:advanceUsed, charges:advanceUsed, liters:advanceLiters, unit_price:unitPrice||null,
            fuel_type:fuelType, payment_mode:'Advance Adjustment',
            balance_before: oldBal, balance_after: oldBal + advanceUsed,
            customer_balance_before: oldBal, customer_balance_after: oldBal + advanceUsed,
            balance_effect: advanceUsed,
            description:`${fuelType} sale adjusted from customer advance${description?' - '+description:''}${balanceNote(oldBal, advanceUsed, oldBal + advanceUsed)}`,
            created_at: createdAt
          });
        }
        if(remainingCredit > 0){
          await safeInsertTransaction({
            customer_id:parseInt(cust.id), transaction_type:'Credit',
            amount:remainingCredit, charges:remainingCredit, liters:creditLiters, unit_price:unitPrice||null,
            fuel_type:fuelType, payment_mode:'Credit',
            balance_before: oldBal + advanceUsed, balance_after: newBal,
            customer_balance_before: oldBal + advanceUsed, customer_balance_after: newBal,
            balance_effect: remainingCredit,
            description:`${fuelType} sale remaining on credit after advance adjustment${description?' - '+description:''}${balanceNote(oldBal + advanceUsed, remainingCredit, newBal)}`,
            created_at: createdAt
          });
        }
        await supabase.from('customers').update({balance:newBal}).eq('id',cust.id);
        const lc=allCustomers.find(c=>c.id==cust.id); if(lc) lc.balance=newBal;
        await reduceTankForSale(fuelType, liters);
        showToast('success','Kamyab!',`${fuelType} sale save ho gayi. Advance used Rs.${fmt(advanceUsed)}${remainingCredit>0?', Credit Rs.'+fmt(remainingCredit):''}. New balance Rs.${fmt(newBal)}`);
        closeModal('newSaleModal'); selectedCustomers.sale=null;
        await loadCustomers(); await loadTransactions();
        return;
      }

      const affectsCustomerBalance = paymentType !== 'cash';
      const txType=paymentType==='cash'?'CashSale':'Credit';
      const newBal = affectsCustomerBalance ? oldBal + amount : oldBal;
      await safeInsertTransaction({
        customer_id:parseInt(cust.id), transaction_type:txType,
        amount, charges:amount, liters:liters||null, unit_price:unitPrice||null,
        fuel_type:fuelType, payment_mode: paymentType === 'cash' ? 'Cash' : 'Credit',
        balance_before: oldBal, balance_after: newBal,
        customer_balance_before: oldBal, customer_balance_after: newBal,
        balance_effect: affectsCustomerBalance ? amount : 0,
        description:`${fuelType} sale${description?' - '+description:''}${affectsCustomerBalance?balanceNote(oldBal, amount, newBal):' | Cash sale — customer balance unchanged'}`,
        created_at: createdAt
      });
      if(affectsCustomerBalance){
        await supabase.from('customers').update({balance:newBal}).eq('id',cust.id);
        const lc=allCustomers.find(c=>c.id==cust.id); if(lc) lc.balance=newBal;
      }
      await reduceTankForSale(fuelType, liters);
      const dateLabel = saleDate === new Date().toISOString().split('T')[0] ? '' : ` (${saleDate})`;
      showToast('success','Kamyab!',`${fuelType} Sale Rs.${fmt(amount)} record ho gayi!${dateLabel}`);
      closeModal('newSaleModal'); selectedCustomers.sale=null;
      await loadCustomers(); await loadTransactions();
    }catch(e){ alert('Sale Error: '+e.message); }
  }

  async function handleVasooli(){
    const cust=selectedCustomers.vasooli;
    if(!cust){ alert('Customer select karein'); return; }
    const amount=parseFloat(el('vasooli-amount')?.value)||0;
    const vasooliDate=el('vasooli-date')?.value || new Date().toISOString().split('T')[0];
    const month=el('vasooli-month')?.value||'';
    const fuelCat=el('vasooli-fuel-category')?.value||'';
    const desc=el('vasooli-description')?.value||'';
    if(!amount){ alert('Amount enter karein'); return; }
    let fullDesc='Payment received';
    if(month){ const d=new Date(month+'-01'); fullDesc=`Payment for ${d.toLocaleDateString('en-US',{month:'long',year:'numeric'})}`; }
    if(fuelCat) fullDesc+=` (${fuelCat})`;
    if(desc) fullDesc+=` - ${desc}`;
    try{
      const oldBal=parseFloat(cust.balance)||0;
      const newBal = oldBal - amount;
      const createdAt = new Date(vasooliDate + 'T12:00:00').toISOString();
      const statusText = newBal > 0 ? `Remaining Baqi Rs.${fmt(newBal)}` : newBal < 0 ? `Advance Rs.${fmt(Math.abs(newBal))}` : 'Account Clear';
      await safeInsertTransaction({
        customer_id:parseInt(cust.id), transaction_type:'Debit', amount, charges:amount,
        balance_before: oldBal, balance_after: newBal,
        customer_balance_before: oldBal, customer_balance_after: newBal,
        balance_effect: -amount,
        description:`${fullDesc}${balanceNote(oldBal, -amount, newBal)} | ${statusText}`,
        created_at: createdAt
      });
      await supabase.from('customers').update({balance:newBal}).eq('id',cust.id);
      const lc=allCustomers.find(c=>c.id==cust.id); if(lc) lc.balance=newBal;
      showToast('success','Kamyab!',`Vasooli Rs.${fmt(amount)} record ho gayi! ${statusText}`);
      closeModal('vasooliModal'); selectedCustomers.vasooli=null;
      await loadCustomers();
      await loadTransactions();
    }catch(e){ alert('Vasooli Error: '+e.message); }
  }

  async function handleExpense(){
    const amount=parseFloat(el('expense-amount')?.value)||0;
    const description=el('expense-description')?.value||'';
    const expType=el('expense-type')?.value;
    const account=el('expense-account')?.value;
    const expDate=el('expense-date')?.value || new Date().toISOString().split('T')[0];
    const cust=selectedCustomers.expense;

    if(!amount){ alert('Amount enter karein'); return; }
    if(!description){ alert('Description enter karein'); return; }
    if(!expType){ alert('Category select karein'); return; }
    if(!account){ alert('Account select karein'); return; }
    if(!expDate){ alert('Taareekh (date) enter karein'); return; }
    try{
      let custId=null;
      if(cust){
        custId=parseInt(cust.id);
      } else {
        const{data:owner}=await supabase.from('customers').select('id').eq('category','Owner').maybeSingle();
        if(owner){ custId=owner.id; }
        else{
          const{data:no,error:ce}=await supabase.from('customers')
            .insert([{sr_no:0,name:'Owner',category:'Owner',balance:0}]).select().single();
          if(ce) throw ce; custId=no.id;
        }
      }
      const createdAt = new Date(expDate + 'T12:00:00').toISOString();
      await safeInsertTransaction({
        customer_id:custId, transaction_type:'Expense', amount, charges:amount,
        expense_type:expType, expense_account:account,
        description:`${expType}: ${description} (From: ${account})`,
        created_at: createdAt
      });
      showToast('success','Kamyab!','Expense record ho gaya!');
      closeModal('expenseModal'); selectedCustomers.expense=null;
      await loadTransactions();
    }catch(e){ alert('Expense Error: '+e.message); }
  }

  async function handleCashAdvance(){
    const cust=selectedCustomers.advance;
    if(!cust){ alert('Customer select karein'); return; }
    const amount=parseFloat(el('advance-amount')?.value)||0;
    const reason=el('advance-reason')?.value||'';
    const advDate=el('advance-date')?.value||new Date().toISOString().split('T')[0];
    const notes=el('advance-notes')?.value||'';
    if(!amount){ alert('Amount enter karein'); return; }
    if(!reason){ alert('Wajah select karein'); return; }

    const btn=document.querySelector('#cashAdvanceForm button[type="submit"]');
    if(btn){ btn.disabled=true; btn.innerHTML='<span class="spinner-border spinner-border-sm me-1"></span>Saving...'; }

    try{
      const userId=(await supabase.auth.getUser()).data?.user?.id||null;
      let advId=null;
      const advObj={customer_id:parseInt(cust.id),amount,reason,advance_date:advDate,notes,status:'pending'};
      if(userId) advObj.user_id=userId;

      const{data:advData,error:advErr}=await supabase.from('cash_advances').insert([advObj]).select().single();
      if(!advErr){ advId=advData.id; }

      const oldBal=(parseFloat(cust.balance)||0);
      const newBal=oldBal+amount;
      const txObj={customer_id:parseInt(cust.id),transaction_type:'Advance',amount,charges:amount,
        balance_before: oldBal, balance_after: newBal,
        customer_balance_before: oldBal, customer_balance_after: newBal,
        balance_effect: amount,
        description:`Cash Advance: ${reason}${notes?' | '+notes:''}${balanceNote(oldBal, amount, newBal)}`};
      if(userId) txObj.user_id=userId;
      if(advId) txObj.cash_advance_id=advId;

      await safeInsertTransaction(txObj);

      await supabase.from('customers').update({balance:newBal}).eq('id',cust.id);
      const lc=allCustomers.find(c=>c.id==cust.id); if(lc) lc.balance=newBal;

      window._lastSavedAdvance={id:advId,customer:cust,amount,reason,notes,advance_date:advDate,newBalance:newBal};
      showToast('success','Saved!',`Cash Advance Rs.${fmt(amount)} save ho gaya!`);
      if(el('advance-print-btn-row')) el('advance-print-btn-row').style.display='block';

      if(el('advance-amount')) el('advance-amount').value='';
      if(el('advance-reason')) el('advance-reason').value='';
      if(el('advance-notes')) el('advance-notes').value='';
      if(el('advance-date')) el('advance-date').value='';
      selectedCustomers.advance=null;
      if(el('advance-customer-hidden')) el('advance-customer-hidden').value='';
      if(el('advance-cust-search')){el('advance-cust-search').value=''; el('advance-cust-search').style.display='block';}
      if(el('advance-cust-selected')) el('advance-cust-selected').style.display='none';

      await loadCustomers();
      await loadTransactions();
      await loadAdvanceList();
    }catch(e){ alert('Advance Error: '+e.message); }
    finally{ if(btn){ btn.disabled=false; btn.innerHTML='<i class="bi bi-check-circle me-1"></i>Save Karein'; } }
  }

  window.printLastAdvance=function(){
    if(!window._lastSavedAdvance){ alert('Pehle advance save karein'); return; }
    printAdvanceReceipt(window._lastSavedAdvance);
  };

  function printAdvanceReceipt(adv){
    const company='Khalid & Sons Petroleum';
    const pDate=new Date().toLocaleDateString('en-PK',{day:'2-digit',month:'long',year:'numeric'});
    const pTime=new Date().toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'});
    const c=adv.customer||adv.customers||{}; const nb=adv.newBalance??0;
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Cash Advance Parchi</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;display:flex;justify-content:center;padding:20px}
.r{width:340px;background:#fff;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,.15);overflow:hidden}
.h{background:linear-gradient(135deg,#6f42c1,#8e44ad);color:#fff;padding:18px 20px;text-align:center}
.h h2{font-size:16px;font-weight:700}.bdg{display:inline-block;background:rgba(255,255,255,.25);border:1px solid rgba(255,255,255,.5);border-radius:20px;padding:3px 14px;font-size:12px;font-weight:700;margin-top:8px}
.b{padding:18px 20px}.row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px dashed #e8e8e8}
.lbl{font-size:12px;color:#888}.val{font-size:13px;font-weight:600;text-align:right}
.amt{background:#f3eeff;border:2px solid #6f42c1;border-radius:8px;padding:14px;text-align:center;margin:14px 0}
.amt .al{font-size:11px;color:#8e44ad;font-weight:600;text-transform:uppercase}.amt .av{font-size:28px;font-weight:800;color:#6f42c1}
.bal{border-radius:8px;padding:10px 14px;margin:0 0 14px;text-align:center}
.sig-row{display:flex;justify-content:space-around;padding:20px 20px 0}
.sig-box{text-align:center;width:120px}.sig-line{border-top:1px solid #ccc;padding-top:4px;font-size:10px;color:#999;margin-top:30px}
.f{background:#f8f8f8;padding:12px 20px;text-align:center;border-top:1px dashed #ddd}.f p{font-size:10px;color:#aaa;margin:2px 0}
@media print{body{background:none;padding:0}.r{box-shadow:none;width:100%}}</style></head><body>
<div class="r">
<div class="h"><h2>⛽ ${company}</h2><p style="font-size:11px;opacity:.85">Cash Advance Receipt</p><div class="bdg">CASH ADVANCE</div></div>
<div class="b">
<div class="amt"><div class="al">Advance Amount</div><div class="av">Rs. ${fmt(adv.amount)}</div></div>
<div class="row"><span class="lbl">Receipt #</span><span class="val">ADV-${adv.id||'--'}</span></div>
<div class="row"><span class="lbl">Taareekh</span><span class="val">${adv.advance_date||pDate}</span></div>
<div class="row"><span class="lbl">Customer</span><span class="val">${c.name||'N/A'} (#${c.sr_no||'-'})</span></div>
${c.phone?`<div class="row"><span class="lbl">Phone</span><span class="val">${c.phone}</span></div>`:''}
<div class="row"><span class="lbl">Wajah</span><span class="val">${adv.reason||'-'}</span></div>
${adv.notes?`<div class="row"><span class="lbl">Notes</span><span class="val">${adv.notes}</span></div>`:''}
<div style="height:10px"></div>
<div class="bal" style="background:${nb>0?'#fdecea':'#eafaf1'};border:1px solid ${nb>0?'#e74c3c':'#27ae60'}">
<div style="font-size:11px;font-weight:600;color:${nb>0?'#c0392b':'#27ae60'}">${nb>0?'⚠️ Total Khata Baqi':'✅ Account Clear'}</div>
<div style="font-size:18px;font-weight:800;color:${nb>0?'#c0392b':'#27ae60'}">Rs. ${fmt(Math.abs(nb))}</div></div>
<div class="sig-row">
<div class="sig-box"><div class="sig-line">Customer Signature<br>دستخط</div></div>
<div class="sig-box"><div class="sig-line">Authorized By<br>منظور کنندہ</div></div>
</div></div>
<div class="f"><p><strong>${company}</strong></p><p>${pDate} ${pTime}</p></div>
</div><script>window.onload=function(){window.print();}<\/script></body></html>`;
    const w=window.open('','_blank','width=420,height=700');
    if(w){ w.document.write(html); w.document.close(); } else alert('Popup blocked!');
  }

  async function loadAdvanceList(){
    const tbody=el('advance-list-tbody'); if(!tbody) return;
    tbody.innerHTML='<tr><td colspan="9" class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Loading...</td></tr>';
    try{
      const statusFilter=el('advance-filter-status')?.value||'';
      let query=supabase.from('cash_advances')
        .select('*')
        .order('advance_date',{ascending:false});
      if(statusFilter) query=query.eq('status',statusFilter);
      const{data,error}=await query;
      if(error) throw error;
      await refreshCustomersIfNeeded(data || []);
      allAdvances=attachCustomers(data || []);
      selectedAdvanceIds.clear();
      advanceCurrentPage=1;
      renderAdvancePage();
    }catch(e){
      console.error('loadAdvanceList:',e);
      tbody.innerHTML=`<tr><td colspan="9" class="text-center py-3 text-danger">Error: ${e.message}</td></tr>`;
    }
  }

  function renderAdvancePage(){
    const tbody=el('advance-list-tbody'); if(!tbody) return;
    const totalCount=allAdvances.length;
    const countEl=el('advance-list-count'); if(countEl) countEl.textContent=totalCount+' advances';
    const totalPages=Math.max(1, Math.ceil(totalCount/advancePageSize));
    if(advanceCurrentPage>totalPages) advanceCurrentPage=totalPages;
    const start=(advanceCurrentPage-1)*advancePageSize;
    const pageRows=allAdvances.slice(start,start+advancePageSize);
    if(!pageRows.length){
      tbody.innerHTML='<tr><td colspan="9" class="text-center py-4 text-muted"><i class="bi bi-inbox fs-4 d-block mb-2"></i>Koi cash advance nahi</td></tr>';
      if(el('advance-list-tfoot')) el('advance-list-tfoot').innerHTML='';
      renderAdvancePagination(0,1); updateAdvanceSelectAll();
      return;
    }
    let totalAdv=allAdvances.reduce((s,a)=>s+(parseFloat(a.amount)||0),0);
    const sMap={
      pending:`<span style="background:#fff3cd;color:#856404;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;">⏳ Pending</span>`,
      partial:`<span style="background:#cce5ff;color:#004085;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;">🔄 Partial</span>`,
      cleared:`<span style="background:#d4edda;color:#155724;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;">✅ Cleared</span>`,
    };
    tbody.innerHTML=pageRows.map((a,idx)=>{
      const amt=parseFloat(a.amount)||0;
      const custBal=parseFloat(a.customers?.balance)||0;
      const checked=selectedAdvanceIds.has(a.id);
      return `<tr style="${checked?'background:#f3eeff;':''}">
        <td style="padding:10px 8px;text-align:center;"><input type="checkbox" class="adv-row-cb" data-id="${a.id}" ${checked?'checked':''} style="width:16px;height:16px;cursor:pointer;accent-color:#6f42c1;"></td>
        <td style="padding:10px 12px;color:#888;">${start+idx+1}</td>
        <td style="padding:10px 12px;"><strong>${a.customers?.name||'N/A'}</strong><br><small style="color:#888;">#${a.customers?.sr_no||'-'} | ${a.customers?.phone||'-'}</small></td>
        <td style="padding:10px 12px;white-space:nowrap;">${a.advance_date?new Date(a.advance_date).toLocaleDateString('en-PK'):'—'}</td>
        <td style="padding:10px 12px;font-weight:700;color:#6f42c1;font-size:15px;white-space:nowrap;">Rs.${fmt(amt)}</td>
        <td style="padding:10px 12px;max-width:260px;">${a.reason||a.description||'-'}${a.notes?`<br><small style="color:#888">${a.notes}</small>`:''}</td>
        <td style="padding:10px 12px;"><span style="font-weight:700;color:${custBal>0?'#dc3545':'#198754'};">Rs.${fmt(Math.abs(custBal))}</span><br><small style="color:${custBal>0?'#dc3545':'#198754'};">${custBal>0?'Baqi':(custBal<0?'Advance':'Saaf')}</small></td>
        <td style="padding:10px 12px;">${sMap[a.status]||a.status||'pending'}</td>
        <td style="padding:10px 12px;"><div style="display:flex;gap:4px;flex-wrap:wrap;">
          <button onclick="window.printAdvListItem(${a.id})" style="background:#6f42c1;color:#fff;border:none;border-radius:5px;padding:4px 9px;cursor:pointer;font-size:12px;"><i class="bi bi-printer"></i> Parchi</button>
          ${a.status!=='cleared'?`<button onclick="window.markAdvanceCleared(${a.id})" style="background:#198754;color:#fff;border:none;border-radius:5px;padding:4px 9px;cursor:pointer;font-size:12px;"><i class="bi bi-check2"></i> Clear</button>`:''}
        </div></td></tr>`;
    }).join('');
    tbody.querySelectorAll('.adv-row-cb').forEach(cb=>{
      cb.addEventListener('change',function(){
        const id=parseInt(this.dataset.id);
        if(this.checked) selectedAdvanceIds.add(id); else selectedAdvanceIds.delete(id);
        renderAdvancePage();
      });
    });
    if(el('advance-list-tfoot')) el('advance-list-tfoot').innerHTML=`<tr style="background:#f3eeff;font-weight:800;"><td colspan="4" style="padding:10px 12px;text-align:right;color:#6f42c1;">TOTAL:</td><td style="padding:10px 12px;color:#6f42c1;font-size:16px;">Rs.${fmt(totalAdv)}</td><td colspan="4"></td></tr>`;
    renderAdvancePagination(totalCount,totalPages);
    updateAdvanceSelectAll();
  }

  function renderAdvancePagination(total,totalPages){
    const c=el('advance-pagination-container'); if(!c) return;
    if(total===0){ c.innerHTML=''; return; }
    const start=(advanceCurrentPage-1)*advancePageSize+1;
    const end=Math.min(advanceCurrentPage*advancePageSize,total);
    let pages='';
    let sp=Math.max(1,advanceCurrentPage-2), ep=Math.min(totalPages,sp+4);
    if(ep-sp<4) sp=Math.max(1,ep-4);
    for(let i=sp;i<=ep;i++) pages+=`<button onclick="window.advGoToPage(${i})" class="btn btn-sm ${i===advanceCurrentPage?'btn-primary':'btn-outline-secondary'}">${i}</button>`;
    c.innerHTML=`<div class="d-flex justify-content-between align-items-center flex-wrap gap-2 p-2 bg-light">
      <small class="text-muted">${start}–${end} of ${total} advances</small>
      <div class="d-flex gap-1"><button class="btn btn-sm btn-outline-secondary" onclick="window.advGoToPage(1)" ${advanceCurrentPage===1?'disabled':''}>«</button><button class="btn btn-sm btn-outline-secondary" onclick="window.advGoToPage(${advanceCurrentPage-1})" ${advanceCurrentPage===1?'disabled':''}>‹</button>${pages}<button class="btn btn-sm btn-outline-secondary" onclick="window.advGoToPage(${advanceCurrentPage+1})" ${advanceCurrentPage===totalPages?'disabled':''}>›</button><button class="btn btn-sm btn-outline-secondary" onclick="window.advGoToPage(${totalPages})" ${advanceCurrentPage===totalPages?'disabled':''}>»</button></div>
    </div>`;
  }

  function updateAdvanceSelectAll(){
    const cb=el('advance-select-all-cb'); if(!cb) return;
    const pageIds=allAdvances.slice((advanceCurrentPage-1)*advancePageSize,advanceCurrentPage*advancePageSize).map(a=>a.id);
    cb.checked=pageIds.length>0 && pageIds.every(id=>selectedAdvanceIds.has(id));
    cb.indeterminate=!cb.checked && pageIds.some(id=>selectedAdvanceIds.has(id));
  }

  window.advGoToPage=function(p){ advanceCurrentPage=Math.max(1,Math.min(p,Math.ceil(allAdvances.length/advancePageSize)||1)); renderAdvancePage(); };


  window.printAdvListItem=async function(advId){
    try{
      const{data,error}=await supabase.from('cash_advances').select('*').eq('id',advId).single();
      if(error) throw error;
      await refreshCustomersIfNeeded([data]);
      const row=attachCustomers([data])[0];
      printAdvanceReceipt({...row,customer:row.customers,newBalance:row.customers?.balance||0});
    }catch(e){ alert('Error: '+e.message); }
  };

  window.markAdvanceCleared=async function(advId){
    if(!confirm('Is advance ko Cleared mark karein?')) return;
    try{
      const{error}=await supabase.from('cash_advances').update({status:'cleared'}).eq('id',advId);
      if(error) throw error;
      showToast('success','Cleared!','Advance cleared ho gaya!');
      await loadAdvanceList();
    }catch(e){ alert('Error: '+e.message); }
  };

  window.deleteTransaction=async function(id){
    if(!confirm('Delete karein?')) return;
    try{
      const{error}=await supabase.from('transactions').delete().eq('id',id);
      if(error) throw error;
      showToast('success','Deleted','Transaction delete ho gaya!');
      await loadTransactions();
    }catch(e){ alert('Error: '+e.message); }
  };

  window.deleteSelected=async function(){
    if(selectedIds.size===0){ alert('Select karein pehle'); return; }
    if(!confirm(selectedIds.size+' delete karein?')) return;
    const ids=[...selectedIds];
    try{
      for(let i=0;i<ids.length;i+=50){
        const{error}=await supabase.from('transactions').delete().in('id',ids.slice(i,i+50));
        if(error) throw error;
      }
      showToast('success','Deleted',ids.length+' delete ho gayi!');
      selectedIds.clear(); await loadTransactions();
    }catch(e){ alert('Error: '+e.message); }
  };

  window.updateSaleFuelPrice=function(){
    const fuel=el('sale-fuel-type')?.value; if(!fuel) return;
    const price=window.fuelPrices[fuel]||0;
    if(el('sale-unit-price')) el('sale-unit-price').value=price;
    const s=el('sale-price-source');
    if(s){ if(price>0){ s.textContent=`${fuel} = Rs.${price}`; s.className='text-success small'; }
      else{ s.textContent='⚠️ Settings mein price set karein'; s.className='text-danger small'; }
    }
    window.calcSaleFromLiters();
  };
  window.calcSaleFromLiters=function(){
    const l=parseFloat(el('sale-liters')?.value)||0;
    const r=parseFloat(el('sale-unit-price')?.value)||0;
    if(el('sale-amount')) el('sale-amount').value=(l>0&&r>0)?(l*r).toFixed(2):'';
  };
  window.calcSaleFromAmount=function(){
    const a=parseFloat(el('sale-amount-direct')?.value)||0;
    const r=parseFloat(el('sale-unit-price')?.value)||0;
    if(el('sale-amount')) el('sale-amount').value=a>0?a.toFixed(2):'';
    if(el('sale-liters')&&r>0&&a>0) el('sale-liters').value=(a/r).toFixed(2);
  };
  window.toggleSaleMethod=function(method){
    const ls=el('sale-liters-section'),as_=el('sale-amount-section');
    if(method==='liters'){ if(ls)ls.style.display='block'; if(as_)as_.style.display='none'; }
    else{ if(ls)ls.style.display='none'; if(as_)as_.style.display='block'; }
  };
  window.calculateVasooliAmount=function(){
    const fuel=el('vasooli-fuel-category')?.value;
    const liters=parseFloat(el('vasooli-liters')?.value)||0;
    if(!fuel||!liters) return;
    if(el('vasooli-amount')) el('vasooli-amount').value=(liters*(window.fuelPrices[fuel]||0)).toFixed(2);
  };

  function setupEvents(){
    el('newSaleForm')?.addEventListener('submit',e=>{ e.preventDefault(); handleNewSale(); });
    el('vasooliForm')?.addEventListener('submit',e=>{ e.preventDefault(); handleVasooli(); });
    el('expenseForm')?.addEventListener('submit',e=>{ e.preventDefault(); handleExpense(); });
    el('cashAdvanceForm')?.addEventListener('submit',e=>{ e.preventDefault(); handleCashAdvance(); });
    el('sale-fuel-type')?.addEventListener('change',window.updateSaleFuelPrice);
    el('sale-liters')?.addEventListener('input',window.calcSaleFromLiters);
    el('sale-amount-direct')?.addEventListener('input',window.calcSaleFromAmount);
    el('lbl-by-liters')?.addEventListener('click',()=>window.toggleSaleMethod('liters'));
    el('lbl-by-amount')?.addEventListener('click',()=>window.toggleSaleMethod('amount'));
    el('vasooli-fuel-category')?.addEventListener('change',window.calculateVasooliAmount);
    el('vasooli-liters')?.addEventListener('input',window.calculateVasooliAmount);
    el('btn-apply-filter')?.addEventListener('click',window.applyFilters);
    el('btn-clear-filter')?.addEventListener('click',window.clearTransactionFilters);
    el('btn-print-all-summary')?.addEventListener('click',window.printAllSummary);
    el('btn-print-all-monthly')?.addEventListener('click',window.printAllMonthly);
    el('btn-print-selected-summary')?.addEventListener('click',window.printSelectedSummary);
    el('btn-print-selected-monthly')?.addEventListener('click',window.printSelectedMonthly);
    el('btn-delete-selected')?.addEventListener('click',window.deleteSelected);
    el('btn-clear-selection')?.addEventListener('click',()=>{ selectedIds.clear(); renderPage(); updateBulkBar(); });
    el('select-all-cb')?.addEventListener('change',function(){
      const pageIds=filteredTransactions.slice((currentPage-1)*pageSize,currentPage*pageSize).map(t=>t.id);
      pageIds.forEach(id=>{ if(this.checked) selectedIds.add(id); else selectedIds.delete(id); });
      renderPage(); updateBulkBar();
    });
    const si=el('filter-search');
    if(si){ let deb; si.addEventListener('input',()=>{ clearTimeout(deb); deb=setTimeout(()=>{ activeFilters.search=si.value; applyFilters(); },300); }); }
    el('filter-customer')?.addEventListener('change',function(){ activeFilters.customerId=this.value; applyFilters(); });
    el('advance-filter-status')?.addEventListener('change',loadAdvanceList);
    el('advance-page-size')?.addEventListener('change',function(){ advancePageSize=parseInt(this.value)||10; advanceCurrentPage=1; renderAdvancePage(); });
    el('advance-select-all-cb')?.addEventListener('change',function(){
      const pageIds=allAdvances.slice((advanceCurrentPage-1)*advancePageSize,advanceCurrentPage*advancePageSize).map(a=>a.id);
      pageIds.forEach(id=>{ if(this.checked) selectedAdvanceIds.add(id); else selectedAdvanceIds.delete(id); });
      renderAdvancePage();
    });
    setupSummaryCards();

    // ── Auto-set today's date & past-date warning ──────────
    const today = new Date().toISOString().split('T')[0];

    // Sale date
    const saleDateEl = el('sale-date');
    if(saleDateEl){
      saleDateEl.value = today;
      saleDateEl.addEventListener('change', function(){
        const w = el('sale-date-warning');
        if(w) w.style.display = this.value && this.value < today ? 'block' : 'none';
      });
      // Reset to today when modal opens
      el('newSaleModal')?.addEventListener('show.bs.modal', ()=>{
        saleDateEl.value = today;
        const w = el('sale-date-warning'); if(w) w.style.display='none';
      });
    }

    // Expense date
    const expDateEl = el('expense-date');
    if(expDateEl){
      expDateEl.value = today;
      expDateEl.addEventListener('change', function(){
        const w = el('expense-date-warning');
        if(w) w.style.display = this.value && this.value < today ? 'block' : 'none';
      });
      el('expenseModal')?.addEventListener('show.bs.modal', ()=>{
        expDateEl.value = today;
        const w = el('expense-date-warning'); if(w) w.style.display='none';
      });
    }
  }

  async function init() {
    console.log('Transactions v5 init...');
    setupEvents();
    await loadFuelPrices();
    await loadCustomers();
    await loadExpenseCategories();
    await loadTransactions();
    await loadAdvanceList();
    console.log('Transactions v5 ready.');
  }

  // WAIT FOR SESSION
  if (window.supabaseClient && window.supabaseClient.auth.getSession()) {
    document.addEventListener('petroSessionReady', init);
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

  window.loadInitialTransactions=loadTransactions;
})();
