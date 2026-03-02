// =============================================
// FILE: js/stock.js  (v2 — Monthly + Receiving Details)
// Stock Management — Khalid and Sons Petroleum
// Tables used:
//   • stock_purchases  (main receiving table)
//   • tanks            (current stock)
// =============================================

document.addEventListener('DOMContentLoaded', async function () {
    if (document.body.dataset.page !== 'stock') return;

    function waitForSupabase(cb) {
        if (window.supabaseClient) cb();
        else setTimeout(() => waitForSupabase(cb), 100);
    }

    waitForSupabase(async () => {
        // Set default month filter to current month
        const now = new Date();
        const monthVal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const monthFilter = document.getElementById('filter-month');
        if (monthFilter) monthFilter.value = monthVal;

        await Promise.all([
            loadCurrentStock(),
            loadHistory(),
            loadMonthlyStats(),
            loadMonthlyChart()
        ]);
        setupLiveCalc();
    });
});

// =============================================
// Live Calculation Preview
// =============================================
function setupLiveCalc() {
    const litersInput  = document.getElementById('liters-input');
    const rateInput    = document.getElementById('rate-input');
    const chargesInput = document.getElementById('charges-input');
    const fuelType     = document.getElementById('fuel-type');

    function update() {
        const liters  = parseFloat(litersInput.value)  || 0;
        const rate    = parseFloat(rateInput.value)    || 0;
        const charges = parseFloat(chargesInput?.value) || 0;
        const fuel    = fuelType.value;
        const subtotal    = liters * rate;
        const netPayable  = subtotal + charges;

        const box = document.getElementById('calc-preview');
        if (liters > 0 || rate > 0) {
            box.style.display = 'block';
            document.getElementById('calc-fuel').textContent    = fuel || '—';
            document.getElementById('calc-liters').textContent  = formatNum(liters) + ' L';
            document.getElementById('calc-rate').textContent    = 'Rs. ' + formatNum(rate);
            document.getElementById('calc-subtotal').textContent = 'Rs. ' + formatNum(subtotal);
            document.getElementById('calc-charges').textContent = charges > 0 ? 'Rs. ' + formatNum(charges) : '—';
            document.getElementById('calc-total').textContent   = 'Rs. ' + formatNum(netPayable);
        } else {
            box.style.display = 'none';
        }
    }

    litersInput?.addEventListener('input', update);
    rateInput?.addEventListener('input', update);
    chargesInput?.addEventListener('input', update);
    fuelType?.addEventListener('change', update);
}

// =============================================
// Load Current Tank Stock
// =============================================
async function loadCurrentStock() {
    try {
        const { data, error } = await window.supabaseClient
            .from('tanks')
            .select('*');

        if (error) { console.error('Tank load error:', error); return; }

        const petrol = data.find(t => t.fuel_type === 'Petrol') || { current_stock: 0, capacity: 25000 };
        const diesel = data.find(t => t.fuel_type === 'Diesel') || { current_stock: 0, capacity: 25000 };

        updateTankUI('petrol', petrol);
        updateTankUI('diesel', diesel);

        if (petrol.current_stock < 2000 || diesel.current_stock < 2000) {
            showToast('⚠️ Stock kam hai! Jaldi fill karein.', 'warning');
        }
    } catch (err) {
        console.error('loadCurrentStock error:', err);
    }
}

function updateTankUI(type, tank) {
    const prefix = type; // 'petrol' or 'diesel'
    const stock = parseFloat(tank.current_stock || 0);
    const cap   = parseFloat(tank.capacity || 25000);

    const stockEl   = document.getElementById(`${prefix}-stock-display`);
    const capEl     = document.getElementById(`${prefix}-cap-display`);
    const barEl     = document.getElementById(`${prefix}-bar`);
    const updatedEl = document.getElementById(`${prefix}-updated`);

    if (stockEl)   stockEl.textContent   = formatNum(stock);
    if (capEl)     capEl.textContent     = formatNum(cap);
    if (barEl)     barEl.style.width     = Math.min((stock / cap) * 100, 100) + '%';
    if (updatedEl) updatedEl.textContent = tank.last_updated ? formatDateTime(tank.last_updated) : (tank.updated_at ? formatDateTime(tank.updated_at) : '—');
}

