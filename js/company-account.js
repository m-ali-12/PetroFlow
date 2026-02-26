// // ============================================================
// // company-account.js  — Account No. 9 (Go Company cc) Controller
// // Khalid & Sons Petroleum
// // ============================================================
// // Handles:
// //   ✅ Stock Purchase (credit from company)
// //   ✅ Member Card Usage (deduct from company credit)
// //   ✅ ATM/Bank Charges
// //   ✅ Manual Repayments (Check / Online / Cash)
// //   ✅ Dual-Role Expense Accounts (e.g. Account No.3)
// //   ✅ Summary Dashboard Data
// // ============================================================

// (function () {
//   'use strict';

//   // Guard — only run on company-account page
//   if (document.body.getAttribute('data-page') !== 'company-account') return;

//   const supabase = window.supabaseClient;

//   // ── Helpers ────────────────────────────────────────────────
//   function el(id) { return document.getElementById(id); }
//   function fmt(n) {
//     return Number(n || 0).toLocaleString('en-PK', {
//       minimumFractionDigits: 2, maximumFractionDigits: 2
//     });
//   }

//   function showToast(type, title, msg) {
//     const t = el('liveToast');
//     if (!t) { alert(title + ': ' + msg); return; }
//     el('toast-title').textContent   = title;
//     el('toast-message').textContent = msg;
//     t.className = 'toast ' + (
//       type === 'success' ? 'bg-success text-white' :
//       type === 'warning' ? 'bg-warning text-dark'  :
//                            'bg-danger text-white'
//     );
//     new bootstrap.Toast(t, { delay: 4000 }).show();
//   }

//   async function getCurrentUserId() {
//     return (await supabase.auth.getUser()).data?.user?.id;
//   }


//   // ─────────────────────────────────────────────────────────
//   // CORE FORMULA
//   // Net_Payable = initial_credit + total_stock + total_charges - total_repaid ± adjustments
//   // ─────────────────────────────────────────────────────────


//   // ============================================================
//   // 1. LOAD SUMMARY DASHBOARD
//   // ============================================================
//   window.loadCompanySummary = async function () {
//     try {
//       const { data, error } = await supabase
//         .from('v_company_account_summary')
//         .select('*')
//         .maybeSingle();

//       if (error) throw error;
//       if (!data) {
//         showToast('warning', 'No Data', 'Company account (sr_no=9) not found.');
//         return;
//       }

//       // Populate summary cards
//       _setText('sum-company-name',        data.company_name || 'Go Company cc');
//       _setText('sum-initial-credit',      'Rs. ' + fmt(data.initial_credit));
//       _setText('sum-credit-limit',        'Rs. ' + fmt(data.credit_limit));
//       _setText('sum-stock-purchased',     'Rs. ' + fmt(data.total_stock_purchased));
//       _setText('sum-member-usage',        'Rs. ' + fmt(data.total_member_usage));
//       _setText('sum-total-charges',       'Rs. ' + fmt(data.total_charges));
//       _setText('sum-total-repaid',        'Rs. ' + fmt(data.total_repaid));
//       _setText('sum-net-payable',         'Rs. ' + fmt(data.net_payable_to_company));
//       _setText('sum-linked-expenses',     'Rs. ' + fmt(data.total_linked_expenses));
//       _setText('sum-grand-expenses',      'Rs. ' + fmt(data.grand_total_expenses));
//       _setText('sum-remaining-credit',    'Rs. ' + fmt(data.remaining_credit_limit));

//       // Color coding — net payable
//       const npEl = el('sum-net-payable');
//       if (npEl) {
//         npEl.style.color = data.net_payable_to_company > 0 ? '#dc3545' : '#198754';
//       }

//       // Progress bar — credit utilisation
//       const usedPct = Math.min(100, Math.round(
//         ((data.total_stock_purchased + data.total_charges - data.total_repaid) /
//           (data.credit_limit || 1)) * 100
//       ));
//       const bar = el('credit-usage-bar');
//       if (bar) {
//         bar.style.width = usedPct + '%';
//         bar.className = 'progress-bar ' + (
//           usedPct > 80 ? 'bg-danger' :
//           usedPct > 50 ? 'bg-warning' :
//                          'bg-success'
//         );
//         bar.textContent = usedPct + '% used';
//       }

//     } catch (e) {
//       console.error('loadCompanySummary:', e);
//       showToast('danger', 'Error', 'Summary load failed: ' + e.message);
//     }
//   };

//   function _setText(id, text) {
//     const e = el(id); if (e) e.textContent = text;
//   }


//   // ============================================================
//   // 2. LOAD TRANSACTION HISTORY
//   // ============================================================
//   window.loadCompanyTransactions = async function (filters = {}) {
//     const tbody = el('company-txn-table');
//     if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="text-center py-3 text-muted"><div class="spinner-border spinner-border-sm me-2"></div>Loading...</td></tr>';

//     try {
//       let query = supabase
//         .from('company_transactions')
//         .select('*, members:member_id(name,sr_no), company:company_id(name,sr_no)')
//         .order('txn_date', { ascending: false })
//         .order('created_at', { ascending: false });

//       if (filters.dateFrom) query = query.gte('txn_date', filters.dateFrom);
//       if (filters.dateTo)   query = query.lte('txn_date', filters.dateTo);
//       if (filters.type)     query = query.eq('txn_type', filters.type);

//       const { data, error } = await query;
//       if (error) throw error;

//       const txns = data || [];
//       _renderCompanyTxnTable(txns);
//       _updateCompanyTxnTotals(txns);

//     } catch (e) {
//       console.error('loadCompanyTransactions:', e);
//       if (tbody) tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-3">Error: ${e.message}</td></tr>`;
//     }
//   };

//   function _renderCompanyTxnTable(txns) {
//     const tbody = el('company-txn-table'); if (!tbody) return;
//     if (!txns.length) {
//       tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-muted"><i class="bi bi-inbox fs-3 d-block mb-2"></i>Koi transaction nahi</td></tr>';
//       return;
//     }

//     const typeConfig = {
//       stock_purchase:    { label: '📦 Stock Purchase',  bg: '#d4edda', color: '#155724' },
//       member_usage:      { label: '💳 Member Card',      bg: '#cce5ff', color: '#004085' },
//       atm_charge:        { label: '🏦 ATM Charge',       bg: '#fff3cd', color: '#856404' },
//       misc_charge:       { label: '📋 Misc Charge',      bg: '#fff3cd', color: '#856404' },
//       repayment_check:   { label: '✅ Repay (Check)',    bg: '#d1ecf1', color: '#0c5460' },
//       repayment_online:  { label: '✅ Repay (Online)',   bg: '#d1ecf1', color: '#0c5460' },
//       adjustment:        { label: '⚙️ Adjustment',       bg: '#e2e3e5', color: '#383d41' },
//     };

//     tbody.innerHTML = txns.map((t, i) => {
//       const cfg   = typeConfig[t.txn_type] || { label: t.txn_type, bg: '#f8f9fa', color: '#333' };
//       const isOut = t.direction === 'out';
//       const badge = `<span style="display:inline-block;padding:2px 9px;border-radius:4px;font-size:11px;font-weight:700;background:${cfg.bg};color:${cfg.color};">${cfg.label}</span>`;
//       const amtColor = isOut ? '#dc3545' : '#198754';
//       const amtSign  = isOut ? '−' : '+';
//       const netAmt   = Math.abs(parseFloat(t.net_amount) || parseFloat(t.amount) || 0);

