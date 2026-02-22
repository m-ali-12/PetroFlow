// // Shop Rent Management System
// (function() {
// 'use strict';

// const supabase = window.supabaseClient;

// function $(id) { return document.getElementById(id); }

// function formatNumber(num) {
//   return Number(num || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// }

// function formatDate(date) {
//   return new Date(date).toLocaleDateString('en-PK', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

// // Note: Using 'customers' table to store shop data with category='Shop'
// // Using 'transactions' table to store rent payments

// // Add New Shop
// window.addShop = async function() {
//   const shopName = $('shop-name').value;
//   const tenantName = $('tenant-name').value;
//   const phone = $('tenant-phone').value;
//   const monthlyRent = parseFloat($('monthly-rent').value);
//   const dueDay = parseInt($('due-day').value);
//   const startDate = $('agreement-start').value;
//   const notes = $('shop-notes').value;

//   if (!shopName || !tenantName || !monthlyRent || !startDate) {
//     showToast('Please fill all required fields', 'error');
//     return;
//   }

//   try {
//     // Create shop as a customer with category 'Shop'
//     // Store additional data in description field as JSON
//     const shopData = {
//       monthly_rent: monthlyRent,
//       due_day: dueDay,
//       start_date: startDate,
//       notes: notes
//     };

//     const { data, error } = await supabase
//       .from('customers')
//       .insert([{
//         name: shopName,
//         phone: phone,
//         category: 'Shop',
//         sr_no: Date.now(), // Using timestamp as unique identifier
//         balance: 0,
//         // Store shop-specific data in a JSON column if available, or use description
//       }])
//       .select()
//       .single();

//     if (error) throw error;

//     // Store shop metadata separately
//     localStorage.setItem(`shop_${data.id}`, JSON.stringify(shopData));

//     showToast('Shop added successfully!', 'success');
    
//     const modal = bootstrap.Modal.getInstance($('addShopModal'));
//     if (modal) modal.hide();
//     $('addShopForm').reset();

//     loadShops();
//     loadSummary();
//   } catch (error) {
//     console.error('Error adding shop:', error);
//     showToast('Error: ' + error.message, 'error');
//   }
// };

// // Generate Monthly Rent Entries
// window.generateMonthlyRent = async function() {
//   if (!confirm('Generate rent entries for all shops for current month?')) return;

//   try {
//     const { data: shops, error: shopsError } = await supabase
//       .from('customers')
//       .select('*')
//       .eq('category', 'Shop');

//     if (shopsError) throw shopsError;

//     const now = new Date();
//     const year = now.getFullYear();
//     const month = now.getMonth() + 1;

//     let created = 0;
//     let skipped = 0;

//     for (const shop of shops) {
//       // Check if entry already exists for this month
//       const { data: existing } = await supabase
//         .from('transactions')
//         .select('id')
//         .eq('customer_id', shop.id)
//         .eq('transaction_type', 'Rent')
//         .gte('created_at', new Date(year, month - 1, 1).toISOString())
//         .lt('created_at', new Date(year, month, 1).toISOString());

//       if (existing && existing.length > 0) {
//         skipped++;
//         continue;
//       }

//       // Get shop data
//       const shopData = JSON.parse(localStorage.getItem(`shop_${shop.id}`) || '{}');
//       const monthlyRent = shopData.monthly_rent || 0;
//       const dueDay = shopData.due_day || 1;

//       if (!monthlyRent) {
//         skipped++;
//         continue;
//       }

//       // Create rent entry
//       const dueDate = new Date(year, month - 1, dueDay);
      
//       await supabase
//         .from('transactions')
//         .insert([{
//           customer_id: shop.id,
//           tank_id: null,
//           transaction_type: 'Rent',
//           amount: monthlyRent,
//           liters: 0,
//           unit_price: null,
//           description: `Rent for ${shop.name} - ${month}/${year}`,
//           created_at: dueDate.toISOString()
//         }]);

//       created++;
//     }

//     showToast(`Generated ${created} rent entries, ${skipped} skipped (already exist)`, 'success');
//     loadRentPayments();
//     loadSummary();
//   } catch (error) {
//     console.error('Error generating rent:', error);
//     showToast('Error: ' + error.message, 'error');
//   }
// };

// // Record Payment
// window.recordPayment = async function() {
//   const rentId = parseInt($('rent-entry-select').value);
//   const paymentDate = $('payment-date').value;
//   const amount = parseFloat($('payment-amount').value);
//   const method = $('payment-method').value;
//   const notes = $('payment-notes').value;

//   if (!rentId || !paymentDate || !amount) {
//     showToast('Please fill all required fields', 'error');
//     return;
//   }

//   try {
//     // Get the rent transaction
//     const { data: rentTrans, error: rentError } = await supabase
//       .from('transactions')
//       .select('*')
//       .eq('id', rentId)
//       .single();

//     if (rentError) throw rentError;

//     // Update transaction with payment info
//     const updatedDescription = `${rentTrans.description} | PAID: ${paymentDate} | Method: ${method}${notes ? ' | ' + notes : ''}`;
    
//     const { error: updateError } = await supabase
//       .from('transactions')
//       .update({
//         description: updatedDescription
//       })
//       .eq('id', rentId);

//     if (updateError) throw updateError;

//     // Store payment metadata
//     const paymentData = {
//       rent_id: rentId,
//       paid_date: paymentDate,
//       amount: amount,
//       method: method,
//       notes: notes,
//       paid_at: new Date().toISOString()
//     };
//     localStorage.setItem(`payment_${rentId}`, JSON.stringify(paymentData));

//     showToast('Payment recorded successfully!', 'success');
    
//     const modal = bootstrap.Modal.getInstance($('recordPaymentModal'));
//     if (modal) modal.hide();
//     $('recordPaymentForm').reset();

//     loadRentPayments();
//     loadUnpaidRentDropdown();
//     loadSummary();
//   } catch (error) {
//     console.error('Error recording payment:', error);
//     showToast('Error: ' + error.message, 'error');
//   }
// };

// // Load Shops
// async function loadShops() {
//   try {
//     const { data, error } = await supabase
//       .from('customers')
//       .select('*')
//       .eq('category', 'Shop')
//       .order('name');

//     if (error) throw error;

//     const tbody = $('shops-table');
//     if (!tbody) return;

//     if (data.length === 0) {
//       tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No shops registered yet</td></tr>';
//       return;
//     }

//     let html = '';
//     data.forEach(shop => {
//       const shopData = JSON.parse(localStorage.getItem(`shop_${shop.id}`) || '{}');
//       const monthlyRent = shopData.monthly_rent || 0;

//       html += `
//         <tr>
//           <td><strong>${shop.name}</strong></td>
//           <td>${shop.phone || 'N/A'}</td>
//           <td><strong>Rs. ${formatNumber(monthlyRent)}</strong></td>
//           <td>${shop.phone || '-'}</td>
//           <td><span class="badge bg-success">Active</span></td>
//           <td>
//             <button class="btn btn-sm btn-outline-primary" onclick="viewShopDetails(${shop.id})">
//               <i class="bi bi-eye"></i>
//             </button>
//             <button class="btn btn-sm btn-outline-danger" onclick="deleteShop(${shop.id})">
//               <i class="bi bi-trash"></i>
//             </button>
//           </td>
//         </tr>
//       `;
//     });

//     tbody.innerHTML = html;
//   } catch (error) {
//     console.error('Error loading shops:', error);
//   }
// }

// // Load Rent Payments
// async function loadRentPayments() {
//   try {
//     const now = new Date();
//     const year = now.getFullYear();
//     const month = now.getMonth() + 1;

//     const { data, error } = await supabase
//       .from('transactions')
//       .select(`
//         *,
//         customer:customers(name)
//       `)
//       .eq('transaction_type', 'Rent')
//       .gte('created_at', new Date(year, month - 1, 1).toISOString())
//       .lt('created_at', new Date(year, month, 1).toISOString())
//       .order('created_at', { ascending: false });

//     if (error) throw error;

//     const tbody = $('rent-payments-table');
//     if (!tbody) return;

//     if (data.length === 0) {
//       tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No rent entries for this month</td></tr>';
//       return;
//     }

//     let html = '';
//     data.forEach(rent => {
//       const paymentData = JSON.parse(localStorage.getItem(`payment_${rent.id}`) || 'null');
//       const isPaid = paymentData !== null;
//       const dueDate = new Date(rent.created_at);
//       const isOverdue = !isPaid && new Date() > dueDate;

//       const statusClass = isPaid ? 'bg-success' : isOverdue ? 'bg-danger' : 'bg-warning';
//       const statusText = isPaid ? 'Paid' : isOverdue ? 'Overdue' : 'Pending';

//       html += `
//         <tr>
//           <td><strong>${rent.customer?.name || 'Unknown'}</strong></td>
//           <td>${month}/${year}</td>
//           <td><strong>Rs. ${formatNumber(rent.amount)}</strong></td>
//           <td>${formatDate(dueDate)}</td>
//           <td><span class="badge ${statusClass}">${statusText}</span></td>
//           <td>${isPaid ? formatDate(paymentData.paid_date) : '-'}</td>
//           <td>
//             ${!isPaid ? `
//               <button class="btn btn-sm btn-success" onclick="quickPayRent(${rent.id})">
//                 <i class="bi bi-cash"></i> Pay
//               </button>
//             ` : ''}
//             <button class="btn btn-sm btn-outline-danger" onclick="deleteRent(${rent.id})">
//               <i class="bi bi-trash"></i>
//             </button>
//           </td>
//         </tr>
//       `;
//     });

