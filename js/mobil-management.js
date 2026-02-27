// add paginaation here and print section if not work then rest line 503 
// =============================================
// // MOBIL OIL MANAGEMENT - FINAL VERSION
// // Settings table use karta hai - NO tanks table
// // Auth disabled - no login required
// // =============================================
// (function () {
//   'use strict';

//   // Agar purana code cached hai to yeh line console mein dikhegi
//   console.log('mobil-management.js FINAL VERSION loaded - no tanks table');

//   const supabase = window.supabaseClient;

//   function $(id) { return document.getElementById(id); }

//   function fmt(num) {
//     return Number(num || 0).toLocaleString('en-PK', {
//       minimumFractionDigits: 2, maximumFractionDigits: 2
//     });
//   }

//   function showToast(message, type) {
//     type = type || 'info';
//     const toast = $('liveToast');
//     if (!toast) { alert(message); return; }
//     var titles = { success: 'Kamyab!', error: 'Ghalati', warning: 'Khabardar', info: 'Info' };
//     if ($('toast-title'))   $('toast-title').textContent   = titles[type] || 'Info';
//     if ($('toast-message')) $('toast-message').textContent = message;
//     toast.className = 'toast align-items-center border-0 ' + (
//       type === 'success' ? 'bg-success text-white' :
//       type === 'error'   ? 'bg-danger text-white'  :
//       type === 'warning' ? 'bg-warning'             : 'bg-secondary text-white'
//     );
//     new bootstrap.Toast(toast, { delay: 3500 }).show();
//   }

//   // ── SETTINGS TABLE HELPERS ─────────────────────────────────
//   // Koi bhi tanks query nahi hai — sirf settings table

//   async function getSettings() {
//     var res = await supabase
//       .from('settings')
//       .select('id, mobil_history, mobil_arrivals, mobil_sales')
//       .order('id', { ascending: true })
//       .limit(1)
//       .maybeSingle();
//     if (res.error) throw res.error;
//     return res.data;
//   }

//   async function patchSettings(settingsId, patch) {
//     patch.updated_at = new Date().toISOString();
//     var res = await supabase
//       .from('settings')
//       .update(patch)
//       .eq('id', settingsId);
//     if (res.error) throw res.error;
//   }

//   // ── MOBIL PRICES FROM SETTINGS ─────────────────────────────
//   async function getMobilPrices() {
//     try {
//       var s = await getSettings();
//       if (!s || !Array.isArray(s.mobil_history) || !s.mobil_history.length) return null;
//       var sorted = s.mobil_history.slice().sort(function(a,b){
//         return new Date(b.date) - new Date(a.date);
//       });
//       return sorted[0]; // { car_mobil, open_mobil }
//     } catch(e) {
//       console.warn('getMobilPrices error:', e);
//       return null;
//     }
//   }

//   // ── CALCULATE STOCK FROM SETTINGS ─────────────────────────
//   async function calcStock() {
//     try {
//       var s = await getSettings();
//       if (!s) return { car: 0, open: 0, settingsId: null, arrivals: [], sales: [] };

//       var arrivals = Array.isArray(s.mobil_arrivals) ? s.mobil_arrivals : [];
//       var sales    = Array.isArray(s.mobil_sales)    ? s.mobil_sales    : [];

//       var carIn   = arrivals.filter(function(r){ return r.type === 'Car Mobil'; })
//                             .reduce(function(t,r){ return t + (parseFloat(r.qty)||0); }, 0);
//       var openIn  = arrivals.filter(function(r){ return r.type === 'Open Mobil'; })
//                             .reduce(function(t,r){ return t + (parseFloat(r.qty)||0); }, 0);
//       var carOut  = sales.filter(function(r){ return r.type === 'Car Mobil'; })
//                          .reduce(function(t,r){ return t + (parseFloat(r.qty)||0); }, 0);
//       var openOut = sales.filter(function(r){ return r.type === 'Open Mobil'; })
//                          .reduce(function(t,r){ return t + (parseFloat(r.qty)||0); }, 0);

//       return {
//         car:  Math.max(0, carIn  - carOut),
//         open: Math.max(0, openIn - openOut),
//         settingsId: s.id,
//         arrivals:   arrivals,
//         sales:      sales
//       };
//     } catch(e) {
//       console.error('calcStock error:', e);
//       return { car: 0, open: 0, settingsId: null, arrivals: [], sales: [] };
//     }
//   }

//   // ── AUTO CALCULATE ─────────────────────────────────────────
//   function setupAutoCalc(qtyId, rateId, amtId) {
//     var q = $(qtyId), r = $(rateId), a = $(amtId);
//     if (!q || !r || !a) return;
//     function calc() {
//       a.value = ((parseFloat(q.value)||0) * (parseFloat(r.value)||0)).toFixed(2);
//     }
//     q.addEventListener('input', calc);
//     r.addEventListener('input', calc);
//   }

//   // ── PRICE AUTO-FILL IN SALE MODAL ─────────────────────────
//   async function setupPriceAutoFill() {
//     var typeEl   = $('sale-mobil-type');
//     var rateEl   = $('sale-rate');
//     var qtyEl    = $('sale-quantity');
//     var amtEl    = $('sale-amount');
//     var modalEl  = document.getElementById('saleMobilModal');
//     if (!typeEl || !rateEl) return;

//     var prices = await getMobilPrices();
//     console.log('Mobil prices from settings:', prices);

//     function apply() {
//       if (!prices) return;
//       var t = typeEl.value;
//       if (t === 'Car Mobil' && prices.car_mobil)   rateEl.value = prices.car_mobil;
//       if (t === 'Open Mobil' && prices.open_mobil)  rateEl.value = prices.open_mobil;
//       if (qtyEl && amtEl) {
//         amtEl.value = ((parseFloat(qtyEl.value)||0) * (parseFloat(rateEl.value)||0)).toFixed(2);
//       }
//     }

//     typeEl.addEventListener('change', apply);
//     if (modalEl) modalEl.addEventListener('show.bs.modal', apply);
//     apply();
//   }

//   // ── LOAD STOCK CARDS (4 cards) ────────────────────────────
//   async function loadMobilStock() {
//     try {
//       var s = await getSettings();
//       if (!s) return;

//       var arrivals = Array.isArray(s.mobil_arrivals) ? s.mobil_arrivals : [];
//       var sales    = Array.isArray(s.mobil_sales)    ? s.mobil_sales    : [];

//       // Arrived totals
//       var carIn   = arrivals.filter(function(r){ return r.type === 'Car Mobil'; })
//                             .reduce(function(t,r){ return t+(parseFloat(r.qty)||0); }, 0);
//       var openIn  = arrivals.filter(function(r){ return r.type === 'Open Mobil'; })
//                             .reduce(function(t,r){ return t+(parseFloat(r.qty)||0); }, 0);

//       // Sold totals
//       var carOut  = sales.filter(function(r){ return r.type === 'Car Mobil'; })
//                          .reduce(function(t,r){ return t+(parseFloat(r.qty)||0); }, 0);
//       var openOut = sales.filter(function(r){ return r.type === 'Open Mobil'; })
//                          .reduce(function(t,r){ return t+(parseFloat(r.qty)||0); }, 0);

//       // Remaining stock
//       var carStock  = Math.max(0, carIn  - carOut);
//       var openStock = Math.max(0, openIn - openOut);

//       // Card 1 & 2: Remaining stock
//       if ($('mobil-car-stock-page'))  $('mobil-car-stock-page').textContent  = fmt(carStock);
//       if ($('mobil-open-stock-page')) $('mobil-open-stock-page').textContent = fmt(openStock);

//       // Card 3 & 4: Total sales (liters sold)
//       if ($('mobil-car-sales-page'))  $('mobil-car-sales-page').textContent  = fmt(carOut);
//       if ($('mobil-open-sales-page')) $('mobil-open-sales-page').textContent = fmt(openOut);

//     } catch(e) {
//       console.error('loadMobilStock error:', e);
//     }
//   }

//   // ── CUSTOMER DROPDOWN ──────────────────────────────────────
//   async function loadCustomerDropdown() {
//     try {
//       var res = await supabase
//         .from('customers')
//         .select('id, sr_no, name, category')
//         .order('sr_no', { ascending: true });
//       if (res.error) throw res.error;

