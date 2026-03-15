// =============================================
// FILE: js/stock.js — WITH USER_ID FILTERING
// =============================================
(function () {
'use strict';

function sb() { return window.supabaseClient; }
function uid() { return window.currentUserId; }
function $(id) { return document.getElementById(id); }
function fmt(n) { return Number(n||0).toLocaleString('en-PK',{minimumFractionDigits:2,maximumFractionDigits:2}); }

function showToast(msg, type='info') {
    const el = $('liveToast');
    if (!el) return;
    const t = $('toast-message'); if(t) t.textContent = msg;
    const h = $('toast-title');
    const titles = {success:'Success',error:'Error',warning:'Warning',info:'Info'};
    if(h) h.textContent = titles[type]||'Info';
    new bootstrap.Toast(el).show();
}

function waitForReady(cb) {
    if (window.supabaseClient && window.currentUserId) cb();
    else setTimeout(() => waitForReady(cb), 150);
}

document.addEventListener('DOMContentLoaded', () => {
    if (!document.body.dataset.page || document.body.dataset.page !== 'stock') return;
    waitForReady(() => { loadTanks(); loadStockEntries(); loadStockStats(); });
});

// ---- TANKS ----
async function loadTanks() {
    const { data, error } = await sb().from('tanks').select('*').eq('user_id', uid());
    if (error) { console.error('Tanks error:', error); return; }
    const petrol = data?.find(t => t.fuel_type === 'Petrol');
    const diesel = data?.find(t => t.fuel_type === 'Diesel');
    ['Petrol','Diesel'].forEach(ft => {
        const tank = ft === 'Petrol' ? petrol : diesel;
        const prefix = ft.toLowerCase();
        const stock = parseFloat(tank?.current_stock || 0);
        const cap = parseFloat(tank?.capacity || 25000);
        const pct = Math.min(100, Math.round((stock/cap)*100));
        const el = $(prefix + 'Stock'); if(el) el.textContent = fmt(stock) + ' L';
        const bar = $(prefix + 'Bar'); if(bar) { bar.style.width = pct+'%'; bar.textContent = pct+'%'; }
    });
}

// ---- STOCK ENTRIES ----
async function loadStockEntries(filterFuel = '') {
    let q = sb().from('stock_entries').select('*').eq('user_id', uid()).order('created_at', { ascending: false });
    if (filterFuel) q = q.eq('fuel_type', filterFuel);
    const { data, error } = await q;
    if (error) { console.error('Stock entries error:', error); return; }
    renderStockTable(data || []);
}

function renderStockTable(data) {
    const tbody = $('stockTableBody');
    if (!tbody) return;
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="9" class="text-center">Koi record nahi</td></tr>'; return; }
    tbody.innerHTML = data.map(r => `
        <tr>
            <td>${r.invoice_number || '-'}</td>
            <td>${new Date(r.purchase_date || r.created_at).toLocaleDateString('en-PK')}</td>
            <td><span class="badge bg-${r.fuel_type==='Petrol'?'success':'primary'}">${r.fuel_type}</span></td>
            <td>${fmt(r.liters)}</td>
            <td>${fmt(r.price_per_liter)}</td>
            <td>${fmt(r.total_amount)}</td>
            <td>${fmt(r.charges||0)}</td>
            <td>${fmt(r.net_payable||r.total_amount)}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editStockEntry(${r.id})"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteStockEntry(${r.id})"><i class="bi bi-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

// ---- ADD STOCK ----
window.saveStockEntry = async function() {
    const fuelType     = $('fuelType')?.value;
    const liters       = parseFloat($('liters')?.value || 0);
    const pricePerLiter= parseFloat($('pricePerLiter')?.value || 0);
    const charges      = parseFloat($('charges')?.value || 0);
    const invoiceNo    = $('invoiceNumber')?.value || '';
    const truckNo      = $('truckNumber')?.value || '';
    const supplier     = $('supplierName')?.value || '';
    const purchaseDate = $('purchaseDate')?.value || new Date().toISOString().split('T')[0];
    const notes        = $('stockNotes')?.value || '';

    if (!fuelType) { showToast('Fuel type select karein!', 'warning'); return; }
    if (!liters)   { showToast('Liters enter karein!', 'warning'); return; }
    if (!pricePerLiter) { showToast('Price enter karein!', 'warning'); return; }

    const total_amount = liters * pricePerLiter;
    const net_payable  = total_amount + charges;

    // 1. Insert stock entry
    const { data: entry, error: entryErr } = await sb().from('stock_entries').insert([{
        user_id: uid(), fuel_type: fuelType, liters, price_per_liter: pricePerLiter,
        total_amount, charges, net_payable, invoice_number: invoiceNo, truck_number: truckNo,
        supplier_name: supplier, purchase_date: purchaseDate, notes
    }]).select().single();

    if (entryErr) { showToast('Entry save error: ' + entryErr.message, 'error'); return; }

    // 2. Update tank stock
    const { data: tank } = await sb().from('tanks').select('current_stock').eq('fuel_type', fuelType).eq('user_id', uid()).single();
    const newStock = parseFloat(tank?.current_stock || 0) + liters;
    await sb().from('tanks').update({ current_stock: newStock, last_updated: new Date().toISOString() }).eq('fuel_type', fuelType).eq('user_id', uid());

    showToast('Stock entry save ho gaya!', 'success');
    bootstrap.Modal.getInstance($('addStockModal'))?.hide();
    loadTanks();
    loadStockEntries();
    loadStockStats();
};

// ---- DELETE ----
window.deleteStockEntry = async function(id) {
    if (!confirm('Kya aap yeh entry delete karna chahte hain?')) return;
    const { data: entry } = await sb().from('stock_entries').select('fuel_type,liters').eq('id', id).eq('user_id', uid()).single();
    if (!entry) { showToast('Entry nahi mili', 'error'); return; }

    await sb().from('stock_entries').delete().eq('id', id).eq('user_id', uid());

    // Deduct from tank
    const { data: tank } = await sb().from('tanks').select('current_stock').eq('fuel_type', entry.fuel_type).eq('user_id', uid()).single();
    const newStock = Math.max(0, parseFloat(tank?.current_stock || 0) - parseFloat(entry.liters || 0));
    await sb().from('tanks').update({ current_stock: newStock }).eq('fuel_type', entry.fuel_type).eq('user_id', uid());

    showToast('Entry delete ho gaya', 'success');
    loadTanks(); loadStockEntries(); loadStockStats();
};

// ---- STATS ----
async function loadStockStats() {
    const { data } = await sb().from('stock_entries').select('fuel_type, liters, total_amount, net_payable').eq('user_id', uid());
    if (!data) return;
    let totalLiters = 0, totalAmount = 0;
    data.forEach(r => { totalLiters += parseFloat(r.liters||0); totalAmount += parseFloat(r.net_payable||r.total_amount||0); });
    const el1 = $('totalStockLiters'); if(el1) el1.textContent = fmt(totalLiters) + ' L';
    const el2 = $('totalStockAmount'); if(el2) el2.textContent = 'Rs. ' + fmt(totalAmount);
}

// ---- EDIT ----
window.editStockEntry = async function(id) {
    const { data, error } = await sb().from('stock_entries').select('*').eq('id', id).eq('user_id', uid()).single();
    if (error || !data) { showToast('Entry load error', 'error'); return; }
    const fields = { fuelType: data.fuel_type, liters: data.liters, pricePerLiter: data.price_per_liter, charges: data.charges, invoiceNumber: data.invoice_number, truckNumber: data.truck_number, supplierName: data.supplier_name, purchaseDate: data.purchase_date, stockNotes: data.notes };
    Object.entries(fields).forEach(([k,v]) => { const el=$(k); if(el) el.value = v||''; });
    const saveBtn = $('saveStockBtn');
    if (saveBtn) {
        saveBtn.onclick = async () => {
            const liters = parseFloat($('liters')?.value||0);
            const price  = parseFloat($('pricePerLiter')?.value||0);
            const charges= parseFloat($('charges')?.value||0);
            await sb().from('stock_entries').update({ fuel_type: $('fuelType')?.value, liters, price_per_liter: price, total_amount: liters*price, charges, net_payable: liters*price+charges, invoice_number: $('invoiceNumber')?.value, truck_number: $('truckNumber')?.value, supplier_name: $('supplierName')?.value, purchase_date: $('purchaseDate')?.value, notes: $('stockNotes')?.value }).eq('id', id).eq('user_id', uid());
            showToast('Stock updated!', 'success');
            bootstrap.Modal.getInstance($('addStockModal'))?.hide();
            loadStockEntries(); loadStockStats();
        };
    }
    new bootstrap.Modal($('addStockModal')).show();
};

// ---- FILTER ----
window.filterStockByFuel = function(fuel) { loadStockEntries(fuel); };

})();
