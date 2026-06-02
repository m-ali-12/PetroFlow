// // ============================================================
// // transactions-COMPLETE.js — FINAL v5
// // NEW FEATURES:
// //   ✅ Searchable dropdowns (Sale + Vasooli + Cash Advance)
// //   ✅ Expense categories from DB (full list)
// //   ✅ Cash Advance section (customer sirf paisa le jata ha)
// //   ✅ All previous features intact (print, filter, pagination)
// // ============================================================
// (function () {
//   'use strict';
//   if (document.body.getAttribute('data-page') !== 'transactions') return;

//   const supabase = window.supabaseClient;
//   let allTransactions      = [];
//   let filteredTransactions = [];
//   let allCustomers         = [];
//   let expenseCategories    = [];
//   let fuelPriceHistory     = [];
//   window.fuelPrices        = { Petrol: 0, Diesel: 0 };

//   let currentPage   = 1;
//   let pageSize      = 25;
//   let selectedIds   = new Set();
//   let activeFilters = { type:'', dateFrom:'', dateTo:'', search:'', customerId:'' };

//   // ── Searchable Dropdown State ──────────────────────────────
//   // Each dropdown has: { customers: [], selected: null, inputEl, listEl, hiddenEl }
//   const dropdowns = {};

//   function el(id) { return document.getElementById(id); }
//   function fmt(n) { return Number(n||0).toLocaleString('en-PK',{minimumFractionDigits:2,maximumFractionDigits:2}); }

//   function showToast(type, title, msg) {
//     const t = el('liveToast'); if(!t) { alert(title+': '+msg); return; }
//     el('toast-title').textContent   = title;
//     el('toast-message').textContent = msg;
//     t.className = 'toast '+(type==='success'?'bg-success text-white':type==='warning'?'bg-warning text-dark':'bg-danger text-white');
//     new bootstrap.Toast(t,{delay:3500}).show();
//   }

//   function closeModal(id) {
//     const m = el(id); if(m)(bootstrap.Modal.getInstance(m)||new bootstrap.Modal(m)).hide();
//     const f = document.querySelector('#'+id+' form'); if(f)f.reset();
//     // Reset searchable dropdowns inside this modal
//     Object.values(dropdowns).forEach(dd => {
//       if (dd.container && m && m.contains(dd.container)) resetDropdown(dd);
//     });
//   }

//   // ============================================================
//   // SEARCHABLE DROPDOWN ENGINE
//   // ============================================================
//   function createSearchableDropdown(containerId, hiddenInputId, placeholder) {
//     const container = el(containerId);
//     if (!container) return null;

//     container.innerHTML = `
//       <div class="sd-wrapper" style="position:relative;">
//         <div class="sd-input-wrap" style="display:flex;align-items:center;border:1px solid #ced4da;border-radius:6px;background:#fff;overflow:hidden;">
//           <span style="padding:0 8px;color:#888;font-size:14px;">🔍</span>
//           <input type="text" class="sd-search" placeholder="${placeholder}"
//             style="border:none;outline:none;width:100%;padding:7px 4px;font-size:14px;background:transparent;"
//             autocomplete="off">
//           <span class="sd-clear" style="padding:0 8px;color:#aaa;cursor:pointer;font-size:16px;display:none;">✕</span>
//         </div>
//         <div class="sd-list" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:9999;
//           background:#fff;border:1px solid #ced4da;border-top:none;border-radius:0 0 6px 6px;
//           max-height:220px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,0.12);">
//         </div>
//         <small class="sd-balance-info" style="color:#0d6efd;font-weight:600;display:block;margin-top:3px;min-height:16px;"></small>
//       </div>`;

//     const searchEl  = container.querySelector('.sd-search');
//     const listEl    = container.querySelector('.sd-list');
//     const clearEl   = container.querySelector('.sd-clear');
//     const balanceEl = container.querySelector('.sd-balance-info');
//     const hiddenEl  = el(hiddenInputId);

//     const dd = { container, searchEl, listEl, clearEl, balanceEl, hiddenEl, selected: null, items: [] };
//     dropdowns[containerId] = dd;

//     searchEl.addEventListener('input', () => {
//       renderDropdownList(dd);
//       listEl.style.display = 'block';
//       if (searchEl.value) clearEl.style.display = 'block';
//       else clearEl.style.display = 'none';
//     });

//     searchEl.addEventListener('focus', () => {
//       renderDropdownList(dd);
//       listEl.style.display = 'block';
//     });

//     clearEl.addEventListener('click', () => resetDropdown(dd));

//     document.addEventListener('click', (e) => {
//       if (!container.contains(e.target)) listEl.style.display = 'none';
//     });

//     return dd;
//   }

//   function renderDropdownList(dd) {
//     const q = (dd.searchEl.value || '').toLowerCase().trim();
//     const items = dd.items.filter(item => {
//       if (!q) return true;
//       return item.label.toLowerCase().includes(q) ||
//              String(item.sr_no || '').includes(q);
//     });

//     if (!items.length) {
//       dd.listEl.innerHTML = '<div style="padding:10px 14px;color:#888;font-size:13px;">Koi customer nahi mila</div>';
//       return;
//     }

//     dd.listEl.innerHTML = items.map(item => `
//       <div class="sd-item" data-id="${item.id}"
//         style="padding:9px 14px;cursor:pointer;display:flex;justify-content:space-between;
//                align-items:center;font-size:14px;border-bottom:1px solid #f0f0f0;
//                ${dd.selected?.id == item.id ? 'background:#e8f0fe;font-weight:600;' : ''}">
//         <span>
//           <span style="color:#888;font-size:12px;margin-right:6px;">#${item.sr_no||'-'}</span>
//           ${item.name}
//         </span>
//         <span style="color:${item.balance > 0 ? '#dc3545' : '#198754'};font-size:12px;font-weight:600;">
//           Rs.${fmt(item.balance||0)}
//         </span>
//       </div>`).join('');

//     dd.listEl.querySelectorAll('.sd-item').forEach(itemEl => {
//       itemEl.addEventListener('mouseenter', () => itemEl.style.background = '#f8f9ff');
//       itemEl.addEventListener('mouseleave', () => {
//         itemEl.style.background = dd.selected?.id == itemEl.dataset.id ? '#e8f0fe' : '';
//       });
//       itemEl.addEventListener('click', () => {
//         const found = dd.items.find(i => i.id == itemEl.dataset.id);
//         if (found) selectDropdownItem(dd, found);
//       });
//     });
//   }

//   function selectDropdownItem(dd, item) {
//     dd.selected = item;
//     dd.searchEl.value = `#${item.sr_no||'-'} — ${item.name}`;
//     dd.clearEl.style.display = 'block';
//     dd.listEl.style.display = 'none';
//     if (dd.hiddenEl) dd.hiddenEl.value = item.id;
//     if (dd.balanceEl) {
//       dd.balanceEl.textContent = item.balance > 0
//         ? `⚠️ Baqi: Rs.${fmt(item.balance)} (Khata Baqi ha)`
//         : `✅ Baqi: Rs.${fmt(Math.abs(item.balance)||0)} (Saaf)`;
//       dd.balanceEl.style.color = item.balance > 0 ? '#dc3545' : '#198754';
//     }
//   }

//   function resetDropdown(dd) {
//     dd.selected = null;
//     dd.searchEl.value = '';
//     dd.clearEl.style.display = 'none';
//     dd.listEl.style.display = 'none';
//     if (dd.hiddenEl) dd.hiddenEl.value = '';
//     if (dd.balanceEl) dd.balanceEl.textContent = '';
//   }

//   function populateDropdown(containerId, customers) {
//     const dd = dropdowns[containerId];
//     if (!dd) return;
//     dd.items = customers.map(c => ({
//       id: c.id, name: c.name, sr_no: c.sr_no, balance: c.balance || 0
//     }));
//   }

//   // ============================================================
//   // FUEL PRICES
//   // ============================================================
//   async function loadFuelPrices() {
//     try {
//       const {data,error} = await supabase.from('settings').select('price_history').limit(10);
//       if(error||!data?.length){showToast('warning','Settings','Fuel prices settings mein set karein!');return;}
//       let hist=[];
//       data.forEach(r=>{if(Array.isArray(r.price_history))hist=hist.concat(r.price_history);});
//       const seen=new Set();
//       fuelPriceHistory=hist.sort((a,b)=>new Date(b.date)-new Date(a.date)).filter(e=>{if(seen.has(e.date))return false;seen.add(e.date);return true;});
//       if(fuelPriceHistory.length){
//         const today=new Date().toISOString().split('T')[0];
//         window.fuelPrices.Petrol=priceFor(today,'Petrol');
//         window.fuelPrices.Diesel=priceFor(today,'Diesel');
//         const s=el('sale-price-source');
//         if(s){s.textContent=`Settings: Petrol Rs.${window.fuelPrices.Petrol} | Diesel Rs.${window.fuelPrices.Diesel}`;s.className='text-success small';}
//       }
//     } catch(e){console.error('loadFuelPrices:',e);}
//   }

//   function priceFor(dateStr,fuelType){
//     if(!fuelPriceHistory.length)return window.fuelPrices[fuelType]||0;
//     const target=new Date(dateStr);
//     const sorted=[...fuelPriceHistory].sort((a,b)=>new Date(b.date)-new Date(a.date));
//     const entry=sorted.find(e=>new Date(e.date)<=target)||sorted[sorted.length-1];
//     return fuelType==='Petrol'?parseFloat(entry.petrol):parseFloat(entry.diesel);
//   }

//   // ============================================================
//   // LOAD DATA
//   // ============================================================
//   async function loadTransactions() {
//     const tbody=el('transactions-table');
//     if(tbody)tbody.innerHTML='<tr><td colspan="10" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Loading...</td></tr>';
//     try {
//       const {data,error}=await supabase
//         .from('transactions')
//         .select('*, customers(name, sr_no)')
//         .eq('user_id', window._currentUserId || (await supabase.auth.getUser()).data?.user?.id)
//         .order('created_at',{ascending:false});
//       if(error)throw error;
//       const seen=new Set();
//       allTransactions=(data||[]).filter(t=>{if(seen.has(t.id))return false;seen.add(t.id);return true;});
//       selectedIds.clear();
//       applyFilters();
//     } catch(e){
//       console.error('loadTransactions:',e);
//       const tb=el('transactions-table');
//       if(tb)tb.innerHTML='<tr><td colspan="10" class="text-center text-danger py-4">Data load error. Page refresh karein.</td></tr>';
//     }
//   }

//   async function loadCustomers() {
//     try {
//       const {data,error}=await supabase.from('customers').select('*').order('sr_no');
//       if(error)throw error;
//       allCustomers=data||[];

//       // Populate searchable dropdowns
//       populateDropdown('sale-customer-container',   allCustomers);
//       populateDropdown('vasooli-customer-container', allCustomers.filter(c=>c.category!=='Owner'));
//       populateDropdown('advance-customer-container', allCustomers); // kept for compat
//       buildAdvanceCustomerDropdown(allCustomers); // new dedicated function

//       // Regular filter dropdown (not searchable, uses standard select)
//       const fc=el('filter-customer');
//       if(fc)fc.innerHTML='<option value="">All Customers</option>'+allCustomers.map(c=>`<option value="${c.id}">${c.sr_no} - ${c.name}</option>`).join('');
//     } catch(e){console.error('loadCustomers:',e);}
//   }

//   async function loadExpenseCategories() {
//     try {
//       // Try from DB first
//       const {data} = await supabase.from('expense_categories').select('*').order('name');
//       if (data && data.length) {
//         expenseCategories = data;
//       } else {
//         // Fallback default list
//         expenseCategories = [
//           {name:'Bijli Bill',icon:'⚡'},
//           {name:'Gas Bill',icon:'🔥'},
//           {name:'Paani Bill',icon:'💧'},
//           {name:'Kiraaya',icon:'🏠'},
//           {name:'Petrol/Diesel Stock',icon:'⛽'},
//           {name:'Mazdoor Tankhwah',icon:'👷'},
//           {name:'Machine Repair',icon:'🔧'},
//           {name:'Khaana/Chai',icon:'☕'},
//           {name:'Transport',icon:'🚛'},
//           {name:'Stationery',icon:'📋'},
//           {name:'Bank Charges',icon:'🏦'},
//           {name:'Mobile/Internet',icon:'📱'},
//           {name:'Miscellaneous',icon:'📦'}
//         ];
//       }
//       // Populate expense type dropdown
//       const expEl = el('expense-type');
//       if (expEl) {
//         expEl.innerHTML = '<option value="">-- Category Select Karein --</option>' +
//           expenseCategories.map(c=>`<option value="${c.name}">${c.icon||''} ${c.name}</option>`).join('');
//       }
//     } catch(e) {
//       console.error('loadExpenseCategories:', e);
//     }
//   }

//   // ============================================================
//   // SUMMARY CARDS
//   // ============================================================
//   function updateCards(txns){
//     let cr=0,db=0,ex=0,adv=0,crc=0,dbc=0,exc=0;
//     txns.forEach(t=>{
//       const a=parseFloat(t.charges)||0;
//       if(t.transaction_type==='Credit'){cr+=a;crc++;}
//       else if(t.transaction_type==='Debit'){db+=a;dbc++;}
//       else if(t.transaction_type==='Expense'){ex+=a;exc++;}
//       else if(t.transaction_type==='Advance'){adv+=a;}
//     });
//     if(el('total-credit'))el('total-credit').textContent='Rs. '+fmt(cr);
//     if(el('credit-count'))el('credit-count').textContent=crc+' transactions';
//     if(el('total-debit'))el('total-debit').textContent='Rs. '+fmt(db);
//     if(el('debit-count'))el('debit-count').textContent=dbc+' transactions';
//     if(el('total-expense'))el('total-expense').textContent='Rs. '+fmt(ex);
//     if(el('expense-count'))el('expense-count').textContent=exc+' transactions';
//     if(el('net-balance'))el('net-balance').textContent='Rs. '+fmt(cr-db-ex);
//     // Advance card (optional)
//     if(el('total-advance'))el('total-advance').textContent='Rs. '+fmt(adv);
//   }

//   // ============================================================
//   // FILTERS
//   // ============================================================
//   function applyFilters(){
//     const {type,dateFrom,dateTo,search,customerId}=activeFilters;
//     const q=(search||'').toLowerCase().trim();
//     filteredTransactions=allTransactions.filter(t=>{
//       if(type && t.transaction_type!==type)return false;
//       if(customerId && String(t.customer_id)!==String(customerId))return false;
//       if(dateFrom && new Date(t.created_at)<new Date(dateFrom))return false;
//       if(dateTo && new Date(t.created_at)>new Date(dateTo+'T23:59:59'))return false;
//       if(q){
//         const name=(t.customers?.name||'').toLowerCase();
//         const desc=(t.description||'').toLowerCase();
//         const typ=(t.transaction_type||'').toLowerCase();
//         if(!name.includes(q)&&!desc.includes(q)&&!typ.includes(q))return false;
//       }
//       return true;
//     });
//     currentPage=1; selectedIds.clear();
//     renderPage(); updateCards(filteredTransactions); updateBulkBar();
//   }

//   window.applyFilters=function(){
//     activeFilters.type=el('filter-type')?.value||'';
//     activeFilters.dateFrom=el('filter-date-from')?.value||'';
//     activeFilters.dateTo=el('filter-date-to')?.value||'';
//     activeFilters.customerId=el('filter-customer')?.value||'';
//     applyFilters();
//   };

//   window.clearTransactionFilters=function(){
//     activeFilters={type:'',dateFrom:'',dateTo:'',search:'',customerId:''};
//     ['filter-type','filter-date-from','filter-date-to','filter-customer','filter-search'].forEach(id=>{if(el(id))el(id).value='';});
//     applyFilters();
//   };

//   // ============================================================
//   // RENDER
//   // ============================================================
//   function renderPage(){
//     const total=filteredTransactions.length;
//     const totalPages=Math.max(1,Math.ceil(total/pageSize));
//     if(currentPage>totalPages)currentPage=totalPages;
//     const start=(currentPage-1)*pageSize;
//     const end=Math.min(start+pageSize,total);
//     renderRows(filteredTransactions.slice(start,end));
//     renderCount(total,start+1,end);
//     renderPagination(total,totalPages);
//   }

//   function renderCount(total,from,to){
//     const e=el('transaction-count');
//     if(e)e.textContent=total>0?`${from}-${to} of ${total} transactions`:'0 transactions';
//   }

//   function renderRows(txns){
//     const tbody=el('transactions-table'); if(!tbody)return;
//     if(!txns.length){
//       tbody.innerHTML='<tr><td colspan="10" class="text-center py-4 text-muted"><i class="bi bi-inbox fs-3 d-block mb-2"></i>Koi transaction nahi mili</td></tr>';
//       return;
//     }

//     tbody.innerHTML=txns.map(t=>{
//       const d=new Date(t.created_at);
//       const dateStr=d.toLocaleDateString('en-PK');
//       const timeStr=d.toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'});

//       let badgeStyle,badgeText;
//       if(t.transaction_type==='Credit'){
//         badgeStyle='display:inline-block;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:700;background:#198754;color:#fff;';
//         badgeText='Sale (Credit)';
//       } else if(t.transaction_type==='Debit'){
//         badgeStyle='display:inline-block;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:700;background:#0d6efd;color:#fff;';
//         badgeText='Vasooli (Debit)';
//       } else if(t.transaction_type==='Advance'){
//         badgeStyle='display:inline-block;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:700;background:#6f42c1;color:#fff;';
//         badgeText='Cash Advance';
//       } else {
//         badgeStyle='display:inline-block;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:700;background:#ffc107;color:#212529;';
//         badgeText='Expense';
//       }

