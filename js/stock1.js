// =============================================
// FILE: js/stock.js
// Stock Management — Khalid and Sons Petroleum
// =============================================

document.addEventListener('DOMContentLoaded', async function () {
    if (document.body.dataset.page !== 'stock') return;

    function waitForSupabase(cb) {
        if (window.supabaseClient) cb();
        else setTimeout(() => waitForSupabase(cb), 100);
    }

    waitForSupabase(async () => {
        await Promise.all([
            loadCurrentStock(),
            loadHistory(),
            loadMonthlyStats()
        ]);
        setupLiveCalc();
    });
});

// =============================================
// Live Calculation Preview
// =============================================
function setupLiveCalc() {
    const litersInput = document.getElementById('liters-input');
    const rateInput = document.getElementById('rate-input');
    const fuelType = document.getElementById('fuel-type');

    function update() {
        const liters = parseFloat(litersInput.value) || 0;
        const rate = parseFloat(rateInput.value) || 0;
        const fuel = fuelType.value;
        const total = liters * rate;

        const box = document.getElementById('calc-preview');
        if (liters > 0 || rate > 0) {
            box.style.display = 'block';
            document.getElementById('calc-fuel').textContent = fuel || '—';
            document.getElementById('calc-liters').textContent = formatNum(liters) + ' L';
            document.getElementById('calc-rate').textContent = 'Rs. ' + formatNum(rate);
            document.getElementById('calc-total').textContent = 'Rs. ' + formatNum(total);
        } else {
            box.style.display = 'none';
        }
    }

    litersInput.addEventListener('input', update);
    rateInput.addEventListener('input', update);
    fuelType.addEventListener('change', update);
}

// =============================================
// Load Current Tank Stock
// =============================================
async function loadCurrentStock() {
    try {
        const { data, error } = await window.supabaseClient
            .from('tanks')
            .select('*');

        if (error) {
            console.error('Tank load error:', error);
            return;
        }

        const petrol = data.find(t => t.fuel_type === 'Petrol') || { current_stock: 0, capacity: 25000 };
        const diesel = data.find(t => t.fuel_type === 'Diesel') || { current_stock: 0, capacity: 25000 };

        // Petrol display
        document.getElementById('petrol-stock-display').textContent = formatNum(petrol.current_stock);
        document.getElementById('petrol-cap-display').textContent = formatNum(petrol.capacity);
        const pPct = Math.min((petrol.current_stock / petrol.capacity) * 100, 100);
        document.getElementById('petrol-bar').style.width = pPct + '%';
        if (petrol.updated_at) {
            document.getElementById('petrol-updated').textContent = formatDateTime(petrol.updated_at);
        }

        // Diesel display
        document.getElementById('diesel-stock-display').textContent = formatNum(diesel.current_stock);
        document.getElementById('diesel-cap-display').textContent = formatNum(diesel.capacity);
        const dPct = Math.min((diesel.current_stock / diesel.capacity) * 100, 100);
        document.getElementById('diesel-bar').style.width = dPct + '%';
        if (diesel.updated_at) {
            document.getElementById('diesel-updated').textContent = formatDateTime(diesel.updated_at);
        }

        // Low stock warning
        if (petrol.current_stock < 2000 || diesel.current_stock < 2000) {
            showToast('⚠️ Stock kam hai! Jaldi fill karein.', 'warning');
        }

    } catch (err) {
        console.error('loadCurrentStock error:', err);
    }
}