//     tbody.innerHTML = html;
//   } catch (error) {
//     console.error('Error loading rent payments:', error);
//   }
// }

// // Load Unpaid Rent Dropdown
// async function loadUnpaidRentDropdown() {
//   try {
//     const { data, error } = await supabase
//       .from('transactions')
//       .select(`
//         *,
//         customer:customers(name)
//       `)
//       .eq('transaction_type', 'Rent')
//       .order('created_at', { ascending: false })
//       .limit(100);

//     if (error) throw error;

//     const select = $('rent-entry-select');
//     if (!select) return;

//     // Filter unpaid
//     const unpaid = data.filter(r => !localStorage.getItem(`payment_${r.id}`));

//     if (unpaid.length === 0) {
//       select.innerHTML = '<option value="">No unpaid rent entries</option>';
//       return;
//     }

//     select.innerHTML = '<option value="">Select rent entry</option>';
//     unpaid.forEach(rent => {
//       const date = new Date(rent.created_at);
//       const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
//       select.innerHTML += `<option value="${rent.id}">${rent.customer?.name || 'Unknown'} - ${monthYear} - Rs. ${formatNumber(rent.amount)}</option>`;
//     });
//   } catch (error) {
//     console.error('Error loading unpaid rent:', error);
//   }
// }

// // Load Summary
// async function loadSummary() {
//   try {
//     const { data: shops } = await supabase
//       .from('customers')
//       .select('id')
//       .eq('category', 'Shop');

//     $('total-shops').textContent = shops?.length || 0;

//     const now = new Date();
//     const year = now.getFullYear();
//     const month = now.getMonth() + 1;

//     const { data: rentData } = await supabase
//       .from('transactions')
//       .select('*')
//       .eq('transaction_type', 'Rent')
//       .gte('created_at', new Date(year, month - 1, 1).toISOString())
//       .lt('created_at', new Date(year, month, 1).toISOString());

//     let totalMonthRent = 0;
//     let paidAmount = 0;
//     let pendingCount = 0;

//     rentData?.forEach(rent => {
//       totalMonthRent += rent.amount;
//       const paymentData = localStorage.getItem(`payment_${rent.id}`);
//       if (paymentData) {
//         paidAmount += rent.amount;
//       } else {
//         pendingCount++;
//       }
//     });

//     $('month-rent').textContent = 'Rs. ' + formatNumber(totalMonthRent);
//     $('paid-rent').textContent = 'Rs. ' + formatNumber(paidAmount);
//     $('pending-rent').textContent = pendingCount;
//   } catch (error) {
//     console.error('Error loading summary:', error);
//   }
// }

// // Quick Pay Rent
// window.quickPayRent = function(rentId) {
//   $('rent-entry-select').value = rentId;
//   $('payment-date').value = new Date().toISOString().split('T')[0];
  
//   // Get amount from transaction
//   supabase
//     .from('transactions')
//     .select('amount')
//     .eq('id', rentId)
//     .single()
//     .then(({ data }) => {
//       if (data) $('payment-amount').value = data.amount;
//     });

//   const modal = new bootstrap.Modal($('recordPaymentModal'));
//   modal.show();
// };

// // View Shop Details
// window.viewShopDetails = function(shopId) {
//   // Redirect to a details page or show modal
//   alert('Shop details view - Coming soon!');
// };

// // Delete Shop
// window.deleteShop = async function(shopId) {
//   if (!confirm('Are you sure you want to delete this shop?')) return;

//   try {
//     const { error } = await supabase
//       .from('customers')
//       .delete()
//       .eq('id', shopId);

//     if (error) throw error;

//     localStorage.removeItem(`shop_${shopId}`);
//     showToast('Shop deleted successfully!', 'success');
//     loadShops();
//     loadSummary();
//   } catch (error) {
//     console.error('Error deleting shop:', error);
//     showToast('Error: ' + error.message, 'error');
//   }
// };

// // Delete Rent Entry
// window.deleteRent = async function(rentId) {
//   if (!confirm('Are you sure you want to delete this rent entry?')) return;

//   try {
//     const { error } = await supabase
//       .from('transactions')
//       .delete()
//       .eq('id', rentId);

//     if (error) throw error;

//     localStorage.removeItem(`payment_${rentId}`);
//     showToast('Rent entry deleted successfully!', 'success');
//     loadRentPayments();
//     loadSummary();
//   } catch (error) {
//     console.error('Error deleting rent:', error);
//     showToast('Error: ' + error.message, 'error');
//   }
// };

// // View History
// window.viewRentHistory = function() {
//   window.location.href = 'transactions.html?filter=rent';
// };

// // Month filter change
// if ($('month-filter')) {
//   $('month-filter').addEventListener('change', function() {
//     // TODO: Implement month filtering
//     loadRentPayments();
//   });
// }

// // Initialize
// document.addEventListener('DOMContentLoaded', () => {
//   if (document.body.getAttribute('data-page') === 'rent') {
//     // Set today's date
//     const today = new Date().toISOString().split('T')[0];
//     if ($('payment-date')) $('payment-date').value = today;
//     if ($('agreement-start')) $('agreement-start').value = today;

//     // Load data
//     loadShops();
//     loadRentPayments();
//     loadUnpaidRentDropdown();
//     loadSummary();

//     console.log('✅ Rent management initialized');
//   }
// });

// })();


// changed code 

// ============================================================
// SHOP RENT MANAGEMENT SYSTEM - COMPLETE REWRITE
// Khalid & Sons Petroleum
// Uses dedicated: shops + rent_payments tables
// Features: Search, Filter, Pagination, Print, Full CRUD
// ============================================================
// (function () {
//   'use strict';

//   const supabase = window.supabaseClient;

//   // ── State ──────────────────────────────────────────────────
//   const state = {
//     shops: [],
//     rentPayments: [],
//     filteredPayments: [],
//     shopPage: 1,
//     shopPageSize: 10,
//     payPage: 1,
//     payPageSize: 10,
//     selectedMonth: new Date().getMonth() + 1,
//     selectedYear: new Date().getFullYear(),
//     searchShop: '',
//     searchPay: '',
//     filterStatus: 'all',
//   };

//   // ── Helpers ────────────────────────────────────────────────
//   function $(id) { return document.getElementById(id); }

//   function fmt(num) {
//     return Number(num || 0).toLocaleString('en-PK', {
//       minimumFractionDigits: 2,
//       maximumFractionDigits: 2,
//     });
//   }

//   function fmtDate(d) {
//     if (!d) return '-';
//     return new Date(d).toLocaleDateString('en-PK', {
//       day: '2-digit', month: '2-digit', year: 'numeric',
//     });
//   }

//   function monthName(m) {
//     return ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
//       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m];
//   }

//   function showToast(message, type = 'info') {
//     const toast = $('liveToast');
//     if (!toast) return;
//     const titles = { success: '✅ Success', error: '❌ Error', warning: '⚠️ Warning', info: 'ℹ️ Info' };
//     $('toast-title').textContent = titles[type] || 'Info';
//     $('toast-message').textContent = message;
//     toast.className = `toast border-${type === 'error' ? 'danger' : type}`;
//     new bootstrap.Toast(toast, { delay: 3500 }).show();
//   }

//   function hideModal(id) {
//     const m = bootstrap.Modal.getInstance($(id));
//     if (m) m.hide();
//   }

//   // ── LOAD SUMMARY ──────────────────────────────────────────
//   async function loadSummary() {
//     try {
//       const { data: shops } = await supabase.from('shops').select('id').eq('status', 'Active');
//       $('total-shops').textContent = shops?.length || 0;

//       const { data: pays } = await supabase
//         .from('rent_payments')
//         .select('amount_due, amount_paid, status')
//         .eq('rent_month', state.selectedMonth)
//         .eq('rent_year', state.selectedYear);

//       let monthTotal = 0, paidTotal = 0, pendingCount = 0;
//       (pays || []).forEach(p => {
//         monthTotal += Number(p.amount_due);
//         if (p.status === 'Paid') paidTotal += Number(p.amount_paid || p.amount_due);
//         if (p.status !== 'Paid') pendingCount++;
//       });

//       $('month-rent').textContent = 'Rs. ' + fmt(monthTotal);
//       $('paid-rent').textContent = 'Rs. ' + fmt(paidTotal);
//       $('pending-rent').textContent = pendingCount;
//     } catch (e) {
//       console.error('Summary error:', e);
//     }
//   }

//   // ── LOAD SHOPS ────────────────────────────────────────────
//   async function loadShops() {
//     try {
//       const { data, error } = await supabase
//         .from('shops')
//         .select('*')
//         .order('shop_name');
//       if (error) throw error;
//       state.shops = data || [];
//       renderShops();
//       populateShopDropdown();
//     } catch (e) {
//       console.error('Load shops error:', e);
//       showToast('Error loading shops: ' + e.message, 'error');
//     }
//   }

//   function renderShops() {
//     const tbody = $('shops-table');
//     if (!tbody) return;

//     const q = state.searchShop.toLowerCase();
//     const filtered = state.shops.filter(s =>
//       s.shop_name.toLowerCase().includes(q) ||
//       s.tenant_name.toLowerCase().includes(q) ||
//       (s.phone || '').includes(q)
//     );

//     const total = filtered.length;
//     const pages = Math.max(1, Math.ceil(total / state.shopPageSize));
//     state.shopPage = Math.min(state.shopPage, pages);
//     const start = (state.shopPage - 1) * state.shopPageSize;
//     const slice = filtered.slice(start, start + state.shopPageSize);

