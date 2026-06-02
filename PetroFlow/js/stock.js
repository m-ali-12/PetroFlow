// =============================================
// FILE: js/stock.js  (v3 — Fixed + Edit/Delete)
// Stock Management — Khalid and Sons Petroleum
// Table: stock_entries (primary), tanks (stock level)
// =============================================

document.addEventListener('DOMContentLoaded', function () {
    if (document.body.dataset.page !== 'stock') return;

    // Fast path: session already ready
    if (window.PETRO_SESSION_READY) {
        initStockPage();
    } else {
        // Wait for auth.js
        document.addEventListener('petroSessionReady', initStockPage);
    }
});

async function initStockPage() {
    const now = new Date();
    const monthVal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const mf = document.getElementById('filter-month');
    if (mf) mf.value = monthVal;

    const di = document.getElementById('purchase-date-input');
    if (di) di.value = now.toISOString().split('T')[0];

    await Promise.all([
        loadCurrentStock(),
        loadHistory(),
        loadMonthlyStats(),
        loadMonthlyChart()
    ]);
    setupLiveCalc();
}

// =============================================
// Live Calculation
// =============================================
function setupLiveCalc() {
    ['liters-input','rate-input','charges-input','fuel-type'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', updateCalc);
    });
}

function updateCalc() {
    const liters  = parseFloat(document.getElementById('liters-input')?.value)  || 0;
    const rate    = parseFloat(document.getElementById('rate-input')?.value)    || 0;
    const charges = parseFloat(document.getElementById('charges-input')?.value) || 0;
    const fuel    = document.getElementById('fuel-type')?.value || '';
    const subtotal   = liters * rate;
    const netPayable = subtotal + charges;

    const box = document.getElementById('calc-preview');
    if (!box) return;

    if (liters > 0 || rate > 0) {
        box.style.display = 'block';
        setText('calc-fuel',     fuel || '—');
        setText('calc-liters',   formatNum(liters) + ' L');
        setText('calc-rate',     'Rs. ' + formatNum(rate));
        setText('calc-subtotal', 'Rs. ' + formatNum(subtotal));
        setText('calc-charges',  charges > 0 ? 'Rs. ' + formatNum(charges) : '—');
        setText('calc-total',    'Rs. ' + formatNum(netPayable));
    } else {
        box.style.display = 'none';
    }
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}


function companyId() { return window.currentUserProfile?.company_id || null; }

async function selectTankByFuel(fuelType) {
    const cid = companyId();
    try {
        let q = window.supabaseClient.from('tanks').select('*').eq('fuel_type', fuelType);
        if (cid) q = q.eq('company_id', cid);
        const { data, error } = await q.maybeSingle();
        if (error) throw error;
        return data || null;
    } catch (e) {
        if (/company_id|schema cache|column/i.test(e.message || '')) {
            const { data, error } = await window.supabaseClient
                .from('tanks').select('*').eq('fuel_type', fuelType).maybeSingle();
            if (error) throw error;
            return data || null;
        }
        throw e;
    }
}

async function insertStockEntryCompat(payload, legacyPayload) {
    const attempts = [payload, legacyPayload];
    let lastError = null;
    for (const row of attempts) {
        const { data, error } = await window.supabaseClient
            .from('stock_entries')
            .insert([row])
            .select()
            .single();
        if (!error) return data;
        lastError = error;
        console.warn('stock_entries insert retry:', error.message);
    }
    throw lastError;
}