// =============================================
// Submit Stock Entry
// =============================================
async function submitStock() {
    const fuelType = document.getElementById('fuel-type').value;
    const liters = parseFloat(document.getElementById('liters-input').value);
    const rate = parseFloat(document.getElementById('rate-input').value);
    const supplier = document.getElementById('supplier-input').value.trim();
    const truck = document.getElementById('truck-input').value.trim();
    const notes = document.getElementById('notes-input').value.trim();

    // Validation
    if (!fuelType) return showToast('Fuel type select karein!', 'danger');
    if (!liters || liters <= 0) return showToast('Liters sahi darj karein!', 'danger');
    if (!rate || rate <= 0) return showToast('Rate per liter sahi darj karein!', 'danger');

    const totalAmount = liters * rate;
    const invoiceNumber = generateInvoiceNumber();

    const btn = document.getElementById('add-stock-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...';

    try {
        // 1. Insert stock entry (invoice record)
        const { data: entry, error: entryErr } = await window.supabaseClient
            .from('stock_entries')
            .insert([{
                invoice_number: invoiceNumber,
                fuel_type: fuelType,
                liters: liters,
                price_per_liter: rate,
                total_amount: totalAmount,
                supplier_name: supplier || null,
                truck_number: truck || null,
                notes: notes || null
            }])
            .select()
            .single();

        if (entryErr) throw entryErr;

        // 2. Update tank stock (upsert)
        const { data: tank } = await window.supabaseClient
            .from('tanks')
            .select('current_stock')
            .eq('fuel_type', fuelType)
            .single();

        const newStock = (parseFloat(tank?.current_stock || 0)) + liters;

        const { error: tankErr } = await window.supabaseClient
            .from('tanks')
            .upsert({
                fuel_type: fuelType,
                current_stock: newStock
            }, { onConflict: 'fuel_type' });

        if (tankErr) throw tankErr;

        // 3. Show invoice
        showInvoice({
            invoiceNumber,
            fuelType,
            liters,
            rate,
            totalAmount,
            supplier,
            truck,
            notes,
            createdAt: entry.created_at
        });

        // 4. Reset form
        document.getElementById('fuel-type').value = '';
        document.getElementById('liters-input').value = '';
        document.getElementById('rate-input').value = '';
        document.getElementById('supplier-input').value = '';
        document.getElementById('truck-input').value = '';
        document.getElementById('notes-input').value = '';
        document.getElementById('calc-preview').style.display = 'none';

        // 5. Refresh UI
        await loadCurrentStock();
        await loadHistory();
        await loadMonthlyStats();

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
// Load Stock History
// =============================================
async function loadHistory() {
    try {
        const filterFuel = document.getElementById('filter-fuel')?.value || '';

        let query = window.supabaseClient
            .from('stock_entries')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (filterFuel) query = query.eq('fuel_type', filterFuel);

        const { data, error } = await query;
        if (error) throw error;

        const tbody = document.getElementById('history-tbody');
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Koi entry nahi mili</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(entry => `
            <tr>
                <td class="text-muted small">${formatDateTime(entry.created_at)}</td>
                <td>
                    <span class="badge bg-light text-dark border fw-600" style="font-family:monospace;">
                        ${entry.invoice_number}
                    </span>
                </td>
                <td>
                    <span class="badge ${entry.fuel_type === 'Petrol' ? 'bg-success' : 'bg-warning text-dark'}">
                        ${entry.fuel_type}
                    </span>
                </td>
                <td class="fw-600">${formatNum(entry.liters)} L</td>
                <td>Rs. ${formatNum(entry.price_per_liter)}</td>
                <td class="fw-700 text-primary">Rs. ${formatNum(entry.total_amount)}</td>
                <td class="text-muted">${entry.supplier_name || '—'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="showInvoiceById(${entry.id})">
                        <i class="bi bi-receipt me-1"></i>Invoice
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (err) {
        console.error('loadHistory error:', err);
        document.getElementById('history-tbody').innerHTML =
            '<tr><td colspan="8" class="text-center text-danger">History load nahi ho saki</td></tr>';
    }
}

// =============================================
// Load Monthly Stats
// =============================================
async function loadMonthlyStats() {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const { data, error } = await window.supabaseClient
            .from('stock_entries')
            .select('fuel_type, liters, total_amount')
            .gte('created_at', startOfMonth);

        if (error) throw error;

        let petrolL = 0, petrolAmt = 0, dieselL = 0, dieselAmt = 0;
        (data || []).forEach(e => {
            if (e.fuel_type === 'Petrol') { petrolL += parseFloat(e.liters); petrolAmt += parseFloat(e.total_amount); }
            else { dieselL += parseFloat(e.liters); dieselAmt += parseFloat(e.total_amount); }
        });

        const container = document.getElementById('monthly-stats');
        container.innerHTML = `
            <div class="mb-3 pb-3 border-bottom">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="d-flex align-items-center gap-2">
                        <span class="badge bg-success" style="font-size:0.65rem;">P</span>
                        <span class="fw-600">Petrol</span>
                    </span>
                </div>
                <div class="d-flex justify-content-between">
                    <span class="text-muted small">Liters</span>
                    <span class="fw-600">${formatNum(petrolL)} L</span>
                </div>
                <div class="d-flex justify-content-between">
                    <span class="text-muted small">Total Kharch</span>
                    <span class="fw-600 text-primary">Rs. ${formatNum(petrolAmt)}</span>
                </div>
            </div>
            <div>
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="d-flex align-items-center gap-2">
                        <span class="badge bg-warning text-dark" style="font-size:0.65rem;">D</span>
                        <span class="fw-600">Diesel</span>
                    </span>
                </div>
                <div class="d-flex justify-content-between">
                    <span class="text-muted small">Liters</span>
                    <span class="fw-600">${formatNum(dieselL)} L</span>
                </div>
                <div class="d-flex justify-content-between">
                    <span class="text-muted small">Total Kharch</span>
                    <span class="fw-600 text-primary">Rs. ${formatNum(dieselAmt)}</span>
                </div>
            </div>
        `;
    } catch (err) {
        console.error('loadMonthlyStats error:', err);
    }
}

// =============================================
// Show Invoice by ID (history se)
// =============================================
async function showInvoiceById(id) {
    try {
        const { data, error } = await window.supabaseClient
            .from('stock_entries')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) return showToast('Invoice nahi mili', 'danger');

        showInvoice({
            invoiceNumber: data.invoice_number,
            fuelType: data.fuel_type,
            liters: data.liters,
            rate: data.price_per_liter,
            totalAmount: data.total_amount,
            supplier: data.supplier_name,
            truck: data.truck_number,
            notes: data.notes,
            createdAt: data.created_at
        });
    } catch (err) {
        console.error('showInvoiceById error:', err);
    }
}

// =============================================
// Generate & Show Invoice
// =============================================
function showInvoice(data) {
    const {
        invoiceNumber, fuelType, liters, rate, totalAmount,
        supplier, truck, notes, createdAt
    } = data;

    const dateStr = createdAt ? formatDateTime(createdAt) : formatDateTime(new Date().toISOString());
    const fuelColor = fuelType === 'Petrol' ? '#0d6e3f' : '#b45309';
    const fuelBg = fuelType === 'Petrol' ? '#e6f4ec' : '#fef3c7';

    document.getElementById('invoice-preview').innerHTML = `
        <div style="background:#fff;">
            <!-- Header -->
            <div class="invoice-header">
                <div class="row align-items-center">
                    <div class="col-8">
                        <div class="invoice-company">Khalid and Sons Petroleum</div>
                        <div style="font-size:0.85rem; color:rgba(255,255,255,0.7); margin-top:4px;">
                            Pakistan · PSO Authorized Dealer
                        </div>
                    </div>
                    <div class="col-4 text-end">
                        <div style="font-size:0.7rem; letter-spacing:1.5px; text-transform:uppercase; color:rgba(255,255,255,0.6);">Invoice</div>
                        <div style="font-family:monospace; font-size:1.1rem; font-weight:700; margin-top:2px;">${invoiceNumber}</div>
                    </div>
                </div>
            </div>

            <!-- Body -->
            <div class="invoice-body">
                <!-- Meta Row -->
                <div class="row mb-4">
                    <div class="col-4">
                        <div class="invoice-label">Date & Time</div>
                        <div class="invoice-value">${dateStr}</div>
                    </div>
                    <div class="col-4">
                        <div class="invoice-label">Supplier</div>
                        <div class="invoice-value">${supplier || '—'}</div>
                    </div>
                    <div class="col-4">
                        <div class="invoice-label">Truck Number</div>
                        <div class="invoice-value">${truck || '—'}</div>
                    </div>
                </div>

                <!-- Fuel Badge -->
                <div class="mb-4">
                    <span style="background:${fuelBg}; color:${fuelColor}; padding:6px 16px; border-radius:20px; font-size:0.8rem; font-weight:700; letter-spacing:1.5px; text-transform:uppercase;">
                        ⛽ ${fuelType} Stock Entry
                    </span>
                </div>

                <!-- Items Table -->
                <table class="table invoice-table mb-4">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th class="text-end">Quantity</th>
                            <th class="text-end">Rate</th>
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
                    </tbody>
                </table>

                <!-- Total Box -->
                <div class="row justify-content-end mb-4">
                    <div class="col-md-5">
                        <div class="invoice-total-box">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <div style="font-size:0.7rem; letter-spacing:1.5px; text-transform:uppercase; color:rgba(255,255,255,0.7);">Total Payable</div>
                                    <div style="font-family:'Playfair Display',serif; font-size:1.8rem; font-weight:800; line-height:1.1;">
                                        Rs. ${formatNum(totalAmount)}
                                    </div>
                                </div>
                                <i class="bi bi-cash-stack" style="font-size:2rem; opacity:0.4;"></i>
                            </div>
                        </div>
                    </div>
                </div>

                ${notes ? `
                <div class="p-3" style="background:#f8fafc; border-radius:8px; border-left:3px solid #e2e8f0;">
                    <div class="invoice-label mb-1">Notes</div>
                    <div style="font-size:0.9rem;">${notes}</div>
                </div>` : ''}

                <!-- Footer -->
                <hr class="mt-4 mb-3">
                <div class="row">
                    <div class="col-6">
                        <div class="invoice-label">Generated by</div>
                        <div class="invoice-value">PetroFlow System</div>
                    </div>
                    <div class="col-6 text-end">
                        <div class="invoice-label">Invoice ID</div>
                        <div class="invoice-value" style="font-family:monospace; font-size:0.85rem;">${invoiceNumber}</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const modal = new bootstrap.Modal(document.getElementById('invoiceModal'));
    modal.show();
}

// =============================================
// Download Invoice (simple print-to-PDF)
// =============================================
function downloadInvoice() {
    window.print();
}

// =============================================
// Helpers
// =============================================
function generateInvoiceNumber() {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `KSP-${yy}${mm}${dd}-${rand}`;
}

function formatNum(num) {
    return parseFloat(num || 0).toLocaleString('en-PK', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

function formatDateTime(iso) {
    return new Date(iso).toLocaleString('en-PK', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function showToast(msg, type = 'info') {
    const toastEl = document.getElementById('liveToast');
    const toastMsg = document.getElementById('toast-msg');
    if (!toastEl || !toastMsg) return;

    toastEl.className = `toast align-items-center text-bg-${type} border-0`;
    toastMsg.textContent = msg;

    const toast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 4000 });
    toast.show();
}

// =============================================
// Export
// =============================================
window.submitStock = submitStock;
window.loadHistory = loadHistory;
window.showInvoiceById = showInvoiceById;
window.downloadInvoice = downloadInvoice;

console.log('✅ Stock.js loaded');