//       return `<tr>
//         <td style="padding:10px 12px;color:#888;font-size:12px;">${i + 1}</td>
//         <td style="padding:10px 12px;font-size:12px;">${new Date(t.txn_date).toLocaleDateString('en-PK')}</td>
//         <td style="padding:10px 12px;">${badge}</td>
//         <td style="padding:10px 12px;font-weight:700;color:${amtColor};font-size:14px;">${amtSign} Rs.${fmt(t.amount)}</td>
//         <td style="padding:10px 12px;color:#6c757d;font-size:12px;">${t.charges > 0 ? 'Rs.' + fmt(t.charges) : '-'}</td>
//         <td style="padding:10px 12px;font-weight:800;color:${amtColor};font-size:14px;">${amtSign} Rs.${fmt(netAmt)}</td>
//         <td style="padding:10px 12px;font-size:12px;">${t.members ? '#' + t.members.sr_no + ' ' + t.members.name : '-'}</td>
//         <td style="padding:10px 12px;font-size:12px;color:#555;">${t.description || t.notes || '-'}</td>
//         <td style="padding:10px 12px;text-align:center;">
//           <button onclick="window.deleteCompanyTxn(${t.id})" style="background:none;border:1px solid #dc3545;color:#dc3545;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:11px;" title="Delete">
//             <i class="bi bi-trash"></i>
//           </button>
//         </td>
//       </tr>`;
//     }).join('');
//   }

//   function _updateCompanyTxnTotals(txns) {
//     let totalIn = 0, totalOut = 0;
//     txns.forEach(t => {
//       const net = Math.abs(parseFloat(t.net_amount) || parseFloat(t.amount) || 0);
//       if (t.direction === 'in') totalIn += net;
//       else totalOut += net;
//     });
//     _setText('ctxn-total-in',  'Rs. ' + fmt(totalIn));
//     _setText('cxtn-total-out', 'Rs. ' + fmt(totalOut));
//     _setText('cxtn-net',       'Rs. ' + fmt(totalOut - totalIn));
//   }


//   // ============================================================
//   // 3. STOCK PURCHASE HANDLER
//   //    When Go Company delivers Petrol/Diesel/Mobil on credit
//   // ============================================================
//   window.handleStockPurchase = async function () {
//     const fuelType   = el('sp-fuel-type')?.value;
//     const liters     = parseFloat(el('sp-liters')?.value) || 0;
//     const unitPrice  = parseFloat(el('sp-unit-price')?.value) || 0;
//     const charges    = parseFloat(el('sp-charges')?.value) || 0;
//     const invoiceNo  = el('sp-invoice-no')?.value || '';
//     const truckNo    = el('sp-truck-no')?.value || '';
//     const purchDate  = el('sp-date')?.value || new Date().toISOString().split('T')[0];
//     const notes      = el('sp-notes')?.value || '';

//     if (!fuelType)    { alert('Fuel type select karein');       return; }
//     if (liters <= 0)  { alert('Liters enter karein');           return; }
//     if (unitPrice <= 0) { alert('Unit price enter karein');     return; }

//     const totalAmount = liters * unitPrice;
//     const netPayable  = totalAmount + charges;

//     try {
//       const userId    = await getCurrentUserId();
//       const companyId = await _getCompanyId(userId);

//       // 1. Insert into company_transactions
//       const { data: ctxn, error: ctxnErr } = await supabase
//         .from('company_transactions')
//         .insert([{
//           user_id:     userId,
//           company_id:  companyId,
//           txn_type:    'stock_purchase',
//           direction:   'out',              // we owe more
//           amount:      totalAmount,
//           charges:     charges,
//           fuel_type:   fuelType,
//           liters:      liters,
//           unit_price:  unitPrice,
//           txn_date:    purchDate,
//           description: `${fuelType} stock purchase — ${liters}L @ Rs.${unitPrice}`,
//           notes:       notes
//         }])
//         .select()
//         .single();

//       if (ctxnErr) throw ctxnErr;

//       // 2. Insert into stock_purchases for inventory
//       const { error: spErr } = await supabase
//         .from('stock_purchases')
//         .insert([{
//           user_id:       userId,
//           company_id:    companyId,
//           company_txn_id: ctxn.id,
//           fuel_type:     fuelType,
//           liters:        liters,
//           unit_price:    unitPrice,
//           charges:       charges,
//           invoice_no:    invoiceNo,
//           truck_no:      truckNo,
//           purchase_date: purchDate,
//           notes:         notes
//         }]);

//       if (spErr) throw spErr;

//       // 3. Also record in stock_entries for tank management
//       const { error: seErr } = await supabase
//         .from('stock_entries')
//         .insert([{
//           fuel_type:      fuelType === 'Mobil Oil' ? 'Mobil' : fuelType,
//           liters:         liters,
//           price_per_liter: unitPrice,
//           total_amount:   totalAmount,
//           supplier_name:  'Go Company cc',
//           invoice_number: invoiceNo,
//           truck_number:   truckNo,
//           notes:          notes
//         }]);

//       if (seErr) console.warn('stock_entries insert warning:', seErr.message);

//       showToast('success', 'Stock Purchase!', `${fuelType} ${fmt(liters)}L — Rs.${fmt(netPayable)} recorded ✓`);
//       _closeModal('stockPurchaseModal');
//       await window.loadCompanySummary();
//       await window.loadCompanyTransactions();

//     } catch (e) {
//       console.error('handleStockPurchase:', e);
//       alert('Error: ' + e.message);
//     }
//   };


//   // ============================================================
//   // 4. MEMBER CARD USAGE HANDLER
//   //    Member uses company card → deduct from company credit
//   // ============================================================
//   window.handleMemberCardUsage = async function () {
//     const memberId  = parseInt(el('mcu-member-id')?.value) || 0;
//     const fuelType  = el('mcu-fuel-type')?.value;
//     const liters    = parseFloat(el('mcu-liters')?.value) || 0;
//     const unitPrice = parseFloat(el('mcu-unit-price')?.value) || 0;
//     const atmCharge = parseFloat(el('mcu-atm-charges')?.value) || 0;
//     const miscCharge= parseFloat(el('mcu-misc-charges')?.value) || 0;
//     const usageDate = el('mcu-date')?.value || new Date().toISOString().split('T')[0];
//     const notes     = el('mcu-notes')?.value || '';

//     if (!memberId)   { alert('Member select karein');          return; }
//     if (!fuelType)   { alert('Fuel type select karein');       return; }
//     if (liters <= 0) { alert('Liters enter karein');           return; }
//     if (unitPrice <= 0) { alert('Unit price enter karein');    return; }

//     const stockValue = liters * unitPrice;
//     const totalCharges = atmCharge + miscCharge;
//     const grandTotal = stockValue + totalCharges;

//     try {
//       const userId    = await getCurrentUserId();
//       const companyId = await _getCompanyId(userId);
//       const memberName= el('mcu-member-name')?.textContent || '';

//       // 1. company_transactions — member_usage type
//       const { data: ctxn, error: ctxnErr } = await supabase
//         .from('company_transactions')
//         .insert([{
//           user_id:     userId,
//           company_id:  companyId,
//           txn_type:    'member_usage',
//           direction:   'out',              // credit consumed
//           amount:      stockValue,
//           charges:     totalCharges,
//           fuel_type:   fuelType,
//           liters:      liters,
//           unit_price:  unitPrice,
//           member_id:   memberId,
//           txn_date:    usageDate,
//           description: `${memberName} card usage — ${fuelType} ${liters}L @ Rs.${unitPrice}`,
//           notes:       notes
//         }])
//         .select()
//         .single();

//       if (ctxnErr) throw ctxnErr;

//       // 2. member_card_usage table
//       const { error: mcuErr } = await supabase
//         .from('member_card_usage')
//         .insert([{
//           user_id:       userId,
//           company_id:    companyId,
//           member_id:     memberId,
//           company_txn_id: ctxn.id,
//           fuel_type:     fuelType,
//           liters:        liters,
//           unit_price:    unitPrice,
//           atm_charges:   atmCharge,
//           misc_charges:  miscCharge,
//           usage_date:    usageDate,
//           description:   `Card usage — ${fuelType} ${liters}L`,
//           notes:         notes
//         }]);

//       if (mcuErr) throw mcuErr;

//       // 3. If ATM charges present — log separately too
//       if (totalCharges > 0) {
//         await supabase.from('company_transactions').insert([{
//           user_id:    userId,
//           company_id: companyId,
//           txn_type:   'atm_charge',
//           direction:  'out',
//           amount:     totalCharges,
//           charges:    0,
//           txn_date:   usageDate,
//           member_id:  memberId,
//           description: `ATM/misc charges on ${memberName} usage`
//         }]);
//       }