//     if (slice.length === 0) {
//       tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No shops found</td></tr>';
//       renderPagination('shops-pagination', pages, state.shopPage, p => { state.shopPage = p; renderShops(); });
//       return;
//     }

//     tbody.innerHTML = slice.map(s => `
//       <tr>
//         <td><strong>${s.shop_name}</strong></td>
//         <td>${s.tenant_name}</td>
//         <td><strong>Rs. ${fmt(s.monthly_rent)}</strong></td>
//         <td>${s.phone || '-'}</td>
//         <td>
//           <span class="badge ${s.status === 'Active' ? 'bg-success' : 'bg-secondary'}">${s.status}</span>
//         </td>
//         <td>
//           <button class="btn btn-sm btn-outline-info me-1" onclick="editShopModal(${s.id})" title="Edit">
//             <i class="bi bi-pencil"></i>
//           </button>
//           <button class="btn btn-sm btn-outline-danger" onclick="deleteShop(${s.id})" title="Delete">
//             <i class="bi bi-trash"></i>
//           </button>
//         </td>
//       </tr>
//     `).join('');

//     renderPagination('shops-pagination', pages, state.shopPage, p => { state.shopPage = p; renderShops(); });
//   }

//   // ── ADD SHOP ──────────────────────────────────────────────
//   window.addShop = async function () {
//     const shopName   = $('shop-name').value.trim();
//     const tenantName = $('tenant-name').value.trim();
//     const phone      = $('tenant-phone').value.trim();
//     const rent       = parseFloat($('monthly-rent').value);
//     const dueDay     = parseInt($('due-day').value) || 1;
//     const startDate  = $('agreement-start').value;
//     const notes      = $('shop-notes').value.trim();

//     if (!shopName || !tenantName || isNaN(rent) || !startDate) {
//       showToast('Please fill all required fields', 'error');
//       return;
//     }

//     try {
//       const { error } = await supabase.from('shops').insert([{
//         shop_name: shopName,
//         tenant_name: tenantName,
//         phone: phone || null,
//         monthly_rent: rent,
//         due_day: dueDay,
//         start_date: startDate,
//         notes: notes || null,
//         status: 'Active',
//       }]);
//       if (error) throw error;

//       showToast('Shop added successfully!', 'success');
//       hideModal('addShopModal');
//       $('addShopForm').reset();
//       setDefaultDates();
//       await loadShops();
//       await loadSummary();
//     } catch (e) {
//       console.error('Add shop error:', e);
//       showToast('Error: ' + e.message, 'error');
//     }
//   };

//   // ── EDIT SHOP ─────────────────────────────────────────────
//   window.editShopModal = function (shopId) {
//     const s = state.shops.find(x => x.id === shopId);
//     if (!s) return;

//     $('edit-shop-id').value = s.id;
//     $('edit-shop-name').value = s.shop_name;
//     $('edit-tenant-name').value = s.tenant_name;
//     $('edit-tenant-phone').value = s.phone || '';
//     $('edit-monthly-rent').value = s.monthly_rent;
//     $('edit-due-day').value = s.due_day;
//     $('edit-agreement-start').value = s.start_date;
//     $('edit-shop-status').value = s.status;
//     $('edit-shop-notes').value = s.notes || '';

//     new bootstrap.Modal($('editShopModal')).show();
//   };

//   window.updateShop = async function () {
//     const id         = parseInt($('edit-shop-id').value);
//     const shopName   = $('edit-shop-name').value.trim();
//     const tenantName = $('edit-tenant-name').value.trim();
//     const phone      = $('edit-tenant-phone').value.trim();
//     const rent       = parseFloat($('edit-monthly-rent').value);
//     const dueDay     = parseInt($('edit-due-day').value) || 1;
//     const startDate  = $('edit-agreement-start').value;
//     const status     = $('edit-shop-status').value;
//     const notes      = $('edit-shop-notes').value.trim();

//     if (!shopName || !tenantName || isNaN(rent)) {
//       showToast('Please fill all required fields', 'error');
//       return;
//     }

//     try {
//       const { error } = await supabase.from('shops').update({
//         shop_name: shopName, tenant_name: tenantName,
//         phone: phone || null, monthly_rent: rent,
//         due_day: dueDay, start_date: startDate,
//         status, notes: notes || null,
//       }).eq('id', id);
//       if (error) throw error;

//       showToast('Shop updated!', 'success');
//       hideModal('editShopModal');
//       await loadShops();
//       await loadSummary();
//     } catch (e) {
//       showToast('Error: ' + e.message, 'error');
//     }
//   };

//   // ── DELETE SHOP ───────────────────────────────────────────
//   window.deleteShop = async function (shopId) {
//     if (!confirm('Delete this shop and ALL its rent records?')) return;
//     try {
//       const { error } = await supabase.from('shops').delete().eq('id', shopId);
//       if (error) throw error;
//       showToast('Shop deleted!', 'success');
//       await loadShops();
//       await loadSummary();
//     } catch (e) {
//       showToast('Error: ' + e.message, 'error');
//     }
//   };

//   // ── GENERATE MONTHLY RENT ──────────────────────────────────
//   window.generateMonthlyRent = async function () {
//     const now = new Date();
//     const m = state.selectedMonth;
//     const y = state.selectedYear;

//     if (!confirm(`Generate rent entries for ${monthName(m)} ${y}?`)) return;

//     try {
//       const { data: shops, error: sErr } = await supabase
//         .from('shops').select('*').eq('status', 'Active');
//       if (sErr) throw sErr;

//       if (!shops || shops.length === 0) {
//         showToast('No active shops found!', 'warning');
//         return;
//       }

//       let created = 0, skipped = 0;
//       for (const shop of shops) {
//         // Check if entry already exists
//         const { data: existing } = await supabase
//           .from('rent_payments')
//           .select('id')
//           .eq('shop_id', shop.id)
//           .eq('rent_month', m)
//           .eq('rent_year', y)
//           .maybeSingle();

//         if (existing) { skipped++; continue; }

//         const dueDay = Math.min(shop.due_day, new Date(y, m, 0).getDate()); // handle month-end
//         const dueDate = `${y}-${String(m).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

//         const { error: iErr } = await supabase.from('rent_payments').insert([{
//           shop_id: shop.id,
//           rent_month: m,
//           rent_year: y,
//           amount_due: shop.monthly_rent,
//           due_date: dueDate,
//           status: new Date(dueDate) < now ? 'Overdue' : 'Pending',
//         }]);
//         if (!iErr) created++;
//       }

//       showToast(`✅ Created ${created} entries, ${skipped} already existed`, 'success');
//       await loadRentPayments();
//       await loadSummary();
//     } catch (e) {
//       showToast('Error: ' + e.message, 'error');
//     }
//   };

//   // ── LOAD RENT PAYMENTS ────────────────────────────────────
//   async function loadRentPayments() {
//     try {
//       const { data, error } = await supabase
//         .from('rent_payments')
//         .select(`*, shop:shops(shop_name, tenant_name, phone)`)
//         .eq('rent_month', state.selectedMonth)
//         .eq('rent_year', state.selectedYear)
//         .order('status')
//         .order('due_date');

//       if (error) throw error;
//       state.rentPayments = data || [];
//       applyPaymentFilters();
//     } catch (e) {
//       console.error('Load payments error:', e);
//       showToast('Error loading payments: ' + e.message, 'error');
//     }
//   }

//   function applyPaymentFilters() {
//     const q = state.searchPay.toLowerCase();
//     const st = state.filterStatus;

//     state.filteredPayments = state.rentPayments.filter(p => {
//       const name = (p.shop?.shop_name || '').toLowerCase();
//       const tenant = (p.shop?.tenant_name || '').toLowerCase();
//       const matchQ = !q || name.includes(q) || tenant.includes(q);
//       const matchSt = st === 'all' || p.status.toLowerCase() === st;
//       return matchQ && matchSt;
//     });

//     state.payPage = 1;
//     renderPayments();
//     populateUnpaidDropdown();
//   }

//   function renderPayments() {
//     const tbody = $('rent-payments-table');
//     if (!tbody) return;

//     const total = state.filteredPayments.length;
//     const pages = Math.max(1, Math.ceil(total / state.payPageSize));
//     state.payPage = Math.min(state.payPage, pages);
//     const start = (state.payPage - 1) * state.payPageSize;
//     const slice = state.filteredPayments.slice(start, start + state.payPageSize);

//     if (slice.length === 0) {
//       tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No rent entries found</td></tr>';
//       renderPagination('pay-pagination', pages, state.payPage, p => { state.payPage = p; renderPayments(); });
//       return;
//     }

//     const statusBadge = {
//       'Paid': 'bg-success',
//       'Pending': 'bg-warning text-dark',
//       'Overdue': 'bg-danger',
//       'Partial': 'bg-info',
//     };

//     tbody.innerHTML = slice.map(p => `
//       <tr class="${p.status === 'Overdue' ? 'table-danger' : p.status === 'Paid' ? 'table-success' : ''}">
//         <td>
//           <strong>${p.shop?.shop_name || 'N/A'}</strong><br>
//           <small class="text-muted">${p.shop?.tenant_name || ''}</small>
//         </td>
//         <td>${monthName(p.rent_month)} ${p.rent_year}</td>
//         <td><strong>Rs. ${fmt(p.amount_due)}</strong></td>
//         <td>${fmtDate(p.due_date)}</td>
//         <td><span class="badge ${statusBadge[p.status] || 'bg-secondary'}">${p.status}</span></td>
//         <td>${p.paid_date ? fmtDate(p.paid_date) : '-'}
//           ${p.amount_paid ? `<br><small>Rs. ${fmt(p.amount_paid)}</small>` : ''}
//         </td>
//         <td>
//           ${p.status !== 'Paid' ? `
//             <button class="btn btn-sm btn-success me-1" onclick="quickPayRent(${p.id})" title="Record Payment">
//               <i class="bi bi-cash"></i>
//             </button>` : ''}
//           <button class="btn btn-sm btn-outline-danger" onclick="deleteRent(${p.id})" title="Delete">
//             <i class="bi bi-trash"></i>
//           </button>
//         </td>
//       </tr>
//     `).join('');