//       const desc=t.description||'';
//       const fuelType=desc.toLowerCase().includes('petrol')?'Petrol':desc.toLowerCase().includes('diesel')?'Diesel':'-';
//       let unitPriceHtml='-';
//       if(t.unit_price&&parseFloat(t.unit_price)>0){
//         unitPriceHtml='Rs. '+fmt(t.unit_price);
//       } else if(fuelType!=='-'&&fuelPriceHistory.length>0){
//         const hp=priceFor(d.toISOString().split('T')[0],fuelType);
//         if(hp>0)unitPriceHtml=`Rs. ${fmt(hp)} <small style="color:#888">(est.)</small>`;
//       }

//       const litersHtml=t.liters>0?fmt(t.liters)+' L':'-';
//       const checked=selectedIds.has(t.id);
//       const rowBg=checked?'background:#cfe2ff;':'';

//       return `<tr style="${rowBg}" data-id="${t.id}">
//         <td style="width:38px;text-align:center;vertical-align:middle;">
//           <input type="checkbox" class="tx-row-cb" data-id="${t.id}" ${checked?'checked':''}
//             style="width:16px;height:16px;cursor:pointer;accent-color:#0d6efd;">
//         </td>
//         <td style="vertical-align:middle;">${dateStr}<br><small style="color:#888">${timeStr}</small></td>
//         <td style="vertical-align:middle;">${t.customers?.name||'N/A'} <small style="color:#888">(${t.customers?.sr_no||'-'})</small></td>
//         <td style="vertical-align:middle;"><span style="${badgeStyle}">${badgeText}</span></td>
//         <td style="vertical-align:middle;">${fuelType}</td>
//         <td style="vertical-align:middle;">${litersHtml}</td>
//         <td style="vertical-align:middle;">${unitPriceHtml}</td>
//         <td style="vertical-align:middle;"><strong>Rs. ${fmt(t.charges)}</strong></td>
//         <td style="vertical-align:middle;max-width:200px;word-break:break-word;">${desc||'-'}</td>
//         <td style="vertical-align:middle;">
//           <div style="display:flex;gap:4px;">
//             <button style="background:none;border:1px solid #0dcaf0;color:#0dcaf0;border-radius:4px;padding:3px 8px;cursor:pointer;" title="Print" onclick="window.printSingle(${t.id})">
//               <i class="bi bi-printer"></i>
//             </button>
//             <button style="background:none;border:1px solid #dc3545;color:#dc3545;border-radius:4px;padding:3px 8px;cursor:pointer;" title="Delete" onclick="window.deleteTransaction(${t.id})">
//               <i class="bi bi-trash"></i>
//             </button>
//           </div>
//         </td>
//       </tr>`;
//     }).join('');

//     document.querySelectorAll('.tx-row-cb').forEach(cb=>{
//       cb.addEventListener('change',function(){
//         const id=parseInt(this.dataset.id);
//         if(this.checked)selectedIds.add(id); else selectedIds.delete(id);
//         const row=this.closest('tr');
//         if(row)row.style.background=this.checked?'#cfe2ff':'';
//         updateBulkBar(); updateSelectAllCb();
//       });
//     });
//     updateSelectAllCb();
//   }

//   function updateSelectAllCb(){
//     const cb=el('select-all-cb'); if(!cb)return;
//     const pageIds=filteredTransactions.slice((currentPage-1)*pageSize,currentPage*pageSize).map(t=>t.id);
//     cb.checked=pageIds.length>0&&pageIds.every(id=>selectedIds.has(id));
//     cb.indeterminate=!cb.checked&&pageIds.some(id=>selectedIds.has(id));
//   }

//   function updateBulkBar(){
//     const bar=el('bulk-action-bar'); if(!bar)return;
//     if(selectedIds.size>0){
//       bar.style.display='flex';
//       const lbl=el('bulk-count-label');
//       if(lbl)lbl.textContent=selectedIds.size+' selected';
//     } else { bar.style.display='none'; }
//   }

//   function renderPagination(total,totalPages){
//     const container=el('pagination-container'); if(!container)return;
//     if(total===0){container.innerHTML='';return;}
//     const startNum=(currentPage-1)*pageSize+1;
//     const endNum=Math.min(currentPage*pageSize,total);
//     let pagesHtml='';
//     let sp=Math.max(1,currentPage-2),ep=Math.min(totalPages,sp+4);
//     if(ep-sp<4)sp=Math.max(1,ep-4);
//     for(let i=sp;i<=ep;i++){
//       pagesHtml+=`<button style="margin:0 1px;padding:3px 10px;border-radius:4px;border:1px solid ${i===currentPage?'#0d6efd':'#ccc'};background:${i===currentPage?'#0d6efd':'#fff'};color:${i===currentPage?'#fff':'#333'};cursor:pointer;" onclick="window.txGoToPage(${i})">${i}</button>`;
//     }
//     container.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;padding:10px 14px;border-top:1px solid #dee2e6;background:#f8f9fa;">
//       <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#555;">
//         Show:
//         <select style="padding:2px 6px;border-radius:4px;border:1px solid #ccc;font-size:13px;" onchange="window.txChangePageSize(this.value)">
//           <option value="10" ${pageSize===10?'selected':''}>10</option>
//           <option value="25" ${pageSize===25?'selected':''}>25</option>
//           <option value="50" ${pageSize===50?'selected':''}>50</option>
//           <option value="100" ${pageSize===100?'selected':''}>100</option>
//         </select>
//         &nbsp;${startNum}-${endNum} of ${total}
//       </div>
//       <div style="display:flex;align-items:center;gap:2px;">
//         <button style="padding:3px 9px;border-radius:4px;border:1px solid #ccc;background:#fff;cursor:pointer;" onclick="window.txGoToPage(1)" ${currentPage===1?'disabled':''}>«</button>
//         <button style="padding:3px 9px;border-radius:4px;border:1px solid #ccc;background:#fff;cursor:pointer;" onclick="window.txGoToPage(${currentPage-1})" ${currentPage===1?'disabled':''}>‹</button>
//         ${pagesHtml}
//         <button style="padding:3px 9px;border-radius:4px;border:1px solid #ccc;background:#fff;cursor:pointer;" onclick="window.txGoToPage(${currentPage+1})" ${currentPage===totalPages?'disabled':''}>›</button>
//         <button style="padding:3px 9px;border-radius:4px;border:1px solid #ccc;background:#fff;cursor:pointer;" onclick="window.txGoToPage(${totalPages})" ${currentPage===totalPages?'disabled':''}>»</button>
//       </div>
//     </div>`;
//   }

//   window.txGoToPage=function(p){currentPage=Math.max(1,Math.min(p,Math.ceil(filteredTransactions.length/pageSize)));renderPage();};
//   window.txChangePageSize=function(s){pageSize=parseInt(s);currentPage=1;renderPage();};

//   // ============================================================
//   // PRINT ENGINE (unchanged from v4)
//   // ============================================================
//   window.printSingle=function(id){const t=allTransactions.find(x=>x.id===id);if(!t){alert('Transaction nahi mili');return;}openPrint([t],'summary');};
//   window.printSelectedSummary=function(){const txns=allTransactions.filter(t=>selectedIds.has(t.id));if(!txns.length){alert('Koi select nahi ki');return;}openPrint(txns,'summary');};
//   window.printSelectedMonthly=function(){const txns=allTransactions.filter(t=>selectedIds.has(t.id));if(!txns.length){alert('Koi select nahi ki');return;}openPrint(txns,'monthly');};
//   window.printAllSummary=function(){if(!filteredTransactions.length){alert('Koi data nahi');return;}openPrint(filteredTransactions,'summary');};
//   window.printAllMonthly=function(){if(!filteredTransactions.length){alert('Koi data nahi');return;}openPrint(filteredTransactions,'monthly');};

//   function openPrint(txns,mode){
//     const company='Khalid & Sons Petroleum';
//     const printDate=new Date().toLocaleDateString('en-PK',{day:'2-digit',month:'long',year:'numeric'});
//     let totCr=0,totDb=0,totEx=0,totAdv=0;
//     txns.forEach(t=>{
//       const a=parseFloat(t.charges)||0;
//       if(t.transaction_type==='Credit')totCr+=a;
//       else if(t.transaction_type==='Debit')totDb+=a;
//       else if(t.transaction_type==='Advance')totAdv+=a;
//       else totEx+=a;
//     });

//     function buildRows(list){
//       return list.map(t=>{
//         const d=new Date(t.created_at);
//         const desc=t.description||'';
//         const fuel=desc.toLowerCase().includes('petrol')?'Petrol':desc.toLowerCase().includes('diesel')?'Diesel':'-';
//         const ltr=t.liters>0?fmt(t.liters)+' L':'-';
//         const rate=t.unit_price>0?'Rs.'+fmt(t.unit_price):'-';
//         const typeColor=t.transaction_type==='Credit'?'#198754':t.transaction_type==='Debit'?'#0d6efd':t.transaction_type==='Advance'?'#6f42c1':'#cc8800';
//         const crAmt=t.transaction_type==='Credit'?'Rs.'+fmt(t.charges):'-';
//         const dbAmt=(t.transaction_type==='Debit'||t.transaction_type==='Expense'||t.transaction_type==='Advance')?'Rs.'+fmt(t.charges):'-';
//         return `<tr>
//           <td>${d.toLocaleDateString('en-PK')}<br><small style="color:#888">${d.toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'})}</small></td>
//           <td>${t.customers?.name||'N/A'} (${t.customers?.sr_no||'-'})</td>
//           <td style="font-weight:700;color:${typeColor}">${t.transaction_type}</td>
//           <td>${fuel}</td>
//           <td style="text-align:center">${ltr}</td>
//           <td style="text-align:right">${rate}</td>
//           <td style="text-align:right;font-weight:700">Rs.${fmt(t.charges)}</td>
//           <td style="text-align:right;color:#198754;font-weight:600">${crAmt}</td>
//           <td style="text-align:right;color:#0d6efd;font-weight:600">${dbAmt}</td>
//           <td style="word-break:break-word;max-width:130px">${desc}</td>
//         </tr>`;
//       }).join('');
//     }

//     const THEAD=`<tr style="background:#1a5276;color:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
//       <th style="padding:5px 6px">Date/Time</th><th style="padding:5px 6px">Customer</th><th style="padding:5px 6px">Type</th><th style="padding:5px 6px">Fuel</th>
//       <th style="padding:5px 6px;text-align:center">Qty(L)</th><th style="padding:5px 6px;text-align:right">Rate/L</th>
//       <th style="padding:5px 6px;text-align:right">Amount</th><th style="padding:5px 6px;text-align:right">Credit</th>
//       <th style="padding:5px 6px;text-align:right">Debit/Exp</th><th style="padding:5px 6px">Description</th>
//     </tr>`;
//     const TFOOT=`<tr style="background:#eaf0fb;font-weight:700;border-top:2px solid #1a5276">
//       <td colspan="6" style="padding:5px 6px;text-align:right">TOTALS:</td>
//       <td style="padding:5px 6px;text-align:right">Rs.${fmt(totCr+totDb+totEx+totAdv)}</td>
//       <td style="padding:5px 6px;text-align:right;color:#198754">Rs.${fmt(totCr)}</td>
//       <td style="padding:5px 6px;text-align:right;color:#0d6efd">Rs.${fmt(totDb+totEx+totAdv)}</td>
//       <td></td>
//     </tr>`;

//     let bodyHtml='';
//     if(mode==='monthly'){
//       const map={};
//       txns.forEach(t=>{
//         const d=new Date(t.created_at);
//         const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
//         const lbl=d.toLocaleDateString('en-PK',{month:'long',year:'numeric'});
//         if(!map[key])map[key]={lbl,list:[],cr:0,db:0,ex:0,adv:0};
//         map[key].list.push(t);
//         const a=parseFloat(t.charges)||0;
//         if(t.transaction_type==='Credit')map[key].cr+=a;
//         else if(t.transaction_type==='Debit')map[key].db+=a;
//         else if(t.transaction_type==='Advance')map[key].adv+=a;
//         else map[key].ex+=a;
//       });
//       Object.keys(map).sort((a,b)=>b.localeCompare(a)).forEach(key=>{
//         const m=map[key];
//         bodyHtml+=`<div style="background:#1a5276;color:#fff;padding:7px 10px;font-size:14px;font-weight:700;margin:14px 0 0;border-radius:4px 4px 0 0;-webkit-print-color-adjust:exact;print-color-adjust:exact;">${m.lbl} &nbsp;·&nbsp; ${m.list.length} transactions</div>
//         <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:8px;">
//           <thead>${THEAD}</thead>
//           <tbody>${buildRows(m.list)}</tbody>
//           <tfoot><tr style="background:#eaf0fb;font-weight:700;border-top:2px solid #1a5276">
//             <td colspan="6" style="padding:4px 6px;text-align:right">Month Total:</td>
//             <td style="padding:4px 6px;text-align:right">Rs.${fmt(m.cr+m.db+m.ex+m.adv)}</td>
//             <td style="padding:4px 6px;text-align:right;color:#198754">Rs.${fmt(m.cr)}</td>
//             <td style="padding:4px 6px;text-align:right;color:#0d6efd">Rs.${fmt(m.db+m.ex+m.adv)}</td>
//             <td></td>
//           </tr></tfoot>
//         </table>`;
//       });
//     } else {
//       bodyHtml=`<table style="width:100%;border-collapse:collapse;font-size:10px;">
//         <thead>${THEAD}</thead><tbody>${buildRows(txns)}</tbody><tfoot>${TFOOT}</tfoot>
//       </table>`;
//     }

//     const html=`<!DOCTYPE html><html><head><meta charset="UTF-8">
// <title>${company}</title>
// <style>
// *{box-sizing:border-box;margin:0;padding:0}
// body{font-family:Arial,sans-serif;font-size:11px;color:#222}
// .page{padding:16px}
// .hdr{display:flex;justify-content:space-between;border-bottom:2px solid #1a5276;padding-bottom:10px;margin-bottom:12px}
// .hdr h1{font-size:18px;color:#1a5276}
// .sumbox{display:flex;gap:8px;margin-bottom:14px}
// .sb{flex:1;border-radius:6px;padding:8px 10px}
// table td{padding:4px 6px;border-bottom:1px solid #eee;vertical-align:top}
// tr:nth-child(even) td{background:#f8f9fa}
// .sig-row{display:flex;justify-content:space-around;margin-top:30px}
// .sig{text-align:center;width:180px}
// .sig-line{border-top:1px solid #555;padding-top:4px;font-size:10px;color:#555;margin-top:30px}
// .footer{display:flex;justify-content:space-between;border-top:1px solid #ccc;margin-top:14px;padding-top:8px;font-size:10px;color:#888}
// @media print{.page{padding:8px}@page{margin:10mm}}
// </style></head><body><div class="page">
// <div class="hdr">
//   <div><h1>⛽ ${company}</h1><p style="color:#555;font-size:11px">${mode==='monthly'?'Monthly Transaction Report':'Transaction Receipt'}</p></div>
//   <div style="text-align:right;font-size:11px;color:#555"><strong>Date: ${printDate}</strong><br>Entries: ${txns.length}<br>${new Date().toLocaleTimeString('en-PK')}</div>
// </div>
// <div class="sumbox">
//   <div class="sb" style="background:#d4edda;border:1px solid #28a745"><div style="font-size:10px;color:#555">Credit (Sales)</div><div style="font-size:14px;font-weight:700">Rs.${fmt(totCr)}</div></div>
//   <div class="sb" style="background:#cce5ff;border:1px solid #0069d9"><div style="font-size:10px;color:#555">Debit (Vasooli)</div><div style="font-size:14px;font-weight:700">Rs.${fmt(totDb)}</div></div>
//   <div class="sb" style="background:#fff3cd;border:1px solid #ffc107"><div style="font-size:10px;color:#555">Expense</div><div style="font-size:14px;font-weight:700">Rs.${fmt(totEx)}</div></div>
//   <div class="sb" style="background:#ede7f6;border:1px solid #6f42c1"><div style="font-size:10px;color:#555">Cash Advance</div><div style="font-size:14px;font-weight:700">Rs.${fmt(totAdv)}</div></div>
//   <div class="sb" style="background:#e2e3e5;border:1px solid #6c757d"><div style="font-size:10px;color:#555">Net Balance</div><div style="font-size:14px;font-weight:700">Rs.${fmt(totCr-totDb-totEx-totAdv)}</div></div>
// </div>
// ${bodyHtml}
// <div class="sig-row">
//   <div class="sig"><div class="sig-line">Authorized Signature</div></div>
//   <div class="sig"><div class="sig-line">Customer Signature</div></div>
//   <div class="sig"><div class="sig-line">Accountant</div></div>
// </div>
// <div class="footer"><span>${company} — Official Receipt</span><span>Generated: ${new Date().toLocaleString('en-PK')}</span></div>
// </div><script>window.onload=function(){window.print();}<\/script></body></html>`;

//     const w=window.open('','_blank','width=1080,height=750');
//     if(w){w.document.write(html);w.document.close();}
//     else alert('Popup blocked! Browser mein popup allow karein.');
//   }