//       showToast('success', 'Usage Recorded!', `${memberName} — Rs.${fmt(grandTotal)} deducted from company credit ✓`);
//       _closeModal('memberCardModal');
//       await window.loadCompanySummary();
//       await window.loadCompanyTransactions();

//     } catch (e) {
//       console.error('handleMemberCardUsage:', e);
//       alert('Error: ' + e.message);
//     }
//   };


//   // ============================================================
//   // 5. REPAYMENT HANDLER
//   //    Manual payment back to Go Company cc (check / online)
//   // ============================================================
//   window.handleRepayment = async function () {
//     const amount      = parseFloat(el('rp-amount')?.value) || 0;
//     const payMode     = el('rp-payment-mode')?.value;
//     const refNo       = el('rp-reference-no')?.value || '';
//     const payDate     = el('rp-date')?.value || new Date().toISOString().split('T')[0];
//     const notes       = el('rp-notes')?.value || '';

//     if (amount <= 0) { alert('Amount enter karein');        return; }
//     if (!payMode)    { alert('Payment method select karein'); return; }

//     const txnType = payMode === 'check' ? 'repayment_check' : 'repayment_online';

//     try {
//       const userId    = await getCurrentUserId();
//       const companyId = await _getCompanyId(userId);

//       // 1. company_transactions — repayment
//       const { data: ctxn, error: ctxnErr } = await supabase
//         .from('company_transactions')
//         .insert([{
//           user_id:      userId,
//           company_id:   companyId,
//           txn_type:     txnType,
//           direction:    'in',              // we're paying back → credit owed decreases
//           amount:       amount,
//           charges:      0,
//           payment_mode: payMode,
//           reference_no: refNo,
//           txn_date:     payDate,
//           description:  `Repayment via ${payMode}${refNo ? ' — Ref: ' + refNo : ''}`,
//           notes:        notes
//         }])
//         .select()
//         .single();

//       if (ctxnErr) throw ctxnErr;

//       // 2. company_repayments table
//       const { error: rpErr } = await supabase
//         .from('company_repayments')
//         .insert([{
//           user_id:       userId,
//           company_id:    companyId,
//           company_txn_id: ctxn.id,
//           amount:        amount,
//           payment_mode:  payMode,
//           reference_no:  refNo,
//           payment_date:  payDate,
//           notes:         notes
//         }]);

//       if (rpErr) throw rpErr;

//       showToast('success', 'Repayment Recorded!', `Rs.${fmt(amount)} via ${payMode} — Company credit updated ✓`);
//       _closeModal('repaymentModal');
//       await window.loadCompanySummary();
//       await window.loadCompanyTransactions();

//     } catch (e) {
//       console.error('handleRepayment:', e);
//       alert('Error: ' + e.message);
//     }
//   };


//   // ============================================================
//   // 6. EXPENSE WITH DUAL-ROLE ACCOUNT HANDLER
//   //    When expense is sent to Account No.3 (or similar)
//   //    → records in transactions AS Expense
//   //    → ALSO updates that account's ledger
//   // ============================================================
//   window.handleDualRoleExpense = async function () {
//     const accountId  = parseInt(el('dre-account-id')?.value) || 0;
//     const amount     = parseFloat(el('dre-amount')?.value) || 0;
//     const expType    = el('dre-expense-type')?.value;
//     const description= el('dre-description')?.value;
//     const paidFrom   = el('dre-paid-from')?.value;
//     const expDate    = el('dre-date')?.value || new Date().toISOString().split('T')[0];

//     if (!accountId)   { alert('Account select karein');     return; }
//     if (amount <= 0)  { alert('Amount enter karein');       return; }
//     if (!expType)     { alert('Category select karein');    return; }
//     if (!description) { alert('Description enter karein'); return; }
//     if (!paidFrom)    { alert('Paid from select karein');  return; }

//     try {
//       const userId = await getCurrentUserId();

//       // 1. Record in transactions as Expense type
//       const { error: txErr } = await supabase
//         .from('transactions')
//         .insert([{
//           user_id:          userId,
//           customer_id:      accountId,       // dual-role account (e.g. Account No.3)
//           transaction_type: 'Expense',
//           amount:           amount,
//           expense_type:     expType,
//           expense_account:  paidFrom,
//           description:      `${expType}: ${description}`,
//           created_at:       expDate + 'T00:00:00+05:00'
//         }]);

//       if (txErr) throw txErr;

//       // 2. ALSO record in that account's ledger as a Credit (money sent to them)
//       const { error: ledgerErr } = await supabase
//         .from('transactions')
//         .insert([{
//           user_id:          userId,
//           customer_id:      accountId,
//           transaction_type: 'Credit',
//           amount:           amount,
//           description:      `Expense payment: ${expType} — ${description}`,
//           created_at:       expDate + 'T00:00:00+05:00'
//         }]);

//       // Ledger entry failing is non-fatal — warn only
//       if (ledgerErr) console.warn('Ledger entry warning:', ledgerErr.message);

//       // 3. Update the account's balance
//       const { data: acctData } = await supabase
//         .from('customers')
//         .select('balance')
//         .eq('id', accountId)
//         .single();

//       const newBalance = (parseFloat(acctData?.balance) || 0) + amount;
//       await supabase.from('customers').update({ balance: newBalance }).eq('id', accountId);

//       showToast('success', 'Expense Recorded!', `Rs.${fmt(amount)} — ${expType} — both expense & ledger updated ✓`);
//       _closeModal('dualExpenseModal');

//     } catch (e) {
//       console.error('handleDualRoleExpense:', e);
//       alert('Error: ' + e.message);
//     }
//   };


//   // ============================================================
//   // 7. DELETE COMPANY TRANSACTION
//   // ============================================================
//   window.deleteCompanyTxn = async function (id) {
//     if (!confirm('Is transaction ko delete karein?')) return;
//     try {
//       const { error } = await supabase.from('company_transactions').delete().eq('id', id);
//       if (error) throw error;
//       showToast('success', 'Deleted', 'Transaction delete ho gaya!');
//       await window.loadCompanyTransactions();
//       await window.loadCompanySummary();
//     } catch (e) {
//       alert('Error: ' + e.message);
//     }
//   };


//   // ============================================================
//   // 8. CALCULATOR HELPERS (for UI)
//   // ============================================================
//   window.calcStockTotal = function () {
//     const l = parseFloat(el('sp-liters')?.value) || 0;
//     const p = parseFloat(el('sp-unit-price')?.value) || 0;
//     const c = parseFloat(el('sp-charges')?.value) || 0;
//     const total = (l * p) + c;
//     _setText('sp-total-display', total > 0 ? 'Total: Rs. ' + fmt(total) : '');
//   };

//   window.calcMcuTotal = function () {
//     const l  = parseFloat(el('mcu-liters')?.value) || 0;
//     const p  = parseFloat(el('mcu-unit-price')?.value) || 0;
//     const atm= parseFloat(el('mcu-atm-charges')?.value) || 0;
//     const msc= parseFloat(el('mcu-misc-charges')?.value) || 0;
//     const total = (l * p) + atm + msc;
//     _setText('mcu-total-display', total > 0 ? 'Grand Total: Rs. ' + fmt(total) : '');
//   };

//   window.setMcuFuelPrice = function () {
//     const fuel = el('mcu-fuel-type')?.value;
//     if (!fuel) return;
//     const price = window.fuelPrices?.[fuel] || 0;
//     if (el('mcu-unit-price')) el('mcu-unit-price').value = price;
//     window.calcMcuTotal();
//   };

//   window.setSpFuelPrice = function () {
//     const fuel = el('sp-fuel-type')?.value;
//     if (!fuel) return;
//     const price = window.fuelPrices?.[fuel] || 0;
//     if (el('sp-unit-price')) el('sp-unit-price').value = price;
//     window.calcStockTotal();
//   };


//   // ============================================================
//   // 9. LOAD MEMBERS DROPDOWN
//   // ============================================================
//   window.loadCompanyMembers = async function () {
//     try {
//       const userId = await getCurrentUserId();
//       const { data, error } = await supabase
//         .from('customers')
//         .select('id, sr_no, name, balance')
//         .eq('user_id', userId)
//         .neq('account_type', 'company')
//         .order('sr_no');