// =============================================
// Submit Stock Receiving Entry
// =============================================
async function submitStock() {
    const fuelType      = document.getElementById('fuel-type').value;
    const liters        = parseFloat(document.getElementById('liters-input').value);
    const rate          = parseFloat(document.getElementById('rate-input').value);
    const supplier      = document.getElementById('supplier-input').value.trim();
    const truck         = document.getElementById('truck-input').value.trim();
    const charges       = parseFloat(document.getElementById('charges-input')?.value) || 0;
    const invoiceNo     = document.getElementById('invoice-no-input')?.value.trim() || '';
    const purchaseDateEl = document.getElementById('purchase-date-input');
    const purchaseDate  = purchaseDateEl?.value || new Date().toISOString().split('T')[0];
    const notes         = document.getElementById('notes-input').value.trim();

    // Validation
    if (!fuelType)        return showToast('Fuel type select karein!', 'danger');
    if (!liters || liters <= 0) return showToast('Liters sahi darj karein!', 'danger');
    if (!rate || rate <= 0)     return showToast('Rate per liter darj karein!', 'danger');

    const totalAmount = liters * rate;
    const netPayable  = totalAmount + charges;
    const genInvoice  = invoiceNo || generateInvoiceNumber();

    const btn = document.getElementById('add-stock-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...';

    try {
        // 1. Insert into stock_purchases
        const { data: entry, error: entryErr } = await window.supabaseClient
            .from('stock_purchases')
            .insert([{
                fuel_type:     fuelType,
                liters:        liters,
                unit_price:    rate,
                total_amount:  totalAmount,
                charges:       charges > 0 ? charges : null,
                net_payable:   netPayable,
                invoice_no:    genInvoice,
                truck_no:      truck || null,
                purchase_date: purchaseDate,
                notes:         notes || null
            }])
            .select()
            .single();

        if (entryErr) throw entryErr;

        // 2. Update tank current_stock
        const { data: tank } = await window.supabaseClient
            .from('tanks')
            .select('current_stock')
            .eq('fuel_type', fuelType)
            .single();

        const newStock = parseFloat(tank?.current_stock || 0) + liters;

        const { error: tankErr } = await window.supabaseClient
            .from('tanks')
            .upsert({
                fuel_type:     fuelType,
                current_stock: newStock,
                last_updated:  new Date().toISOString()
            }, { onConflict: 'fuel_type' });

        if (tankErr) throw tankErr;

        // 3. Show invoice
        showInvoice({
            invoiceNumber: genInvoice,
            fuelType,
            liters,
            rate,
            totalAmount,
            charges,
            netPayable,
            supplier,
            truck,
            notes,
            purchaseDate,
            createdAt: entry.created_at
        });

        // 4. Reset form
        ['fuel-type','liters-input','rate-input','supplier-input',
         'truck-input','charges-input','invoice-no-input','notes-input']
        .forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        document.getElementById('calc-preview').style.display = 'none';

        // 5. Refresh UI
        await Promise.all([loadCurrentStock(), loadHistory(), loadMonthlyStats(), loadMonthlyChart()]);
        showToast(`✅ ${fuelType} stock add ho gaya! Invoice ready hai.`, 'success');

    } catch (err) {
        console.error('submitStock error:', err);
        showToast('Error: ' + (err.message || 'Kuch masla hua'), 'danger');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-plus-lg me-2"></i>Stock Add Karein & Invoice Banayein';
    }
}

// =============================================
// Load Stock History (with month filter)
// =============================================
async function loadHistory() {
    try {
        const filterFuel  = document.getElementById('filter-fuel')?.value  || '';
        const filterMonth = document.getElementById('filter-month')?.value || '';

        let query = window.supabaseClient
            .from('stock_purchases')
            .select('*')
            .order('purchase_date', { ascending: false })
            .order('created_at',   { ascending: false })
            .limit(100);

        if (filterFuel)  query = query.eq('fuel_type', filterFuel);

        if (filterMonth) {
            const [yr, mo] = filterMonth.split('-');
            const start = `${yr}-${mo}-01`;
            const endDate = new Date(parseInt(yr), parseInt(mo), 0); // last day of month
            const end = `${yr}-${mo}-${String(endDate.getDate()).padStart(2,'0')}`;
            query = query.gte('purchase_date', start).lte('purchase_date', end);
        }

        const { data, error } = await query;
        if (error) throw error;

        const tbody = document.getElementById('history-tbody');
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted py-4">Is mahine koi entry nahi mili</td></tr>';
            return;
        }

        // Group by date for visual separation
        let lastDate = '';
        tbody.innerHTML = data.map(entry => {
            const entryDate = entry.purchase_date;
            let dateHeader = '';
            if (entryDate !== lastDate) {
                lastDate = entryDate;
                dateHeader = `<tr class="table-light">
                    <td colspan="10" class="py-1 px-3 small fw-600 text-muted" style="font-size:0.78rem; letter-spacing:0.5px;">
                        📅 ${formatDate(entryDate)}
                    </td>
                </tr>`;
            }
            return dateHeader + `
            <tr>
                <td class="text-muted small">${formatDate(entry.purchase_date)}</td>
                <td>
                    <span class="badge bg-light text-dark border fw-600" style="font-family:monospace; font-size:0.75rem;">
                        ${entry.invoice_no || '—'}
                    </span>
                </td>
                <td>
                    <span class="badge ${entry.fuel_type === 'Petrol' ? 'bg-success' : 'bg-warning text-dark'}">
                        ${entry.fuel_type}
                    </span>
                </td>
                <td class="fw-600">${formatNum(entry.liters)} L</td>
                <td>Rs. ${formatNum(entry.unit_price)}</td>
                <td>Rs. ${formatNum(entry.total_amount)}</td>
                <td class="text-muted small">${entry.charges ? 'Rs. ' + formatNum(entry.charges) : '—'}</td>
                <td class="fw-700 text-primary">Rs. ${formatNum(entry.net_payable || entry.total_amount)}</td>
                <td class="text-muted small">${entry.truck_no || '—'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary py-0" onclick="showInvoiceById(${entry.id})">
                        <i class="bi bi-receipt me-1"></i>Invoice
                    </button>
                </td>
            </tr>`;
        }).join('');

    } catch (err) {
        console.error('loadHistory error:', err);
        document.getElementById('history-tbody').innerHTML =
            '<tr><td colspan="10" class="text-center text-danger">History load nahi ho saki</td></tr>';
    }
}