//   // ============================================================
//   // FORM HANDLERS
//   // ============================================================
//   async function handleNewSale(){
//     const dd = dropdowns['sale-customer-container'];
//     const customerId = dd?.selected?.id || el('sale-customer-hidden')?.value;
//     const fuelType=el('sale-fuel-type')?.value;
//     const liters=parseFloat(el('sale-liters')?.value)||0;
//     const unitPrice=parseFloat(el('sale-unit-price')?.value)||0;
//     const amount=parseFloat(el('sale-amount')?.value)||0;
//     const paymentType=el('sale-payment-type')?.value||'credit';
//     const description=el('sale-description')?.value||'';
//     if(!customerId){alert('Customer select karein');return;}
//     if(!fuelType){alert('Fuel type select karein');return;}
//     if(!amount){alert('Amount enter karein');return;}
//     try{
//       const userId = (await supabase.auth.getUser()).data?.user?.id;
//       const{error}=await supabase.from('transactions').insert([{
//         user_id: userId,
//         customer_id:parseInt(customerId),
//         transaction_type:paymentType==='cash'?'Debit':'Credit',
//         amount,liters:liters||null,unit_price:unitPrice||null,
//         description:`${fuelType} sale${description?' - '+description:''}`
//       }]);
//       if(error)throw error;
//       showToast('success','Kamyab!',`Sale Rs.${fmt(amount)} record ho gayi!`);
//       closeModal('newSaleModal');
//       await loadTransactions();
//     }catch(e){alert('Error: '+e.message);}
//   }

//   async function handleVasooli(){
//     const dd = dropdowns['vasooli-customer-container'];
//     const customerId = dd?.selected?.id || el('vasooli-customer-hidden')?.value;
//     const amount=parseFloat(el('vasooli-amount')?.value)||0;
//     const month=el('vasooli-month')?.value||'';
//     const fuelCat=el('vasooli-fuel-category')?.value||'';
//     const desc=el('vasooli-description')?.value||'';
//     if(!customerId){alert('Customer select karein');return;}
//     if(!amount){alert('Amount enter karein');return;}
//     let fullDesc='Payment received';
//     if(month){const d=new Date(month+'-01');fullDesc=`Payment for ${d.toLocaleDateString('en-US',{month:'long',year:'numeric'})}`;}
//     if(fuelCat)fullDesc+=` (${fuelCat})`;
//     if(desc)fullDesc+=` - ${desc}`;
//     try{
//       const userId = (await supabase.auth.getUser()).data?.user?.id;
//       const{error}=await supabase.from('transactions').insert([{
//         user_id: userId,
//         customer_id:parseInt(customerId),
//         transaction_type:'Debit',
//         amount,
//         description:fullDesc
//       }]);
//       if(error)throw error;
//       showToast('success','Kamyab!','Payment record ho gayi!');
//       closeModal('vasooliModal');
//       await loadTransactions();
//     }catch(e){alert('Error: '+e.message);}
//   }

//   async function handleExpense(){
//     const amount=parseFloat(el('expense-amount')?.value)||0;
//     const description=el('expense-description')?.value;
//     const expType=el('expense-type')?.value;
//     const account=el('expense-account')?.value;
//     if(!amount){alert('Amount enter karein');return;}
//     if(!description){alert('Description enter karein');return;}
//     if(!expType){alert('Category select karein');return;}
//     if(!account){alert('Account select karein');return;}
//     try{
//       const userId = (await supabase.auth.getUser()).data?.user?.id;
//       let custId=null;
//       const{data:owner}=await supabase.from('customers').select('id').eq('category','Owner').eq('user_id',userId).maybeSingle();
//       if(owner){custId=owner.id;}
//       else{
//         const{data:no,error:ce}=await supabase.from('customers').insert([{sr_no:0,name:'Owner',category:'Owner',balance:0,user_id:userId}]).select().single();
//         if(ce)throw ce; custId=no.id;
//       }
//       const{error}=await supabase.from('transactions').insert([{
//         user_id: userId,
//         customer_id:custId,
//         transaction_type:'Expense',
//         amount,
//         description:`${expType}: ${description} (From: ${account})`
//       }]);
//       if(error)throw error;
//       showToast('success','Kamyab!','Expense record ho gaya!');
//       closeModal('expenseModal');
//       await loadTransactions();
//     }catch(e){alert('Error: '+e.message);}
//   }

//   // ── Advance Customer Dropdown — Dedicated Simple Approach ─
//   // Yeh function modal ke andar seedha kaam karta hai
//   let advanceSelectedCustomer = null;

//   function buildAdvanceCustomerDropdown(customers) {
//     const searchEl   = el('advance-cust-search');
//     const listEl     = el('advance-cust-list');
//     const selectedEl = el('advance-cust-selected');
//     const selectedTxt= el('advance-cust-selected-text');
//     const balanceEl  = el('advance-cust-balance');
//     const hiddenEl   = el('advance-customer-hidden');
//     if(!searchEl || !listEl) return;

//     function renderList(q) {
//       const filtered = q
//         ? customers.filter(c =>
//             c.name.toLowerCase().includes(q.toLowerCase()) ||
//             String(c.sr_no||'').includes(q))
//         : customers;

//       if(!filtered.length){
//         listEl.innerHTML = '<div style="padding:12px;color:#888;text-align:center;">Koi customer nahi mila</div>';
//         listEl.style.display = 'block';
//         return;
//       }

//       listEl.innerHTML = filtered.map(c => `
//         <div class="adv-cust-item" data-id="${c.id}"
//           style="padding:10px 14px;cursor:pointer;display:flex;justify-content:space-between;
//                  align-items:center;border-bottom:1px solid #f5f0ff;font-size:14px;">
//           <span>
//             <span style="background:#6f42c1;color:#fff;border-radius:4px;padding:1px 7px;
//               font-size:11px;font-weight:700;margin-right:8px;">#${c.sr_no||'-'}</span>
//             ${c.name}
//           </span>
//           <span style="font-size:12px;font-weight:700;color:${(c.balance||0)>0?'#dc3545':'#198754'};">
//             Rs.${fmt(c.balance||0)}
//           </span>
//         </div>`).join('');

//       listEl.style.display = 'block';

//       listEl.querySelectorAll('.adv-cust-item').forEach(item => {
//         item.addEventListener('mouseenter', () => item.style.background = '#f3eeff');
//         item.addEventListener('mouseleave', () => item.style.background = '');
//         item.addEventListener('click', () => {
//           const cust = customers.find(c => c.id == item.dataset.id);
//           if(!cust) return;
//           advanceSelectedCustomer = cust;
//           hiddenEl.value = cust.id;
//           searchEl.value = '';
//           listEl.style.display = 'none';
//           // Show selected pill
//           selectedTxt.textContent = `#${cust.sr_no||'-'} — ${cust.name}`;
//           const bal = parseFloat(cust.balance)||0;
//           balanceEl.textContent = bal > 0 ? `⚠️ Khata Baqi: Rs.${fmt(bal)}` : `✅ Saaf Account`;
//           balanceEl.style.color = bal > 0 ? '#dc3545' : '#198754';
//           selectedEl.style.display = 'flex';
//           searchEl.style.display = 'none';
//         });
//       });
//     }

//     // On typing — show filtered list
//     searchEl.addEventListener('input', () => renderList(searchEl.value));

//     // On focus — show full list
//     searchEl.addEventListener('focus', () => renderList(searchEl.value));

//     // Click outside — close list
//     document.addEventListener('click', (e) => {
//       if(!searchEl.contains(e.target) && !listEl.contains(e.target)){
//         listEl.style.display = 'none';
//       }
//     });

//     // Reset when modal opens
//     const modal = el('cashAdvanceModal');
//     if(modal){
//       modal.addEventListener('show.bs.modal', () => {
//         advanceSelectedCustomer = null;
//         hiddenEl.value = '';
//         searchEl.value = '';
//         searchEl.style.display = 'block';
//         listEl.style.display = 'none';
//         selectedEl.style.display = 'none';
//       });
//     }
//   }

//   window.clearAdvanceCustomer = function(){
//     advanceSelectedCustomer = null;
//     const hiddenEl   = el('advance-customer-hidden');
//     const searchEl   = el('advance-cust-search');
//     const selectedEl = el('advance-cust-selected');
//     if(hiddenEl) hiddenEl.value = '';
//     if(searchEl) { searchEl.value = ''; searchEl.style.display = 'block'; searchEl.focus(); }
//     if(selectedEl) selectedEl.style.display = 'none';
//     // Rebuild with all customers
//     const listEl = el('advance-cust-list');
//     if(listEl) listEl.style.display = 'none';
//   };

//   // ── Cash Advance Handler ───────────────────────────────────
//   async function handleCashAdvance(){
//     const customerId = advanceSelectedCustomer?.id || el('advance-customer-hidden')?.value;
//     const amount = parseFloat(el('advance-amount')?.value)||0;
//     const reason = el('advance-reason')?.value||'';
//     const advDate = el('advance-date')?.value || new Date().toISOString().split('T')[0];
//     const notes  = el('advance-notes')?.value||'';

//     if(!customerId){
//       alert('Customer select karein — search box mein naam ya Sr# likho phir list se choose karo');
//       return;
//     }
//     if(!amount){alert('Amount enter karein');return;}
//     if(!reason){alert('Wajah select karein');return;}

//     try{
//       const userId = (await supabase.auth.getUser()).data?.user?.id;

//       // 1. cash_advances table mein insert
//       const{data:advData, error:advErr}=await supabase.from('cash_advances').insert([{
//         user_id: userId,
//         customer_id: parseInt(customerId),
//         amount,
//         reason,
//         advance_date: advDate,
//         notes,
//         status: 'pending'
//       }]).select('*, customers(name, sr_no, phone, balance)').single();
//       if(advErr)throw advErr;

//       // 2. transactions mein bhi record (Advance type)
//       const{error:txErr}=await supabase.from('transactions').insert([{
//         user_id: userId,
//         customer_id: parseInt(customerId),
//         transaction_type: 'Advance',
//         amount,
//         description: `Cash Advance: ${reason}${notes?' | '+notes:''}`,
//         cash_advance_id: advData?.id || null
//       }]);
//       if(txErr)throw txErr;

//       // 3. Customer balance update (balance badhao — customer hamara paisa le gaya)
//       const cust = allCustomers.find(c => c.id == customerId);
//       const oldBalance = parseFloat(cust?.balance)||0;
//       const newBalance = oldBalance + amount;
//       if(cust){
//         await supabase.from('customers').update({ balance: newBalance }).eq('id', customerId);
//         cust.balance = newBalance; // local update
//       }

//       showToast('success','Kamyab!',`Cash Advance Rs.${fmt(amount)} record ho gaya!`);
//       closeModal('cashAdvanceModal');

//       // 4. Print parchi automatically
//       printAdvanceReceipt({
//         ...advData,
//         customers: advData.customers || { name: cust?.name||'N/A', sr_no: cust?.sr_no||'-', phone: cust?.phone||'' },
//         newBalance
//       });

//       await loadCustomers();
//       await loadTransactions();
//       await loadAdvanceList();
//     }catch(e){alert('Error: '+e.message);}
//   }

//   // ── Print Advance Parchi ───────────────────────────────────
//   function printAdvanceReceipt(adv){
//     const company = 'Khalid & Sons Petroleum';
//     const printDate = new Date().toLocaleDateString('en-PK',{day:'2-digit',month:'long',year:'numeric'});
//     const printTime = new Date().toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'});
//     const custName  = adv.customers?.name || 'N/A';
//     const custSr    = adv.customers?.sr_no || '-';
//     const custPhone = adv.customers?.phone || '-';
//     const newBal    = adv.newBalance ?? 0;

//     const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
// <title>Cash Advance Parchi</title>
// <style>
// *{box-sizing:border-box;margin:0;padding:0}
// body{font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;display:flex;justify-content:center;padding:20px;}
// .receipt{width:340px;background:#fff;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.15);overflow:hidden;}
// .header{background:linear-gradient(135deg,#6f42c1,#8e44ad);color:#fff;padding:18px 20px;text-align:center;}
// .header h2{font-size:16px;font-weight:700;margin-bottom:4px;}
// .header p{font-size:11px;opacity:0.85;}
// .badge-adv{display:inline-block;background:rgba(255,255,255,0.25);border:1px solid rgba(255,255,255,0.5);
//   border-radius:20px;padding:3px 14px;font-size:12px;font-weight:700;margin-top:8px;letter-spacing:1px;}
// .body{padding:18px 20px;}
// .row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px dashed #e8e8e8;}
// .row:last-child{border:none;}
// .label{font-size:12px;color:#888;}
// .value{font-size:13px;font-weight:600;color:#2c3e50;text-align:right;}
// .amount-box{background:#f3eeff;border:2px solid #6f42c1;border-radius:8px;padding:14px;text-align:center;margin:14px 0;}
// .amount-box .lbl{font-size:11px;color:#8e44ad;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;}
// .amount-box .val{font-size:28px;font-weight:800;color:#6f42c1;line-height:1.2;}
// .balance-box{border-radius:8px;padding:10px 14px;margin:0 0 14px;text-align:center;}
// .balance-box.danger{background:#fdecea;border:1px solid #e74c3c;}
// .balance-box.safe{background:#eafaf1;border:1px solid #27ae60;}
// .balance-box .blbl{font-size:11px;font-weight:600;text-transform:uppercase;}
// .balance-box .bval{font-size:18px;font-weight:800;}
// .footer{background:#f8f8f8;padding:12px 20px;text-align:center;border-top:1px dashed #ddd;}
// .footer p{font-size:10px;color:#aaa;margin:2px 0;}
// .sig-area{display:flex;justify-content:space-between;padding:20px 20px 0;margin-top:10px;}
// .sig-box{text-align:center;width:120px;}
// .sig-line{border-top:1px solid #ccc;padding-top:5px;font-size:10px;color:#999;margin-top:30px;}
// @media print{body{background:none;padding:0;}
//   .receipt{box-shadow:none;border-radius:0;width:100%;}
//   button{display:none;}}
// </style></head><body>
// <div class="receipt">
//   <div class="header">
//     <h2>⛽ ${company}</h2>
//     <p>Cash Advance Receipt / Parchi</p>
//     <div class="badge-adv">CASH ADVANCE</div>
//   </div>
//   <div class="body">
//     <div class="amount-box">
//       <div class="lbl">Advance Amount / Rakam</div>
//       <div class="val">Rs. ${fmt(adv.amount)}</div>
//     </div>

//     <div class="row"><span class="label">Receipt No.</span><span class="value">#ADV-${adv.id||'--'}</span></div>
//     <div class="row"><span class="label">Date / Taareekh</span><span class="value">${adv.advance_date || printDate}</span></div>
//     <div class="row"><span class="label">Time</span><span class="value">${printTime}</span></div>
//     <div class="row"><span class="label">Customer / Naam</span><span class="value">${custName} (#${custSr})</span></div>
//     <div class="row"><span class="label">Phone</span><span class="value">${custPhone}</span></div>
//     <div class="row"><span class="label">Wajah / Reason</span><span class="value">${adv.reason||'-'}</span></div>
//     ${adv.notes ? `<div class="row"><span class="label">Notes</span><span class="value">${adv.notes}</span></div>` : ''}

//     <div style="height:10px;"></div>
//     <div class="balance-box ${newBal > 0 ? 'danger':'safe'}">
//       <div class="blbl" style="color:${newBal>0?'#c0392b':'#27ae60'};">
//         ${newBal > 0 ? '⚠️ Total Khata Baqi (After Advance)' : '✅ Account Clear'}
//       </div>
//       <div class="bval" style="color:${newBal>0?'#c0392b':'#27ae60'};">Rs. ${fmt(Math.abs(newBal))}</div>
//     </div>

//     <div class="sig-area">
//       <div class="sig-box"><div class="sig-line">Customer Signature<br>دستخط</div></div>
//       <div class="sig-box"><div class="sig-line">Authorized By<br>منظور کنندہ</div></div>
//     </div>
//   </div>
//   <div class="footer">
//     <p><strong>${company}</strong></p>
//     <p>Printed: ${printDate} ${printTime}</p>
//     <p>Yeh receipt sambhal kar rakhein</p>
//   </div>
// </div>
// <script>window.onload=function(){window.print();}<\/script>
// </body></html>`;

//     const w = window.open('','_blank','width=420,height=700');
//     if(w){w.document.write(html);w.document.close();}
//     else alert('Popup blocked karein browser mein!');
//   }

//   // ── Load & Render Advance List ─────────────────────────────
//   async function loadAdvanceList(){
//     const tbody = el('advance-list-tbody');
//     if(tbody) tbody.innerHTML = '<tr><td colspan="8" class="text-center py-3 text-muted"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Loading...</td></tr>';

//     try{
//       const userId = (await supabase.auth.getUser()).data?.user?.id;
//       const statusFilter = el('advance-filter-status')?.value || '';

//       let query = supabase
//         .from('cash_advances')
//         .select('*, customers(name, sr_no, phone, balance)')
//         .eq('user_id', userId)
//         .order('advance_date', {ascending: false});

//       if(statusFilter) query = query.eq('status', statusFilter);

//       const {data, error} = await query;
//       if(error) throw error;

//       const advances = data || [];
//       const countEl = el('advance-list-count');
//       if(countEl) countEl.textContent = advances.length + ' advances';