//       var sel = $('sale-customer');
//       if (!sel) return;
//       sel.innerHTML = '<option value="">-- Customer Select Karein --</option>';
//       (res.data || [])
//         .filter(function(c){ return (c.category||'').toLowerCase() !== 'owner'; })
//         .forEach(function(c){
//           sel.innerHTML += '<option value="' + c.id + '">' + (c.sr_no||'') + ' - ' + c.name + '</option>';
//         });
//     } catch(e) {
//       console.error('loadCustomerDropdown error:', e);
//     }
//   }

//   // ── LOAD TRANSACTIONS TABLE ────────────────────────────────
//   async function loadMobilTransactions() {
//     var tbody = $('mobil-transactions-table');
//     if (!tbody) return;
//     tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Loading...</td></tr>';

//     try {
//       var s = await getSettings();
//       if (!s) {
//         tbody.innerHTML = '<tr><td colspan="8" class="text-center text-warning py-4">Settings load nahi hui — Supabase check karein</td></tr>';
//         return;
//       }

//       var arrivals = (s.mobil_arrivals || []).map(function(r){
//         return Object.assign({}, r, {
//           _kind: 'arrival',
//           _label: 'Purchase',
//           _badge: 'bg-primary',
//           _party: r.supplier || 'Supplier',
//           _amount: r.total
//         });
//       });

//       var sales = (s.mobil_sales || []).map(function(r){
//         return Object.assign({}, r, {
//           _kind: 'sale',
//           _label: 'Sale',
//           _badge: 'bg-success',
//           _party: r.customer || '-',
//           _amount: r.amount
//         });
//       });

//       var all = arrivals.concat(sales).sort(function(a,b){
//         return new Date(b.date) - new Date(a.date);
//       });

//       if (!all.length) {
//         tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Koi record nahi hai — pehle stock receive karein</td></tr>';
//         return;
//       }

//       tbody.innerHTML = all.map(function(r){
//         var typeBadge = r.type === 'Car Mobil'
//           ? '<span class="badge bg-info text-dark">Car Mobil</span>'
//           : '<span class="badge bg-secondary">Open Mobil</span>';
//         var delBtn = r._kind === 'arrival'
//           ? '<button class="btn btn-sm btn-outline-danger" onclick="deleteMobilArrival(\'' + r.id + '\')"><i class="bi bi-trash"></i></button>'
//           : '<button class="btn btn-sm btn-outline-danger" onclick="deleteMobilSale(\'' + r.id + '\')"><i class="bi bi-trash"></i></button>';
//         return '<tr>' +
//           '<td>' + r.date + '</td>' +
//           '<td><span class="badge ' + r._badge + '">' + r._label + '</span></td>' +
//           '<td>' + typeBadge + '</td>' +
//           '<td>' + r._party + '</td>' +
//           '<td>' + fmt(r.qty) + ' L</td>' +
//           '<td>Rs. ' + fmt(r.rate) + '</td>' +
//           '<td><strong>Rs. ' + fmt(r._amount) + '</strong></td>' +
//           '<td>' + delBtn + '</td>' +
//           '</tr>';
//       }).join('');

//     } catch(e) {
//       console.error('loadMobilTransactions error:', e);
//       tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4">Error: ' + e.message + '</td></tr>';
//     }
//   }

//   // ══════════════════════════════════════════════════════════
//   // WINDOW FUNCTIONS
//   // ══════════════════════════════════════════════════════════

//   // 1. RECEIVE STOCK
//   window.receiveMobilStock = async function () {
//     var mobilType = $('receive-mobil-type') ? $('receive-mobil-type').value : '';
//     var supplier  = $('receive-supplier')   ? $('receive-supplier').value   : '';
//     var qty       = parseFloat($('receive-quantity') ? $('receive-quantity').value : 0);
//     var rate      = parseFloat($('receive-rate')     ? $('receive-rate').value     : 0);
//     var total     = parseFloat($('receive-amount')   ? $('receive-amount').value   : 0) || (qty * rate);
//     var date      = $('receive-date')    ? $('receive-date').value    : '';
//     var invoice   = $('receive-invoice') ? $('receive-invoice').value : '';
//     var notes     = $('receive-notes')   ? $('receive-notes').value   : '';

//     if (!mobilType || !qty || !rate || !date) {
//       showToast('Mobil Type, Quantity, Rate aur Date zaroor bharein', 'error');
//       return;
//     }

//     try {
//       var s = await getSettings();
//       if (!s) throw new Error('Settings row nahi mili — pehle settings page visit karein');

//       var arrivals = Array.isArray(s.mobil_arrivals) ? s.mobil_arrivals : [];
//       arrivals.push({
//         id:         Date.now().toString(),
//         date:       date,
//         type:       mobilType,
//         supplier:   supplier,
//         qty:        qty,
//         rate:       rate,
//         total:      total,
//         invoice:    invoice,
//         notes:      notes,
//         created_at: new Date().toISOString()
//       });

//       await patchSettings(s.id, { mobil_arrivals: arrivals });

//       showToast(qty + ' L ' + mobilType + ' stock add ho gaya!', 'success');

//       var modal = bootstrap.Modal.getInstance($('receiveMobilModal'));
//       if (modal) modal.hide();
//       if ($('receiveMobilForm')) $('receiveMobilForm').reset();
//       var today = new Date().toISOString().split('T')[0];
//       if ($('receive-date')) $('receive-date').value = today;

//       loadMobilStock();
//       loadMobilTransactions();

//     } catch(e) {
//       console.error('receiveMobilStock error:', e);
//       showToast('Error: ' + e.message, 'error');
//     }
//   };

//   // 2. SALE
//   window.saleMobilOil = async function () {
//     var custSel    = $('sale-customer');
//     var customerId = custSel ? custSel.value : '';
//     var custName   = custSel && custSel.selectedIndex >= 0
//       ? custSel.options[custSel.selectedIndex].text.replace(/^\d+\s*-\s*/, '')
//       : '';
//     var mobilType   = $('sale-mobil-type')    ? $('sale-mobil-type').value    : '';
//     var qty         = parseFloat($('sale-quantity')     ? $('sale-quantity').value     : 0);
//     var rate        = parseFloat($('sale-rate')         ? $('sale-rate').value         : 0);
//     var amount      = parseFloat($('sale-amount')       ? $('sale-amount').value       : 0) || (qty * rate);
//     var date        = $('sale-date')          ? $('sale-date').value          : '';
//     var paymentType = $('sale-payment-type')  ? $('sale-payment-type').value  : 'cash';
//     var notes       = $('sale-notes')         ? $('sale-notes').value         : '';

//     if (!mobilType || !qty || !rate || !date) {
//       showToast('Mobil Type, Quantity, Rate aur Date zaroor bharein', 'error');
//       return;
//     }

//     try {
//       var s = await getSettings();
//       if (!s) throw new Error('Settings row nahi mili');

//       var arrivals = Array.isArray(s.mobil_arrivals) ? s.mobil_arrivals : [];
//       var sales    = Array.isArray(s.mobil_sales)    ? s.mobil_sales    : [];

//       // Stock check
//       var arrived = arrivals.filter(function(r){ return r.type === mobilType; })
//                             .reduce(function(t,r){ return t+(parseFloat(r.qty)||0); }, 0);
//       var sold    = sales.filter(function(r){ return r.type === mobilType; })
//                          .reduce(function(t,r){ return t+(parseFloat(r.qty)||0); }, 0);
//       var available = Math.max(0, arrived - sold);

//       if (available < qty) {
//         showToast(mobilType + ' ka stock sirf ' + fmt(available) + ' L hai!', 'error');
//         return;
//       }

//       sales.push({
//         id:          Date.now().toString(),
//         date:        date,
//         type:        mobilType,
//         customer:    custName,
//         customer_id: customerId,
//         qty:         qty,
//         rate:        rate,
//         amount:      amount,
//         payment:     paymentType,
//         notes:       notes,
//         created_at:  new Date().toISOString()
//       });

//       await patchSettings(s.id, { mobil_sales: sales });

//       // Udhaar — customer balance update
//       if (paymentType === 'credit' && customerId) {
//         var cRes = await supabase.from('customers').select('balance').eq('id', customerId).maybeSingle();
//         if (!cRes.error && cRes.data) {
//           var newBal = (parseFloat(cRes.data.balance)||0) + amount;
//           await supabase.from('customers').update({ balance: newBal }).eq('id', customerId);
//         }
//         showToast('Sale! Rs.' + fmt(amount) + ' Udhaar add ho gaya', 'success');
//       } else {
//         showToast('Sale! Rs.' + fmt(amount) + ' Cash', 'success');
//       }