// =============================================
// Load Monthly Stats (current month)
// =============================================
async function loadMonthlyStats() {
    try {
        const now = new Date();
        const yr  = now.getFullYear();
        const mo  = String(now.getMonth() + 1).padStart(2, '0');
        const start = `${yr}-${mo}-01`;
        const lastDay = new Date(yr, now.getMonth() + 1, 0).getDate();
        const end   = `${yr}-${mo}-${lastDay}`;

        const { data, error } = await window.supabaseClient
            .from('stock_purchases')
            .select('fuel_type, liters, total_amount, charges, net_payable')
            .gte('purchase_date', start)
            .lte('purchase_date', end);

        if (error) throw error;

        let pL = 0, pAmt = 0, dL = 0, dAmt = 0, pCount = 0, dCount = 0;
        (data || []).forEach(e => {
            if (e.fuel_type === 'Petrol') {
                pL += parseFloat(e.liters); pAmt += parseFloat(e.net_payable || e.total_amount); pCount++;
            } else {
                dL += parseFloat(e.liters); dAmt += parseFloat(e.net_payable || e.total_amount); dCount++;
            }
        });

        const monthName = now.toLocaleString('en-PK', { month: 'long', year: 'numeric' });
        const container = document.getElementById('monthly-stats');
        container.innerHTML = `
            <div class="text-center mb-2">
                <small class="text-muted fw-600" style="font-size:0.72rem; letter-spacing:0.5px;">${monthName}</small>
            </div>
            <div class="mb-3 pb-3 border-bottom">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="d-flex align-items-center gap-2">
                        <span class="badge bg-success" style="font-size:0.65rem;">P</span>
                        <span class="fw-600">Petrol</span>
                    </span>
                    <span class="badge bg-light text-muted border" style="font-size:0.65rem;">${pCount} entries</span>
                </div>
                <div class="d-flex justify-content-between">
                    <span class="text-muted small">Liters</span>
                    <span class="fw-600">${formatNum(pL)} L</span>
                </div>
                <div class="d-flex justify-content-between">
                    <span class="text-muted small">Total Kharch</span>
                    <span class="fw-600 text-primary">Rs. ${formatNum(pAmt)}</span>
                </div>
            </div>
            <div>
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="d-flex align-items-center gap-2">
                        <span class="badge bg-warning text-dark" style="font-size:0.65rem;">D</span>
                        <span class="fw-600">Diesel</span>
                    </span>
                    <span class="badge bg-light text-muted border" style="font-size:0.65rem;">${dCount} entries</span>
                </div>
                <div class="d-flex justify-content-between">
                    <span class="text-muted small">Liters</span>
                    <span class="fw-600">${formatNum(dL)} L</span>
                </div>
                <div class="d-flex justify-content-between">
                    <span class="text-muted small">Total Kharch</span>
                    <span class="fw-600 text-primary">Rs. ${formatNum(dAmt)}</span>
                </div>
            </div>
            <hr>
            <div class="d-flex justify-content-between fw-700">
                <span>Grand Total</span>
                <span class="text-danger">Rs. ${formatNum(pAmt + dAmt)}</span>
            </div>
        `;
    } catch (err) {
        console.error('loadMonthlyStats error:', err);
    }
}