//       if(!advances.length){
//         tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted"><i class="bi bi-inbox fs-4 d-block mb-2"></i>Koi cash advance nahi mili</td></tr>';
//         el('advance-list-tfoot').innerHTML = '';
//         return;
//       }

//       let totalAdv = 0;
//       tbody.innerHTML = advances.map((a, idx) => {
//         const amt = parseFloat(a.amount)||0;
//         totalAdv += amt;
//         const custBal = parseFloat(a.customers?.balance)||0;
//         const statusMap = {
//           pending: `<span style="background:#fff3cd;color:#856404;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;">⏳ Pending</span>`,
//           partial: `<span style="background:#cce5ff;color:#004085;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;">🔄 Partial</span>`,
//           cleared: `<span style="background:#d4edda;color:#155724;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;">✅ Cleared</span>`,
//         };
//         return `<tr>
//           <td style="padding:10px 12px;color:#888;font-size:12px;">${idx+1}</td>
//           <td style="padding:10px 12px;">
//             <strong>${a.customers?.name||'N/A'}</strong><br>
//             <small style="color:#888;">#${a.customers?.sr_no||'-'} | ${a.customers?.phone||'-'}</small>
//           </td>
//           <td style="padding:10px 12px;">${new Date(a.advance_date).toLocaleDateString('en-PK')}</td>
//           <td style="padding:10px 12px;font-weight:700;color:#6f42c1;font-size:15px;">Rs. ${fmt(amt)}</td>
//           <td style="padding:10px 12px;">${a.reason||'-'}${a.notes?`<br><small style="color:#888;">${a.notes}</small>`:''}</td>
//           <td style="padding:10px 12px;">
//             <span style="font-weight:700;color:${custBal>0?'#dc3545':'#198754'};">
//               Rs. ${fmt(Math.abs(custBal))}
//             </span><br>
//             <small style="color:${custBal>0?'#dc3545':'#198754'};">${custBal>0?'Baqi ha':'Saaf'}</small>
//           </td>
//           <td style="padding:10px 12px;">${statusMap[a.status]||a.status}</td>
//           <td style="padding:10px 12px;">
//             <div style="display:flex;gap:4px;flex-wrap:wrap;">
//               <button onclick="window.printAdvanceById(${a.id})"
//                 style="background:#6f42c1;color:#fff;border:none;border-radius:5px;padding:4px 10px;cursor:pointer;font-size:12px;">
//                 <i class="bi bi-printer"></i> Parchi
//               </button>
//               ${a.status !== 'cleared' ? `
//               <button onclick="window.markAdvanceCleared(${a.id})"
//                 style="background:#198754;color:#fff;border:none;border-radius:5px;padding:4px 10px;cursor:pointer;font-size:12px;">
//                 <i class="bi bi-check2"></i> Clear
//               </button>` : ''}
//             </div>
//           </td>
//         </tr>`;
//       }).join('');

//       el('advance-list-tfoot').innerHTML = `
//         <tr style="background:#f3eeff;font-weight:800;">
//           <td colspan="3" style="padding:10px 12px;text-align:right;color:#6f42c1;">TOTAL ADVANCES:</td>
//           <td style="padding:10px 12px;color:#6f42c1;font-size:16px;">Rs. ${fmt(totalAdv)}</td>
//           <td colspan="4"></td>
//         </tr>`;

//     }catch(e){
//       console.error('loadAdvanceList:', e);
//       if(tbody) tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-3">Error: ${e.message}</td></tr>`;
//     }
//   }

//   // ── Print advance by ID (from list) ───────────────────────
//   window.printAdvanceById = async function(advId){
//     try{
//       const {data, error} = await supabase
//         .from('cash_advances')
//         .select('*, customers(name, sr_no, phone, balance)')
//         .eq('id', advId)
//         .single();
//       if(error) throw error;
//       printAdvanceReceipt({...data, newBalance: data.customers?.balance||0});
//     }catch(e){ alert('Error: '+e.message); }
//   };

//   // ── Mark advance as cleared ────────────────────────────────
//   window.markAdvanceCleared = async function(advId){
//     if(!confirm('Is advance ko Cleared mark karein? Matlab customer ne wapas kar diya?')) return;
//     try{
//       const {error} = await supabase
//         .from('cash_advances')
//         .update({status:'cleared', updated_at: new Date().toISOString()})
//         .eq('id', advId);
//       if(error) throw error;
//       showToast('success','Cleared!','Advance cleared mark ho gaya!');
//       await loadAdvanceList();
//     }catch(e){ alert('Error: '+e.message); }
//   };

//   window.deleteTransaction=async function(id){
//     if(!confirm('Is transaction ko delete karein?'))return;
//     try{
//       const{error}=await supabase.from('transactions').delete().eq('id',id);
//       if(error)throw error;
//       showToast('success','Delete','Transaction delete ho gaya!');
//       await loadTransactions();
//     }catch(e){alert('Error: '+e.message);}
//   };

//   window.deleteSelected=async function(){
//     if(selectedIds.size===0){alert('Pehle transactions select karein');return;}
//     if(!confirm(selectedIds.size+' transactions delete karein?'))return;
//     const ids=[...selectedIds];
//     try{
//       for(let i=0;i<ids.length;i+=50){
//         const batch=ids.slice(i,i+50);
//         const{error}=await supabase.from('transactions').delete().in('id',batch);
//         if(error)throw error;
//       }
//       showToast('success','Delete',ids.length+' transactions delete ho gayi!');
//       selectedIds.clear();
//       await loadTransactions();
//     }catch(e){alert('Delete error: '+e.message);}
//   };

//   // ── Sale Helpers ────────────────────────────────────────────
//   window.updateSaleFuelPrice=function(){
//     const fuel=el('sale-fuel-type')?.value; if(!fuel)return;
//     const price=window.fuelPrices[fuel]||0;
//     if(el('sale-unit-price'))el('sale-unit-price').value=price;
//     const s=el('sale-price-source');
//     if(s){if(price>0){s.textContent=`Settings: ${fuel} = Rs.${price}`;s.className='text-success small';}else{s.textContent='⚠️ Settings page par price set karein';s.className='text-danger small fw-bold';}}
//     window.calcSaleFromLiters();
//   };
//   window.calcSaleFromLiters=function(){const l=parseFloat(el('sale-liters')?.value)||0;const r=parseFloat(el('sale-unit-price')?.value)||0;if(el('sale-amount'))el('sale-amount').value=(l>0&&r>0)?(l*r).toFixed(2):'';};
//   window.calcSaleFromAmount=function(){const a=parseFloat(el('sale-amount-direct')?.value)||0;const r=parseFloat(el('sale-unit-price')?.value)||0;if(el('sale-amount'))el('sale-amount').value=a>0?a.toFixed(2):'';if(el('sale-liters')&&r>0&&a>0)el('sale-liters').value=(a/r).toFixed(2);};
//   window.toggleSaleMethod=function(method){const ls=el('sale-liters-section'),as_=el('sale-amount-section');if(method==='liters'){if(ls)ls.style.display='block';if(as_)as_.style.display='none';}else{if(ls)ls.style.display='none';if(as_)as_.style.display='block';}};
//   window.calculateVasooliAmount=function(){const fuel=el('vasooli-fuel-category')?.value;const liters=parseFloat(el('vasooli-liters')?.value)||0;if(!fuel||!liters)return;if(el('vasooli-amount'))el('vasooli-amount').value=(liters*(window.fuelPrices[fuel]||0)).toFixed(2);};

//   // ── Events ──────────────────────────────────────────────────
//   function setupEvents(){
//     el('newSaleForm')      ?.addEventListener('submit',e=>{e.preventDefault();handleNewSale();});
//     el('vasooliForm')      ?.addEventListener('submit',e=>{e.preventDefault();handleVasooli();});
//     el('expenseForm')      ?.addEventListener('submit',e=>{e.preventDefault();handleExpense();});
//     el('advance-filter-status')?.addEventListener('change', loadAdvanceList);
//     el('cashAdvanceForm')  ?.addEventListener('submit',e=>{e.preventDefault();handleCashAdvance();});

//     el('sale-fuel-type')      ?.addEventListener('change',window.updateSaleFuelPrice);
//     el('sale-liters')         ?.addEventListener('input',window.calcSaleFromLiters);
//     el('sale-amount-direct')  ?.addEventListener('input',window.calcSaleFromAmount);
//     el('lbl-by-liters')       ?.addEventListener('click',()=>window.toggleSaleMethod('liters'));
//     el('lbl-by-amount')       ?.addEventListener('click',()=>window.toggleSaleMethod('amount'));
//     el('vasooli-fuel-category')?.addEventListener('change',window.calculateVasooliAmount);
//     el('vasooli-liters')       ?.addEventListener('input',window.calculateVasooliAmount);

//     el('btn-apply-filter')  ?.addEventListener('click',window.applyFilters);
//     el('btn-clear-filter')  ?.addEventListener('click',window.clearTransactionFilters);
//     el('btn-print-all-summary') ?.addEventListener('click',window.printAllSummary);
//     el('btn-print-all-monthly') ?.addEventListener('click',window.printAllMonthly);
//     el('btn-print-selected-summary')?.addEventListener('click',window.printSelectedSummary);
//     el('btn-print-selected-monthly')?.addEventListener('click',window.printSelectedMonthly);
//     el('btn-delete-selected')       ?.addEventListener('click',window.deleteSelected);
//     el('btn-clear-selection')       ?.addEventListener('click',()=>{selectedIds.clear();renderPage();updateBulkBar();});

//     el('select-all-cb')?.addEventListener('change',function(){
//       const pageIds=filteredTransactions.slice((currentPage-1)*pageSize,currentPage*pageSize).map(t=>t.id);
//       pageIds.forEach(id=>{if(this.checked)selectedIds.add(id);else selectedIds.delete(id);});
//       renderPage();updateBulkBar();
//     });

//     const si=el('filter-search');
//     if(si){let deb;si.addEventListener('input',()=>{clearTimeout(deb);deb=setTimeout(()=>{activeFilters.search=si.value;applyFilters();},300);});}
//     el('filter-customer')?.addEventListener('change',function(){activeFilters.customerId=this.value;applyFilters();});
//   }

//   // ── Init Searchable Dropdowns ──────────────────────────────
//   function initSearchableDropdowns(){
//     // Sale modal
//     createSearchableDropdown('sale-customer-container', 'sale-customer-hidden', 'Sr# ya naam se search karein...');
//     // Vasooli modal
//     createSearchableDropdown('vasooli-customer-container', 'vasooli-customer-hidden', 'Sr# ya naam se search karein...');
//     // Advance modal uses its own dedicated function (buildAdvanceCustomerDropdown)
//   }

//   // ── INIT ───────────────────────────────────────────────────
//   document.addEventListener('DOMContentLoaded',async()=>{
//     console.log('Transactions v5 init...');
//     initSearchableDropdowns();
//     setupEvents();
//     await loadFuelPrices();
//     await loadCustomers();
//     await loadExpenseCategories();
//     await loadTransactions();
//     await loadAdvanceList();
//     console.log('Transactions v5 ready.');
//   });

//   window.loadInitialTransactions=loadTransactions;

// })();









// ============================================================
// transactions-COMPLETE-v5.js — FINAL (all bugs fixed)
// FIXES:
//   ✅ No user_id filter on transactions (column not in DB)
//   ✅ cash_advances table — graceful fallback if missing
//   ✅ Sale/Vasooli/CashAdvance — SAME searchable dropdown style
//   ✅ Expense — full category list from DB
//   ✅ Balance auto-update on sale (credit) and vasooli (debit)
//   ✅ Cash Advance list + parchi print
//   ✅ Filters, pagination, print all intact
// ============================================================
// (function () {
//   'use strict';
//   if (document.body.getAttribute('data-page') !== 'transactions') return;

//   const supabase = window.supabaseClient;
//   let allTransactions      = [];
//   let filteredTransactions = [];
//   let allCustomers         = [];
//   let expenseCategories    = [];
//   let fuelPriceHistory     = [];
//   window.fuelPrices        = { Petrol: 0, Diesel: 0 };

//   let currentPage   = 1;
//   let pageSize      = 25;
//   let selectedIds   = new Set();
//   let activeFilters = { type:'', dateFrom:'', dateTo:'', search:'', customerId:'' };

//   // Track selected customers for each modal
//   let selectedCustomers = { sale: null, vasooli: null, advance: null };

//   function el(id) { return document.getElementById(id); }
//   function fmt(n) { return Number(n||0).toLocaleString('en-PK',{minimumFractionDigits:2,maximumFractionDigits:2}); }

//   function showToast(type, title, msg) {
//     const t = el('liveToast'); if(!t) { alert(title+': '+msg); return; }
//     el('toast-title').textContent   = title;
//     el('toast-message').textContent = msg;
//     t.className = 'toast '+(type==='success'?'bg-success text-white':type==='warning'?'bg-warning text-dark':'bg-danger text-white');
//     new bootstrap.Toast(t,{delay:3500}).show();
//   }

//   function closeModal(id) {
//     const m=el(id); if(m)(bootstrap.Modal.getInstance(m)||new bootstrap.Modal(m)).hide();
//     const f=document.querySelector('#'+id+' form'); if(f)f.reset();
//   }

//   // ============================================================
//   // SHARED SEARCHABLE DROPDOWN — Sale, Vasooli, Advance sab same
//   // ============================================================
//   function buildSearchDropdown(opts) {
//     const searchEl = el(opts.searchId);
//     const listEl   = el(opts.listId);
//     const hiddenEl = el(opts.hiddenId);
//     const boxEl    = el(opts.selectedBoxId);
//     const textEl   = el(opts.selectedTextId);
//     const balEl    = el(opts.selectedBalId);
//     const color    = opts.accentColor || '#0d6efd';
//     if(!searchEl || !listEl) return;

//     searchEl.style.border = `2px solid ${color}`;

//     function renderList(q) {
//       const filtered = q
//         ? opts.customers.filter(c =>
//             c.name.toLowerCase().includes(q.toLowerCase()) ||
//             String(c.sr_no||'').includes(q))
//         : opts.customers;

//       if(!filtered.length){
//         listEl.innerHTML = `<div style="padding:12px;color:#888;text-align:center;font-size:13px;">Koi nahi mila — "${q}"</div>`;
//         listEl.style.display = 'block';
//         return;
//       }

//       listEl.innerHTML = filtered.map(c => {
//         const bal = parseFloat(c.balance)||0;
//         return `<div class="sd-item-${opts.key}" data-id="${c.id}"
//           style="padding:10px 14px;cursor:pointer;display:flex;justify-content:space-between;
//                  align-items:center;border-bottom:1px solid #f5f5f5;font-size:14px;">
//           <span>
//             <span style="background:${color};color:#fff;border-radius:4px;
//               padding:1px 7px;font-size:11px;font-weight:700;margin-right:8px;">#${c.sr_no||'-'}</span>
//             ${c.name}
//           </span>
//           <span style="font-size:12px;font-weight:700;color:${bal>0?'#dc3545':'#198754'};">
//             Rs.${fmt(bal)}
//           </span>
//         </div>`;
//       }).join('');

//       listEl.style.display = 'block';

//       listEl.querySelectorAll(`.sd-item-${opts.key}`).forEach(item => {
//         item.addEventListener('mouseenter', () => item.style.background = '#f8f9ff');
//         item.addEventListener('mouseleave', () => item.style.background = '');
//         item.addEventListener('mousedown', (e) => {
//           e.preventDefault();
//           const cust = opts.customers.find(c => c.id == item.dataset.id);
//           if(!cust) return;
//           selectedCustomers[opts.key] = cust;
//           if(hiddenEl) hiddenEl.value = cust.id;
//           searchEl.value = '';
//           listEl.style.display = 'none';
//           if(textEl) textEl.textContent = `#${cust.sr_no||'-'} — ${cust.name}`;
//           if(balEl){
//             const b = parseFloat(cust.balance)||0;
//             balEl.textContent = b > 0 ? `⚠️ Khata Baqi: Rs.${fmt(b)}` : `✅ Account Saaf`;
//             balEl.style.color = b > 0 ? '#dc3545' : '#198754';
//           }
//           if(boxEl) boxEl.style.display = 'flex';
//           searchEl.style.display = 'none';
//         });
//       });
//     }

//     searchEl.addEventListener('input',  () => renderList(searchEl.value));
//     searchEl.addEventListener('focus',  () => renderList(searchEl.value));
//     searchEl.addEventListener('blur',   () => setTimeout(()=>{ listEl.style.display='none'; }, 200));

//     // Global clear function for this dropdown
//     window['clear_sd_'+opts.key] = function(){
//       selectedCustomers[opts.key] = null;
//       if(hiddenEl) hiddenEl.value = '';
//       searchEl.value = '';
//       searchEl.style.display = 'block';
//       if(boxEl) boxEl.style.display = 'none';
//       listEl.style.display = 'none';
//       searchEl.focus();
//     };

//     // Reset when modal opens
//     const modalEl = el(opts.modalId);
//     if(modalEl){
//       modalEl.addEventListener('show.bs.modal', () => {
//         selectedCustomers[opts.key] = null;
//         if(hiddenEl) hiddenEl.value = '';
//         searchEl.value = '';
//         searchEl.style.display = 'block';
//         if(boxEl) boxEl.style.display = 'none';
//         listEl.style.display = 'none';
//       });
//     }
//   }