//       if (error) throw error;

//       const members = data || [];
//       const sel = el('mcu-member-id');
//       if (sel) {
//         sel.innerHTML = '<option value="">-- Member Select Karein --</option>' +
//           members.map(m => `<option value="${m.id}">#${m.sr_no} — ${m.name}</option>`).join('');
//       }

//       // Also populate dual-role expense account dropdown
//       const dualSel = el('dre-account-id');
//       if (dualSel) {
//         const dualAccounts = members.filter(m => true); // show all — mark dual ones
//         dualSel.innerHTML = '<option value="">-- Account Select Karein --</option>' +
//           dualAccounts.map(m => `<option value="${m.id}">#${m.sr_no} — ${m.name}</option>`).join('');
//       }

//     } catch (e) {
//       console.error('loadCompanyMembers:', e);
//     }
//   };


//   // ============================================================
//   // 10. LOAD STOCK HISTORY (per fuel)
//   // ============================================================
//   window.loadStockHistory = async function () {
//     try {
//       const { data, error } = await supabase
//         .from('v_stock_by_fuel')
//         .select('*');

//       if (error) throw error;
//       const stocks = data || [];

//       const container = el('stock-breakdown-table');
//       if (!container) return;

//       if (!stocks.length) {
//         container.innerHTML = '<tr><td colspan="7" class="text-center py-3 text-muted">Koi stock nahi</td></tr>';
//         return;
//       }

//       let grandTotal = 0;
//       container.innerHTML = stocks.map(s => {
//         grandTotal += parseFloat(s.total_net_payable) || 0;
//         return `<tr>
//           <td style="padding:10px 12px;font-weight:700;">${s.fuel_type}</td>
//           <td style="padding:10px 12px;">${s.purchase_count}</td>
//           <td style="padding:10px 12px;">${fmt(s.total_liters)} L</td>
//           <td style="padding:10px 12px;">Rs. ${fmt(s.avg_unit_price)}</td>
//           <td style="padding:10px 12px;">Rs. ${fmt(s.total_value)}</td>
//           <td style="padding:10px 12px;color:#dc3545;">Rs. ${fmt(s.total_charges)}</td>
//           <td style="padding:10px 12px;font-weight:800;color:#dc3545;">Rs. ${fmt(s.total_net_payable)}</td>
//         </tr>`;
//       }).join('') +
//       `<tr style="background:#f8f9fa;font-weight:800;">
//         <td colspan="6" style="padding:10px 12px;text-align:right;">GRAND TOTAL:</td>
//         <td style="padding:10px 12px;color:#dc3545;font-size:16px;">Rs. ${fmt(grandTotal)}</td>
//       </tr>`;

//     } catch (e) {
//       console.error('loadStockHistory:', e);
//     }
//   };


//   // ============================================================
//   // 11. REPAYMENT HISTORY
//   // ============================================================
//   window.loadRepaymentHistory = async function () {
//     try {
//       const { data, error } = await supabase
//         .from('company_repayments')
//         .select('*')
//         .order('payment_date', { ascending: false });

//       if (error) throw error;
//       const repayments = data || [];

//       const container = el('repayment-history-table');
//       if (!container) return;

//       let totalRepaid = 0;
//       container.innerHTML = repayments.map((r, i) => {
//         const amt = parseFloat(r.amount) || 0;
//         totalRepaid += amt;
//         return `<tr>
//           <td style="padding:10px 12px;color:#888;">${i + 1}</td>
//           <td style="padding:10px 12px;">${new Date(r.payment_date).toLocaleDateString('en-PK')}</td>
//           <td style="padding:10px 12px;font-weight:700;color:#198754;font-size:15px;">Rs. ${fmt(amt)}</td>
//           <td style="padding:10px 12px;">
//             <span style="padding:2px 9px;border-radius:4px;font-size:11px;font-weight:700;
//               background:${r.payment_mode === 'check' ? '#d4edda' : '#cce5ff'};
//               color:${r.payment_mode === 'check' ? '#155724' : '#004085'};">
//               ${r.payment_mode === 'check' ? '🏷️ Check' : r.payment_mode === 'online' ? '🌐 Online' : r.payment_mode}
//             </span>
//           </td>
//           <td style="padding:10px 12px;font-size:12px;color:#555;">${r.reference_no || '-'}</td>
//           <td style="padding:10px 12px;font-size:12px;">${r.notes || '-'}</td>
//           <td style="padding:10px 12px;">
//             <span style="padding:2px 9px;border-radius:4px;font-size:11px;font-weight:700;
//               background:${r.verified ? '#d4edda' : '#fff3cd'};
//               color:${r.verified ? '#155724' : '#856404'};">
//               ${r.verified ? '✅ Verified' : '⏳ Pending'}
//             </span>
//           </td>
//         </tr>`;
//       }).join('');

//       _setText('repayment-total', 'Rs. ' + fmt(totalRepaid));

//     } catch (e) {
//       console.error('loadRepaymentHistory:', e);
//     }
//   };


//   // ============================================================
//   // PRIVATE HELPERS
//   // ============================================================
//   async function _getCompanyId(userId) {
//     const { data, error } = await supabase
//       .from('customers')
//       .select('id')
//       .eq('account_type', 'company')
//       .maybeSingle();

//     if (error || !data) {
//       throw new Error('Company account (Account No.9) not found in customers table. Run the SQL migration first.');
//     }
//     return data.id;
//   }

//   function _closeModal(id) {
//     const m = el(id);
//     if (m) (bootstrap.Modal.getInstance(m) || new bootstrap.Modal(m)).hide();
//     const f = m?.querySelector('form'); if (f) f.reset();
//   }


//   // ============================================================
//   // EVENT SETUP
//   // ============================================================
//   function setupEvents() {
//     el('stockPurchaseForm')?.addEventListener('submit', e => { e.preventDefault(); window.handleStockPurchase(); });
//     el('memberCardForm')   ?.addEventListener('submit', e => { e.preventDefault(); window.handleMemberCardUsage(); });
//     el('repaymentForm')    ?.addEventListener('submit', e => { e.preventDefault(); window.handleRepayment(); });
//     el('dualExpenseForm')  ?.addEventListener('submit', e => { e.preventDefault(); window.handleDualRoleExpense(); });

//     // Calculator hooks
//     el('sp-liters')      ?.addEventListener('input', window.calcStockTotal);
//     el('sp-unit-price')  ?.addEventListener('input', window.calcStockTotal);
//     el('sp-charges')     ?.addEventListener('input', window.calcStockTotal);
//     el('sp-fuel-type')   ?.addEventListener('change', window.setSpFuelPrice);

//     el('mcu-liters')     ?.addEventListener('input', window.calcMcuTotal);
//     el('mcu-unit-price') ?.addEventListener('input', window.calcMcuTotal);
//     el('mcu-atm-charges')?.addEventListener('input', window.calcMcuTotal);
//     el('mcu-misc-charges')?.addEventListener('input', window.calcMcuTotal);
//     el('mcu-fuel-type')  ?.addEventListener('change', window.setMcuFuelPrice);

//     // Filter buttons
//     el('btn-apply-company-filter')?.addEventListener('click', () => {
//       window.loadCompanyTransactions({
//         dateFrom: el('cfilter-date-from')?.value,
//         dateTo:   el('cfilter-date-to')?.value,
//         type:     el('cfilter-type')?.value
//       });
//     });
//     el('btn-clear-company-filter')?.addEventListener('click', () => {
//       ['cfilter-date-from','cfilter-date-to','cfilter-type'].forEach(id => {
//         if (el(id)) el(id).value = '';
//       });
//       window.loadCompanyTransactions();
//     });
//   }


//   // ============================================================
//   // INIT
//   // ============================================================
//   document.addEventListener('DOMContentLoaded', async () => {
//     console.log('Company Account v1 init...');
//     setupEvents();
//     await window.loadCompanyMembers();
//     await window.loadCompanySummary();
//     await window.loadCompanyTransactions();
//     await window.loadStockHistory();
//     await window.loadRepaymentHistory();
//     console.log('Company Account v1 ready.');
//   });