// =============================================
// Load Monthly Chart (last 6 months)
// =============================================
async function loadMonthlyChart() {
    const container = document.getElementById('monthly-chart-container');
    if (!container) return;

    try {
        // Get last 6 months data
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const start = sixMonthsAgo.toISOString().split('T')[0];

        const { data, error } = await window.supabaseClient
            .from('stock_purchases')
            .select('fuel_type, liters, net_payable, total_amount, purchase_date')
            .gte('purchase_date', start)
            .order('purchase_date', { ascending: true });

        if (error) throw error;

        // Group by month + fuel_type
        const monthMap = {};
        (data || []).forEach(e => {
            const d = new Date(e.purchase_date);
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            if (!monthMap[key]) monthMap[key] = { petrolL: 0, dieselL: 0, petrolAmt: 0, dieselAmt: 0 };
            const amt = parseFloat(e.net_payable || e.total_amount);
            const l   = parseFloat(e.liters);
            if (e.fuel_type === 'Petrol') { monthMap[key].petrolL += l; monthMap[key].petrolAmt += amt; }
            else                          { monthMap[key].dieselL += l; monthMap[key].dieselAmt += amt; }
        });

        const months = Object.keys(monthMap).sort();
        const labels = months.map(m => {
            const [yr, mo] = m.split('-');
            return new Date(yr, parseInt(mo)-1, 1).toLocaleString('en-PK', { month: 'short', year: '2-digit' });
        });

        if (months.length === 0) {
            container.innerHTML = '<div class="text-center text-muted py-3 small">Data nahi mila</div>';
            return;
        }

        // Simple bar chart using CSS/HTML (no chart library needed)
        const maxL = Math.max(...months.map(m => monthMap[m].petrolL + monthMap[m].dieselL), 1);

        container.innerHTML = `
            <div class="d-flex align-items-end gap-2 justify-content-center" style="height:120px; padding-bottom:4px;">
                ${months.map((m, i) => {
                    const pPct = (monthMap[m].petrolL / maxL) * 100;
                    const dPct = (monthMap[m].dieselL / maxL) * 100;
                    const isCurrentMonth = m === `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
                    return `
                    <div class="d-flex flex-column align-items-center flex-grow-1" style="max-width:60px;">
                        <div class="w-100 d-flex flex-column justify-content-end" style="height:100px; gap:1px;">
                            <div style="height:${dPct}%; background:#b45309; border-radius:3px 3px 0 0; min-height:${monthMap[m].dieselL > 0 ? '4px' : '0'};"
                                 title="Diesel: ${formatNum(monthMap[m].dieselL)}L"></div>
                            <div style="height:${pPct}%; background:#0d6e3f; border-radius:3px 3px 0 0; min-height:${monthMap[m].petrolL > 0 ? '4px' : '0'};"
                                 title="Petrol: ${formatNum(monthMap[m].petrolL)}L"></div>
                        </div>
                        <div class="text-center mt-1" style="font-size:0.62rem; color:${isCurrentMonth ? '#2563eb' : '#94a3b8'}; font-weight:${isCurrentMonth ? '700' : '400'};">
                            ${labels[i]}
                        </div>
                    </div>`;
                }).join('')}
            </div>
            <div class="d-flex justify-content-center gap-3 mt-1">
                <span style="font-size:0.68rem; color:#0d6e3f;"><span style="display:inline-block;width:10px;height:10px;background:#0d6e3f;border-radius:2px;margin-right:4px;"></span>Petrol</span>
                <span style="font-size:0.68rem; color:#b45309;"><span style="display:inline-block;width:10px;height:10px;background:#b45309;border-radius:2px;margin-right:4px;"></span>Diesel</span>
            </div>
        `;

    } catch (err) {
        console.error('loadMonthlyChart error:', err);
        container.innerHTML = '<div class="text-center text-muted py-2 small">Chart load nahi hua</div>';
    }
}

// =============================================
// Show Invoice by ID
// =============================================
async function showInvoiceById(id) {
    try {
        const { data, error } = await window.supabaseClient
            .from('stock_purchases')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) return showToast('Invoice nahi mili', 'danger');

        showInvoice({
            invoiceNumber: data.invoice_no,
            fuelType:      data.fuel_type,
            liters:        data.liters,
            rate:          data.unit_price,
            totalAmount:   data.total_amount,
            charges:       data.charges,
            netPayable:    data.net_payable,
            supplier:      null, // not in stock_purchases schema
            truck:         data.truck_no,
            notes:         data.notes,
            purchaseDate:  data.purchase_date,
            createdAt:     data.created_at
        });
    } catch (err) {
        console.error('showInvoiceById error:', err);
    }
}

// =============================================
// Generate & Show Invoice
// =============================================
function showInvoice(d) {
    const {
        invoiceNumber, fuelType, liters, rate,
        totalAmount, charges, netPayable,
        supplier, truck, notes, purchaseDate, createdAt
    } = d;

    const dateStr    = purchaseDate ? formatDate(purchaseDate) : (createdAt ? formatDateTime(createdAt) : formatDateTime(new Date().toISOString()));
    const fuelColor  = fuelType === 'Petrol' ? '#0d6e3f' : '#b45309';
    const fuelBg     = fuelType === 'Petrol' ? '#e6f4ec' : '#fef3c7';
    const net        = parseFloat(netPayable || totalAmount);
    const ch         = parseFloat(charges || 0);

    document.getElementById('invoice-preview').innerHTML = `
        <div style="background:#fff;">
            <div class="invoice-header">
                <div class="row align-items-center">
                    <div class="col-8">
                        <div class="invoice-company">Khalid and Sons Petroleum</div>
                        <div style="font-size:0.85rem; color:rgba(255,255,255,0.7); margin-top:4px;">Pakistan · PSO Authorized Dealer</div>
                    </div>
                    <div class="col-4 text-end">
                        <div style="font-size:0.7rem; letter-spacing:1.5px; text-transform:uppercase; color:rgba(255,255,255,0.6);">Receiving Invoice</div>
                        <div style="font-family:monospace; font-size:1rem; font-weight:700; margin-top:2px;">${invoiceNumber || '—'}</div>
                    </div>
                </div>
            </div>
            <div class="invoice-body">
                <div class="row mb-4">
                    <div class="col-3">
                        <div class="invoice-label">Date</div>
                        <div class="invoice-value">${dateStr}</div>
                    </div>
                    <div class="col-3">
                        <div class="invoice-label">Supplier</div>
                        <div class="invoice-value">${supplier || '—'}</div>
                    </div>
                    <div class="col-3">
                        <div class="invoice-label">Truck No.</div>
                        <div class="invoice-value">${truck || '—'}</div>
                    </div>
                    <div class="col-3">
                        <div class="invoice-label">Invoice No.</div>
                        <div class="invoice-value" style="font-family:monospace; font-size:0.85rem;">${invoiceNumber || '—'}</div>
                    </div>
                </div>

                <div class="mb-4">
                    <span style="background:${fuelBg}; color:${fuelColor}; padding:6px 16px; border-radius:20px; font-size:0.8rem; font-weight:700; letter-spacing:1.5px; text-transform:uppercase;">
                        ⛽ ${fuelType} Stock Receiving
                    </span>
                </div>

                <table class="table invoice-table mb-4">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th class="text-end">Qty (L)</th>
                            <th class="text-end">Rate/L</th>
                            <th class="text-end">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="fw-600">${fuelType} Stock Purchase</td>
                            <td class="text-end">${formatNum(liters)} L</td>
                            <td class="text-end">Rs. ${formatNum(rate)}</td>
                            <td class="text-end fw-700">Rs. ${formatNum(totalAmount)}</td>
                        </tr>
                        ${ch > 0 ? `
                        <tr>
                            <td class="text-muted">Other Charges (Transport/Misc)</td>
                            <td class="text-end">—</td>
                            <td class="text-end">—</td>
                            <td class="text-end text-warning">Rs. ${formatNum(ch)}</td>
                        </tr>` : ''}
                    </tbody>
                </table>

                <div class="row justify-content-end mb-4">
                    <div class="col-md-5">
                        <div class="invoice-total-box">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <div style="font-size:0.7rem; letter-spacing:1.5px; text-transform:uppercase; color:rgba(255,255,255,0.7);">Net Payable</div>
                                    <div style="font-family:'Playfair Display',serif; font-size:1.8rem; font-weight:800; line-height:1.1;">
                                        Rs. ${formatNum(net)}
                                    </div>
                                </div>
                                <i class="bi bi-cash-stack" style="font-size:2rem; opacity:0.4;"></i>
                            </div>
                        </div>
                    </div>
                </div>

                ${notes ? `
                <div class="p-3 mb-3" style="background:#f8fafc; border-radius:8px; border-left:3px solid #e2e8f0;">
                    <div class="invoice-label mb-1">Notes</div>
                    <div style="font-size:0.9rem;">${notes}</div>
                </div>` : ''}

                <hr class="mt-4 mb-3">
                <div class="row">
                    <div class="col-6">
                        <div class="invoice-label">Generated by</div>
                        <div class="invoice-value">PetroFlow System</div>
                    </div>
                    <div class="col-6 text-end">
                        <div class="invoice-label">Invoice Ref.</div>
                        <div class="invoice-value" style="font-family:monospace; font-size:0.85rem;">${invoiceNumber || '—'}</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const modal = new bootstrap.Modal(document.getElementById('invoiceModal'));
    modal.show();
}