//   function initAllDropdowns() {
//     const configs = [
//       { key:'sale',    color:'#198754', modalId:'newSaleModal',    custFilter: c => true },
//       { key:'vasooli', color:'#0d6efd', modalId:'vasooliModal',    custFilter: c => c.category !== 'Owner' },
//       { key:'advance', color:'#6f42c1', modalId:'cashAdvanceModal',custFilter: c => true },
//     ];
//     configs.forEach(cfg => {
//       buildSearchDropdown({
//         key:           cfg.key,
//         searchId:      `${cfg.key}-cust-search`,
//         listId:        `${cfg.key}-cust-list`,
//         hiddenId:      `${cfg.key}-customer-hidden`,
//         selectedBoxId: `${cfg.key}-cust-selected`,
//         selectedTextId:`${cfg.key}-cust-selected-text`,
//         selectedBalId: `${cfg.key}-cust-balance`,
//         customers:     allCustomers.filter(cfg.custFilter),
//         accentColor:   cfg.color,
//         modalId:       cfg.modalId
//       });
//     });
//   }

//   // ============================================================
//   // FUEL PRICES
//   // ============================================================
//   async function loadFuelPrices() {
//     try {
//       const {data,error} = await supabase.from('settings').select('price_history').limit(10);
//       if(error||!data?.length) return;
//       let hist=[];
//       data.forEach(r=>{if(Array.isArray(r.price_history))hist=hist.concat(r.price_history);});
//       const seen=new Set();
//       fuelPriceHistory=hist.sort((a,b)=>new Date(b.date)-new Date(a.date))
//         .filter(e=>{if(seen.has(e.date))return false;seen.add(e.date);return true;});
//       if(fuelPriceHistory.length){
//         const today=new Date().toISOString().split('T')[0];
//         window.fuelPrices.Petrol=priceFor(today,'Petrol');
//         window.fuelPrices.Diesel=priceFor(today,'Diesel');
//         const s=el('sale-price-source');
//         if(s){s.textContent=`Petrol Rs.${window.fuelPrices.Petrol} | Diesel Rs.${window.fuelPrices.Diesel}`;s.className='text-success small';}
//       }
//     } catch(e){console.error('loadFuelPrices:',e);}
//   }

//   function priceFor(dateStr,fuelType){
//     if(!fuelPriceHistory.length)return window.fuelPrices[fuelType]||0;
//     const target=new Date(dateStr);
//     const sorted=[...fuelPriceHistory].sort((a,b)=>new Date(b.date)-new Date(a.date));
//     const entry=sorted.find(e=>new Date(e.date)<=target)||sorted[sorted.length-1];
//     return fuelType==='Petrol'?parseFloat(entry.petrol):parseFloat(entry.diesel);
//   }

//   // ============================================================
//   // LOAD CUSTOMERS
//   // ============================================================
//   async function loadCustomers() {
//     try {
//       const {data,error}=await supabase.from('customers').select('*').order('sr_no');
//       if(error)throw error;
//       allCustomers=data||[];
//       initAllDropdowns(); // rebuild all dropdowns with fresh customer data
//       const fc=el('filter-customer');
//       if(fc)fc.innerHTML='<option value="">All Customers</option>'+
//         allCustomers.map(c=>`<option value="${c.id}">${c.sr_no} - ${c.name}</option>`).join('');
//     } catch(e){console.error('loadCustomers:',e);}
//   }

//   // ============================================================
//   // LOAD EXPENSE CATEGORIES
//   // ============================================================
//   async function loadExpenseCategories() {
//     try {
//       const {data} = await supabase.from('expense_categories').select('*').order('name');
//       if (data && data.length) {
//         expenseCategories = data;
//       } else {
//         expenseCategories = [
//           {name:'Bijli Bill',icon:'⚡'},{name:'Gas Bill',icon:'🔥'},
//           {name:'Paani Bill',icon:'💧'},{name:'Kiraaya',icon:'🏠'},
//           {name:'Petrol/Diesel Stock',icon:'⛽'},{name:'Mazdoor Tankhwah',icon:'👷'},
//           {name:'Machine Repair',icon:'🔧'},{name:'Khaana/Chai',icon:'☕'},
//           {name:'Transport',icon:'🚛'},{name:'Stationery',icon:'📋'},
//           {name:'Bank Charges',icon:'🏦'},{name:'Mobile/Internet',icon:'📱'},
//           {name:'Miscellaneous',icon:'📦'}
//         ];
//       }
//       const expEl = el('expense-type');
//       if (expEl) {
//         expEl.innerHTML = '<option value="">-- Category Select Karein --</option>' +
//           expenseCategories.map(c=>`<option value="${c.name}">${c.icon||''} ${c.name}</option>`).join('');
//       }
//     } catch(e) { console.error('loadExpenseCategories:', e); }
//   }

//   // ============================================================
//   // LOAD TRANSACTIONS
//   // ============================================================
//   async function loadTransactions() {
//     const tbody=el('transactions-table');
//     if(tbody)tbody.innerHTML='<tr><td colspan="10" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Loading...</td></tr>';
//     try {
//       const {data,error}=await supabase
//         .from('transactions')
//         .select('*, customers(name, sr_no)')
//         .order('id',{ascending:false})
//         .limit(500);
//       if(error)throw error;
//       const seen=new Set();
//       allTransactions=(data||[]).filter(t=>{if(seen.has(t.id))return false;seen.add(t.id);return true;});
//       selectedIds.clear();
//       applyFilters();
//     } catch(e){
//       console.error('loadTransactions:',e);
//       const tb=el('transactions-table');
//       if(tb)tb.innerHTML=`<tr><td colspan="10" class="text-center text-danger py-4">Error: ${e.message}</td></tr>`;
//     }
//   }

//   // ============================================================
//   // SUMMARY CARDS
//   // ============================================================
//   function updateCards(txns){
//     let cr=0,db=0,ex=0,adv=0,crc=0,dbc=0,exc=0,advc=0;
//     txns.forEach(t=>{
//       const a=parseFloat(t.charges)||0;
//       if(t.transaction_type==='Credit'){cr+=a;crc++;}
//       else if(t.transaction_type==='Debit'){db+=a;dbc++;}
//       else if(t.transaction_type==='Expense'){ex+=a;exc++;}
//       else if(t.transaction_type==='Advance'){adv+=a;advc++;}
//     });
//     if(el('total-credit'))el('total-credit').textContent='Rs. '+fmt(cr);
//     if(el('credit-count'))el('credit-count').textContent=crc+' transactions';
//     if(el('total-debit'))el('total-debit').textContent='Rs. '+fmt(db);
//     if(el('debit-count'))el('debit-count').textContent=dbc+' transactions';
//     if(el('total-expense'))el('total-expense').textContent='Rs. '+fmt(ex);
//     if(el('expense-count'))el('expense-count').textContent=exc+' transactions';
//     if(el('net-balance'))el('net-balance').textContent='Rs. '+fmt(cr-db-ex);
//     if(el('total-advance'))el('total-advance').textContent='Rs. '+fmt(adv);
//     if(el('advance-count'))el('advance-count').textContent=advc+' advances';
//   }

//   // ============================================================
//   // FILTERS
//   // ============================================================
//   function applyFilters(){
//     const {type,dateFrom,dateTo,search,customerId}=activeFilters;
//     const q=(search||'').toLowerCase().trim();
//     filteredTransactions=allTransactions.filter(t=>{
//       if(type && t.transaction_type!==type)return false;
//       if(customerId && String(t.customer_id)!==String(customerId))return false;
//       if(dateFrom && new Date(t.created_at)<new Date(dateFrom))return false;
//       if(dateTo && new Date(t.created_at)>new Date(dateTo+'T23:59:59'))return false;
//       if(q){
//         const name=(t.customers?.name||'').toLowerCase();
//         const desc=(t.description||'').toLowerCase();
//         const typ=(t.transaction_type||'').toLowerCase();
//         if(!name.includes(q)&&!desc.includes(q)&&!typ.includes(q))return false;
//       }
//       return true;
//     });
//     currentPage=1; selectedIds.clear();
//     renderPage(); updateCards(filteredTransactions); updateBulkBar();
//   }

//   window.applyFilters=function(){
//     activeFilters.type=el('filter-type')?.value||'';
//     activeFilters.dateFrom=el('filter-date-from')?.value||'';
//     activeFilters.dateTo=el('filter-date-to')?.value||'';
//     activeFilters.customerId=el('filter-customer')?.value||'';
//     applyFilters();
//   };

//   window.clearTransactionFilters=function(){
//     activeFilters={type:'',dateFrom:'',dateTo:'',search:'',customerId:''};
//     ['filter-type','filter-date-from','filter-date-to','filter-customer','filter-search']
//       .forEach(id=>{if(el(id))el(id).value='';});
//     applyFilters();
//   };

//   // ============================================================
//   // RENDER TABLE
//   // ============================================================
//   function renderPage(){
//     const total=filteredTransactions.length;
//     const totalPages=Math.max(1,Math.ceil(total/pageSize));
//     if(currentPage>totalPages)currentPage=totalPages;
//     const start=(currentPage-1)*pageSize;
//     renderRows(filteredTransactions.slice(start,Math.min(start+pageSize,total)));
//     renderCount(total,start+1,Math.min(start+pageSize,total));
//     renderPagination(total,totalPages);
//   }

//   function renderCount(total,from,to){
//     const e=el('transaction-count');
//     if(e)e.textContent=total>0?`${from}-${to} of ${total} transactions`:'0 transactions';
//   }

//   function renderRows(txns){
//     const tbody=el('transactions-table'); if(!tbody)return;
//     if(!txns.length){
//       tbody.innerHTML='<tr><td colspan="10" class="text-center py-4 text-muted"><i class="bi bi-inbox fs-3 d-block mb-2"></i>Koi transaction nahi mili</td></tr>';
//       return;
//     }
//     const typeStyles={
//       'Credit': 'background:#198754;color:#fff;',
//       'Debit':  'background:#0d6efd;color:#fff;',
//       'Advance':'background:#6f42c1;color:#fff;',
//       'Expense':'background:#ffc107;color:#212529;'
//     };
//     const typeLabels={Credit:'Sale',Debit:'Vasooli',Advance:'Advance',Expense:'Expense'};
//     tbody.innerHTML=txns.map(t=>{
//       const d=new Date(t.created_at);
//       const bStyle=typeStyles[t.transaction_type]||'background:#6c757d;color:#fff;';
//       const bText=typeLabels[t.transaction_type]||t.transaction_type;
//       const desc=t.description||'';
//       const fuelType=desc.toLowerCase().includes('petrol')?'Petrol':desc.toLowerCase().includes('diesel')?'Diesel':'-';
//       const checked=selectedIds.has(t.id);
//       return `<tr style="${checked?'background:#cfe2ff;':''}" data-id="${t.id}">
//         <td style="width:38px;text-align:center;vertical-align:middle;">
//           <input type="checkbox" class="tx-row-cb" data-id="${t.id}" ${checked?'checked':''}
//             style="width:16px;height:16px;cursor:pointer;accent-color:#0d6efd;">
//         </td>
//         <td style="vertical-align:middle;">${d.toLocaleDateString('en-PK')}<br><small style="color:#888">${d.toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'})}</small></td>
//         <td style="vertical-align:middle;">${t.customers?.name||'N/A'} <small style="color:#888">(${t.customers?.sr_no||'-'})</small></td>
//         <td style="vertical-align:middle;"><span style="display:inline-block;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:700;${bStyle}">${bText}</span></td>
//         <td style="vertical-align:middle;">${fuelType}</td>
//         <td style="vertical-align:middle;">${t.liters>0?fmt(t.liters)+' L':'-'}</td>
//         <td style="vertical-align:middle;">${t.unit_price>0?'Rs.'+fmt(t.unit_price):'-'}</td>
//         <td style="vertical-align:middle;"><strong>Rs.${fmt(t.charges)}</strong></td>
//         <td style="vertical-align:middle;max-width:200px;word-break:break-word;">${desc||'-'}</td>
//         <td style="vertical-align:middle;">
//           <div style="display:flex;gap:4px;">
//             <button style="background:none;border:1px solid #0dcaf0;color:#0dcaf0;border-radius:4px;padding:3px 8px;cursor:pointer;" onclick="window.printSingle(${t.id})"><i class="bi bi-printer"></i></button>
//             <button style="background:none;border:1px solid #dc3545;color:#dc3545;border-radius:4px;padding:3px 8px;cursor:pointer;" onclick="window.deleteTransaction(${t.id})"><i class="bi bi-trash"></i></button>
//           </div>
//         </td>
//       </tr>`;
//     }).join('');
//     document.querySelectorAll('.tx-row-cb').forEach(cb=>{
//       cb.addEventListener('change',function(){
//         const id=parseInt(this.dataset.id);
//         if(this.checked)selectedIds.add(id); else selectedIds.delete(id);
//         const row=this.closest('tr');
//         if(row)row.style.background=this.checked?'#cfe2ff':'';
//         updateBulkBar(); updateSelectAllCb();
//       });
//     });
//     updateSelectAllCb();
//   }

//   function updateSelectAllCb(){
//     const cb=el('select-all-cb'); if(!cb)return;
//     const pageIds=filteredTransactions.slice((currentPage-1)*pageSize,currentPage*pageSize).map(t=>t.id);
//     cb.checked=pageIds.length>0&&pageIds.every(id=>selectedIds.has(id));
//     cb.indeterminate=!cb.checked&&pageIds.some(id=>selectedIds.has(id));
//   }

//   function updateBulkBar(){
//     const bar=el('bulk-action-bar'); if(!bar)return;
//     if(selectedIds.size>0){bar.style.display='flex';const lbl=el('bulk-count-label');if(lbl)lbl.textContent=selectedIds.size+' selected';}
//     else bar.style.display='none';
//   }

//   function renderPagination(total,totalPages){
//     const container=el('pagination-container'); if(!container)return;
//     if(total===0){container.innerHTML='';return;}
//     const startNum=(currentPage-1)*pageSize+1;
//     const endNum=Math.min(currentPage*pageSize,total);
//     let pagesHtml='';
//     let sp=Math.max(1,currentPage-2),ep=Math.min(totalPages,sp+4);
//     if(ep-sp<4)sp=Math.max(1,ep-4);
//     for(let i=sp;i<=ep;i++){
//       pagesHtml+=`<button style="margin:0 1px;padding:3px 10px;border-radius:4px;border:1px solid ${i===currentPage?'#0d6efd':'#ccc'};background:${i===currentPage?'#0d6efd':'#fff'};color:${i===currentPage?'#fff':'#333'};cursor:pointer;" onclick="window.txGoToPage(${i})">${i}</button>`;
//     }
//     container.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;padding:10px 14px;border-top:1px solid #dee2e6;background:#f8f9fa;">
//       <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#555;">Show:
//         <select style="padding:2px 6px;border-radius:4px;border:1px solid #ccc;font-size:13px;" onchange="window.txChangePageSize(this.value)">
//           <option value="10" ${pageSize===10?'selected':''}>10</option><option value="25" ${pageSize===25?'selected':''}>25</option>
//           <option value="50" ${pageSize===50?'selected':''}>50</option><option value="100" ${pageSize===100?'selected':''}>100</option>
//         </select>&nbsp;${startNum}-${endNum} of ${total}</div>
//       <div style="display:flex;align-items:center;gap:2px;">
//         <button style="padding:3px 9px;border-radius:4px;border:1px solid #ccc;background:#fff;cursor:pointer;" onclick="window.txGoToPage(1)" ${currentPage===1?'disabled':''}>«</button>
//         <button style="padding:3px 9px;border-radius:4px;border:1px solid #ccc;background:#fff;cursor:pointer;" onclick="window.txGoToPage(${currentPage-1})" ${currentPage===1?'disabled':''}>‹</button>
//         ${pagesHtml}
//         <button style="padding:3px 9px;border-radius:4px;border:1px solid #ccc;background:#fff;cursor:pointer;" onclick="window.txGoToPage(${currentPage+1})" ${currentPage===totalPages?'disabled':''}>›</button>
//         <button style="padding:3px 9px;border-radius:4px;border:1px solid #ccc;background:#fff;cursor:pointer;" onclick="window.txGoToPage(${totalPages})" ${currentPage===totalPages?'disabled':''}>»</button>
//       </div></div>`;
//   }
//   window.txGoToPage=function(p){currentPage=Math.max(1,Math.min(p,Math.ceil(filteredTransactions.length/pageSize)));renderPage();};
//   window.txChangePageSize=function(s){pageSize=parseInt(s);currentPage=1;renderPage();};

//   // ============================================================
//   // PRINT ENGINE
//   // ============================================================
//   window.printSingle=function(id){const t=allTransactions.find(x=>x.id===id);if(!t)return;openPrint([t],'summary');};
//   window.printSelectedSummary=function(){const txns=allTransactions.filter(t=>selectedIds.has(t.id));if(!txns.length)return;openPrint(txns,'summary');};
//   window.printSelectedMonthly=function(){const txns=allTransactions.filter(t=>selectedIds.has(t.id));if(!txns.length)return;openPrint(txns,'monthly');};
//   window.printAllSummary=function(){if(!filteredTransactions.length)return;openPrint(filteredTransactions,'summary');};
//   window.printAllMonthly=function(){if(!filteredTransactions.length)return;openPrint(filteredTransactions,'monthly');};