//       var modal = bootstrap.Modal.getInstance($('saleMobilModal'));
//       if (modal) modal.hide();
//       if ($('saleMobilForm')) $('saleMobilForm').reset();
//       var today = new Date().toISOString().split('T')[0];
//       if ($('sale-date')) $('sale-date').value = today;

//       await setupPriceAutoFill();
//       loadMobilStock();
//       loadMobilTransactions();

//     } catch(e) {
//       console.error('saleMobilOil error:', e);
//       showToast('Error: ' + e.message, 'error');
//     }
//   };

//   // 3. EXPENSE
//   window.addMobilExpense = async function () {
//     var expType = $('expense-type')                ? $('expense-type').value                : '';
//     var amount  = parseFloat($('expense-amount-mobil') ? $('expense-amount-mobil').value : 0);
//     var date    = $('expense-date')                ? $('expense-date').value                : '';
//     var desc    = $('expense-description-mobil')   ? $('expense-description-mobil').value   : '';

//     if (!expType || !amount || !date || !desc) {
//       showToast('Tamam fields zaroor bharein', 'error');
//       return;
//     }

//     try {
//       var ownerRes = await supabase.from('customers').select('id').eq('category', 'Owner').maybeSingle();
//       var ownerId  = ownerRes.data ? ownerRes.data.id : null;

//       var txRes = await supabase.from('transactions').insert([{
//         customer_id:      ownerId,
//         transaction_type: 'Expense',
//         amount:           amount,
//         liters:           0,
//         description:      'Mobil Expense - ' + expType + ': ' + desc,
//         created_at:       new Date(date + 'T00:00:00').toISOString()
//       }]);
//       if (txRes.error) throw txRes.error;

//       showToast('Expense save ho gaya!', 'success');

//       var modal = bootstrap.Modal.getInstance($('mobilExpenseModal'));
//       if (modal) modal.hide();
//       if ($('mobilExpenseForm')) $('mobilExpenseForm').reset();
//       var today = new Date().toISOString().split('T')[0];
//       if ($('expense-date')) $('expense-date').value = today;

//     } catch(e) {
//       console.error('addMobilExpense error:', e);
//       showToast('Error: ' + e.message, 'error');
//     }
//   };

//   // 4. DELETE ARRIVAL
//   window.deleteMobilArrival = async function (id) {
//     if (!confirm('Yeh arrival record delete karein?')) return;
//     try {
//       var s = await getSettings();
//       var arrivals = (s.mobil_arrivals || []).filter(function(r){ return r.id !== id; });
//       await patchSettings(s.id, { mobil_arrivals: arrivals });
//       showToast('Arrival delete ho gaya!', 'success');
//       loadMobilStock();
//       loadMobilTransactions();
//     } catch(e) { showToast('Error: ' + e.message, 'error'); }
//   };

//   // 5. DELETE SALE
//   window.deleteMobilSale = async function (id) {
//     if (!confirm('Yeh sale record delete karein?')) return;
//     try {
//       var s = await getSettings();
//       var sales = (s.mobil_sales || []).filter(function(r){ return r.id !== id; });
//       await patchSettings(s.id, { mobil_sales: sales });
//       showToast('Sale delete ho gaya!', 'success');
//       loadMobilStock();
//       loadMobilTransactions();
//     } catch(e) { showToast('Error: ' + e.message, 'error'); }
//   };

//   // 6. VIEW HISTORY
//   window.viewMobilHistory = function () {
//     window.location.href = 'mobil-stock.html';
//   };

//   // ── INIT ───────────────────────────────────────────────────
//   document.addEventListener('DOMContentLoaded', async function () {
//     if (document.body.getAttribute('data-page') !== 'mobil') return;
//     console.log('Mobil Management FINAL init...');

//     var today = new Date().toISOString().split('T')[0];
//     if ($('receive-date')) $('receive-date').value = today;
//     if ($('sale-date'))    $('sale-date').value    = today;
//     if ($('expense-date')) $('expense-date').value = today;

//     setupAutoCalc('receive-quantity', 'receive-rate', 'receive-amount');
//     setupAutoCalc('sale-quantity',    'sale-rate',    'sale-amount');

//     await setupPriceAutoFill();
//     await loadCustomerDropdown();
//     await loadMobilStock();
//     await loadMobilTransactions();

//     console.log('Mobil Management FINAL ready!');
//   });

// })();

// 505 new code assign for add 2 more card exact work here  
// =============================================
// // MOBIL OIL MANAGEMENT - FINAL VERSION
// // Settings table use karta hai - NO tanks table
// // Auth disabled - no login required
// // =============================================
// (function () {
//   'use strict';

//   // Agar purana code cached hai to yeh line console mein dikhegi
//   console.log('mobil-management.js FINAL VERSION loaded - no tanks table');

//   const supabase = window.supabaseClient;

//   function $(id) { return document.getElementById(id); }

//   function fmt(num) {
//     return Number(num || 0).toLocaleString('en-PK', {
//       minimumFractionDigits: 2, maximumFractionDigits: 2
//     });
//   }

//   function showToast(message, type) {
//     type = type || 'info';
//     const toast = $('liveToast');
//     if (!toast) { alert(message); return; }
//     var titles = { success: 'Kamyab!', error: 'Ghalati', warning: 'Khabardar', info: 'Info' };
//     if ($('toast-title'))   $('toast-title').textContent   = titles[type] || 'Info';
//     if ($('toast-message')) $('toast-message').textContent = message;
//     toast.className = 'toast align-items-center border-0 ' + (
//       type === 'success' ? 'bg-success text-white' :
//       type === 'error'   ? 'bg-danger text-white'  :
//       type === 'warning' ? 'bg-warning'             : 'bg-secondary text-white'
//     );
//     new bootstrap.Toast(toast, { delay: 3500 }).show();
//   }

//   // ── SETTINGS TABLE HELPERS ─────────────────────────────────
//   // Koi bhi tanks query nahi hai — sirf settings table

//   async function getSettings() {
//     var res = await supabase
//       .from('settings')
//       .select('id, mobil_history, mobil_arrivals, mobil_sales')
//       .order('id', { ascending: true })
//       .limit(1)
//       .maybeSingle();
//     if (res.error) throw res.error;
//     return res.data;
//   }

//   async function patchSettings(settingsId, patch) {
//     patch.updated_at = new Date().toISOString();
//     var res = await supabase
//       .from('settings')
//       .update(patch)
//       .eq('id', settingsId);
//     if (res.error) throw res.error;
//   }

//   // ── MOBIL PRICES FROM SETTINGS ─────────────────────────────
//   async function getMobilPrices() {
//     try {
//       var s = await getSettings();
//       if (!s || !Array.isArray(s.mobil_history) || !s.mobil_history.length) return null;
//       var sorted = s.mobil_history.slice().sort(function(a,b){
//         return new Date(b.date) - new Date(a.date);
//       });
//       return sorted[0]; // { car_mobil, open_mobil }
//     } catch(e) {
//       console.warn('getMobilPrices error:', e);
//       return null;
//     }
//   }

//   // ── CALCULATE STOCK FROM SETTINGS ─────────────────────────
//   async function calcStock() {
//     try {
//       var s = await getSettings();
//       if (!s) return { car: 0, open: 0, settingsId: null, arrivals: [], sales: [] };

//       var arrivals = Array.isArray(s.mobil_arrivals) ? s.mobil_arrivals : [];
//       var sales    = Array.isArray(s.mobil_sales)    ? s.mobil_sales    : [];

//       var carIn   = arrivals.filter(function(r){ return r.type === 'Car Mobil'; })
//                             .reduce(function(t,r){ return t + (parseFloat(r.qty)||0); }, 0);
//       var openIn  = arrivals.filter(function(r){ return r.type === 'Open Mobil'; })
//                             .reduce(function(t,r){ return t + (parseFloat(r.qty)||0); }, 0);
//       var carOut  = sales.filter(function(r){ return r.type === 'Car Mobil'; })
//                          .reduce(function(t,r){ return t + (parseFloat(r.qty)||0); }, 0);
//       var openOut = sales.filter(function(r){ return r.type === 'Open Mobil'; })
//                          .reduce(function(t,r){ return t + (parseFloat(r.qty)||0); }, 0);