// =============================================
// Download Invoice
// =============================================
function downloadInvoice() {
    window.print();
}

// =============================================
// Helpers
// =============================================
function generateInvoiceNumber() {
    const now  = new Date();
    const yy   = String(now.getFullYear()).slice(-2);
    const mm   = String(now.getMonth() + 1).padStart(2, '0');
    const dd   = String(now.getDate()).padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `KSP-${yy}${mm}${dd}-${rand}`;
}

function formatNum(num) {
    return parseFloat(num || 0).toLocaleString('en-PK', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-PK', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
}

function formatDateTime(iso) {
    return new Date(iso).toLocaleString('en-PK', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function showToast(msg, type = 'info') {
    const toastEl  = document.getElementById('liveToast');
    const toastMsg = document.getElementById('toast-msg');
    if (!toastEl || !toastMsg) return;
    toastEl.className = `toast align-items-center text-bg-${type} border-0`;
    toastMsg.textContent = msg;
    bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 4000 }).show();
}

// =============================================
// Exports
// =============================================
window.submitStock      = submitStock;
window.loadHistory      = loadHistory;
window.showInvoiceById  = showInvoiceById;
window.downloadInvoice  = downloadInvoice;

console.log('✅ Stock.js v2 loaded (stock_purchases + monthly view)');