// })();

// ============================================================
// company-account.js  — Account No. 9 (Go Company cc)
// Khalid & Sons Petroleum
// ============================================================
// ✅ All dropdowns load from same customers table as customers page
// ✅ Expense categories load from expense_categories table
// ✅ data-page guard: only runs on company-account page
// ============================================================

(function () {
  'use strict';

  // ── Wait for Supabase + correct page ──────────────────────
  document.addEventListener('DOMContentLoaded', async () => {
    if (document.body.getAttribute('data-page') !== 'company-account') return;

    // Wait for supabaseClient (same pattern as customers-page.js)
    await new Promise(resolve => {
      function check() { if (window.supabaseClient) return resolve(); setTimeout(check, 100); }
      check();
    });

    setupEvents();
    setTodayDates();
    await loadAllDropdowns();   // ← customers + expense categories → all modals
    await loadCompanySummary();
    await loadCompanyTransactions();
    await loadRepaymentHistory();
    console.log('✅ Company Account page ready');
  });

  // ── Helpers ───────────────────────────────────────────────
  const sb  = () => window.supabaseClient;
  const el  = id => document.getElementById(id);
  const fmt = n  => Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function showToast(type, title, msg) {
    const t = el('liveToast'); if (!t) { alert(title + ': ' + msg); return; }
    el('toast-title').textContent   = title;
    el('toast-message').textContent = msg;
    t.className = 'toast ' +
      (type === 'success' ? 'bg-success text-white' :
       type === 'warning' ? 'bg-warning text-dark'  : 'bg-danger text-white');
    new bootstrap.Toast(t, { delay: 4000 }).show();
  }

  function setText(id, v) { const e = el(id); if (e) e.textContent = v; }

  function closeModal(id) {
    const m = el(id); if (!m) return;
    const inst = bootstrap.Modal.getInstance(m);
    if (inst) inst.hide();
    const f = m.querySelector('form'); if (f) f.reset();
  }

  function setTodayDates() {
    const today = new Date().toISOString().split('T')[0];
    ['sp-date', 'mcu-date', 'rp-date', 'dre-date'].forEach(id => {
      if (el(id)) el(id).value = today;
    });
  }

  // Reset dates when any modal opens
  document.querySelectorAll?.('.modal')?.forEach(m => {
    m.addEventListener('show.bs.modal', () => {
      const today = new Date().toISOString().split('T')[0];
      m.querySelectorAll('input[type="date"]').forEach(i => { if (!i.value) i.value = today; });
    });
  });

  async function getCurrentUserId() {
    try {
      const { data } = await sb().auth.getUser();
      return data?.user?.id || null;
    } catch { return null; }
  }

  async function getCompanyId() {
    // Account No. 9 — type 'company' in customers table
    const { data, error } = await sb()
      .from('customers')
      .select('id')
      .eq('account_type', 'company')
      .maybeSingle();
    if (error || !data) throw new Error('Go Company account (Account No.9) nahi mila. Pehle SQL migration run karein.');
    return data.id;
  }


  // ============================================================
  // ✅ LOAD ALL DROPDOWNS FROM customers + expense_categories
  //    Runs once on page init — populates all 3 modals
  // ============================================================
  async function loadAllDropdowns() {
    try {
      // 1. Load customers (same query as customers-page.js)
      const userId = await getCurrentUserId();
      let q = sb().from('customers').select('id, sr_no, name, category, balance').order('sr_no');
      if (userId) q = q.eq('user_id', userId);
      const { data: customers, error: custErr } = await q;
      if (custErr) throw custErr;

      const all = customers || [];

      // ── Member Card Modal: all customers except company itself ──
      const mcuSel = el('mcu-member-id');
      if (mcuSel) {
        mcuSel.innerHTML =
          '<option value="">-- Member Select Karein --</option>' +
          all
            .filter(c => c.category !== 'Owner')   // show all non-owner members
            .map(c => `<option value="${c.id}" data-balance="${c.balance || 0}">#${c.sr_no} — ${c.name}</option>`)
            .join('');

        // Show balance when member selected
        mcuSel.addEventListener('change', function () {
          const opt = this.options[this.selectedIndex];
          const bal = parseFloat(opt?.dataset?.balance) || 0;
          const balEl = el('mcu-member-balance');
          if (balEl) {
            if (bal > 0)       balEl.textContent = `⚠️ Baqi: Rs.${fmt(bal)} (Udhaar)`;
            else if (bal < 0)  balEl.textContent = `✅ Advance: Rs.${fmt(Math.abs(bal))}`;
            else               balEl.textContent = `✅ Baqi: Zero`;
            balEl.className = bal > 0 ? 'text-danger fw-bold' : 'text-success fw-bold';
            balEl.style.fontSize = '11px';
          }
        });
      }

      // ── Expense Entry Modal: Account (Dual Role) dropdown ──
      // Shows ALL customers — same list as customers page
      const dreSel = el('dre-account-id');
      if (dreSel) {
        dreSel.innerHTML =
          '<option value="">-- Account Select Karein --</option>' +
          all.map(c => {
            const dual = c.category === 'expense_dual' || c.is_expense_also ? ' ⟷ Dual' : '';
            return `<option value="${c.id}">#${c.sr_no} — ${c.name}${dual}</option>`;
          }).join('');
      }

      // ── Expense Entry Modal: Paid From dropdown ──
      // Shows all customers (Bank Alflah, Bank ABL, Cash, etc.)
      const paidSel = el('dre-paid-from');
      if (paidSel) {
        paidSel.innerHTML =
          '<option value="">-- Source --</option>' +
          '<option value="Cash">💵 Cash</option>' +
          all.map(c => `<option value="${c.name}">#${c.sr_no} — ${c.name}</option>`).join('');
      }

      console.log(`✅ Dropdowns loaded: ${all.length} customers`);

    } catch (e) {
      console.error('loadAllDropdowns error:', e);
      showToast('warning', 'Dropdown', 'Customer list load nahi hui: ' + e.message);
    }

    // 2. Load expense categories (same as transactions page)
    try {
      let cats = [];
      const { data: catData } = await sb().from('expense_categories').select('name, icon').order('name');
      if (catData && catData.length) {
        cats = catData;
      } else {
        // Fallback defaults (same as transactions-COMPLETE-v5.js)
        cats = [
          { name: 'Bijli Bill',          icon: '⚡' },
          { name: 'Gas Bill',            icon: '🔥' },
          { name: 'Paani Bill',          icon: '💧' },
          { name: 'Kiraaya',             icon: '🏠' },
          { name: 'Petrol/Diesel Stock', icon: '⛽' },
          { name: 'Mazdoor Tankhwah',    icon: '👷' },
          { name: 'Machine Repair',      icon: '🔧' },
          { name: 'Khaana/Chai',         icon: '☕' },
          { name: 'Transport',           icon: '🚛' },
          { name: 'Stationery',          icon: '📋' },
          { name: 'Bank Charges',        icon: '🏦' },
          { name: 'Mobile/Internet',     icon: '📱' },
          { name: 'Miscellaneous',       icon: '📦' },
        ];
      }

      const dreType = el('dre-expense-type');
      if (dreType) {
        dreType.innerHTML =
          '<option value="">-- Category --</option>' +
          cats.map(c => `<option value="${c.name}">${c.icon || ''} ${c.name}</option>`).join('');
      }

      console.log(`✅ Expense categories loaded: ${cats.length}`);
    } catch (e) {
      console.warn('expense_categories load warning:', e.message);
    }
  }


  // ============================================================
  // SUMMARY DASHBOARD
  // ============================================================
  window.loadCompanySummary = async function () {
    try {
      const { data, error } = await sb()
        .from('v_company_account_summary')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      if (!data) { showToast('warning', 'No Data', 'Company account (sr_no=9) not found.'); return; }

      setText('sum-company-name',    data.company_name || 'Go Company cc');
      setText('sum-initial-credit',  'Rs. ' + fmt(data.initial_credit));
      setText('sum-stock-purchased', 'Rs. ' + fmt(data.total_stock_purchased));
      setText('sum-total-charges',   'Rs. ' + fmt(data.total_charges));
      setText('sum-total-repaid',    'Rs. ' + fmt(data.total_repaid));
      setText('sum-net-payable',     'Rs. ' + fmt(data.net_payable_to_company));
      setText('sum-linked-expenses', 'Rs. ' + fmt(data.total_linked_expenses));
      setText('sum-grand-expenses',  'Rs. ' + fmt(data.grand_total_expenses));
      setText('sum-remaining-credit','Rs. ' + fmt(data.remaining_credit_limit));
      setText('credit-limit-label',  'Limit: Rs. ' + fmt(data.credit_limit));

      const npEl = el('sum-net-payable');
      if (npEl) npEl.style.color = data.net_payable_to_company > 0 ? '#c0392b' : '#1a6b3c';

      const usedPct = Math.min(100, Math.round(
        ((data.total_stock_purchased + data.total_charges - data.total_repaid) /
          (data.credit_limit || 1)) * 100
      ));
      const bar = el('credit-usage-bar');
      if (bar) {
        bar.style.width   = usedPct + '%';
        bar.className     = 'progress-bar ' +
          (usedPct > 80 ? 'bg-danger' : usedPct > 50 ? 'bg-warning' : 'bg-success');
        bar.textContent   = usedPct + '% used';
      }

    } catch (e) {
      console.error('loadCompanySummary:', e);
      // Don't alert — summary view may not exist yet
    }
  };


  // ============================================================
  // TRANSACTION HISTORY
  // ============================================================
  window.loadCompanyTransactions = async function (filters = {}) {
    const tbody = el('company-txn-table');
    if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="text-center py-3 text-muted"><div class="spinner-border spinner-border-sm me-2"></div>Loading...</td></tr>';
    try {
      let q = sb()
        .from('company_transactions')
        .select('*, members:member_id(name,sr_no)')
        .order('txn_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (filters.dateFrom) q = q.gte('txn_date', filters.dateFrom);
      if (filters.dateTo)   q = q.lte('txn_date', filters.dateTo);
      if (filters.type)     q = q.eq('txn_type', filters.type);

      const { data, error } = await q;
      if (error) throw error;
      renderTxnTable(data || []);
      updateTxnTotals(data || []);
    } catch (e) {
      console.error('loadCompanyTransactions:', e);
      if (tbody) tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-3">Error: ${e.message}</td></tr>`;
    }
  };

  function renderTxnTable(txns) {
    const tbody = el('company-txn-table'); if (!tbody) return;
    if (!txns.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-muted"><i class="bi bi-inbox fs-4 d-block mb-2"></i>Koi transaction nahi</td></tr>';
      return;
    }
    const cfg = {
      stock_purchase:   { label: '📦 Stock Purchase',  bg: '#d4edda', clr: '#155724' },
      member_usage:     { label: '💳 Member Card',      bg: '#cce5ff', clr: '#004085' },
      atm_charge:       { label: '🏦 ATM Charge',       bg: '#fff3cd', clr: '#856404' },
      misc_charge:      { label: '📋 Misc Charge',      bg: '#fff3cd', clr: '#856404' },
      repayment_check:  { label: '✅ Repay (Check)',    bg: '#d1ecf1', clr: '#0c5460' },
      repayment_online: { label: '✅ Repay (Online)',   bg: '#d1ecf1', clr: '#0c5460' },
      adjustment:       { label: '⚙️ Adjustment',       bg: '#e2e3e5', clr: '#383d41' },
    };

    tbody.innerHTML = txns.map((t, i) => {
      const c       = cfg[t.txn_type] || { label: t.txn_type, bg: '#f8f9fa', clr: '#333' };
      const isOut   = t.direction === 'out';
      const clr     = isOut ? '#dc3545' : '#198754';
      const sign    = isOut ? '−' : '+';
      const netAmt  = Math.abs(parseFloat(t.net_amount) || parseFloat(t.amount) || 0);
      return `<tr>
        <td class="text-muted">${i + 1}</td>
        <td style="font-size:12px;">${new Date(t.txn_date).toLocaleDateString('en-PK')}</td>
        <td><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;background:${c.bg};color:${c.clr};">${c.label}</span></td>
        <td style="font-weight:700;color:${clr};">${sign} Rs.${fmt(t.amount)}</td>
        <td style="font-size:12px;color:#888;">${t.charges > 0 ? 'Rs.' + fmt(t.charges) : '-'}</td>
        <td style="font-weight:800;color:${clr};">${sign} Rs.${fmt(netAmt)}</td>
        <td style="font-size:12px;">${t.members ? '#' + t.members.sr_no + ' ' + t.members.name : '-'}</td>
        <td style="font-size:12px;color:#555;">${t.description || '-'}</td>
        <td>
          <button onclick="window.deleteCompanyTxn(${t.id})"
            class="btn btn-sm btn-outline-danger" title="Delete">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>`;
    }).join('');
  }

  function updateTxnTotals(txns) {
    let inn = 0, out = 0;
    txns.forEach(t => {
      const net = Math.abs(parseFloat(t.net_amount) || parseFloat(t.amount) || 0);
      if (t.direction === 'in') inn += net; else out += net;
    });
    setText('ctxn-total-in',  'Rs. ' + fmt(inn));
    setText('cxtn-total-out', 'Rs. ' + fmt(out));
    setText('cxtn-net',       'Rs. ' + fmt(out - inn));
  }


  // ============================================================
  // STOCK PURCHASE
  // ============================================================
  window.handleStockPurchase = async function () {
    const fuelType  = el('sp-fuel-type')?.value;
    const liters    = parseFloat(el('sp-liters')?.value) || 0;
    const unitPrice = parseFloat(el('sp-unit-price')?.value) || 0;
    const charges   = parseFloat(el('sp-charges')?.value) || 0;
    const invoiceNo = el('sp-invoice-no')?.value || '';
    const truckNo   = el('sp-truck-no')?.value || '';
    const purchDate = el('sp-date')?.value || new Date().toISOString().split('T')[0];
    const notes     = el('sp-notes')?.value || '';

    if (!fuelType)     { alert('Fuel type select karein');  return; }
    if (liters <= 0)   { alert('Liters enter karein');      return; }
    if (unitPrice <= 0){ alert('Unit price enter karein'); return; }

    const totalAmount = liters * unitPrice;
    try {
      const userId    = await getCurrentUserId();
      const companyId = await getCompanyId();

      const { data: ctxn, error: cErr } = await sb()
        .from('company_transactions')
        .insert([{
          user_id: userId, company_id: companyId,
          txn_type: 'stock_purchase', direction: 'out',
          amount: totalAmount, charges, fuel_type: fuelType,
          liters, unit_price: unitPrice, txn_date: purchDate,
          description: `${fuelType} stock — ${fmt(liters)}L @ Rs.${unitPrice}`, notes
        }])
        .select().single();
      if (cErr) throw cErr;

      // Also add to stock_purchases table
      await sb().from('stock_purchases').insert([{
        user_id: userId, company_id: companyId,
        company_txn_id: ctxn.id,
        fuel_type: fuelType, liters, unit_price: unitPrice, charges,
        invoice_no: invoiceNo, truck_no: truckNo,
        purchase_date: purchDate, notes
      }]);

      // Also add to stock_entries for tank management
      await sb().from('stock_entries').insert([{
        fuel_type: fuelType === 'Mobil Oil' ? 'Mobil' : fuelType,
        liters, price_per_liter: unitPrice,
        total_amount: totalAmount,
        supplier_name: 'Go Company cc',
        invoice_number: invoiceNo, truck_number: truckNo, notes
      }]).catch(e => console.warn('stock_entries warning:', e.message));

      showToast('success', 'Purchase Recorded!', `${fuelType} ${fmt(liters)}L — Rs.${fmt(totalAmount + charges)} ✓`);
      closeModal('stockPurchaseModal');
      await loadCompanySummary();
      await window.loadCompanyTransactions();
    } catch (e) { console.error(e); alert('Error: ' + e.message); }
  };


  // ============================================================
  // MEMBER CARD USAGE
  // ============================================================
  window.handleMemberCardUsage = async function () {
    const memberId   = parseInt(el('mcu-member-id')?.value) || 0;
    const fuelType   = el('mcu-fuel-type')?.value;
    const liters     = parseFloat(el('mcu-liters')?.value) || 0;
    const unitPrice  = parseFloat(el('mcu-unit-price')?.value) || 0;
    const atmCharge  = parseFloat(el('mcu-atm-charges')?.value) || 0;
    const miscCharge = parseFloat(el('mcu-misc-charges')?.value) || 0;
    const usageDate  = el('mcu-date')?.value || new Date().toISOString().split('T')[0];
    const notes      = el('mcu-notes')?.value || '';

    if (!memberId)      { alert('Member select karein');    return; }
    if (!fuelType)      { alert('Fuel type select karein'); return; }
    if (liters <= 0)    { alert('Liters enter karein');     return; }
    if (unitPrice <= 0) { alert('Unit price enter karein'); return; }

    const stockValue   = liters * unitPrice;
    const totalCharges = atmCharge + miscCharge;
    const memberName   = el('mcu-member-id')?.selectedOptions[0]?.text || '';

    try {
      const userId    = await getCurrentUserId();
      const companyId = await getCompanyId();

      const { data: ctxn, error: cErr } = await sb()
        .from('company_transactions')
        .insert([{
          user_id: userId, company_id: companyId,
          txn_type: 'member_usage', direction: 'out',
          amount: stockValue, charges: totalCharges,
          fuel_type: fuelType, liters, unit_price: unitPrice,
          member_id: memberId, txn_date: usageDate,
          description: `${memberName} card — ${fuelType} ${fmt(liters)}L`, notes
        }])
        .select().single();
      if (cErr) throw cErr;

      await sb().from('member_card_usage').insert([{
        user_id: userId, company_id: companyId, member_id: memberId,
        company_txn_id: ctxn.id,
        fuel_type: fuelType, liters, unit_price: unitPrice,
        atm_charges: atmCharge, misc_charges: miscCharge,
        usage_date: usageDate, notes
      }]);

      showToast('success', 'Usage Recorded!', `${memberName} — Rs.${fmt(stockValue + totalCharges)} deducted ✓`);
      closeModal('memberCardModal');
      await loadCompanySummary();
      await window.loadCompanyTransactions();
    } catch (e) { console.error(e); alert('Error: ' + e.message); }
  };


  // ============================================================
  // REPAYMENT
  // ============================================================
  window.handleRepayment = async function () {
    const amount   = parseFloat(el('rp-amount')?.value) || 0;
    const payMode  = el('rp-payment-mode')?.value;
    const refNo    = el('rp-reference-no')?.value || '';
    const payDate  = el('rp-date')?.value || new Date().toISOString().split('T')[0];
    const notes    = el('rp-notes')?.value || '';

    if (amount <= 0) { alert('Amount enter karein');          return; }
    if (!payMode)    { alert('Payment method select karein'); return; }

    try {
      const userId    = await getCurrentUserId();
      const companyId = await getCompanyId();
      const txnType   = payMode === 'check' ? 'repayment_check' : 'repayment_online';

      const { data: ctxn, error: cErr } = await sb()
        .from('company_transactions')
        .insert([{
          user_id: userId, company_id: companyId,
          txn_type: txnType, direction: 'in',
          amount, charges: 0, payment_mode: payMode,
          reference_no: refNo, txn_date: payDate,
          description: `Repayment via ${payMode}${refNo ? ' — Ref: ' + refNo : ''}`, notes
        }])
        .select().single();
      if (cErr) throw cErr;

      await sb().from('company_repayments').insert([{
        user_id: userId, company_id: companyId,
        company_txn_id: ctxn.id,
        amount, payment_mode: payMode, reference_no: refNo,
        payment_date: payDate, notes
      }]);

      showToast('success', 'Repayment Recorded!', `Rs.${fmt(amount)} via ${payMode} ✓`);
      closeModal('repaymentModal');
      await loadCompanySummary();
      await window.loadCompanyTransactions();
      await window.loadRepaymentHistory();
    } catch (e) { console.error(e); alert('Error: ' + e.message); }
  };


  // ============================================================
  // EXPENSE ENTRY (DUAL ACCOUNT)
  // ============================================================
  window.handleDualRoleExpense = async function () {
    const accountId  = parseInt(el('dre-account-id')?.value) || 0;
    const amount     = parseFloat(el('dre-amount')?.value) || 0;
    const expType    = el('dre-expense-type')?.value;
    const description= el('dre-description')?.value;
    const paidFrom   = el('dre-paid-from')?.value;
    const expDate    = el('dre-date')?.value || new Date().toISOString().split('T')[0];

    if (!accountId)   { alert('Account select karein');     return; }
    if (amount <= 0)  { alert('Amount enter karein');       return; }
    if (!expType)     { alert('Category select karein');    return; }
    if (!description) { alert('Description enter karein'); return; }
    if (!paidFrom)    { alert('Paid from select karein');  return; }

    try {
      const userId = await getCurrentUserId();

      // 1. Expense entry (shows in Expense section)
      await sb().from('transactions').insert([{
        user_id: userId, customer_id: accountId,
        transaction_type: 'Expense', amount,
        expense_type: expType, expense_account: paidFrom,
        description: `${expType}: ${description}`,
        created_at: expDate + 'T00:00:00+05:00'
      }]);

      // 2. Ledger credit entry (shows in that account's ledger)
      await sb().from('transactions').insert([{
        user_id: userId, customer_id: accountId,
        transaction_type: 'Credit', amount,
        description: `Expense payment: ${expType} — ${description}`,
        created_at: expDate + 'T00:00:00+05:00'
      }]);

      // 3. Update customer balance
      const { data: acc } = await sb().from('customers').select('balance').eq('id', accountId).single();
      const newBal = (parseFloat(acc?.balance) || 0) + amount;
      await sb().from('customers').update({ balance: newBal }).eq('id', accountId);

      showToast('success', 'Expense Recorded!', `Rs.${fmt(amount)} — ${expType} — Expense + Ledger dono update ✓`);
      closeModal('dualExpenseModal');
    } catch (e) { console.error(e); alert('Error: ' + e.message); }
  };


  // ============================================================
  // CALCULATORS
  // ============================================================
  window.calcStockTotal = function () {
    const l = parseFloat(el('sp-liters')?.value) || 0;
    const p = parseFloat(el('sp-unit-price')?.value) || 0;
    const c = parseFloat(el('sp-charges')?.value) || 0;
    const total = (l * p) + c;
    const box = el('sp-total-display');
    if (box) { box.textContent = total > 0 ? `Total: Rs. ${fmt(total)}` : ''; box.style.display = total > 0 ? 'block' : 'none'; }
  };

  window.calcMcuTotal = function () {
    const l   = parseFloat(el('mcu-liters')?.value) || 0;
    const p   = parseFloat(el('mcu-unit-price')?.value) || 0;
    const atm = parseFloat(el('mcu-atm-charges')?.value) || 0;
    const msc = parseFloat(el('mcu-misc-charges')?.value) || 0;
    const total = (l * p) + atm + msc;
    const box = el('mcu-total-display');
    if (box) { box.textContent = total > 0 ? `Grand Total: Rs. ${fmt(total)}` : ''; box.style.display = total > 0 ? 'block' : 'none'; }
  };

  window.setMcuFuelPrice = function () {
    const fuel = el('mcu-fuel-type')?.value; if (!fuel) return;
    const price = window.fuelPrices?.[fuel] || 0;
    if (el('mcu-unit-price') && price > 0) el('mcu-unit-price').value = price;
    window.calcMcuTotal();
  };

  window.setSpFuelPrice = function () {
    const fuel = el('sp-fuel-type')?.value; if (!fuel) return;
    const price = window.fuelPrices?.[fuel] || 0;
    if (el('sp-unit-price') && price > 0) el('sp-unit-price').value = price;
    window.calcStockTotal();
  };


  // ============================================================
  // TAB LOADERS
  // ============================================================
  window.loadStockHistory = async function () {
    const tbody = el('stock-breakdown-table');
    if (!tbody) return;
    try {
      const { data, error } = await sb().from('v_stock_by_fuel').select('*');
      if (error) throw error;
      const rows = data || [];
      if (!rows.length) { tbody.innerHTML = '<tr><td colspan="7" class="text-center py-3 text-muted">Koi stock nahi</td></tr>'; return; }
      let gt = 0;
      tbody.innerHTML = rows.map(r => {
        gt += parseFloat(r.total_net_payable) || 0;
        return `<tr>
          <td class="fw-bold">${r.fuel_type}</td>
          <td>${r.purchase_count}</td>
          <td>${fmt(r.total_liters)} L</td>
          <td>Rs. ${fmt(r.avg_unit_price)}</td>
          <td>Rs. ${fmt(r.total_value)}</td>
          <td class="text-danger">Rs. ${fmt(r.total_charges)}</td>
          <td class="fw-bold text-danger">Rs. ${fmt(r.total_net_payable)}</td>
        </tr>`;
      }).join('') +
        `<tr class="table-secondary fw-bold">
          <td colspan="6" class="text-end">GRAND TOTAL:</td>
          <td class="text-danger fs-6">Rs. ${fmt(gt)}</td>
        </tr>`;
    } catch (e) { if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-2">${e.message}</td></tr>`; }
  };

  window.loadMemberUsageSummary = async function () {
    const tbody = el('member-usage-summary-table');
    if (!tbody) return;
    try {
      const { data, error } = await sb().from('v_member_usage_summary').select('*');
      if (error) throw error;
      const rows = data || [];
      if (!rows.length) { tbody.innerHTML = '<tr><td colspan="8" class="text-center py-3 text-muted">Koi member usage nahi</td></tr>'; return; }
      let gt = 0;
      tbody.innerHTML = rows.map((r, i) => {
        gt += parseFloat(r.grand_total) || 0;
        return `<tr>
          <td>${i + 1}</td>
          <td class="fw-bold">#${r.member_no} ${r.member_name}</td>
          <td>${r.fuel_type}</td>
          <td>${r.usage_count}</td>
          <td>${fmt(r.total_liters)} L</td>
          <td>Rs. ${fmt(r.stock_value)}</td>
          <td class="text-warning">Rs. ${fmt(r.total_charges)}</td>
          <td class="fw-bold text-danger">Rs. ${fmt(r.grand_total)}</td>
        </tr>`;
      }).join('') +
        `<tr class="table-secondary fw-bold">
          <td colspan="7" class="text-end">GRAND TOTAL:</td>
          <td class="text-danger fs-6">Rs. ${fmt(gt)}</td>
        </tr>`;
    } catch (e) { if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-2">${e.message}</td></tr>`; }
  };

  window.loadRepaymentHistory = async function () {
    const tbody = el('repayment-history-table');
    if (!tbody) return;
    try {
      const { data, error } = await sb().from('company_repayments').select('*').order('payment_date', { ascending: false });
      if (error) throw error;
      const rows = data || [];
      let total = 0;
      if (!rows.length) { tbody.innerHTML = '<tr><td colspan="7" class="text-center py-3 text-muted">Koi repayment nahi</td></tr>'; setText('repayment-total', '—'); return; }
      tbody.innerHTML = rows.map((r, i) => {
        total += parseFloat(r.amount) || 0;
        return `<tr>
          <td>${i + 1}</td>
          <td style="font-size:12px;">${new Date(r.payment_date).toLocaleDateString('en-PK')}</td>
          <td class="fw-bold text-success">Rs. ${fmt(r.amount)}</td>
          <td><span class="badge ${r.payment_mode === 'check' ? 'bg-success' : 'bg-primary'}">${r.payment_mode === 'check' ? '🏷️ Check' : r.payment_mode === 'online' ? '🌐 Online' : r.payment_mode}</span></td>
          <td style="font-size:12px;">${r.reference_no || '-'}</td>
          <td style="font-size:12px;">${r.notes || '-'}</td>
          <td><span class="badge ${r.verified ? 'bg-success' : 'bg-warning text-dark'}">${r.verified ? '✅ Verified' : '⏳ Pending'}</span></td>
        </tr>`;
      }).join('');
      setText('repayment-total', 'Rs. ' + fmt(total));
    } catch (e) { if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-2">${e.message}</td></tr>`; }
  };

  window.loadExpenseLedger = async function () {
    const tbody = el('expense-ledger-table');
    if (!tbody) return;
    try {
      const { data, error } = await sb().from('v_expense_ledger').select('*').limit(100);
      if (error) throw error;
      const rows = data || [];
      if (!rows.length) { tbody.innerHTML = '<tr><td colspan="7" class="text-center py-3 text-muted">Koi expense nahi</td></tr>'; return; }
      tbody.innerHTML = rows.map(r => `<tr>
        <td style="font-size:12px;">${new Date(r.expense_date).toLocaleDateString('en-PK')}</td>
        <td class="fw-bold">#${r.account_no || '-'}</td>
        <td>${r.account_name}${r.is_expense_also ? '<span class="badge bg-warning text-dark ms-1" style="font-size:10px;">DUAL</span>' : ''}</td>
        <td style="font-size:12px;">${r.category || '-'}</td>
        <td class="fw-bold text-danger">Rs. ${fmt(r.amount)}</td>
        <td style="font-size:12px;color:#555;">${r.description || '-'}</td>
        <td style="font-size:12px;">${r.paid_from || '-'}</td>
      </tr>`).join('');
    } catch (e) { if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-2">${e.message}</td></tr>`; }
  };


  // ============================================================
  // DELETE
  // ============================================================
  window.deleteCompanyTxn = async function (id) {
    if (!confirm('Is transaction ko delete karein?')) return;
    try {
      const { error } = await sb().from('company_transactions').delete().eq('id', id);
      if (error) throw error;
      showToast('success', 'Deleted', 'Transaction delete ho gaya!');
      await window.loadCompanyTransactions();
      await loadCompanySummary();
    } catch (e) { alert('Error: ' + e.message); }
  };


  // ============================================================
  // EVENT BINDING
  // ============================================================
  function setupEvents() {
    el('stockPurchaseForm')?.addEventListener('submit', e => { e.preventDefault(); window.handleStockPurchase(); });
    el('memberCardForm')   ?.addEventListener('submit', e => { e.preventDefault(); window.handleMemberCardUsage(); });
    el('repaymentForm')    ?.addEventListener('submit', e => { e.preventDefault(); window.handleRepayment(); });
    el('dualExpenseForm')  ?.addEventListener('submit', e => { e.preventDefault(); window.handleDualRoleExpense(); });

    el('sp-liters')       ?.addEventListener('input',  window.calcStockTotal);
    el('sp-unit-price')   ?.addEventListener('input',  window.calcStockTotal);
    el('sp-charges')      ?.addEventListener('input',  window.calcStockTotal);
    el('sp-fuel-type')    ?.addEventListener('change', window.setSpFuelPrice);

    el('mcu-liters')      ?.addEventListener('input',  window.calcMcuTotal);
    el('mcu-unit-price')  ?.addEventListener('input',  window.calcMcuTotal);
    el('mcu-atm-charges') ?.addEventListener('input',  window.calcMcuTotal);
    el('mcu-misc-charges')?.addEventListener('input',  window.calcMcuTotal);
    el('mcu-fuel-type')   ?.addEventListener('change', window.setMcuFuelPrice);

    el('btn-apply-company-filter')?.addEventListener('click', () => {
      window.loadCompanyTransactions({
        dateFrom: el('cfilter-date-from')?.value,
        dateTo:   el('cfilter-date-to')?.value,
        type:     el('cfilter-type')?.value
      });
    });
    el('btn-clear-company-filter')?.addEventListener('click', () => {
      ['cfilter-date-from', 'cfilter-date-to', 'cfilter-type'].forEach(id => { if (el(id)) el(id).value = ''; });
      window.loadCompanyTransactions();
    });
  }

})();