//       return {
//         car:  Math.max(0, carIn  - carOut),
//         open: Math.max(0, openIn - openOut),
//         settingsId: s.id,
//         arrivals:   arrivals,
//         sales:      sales
//       };
//     } catch(e) {
//       console.error('calcStock error:', e);
//       return { car: 0, open: 0, settingsId: null, arrivals: [], sales: [] };
//     }
//   }

//   // ── AUTO CALCULATE ─────────────────────────────────────────
//   function setupAutoCalc(qtyId, rateId, amtId) {
//     var q = $(qtyId), r = $(rateId), a = $(amtId);
//     if (!q || !r || !a) return;
//     function calc() {
//       a.value = ((parseFloat(q.value)||0) * (parseFloat(r.value)||0)).toFixed(2);
//     }
//     q.addEventListener('input', calc);
//     r.addEventListener('input', calc);
//   }

//   // ── PRICE AUTO-FILL IN SALE MODAL ─────────────────────────
//   async function setupPriceAutoFill() {
//     var typeEl   = $('sale-mobil-type');
//     var rateEl   = $('sale-rate');
//     var qtyEl    = $('sale-quantity');
//     var amtEl    = $('sale-amount');
//     var modalEl  = document.getElementById('saleMobilModal');
//     if (!typeEl || !rateEl) return;

//     var prices = await getMobilPrices();
//     console.log('Mobil prices from settings:', prices);

//     function apply() {
//       if (!prices) return;
//       var t = typeEl.value;
//       if (t === 'Car Mobil' && prices.car_mobil)   rateEl.value = prices.car_mobil;
//       if (t === 'Open Mobil' && prices.open_mobil)  rateEl.value = prices.open_mobil;
//       if (qtyEl && amtEl) {
//         amtEl.value = ((parseFloat(qtyEl.value)||0) * (parseFloat(rateEl.value)||0)).toFixed(2);
//       }
//     }

//     typeEl.addEventListener('change', apply);
//     if (modalEl) modalEl.addEventListener('show.bs.modal', apply);
//     apply();
//   }

//   // ── LOAD STOCK CARDS ───────────────────────────────────────
//   async function loadMobilStock() {
//     try {
//       var stock = await calcStock();
//       if ($('mobil-car-stock-page'))  $('mobil-car-stock-page').textContent  = fmt(stock.car);
//       if ($('mobil-open-stock-page')) $('mobil-open-stock-page').textContent = fmt(stock.open);
//     } catch(e) {
//       console.error('loadMobilStock error:', e);
//     }
//   }

//   // ── CUSTOMER DROPDOWN ──────────────────────────────────────
//   async function loadCustomerDropdown() {
//     try {
//       var res = await supabase
//         .from('customers')
//         .select('id, sr_no, name, category')
//         .order('sr_no', { ascending: true });
//       if (res.error) throw res.error;

//       var sel = $('sale-customer');
//       if (!sel) return;
//       sel.innerHTML = '<option value="">-- Customer Select Karein --</option>';
//       (res.data || [])
//         .filter(function(c){ return (c.category||'').toLowerCase() !== 'owner'; })
//         .forEach(function(c){
//           sel.innerHTML += '<option value="' + c.id + '">' + (c.sr_no||'') + ' - ' + c.name + '</option>';
//         });
//     } catch(e) {
//       console.error('loadCustomerDropdown error:', e);
//     }
//   }

//   // ── LOAD TRANSACTIONS TABLE ────────────────────────────────
//   async function loadMobilTransactions() {
//     var tbody = $('mobil-transactions-table');
//     if (!tbody) return;
//     tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Loading...</td></tr>';

//     try {
//       var s = await getSettings();
//       if (!s) {
//         tbody.innerHTML = '<tr><td colspan="8" class="text-center text-warning py-4">Settings load nahi hui — Supabase check karein</td></tr>';
//         return;
//       }

//       var arrivals = (s.mobil_arrivals || []).map(function(r){
//         return Object.assign({}, r, {
//           _kind: 'arrival',
//           _label: 'Purchase',
//           _badge: 'bg-primary',
//           _party: r.supplier || 'Supplier',
//           _amount: r.total
//         });
//       });

//       var sales = (s.mobil_sales || []).map(function(r){
//         return Object.assign({}, r, {
//           _kind: 'sale',
//           _label: 'Sale',
//           _badge: 'bg-success',
//           _party: r.customer || '-',
//           _amount: r.amount
//         });
//       });

//       var all = arrivals.concat(sales).sort(function(a,b){
//         return new Date(b.date) - new Date(a.date);
//       });

//       if (!all.length) {
//         tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Koi record nahi hai — pehle stock receive karein</td></tr>';
//         return;
//       }

//       tbody.innerHTML = all.map(function(r){
//         var typeBadge = r.type === 'Car Mobil'
//           ? '<span class="badge bg-info text-dark">Car Mobil</span>'
//           : '<span class="badge bg-secondary">Open Mobil</span>';
//         var delBtn = r._kind === 'arrival'
//           ? '<button class="btn btn-sm btn-outline-danger" onclick="deleteMobilArrival(\'' + r.id + '\')"><i class="bi bi-trash"></i></button>'
//           : '<button class="btn btn-sm btn-outline-danger" onclick="deleteMobilSale(\'' + r.id + '\')"><i class="bi bi-trash"></i></button>';
//         return '<tr>' +
//           '<td>' + r.date + '</td>' +
//           '<td><span class="badge ' + r._badge + '">' + r._label + '</span></td>' +
//           '<td>' + typeBadge + '</td>' +
//           '<td>' + r._party + '</td>' +
//           '<td>' + fmt(r.qty) + ' L</td>' +
//           '<td>Rs. ' + fmt(r.rate) + '</td>' +
//           '<td><strong>Rs. ' + fmt(r._amount) + '</strong></td>' +
//           '<td>' + delBtn + '</td>' +
//           '</tr>';
//       }).join('');

//     } catch(e) {
//       console.error('loadMobilTransactions error:', e);
//       tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4">Error: ' + e.message + '</td></tr>';
//     }
//   }

//   // ══════════════════════════════════════════════════════════
//   // WINDOW FUNCTIONS
//   // ══════════════════════════════════════════════════════════

//   // 1. RECEIVE STOCK
//   window.receiveMobilStock = async function () {
//     var mobilType = $('receive-mobil-type') ? $('receive-mobil-type').value : '';
//     var supplier  = $('receive-supplier')   ? $('receive-supplier').value   : '';
//     var qty       = parseFloat($('receive-quantity') ? $('receive-quantity').value : 0);
//     var rate      = parseFloat($('receive-rate')     ? $('receive-rate').value     : 0);
//     var total     = parseFloat($('receive-amount')   ? $('receive-amount').value   : 0) || (qty * rate);
//     var date      = $('receive-date')    ? $('receive-date').value    : '';
//     var invoice   = $('receive-invoice') ? $('receive-invoice').value : '';
//     var notes     = $('receive-notes')   ? $('receive-notes').value   : '';

//     if (!mobilType || !qty || !rate || !date) {
//       showToast('Mobil Type, Quantity, Rate aur Date zaroor bharein', 'error');
//       return;
//     }

//     try {
//       var s = await getSettings();
//       if (!s) throw new Error('Settings row nahi mili — pehle settings page visit karein');

//       var arrivals = Array.isArray(s.mobil_arrivals) ? s.mobil_arrivals : [];
//       arrivals.push({
//         id:         Date.now().toString(),
//         date:       date,
//         type:       mobilType,
//         supplier:   supplier,
//         qty:        qty,
//         rate:       rate,
//         total:      total,
//         invoice:    invoice,
//         notes:      notes,
//         created_at: new Date().toISOString()
//       });

//       await patchSettings(s.id, { mobil_arrivals: arrivals });

//       showToast(qty + ' L ' + mobilType + ' stock add ho gaya!', 'success');

//       var modal = bootstrap.Modal.getInstance($('receiveMobilModal'));
//       if (modal) modal.hide();
//       if ($('receiveMobilForm')) $('receiveMobilForm').reset();
//       var today = new Date().toISOString().split('T')[0];
//       if ($('receive-date')) $('receive-date').value = today;

//       loadMobilStock();
//       loadMobilTransactions();

//     } catch(e) {
//       console.error('receiveMobilStock error:', e);
//       showToast('Error: ' + e.message, 'error');
//     }
//   };