//     renderPagination('pay-pagination', pages, state.payPage, p => { state.payPage = p; renderPayments(); });

//     // Unpaid summary
//     const unpaid = state.rentPayments.filter(p => p.status !== 'Paid');
//     const unpaidTotal = unpaid.reduce((s, p) => s + Number(p.amount_due), 0);
//     const unpaidEl = $('unpaid-summary');
//     if (unpaidEl) {
//       unpaidEl.innerHTML = unpaid.length > 0
//         ? `<div class="alert alert-warning mb-0 py-2">
//             <i class="bi bi-exclamation-triangle me-2"></i>
//             <strong>${unpaid.length} unpaid</strong> entries totaling <strong>Rs. ${fmt(unpaidTotal)}</strong>
//            </div>`
//         : `<div class="alert alert-success mb-0 py-2"><i class="bi bi-check-circle me-2"></i>All rents paid!</div>`;
//     }
//   }

//   // ── RECORD PAYMENT ────────────────────────────────────────
//   function populateUnpaidDropdown() {
//     const select = $('rent-entry-select');
//     if (!select) return;

//     const unpaid = state.rentPayments.filter(p => p.status !== 'Paid');
//     if (unpaid.length === 0) {
//       select.innerHTML = '<option value="">No unpaid entries</option>';
//       return;
//     }

//     select.innerHTML = '<option value="">-- Select Rent Entry --</option>' +
//       unpaid.map(p =>
//         `<option value="${p.id}" data-amount="${p.amount_due}">
//           ${p.shop?.shop_name} | ${monthName(p.rent_month)} ${p.rent_year} | Rs. ${fmt(p.amount_due)} [${p.status}]
//         </option>`
//       ).join('');

//     select.onchange = function () {
//       const opt = this.selectedOptions[0];
//       const amt = opt?.getAttribute('data-amount');
//       if (amt) $('payment-amount').value = parseFloat(amt).toFixed(2);
//     };
//   }

//   function populateShopDropdown() {
//     const select = $('rent-entry-select');
//     populateUnpaidDropdown(); // handled in payment modal
//   }

//   window.quickPayRent = function (rentId) {
//     const p = state.rentPayments.find(x => x.id === rentId);
//     if (!p) return;

//     $('rent-entry-select').value = rentId;
//     $('payment-date').value = new Date().toISOString().split('T')[0];
//     $('payment-amount').value = p.amount_due;
//     new bootstrap.Modal($('recordPaymentModal')).show();
//   };

//   window.recordPayment = async function () {
//     const rentId     = parseInt($('rent-entry-select').value);
//     const payDate    = $('payment-date').value;
//     const amount     = parseFloat($('payment-amount').value);
//     const method     = $('payment-method').value;
//     const notes      = $('payment-notes').value.trim();

//     if (!rentId || !payDate || isNaN(amount) || amount <= 0) {
//       showToast('Please fill all required fields', 'error');
//       return;
//     }

//     try {
//       const rent = state.rentPayments.find(p => p.id === rentId);
//       const newStatus = amount >= (rent?.amount_due || amount) ? 'Paid' : 'Partial';

//       const { error } = await supabase.from('rent_payments').update({
//         amount_paid: amount,
//         paid_date: payDate,
//         payment_method: method,
//         status: newStatus,
//         notes: notes || null,
//       }).eq('id', rentId);

//       if (error) throw error;

//       showToast('Payment recorded successfully!', 'success');
//       hideModal('recordPaymentModal');
//       $('recordPaymentForm').reset();
//       setDefaultDates();
//       await loadRentPayments();
//       await loadSummary();
//     } catch (e) {
//       showToast('Error: ' + e.message, 'error');
//     }
//   };

//   // ── DELETE RENT ENTRY ─────────────────────────────────────
//   window.deleteRent = async function (rentId) {
//     if (!confirm('Delete this rent entry?')) return;
//     try {
//       const { error } = await supabase.from('rent_payments').delete().eq('id', rentId);
//       if (error) throw error;
//       showToast('Deleted!', 'success');
//       await loadRentPayments();
//       await loadSummary();
//     } catch (e) {
//       showToast('Error: ' + e.message, 'error');
//     }
//   };

//   // ── PAGINATION RENDERER ───────────────────────────────────
//   function renderPagination(containerId, totalPages, currentPage, onPage) {
//     const el = $(containerId);
//     if (!el) return;
//     if (totalPages <= 1) { el.innerHTML = ''; return; }

//     let btns = `<nav><ul class="pagination pagination-sm mb-0 justify-content-end flex-wrap">`;
//     btns += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
//       <button class="page-link" onclick="(${onPage})(${currentPage - 1})">‹</button></li>`;

//     for (let i = 1; i <= totalPages; i++) {
//       if (totalPages > 7 && Math.abs(i - currentPage) > 2 && i !== 1 && i !== totalPages) {
//         if (i === 2 || i === totalPages - 1) btns += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
//         continue;
//       }
//       btns += `<li class="page-item ${i === currentPage ? 'active' : ''}">
//         <button class="page-link" onclick="(${onPage})(${i})">${i}</button></li>`;
//     }

//     btns += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
//       <button class="page-link" onclick="(${onPage})(${currentPage + 1})">›</button></li>`;
//     btns += `</ul></nav>`;
//     el.innerHTML = btns;
//   }

//   // ── PRINT ─────────────────────────────────────────────────
//   window.printRentReport = function () {
//     const m = state.selectedMonth;
//     const y = state.selectedYear;

//     const pays = state.filteredPayments;
//     const totalDue  = pays.reduce((s, p) => s + Number(p.amount_due), 0);
//     const totalPaid = pays.filter(p => p.status === 'Paid').reduce((s, p) => s + Number(p.amount_paid || 0), 0);
//     const totalPending = pays.filter(p => p.status !== 'Paid').reduce((s, p) => s + Number(p.amount_due), 0);

//     const rows = pays.map(p => `
//       <tr>
//         <td>${p.shop?.shop_name || 'N/A'}</td>
//         <td>${p.shop?.tenant_name || '-'}</td>
//         <td>${p.shop?.phone || '-'}</td>
//         <td>Rs. ${fmt(p.amount_due)}</td>
//         <td>${fmtDate(p.due_date)}</td>
//         <td><strong style="color:${p.status === 'Paid' ? 'green' : p.status === 'Overdue' ? 'red' : '#856404'}">${p.status}</strong></td>
//         <td>${p.paid_date ? fmtDate(p.paid_date) : '-'}</td>
//         <td>${p.amount_paid ? 'Rs. ' + fmt(p.amount_paid) : '-'}</td>
//         <td>${p.payment_method || '-'}</td>
//       </tr>
//     `).join('');

//     const win = window.open('', '_blank');
//     win.document.write(`<!DOCTYPE html>
// <html>
// <head>
// <title>Rent Report - ${monthName(m)} ${y}</title>
// <style>
//   body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; color: #333; }
//   h2 { text-align: center; margin: 0; color: #1a237e; }
//   .sub { text-align: center; color: #555; margin-bottom: 15px; font-size: 13px; }
//   table { width: 100%; border-collapse: collapse; margin-top: 10px; }
//   th { background: #1a237e; color: white; padding: 7px 5px; text-align: left; font-size: 11px; }
//   td { padding: 6px 5px; border-bottom: 1px solid #eee; font-size: 11px; }
//   tr:nth-child(even) { background: #f5f5f5; }
//   .summary { display: flex; gap: 20px; margin: 15px 0; }
//   .sum-box { flex: 1; border: 1px solid #ddd; border-radius: 6px; padding: 10px; text-align: center; }
//   .sum-box h4 { margin: 0; font-size: 18px; }
//   .sum-box p { margin: 2px 0; font-size: 11px; color: #666; }
//   .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #999; }
//   @media print { body { margin: 10px; } }
// </style>
// </head>
// <body>
// <h2>🏪 Khalid & Sons Petroleum</h2>
// <div class="sub">Shop Rent Report — ${monthName(m)} ${y}</div>
// <div class="summary">
//   <div class="sum-box" style="border-color:#1a237e">
//     <p>Total Shops</p><h4>${pays.length}</h4>
//   </div>
//   <div class="sum-box" style="border-color:#388e3c">
//     <p>Total Due</p><h4>Rs. ${fmt(totalDue)}</h4>
//   </div>
//   <div class="sum-box" style="border-color:#2e7d32">
//     <p>Total Collected</p><h4 style="color:green">Rs. ${fmt(totalPaid)}</h4>
//   </div>
//   <div class="sum-box" style="border-color:#c62828">
//     <p>Outstanding</p><h4 style="color:red">Rs. ${fmt(totalPending)}</h4>
//   </div>
// </div>
// <table>
//   <thead>
//     <tr>
//       <th>Shop</th><th>Tenant</th><th>Phone</th>
//       <th>Amount Due</th><th>Due Date</th>
//       <th>Status</th><th>Paid Date</th>
//       <th>Paid Amount</th><th>Method</th>
//     </tr>
//   </thead>
//   <tbody>${rows}</tbody>
// </table>
// <div class="footer">
//   Printed on ${new Date().toLocaleString('en-PK')} — Khalid & Sons Petroleum Management System
// </div>
// <script>window.onload = () => { window.print(); }<\/script>
// </body>
// </html>`);
//     win.document.close();
//   };