//   function openPrint(txns,mode){
//     const company='Khalid & Sons Petroleum';
//     const printDate=new Date().toLocaleDateString('en-PK',{day:'2-digit',month:'long',year:'numeric'});
//     let totCr=0,totDb=0,totEx=0,totAdv=0;
//     txns.forEach(t=>{const a=parseFloat(t.charges)||0;
//       if(t.transaction_type==='Credit')totCr+=a;
//       else if(t.transaction_type==='Debit')totDb+=a;
//       else if(t.transaction_type==='Advance')totAdv+=a;
//       else totEx+=a;});
//     function buildRows(list){
//       return list.map(t=>{
//         const d=new Date(t.created_at);
//         const desc=t.description||'';
//         const fuel=desc.toLowerCase().includes('petrol')?'Petrol':desc.toLowerCase().includes('diesel')?'Diesel':'-';
//         const tc=t.transaction_type==='Credit'?'#198754':t.transaction_type==='Debit'?'#0d6efd':t.transaction_type==='Advance'?'#6f42c1':'#cc8800';
//         return `<tr><td>${d.toLocaleDateString('en-PK')}</td><td>${t.customers?.name||'N/A'} (#${t.customers?.sr_no||'-'})</td>
//           <td style="font-weight:700;color:${tc}">${t.transaction_type}</td><td>${fuel}</td>
//           <td style="text-align:right">${t.liters>0?fmt(t.liters)+' L':'-'}</td>
//           <td style="text-align:right;font-weight:700">Rs.${fmt(t.charges)}</td>
//           <td style="text-align:right;color:#198754">${t.transaction_type==='Credit'?'Rs.'+fmt(t.charges):'-'}</td>
//           <td style="text-align:right;color:#0d6efd">${t.transaction_type!=='Credit'?'Rs.'+fmt(t.charges):'-'}</td>
//           <td style="word-break:break-word;max-width:130px">${desc}</td></tr>`;
//       }).join('');
//     }
//     const THEAD=`<tr style="background:#1a5276;color:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
//       <th style="padding:5px">Date</th><th>Customer</th><th>Type</th><th>Fuel</th>
//       <th style="text-align:right">Qty</th><th style="text-align:right">Amount</th>
//       <th style="text-align:right">Credit</th><th style="text-align:right">Debit/Exp</th><th>Description</th></tr>`;
//     const TFOOT=`<tr style="background:#eaf0fb;font-weight:700;border-top:2px solid #1a5276">
//       <td colspan="5" style="text-align:right;padding:5px">TOTALS:</td>
//       <td style="text-align:right">Rs.${fmt(totCr+totDb+totEx+totAdv)}</td>
//       <td style="text-align:right;color:#198754">Rs.${fmt(totCr)}</td>
//       <td style="text-align:right;color:#0d6efd">Rs.${fmt(totDb+totEx+totAdv)}</td><td></td></tr>`;
//     let bodyHtml='';
//     if(mode==='monthly'){
//       const map={};
//       txns.forEach(t=>{const d=new Date(t.created_at);
//         const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
//         const lbl=d.toLocaleDateString('en-PK',{month:'long',year:'numeric'});
//         if(!map[key])map[key]={lbl,list:[],cr:0,db:0,ex:0,adv:0};
//         map[key].list.push(t);const a=parseFloat(t.charges)||0;
//         if(t.transaction_type==='Credit')map[key].cr+=a;
//         else if(t.transaction_type==='Debit')map[key].db+=a;
//         else if(t.transaction_type==='Advance')map[key].adv+=a;
//         else map[key].ex+=a;});
//       Object.keys(map).sort((a,b)=>b.localeCompare(a)).forEach(key=>{
//         const m=map[key];
//         bodyHtml+=`<div style="background:#1a5276;color:#fff;padding:6px 10px;font-size:13px;font-weight:700;margin:12px 0 0;border-radius:4px 4px 0 0;-webkit-print-color-adjust:exact;print-color-adjust:exact;">${m.lbl} — ${m.list.length} entries</div>
//         <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:6px;">
//           <thead>${THEAD}</thead><tbody>${buildRows(m.list)}</tbody>
//           <tfoot><tr style="background:#eaf0fb;font-weight:700;">
//             <td colspan="5" style="text-align:right;padding:4px">Total:</td>
//             <td style="text-align:right">Rs.${fmt(m.cr+m.db+m.ex+m.adv)}</td>
//             <td style="text-align:right;color:#198754">Rs.${fmt(m.cr)}</td>
//             <td style="text-align:right;color:#0d6efd">Rs.${fmt(m.db+m.ex+m.adv)}</td><td></td>
//           </tr></tfoot></table>`;});
//     } else {
//       bodyHtml=`<table style="width:100%;border-collapse:collapse;font-size:10px;">
//         <thead>${THEAD}</thead><tbody>${buildRows(txns)}</tbody><tfoot>${TFOOT}</tfoot></table>`;
//     }
//     const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${company}</title>
// <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:11px}.page{padding:16px}
// .hdr{display:flex;justify-content:space-between;border-bottom:2px solid #1a5276;padding-bottom:10px;margin-bottom:12px}
// .hdr h1{font-size:18px;color:#1a5276}.sumbox{display:flex;gap:8px;margin-bottom:14px}.sb{flex:1;border-radius:6px;padding:8px 10px}
// table td{padding:4px 6px;border-bottom:1px solid #eee}tr:nth-child(even) td{background:#f8f9fa}
// .sig-row{display:flex;justify-content:space-around;margin-top:30px}.sig{text-align:center;width:180px}
// .sig-line{border-top:1px solid #555;padding-top:4px;font-size:10px;color:#555;margin-top:30px}
// @media print{.page{padding:8px}@page{margin:10mm}}</style></head><body><div class="page">
// <div class="hdr"><div><h1>⛽ ${company}</h1></div><div style="text-align:right;font-size:11px;color:#555"><strong>${printDate}</strong><br>Entries: ${txns.length}</div></div>
// <div class="sumbox">
// <div class="sb" style="background:#d4edda;border:1px solid #28a745"><div style="font-size:10px">Sale</div><div style="font-size:14px;font-weight:700">Rs.${fmt(totCr)}</div></div>
// <div class="sb" style="background:#cce5ff;border:1px solid #0069d9"><div style="font-size:10px">Vasooli</div><div style="font-size:14px;font-weight:700">Rs.${fmt(totDb)}</div></div>
// <div class="sb" style="background:#fff3cd;border:1px solid #ffc107"><div style="font-size:10px">Expense</div><div style="font-size:14px;font-weight:700">Rs.${fmt(totEx)}</div></div>
// <div class="sb" style="background:#ede7f6;border:1px solid #6f42c1"><div style="font-size:10px">Advance</div><div style="font-size:14px;font-weight:700">Rs.${fmt(totAdv)}</div></div>
// <div class="sb" style="background:#e2e3e5;border:1px solid #6c757d"><div style="font-size:10px">Net</div><div style="font-size:14px;font-weight:700">Rs.${fmt(totCr-totDb-totEx-totAdv)}</div></div>
// </div>${bodyHtml}
// <div class="sig-row"><div class="sig"><div class="sig-line">Authorized Signature</div></div>
// <div class="sig"><div class="sig-line">Customer Signature</div></div>
// <div class="sig"><div class="sig-line">Accountant</div></div></div>
// </div><script>window.onload=function(){window.print();}<\/script></body></html>`;
//     const w=window.open('','_blank','width=1080,height=750');
//     if(w){w.document.write(html);w.document.close();}else alert('Popup blocked!');
//   }

//   // ============================================================
//   // FORM HANDLERS
//   // ============================================================
//   async function handleNewSale(){
//     const cust=selectedCustomers.sale;
//     if(!cust){alert('Customer select karein — naam ya Sr# likhein aur list se choose karein');return;}
//     const fuelType=el('sale-fuel-type')?.value;
//     const liters=parseFloat(el('sale-liters')?.value)||0;
//     const unitPrice=parseFloat(el('sale-unit-price')?.value)||0;
//     const amount=parseFloat(el('sale-amount')?.value)||0;
//     const paymentType=el('sale-payment-type')?.value||'credit';
//     const description=el('sale-description')?.value||'';
//     if(!fuelType){alert('Fuel type select karein');return;}
//     if(!amount){alert('Amount enter karein');return;}
//     try{
//       const txType=paymentType==='cash'?'Debit':'Credit';
//       const{error}=await supabase.from('transactions').insert([{
//         customer_id:parseInt(cust.id),transaction_type:txType,
//         amount,liters:liters||null,unit_price:unitPrice||null,
//         description:`${fuelType} sale${description?' - '+description:''}`
//       }]);
//       if(error)throw error;
//       // Update balance: Credit = udhaar (balance badhega), Debit/cash = turant ada (balance same)
//       if(txType==='Credit'){
//         const newBal=(parseFloat(cust.balance)||0)+amount;
//         await supabase.from('customers').update({balance:newBal}).eq('id',cust.id);
//         const lc=allCustomers.find(c=>c.id==cust.id); if(lc)lc.balance=newBal;
//       }
//       showToast('success','Kamyab!',`${fuelType} Sale Rs.${fmt(amount)} record ho gayi!`);
//       closeModal('newSaleModal'); selectedCustomers.sale=null;
//       await loadTransactions();
//     }catch(e){alert('Sale Error: '+e.message);}
//   }

//   async function handleVasooli(){
//     const cust=selectedCustomers.vasooli;
//     if(!cust){alert('Customer select karein — naam ya Sr# likhein aur list se choose karein');return;}
//     const amount=parseFloat(el('vasooli-amount')?.value)||0;
//     const month=el('vasooli-month')?.value||'';
//     const fuelCat=el('vasooli-fuel-category')?.value||'';
//     const desc=el('vasooli-description')?.value||'';
//     if(!amount){alert('Amount enter karein');return;}
//     let fullDesc='Payment received';
//     if(month){const d=new Date(month+'-01');fullDesc=`Payment for ${d.toLocaleDateString('en-US',{month:'long',year:'numeric'})}`;}
//     if(fuelCat)fullDesc+=` (${fuelCat})`;
//     if(desc)fullDesc+=` - ${desc}`;
//     try{
//       const{error}=await supabase.from('transactions').insert([{
//         customer_id:parseInt(cust.id),transaction_type:'Debit',amount,description:fullDesc
//       }]);
//       if(error)throw error;
//       // Balance kam karo — vasooli aayi hai
//       const newBal=Math.max(0,(parseFloat(cust.balance)||0)-amount);
//       await supabase.from('customers').update({balance:newBal}).eq('id',cust.id);
//       const lc=allCustomers.find(c=>c.id==cust.id); if(lc)lc.balance=newBal;
//       showToast('success','Kamyab!',`Vasooli Rs.${fmt(amount)} record ho gayi!`);
//       closeModal('vasooliModal'); selectedCustomers.vasooli=null;
//       await loadTransactions();
//     }catch(e){alert('Vasooli Error: '+e.message);}
//   }

//   async function handleExpense(){
//     const amount=parseFloat(el('expense-amount')?.value)||0;
//     const description=el('expense-description')?.value;
//     const expType=el('expense-type')?.value;
//     const account=el('expense-account')?.value;
//     if(!amount){alert('Amount enter karein');return;}
//     if(!description){alert('Description enter karein');return;}
//     if(!expType){alert('Category select karein');return;}
//     if(!account){alert('Account select karein');return;}
//     try{
//       let custId=null;
//       const{data:owner}=await supabase.from('customers').select('id').eq('category','Owner').maybeSingle();
//       if(owner){custId=owner.id;}
//       else{
//         const{data:no,error:ce}=await supabase.from('customers').insert([{sr_no:0,name:'Owner',category:'Owner',balance:0}]).select().single();
//         if(ce)throw ce; custId=no.id;
//       }
//       const{error}=await supabase.from('transactions').insert([{
//         customer_id:custId,transaction_type:'Expense',amount,
//         description:`${expType}: ${description} (From: ${account})`
//       }]);
//       if(error)throw error;
//       showToast('success','Kamyab!','Expense record ho gaya!');
//       closeModal('expenseModal'); await loadTransactions();
//     }catch(e){alert('Expense Error: '+e.message);}
//   }

//   async function handleCashAdvance(){
//     const cust=selectedCustomers.advance;
//     if(!cust){alert('Customer select karein — naam ya Sr# likhein aur list se choose karein');return;}
//     const amount=parseFloat(el('advance-amount')?.value)||0;
//     const reason=el('advance-reason')?.value||'';
//     const advDate=el('advance-date')?.value||new Date().toISOString().split('T')[0];
//     const notes=el('advance-notes')?.value||'';
//     if(!amount){alert('Amount enter karein');return;}
//     if(!reason){alert('Wajah select karein');return;}
//     try{
//       let advId=null;
//       try{
//         const{data:advData,error:advErr}=await supabase.from('cash_advances').insert([{
//           customer_id:parseInt(cust.id),amount,reason,advance_date:advDate,notes,status:'pending'
//         }]).select().single();
//         if(!advErr&&advData)advId=advData.id;
//       }catch(e2){console.warn('cash_advances table not ready:',e2.message);}

//       const txObj={customer_id:parseInt(cust.id),transaction_type:'Advance',amount,
//         description:`Cash Advance: ${reason}${notes?' | '+notes:''}`};
//       if(advId)txObj.cash_advance_id=advId;
//       const{error:txErr}=await supabase.from('transactions').insert([txObj]);
//       if(txErr)throw txErr;

//       const newBal=(parseFloat(cust.balance)||0)+amount;
//       await supabase.from('customers').update({balance:newBal}).eq('id',cust.id);
//       const lc=allCustomers.find(c=>c.id==cust.id); if(lc)lc.balance=newBal;

//       showToast('success','Kamyab!',`Cash Advance Rs.${fmt(amount)} record ho gaya!`);
//       closeModal('cashAdvanceModal'); selectedCustomers.advance=null;
//       printAdvanceReceipt({id:advId,customer:cust,amount,reason,notes,advance_date:advDate,newBalance:newBal});
//       await loadCustomers(); await loadTransactions(); await loadAdvanceList();
//     }catch(e){alert('Advance Error: '+e.message);}
//   }

//   // ── Print Advance Parchi ───────────────────────────────────
//   function printAdvanceReceipt(adv){
//     const company='Khalid & Sons Petroleum';
//     const pDate=new Date().toLocaleDateString('en-PK',{day:'2-digit',month:'long',year:'numeric'});
//     const pTime=new Date().toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'});
//     const c=adv.customer||adv.customers||{};const nb=adv.newBalance??0;
//     const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Cash Advance Parchi</title>
// <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;display:flex;justify-content:center;padding:20px}
// .r{width:340px;background:#fff;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,.15);overflow:hidden}
// .h{background:linear-gradient(135deg,#6f42c1,#8e44ad);color:#fff;padding:18px 20px;text-align:center}
// .h h2{font-size:16px;font-weight:700}.bdg{display:inline-block;background:rgba(255,255,255,.25);border:1px solid rgba(255,255,255,.5);border-radius:20px;padding:3px 14px;font-size:12px;font-weight:700;margin-top:8px}
// .b{padding:18px 20px}.row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px dashed #e8e8e8}.row:last-child{border:none}
// .lbl{font-size:12px;color:#888}.val{font-size:13px;font-weight:600;text-align:right}
// .amt{background:#f3eeff;border:2px solid #6f42c1;border-radius:8px;padding:14px;text-align:center;margin:14px 0}
// .amt .al{font-size:11px;color:#8e44ad;font-weight:600;text-transform:uppercase}.amt .av{font-size:28px;font-weight:800;color:#6f42c1}
// .bal{border-radius:8px;padding:10px 14px;margin:0 0 14px;text-align:center}
// .sig-row{display:flex;justify-content:space-around;padding:20px 20px 0}
// .sig-box{text-align:center;width:120px}.sig-line{border-top:1px solid #ccc;padding-top:4px;font-size:10px;color:#999;margin-top:30px}
// .f{background:#f8f8f8;padding:12px 20px;text-align:center;border-top:1px dashed #ddd}.f p{font-size:10px;color:#aaa;margin:2px 0}
// @media print{body{background:none;padding:0}.r{box-shadow:none;width:100%}}</style></head><body>
// <div class="r">
// <div class="h"><h2>⛽ ${company}</h2><p style="font-size:11px;opacity:.85">Cash Advance Receipt / Parchi</p><div class="bdg">CASH ADVANCE</div></div>
// <div class="b">
// <div class="amt"><div class="al">Advance Amount</div><div class="av">Rs. ${fmt(adv.amount)}</div></div>
// <div class="row"><span class="lbl">Receipt #</span><span class="val">ADV-${adv.id||'--'}</span></div>
// <div class="row"><span class="lbl">Taareekh</span><span class="val">${adv.advance_date||pDate}</span></div>
// <div class="row"><span class="lbl">Customer</span><span class="val">${c.name||'N/A'} (#${c.sr_no||'-'})</span></div>
// ${c.phone?`<div class="row"><span class="lbl">Phone</span><span class="val">${c.phone}</span></div>`:''}
// <div class="row"><span class="lbl">Wajah</span><span class="val">${adv.reason||'-'}</span></div>
// ${adv.notes?`<div class="row"><span class="lbl">Notes</span><span class="val">${adv.notes}</span></div>`:''}
// <div style="height:10px"></div>
// <div class="bal" style="background:${nb>0?'#fdecea':'#eafaf1'};border:1px solid ${nb>0?'#e74c3c':'#27ae60'}">
// <div style="font-size:11px;font-weight:600;color:${nb>0?'#c0392b':'#27ae60'}">${nb>0?'⚠️ Total Khata Baqi (Advance ke baad)':'✅ Account Clear'}</div>
// <div style="font-size:18px;font-weight:800;color:${nb>0?'#c0392b':'#27ae60'}">Rs. ${fmt(Math.abs(nb))}</div></div>
// <div class="sig-row"><div class="sig-box"><div class="sig-line">Customer Signature<br>دستخط</div></div>
// <div class="sig-box"><div class="sig-line">Authorized By<br>منظور کنندہ</div></div></div></div>
// <div class="f"><p><strong>${company}</strong></p><p>${pDate} ${pTime}</p><p>Yeh receipt sambhal kar rakhein</p></div>
// </div><script>window.onload=function(){window.print();}<\/script></body></html>`;
//     const w=window.open('','_blank','width=420,height=700');
//     if(w){w.document.write(html);w.document.close();}else alert('Popup blocked!');
//   }