//   // 2. SALE
//   window.saleMobilOil = async function () {
//     var custSel    = $('sale-customer');
//     var customerId = custSel ? custSel.value : '';
//     var custName   = custSel && custSel.selectedIndex >= 0
//       ? custSel.options[custSel.selectedIndex].text.replace(/^\d+\s*-\s*/, '')
//       : '';
//     var mobilType   = $('sale-mobil-type')    ? $('sale-mobil-type').value    : '';
//     var qty         = parseFloat($('sale-quantity')     ? $('sale-quantity').value     : 0);
//     var rate        = parseFloat($('sale-rate')         ? $('sale-rate').value         : 0);
//     var amount      = parseFloat($('sale-amount')       ? $('sale-amount').value       : 0) || (qty * rate);
//     var date        = $('sale-date')          ? $('sale-date').value          : '';
//     var paymentType = $('sale-payment-type')  ? $('sale-payment-type').value  : 'cash';
//     var notes       = $('sale-notes')         ? $('sale-notes').value         : '';

//     if (!mobilType || !qty || !rate || !date) {
//       showToast('Mobil Type, Quantity, Rate aur Date zaroor bharein', 'error');
//       return;
//     }

//     try {
//       var s = await getSettings();
//       if (!s) throw new Error('Settings row nahi mili');

//       var arrivals = Array.isArray(s.mobil_arrivals) ? s.mobil_arrivals : [];
//       var sales    = Array.isArray(s.mobil_sales)    ? s.mobil_sales    : [];

//       // Stock check
//       var arrived = arrivals.filter(function(r){ return r.type === mobilType; })
//                             .reduce(function(t,r){ return t+(parseFloat(r.qty)||0); }, 0);
//       var sold    = sales.filter(function(r){ return r.type === mobilType; })
//                          .reduce(function(t,r){ return t+(parseFloat(r.qty)||0); }, 0);
//       var available = Math.max(0, arrived - sold);

//       if (available < qty) {
//         showToast(mobilType + ' ka stock sirf ' + fmt(available) + ' L hai!', 'error');
//         return;
//       }

//       sales.push({
//         id:          Date.now().toString(),
//         date:        date,
//         type:        mobilType,
//         customer:    custName,
//         customer_id: customerId,
//         qty:         qty,
//         rate:        rate,
//         amount:      amount,
//         payment:     paymentType,
//         notes:       notes,
//         created_at:  new Date().toISOString()
//       });

//       await patchSettings(s.id, { mobil_sales: sales });

//       // Udhaar — customer balance update
//       if (paymentType === 'credit' && customerId) {
//         var cRes = await supabase.from('customers').select('balance').eq('id', customerId).maybeSingle();
//         if (!cRes.error && cRes.data) {
//           var newBal = (parseFloat(cRes.data.balance)||0) + amount;
//           await supabase.from('customers').update({ balance: newBal }).eq('id', customerId);
//         }
//         showToast('Sale! Rs.' + fmt(amount) + ' Udhaar add ho gaya', 'success');
//       } else {
//         showToast('Sale! Rs.' + fmt(amount) + ' Cash', 'success');
//       }

//       var modal = bootstrap.Modal.getInstance($('saleMobilModal'));
//       if (modal) modal.hide();
//       if ($('saleMobilForm')) $('saleMobilForm').reset();
//       var today = new Date().toISOString().split('T')[0];
//       if ($('sale-date')) $('sale-date').value = today;

//       await setupPriceAutoFill();
//       loadMobilStock();
//       loadMobilTransactions();

//     } catch(e) {
//       console.error('saleMobilOil error:', e);
//       showToast('Error: ' + e.message, 'error');
//     }
//   };

//   // 3. EXPENSE
//   window.addMobilExpense = async function () {
//     var expType = $('expense-type')                ? $('expense-type').value                : '';
//     var amount  = parseFloat($('expense-amount-mobil') ? $('expense-amount-mobil').value : 0);
//     var date    = $('expense-date')                ? $('expense-date').value                : '';
//     var desc    = $('expense-description-mobil')   ? $('expense-description-mobil').value   : '';

//     if (!expType || !amount || !date || !desc) {
//       showToast('Tamam fields zaroor bharein', 'error');
//       return;
//     }

//     try {
//       var ownerRes = await supabase.from('customers').select('id').eq('category', 'Owner').maybeSingle();
//       var ownerId  = ownerRes.data ? ownerRes.data.id : null;

//       var txRes = await supabase.from('transactions').insert([{
//         customer_id:      ownerId,
//         transaction_type: 'Expense',
//         amount:           amount,
//         liters:           0,
//         description:      'Mobil Expense - ' + expType + ': ' + desc,
//         created_at:       new Date(date + 'T00:00:00').toISOString()
//       }]);
//       if (txRes.error) throw txRes.error;

//       showToast('Expense save ho gaya!', 'success');

//       var modal = bootstrap.Modal.getInstance($('mobilExpenseModal'));
//       if (modal) modal.hide();
//       if ($('mobilExpenseForm')) $('mobilExpenseForm').reset();
//       var today = new Date().toISOString().split('T')[0];
//       if ($('expense-date')) $('expense-date').value = today;

//     } catch(e) {
//       console.error('addMobilExpense error:', e);
//       showToast('Error: ' + e.message, 'error');
//     }
//   };

//   // 4. DELETE ARRIVAL
//   window.deleteMobilArrival = async function (id) {
//     if (!confirm('Yeh arrival record delete karein?')) return;
//     try {
//       var s = await getSettings();
//       var arrivals = (s.mobil_arrivals || []).filter(function(r){ return r.id !== id; });
//       await patchSettings(s.id, { mobil_arrivals: arrivals });
//       showToast('Arrival delete ho gaya!', 'success');
//       loadMobilStock();
//       loadMobilTransactions();
//     } catch(e) { showToast('Error: ' + e.message, 'error'); }
//   };

//   // 5. DELETE SALE
//   window.deleteMobilSale = async function (id) {
//     if (!confirm('Yeh sale record delete karein?')) return;
//     try {
//       var s = await getSettings();
//       var sales = (s.mobil_sales || []).filter(function(r){ return r.id !== id; });
//       await patchSettings(s.id, { mobil_sales: sales });
//       showToast('Sale delete ho gaya!', 'success');
//       loadMobilStock();
//       loadMobilTransactions();
//     } catch(e) { showToast('Error: ' + e.message, 'error'); }
//   };

//   // 6. VIEW HISTORY
//   window.viewMobilHistory = function () {
//     window.location.href = 'mobil-stock.html';
//   };

//   // ── INIT ───────────────────────────────────────────────────
//   document.addEventListener('DOMContentLoaded', async function () {
//     if (document.body.getAttribute('data-page') !== 'mobil') return;
//     console.log('Mobil Management FINAL init...');

//     var today = new Date().toISOString().split('T')[0];
//     if ($('receive-date')) $('receive-date').value = today;
//     if ($('sale-date'))    $('sale-date').value    = today;
//     if ($('expense-date')) $('expense-date').value = today;

//     setupAutoCalc('receive-quantity', 'receive-rate', 'receive-amount');
//     setupAutoCalc('sale-quantity',    'sale-rate',    'sale-amount');

//     await setupPriceAutoFill();
//     await loadCustomerDropdown();
//     await loadMobilStock();
//     await loadMobilTransactions();

//     console.log('Mobil Management FINAL ready!');
//   });

// })();


// end of the card 