//   // ── VIEW HISTORY ──────────────────────────────────────────
//   window.viewRentHistory = async function () {
//     // Switch year filter to show all months
//     const y = state.selectedYear;
//     try {
//       const { data, error } = await supabase
//         .from('rent_payments')
//         .select(`*, shop:shops(shop_name, tenant_name)`)
//         .eq('rent_year', y)
//         .order('rent_month')
//         .order('shop_id');
//       if (error) throw error;

//       // Build history table
//       const groups = {};
//       data.forEach(p => {
//         const k = `${p.rent_month}`;
//         if (!groups[k]) groups[k] = [];
//         groups[k].push(p);
//       });

//       let html = `<div class="table-responsive"><table class="table table-sm">
//         <thead class="table-dark"><tr>
//           <th>Month</th><th>Shop</th><th>Amount</th><th>Status</th><th>Paid</th>
//         </tr></thead><tbody>`;

//       for (let m = 1; m <= 12; m++) {
//         const entries = groups[m] || [];
//         if (entries.length === 0) continue;
//         entries.forEach((p, i) => {
//           html += `<tr>
//             ${i === 0 ? `<td rowspan="${entries.length}"><strong>${monthName(m)}</strong></td>` : ''}
//             <td>${p.shop?.shop_name}</td>
//             <td>Rs. ${fmt(p.amount_due)}</td>
//             <td><span class="badge ${p.status === 'Paid' ? 'bg-success' : p.status === 'Overdue' ? 'bg-danger' : 'bg-warning text-dark'}">${p.status}</span></td>
//             <td>${p.paid_date ? fmtDate(p.paid_date) : '-'}</td>
//           </tr>`;
//         });
//       }

//       html += `</tbody></table></div>`;
//       $('history-body').innerHTML = html;
//       new bootstrap.Modal($('historyModal')).show();
//     } catch (e) {
//       showToast('Error loading history: ' + e.message, 'error');
//     }
//   };

//   // ── MONTH/YEAR FILTER ─────────────────────────────────────
//   function setupMonthYearFilter() {
//     const mSel = $('month-filter');
//     const ySel = $('year-filter');
//     if (!mSel || !ySel) return;

//     // Populate year
//     const now = new Date();
//     for (let y = now.getFullYear() + 1; y >= 2020; y--) {
//       const opt = document.createElement('option');
//       opt.value = y; opt.textContent = y;
//       if (y === now.getFullYear()) opt.selected = true;
//       ySel.appendChild(opt);
//     }

//     mSel.value = state.selectedMonth;

//     mSel.addEventListener('change', () => {
//       state.selectedMonth = parseInt(mSel.value);
//       loadRentPayments();
//       loadSummary();
//     });
//     ySel.addEventListener('change', () => {
//       state.selectedYear = parseInt(ySel.value);
//       loadRentPayments();
//       loadSummary();
//     });
//   }

//   function setupSearch() {
//     const shopSearch = $('shop-search');
//     const paySearch  = $('pay-search');
//     const statusFil  = $('status-filter');

//     if (shopSearch) {
//       shopSearch.addEventListener('input', () => {
//         state.searchShop = shopSearch.value;
//         state.shopPage = 1;
//         renderShops();
//       });
//     }
//     if (paySearch) {
//       paySearch.addEventListener('input', () => {
//         state.searchPay = paySearch.value;
//         applyPaymentFilters();
//       });
//     }
//     if (statusFil) {
//       statusFil.addEventListener('change', () => {
//         state.filterStatus = statusFil.value;
//         applyPaymentFilters();
//       });
//     }
//   }

//   function setDefaultDates() {
//     const today = new Date().toISOString().split('T')[0];
//     if ($('payment-date')) $('payment-date').value = today;
//     if ($('agreement-start')) $('agreement-start').value = today;
//   }

//   // ── INIT ──────────────────────────────────────────────────
//   document.addEventListener('DOMContentLoaded', () => {
//     if (document.body.getAttribute('data-page') !== 'rent') return;

//     setDefaultDates();
//     setupMonthYearFilter();
//     setupSearch();
//     loadShops();
//     loadRentPayments();
//     loadSummary();

//     console.log('✅ Rent management initialized');
//   });

// })();