//   // ── Cash Advance List ──────────────────────────────────────
//   async function loadAdvanceList(){
//     const tbody=el('advance-list-tbody'); if(!tbody)return;
//     tbody.innerHTML='<tr><td colspan="8" class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Loading...</td></tr>';
//     try{
//       const statusFilter=el('advance-filter-status')?.value||'';
//       let query=supabase.from('cash_advances').select('*, customers(name,sr_no,phone,balance)').order('advance_date',{ascending:false});
//       if(statusFilter)query=query.eq('status',statusFilter);
//       const{data,error}=await query;
//       if(error)throw error;
//       const advances=data||[];
//       const countEl=el('advance-list-count'); if(countEl)countEl.textContent=advances.length+' advances';
//       if(!advances.length){
//         tbody.innerHTML='<tr><td colspan="8" class="text-center py-4 text-muted"><i class="bi bi-inbox fs-4 d-block mb-2"></i>Koi cash advance nahi</td></tr>';
//         if(el('advance-list-tfoot'))el('advance-list-tfoot').innerHTML=''; return;
//       }
//       let totalAdv=0;
//       tbody.innerHTML=advances.map((a,idx)=>{
//         const amt=parseFloat(a.amount)||0; totalAdv+=amt;
//         const custBal=parseFloat(a.customers?.balance)||0;
//         const sMap={
//           pending:`<span style="background:#fff3cd;color:#856404;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;">⏳ Pending</span>`,
//           partial:`<span style="background:#cce5ff;color:#004085;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;">🔄 Partial</span>`,
//           cleared:`<span style="background:#d4edda;color:#155724;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;">✅ Cleared</span>`,
//         };
//         return `<tr>
//           <td style="padding:10px 12px;color:#888;">${idx+1}</td>
//           <td style="padding:10px 12px;"><strong>${a.customers?.name||'N/A'}</strong><br><small style="color:#888;">#${a.customers?.sr_no||'-'} | ${a.customers?.phone||'-'}</small></td>
//           <td style="padding:10px 12px;">${new Date(a.advance_date).toLocaleDateString('en-PK')}</td>
//           <td style="padding:10px 12px;font-weight:700;color:#6f42c1;font-size:15px;">Rs.${fmt(amt)}</td>
//           <td style="padding:10px 12px;">${a.reason||'-'}${a.notes?`<br><small style="color:#888">${a.notes}</small>`:''}</td>
//           <td style="padding:10px 12px;"><span style="font-weight:700;color:${custBal>0?'#dc3545':'#198754'};">Rs.${fmt(Math.abs(custBal))}</span><br><small style="color:${custBal>0?'#dc3545':'#198754'};">${custBal>0?'Baqi':'Saaf'}</small></td>
//           <td style="padding:10px 12px;">${sMap[a.status]||a.status}</td>
//           <td style="padding:10px 12px;">
//             <div style="display:flex;gap:4px;flex-wrap:wrap;">
//               <button onclick="window.printAdvanceById(${a.id})" style="background:#6f42c1;color:#fff;border:none;border-radius:5px;padding:4px 9px;cursor:pointer;font-size:12px;"><i class="bi bi-printer"></i> Parchi</button>
//               ${a.status!=='cleared'?`<button onclick="window.markAdvanceCleared(${a.id})" style="background:#198754;color:#fff;border:none;border-radius:5px;padding:4px 9px;cursor:pointer;font-size:12px;"><i class="bi bi-check2"></i> Clear</button>`:''}
//             </div>
//           </td>
//         </tr>`;
//       }).join('');
//       if(el('advance-list-tfoot'))el('advance-list-tfoot').innerHTML=`<tr style="background:#f3eeff;font-weight:800;">
//         <td colspan="3" style="padding:10px 12px;text-align:right;color:#6f42c1;">TOTAL:</td>
//         <td style="padding:10px 12px;color:#6f42c1;font-size:16px;">Rs.${fmt(totalAdv)}</td>
//         <td colspan="4"></td></tr>`;
//     }catch(e){
//       console.error('loadAdvanceList:',e);
//       if(tbody)tbody.innerHTML=`<tr><td colspan="8" class="text-center py-3 text-warning">
//         <i class="bi bi-exclamation-triangle me-1"></i>
//         Cash Advances table nahi mili — pehle <strong>db-migration.sql</strong> Supabase mein chalao
//       </td></tr>`;
//     }
//   }

//   window.printAdvanceById=async function(advId){
//     try{
//       const{data,error}=await supabase.from('cash_advances').select('*, customers(name,sr_no,phone,balance)').eq('id',advId).single();
//       if(error)throw error;
//       printAdvanceReceipt({...data,customer:data.customers,newBalance:data.customers?.balance||0});
//     }catch(e){alert('Error: '+e.message);}
//   };

//   window.markAdvanceCleared=async function(advId){
//     if(!confirm('Is advance ko Cleared mark karein?'))return;
//     try{
//       const{error}=await supabase.from('cash_advances').update({status:'cleared'}).eq('id',advId);
//       if(error)throw error;
//       showToast('success','Cleared!','Advance cleared ho gaya!');
//       await loadAdvanceList();
//     }catch(e){alert('Error: '+e.message);}
//   };

//   // ── Delete ─────────────────────────────────────────────────
//   window.deleteTransaction=async function(id){
//     if(!confirm('Delete karein?'))return;
//     try{
//       const{error}=await supabase.from('transactions').delete().eq('id',id);
//       if(error)throw error;
//       showToast('success','Deleted','Transaction delete ho gaya!');
//       await loadTransactions();
//     }catch(e){alert('Error: '+e.message);}
//   };

//   window.deleteSelected=async function(){
//     if(selectedIds.size===0){alert('Select karein pehle');return;}
//     if(!confirm(selectedIds.size+' delete karein?'))return;
//     const ids=[...selectedIds];
//     try{
//       for(let i=0;i<ids.length;i+=50){
//         const{error}=await supabase.from('transactions').delete().in('id',ids.slice(i,i+50));
//         if(error)throw error;
//       }
//       showToast('success','Deleted',ids.length+' delete ho gayi!');
//       selectedIds.clear(); await loadTransactions();
//     }catch(e){alert('Error: '+e.message);}
//   };

//   // ── Sale Helpers ────────────────────────────────────────────
//   window.updateSaleFuelPrice=function(){
//     const fuel=el('sale-fuel-type')?.value; if(!fuel)return;
//     const price=window.fuelPrices[fuel]||0;
//     if(el('sale-unit-price'))el('sale-unit-price').value=price;
//     const s=el('sale-price-source');
//     if(s){if(price>0){s.textContent=`${fuel} = Rs.${price}`;s.className='text-success small';}
//       else{s.textContent='⚠️ Settings mein price set karein';s.className='text-danger small';}}
//     window.calcSaleFromLiters();
//   };
//   window.calcSaleFromLiters=function(){const l=parseFloat(el('sale-liters')?.value)||0;const r=parseFloat(el('sale-unit-price')?.value)||0;if(el('sale-amount'))el('sale-amount').value=(l>0&&r>0)?(l*r).toFixed(2):'';};
//   window.calcSaleFromAmount=function(){const a=parseFloat(el('sale-amount-direct')?.value)||0;const r=parseFloat(el('sale-unit-price')?.value)||0;if(el('sale-amount'))el('sale-amount').value=a>0?a.toFixed(2):'';if(el('sale-liters')&&r>0&&a>0)el('sale-liters').value=(a/r).toFixed(2);};
//   window.toggleSaleMethod=function(method){const ls=el('sale-liters-section'),as_=el('sale-amount-section');if(method==='liters'){if(ls)ls.style.display='block';if(as_)as_.style.display='none';}else{if(ls)ls.style.display='none';if(as_)as_.style.display='block';}};
//   window.calculateVasooliAmount=function(){const fuel=el('vasooli-fuel-category')?.value;const liters=parseFloat(el('vasooli-liters')?.value)||0;if(!fuel||!liters)return;if(el('vasooli-amount'))el('vasooli-amount').value=(liters*(window.fuelPrices[fuel]||0)).toFixed(2);};

//   // ── Events ──────────────────────────────────────────────────
//   function setupEvents(){
//     el('newSaleForm')    ?.addEventListener('submit',e=>{e.preventDefault();handleNewSale();});
//     el('vasooliForm')    ?.addEventListener('submit',e=>{e.preventDefault();handleVasooli();});
//     el('expenseForm')    ?.addEventListener('submit',e=>{e.preventDefault();handleExpense();});
//     el('cashAdvanceForm')?.addEventListener('submit',e=>{e.preventDefault();handleCashAdvance();});
//     el('sale-fuel-type')       ?.addEventListener('change',window.updateSaleFuelPrice);
//     el('sale-liters')          ?.addEventListener('input',window.calcSaleFromLiters);
//     el('sale-amount-direct')   ?.addEventListener('input',window.calcSaleFromAmount);
//     el('lbl-by-liters')        ?.addEventListener('click',()=>window.toggleSaleMethod('liters'));
//     el('lbl-by-amount')        ?.addEventListener('click',()=>window.toggleSaleMethod('amount'));
//     el('vasooli-fuel-category')?.addEventListener('change',window.calculateVasooliAmount);
//     el('vasooli-liters')       ?.addEventListener('input',window.calculateVasooliAmount);
//     el('btn-apply-filter') ?.addEventListener('click',window.applyFilters);
//     el('btn-clear-filter') ?.addEventListener('click',window.clearTransactionFilters);
//     el('btn-print-all-summary') ?.addEventListener('click',window.printAllSummary);
//     el('btn-print-all-monthly') ?.addEventListener('click',window.printAllMonthly);
//     el('btn-print-selected-summary')?.addEventListener('click',window.printSelectedSummary);
//     el('btn-print-selected-monthly')?.addEventListener('click',window.printSelectedMonthly);
//     el('btn-delete-selected')       ?.addEventListener('click',window.deleteSelected);
//     el('btn-clear-selection')       ?.addEventListener('click',()=>{selectedIds.clear();renderPage();updateBulkBar();});
//     el('select-all-cb')?.addEventListener('change',function(){
//       const pageIds=filteredTransactions.slice((currentPage-1)*pageSize,currentPage*pageSize).map(t=>t.id);
//       pageIds.forEach(id=>{if(this.checked)selectedIds.add(id);else selectedIds.delete(id);});
//       renderPage(); updateBulkBar();
//     });
//     const si=el('filter-search');
//     if(si){let deb;si.addEventListener('input',()=>{clearTimeout(deb);deb=setTimeout(()=>{activeFilters.search=si.value;applyFilters();},300);});}
//     el('filter-customer')?.addEventListener('change',function(){activeFilters.customerId=this.value;applyFilters();});
//     el('advance-filter-status')?.addEventListener('change',loadAdvanceList);
//   }

//   // ── INIT ────────────────────────────────────────────────────
//   document.addEventListener('DOMContentLoaded',async()=>{
//     console.log('Transactions v5 init...');
//     setupEvents();
//     await loadFuelPrices();
//     await loadCustomers();        // customers load + dropdowns build
//     await loadExpenseCategories();
//     await loadTransactions();
//     await loadAdvanceList();
//     console.log('Transactions v5 ready.');
//   });

//   window.loadInitialTransactions=loadTransactions;
// })();