// =============================================
// Load Current Tank Stock
// =============================================
async function loadCurrentStock() {
    try {
        const cid = companyId();
        let query = window.supabaseClient.from('tanks').select('*');
        if (cid) query = query.eq('company_id', cid);
        let { data, error } = await query;
        if (error && /company_id|schema cache|column/i.test(error.message || '')) {
            ({ data, error } = await window.supabaseClient.from('tanks').select('*'));
        }
        if (error) { console.error('Tank load error:', error); return; }

        const petrol = data?.find(t => t.fuel_type === 'Petrol') || { current_stock: 0, capacity: 25000 };
        const diesel = data?.find(t => t.fuel_type === 'Diesel') || { current_stock: 0, capacity: 25000 };

        renderTank('petrol', petrol);
        renderTank('diesel', diesel);

        if (parseFloat(petrol.current_stock||0) < 2000 || parseFloat(diesel.current_stock||0) < 2000) {
            showToast('⚠️ Stock kam hai! Jaldi fill karein.', 'warning');
        }
    } catch (err) {
        console.error('loadCurrentStock error:', err);
    }
}

function renderTank(type, tank) {
    const stock = parseFloat(tank.current_stock || 0);
    const cap   = parseFloat(tank.capacity || 25000);
    setText(`${type}-stock-display`, formatNum(stock));
    setText(`${type}-cap-display`,   formatNum(cap));
    const bar = document.getElementById(`${type}-bar`);
    if (bar) bar.style.width = Math.min((stock / cap) * 100, 100) + '%';
    const upd = document.getElementById(`${type}-updated`);
    if (upd) upd.textContent = tank.last_updated
        ? formatDateTime(tank.last_updated)
        : (tank.updated_at ? formatDateTime(tank.updated_at) : '—');
}