// =============================================
// MOBIL OIL MANAGEMENT - v4
// Search + Filter + Pagination + Print
// Settings table only - NO tanks table
// =============================================
(function () {
  'use strict';

  console.log('mobil-management.js v4 loaded');

  const supabase = window.supabaseClient;

  // ── State ──────────────────────────────────────────────────
  var allRecords      = [];   // all arrivals + sales combined
  var filteredRecords = [];   // after filters
  var currentPage     = 1;
  var pageSize        = 15;

  function $(id) { return document.getElementById(id); }

  function fmt(n) {
    return Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function showToast(msg, type) {
    type = type || 'info';
    var t = $('liveToast'); if (!t) { alert(msg); return; }
    var titles = { success: 'Kamyab!', error: 'Ghalati', warning: 'Khabardar', info: 'Info' };
    if ($('toast-title'))   $('toast-title').textContent   = titles[type] || 'Info';
    if ($('toast-message')) $('toast-message').textContent = msg;
    t.className = 'toast align-items-center border-0 ' + (
      type === 'success' ? 'bg-success text-white' :
      type === 'error'   ? 'bg-danger text-white'  :
      type === 'warning' ? 'bg-warning'             : 'bg-secondary text-white');
    new bootstrap.Toast(t, { delay: 3500 }).show();
  }

  // ── SETTINGS HELPERS ───────────────────────────────────────
  async function getSettings() {
    var r = await supabase.from('settings').select('*')
              .order('id', { ascending: true }).limit(1).maybeSingle();
    if (r.error) throw r.error;
    return r.data;
  }

  async function patchSettings(sid, patch) {
    patch.updated_at = new Date().toISOString();
    var r = await supabase.from('settings').update(patch).eq('id', sid);
    if (r.error) throw r.error;
  }

  async function getMobilPrices() {
    try {
      var s = await getSettings();
      if (!s || !Array.isArray(s.mobil_history) || !s.mobil_history.length) return null;
      return s.mobil_history.slice().sort(function(a,b){
        return new Date(b.date) - new Date(a.date);
      })[0];
    } catch(e) { return null; }
  }

  // ── STOCK CARDS ────────────────────────────────────────────
  async function loadMobilStock() {
    try {
      // Read from new dedicated tables mobil_arrivals and mobil_sales
      var arrRes  = await supabase.from('mobil_arrivals').select('quantity, category');
      var saleRes = await supabase.from('mobil_sales').select('quantity, category');
      var arrivals = arrRes.data  || [];
      var sales    = saleRes.data || [];

      var carIn   = arrivals.filter(function(r){ return r.category==='Car Mobil'; })
                            .reduce(function(t,r){ return t+(parseFloat(r.quantity)||0); }, 0);
      var openIn  = arrivals.filter(function(r){ return r.category==='Open Mobil'; })
                            .reduce(function(t,r){ return t+(parseFloat(r.quantity)||0); }, 0);
      var carOut  = sales.filter(function(r){ return r.category==='Car Mobil'; })
                         .reduce(function(t,r){ return t+(parseFloat(r.quantity)||0); }, 0);
      var openOut = sales.filter(function(r){ return r.category==='Open Mobil'; })
                         .reduce(function(t,r){ return t+(parseFloat(r.quantity)||0); }, 0);

      if ($('mobil-car-stock-page'))  $('mobil-car-stock-page').textContent  = fmt(Math.max(0, carIn  - carOut));
      if ($('mobil-open-stock-page')) $('mobil-open-stock-page').textContent = fmt(Math.max(0, openIn - openOut));
      if ($('mobil-car-sales-page'))  $('mobil-car-sales-page').textContent  = fmt(carOut);
      if ($('mobil-open-sales-page')) $('mobil-open-sales-page').textContent = fmt(openOut);
    } catch(e) { console.error('loadMobilStock:', e); }
  }

  // ── AUTO CALCULATE ─────────────────────────────────────────
  function setupAutoCalc(qId, rId, aId) {
    var q=$( qId), r=$(rId), a=$(aId); if (!q||!r||!a) return;
    function c(){ a.value=((parseFloat(q.value)||0)*(parseFloat(r.value)||0)).toFixed(2); }
    q.addEventListener('input',c); r.addEventListener('input',c);
  }

  // ── PRICE AUTO-FILL ────────────────────────────────────────
  async function setupPriceAutoFill() {
    var typeEl  = $('sale-mobil-type'), rateEl = $('sale-rate');
    var qtyEl   = $('sale-quantity'),  amtEl  = $('sale-amount');
    var modalEl = document.getElementById('saleMobilModal');
    if (!typeEl || !rateEl) return;
    var prices = await getMobilPrices();
    function apply() {
      if (!prices) return;
      var t = typeEl.value;
      if (t==='Car Mobil'  && prices.car_mobil)  rateEl.value = prices.car_mobil;
      if (t==='Open Mobil' && prices.open_mobil) rateEl.value = prices.open_mobil;
      if (qtyEl && amtEl)
        amtEl.value = ((parseFloat(qtyEl.value)||0)*(parseFloat(rateEl.value)||0)).toFixed(2);
    }
    typeEl.addEventListener('change', apply);
    if (modalEl) modalEl.addEventListener('show.bs.modal', apply);
    apply();
  }

  // ── CUSTOMER DROPDOWN ──────────────────────────────────────
  async function loadCustomerDropdown() {
    try {
      var r = await supabase.from('customers').select('id,sr_no,name,category').order('sr_no',{ascending:true});
      if (r.error) throw r.error;
      var sel = $('sale-customer'); if (!sel) return;
      sel.innerHTML = '<option value="">-- Customer Select Karein --</option>';
      (r.data||[]).filter(function(c){ return (c.category||'').toLowerCase()!=='owner'; })
        .forEach(function(c){
          sel.innerHTML += '<option value="'+c.id+'">'+(c.sr_no||'')+' - '+c.name+'</option>';
        });
    } catch(e) { console.error('loadCustomerDropdown:', e); }
  }

  // ── BUILD allRecords from settings ─────────────────────────
  async function buildAllRecords() {
    // Read from new dedicated tables
    var arrRes  = await supabase.from('mobil_arrivals')
      .select('id, product_name, category, supplier, quantity, rate, total_cost, arrival_date, invoice_no, notes')
      .order('arrival_date', {ascending: false});
    var saleRes = await supabase.from('mobil_sales')
      .select('id, product_name, category, customer_name, quantity, rate, total_amount, sale_date, payment_type, notes')
      .order('sale_date', {ascending: false});

    var arrivals = (arrRes.data || []).map(function(r){
      return Object.assign({}, r, {
        _kind:'arrival', _label:'Purchase', _badge:'bg-primary',
        _party: r.supplier || 'Supplier',
        _amount: r.total_cost,
        date: r.arrival_date,
        type: r.category,
        qty:  r.quantity
      });
    });
    var sales = (saleRes.data || []).map(function(r){
      return Object.assign({}, r, {
        _kind:'sale', _label:'Sale', _badge:'bg-success',
        _party: r.customer_name || 'Walk-in',
        _amount: r.total_amount,
        date: r.sale_date,
        type: r.category,
        qty:  r.quantity
      });
    });

    allRecords = arrivals.concat(sales).sort(function(a,b){
      return new Date(b.date) - new Date(a.date);
    });
  }

  // ── FILTERS ────────────────────────────────────────────────
  function getDateRange(period) {
    var now = new Date();
    var today = now.toISOString().split('T')[0];
    if (period === 'today') return { from: today, to: today };
    if (period === 'week') {
      var d = new Date(now);
      d.setDate(d.getDate() - d.getDay());
      return { from: d.toISOString().split('T')[0], to: today };
    }
    if (period === 'month') {
      var m = String(now.getMonth()+1).padStart(2,'0');
      return { from: now.getFullYear()+'-'+m+'-01', to: today };
    }
    return null;
  }

  window.applyMobilFilters = function() {
    var search = ($('f-search')  ? $('f-search').value.trim().toLowerCase()  : '');
    var type   = ($('f-type')    ? $('f-type').value                          : '');
    var kind   = ($('f-kind')    ? $('f-kind').value                          : '');
    var period = ($('f-period')  ? $('f-period').value                        : '');
    var fFrom  = ($('f-from')    ? $('f-from').value                          : '');
    var fTo    = ($('f-to')      ? $('f-to').value                            : '');

    // Period overrides manual dates
    if (period) {
      var dr = getDateRange(period);
      if (dr) { fFrom = dr.from; fTo = dr.to; }
    }

    filteredRecords = allRecords.filter(function(r) {
      // Search: name, sr_no in customer name, supplier
      if (search) {
        var hay = ((r._party||'') + ' ' + (r.product_name||'') + ' ' + (r.customer_name||'') + ' ' + (r.supplier||'')).toLowerCase();
        if (hay.indexOf(search) < 0) return false;
      }
      // Mobil type
      if (type && r.type !== type) return false;
      // Kind
      if (kind && r._kind !== kind) return false;
      // Date range
      if (fFrom && r.date < fFrom) return false;
      if (fTo   && r.date > fTo)   return false;
      return true;
    });

    currentPage = 1;
    renderPage();
    updateFilterInfo();
  };

  window.clearMobilFilters = function() {
    ['f-search','f-type','f-kind','f-period','f-from','f-to'].forEach(function(id){
      var el=$(id); if (el) el.value='';
    });
    filteredRecords = allRecords.slice();
    currentPage = 1;
    renderPage();
    updateFilterInfo();
  };

  function updateFilterInfo() {
    var el = $('filter-result-info'); if (!el) return;
    var total = filteredRecords.length;
    var totalQty = filteredRecords.reduce(function(t,r){ return t+(parseFloat(r.qty)||0); }, 0);
    var totalAmt = filteredRecords.reduce(function(t,r){ return t+(parseFloat(r._amount)||0); }, 0);
    el.textContent = total + ' records | Qty: '+fmt(totalQty)+' L | Amount: Rs. '+fmt(totalAmt);
  }

  // ── RENDER PAGE ────────────────────────────────────────────
  function renderPage() {
    var tbody = $('mobil-transactions-table'); if (!tbody) return;
    var total = filteredRecords.length;

    if (!total) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Koi record nahi mila</td></tr>';
      renderPagination(0);
      return;
    }

    var start = (currentPage - 1) * pageSize;
    var end   = Math.min(start + pageSize, total);
    var page  = filteredRecords.slice(start, end);

    tbody.innerHTML = page.map(function(r) {
      var catColor = r.type === 'Car Mobil' ? '#0d6efd' : '#198754';
      var catBadge = '<span style="background:'+catColor+'20;color:'+catColor+';padding:2px 8px;border-radius:4px;font-size:11px;">'+( r.type||'-')+'</span>';
      var delBtn = r._kind === 'arrival'
        ? '<button class="btn btn-sm btn-outline-danger no-print" onclick="deleteMobilArrival(\''+r.id+'\')"><i class="bi bi-trash"></i></button>'
        : '<button class="btn btn-sm btn-outline-danger no-print" onclick="deleteMobilSale(\''+r.id+'\')"><i class="bi bi-trash"></i></button>';
      return '<tr>' +
        '<td>'+r.date+'</td>' +
        '<td><span class="badge '+r._badge+'">'+r._label+'</span></td>' +
        '<td>'+(r.product_name||'-')+'<br><small>'+catBadge+'</small></td>' +
        '<td>'+r._party+'</td>' +
        '<td>'+fmt(r.qty)+'</td>' +
        '<td>Rs. '+fmt(r.rate)+'</td>' +
        '<td><strong>Rs. '+fmt(r._amount)+'</strong></td>' +
        '<td class="no-print">'+delBtn+'</td>' +
        '</tr>';
    }).join('');

    renderPagination(total);
  }

  // ── PAGINATION ─────────────────────────────────────────────
  function renderPagination(total) {
    var container = $('mobil-pagination-container'); if (!container) return;
    if (total === 0) { container.innerHTML = ''; return; }

    var totalPages = Math.ceil(total / pageSize);
    var start = (currentPage-1)*pageSize + 1;
    var end   = Math.min(currentPage*pageSize, total);

    // Page buttons
    var pages = '';
    var sp = Math.max(1, currentPage-2);
    var ep = Math.min(totalPages, sp+4);
    if (ep-sp < 4) sp = Math.max(1, ep-4);
    for (var i=sp; i<=ep; i++) {
      pages += '<button class="btn btn-sm px-2 py-1 '+(i===currentPage?'btn-primary':'btn-outline-secondary')+'" onclick="mobilGoToPage('+i+')">'+i+'</button>';
    }

    container.innerHTML =
      '<div class="d-flex justify-content-between align-items-center flex-wrap gap-2 py-1 px-2">' +
        '<div class="d-flex align-items-center gap-2">' +
          '<span class="text-muted small">Show:</span>' +
          '<select class="form-select form-select-sm" style="width:70px" onchange="mobilChangePageSize(this.value)">' +
            '<option value="10" '+(pageSize===10?'selected':'')+'>10</option>' +
            '<option value="15" '+(pageSize===15?'selected':'')+'>15</option>' +
            '<option value="25" '+(pageSize===25?'selected':'')+'>25</option>' +
            '<option value="50" '+(pageSize===50?'selected':'')+'>50</option>' +
          '</select>' +
          '<span class="text-muted small">'+start+'-'+end+' of '+total+'</span>' +
        '</div>' +
        '<div class="d-flex gap-1">' +
          '<button class="btn btn-sm btn-outline-secondary px-2" onclick="mobilGoToPage(1)" '+(currentPage===1?'disabled':'')+'>«</button>' +
          '<button class="btn btn-sm btn-outline-secondary px-2" onclick="mobilGoToPage('+(currentPage-1)+')" '+(currentPage===1?'disabled':'')+'>‹</button>' +
          pages +
          '<button class="btn btn-sm btn-outline-secondary px-2" onclick="mobilGoToPage('+(currentPage+1)+')" '+(currentPage===totalPages?'disabled':'')+'>›</button>' +
          '<button class="btn btn-sm btn-outline-secondary px-2" onclick="mobilGoToPage('+totalPages+')" '+(currentPage===totalPages?'disabled':'')+'>»</button>' +
        '</div>' +
      '</div>';
  }

  window.mobilGoToPage = function(p) {
    var tp = Math.ceil(filteredRecords.length / pageSize);
    currentPage = Math.max(1, Math.min(p, tp));
    renderPage();
  };

  window.mobilChangePageSize = function(s) {
    pageSize = parseInt(s); currentPage = 1; renderPage();
  };

  // ── PRINT ──────────────────────────────────────────────────
  window.printMobilTransactions = function() {
    var data = filteredRecords.length ? filteredRecords : allRecords;
    if (!data.length) { alert('Koi data nahi hai print karne ke liye'); return; }

    var totalQty = data.reduce(function(t,r){ return t+(parseFloat(r.qty)||0); }, 0);
    var totalAmt = data.reduce(function(t,r){ return t+(parseFloat(r._amount)||0); }, 0);
    var printDate = new Date().toLocaleDateString('en-PK', {day:'2-digit',month:'long',year:'numeric'});

    var rows = data.map(function(r) {
      return '<tr>' +
        '<td>'+r.date+'</td>' +
        '<td>'+r._label+'</td>' +
        '<td>'+r.type+'</td>' +
        '<td>'+r._party+'</td>' +
        '<td style="text-align:right">'+fmt(r.qty)+' L</td>' +
        '<td style="text-align:right">Rs. '+fmt(r.rate)+'</td>' +
        '<td style="text-align:right;font-weight:700">Rs. '+fmt(r._amount)+'</td>' +
        '</tr>';
    }).join('');

    var html = '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
      '<title>Mobil Transactions - Khalid & Sons</title>' +
      '<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:11px;padding:16px}' +
      'h1{font-size:18px;color:#1a5276;margin-bottom:4px}.sub{color:#555;font-size:11px;margin-bottom:12px}' +
      'table{width:100%;border-collapse:collapse;font-size:10px}' +
      'th{background:#1a5276;color:#fff;padding:6px 8px;text-align:left}' +
      'td{padding:5px 8px;border-bottom:1px solid #ddd}' +
      'tr:nth-child(even){background:#f5f8ff}' +
      '.tfoot td{background:#eaf0fb;font-weight:700;border-top:2px solid #1a5276}' +
      '</style></head><body>' +
      '<h1>Khalid & Sons Petroleum — Mobil Oil Transactions</h1>' +
      '<div class="sub">Print Date: '+printDate+' | Total Records: '+data.length+'</div>' +
      '<table><thead><tr>' +
        '<th>Date</th><th>Type</th><th>Mobil</th><th>Customer/Supplier</th>' +
        '<th style="text-align:right">Qty (L)</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th>' +
      '</tr></thead><tbody>'+rows+'</tbody>' +
      '<tfoot><tr class="tfoot">' +
        '<td colspan="4">TOTAL</td>' +
        '<td style="text-align:right;font-weight:700">'+fmt(totalQty)+' L</td>' +
        '<td></td>' +
        '<td style="text-align:right;font-weight:700">Rs. '+fmt(totalAmt)+'</td>' +
      '</tr></tfoot></table></body></html>';

    var win = window.open('','_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(function(){ win.print(); }, 400);
  };

  // ── LOAD TRANSACTIONS (main) ───────────────────────────────
  async function loadMobilTransactions() {
    var tbody = $('mobil-transactions-table'); if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Loading...</td></tr>';
    try {
      await buildAllRecords();
      filteredRecords = allRecords.slice();
      currentPage = 1;
      renderPage();
      updateFilterInfo();
    } catch(e) {
      console.error('loadMobilTransactions:', e);
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4">Error: '+e.message+'</td></tr>';
    }
  }

  // ══════════════════════════════════════════════════════════
  // WINDOW FUNCTIONS
  // ══════════════════════════════════════════════════════════

  window.receiveMobilStock = async function() {
    var mobilType = $('receive-mobil-type') ? $('receive-mobil-type').value : '';
    var supplier  = $('receive-supplier')   ? $('receive-supplier').value   : '';
    var qty       = parseFloat($('receive-quantity') ? $('receive-quantity').value : 0);
    var rate      = parseFloat($('receive-rate')     ? $('receive-rate').value     : 0);
    var total     = parseFloat($('receive-amount')   ? $('receive-amount').value   : 0) || (qty*rate);
    var date      = $('receive-date')    ? $('receive-date').value    : '';
    var invoice   = $('receive-invoice') ? $('receive-invoice').value : '';
    var notes     = $('receive-notes')   ? $('receive-notes').value   : '';

    if (!mobilType || !qty || !rate || !date) {
      showToast('Mobil Type, Quantity, Rate aur Date zaroor bharein', 'error'); return;
    }
    try {
      var s = await getSettings();
      if (!s) throw new Error('Settings row nahi mili');
      var arrivals = Array.isArray(s.mobil_arrivals) ? s.mobil_arrivals : [];
      arrivals.push({ id:Date.now().toString(), date:date, type:mobilType, supplier:supplier,
        qty:qty, rate:rate, total:total, invoice:invoice, notes:notes, created_at:new Date().toISOString() });
      await patchSettings(s.id, { mobil_arrivals: arrivals });
      showToast(qty+' L '+mobilType+' stock add ho gaya!', 'success');
      var m = bootstrap.Modal.getInstance($('receiveMobilModal')); if(m) m.hide();
      if ($('receiveMobilForm')) $('receiveMobilForm').reset();
      var today = new Date().toISOString().split('T')[0];
      if ($('receive-date')) $('receive-date').value = today;
      loadMobilStock(); loadMobilTransactions();
    } catch(e) { console.error(e); showToast('Error: '+e.message,'error'); }
  };

  window.saleMobilOil = async function() {
    var custSel    = $('sale-customer');
    var customerId = custSel ? custSel.value : '';
    var custName   = (custSel && custSel.selectedIndex>=0)
      ? custSel.options[custSel.selectedIndex].text.replace(/^\d+\s*-\s*/,'') : '';
    var mobilType   = $('sale-mobil-type')   ? $('sale-mobil-type').value   : '';
    var qty         = parseFloat($('sale-quantity')    ? $('sale-quantity').value    : 0);
    var rate        = parseFloat($('sale-rate')        ? $('sale-rate').value        : 0);
    var amount      = parseFloat($('sale-amount')      ? $('sale-amount').value      : 0) || (qty*rate);
    var date        = $('sale-date')         ? $('sale-date').value         : '';
    var paymentType = $('sale-payment-type') ? $('sale-payment-type').value : 'cash';
    var notes       = $('sale-notes')        ? $('sale-notes').value        : '';

    if (!mobilType || !qty || !rate || !date) {
      showToast('Mobil Type, Quantity, Rate aur Date zaroor bharein','error'); return;
    }
    try {
      var s = await getSettings();
      if (!s) throw new Error('Settings row nahi mili');
      var arrivals = Array.isArray(s.mobil_arrivals) ? s.mobil_arrivals : [];
      var sales    = Array.isArray(s.mobil_sales)    ? s.mobil_sales    : [];
      var arrived  = arrivals.filter(function(r){ return r.type===mobilType; })
                             .reduce(function(t,r){ return t+(parseFloat(r.qty)||0); },0);
      var sold     = sales.filter(function(r){ return r.type===mobilType; })
                          .reduce(function(t,r){ return t+(parseFloat(r.qty)||0); },0);
      var avail    = Math.max(0, arrived-sold);
      if (avail < qty) {
        showToast(mobilType+' ka stock sirf '+fmt(avail)+' L hai!','error'); return;
      }
      sales.push({ id:Date.now().toString(), date:date, type:mobilType,
        customer:custName, customer_id:customerId, qty:qty, rate:rate,
        amount:amount, payment:paymentType, notes:notes, created_at:new Date().toISOString() });
      await patchSettings(s.id, { mobil_sales: sales });
      if (paymentType==='credit' && customerId) {
        var cr = await supabase.from('customers').select('balance').eq('id',customerId).maybeSingle();
        if (!cr.error && cr.data) {
          var nb = (parseFloat(cr.data.balance)||0)+amount;
          await supabase.from('customers').update({balance:nb}).eq('id',customerId);
        }
        showToast('Sale! Rs.'+fmt(amount)+' Udhaar add ho gaya','success');
      } else {
        showToast('Sale! Rs.'+fmt(amount)+' Cash','success');
      }
      var m = bootstrap.Modal.getInstance($('saleMobilModal')); if(m) m.hide();
      if ($('saleMobilForm')) $('saleMobilForm').reset();
      var today = new Date().toISOString().split('T')[0];
      if ($('sale-date')) $('sale-date').value = today;
      await setupPriceAutoFill();
      loadMobilStock(); loadMobilTransactions();
    } catch(e) { console.error(e); showToast('Error: '+e.message,'error'); }
  };

  window.addMobilExpense = async function() {
    var expType = $('expense-type')              ? $('expense-type').value              : '';
    var amount  = parseFloat($('expense-amount-mobil') ? $('expense-amount-mobil').value : 0);
    var date    = $('expense-date')              ? $('expense-date').value              : '';
    var desc    = $('expense-description-mobil') ? $('expense-description-mobil').value : '';
    if (!expType || !amount || !date || !desc) {
      showToast('Tamam fields zaroor bharein','error'); return;
    }
    try {
      var or = await supabase.from('customers').select('id').eq('category','Owner').maybeSingle();
      var tx = await supabase.from('transactions').insert([{
        customer_id: or.data ? or.data.id : null,
        transaction_type:'Expense', amount:amount, liters:0,
        description:'Mobil Expense - '+expType+': '+desc,
        created_at: new Date(date+'T00:00:00').toISOString()
      }]);
      if (tx.error) throw tx.error;
      showToast('Expense save ho gaya!','success');
      var m = bootstrap.Modal.getInstance($('mobilExpenseModal')); if(m) m.hide();
      if ($('mobilExpenseForm')) $('mobilExpenseForm').reset();
      var today = new Date().toISOString().split('T')[0];
      if ($('expense-date')) $('expense-date').value = today;
    } catch(e) { console.error(e); showToast('Error: '+e.message,'error'); }
  };

  window.deleteMobilArrival = async function(id) {
    if (!confirm('Yeh arrival record delete karein?')) return;
    try {
      var r = await supabase.from('mobil_arrivals').delete().eq('id', id);
      if (r.error) throw r.error;
      showToast('Arrival delete ho gaya!','success');
      loadMobilStock(); loadMobilTransactions();
    } catch(e) { showToast('Error: '+e.message,'error'); }
  };

  window.deleteMobilSale = async function(id) {
    if (!confirm('Yeh sale record delete karein?')) return;
    try {
      var r = await supabase.from('mobil_sales').delete().eq('id', id);
      if (r.error) throw r.error;
      showToast('Sale delete ho gaya!','success');
      loadMobilStock(); loadMobilTransactions();
    } catch(e) { showToast('Error: '+e.message,'error'); }
  };

  window.viewMobilHistory = function() { window.location.href='mobil-stock.html'; };

  // Called by mobil.html after any save (sale/receive/expense)
  window.loadMobilData = async function() {
    await loadMobilStock();
    await loadMobilTransactions();
  };

  // ── INIT ───────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', async function() {
    if (document.body.getAttribute('data-page') !== 'mobil') return;
    console.log('Mobil v4 init...');

    var today = new Date().toISOString().split('T')[0];
    if ($('receive-date')) $('receive-date').value = today;
    if ($('sale-date'))    $('sale-date').value    = today;
    if ($('expense-date')) $('expense-date').value = today;

    setupAutoCalc('receive-quantity','receive-rate','receive-amount');
    setupAutoCalc('sale-quantity','sale-rate','sale-amount');

    await setupPriceAutoFill();
    await loadCustomerDropdown();
    await loadMobilStock();
    await loadMobilTransactions();

    console.log('Mobil v4 ready!');
  });

})();