// again comment start from 1200





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

  function el(id) { return document.getElementById(id); }
  function fmt(n) { return Number(n||0).toLocaleString('en-PK',{minimumFractionDigits:2,maximumFractionDigits:2}); }

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
        // Hide print row on Cash Advance modal open
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
    const sorted=[...fuelPriceHistory].sort((a,b)=>new Date(b.date)-new Date(a.date));
    const entry=sorted.find(e=>new Date(e.date)<=target)||sorted[sorted.length-1];
    return fuelType==='Petrol'?parseFloat(entry.petrol):parseFloat(entry.diesel);
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
        .select('*, customers(name, sr_no)')
        .order('id',{ascending:false})
        .limit(500);
      if(error) throw error;
      const seen=new Set();
      allTransactions=(data||[]).filter(t=>{ if(seen.has(t.id))return false; seen.add(t.id); return true; });
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
      const a=parseFloat(t.charges)||0;
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
      'Expense':'background:#ffc107;color:#212529;'
    };
    const typeLabels={Credit:'Sale',Debit:'Vasooli',Advance:'Advance',Expense:'Expense'};

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
        <td style="vertical-align:middle;"><span style="display:inline-block;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:700;${bStyle}">${bText}</span></td>
        <td style="vertical-align:middle;">${fuelType}</td>
        <td style="vertical-align:middle;">${t.liters>0?fmt(t.liters)+' L':'-'}</td>
        <td style="vertical-align:middle;">${t.unit_price>0?'Rs.'+fmt(t.unit_price):'-'}</td>
        <td style="vertical-align:middle;"><strong>Rs.${fmt(t.charges)}</strong></td>
        <td style="vertical-align:middle;max-width:200px;word-break:break-word;font-size:12px;">${desc||'-'}</td>
        <td style="vertical-align:middle;white-space:nowrap;">
          <div style="display:flex;gap:3px;">
            <button title="Print" style="background:none;border:1px solid #0dcaf0;color:#0dcaf0;border-radius:4px;padding:3px 7px;cursor:pointer;" onclick="window.printSingle(${t.id})"><i class="bi bi-printer"></i></button>
            <button title="Delete" style="background:none;border:1px solid #dc3545;color:#dc3545;border-radius:4px;padding:3px 7px;cursor:pointer;" onclick="window.deleteTransaction(${t.id})"><i class="bi bi-trash"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');

    // Attach checkbox listeners
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
    const container=el('pagination-container'); if(!container) return;
    if(total===0){ container.innerHTML=''; return; }
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
    container.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;padding:10px 14px;border-top:1px solid #dee2e6;background:#f8f9fa;">
      <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#555;">Show:
        <select onchange="window.txChangePageSize(this.value)" style="padding:2px 6px;border-radius:4px;border:1px solid #ccc;font-size:13px;">
          <option value="10" ${pageSize===10?'selected':''}>10</option>
          <option value="25" ${pageSize===25?'selected':''}>25</option>
          <option value="50" ${pageSize===50?'selected':''}>50</option>
          <option value="100" ${pageSize===100?'selected':''}>100</option>
        </select>&nbsp;${startNum}–${endNum} of ${total}
      </div>
      <div style="display:flex;align-items:center;gap:2px;">
        <button onclick="window.txGoToPage(1)" ${currentPage===1?'disabled':''} style="padding:3px 9px;border-radius:4px;border:1px solid #ccc;background:#fff;cursor:pointer;">«</button>
        <button onclick="window.txGoToPage(${currentPage-1})" ${currentPage===1?'disabled':''} style="padding:3px 9px;border-radius:4px;border:1px solid #ccc;background:#fff;cursor:pointer;">‹</button>
        ${pagesHtml}
        <button onclick="window.txGoToPage(${currentPage+1})" ${currentPage===totalPages?'disabled':''} style="padding:3px 9px;border-radius:4px;border:1px solid #ccc;background:#fff;cursor:pointer;">›</button>
        <button onclick="window.txGoToPage(${totalPages})" ${currentPage===totalPages?'disabled':''} style="padding:3px 9px;border-radius:4px;border:1px solid #ccc;background:#fff;cursor:pointer;">»</button>
      </div>
    </div>`;
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
    txns.forEach(t=>{ const a=parseFloat(t.charges)||0;
      if(t.transaction_type==='Credit')totCr+=a;
      else if(t.transaction_type==='Debit')totDb+=a;
      else if(t.transaction_type==='Advance')totAdv+=a;
      else totEx+=a;
    });
    function buildRows(list){
      const tc={Credit:'#198754',Debit:'#0d6efd',Advance:'#6f42c1',Expense:'#cc8800'};
      return list.map(t=>{
        const d=t.created_at?new Date(t.created_at).toLocaleDateString('en-PK'):'—';
        const desc=t.description||'';
        const fuel=desc.toLowerCase().includes('petrol')?'Petrol':desc.toLowerCase().includes('diesel')?'Diesel':'-';
        return `<tr>
          <td>${d}</td><td>${t.customers?.name||'N/A'} (#${t.customers?.sr_no||'-'})</td>
          <td style="color:${tc[t.transaction_type]||'#555'};font-weight:700">${t.transaction_type}</td>
          <td>${fuel}</td>
          <td style="text-align:right">${t.liters>0?fmt(t.liters)+' L':'-'}</td>
          <td style="text-align:right;font-weight:700">Rs.${fmt(t.charges)}</td>
          <td style="text-align:right;color:#198754">${t.transaction_type==='Credit'?'Rs.'+fmt(t.charges):'-'}</td>
          <td style="text-align:right;color:#0d6efd">${t.transaction_type!=='Credit'?'Rs.'+fmt(t.charges):'-'}</td>
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
        map[key].list.push(t); const a=parseFloat(t.charges)||0;
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
    if(!fuelType){ alert('Fuel type select karein'); return; }
    if(!amount){ alert('Amount enter karein'); return; }
    try{
      const txType=paymentType==='cash'?'Debit':'Credit';
      const{error}=await supabase.from('transactions').insert([{
        customer_id:parseInt(cust.id), transaction_type:txType,
        charges:amount, liters:liters||null, unit_price:unitPrice||null,
        fuel_type:fuelType,
        description:`${fuelType} sale${description?' - '+description:''}`
      }]);
      if(error) throw error;
      if(txType==='Credit'){
        const newBal=(parseFloat(cust.balance)||0)+amount;
        await supabase.from('customers').update({balance:newBal}).eq('id',cust.id);
        const lc=allCustomers.find(c=>c.id==cust.id); if(lc) lc.balance=newBal;
      }
      showToast('success','Kamyab!',`${fuelType} Sale Rs.${fmt(amount)} record ho gayi!`);
      closeModal('newSaleModal'); selectedCustomers.sale=null;
      await loadTransactions();
    }catch(e){ alert('Sale Error: '+e.message); }
  }

  async function handleVasooli(){
    const cust=selectedCustomers.vasooli;
    if(!cust){ alert('Customer select karein'); return; }
    const amount=parseFloat(el('vasooli-amount')?.value)||0;
    const month=el('vasooli-month')?.value||'';
    const fuelCat=el('vasooli-fuel-category')?.value||'';
    const desc=el('vasooli-description')?.value||'';
    if(!amount){ alert('Amount enter karein'); return; }
    let fullDesc='Payment received';
    if(month){ const d=new Date(month+'-01'); fullDesc=`Payment for ${d.toLocaleDateString('en-US',{month:'long',year:'numeric'})}`; }
    if(fuelCat) fullDesc+=` (${fuelCat})`;
    if(desc) fullDesc+=` - ${desc}`;
    try{
      const{error}=await supabase.from('transactions').insert([{
        customer_id:parseInt(cust.id), transaction_type:'Debit', charges:amount, description:fullDesc
      }]);
      if(error) throw error;
      const newBal=Math.max(0,(parseFloat(cust.balance)||0)-amount);
      await supabase.from('customers').update({balance:newBal}).eq('id',cust.id);
      const lc=allCustomers.find(c=>c.id==cust.id); if(lc) lc.balance=newBal;
      showToast('success','Kamyab!',`Vasooli Rs.${fmt(amount)} record ho gayi!`);
      closeModal('vasooliModal'); selectedCustomers.vasooli=null;
      await loadTransactions();
    }catch(e){ alert('Vasooli Error: '+e.message); }
  }

  async function handleExpense(){
    const amount=parseFloat(el('expense-amount')?.value)||0;
    const description=el('expense-description')?.value||'';
    const expType=el('expense-type')?.value;
    const account=el('expense-account')?.value;
    // Customer optional — agar select kiya hai to us pe charge lagao, warna owner
    const cust=selectedCustomers.expense;

    if(!amount){ alert('Amount enter karein'); return; }
    if(!description){ alert('Description enter karein'); return; }
    if(!expType){ alert('Category select karein'); return; }
    if(!account){ alert('Account select karein'); return; }
    try{
      let custId=null;
      if(cust){
        // Customer ke balance mein add karo (agar uski taraf se expense hai)
        custId=parseInt(cust.id);
      } else {
        // Owner account se
        const{data:owner}=await supabase.from('customers').select('id').eq('category','Owner').maybeSingle();
        if(owner){ custId=owner.id; }
        else{
          const{data:no,error:ce}=await supabase.from('customers')
            .insert([{sr_no:0,name:'Owner',category:'Owner',balance:0}]).select().single();
          if(ce) throw ce; custId=no.id;
        }
      }
      const{error}=await supabase.from('transactions').insert([{
        customer_id:custId, transaction_type:'Expense', charges:amount,
        expense_type:expType, expense_account:account,
        description:`${expType}: ${description} (From: ${account})`
      }]);
      if(error) throw error;
      showToast('success','Kamyab!','Expense record ho gaya!');
      closeModal('expenseModal'); selectedCustomers.expense=null;
      await loadTransactions();
    }catch(e){ alert('Expense Error: '+e.message); }
  }

  // ══════════════════════════════════════════════════════════
  // CASH ADVANCE — Save only (separate print button)
  // ══════════════════════════════════════════════════════════
  async function handleCashAdvance(){
    const cust=selectedCustomers.advance;
    if(!cust){ alert('Customer select karein'); return; }
    const amount=parseFloat(el('advance-amount')?.value)||0;
    const reason=el('advance-reason')?.value||'';
    const advDate=el('advance-date')?.value||new Date().toISOString().split('T')[0];
    const notes=el('advance-notes')?.value||'';
    if(!amount){ alert('Amount enter karein'); return; }
    if(!reason){ alert('Wajah select karein'); return; }

    // Show loading state
    const btn=document.querySelector('#cashAdvanceForm button[type="submit"]');
    if(btn){ btn.disabled=true; btn.innerHTML='<span class="spinner-border spinner-border-sm me-1"></span>Saving...'; }

    try{
      // 1. Get user_id
      const userId=(await supabase.auth.getUser()).data?.user?.id||null;

      // 2. Insert into cash_advances — with user_id
      let advId=null;
      const advObj={customer_id:parseInt(cust.id),amount,reason,advance_date:advDate,notes,status:'pending'};
      if(userId) advObj.user_id=userId;

      const{data:advData,error:advErr}=await supabase.from('cash_advances').insert([advObj]).select().single();
      if(advErr){
        // If RLS fails, try without user_id
        const{data:advData2,error:advErr2}=await supabase.from('cash_advances')
          .insert([{customer_id:parseInt(cust.id),amount,reason,advance_date:advDate,notes,status:'pending'}])
          .select().single();
        if(!advErr2&&advData2) advId=advData2.id;
        else console.warn('cash_advances insert failed:',advErr2?.message);
      } else if(advData){ advId=advData.id; }

      // 3. Insert transaction
      const txObj={customer_id:parseInt(cust.id),transaction_type:'Advance',charges:amount,
        description:`Cash Advance: ${reason}${notes?' | '+notes:''}`};
      if(userId) txObj.user_id=userId;
      if(advId) txObj.cash_advance_id=advId;

      const{error:txErr}=await supabase.from('transactions').insert([txObj]);
      if(txErr) throw txErr;

      // 4. Update customer balance
      const newBal=(parseFloat(cust.balance)||0)+amount;
      await supabase.from('customers').update({balance:newBal}).eq('id',cust.id);
      const lc=allCustomers.find(c=>c.id==cust.id); if(lc) lc.balance=newBal;

      // 5. Store last saved advance for print button
      window._lastSavedAdvance={id:advId,customer:cust,amount,reason,notes,advance_date:advDate,newBalance:newBal};

      showToast('success','Saved!',`Cash Advance Rs.${fmt(amount)} save ho gaya!`);

      // Show print prompt
      if(el('advance-print-btn-row')) el('advance-print-btn-row').style.display='block';

      // Reset form but keep modal open to show print button
      if(el('advance-amount')) el('advance-amount').value='';
      if(el('advance-reason')) el('advance-reason').value='';
      if(el('advance-notes')) el('advance-notes').value='';
      if(el('advance-date')) el('advance-date').value='';
      // Reset customer
      selectedCustomers.advance=null;
      const hiddenEl=el('advance-customer-hidden'); if(hiddenEl) hiddenEl.value='';
      const searchEl=el('advance-cust-search'); if(searchEl){searchEl.value='';searchEl.style.display='block';}
      const boxEl=el('advance-cust-selected'); if(boxEl) boxEl.style.display='none';

      await loadCustomers();
      await loadTransactions();
      await loadAdvanceList();
    }catch(e){
      alert('Advance Error: '+e.message);
    }finally{
      if(btn){ btn.disabled=false; btn.innerHTML='<i class="bi bi-check-circle me-1"></i>Save Karein'; }
    }
  }

  window.printLastAdvance=function(){
    if(!window._lastSavedAdvance){ alert('Pehle advance save karein'); return; }
    printAdvanceReceipt(window._lastSavedAdvance);
  };

  // ══════════════════════════════════════════════════════════
  // PRINT ADVANCE PARCHI
  // ══════════════════════════════════════════════════════════
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

  // ══════════════════════════════════════════════════════════
  // CASH ADVANCE LIST
  // ══════════════════════════════════════════════════════════
  async function loadAdvanceList(){
    const tbody=el('advance-list-tbody'); if(!tbody) return;
    tbody.innerHTML='<tr><td colspan="8" class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Loading...</td></tr>';
    try{
      const statusFilter=el('advance-filter-status')?.value||'';
      let query=supabase.from('cash_advances')
        .select('*, customers(name,sr_no,phone,balance)')
        .order('advance_date',{ascending:false});
      if(statusFilter) query=query.eq('status',statusFilter);
      const{data,error}=await query;
      if(error) throw error;
      const advances=data||[];
      const countEl=el('advance-list-count'); if(countEl) countEl.textContent=advances.length+' advances';
      if(!advances.length){
        tbody.innerHTML='<tr><td colspan="8" class="text-center py-4 text-muted"><i class="bi bi-inbox fs-4 d-block mb-2"></i>Koi cash advance nahi</td></tr>';
        if(el('advance-list-tfoot')) el('advance-list-tfoot').innerHTML=''; return;
      }
      let totalAdv=0;
      tbody.innerHTML=advances.map((a,idx)=>{
        const amt=parseFloat(a.amount)||0; totalAdv+=amt;
        const custBal=parseFloat(a.customers?.balance)||0;
        const sMap={
          pending:`<span style="background:#fff3cd;color:#856404;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;">⏳ Pending</span>`,
          partial:`<span style="background:#cce5ff;color:#004085;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;">🔄 Partial</span>`,
          cleared:`<span style="background:#d4edda;color:#155724;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;">✅ Cleared</span>`,
        };
        return `<tr>
          <td style="padding:10px 12px;color:#888;">${idx+1}</td>
          <td style="padding:10px 12px;">
            <strong>${a.customers?.name||'N/A'}</strong><br>
            <small style="color:#888;">#${a.customers?.sr_no||'-'} | ${a.customers?.phone||'-'}</small>
          </td>
          <td style="padding:10px 12px;">${a.advance_date?new Date(a.advance_date).toLocaleDateString('en-PK'):'—'}</td>
          <td style="padding:10px 12px;font-weight:700;color:#6f42c1;font-size:15px;">Rs.${fmt(amt)}</td>
          <td style="padding:10px 12px;">${a.reason||'-'}${a.notes?`<br><small style="color:#888">${a.notes}</small>`:''}</td>
          <td style="padding:10px 12px;">
            <span style="font-weight:700;color:${custBal>0?'#dc3545':'#198754'};">Rs.${fmt(Math.abs(custBal))}</span>
            <br><small style="color:${custBal>0?'#dc3545':'#198754'};">${custBal>0?'Baqi':'Saaf'}</small>
          </td>
          <td style="padding:10px 12px;">${sMap[a.status]||a.status}</td>
          <td style="padding:10px 12px;">
            <div style="display:flex;gap:4px;flex-wrap:wrap;">
              <button onclick="window.printAdvListItem(${a.id})"
                style="background:#6f42c1;color:#fff;border:none;border-radius:5px;padding:4px 9px;cursor:pointer;font-size:12px;">
                <i class="bi bi-printer"></i> Parchi
              </button>
              ${a.status!=='cleared'?`<button onclick="window.markAdvanceCleared(${a.id})"
                style="background:#198754;color:#fff;border:none;border-radius:5px;padding:4px 9px;cursor:pointer;font-size:12px;">
                <i class="bi bi-check2"></i> Clear
              </button>`:''}
            </div>
          </td>
        </tr>`;
      }).join('');
      if(el('advance-list-tfoot')) el('advance-list-tfoot').innerHTML=`
        <tr style="background:#f3eeff;font-weight:800;">
          <td colspan="3" style="padding:10px 12px;text-align:right;color:#6f42c1;">TOTAL:</td>
          <td style="padding:10px 12px;color:#6f42c1;font-size:16px;">Rs.${fmt(totalAdv)}</td>
          <td colspan="4"></td>
        </tr>`;
    }catch(e){
      console.error('loadAdvanceList:',e);
      if(tbody) tbody.innerHTML=`<tr><td colspan="8" class="text-center py-3 text-warning">
        <i class="bi bi-exclamation-triangle me-1"></i>
        Cash Advances table nahi mili — pehle <strong>db-migration.sql</strong> Supabase mein chalao
      </td></tr>`;
    }
  }

  window.printAdvListItem=async function(advId){
    try{
      const{data,error}=await supabase.from('cash_advances')
        .select('*, customers(name,sr_no,phone,balance)').eq('id',advId).single();
      if(error) throw error;
      printAdvanceReceipt({...data,customer:data.customers,newBalance:data.customers?.balance||0});
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

  // ══════════════════════════════════════════════════════════
  // DELETE
  // ══════════════════════════════════════════════════════════
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

  // ══════════════════════════════════════════════════════════
  // SALE HELPERS
  // ══════════════════════════════════════════════════════════
  window.updateSaleFuelPrice=function(){
    const fuel=el('sale-fuel-type')?.value; if(!fuel) return;
    const price=window.fuelPrices[fuel]||0;
    if(el('sale-unit-price')) el('sale-unit-price').value=price;
    const s=el('sale-price-source');
    if(s){
      if(price>0){ s.textContent=`${fuel} = Rs.${price}`; s.className='text-success small'; }
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

  // ══════════════════════════════════════════════════════════
  // EVENT LISTENERS
  // ══════════════════════════════════════════════════════════
  function setupEvents(){
    el('newSaleForm')    ?.addEventListener('submit',e=>{ e.preventDefault(); handleNewSale(); });
    el('vasooliForm')    ?.addEventListener('submit',e=>{ e.preventDefault(); handleVasooli(); });
    el('expenseForm')    ?.addEventListener('submit',e=>{ e.preventDefault(); handleExpense(); });
    el('cashAdvanceForm')?.addEventListener('submit',e=>{ e.preventDefault(); handleCashAdvance(); });

    el('sale-fuel-type')       ?.addEventListener('change',window.updateSaleFuelPrice);
    el('sale-liters')          ?.addEventListener('input',window.calcSaleFromLiters);
    el('sale-amount-direct')   ?.addEventListener('input',window.calcSaleFromAmount);
    el('lbl-by-liters')        ?.addEventListener('click',()=>window.toggleSaleMethod('liters'));
    el('lbl-by-amount')        ?.addEventListener('click',()=>window.toggleSaleMethod('amount'));
    el('vasooli-fuel-category')?.addEventListener('change',window.calculateVasooliAmount);
    el('vasooli-liters')       ?.addEventListener('input',window.calculateVasooliAmount);

    el('btn-apply-filter')         ?.addEventListener('click',window.applyFilters);
    el('btn-clear-filter')         ?.addEventListener('click',window.clearTransactionFilters);
    el('btn-print-all-summary')    ?.addEventListener('click',window.printAllSummary);
    el('btn-print-all-monthly')    ?.addEventListener('click',window.printAllMonthly);
    el('btn-print-selected-summary')?.addEventListener('click',window.printSelectedSummary);
    el('btn-print-selected-monthly')?.addEventListener('click',window.printSelectedMonthly);
    el('btn-delete-selected')       ?.addEventListener('click',window.deleteSelected);
    el('btn-clear-selection')       ?.addEventListener('click',()=>{ selectedIds.clear(); renderPage(); updateBulkBar(); });

    el('select-all-cb')?.addEventListener('change',function(){
      const pageIds=filteredTransactions.slice((currentPage-1)*pageSize,currentPage*pageSize).map(t=>t.id);
      pageIds.forEach(id=>{ if(this.checked) selectedIds.add(id); else selectedIds.delete(id); });
      renderPage(); updateBulkBar();
    });

    const si=el('filter-search');
    if(si){ let deb; si.addEventListener('input',()=>{ clearTimeout(deb); deb=setTimeout(()=>{ activeFilters.search=si.value; applyFilters(); },300); }); }
    el('filter-customer') ?.addEventListener('change',function(){ activeFilters.customerId=this.value; applyFilters(); });
    el('advance-filter-status')?.addEventListener('change',loadAdvanceList);
  }

  // ══════════════════════════════════════════════════════════
  // INIT
  // ══════════════════════════════════════════════════════════
  document.addEventListener('DOMContentLoaded', async()=>{
    console.log('Transactions v5 init...');
    setupEvents();
    await loadFuelPrices();
    await loadCustomers();
    await loadExpenseCategories();
    await loadTransactions();
    await loadAdvanceList();
    console.log('Transactions v5 ready.');
  });

  window.loadInitialTransactions=loadTransactions;
})();