// 523 previous code start
// end and changed reason add select mutliple option 
// ============================================================
// SHOP RENT MANAGEMENT SYSTEM
// Khalid & Sons Petroleum
// Features: Multi-select, Bulk Print, Search, Filter, Pagination
// ============================================================
(function () {
  'use strict';

  const supabase = window.supabaseClient;

  const state = {
    shops: [], rentPayments: [], filteredPayments: [],
    selectedIds: new Set(),          // ← multi-select IDs
    shopPage: 1, shopPageSize: 10,
    payPage: 1,  payPageSize: 10,
    selectedMonth: new Date().getMonth() + 1,
    selectedYear:  new Date().getFullYear(),
    searchShop: '', searchPay: '', filterStatus: 'all',
  };

  // ── Helpers ────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }

  function fmt(n) {
    return Number(n||0).toLocaleString('en-PK',{minimumFractionDigits:2,maximumFractionDigits:2});
  }
  function fmtDate(d) {
    if (!d) return '-';
    const dt = new Date(d);
    return isNaN(dt) ? '-' : dt.toLocaleDateString('en-PK',{day:'2-digit',month:'2-digit',year:'numeric'});
  }
  function monthName(m){return['','January','February','March','April','May','June','July','August','September','October','November','December'][m];}
  function monthShort(m){return['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m];}
  function escHtml(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

  function showToast(msg, type='info') {
    const t = $('liveToast'); if (!t) return;
    const titles={success:'✅ Success',error:'❌ Error',warning:'⚠️ Warning',info:'ℹ️ Info'};
    $('toast-title').textContent = titles[type]||'Info';
    $('toast-message').textContent = msg;
    t.className = `toast border-${type==='error'?'danger':type}`;
    new bootstrap.Toast(t,{delay:4000}).show();
  }

  function safeHideModal(id) {
    const el=$(id); if(!el) return;
    const inst=bootstrap.Modal.getInstance(el);
    if(inst) inst.hide();
    setTimeout(()=>{
      document.querySelectorAll('.modal-backdrop').forEach(b=>b.remove());
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('padding-right');
    },350);
  }
  function safeShowModal(id) {
    const el=$(id); if(!el) return;
    document.querySelectorAll('.modal.show').forEach(m=>{
      const i=bootstrap.Modal.getInstance(m); if(i) i.hide();
    });
    setTimeout(()=>new bootstrap.Modal(el).show(),150);
  }

  // ── RENT ENTRY CREATOR ────────────────────────────────────
  async function createRentEntryForShop(shop, month, year) {
    const {data:ex} = await supabase.from('rent_payments').select('id')
      .eq('shop_id',shop.id).eq('rent_month',month).eq('rent_year',year).maybeSingle();
    if (ex) return {created:false};
    const lastDay = new Date(year,month,0).getDate();
    const dueDay  = Math.min(Number(shop.due_day)||1, lastDay);
    const dueDate = `${year}-${String(month).padStart(2,'0')}-${String(dueDay).padStart(2,'0')}`;
    const status  = new Date(dueDate)<new Date() ? 'Overdue' : 'Pending';
    const {error} = await supabase.from('rent_payments').insert([{
      shop_id:shop.id, rent_month:month, rent_year:year,
      amount_due:shop.monthly_rent, due_date:dueDate, status
    }]);
    if(error) throw error;
    return {created:true};
  }

  // ── SUMMARY ───────────────────────────────────────────────
  async function loadSummary() {
    try {
      const {data:shops} = await supabase.from('shops').select('id').eq('status','Active');
      $('total-shops').textContent = shops?.length||0;
      const {data:pays} = await supabase.from('rent_payments')
        .select('amount_due,amount_paid,status')
        .eq('rent_month',state.selectedMonth).eq('rent_year',state.selectedYear);
      let due=0,paid=0,pend=0;
      (pays||[]).forEach(p=>{
        due+=Number(p.amount_due);
        if(p.status==='Paid') paid+=Number(p.amount_paid||0);
        if(p.status!=='Paid') pend++;
      });
      $('month-rent').textContent  = 'Rs. '+fmt(due);
      $('paid-rent').textContent   = 'Rs. '+fmt(paid);
      $('pending-rent').textContent = pend;
    } catch(e){console.error(e);}
  }

  // ── SHOPS ─────────────────────────────────────────────────
  async function loadShops() {
    try {
      const {data,error} = await supabase.from('shops').select('*').order('created_at',{ascending:false});
      if(error) throw error;
      state.shops = data||[];
      renderShops();
    } catch(e) {
      const t=$('shops-table');
      if(t) t.innerHTML=`<tr><td colspan="6" class="text-danger text-center py-3">Error: ${e.message}</td></tr>`;
    }
  }

  function renderShops() {
    const tbody=$('shops-table'); if(!tbody) return;
    const q=state.searchShop.toLowerCase();
    const filtered=state.shops.filter(s=>
      s.shop_name.toLowerCase().includes(q)||
      s.tenant_name.toLowerCase().includes(q)||
      (s.phone||'').includes(q)
    );
    const pages=Math.max(1,Math.ceil(filtered.length/state.shopPageSize));
    state.shopPage=Math.min(state.shopPage,pages);
    const slice=filtered.slice((state.shopPage-1)*state.shopPageSize, state.shopPage*state.shopPageSize);

    if(!slice.length){
      tbody.innerHTML='<tr><td colspan="6" class="text-center text-muted py-4">No shops registered yet. Click <strong>Add Shop</strong>.</td></tr>';
      $('shops-pagination')&&($('shops-pagination').innerHTML=''); return;
    }
    tbody.innerHTML=slice.map(s=>`
      <tr>
        <td><strong>${escHtml(s.shop_name)}</strong></td>
        <td>${escHtml(s.tenant_name)}</td>
        <td><strong>Rs. ${fmt(s.monthly_rent)}</strong></td>
        <td>${escHtml(s.phone||'-')}</td>
        <td><span class="badge ${s.status==='Active'?'bg-success':'bg-secondary'}">${s.status}</span></td>
        <td>
          <button class="btn btn-sm btn-outline-warning me-1" onclick="editShopModal(${s.id})"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteShop(${s.id})"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`).join('');
    renderPagination('shops-pagination',pages,state.shopPage,p=>{state.shopPage=p;renderShops();});
  }

  // ── ADD SHOP ──────────────────────────────────────────────
  window.addShop = async function() {
    const btn=document.querySelector('#addShopForm button[type="submit"]');
    if(btn){btn.disabled=true;btn.textContent='Saving...';}
    const shopName   = ($('shop-name').value||'').trim();
    const tenantName = ($('tenant-name').value||'').trim();
    const phone      = ($('tenant-phone').value||'').trim();
    const rent       = parseFloat($('monthly-rent').value);
    const dueDay     = parseInt($('due-day').value)||1;
    const startDate  = $('agreement-start').value;
    const notes      = ($('shop-notes').value||'').trim();
    if(!shopName||!tenantName||isNaN(rent)||rent<=0||!startDate){
      showToast('Please fill all required fields','error');
      if(btn){btn.disabled=false;btn.innerHTML='<i class="bi bi-check-circle me-1"></i>Add Shop';}
      return;
    }
    try {
      const {data:newShop,error:sErr}=await supabase.from('shops').insert([{
        shop_name:shopName,tenant_name:tenantName,phone:phone||null,
        monthly_rent:rent,due_day:dueDay,start_date:startDate,
        notes:notes||null,status:'Active'
      }]).select().single();
      if(sErr) throw sErr;
      await createRentEntryForShop(newShop,state.selectedMonth,state.selectedYear);
      showToast(`"${shopName}" added! Rent entry created for ${monthName(state.selectedMonth)} ${state.selectedYear}.`,'success');
      safeHideModal('addShopModal');
      $('addShopForm').reset(); setDefaultDates();
      await loadShops(); await loadRentPayments(); await loadSummary();
    } catch(e){
      showToast('Error: '+e.message,'error');
    } finally {
      if(btn){btn.disabled=false;btn.innerHTML='<i class="bi bi-check-circle me-1"></i>Add Shop';}
    }
  };

  window.editShopModal = function(shopId) {
    const s=state.shops.find(x=>x.id===shopId); if(!s) return;
    $('edit-shop-id').value=$s(s.id); 
    // use direct assignment
    document.getElementById('edit-shop-id').value       = s.id;
    document.getElementById('edit-shop-name').value     = s.shop_name;
    document.getElementById('edit-tenant-name').value   = s.tenant_name;
    document.getElementById('edit-tenant-phone').value  = s.phone||'';
    document.getElementById('edit-monthly-rent').value  = s.monthly_rent;
    document.getElementById('edit-due-day').value       = s.due_day;
    document.getElementById('edit-agreement-start').value = s.start_date||'';
    document.getElementById('edit-shop-status').value   = s.status;
    document.getElementById('edit-shop-notes').value    = s.notes||'';
    safeShowModal('editShopModal');
  };

  window.updateShop = async function() {
    const id=parseInt(document.getElementById('edit-shop-id').value);
    const shopName   = (document.getElementById('edit-shop-name').value||'').trim();
    const tenantName = (document.getElementById('edit-tenant-name').value||'').trim();
    const phone      = (document.getElementById('edit-tenant-phone').value||'').trim();
    const rent       = parseFloat(document.getElementById('edit-monthly-rent').value);
    const dueDay     = parseInt(document.getElementById('edit-due-day').value)||1;
    const startDate  = document.getElementById('edit-agreement-start').value;
    const status     = document.getElementById('edit-shop-status').value;
    const notes      = (document.getElementById('edit-shop-notes').value||'').trim();
    if(!shopName||!tenantName||isNaN(rent)){showToast('Fill all required fields','error');return;}
    try {
      const {error}=await supabase.from('shops').update({
        shop_name:shopName,tenant_name:tenantName,phone:phone||null,
        monthly_rent:rent,due_day:dueDay,start_date:startDate||null,
        status,notes:notes||null
      }).eq('id',id);
      if(error) throw error;
      showToast('Shop updated!','success');
      safeHideModal('editShopModal');
      await loadShops(); await loadSummary();
    } catch(e){showToast('Error: '+e.message,'error');}
  };

  window.deleteShop = async function(shopId) {
    const s=state.shops.find(x=>x.id===shopId);
    if(!confirm(`Delete "${s?.shop_name}"? All rent records will also be deleted.`)) return;
    try {
      const {error}=await supabase.from('shops').delete().eq('id',shopId);
      if(error) throw error;
      showToast('Shop deleted!','success');
      await loadShops(); await loadRentPayments(); await loadSummary();
    } catch(e){showToast('Error: '+e.message,'error');}
  };

  window.generateMonthlyRent = async function() {
    const m=state.selectedMonth,y=state.selectedYear;
    if(!confirm(`Generate rent entries for ALL active shops for ${monthName(m)} ${y}?`)) return;
    try {
      const {data:shops,error}=await supabase.from('shops').select('*').eq('status','Active');
      if(error) throw error;
      if(!shops?.length){showToast('No active shops!','warning');return;}
      let created=0,skipped=0;
      for(const s of shops){const r=await createRentEntryForShop(s,m,y);r.created?created++:skipped++;}
      showToast(`Done! Created: ${created}, Already existed: ${skipped}`,'success');
      await loadRentPayments(); await loadSummary();
    } catch(e){showToast('Error: '+e.message,'error');}
  };

  // ── LOAD RENT PAYMENTS ────────────────────────────────────
  async function loadRentPayments() {
    const tbody=$('rent-payments-table');
    if(tbody) tbody.innerHTML=`<tr><td colspan="8" class="text-center py-3 text-muted">
      <div class="spinner-border spinner-border-sm me-2"></div>Loading...</td></tr>`;
    try {
      const {data,error}=await supabase.from('rent_payments')
        .select('*, shop:shops(id,shop_name,tenant_name,phone,monthly_rent)')
        .eq('rent_month',state.selectedMonth).eq('rent_year',state.selectedYear)
        .order('due_date');
      if(error) throw error;
      const now=new Date();
      for(const p of (data||[])){
        if(p.status==='Pending'&&new Date(p.due_date)<now){
          await supabase.from('rent_payments').update({status:'Overdue'}).eq('id',p.id);
          p.status='Overdue';
        }
      }
      state.rentPayments=data||[];
      state.selectedIds.clear();           // clear selection on reload
      applyPaymentFilters();
    } catch(e){
      console.error(e);
      if(tbody) tbody.innerHTML=`<tr><td colspan="8" class="text-danger text-center py-3">Error: ${e.message}</td></tr>`;
    }
  }

  function applyPaymentFilters() {
    const q=state.searchPay.toLowerCase(), st=state.filterStatus;
    state.filteredPayments=state.rentPayments.filter(p=>{
      const nm=(p.shop?.shop_name||'').toLowerCase();
      const tn=(p.shop?.tenant_name||'').toLowerCase();
      return (!q||nm.includes(q)||tn.includes(q))&&(st==='all'||p.status.toLowerCase()===st);
    });
    state.payPage=1;
    renderPayments();
    refreshUnpaidDropdown();
  }

  // ── RENDER PAYMENTS WITH CHECKBOXES ──────────────────────
  function renderPayments() {
    const tbody=$('rent-payments-table'); if(!tbody) return;
    const pages=Math.max(1,Math.ceil(state.filteredPayments.length/state.payPageSize));
    state.payPage=Math.min(state.payPage,pages);
    const slice=state.filteredPayments.slice(
      (state.payPage-1)*state.payPageSize, state.payPage*state.payPageSize
    );
    const badge={'Paid':'bg-success','Pending':'bg-warning text-dark','Overdue':'bg-danger','Partial':'bg-info text-dark'};

    if(!slice.length){
      const msg=state.rentPayments.length===0
        ? `No entries for <strong>${monthName(state.selectedMonth)} ${state.selectedYear}</strong>. Click <strong>Generate Monthly</strong>.`
        : 'No entries match your filter.';
      tbody.innerHTML=`<tr><td colspan="8" class="text-center text-muted py-4">${msg}</td></tr>`;
      $('pay-pagination')&&($('pay-pagination').innerHTML='');
      updateUnpaidAlert(); updateSelectionBar(); return;
    }

    tbody.innerHTML=slice.map(p=>{
      const checked=state.selectedIds.has(p.id)?'checked':'';
      return `<tr class="${p.status==='Overdue'?'table-danger':p.status==='Paid'?'table-success':''}" id="row-${p.id}">
        <td class="text-center">
          <input type="checkbox" class="form-check-input entry-chk" value="${p.id}"
            ${checked} onchange="toggleSelect(${p.id},this.checked)">
        </td>
        <td>
          <strong>${escHtml(p.shop?.shop_name||'N/A')}</strong><br>
          <small class="text-muted">${escHtml(p.shop?.tenant_name||'')}</small>
        </td>
        <td>${monthShort(p.rent_month)} ${p.rent_year}</td>
        <td><strong>Rs. ${fmt(p.amount_due)}</strong></td>
        <td>${fmtDate(p.due_date)}</td>
        <td><span class="badge ${badge[p.status]||'bg-secondary'}">${p.status}</span></td>
        <td>
          ${p.paid_date?fmtDate(p.paid_date):'-'}
          ${p.amount_paid?`<br><small class="text-success fw-bold">Rs. ${fmt(p.amount_paid)}</small>`:''}
          ${p.payment_method?`<br><small class="text-muted">${p.payment_method}</small>`:''}
        </td>
        <td>
          ${p.status!=='Paid'?`
            <button class="btn btn-sm btn-success me-1" onclick="quickPayRent(${p.id})" title="Pay Now">
              <i class="bi bi-cash"></i>
            </button>`:''}
          <button class="btn btn-sm btn-outline-danger" onclick="deleteRent(${p.id})">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>`;
    }).join('');

    // Sync select-all checkbox
    const allChk=$('select-all-chk');
    if(allChk){
      const allIds=slice.map(p=>p.id);
      allChk.checked=allIds.length>0&&allIds.every(id=>state.selectedIds.has(id));
      allChk.indeterminate=!allChk.checked&&allIds.some(id=>state.selectedIds.has(id));
    }

    renderPagination('pay-pagination',pages,state.payPage,p=>{state.payPage=p;renderPayments();});
    updateUnpaidAlert();
    updateSelectionBar();
  }

  // ── SELECTION LOGIC ───────────────────────────────────────
  window.toggleSelect = function(id, checked) {
    checked ? state.selectedIds.add(id) : state.selectedIds.delete(id);
    updateSelectionBar();
    // update select-all state
    const allChk=$('select-all-chk');
    if(allChk){
      const slice=state.filteredPayments.slice(
        (state.payPage-1)*state.payPageSize, state.payPage*state.payPageSize
      );
      const allIds=slice.map(p=>p.id);
      allChk.checked=allIds.every(id=>state.selectedIds.has(id));
      allChk.indeterminate=!allChk.checked&&allIds.some(id=>state.selectedIds.has(id));
    }
  };

  window.toggleSelectAll = function(checked) {
    const slice=state.filteredPayments.slice(
      (state.payPage-1)*state.payPageSize, state.payPage*state.payPageSize
    );
    slice.forEach(p=>checked?state.selectedIds.add(p.id):state.selectedIds.delete(p.id));
    renderPayments();
  };

  window.selectAllPages = function() {
    state.filteredPayments.forEach(p=>state.selectedIds.add(p.id));
    renderPayments();
    showToast(`${state.selectedIds.size} entries selected across all pages`,'info');
  };

  window.clearSelection = function() {
    state.selectedIds.clear();
    renderPayments();
  };

  function updateSelectionBar() {
    const bar=$('selection-bar'); if(!bar) return;
    const count=state.selectedIds.size;
    if(count===0){bar.style.display='none';return;}
    bar.style.display='flex';
    const selTotal=state.filteredPayments
      .filter(p=>state.selectedIds.has(p.id))
      .reduce((s,p)=>s+Number(p.amount_due),0);
    $('sel-count').textContent=count;
    $('sel-total').textContent=fmt(selTotal);
  }

  // ── PRINT SELECTED ────────────────────────────────────────
  window.printSelected = function() {
    const selected=state.filteredPayments.filter(p=>state.selectedIds.has(p.id));
    if(!selected.length){showToast('Koi entry select nahi ki!','warning');return;}
    printEntries(selected, 'Selected Entries');
  };

  window.printRentReport = function() {
    printEntries(state.filteredPayments, `${monthName(state.selectedMonth)} ${state.selectedYear}`);
  };

  function printEntries(pays, title) {
    if(!pays.length){showToast('No data to print','warning');return;}
    const totalDue    = pays.reduce((s,p)=>s+Number(p.amount_due),0);
    const totalPaid   = pays.filter(p=>p.status==='Paid').reduce((s,p)=>s+Number(p.amount_paid||0),0);
    const totalPend   = pays.filter(p=>p.status!=='Paid').reduce((s,p)=>s+Number(p.amount_due),0);
    const paidCount   = pays.filter(p=>p.status==='Paid').length;
    const unpaidCount = pays.filter(p=>p.status!=='Paid').length;

    const allRows=pays.map((p,i)=>`<tr>
      <td>${i+1}</td>
      <td><b>${escHtml(p.shop?.shop_name||'N/A')}</b><br><small>${escHtml(p.shop?.tenant_name||'')}</small></td>
      <td>${escHtml(p.shop?.phone||'-')}</td>
      <td>${monthShort(p.rent_month)} ${p.rent_year}</td>
      <td>Rs. ${fmt(p.amount_due)}</td>
      <td>${fmtDate(p.due_date)}</td>
      <td style="color:${p.status==='Paid'?'green':p.status==='Overdue'?'red':'#856404'}"><b>${p.status}</b></td>
      <td>${p.paid_date?fmtDate(p.paid_date):'-'}</td>
      <td>${p.amount_paid?'Rs. '+fmt(p.amount_paid):'-'}</td>
      <td>${p.payment_method||'-'}</td>
    </tr>`).join('');

    const unpaidRows=pays.filter(p=>p.status!=='Paid').map((p,i)=>`<tr>
      <td>${i+1}</td>
      <td><b>${escHtml(p.shop?.shop_name)}</b></td>
      <td>${escHtml(p.shop?.tenant_name)}</td>
      <td>${escHtml(p.shop?.phone||'-')}</td>
      <td>Rs. ${fmt(p.amount_due)}</td>
      <td style="color:${p.status==='Overdue'?'red':'#856404'}"><b>${p.status}</b></td>
      <td>${fmtDate(p.due_date)}</td>
    </tr>`).join('');

    const win=window.open('','_blank');
    win.document.write(`<!DOCTYPE html><html><head>
<title>Rent Report — ${title}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:11px;margin:15px;color:#222}
  h1{text-align:center;font-size:17px;margin:0;color:#1a237e}
  h2{text-align:center;font-size:12px;color:#555;margin:3px 0 14px}
  .summary{display:flex;gap:10px;margin:10px 0;flex-wrap:wrap}
  .box{flex:1;min-width:100px;border:2px solid #ddd;border-radius:5px;padding:8px;text-align:center}
  .box h3{margin:3px 0;font-size:15px}.box p{margin:0;font-size:9px;color:#666}
  table{width:100%;border-collapse:collapse;margin-top:10px}
  th{background:#1a237e;color:#fff;padding:5px 3px;font-size:9px;text-align:left}
  td{padding:4px 3px;border-bottom:1px solid #eee;font-size:9px;vertical-align:top}
  tr:nth-child(even){background:#f9f9f9}
  .sec{font-size:12px;font-weight:bold;margin:14px 0 3px;border-left:4px solid #1a237e;padding-left:6px}
  .footer{margin-top:14px;text-align:center;font-size:8px;color:#aaa;border-top:1px solid #eee;padding-top:6px}
  @media print{body{margin:5mm}}
</style></head><body>
<h1>🏪 Khalid & Sons Petroleum</h1>
<h2>Rent Report — ${title}</h2>
<div class="summary">
  <div class="box" style="border-color:#1a237e"><p>Entries</p><h3>${pays.length}</h3></div>
  <div class="box" style="border-color:#388e3c"><p>Paid</p><h3 style="color:green">${paidCount}</h3></div>
  <div class="box" style="border-color:#c62828"><p>Unpaid</p><h3 style="color:red">${unpaidCount}</h3></div>
  <div class="box"><p>Total Due</p><h3>Rs. ${fmt(totalDue)}</h3></div>
  <div class="box" style="border-color:green"><p>Collected</p><h3 style="color:green">Rs. ${fmt(totalPaid)}</h3></div>
  <div class="box" style="border-color:red"><p>Outstanding</p><h3 style="color:red">Rs. ${fmt(totalPend)}</h3></div>
</div>
<div class="sec">📋 Rent Details</div>
<table><thead><tr>
  <th>#</th><th>Shop / Tenant</th><th>Phone</th><th>Month</th>
  <th>Amount Due</th><th>Due Date</th><th>Status</th>
  <th>Paid Date</th><th>Paid Amount</th><th>Method</th>
</tr></thead><tbody>${allRows}</tbody></table>
${unpaidRows?`
<div class="sec" style="color:red;border-color:red">⚠️ Unpaid / Outstanding</div>
<table><thead><tr>
  <th>#</th><th>Shop</th><th>Tenant</th><th>Phone</th><th>Amount Due</th><th>Status</th><th>Due Date</th>
</tr></thead><tbody>${unpaidRows}</tbody></table>`:''}
<div class="footer">
  Printed: ${new Date().toLocaleString('en-PK')} — Khalid & Sons Petroleum Management System
</div>
<script>window.onload=()=>window.print();<\/script>
</body></html>`);
    win.document.close();
  }

  function updateUnpaidAlert() {
    const el=$('unpaid-summary'); if(!el) return;
    const unpaid=state.rentPayments.filter(p=>p.status!=='Paid');
    const total=unpaid.reduce((s,p)=>s+Number(p.amount_due),0);
    if(!state.rentPayments.length){el.innerHTML='';return;}
    if(!unpaid.length){
      el.innerHTML=`<div class="alert alert-success mb-2 py-2 small">
        <i class="bi bi-check-circle-fill me-1"></i>All rents collected for ${monthName(state.selectedMonth)} ${state.selectedYear}! 🎉</div>`;
    } else {
      const names=unpaid.map(p=>`<span class="badge bg-danger me-1">${escHtml(p.shop?.shop_name||'')}</span>`).join('');
      el.innerHTML=`<div class="alert alert-warning mb-2 py-2 small">
        <i class="bi bi-exclamation-triangle-fill me-1"></i>
        <strong>${unpaid.length} unpaid</strong> — Outstanding: <strong>Rs. ${fmt(total)}</strong>
        &nbsp;— ${names}</div>`;
    }
  }

  // ── UNPAID DROPDOWN ───────────────────────────────────────
  function refreshUnpaidDropdown() {
    const sel=$('rent-entry-select'); if(!sel) return;
    const unpaid=state.rentPayments.filter(p=>p.status!=='Paid');
    if(!unpaid.length){sel.innerHTML='<option value="">✅ All rents paid for this month</option>';return;}
    sel.innerHTML='<option value="">-- Select a shop rent entry --</option>'+
      unpaid.map(p=>`<option value="${p.id}" data-amount="${p.amount_due}">
        ${p.shop?.shop_name} | ${monthShort(p.rent_month)} ${p.rent_year} | Rs. ${fmt(p.amount_due)} [${p.status}]
      </option>`).join('');
    sel.onchange=function(){
      const amt=this.selectedOptions[0]?.getAttribute('data-amount');
      if(amt) $('payment-amount').value=parseFloat(amt).toFixed(0);
    };
  }

  window.quickPayRent = function(rentId) {
    const p=state.rentPayments.find(x=>x.id===rentId); if(!p) return;
    refreshUnpaidDropdown();
    setTimeout(()=>{
      $('rent-entry-select').value=rentId;
      $('payment-date').value=new Date().toISOString().split('T')[0];
      $('payment-amount').value=p.amount_due;
    },200);
    safeShowModal('recordPaymentModal');
  };

  window.recordPayment = async function() {
    const rentId  = parseInt($('rent-entry-select').value);
    const payDate = $('payment-date').value;
    const amount  = parseFloat($('payment-amount').value);
    const method  = $('payment-method').value;
    const notes   = ($('payment-notes').value||'').trim();
    if(!rentId||!payDate||isNaN(amount)||amount<=0){
      showToast('Please fill all payment details','error'); return;
    }
    const btn=document.querySelector('#recordPaymentForm button[type="submit"]');
    if(btn){btn.disabled=true;btn.textContent='Saving...';}
    try {
      const rent=state.rentPayments.find(p=>p.id===rentId);
      const newStatus=amount>=Number(rent?.amount_due||amount)?'Paid':'Partial';
      const {error}=await supabase.from('rent_payments').update({
        amount_paid:amount,paid_date:payDate,payment_method:method,
        status:newStatus,notes:notes||null
      }).eq('id',rentId);
      if(error) throw error;
      showToast(`Rs. ${fmt(amount)} recorded for ${rent?.shop?.shop_name} — ${newStatus}`,'success');
      safeHideModal('recordPaymentModal');
      $('recordPaymentForm').reset(); setDefaultDates();
      await loadRentPayments(); await loadSummary();
    } catch(e){showToast('Error: '+e.message,'error');}
    finally{if(btn){btn.disabled=false;btn.innerHTML='<i class="bi bi-check-circle me-1"></i>Record Payment';}}
  };

  window.deleteRent = async function(rentId) {
    const p=state.rentPayments.find(x=>x.id===rentId);
    if(!confirm(`Delete rent entry for "${p?.shop?.shop_name}"?`)) return;
    try {
      const {error}=await supabase.from('rent_payments').delete().eq('id',rentId);
      if(error) throw error;
      state.selectedIds.delete(rentId);
      showToast('Deleted!','success');
      await loadRentPayments(); await loadSummary();
    } catch(e){showToast('Error: '+e.message,'error');}
  };

  // ── PAGINATION ────────────────────────────────────────────
  function renderPagination(cId,totalPages,currentPage,onPage) {
    const el=$(cId); if(!el) return;
    if(totalPages<=1){el.innerHTML='';return;}
    const fn=onPage.toString();
    let html=`<nav><ul class="pagination pagination-sm mb-0 justify-content-end">`;
    html+=`<li class="page-item ${currentPage===1?'disabled':''}">
      <button class="page-link" onclick="(${fn})(${currentPage-1})">‹</button></li>`;
    for(let i=1;i<=totalPages;i++){
      html+=`<li class="page-item ${i===currentPage?'active':''}">
        <button class="page-link" onclick="(${fn})(${i})">${i}</button></li>`;
    }
    html+=`<li class="page-item ${currentPage===totalPages?'disabled':''}">
      <button class="page-link" onclick="(${fn})(${currentPage+1})">›</button></li>`;
    html+=`</ul></nav>`;
    el.innerHTML=html;
  }

  // ── HISTORY ───────────────────────────────────────────────
  window.viewRentHistory = async function() {
    const hb=$('history-body');
    if(hb) hb.innerHTML='<div class="text-center py-4"><div class="spinner-border"></div></div>';
    safeShowModal('historyModal');
    try {
      const {data,error}=await supabase.from('rent_payments')
        .select('*, shop:shops(shop_name,tenant_name)')
        .eq('rent_year',state.selectedYear).order('rent_month').order('shop_id');
      if(error) throw error;
      if(!data?.length){if(hb) hb.innerHTML=`<div class="alert alert-info">No history for ${state.selectedYear}</div>`;return;}
      const byMonth={};
      data.forEach(p=>{if(!byMonth[p.rent_month]) byMonth[p.rent_month]=[];byMonth[p.rent_month].push(p);});
      let html='';
      for(let m=1;m<=12;m++){
        const entries=byMonth[m]; if(!entries) continue;
        const due=entries.reduce((s,p)=>s+Number(p.amount_due),0);
        const paid=entries.filter(p=>p.status==='Paid').reduce((s,p)=>s+Number(p.amount_paid||0),0);
        html+=`<div class="mb-3">
          <div class="d-flex justify-content-between bg-light px-3 py-2 rounded-top border">
            <strong>${monthName(m)} ${state.selectedYear}</strong>
            <span class="small">Due: Rs.${fmt(due)} | Paid: <span class="text-success">Rs.${fmt(paid)}</span> | Remaining: <span class="text-danger">Rs.${fmt(due-paid)}</span></span>
          </div>
          <table class="table table-sm table-bordered mb-0">
            <thead class="table-secondary"><tr><th>Shop</th><th>Tenant</th><th>Amount</th><th>Status</th><th>Paid Date</th><th>Method</th></tr></thead>
            <tbody>${entries.map(p=>`<tr class="${p.status==='Paid'?'table-success':p.status==='Overdue'?'table-danger':''}">
              <td><b>${escHtml(p.shop?.shop_name)}</b></td><td>${escHtml(p.shop?.tenant_name)}</td>
              <td>Rs. ${fmt(p.amount_due)}</td>
              <td><span class="badge ${p.status==='Paid'?'bg-success':p.status==='Overdue'?'bg-danger':'bg-warning text-dark'}">${p.status}</span></td>
              <td>${fmtDate(p.paid_date)}</td><td>${p.payment_method||'-'}</td>
            </tr>`).join('')}</tbody>
          </table></div>`;
      }
      if(hb) hb.innerHTML=html;
    } catch(e){if(hb) hb.innerHTML=`<div class="alert alert-danger">Error: ${e.message}</div>`;}
  };

  // ── SETUP ─────────────────────────────────────────────────
  function setupMonthYearFilter() {
    const mSel=$('month-filter'),ySel=$('year-filter');
    if(!mSel||!ySel) return;
    ySel.innerHTML='';
    const now=new Date();
    for(let y=now.getFullYear()+1;y>=2020;y--){
      const o=document.createElement('option');
      o.value=y;o.textContent=y;
      if(y===now.getFullYear()) o.selected=true;
      ySel.appendChild(o);
    }
    mSel.value=state.selectedMonth;
    mSel.addEventListener('change',()=>{state.selectedMonth=parseInt(mSel.value);loadRentPayments();loadSummary();});
    ySel.addEventListener('change',()=>{state.selectedYear=parseInt(ySel.value);loadRentPayments();loadSummary();});
  }

  function setupSearch() {
    const ss=$('shop-search'),ps=$('pay-search'),sf=$('status-filter');
    if(ss) ss.addEventListener('input',()=>{state.searchShop=ss.value;state.shopPage=1;renderShops();});
    if(ps) ps.addEventListener('input',()=>{state.searchPay=ps.value;applyPaymentFilters();});
    if(sf) sf.addEventListener('change',()=>{state.filterStatus=sf.value;applyPaymentFilters();});
  }

  function setDefaultDates() {
    const today=new Date().toISOString().split('T')[0];
    if($('payment-date'))    $('payment-date').value=today;
    if($('agreement-start')) $('agreement-start').value=today;
  }

  // ── INIT ──────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', async()=>{
    if(document.body.getAttribute('data-page')!=='rent') return;
    setDefaultDates();
    setupMonthYearFilter();
    setupSearch();
    const pm=$('recordPaymentModal');
    if(pm) pm.addEventListener('show.bs.modal',refreshUnpaidDropdown);
    await loadShops();
    await loadRentPayments();
    await loadSummary();
    console.log('✅ Rent management initialized');
  });

})();