// =============================================
// Submit Stock Entry
// =============================================
async function submitStock() {
    const fuelType     = document.getElementById('fuel-type').value;
    const liters       = parseFloat(document.getElementById('liters-input').value);
    const rate         = parseFloat(document.getElementById('rate-input').value);
    const supplier     = document.getElementById('supplier-input')?.value.trim()   || '';
    const truck        = document.getElementById('truck-input')?.value.trim()      || '';
    const charges      = parseFloat(document.getElementById('charges-input')?.value) || 0;
    const invoiceNo    = document.getElementById('invoice-no-input')?.value.trim() || '';
    const purchaseDate = document.getElementById('purchase-date-input')?.value     || new Date().toISOString().split('T')[0];
    const notes        = document.getElementById('notes-input')?.value.trim()      || '';

    if (!fuelType)              return showToast('Fuel type select karein!', 'danger');
    if (!liters || liters <= 0) return showToast('Liters sahi darj karein!', 'danger');
    if (!rate   || rate   <= 0) return showToast('Rate per liter darj karein!', 'danger');

    const totalAmount = liters * rate;
    const netPayable  = totalAmount + charges;
    const genInvoice  = invoiceNo || generateInvoiceNumber();

    const btn = document.getElementById('add-stock-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...';

    try {
        // Try full insert first
        let entry = null;
        const fullPayload = {
            invoice_number:  genInvoice,
            fuel_type:       fuelType,
            liters:          liters,
            price_per_liter: rate,
            total_amount:    totalAmount,
            supplier_name:   supplier || null,
            truck_number:    truck    || null,
            notes:           notes    || null,
            charges:         charges  || null,
            net_payable:     netPayable,
            purchase_date:   purchaseDate
        };

        const legacyPayload = {
            fuel_type:  fuelType,
            entry_type: 'purchase',
            liters:     liters,
            unit_price: rate,
            total_cost: totalAmount,
            charges:    charges || 0,
            invoice_no: genInvoice,
            truck_no:   truck || null,
            entry_date: purchaseDate,
            notes:      [supplier ? `Supplier: ${supplier}` : '', notes || ''].filter(Boolean).join(' | ') || null
        };
        entry = await insertStockEntryCompat(fullPayload, legacyPayload);

        // Update tank stock
        await updateTankStock(fuelType, liters, 'add');

        showInvoice({
            invoiceNumber: genInvoice, fuelType, liters, rate,
            totalAmount, charges, netPayable, supplier, truck, notes,
            purchaseDate, createdAt: entry.created_at
        });

        // Reset form
        ['fuel-type','liters-input','rate-input','supplier-input','truck-input',
         'charges-input','invoice-no-input','notes-input'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const di = document.getElementById('purchase-date-input');
        if (di) di.value = new Date().toISOString().split('T')[0];
        const cp = document.getElementById('calc-preview');
        if (cp) cp.style.display = 'none';

        await Promise.all([loadCurrentStock(), loadHistory(), loadMonthlyStats(), loadMonthlyChart()]);
        showToast(`✅ ${fuelType} stock add ho gaya!`, 'success');

    } catch (err) {
        console.error('submitStock error:', err);
        showToast('Error: ' + (err.message || 'Kuch masla hua'), 'danger');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-plus-lg me-2"></i>Stock Add Karein & Invoice Banayein';
    }
}

async function updateTankStock(fuelType, liters, action = 'add') {
    const qty = parseFloat(liters) || 0;
    if (!fuelType || qty <= 0) return;

    const cid = companyId();
    const tank = await selectTankByFuel(fuelType);
    const cur = parseFloat(tank?.current_stock || 0);
    const newStock = action === 'add' ? cur + qty : Math.max(0, cur - qty);

    if (tank?.id) {
        const { error } = await window.supabaseClient
            .from('tanks')
            .update({ current_stock: newStock, last_updated: new Date().toISOString() })
            .eq('id', tank.id);
        if (error) throw error;
        return;
    }

    const insertRow = {
        fuel_type: fuelType,
        current_stock: newStock,
        capacity: 25000,
        last_updated: new Date().toISOString(),
        name: `${fuelType} Tank`
    };
    if (cid) insertRow.company_id = cid;

    let { error } = await window.supabaseClient.from('tanks').insert([insertRow]);
    if (error && /company_id|schema cache|column/i.test(error.message || '')) {
        delete insertRow.company_id;
        ({ error } = await window.supabaseClient.from('tanks').insert([insertRow]));
    }
    if (error) throw error;
}

// =============================================
// Load History
// =============================================
async function loadHistory() {
    const tbody = document.getElementById('history-tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="10" class="text-center py-3">
        <span class="spinner-border spinner-border-sm me-2"></span>Loading...</td></tr>`;

    try {
        const filterFuel  = document.getElementById('filter-fuel')?.value  || '';
        const filterMonth = document.getElementById('filter-month')?.value || '';

        let query = window.supabaseClient
            .from('stock_entries')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);

        if (filterFuel) query = query.eq('fuel_type', filterFuel);

        if (filterMonth) {
            const [yr, mo] = filterMonth.split('-');
            const start = `${yr}-${mo}-01`;
            const lastD = new Date(parseInt(yr), parseInt(mo), 0).getDate();
            const end   = `${yr}-${mo}-${String(lastD).padStart(2,'0')}`;
            
            // Filter by purchase_date first, fallback to created_at if missing
            // Since we want to see backdated entries in the month they were recorded for
            query = query.or(`purchase_date.gte.${start},and(purchase_date.is.null,created_at.gte.${start}T00:00:00)`)
                         .or(`purchase_date.lte.${end},and(purchase_date.is.null,created_at.lte.${end}T23:59:59)`);
        }

        const { data, error } = await query;
        console.log('History:', data?.length, 'records', error ? '❌ ' + error.message : '✅');
        if (error) throw error;

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-4">
                <i class="bi bi-inbox me-2"></i>Is period mein koi entry nahi mili</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(e => {
            const dateStr   = e.purchase_date ? formatDate(e.purchase_date) : formatDateTime(e.created_at);
            const net       = parseFloat(e.net_payable || e.total_amount);
            const ch        = parseFloat(e.charges || 0);
            const fuelBadge = e.fuel_type === 'Petrol'
                ? 'bg-success' : 'bg-warning text-dark';

            return `
            <tr id="row-${e.id}">
                <td class="text-muted small">${dateStr}</td>
                <td><span class="badge bg-light text-dark border fw-600" style="font-family:monospace;font-size:0.72rem;">${e.invoice_number || '—'}</span></td>
                <td><span class="badge ${fuelBadge}">${e.fuel_type}</span></td>
                <td class="fw-600">${formatNum(e.liters)} L</td>
                <td>Rs. ${formatNum(e.price_per_liter)}</td>
                <td>Rs. ${formatNum(e.total_amount)}</td>
                <td class="text-muted small">${ch > 0 ? 'Rs. '+formatNum(ch) : '—'}</td>
                <td class="fw-700 text-primary">Rs. ${formatNum(net)}</td>
                <td class="text-muted small">${e.truck_number || '—'}</td>
                <td>
                    <div class="d-flex gap-1 flex-nowrap">
                        <button class="btn btn-sm btn-outline-primary py-0 px-2" title="Invoice" onclick="showInvoiceById(${e.id})">
                            <i class="bi bi-receipt"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-warning py-0 px-2" title="Edit" onclick="openEditModal(${e.id})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger py-0 px-2" title="Delete" onclick="deleteEntry(${e.id}, '${e.fuel_type}', ${e.liters})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');

    } catch (err) {
        console.error('loadHistory error:', err);
        tbody.innerHTML = `<tr><td colspan="10" class="text-center text-danger py-3">
            <i class="bi bi-exclamation-triangle me-2"></i>History load nahi ho saki: ${err.message}</td></tr>`;
    }
}

// =============================================
// DELETE Entry
// =============================================
async function deleteEntry(id, fuelType, liters) {
    if (!confirm(`⚠️ Delete Confirmation\n\n${fuelType} — ${formatNum(liters)} L\n\nKya aap sach mein delete karna chahte hain?\nYe undo nahi ho sakta!`)) return;

    try {
        const { error } = await window.supabaseClient
            .from('stock_entries')
            .delete()
            .eq('id', id);
        if (error) throw error;

        // Deduct from tank
        await updateTankStock(fuelType, liters, 'subtract');

        const row = document.getElementById(`row-${id}`);
        if (row) { row.style.opacity = '0'; row.style.transition = '0.3s'; setTimeout(() => row.remove(), 300); }

        await Promise.all([loadCurrentStock(), loadMonthlyStats(), loadMonthlyChart()]);
        showToast('🗑️ Entry delete ho gayi aur tank update ho gaya', 'success');

    } catch (err) {
        console.error('deleteEntry error:', err);
        showToast('Delete error: ' + err.message, 'danger');
    }
}

// =============================================
// EDIT — Open Modal
// =============================================
async function openEditModal(id) {
    try {
        const { data, error } = await window.supabaseClient
            .from('stock_entries').select('*').eq('id', id).single();
        if (error || !data) return showToast('Entry nahi mili', 'danger');

        document.getElementById('edit-id').value         = data.id;
        document.getElementById('edit-fuel').value       = data.fuel_type;
        document.getElementById('edit-date').value       = data.purchase_date || (data.created_at?.split('T')[0] || '');
        document.getElementById('edit-liters').value     = data.liters;
        document.getElementById('edit-rate').value       = data.price_per_liter;
        document.getElementById('edit-supplier').value   = data.supplier_name  || '';
        document.getElementById('edit-truck').value      = data.truck_number   || '';
        document.getElementById('edit-invoice-no').value = data.invoice_number || '';
        document.getElementById('edit-charges').value    = data.charges        || '';
        document.getElementById('edit-notes').value      = data.notes          || '';

        const idEl = document.getElementById('edit-id');
        idEl.dataset.origLiters   = data.liters;
        idEl.dataset.origFuelType = data.fuel_type;

        new bootstrap.Modal(document.getElementById('editModal')).show();

    } catch (err) {
        console.error('openEditModal error:', err);
        showToast('Error: ' + err.message, 'danger');
    }
}

// =============================================
// EDIT — Save
// =============================================
async function saveEdit() {
    const idEl        = document.getElementById('edit-id');
    const id          = parseInt(idEl.value);
    const origLiters  = parseFloat(idEl.dataset.origLiters);
    const origFuel    = idEl.dataset.origFuelType;
    const fuelType    = document.getElementById('edit-fuel').value;
    const liters      = parseFloat(document.getElementById('edit-liters').value);
    const rate        = parseFloat(document.getElementById('edit-rate').value);
    const supplier    = document.getElementById('edit-supplier').value.trim();
    const truck       = document.getElementById('edit-truck').value.trim();
    const invoiceNo   = document.getElementById('edit-invoice-no').value.trim();
    const charges     = parseFloat(document.getElementById('edit-charges').value) || 0;
    const purchDate   = document.getElementById('edit-date').value;
    const notes       = document.getElementById('edit-notes').value.trim();

    if (!liters || liters <= 0) return showToast('Liters sahi darj karein!', 'danger');
    if (!rate   || rate   <= 0) return showToast('Rate darj karein!', 'danger');

    const totalAmount = liters * rate;
    const netPayable  = totalAmount + charges;

    const saveBtn = document.getElementById('save-edit-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

    try {
        // Try full update
        let updateErr = null;
        const fullUpdate = {
            fuel_type: fuelType, liters, price_per_liter: rate,
            total_amount: totalAmount, supplier_name: supplier || null,
            truck_number: truck || null, invoice_number: invoiceNo || null,
            charges: charges || null, net_payable: netPayable,
            notes: notes || null, purchase_date: purchDate || null
        };

        const { error: e1 } = await window.supabaseClient
            .from('stock_entries').update(fullUpdate).eq('id', id);

        if (e1) {
            console.warn('Full update failed, trying core:', e1.message);
            const { error: e2 } = await window.supabaseClient
                .from('stock_entries')
                .update({
                    fuel_type: fuelType, liters, price_per_liter: rate,
                    total_amount: totalAmount, supplier_name: supplier || null,
                    truck_number: truck || null, notes: notes || null
                })
                .eq('id', id);
            if (e2) throw e2;
        }

        // Recalculate tanks
        if (origFuel === fuelType) {
            // Same fuel: adjust difference
            const diff = liters - origLiters;
            if (diff > 0) await updateTankStock(fuelType, diff, 'add');
            if (diff < 0) await updateTankStock(fuelType, Math.abs(diff), 'subtract');
        } else {
            // Fuel changed: deduct from old, add to new
            await updateTankStock(origFuel, origLiters, 'subtract');
            await updateTankStock(fuelType, liters, 'add');
        }

        bootstrap.Modal.getInstance(document.getElementById('editModal'))?.hide();
        await Promise.all([loadCurrentStock(), loadHistory(), loadMonthlyStats(), loadMonthlyChart()]);
        showToast('✅ Entry update ho gayi!', 'success');

    } catch (err) {
        console.error('saveEdit error:', err);
        showToast('Save error: ' + err.message, 'danger');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="bi bi-check-lg me-2"></i>Save Changes';
    }
}

// =============================================
// Monthly Stats
// =============================================
async function loadMonthlyStats() {
    try {
        const now   = new Date();
        const yr    = now.getFullYear();
        const mo    = String(now.getMonth() + 1).padStart(2, '0');
        const start = `${yr}-${mo}-01T00:00:00`;
        const end   = `${yr}-${mo}-${new Date(yr, now.getMonth()+1, 0).getDate()}T23:59:59`;

        const { data, error } = await window.supabaseClient
            .from('stock_entries')
            .select('fuel_type, liters, total_amount, net_payable')
            .gte('created_at', start).lte('created_at', end);

        if (error) throw error;

        let pL=0,pAmt=0,dL=0,dAmt=0,pC=0,dC=0;
        (data||[]).forEach(e => {
            const l=parseFloat(e.liters), a=parseFloat(e.net_payable||e.total_amount);
            if (e.fuel_type==='Petrol') { pL+=l; pAmt+=a; pC++; }
            else                        { dL+=l; dAmt+=a; dC++; }
        });

        const monthName = now.toLocaleString('en-PK', { month:'long', year:'numeric' });
        document.getElementById('monthly-stats').innerHTML = `
            <div class="text-center mb-2"><small class="fw-600 text-muted" style="font-size:0.72rem;">${monthName}</small></div>
            <div class="mb-3 pb-3 border-bottom">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="d-flex align-items-center gap-2"><span class="badge bg-success" style="font-size:0.65rem;">P</span><span class="fw-600">Petrol</span></span>
                    <span class="badge bg-light text-muted border" style="font-size:0.65rem;">${pC} entries</span>
                </div>
                <div class="d-flex justify-content-between"><span class="text-muted small">Liters</span><span class="fw-600">${formatNum(pL)} L</span></div>
                <div class="d-flex justify-content-between"><span class="text-muted small">Total</span><span class="fw-600 text-primary">Rs. ${formatNum(pAmt)}</span></div>
            </div>
            <div class="mb-3 pb-3 border-bottom">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="d-flex align-items-center gap-2"><span class="badge bg-warning text-dark" style="font-size:0.65rem;">D</span><span class="fw-600">Diesel</span></span>
                    <span class="badge bg-light text-muted border" style="font-size:0.65rem;">${dC} entries</span>
                </div>
                <div class="d-flex justify-content-between"><span class="text-muted small">Liters</span><span class="fw-600">${formatNum(dL)} L</span></div>
                <div class="d-flex justify-content-between"><span class="text-muted small">Total</span><span class="fw-600 text-primary">Rs. ${formatNum(dAmt)}</span></div>
            </div>
            <div class="d-flex justify-content-between fw-700">
                <span>Grand Total</span><span class="text-danger">Rs. ${formatNum(pAmt+dAmt)}</span>
            </div>`;
    } catch(err) { console.error('loadMonthlyStats error:', err); }
}

// =============================================
// 6-Month Chart
// =============================================
async function loadMonthlyChart() {
    const c = document.getElementById('monthly-chart-container');
    if (!c) return;
    try {
        const now   = new Date();
        const sixAgo= new Date(now.getFullYear(), now.getMonth()-5, 1).toISOString();
        const { data, error } = await window.supabaseClient
            .from('stock_entries')
            .select('fuel_type, liters, created_at')
            .gte('created_at', sixAgo);

        if (error) throw error;

        const map = {};
        (data||[]).forEach(e => {
            const d=new Date(e.created_at);
            const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            if (!map[k]) map[k]={pL:0,dL:0};
            if (e.fuel_type==='Petrol') map[k].pL+=parseFloat(e.liters);
            else                        map[k].dL+=parseFloat(e.liters);
        });

        const months = Object.keys(map).sort();
        const maxL   = Math.max(...months.map(m=>map[m].pL+map[m].dL),1);
        const nowKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

        if (!months.length) { c.innerHTML='<div class="text-center text-muted py-3 small">Data nahi mila</div>'; return; }

        c.innerHTML = `
            <div class="d-flex align-items-end gap-1 justify-content-center" style="height:110px;padding-bottom:4px;">
                ${months.map(m=>{
                    const pp=(map[m].pL/maxL)*100, dp=(map[m].dL/maxL)*100;
                    const lbl=new Date(m+'-01').toLocaleString('en-PK',{month:'short',year:'2-digit'});
                    const cur=m===nowKey;
                    return `<div class="d-flex flex-column align-items-center flex-grow-1" style="max-width:55px;"
                        title="${lbl}: Petrol ${formatNum(map[m].pL)}L, Diesel ${formatNum(map[m].dL)}L">
                        <div class="w-100 d-flex flex-column justify-content-end" style="height:90px;gap:1px;">
                            <div style="height:${dp}%;background:#b45309;border-radius:3px 3px 0 0;min-height:${map[m].dL>0?'3':'0'}px;"></div>
                            <div style="height:${pp}%;background:#0d6e3f;border-radius:3px 3px 0 0;min-height:${map[m].pL>0?'3':'0'}px;"></div>
                        </div>
                        <div style="font-size:0.6rem;color:${cur?'#2563eb':'#94a3b8'};font-weight:${cur?700:400};margin-top:2px;">${lbl}</div>
                    </div>`;
                }).join('')}
            </div>
            <div class="d-flex justify-content-center gap-3 mt-1">
                <span style="font-size:0.68rem;color:#0d6e3f;"><span style="display:inline-block;width:8px;height:8px;background:#0d6e3f;border-radius:2px;margin-right:3px;"></span>Petrol</span>
                <span style="font-size:0.68rem;color:#b45309;"><span style="display:inline-block;width:8px;height:8px;background:#b45309;border-radius:2px;margin-right:3px;"></span>Diesel</span>
            </div>`;
    } catch(err) {
        console.error('loadMonthlyChart error:', err);
        c.innerHTML='<div class="text-center text-muted py-2 small">Chart load nahi hua</div>';
    }
}

// =============================================
// Show Invoice by ID
// =============================================
async function showInvoiceById(id) {
    try {
        const { data, error } = await window.supabaseClient
            .from('stock_entries').select('*').eq('id', id).single();
        if (error || !data) return showToast('Invoice nahi mili', 'danger');

        showInvoice({
            invoiceNumber: data.invoice_number, fuelType: data.fuel_type,
            liters: data.liters, rate: data.price_per_liter,
            totalAmount: data.total_amount, charges: data.charges,
            netPayable: data.net_payable || data.total_amount,
            supplier: data.supplier_name, truck: data.truck_number,
            notes: data.notes, purchaseDate: data.purchase_date,
            createdAt: data.created_at
        });
    } catch (err) { console.error('showInvoiceById error:', err); }
}

// =============================================
// Invoice HTML
// =============================================
function showInvoice(d) {
    const { invoiceNumber,fuelType,liters,rate,totalAmount,charges,netPayable,supplier,truck,notes,purchaseDate,createdAt } = d;
    const dateStr   = purchaseDate ? formatDate(purchaseDate) : formatDateTime(createdAt||new Date().toISOString());
    const fuelColor = fuelType==='Petrol'?'#0d6e3f':'#b45309';
    const fuelBg    = fuelType==='Petrol'?'#e6f4ec':'#fef3c7';
    const net = parseFloat(netPayable||totalAmount);
    const ch  = parseFloat(charges||0);

    document.getElementById('invoice-preview').innerHTML = `
        <div style="background:#fff;">
            <div class="invoice-header">
                <div class="row align-items-center">
                    <div class="col-8">
                        <div class="invoice-company">Khalid and Sons Petroleum</div>
                        <div style="font-size:0.85rem;color:rgba(255,255,255,0.7);margin-top:4px;">Pakistan · GO Authorized Dealer</div>
                    </div>
                    <div class="col-4 text-end">
                        <div style="font-size:0.7rem;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.6);">Stock Invoice</div>
                        <div style="font-family:monospace;font-size:1rem;font-weight:700;margin-top:2px;">${invoiceNumber||'—'}</div>
                    </div>
                </div>
            </div>
            <div class="invoice-body">
                <div class="row mb-4">
                    <div class="col-3"><div class="invoice-label">Date</div><div class="invoice-value">${dateStr}</div></div>
                    <div class="col-3"><div class="invoice-label">Supplier</div><div class="invoice-value">${supplier||'—'}</div></div>
                    <div class="col-3"><div class="invoice-label">Truck No.</div><div class="invoice-value">${truck||'—'}</div></div>
                    <div class="col-3"><div class="invoice-label">Invoice No.</div><div class="invoice-value" style="font-family:monospace;font-size:0.85rem;">${invoiceNumber||'—'}</div></div>
                </div>
                <div class="mb-4">
                    <span style="background:${fuelBg};color:${fuelColor};padding:6px 16px;border-radius:20px;font-size:0.8rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">
                        ⛽ ${fuelType} Stock Receiving
                    </span>
                </div>
                <table class="table invoice-table mb-4">
                    <thead><tr><th>Description</th><th class="text-end">Qty (L)</th><th class="text-end">Rate/L</th><th class="text-end">Amount</th></tr></thead>
                    <tbody>
                        <tr>
                            <td class="fw-600">${fuelType} Stock Purchase</td>
                            <td class="text-end">${formatNum(liters)} L</td>
                            <td class="text-end">Rs. ${formatNum(rate)}</td>
                            <td class="text-end fw-700">Rs. ${formatNum(totalAmount)}</td>
                        </tr>
                        ${ch>0?`<tr><td class="text-muted">Extra Charges</td><td class="text-end">—</td><td class="text-end">—</td><td class="text-end text-warning fw-600">Rs. ${formatNum(ch)}</td></tr>`:''}
                    </tbody>
                </table>
                <div class="row justify-content-end mb-4">
                    <div class="col-md-5">
                        <div class="invoice-total-box">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <div style="font-size:0.7rem;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.7);">Net Payable</div>
                                    <div style="font-family:'Playfair Display',serif;font-size:1.8rem;font-weight:800;line-height:1.1;">Rs. ${formatNum(net)}</div>
                                </div>
                                <i class="bi bi-cash-stack" style="font-size:2rem;opacity:0.4;"></i>
                            </div>
                        </div>
                    </div>
                </div>
                ${notes?`<div class="p-3 mb-3" style="background:#f8fafc;border-radius:8px;border-left:3px solid #e2e8f0;"><div class="invoice-label mb-1">Notes</div><div style="font-size:0.9rem;">${notes}</div></div>`:''}
                <hr class="mt-4 mb-3">
                <div class="row">
                    <div class="col-6"><div class="invoice-label">Generated by</div><div class="invoice-value">PetroFlow System</div></div>
                    <div class="col-6 text-end"><div class="invoice-label">Ref.</div><div class="invoice-value" style="font-family:monospace;font-size:0.85rem;">${invoiceNumber||'—'}</div></div>
                </div>
            </div>
        </div>`;
    new bootstrap.Modal(document.getElementById('invoiceModal')).show();
}

function downloadInvoice() { window.print(); }

// =============================================
// Helpers
// =============================================
function generateInvoiceNumber() {
    const n=new Date();
    return `KSP-${String(n.getFullYear()).slice(-2)}${String(n.getMonth()+1).padStart(2,'0')}${String(n.getDate()).padStart(2,'0')}-${Math.floor(1000+Math.random()*9000)}`;
}
function formatNum(num) {
    return parseFloat(num||0).toLocaleString('en-PK',{minimumFractionDigits:0,maximumFractionDigits:2});
}
function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-PK',{day:'2-digit',month:'short',year:'numeric'});
}
function formatDateTime(iso) {
    return new Date(iso).toLocaleString('en-PK',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
}
function showToast(msg, type='info') {
    const el=document.getElementById('liveToast');
    const tm=document.getElementById('toast-msg');
    if (!el||!tm) return;
    el.className=`toast align-items-center text-bg-${type} border-0`;
    tm.textContent=msg;
    bootstrap.Toast.getOrCreateInstance(el,{delay:4000}).show();
}
function clearFilters() {
    const now=new Date();
    const mf=document.getElementById('filter-month');
    if (mf) mf.value=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const ff=document.getElementById('filter-fuel');
    if (ff) ff.value='';
    loadHistory();
}

// =============================================
// Exports
// =============================================
window.submitStock     = submitStock;
window.loadHistory     = loadHistory;
window.showInvoiceById = showInvoiceById;
window.downloadInvoice = downloadInvoice;
window.deleteEntry     = deleteEntry;
window.openEditModal   = openEditModal;
window.saveEdit        = saveEdit;
window.clearFilters    = clearFilters;

console.log('✅ Stock.js v3 loaded');