// =============================================
// FILE: js/reports.js — WITH USER_ID FILTERING
// =============================================
(function(){
'use strict';

function sb() { return window.supabaseClient; }
function uid() { return window.currentUserId; }
function $(id) { return document.getElementById(id); }
function fmt(n) { return Number(n||0).toLocaleString('en-PK',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtDate(d) { return new Date(d).toLocaleDateString('en-PK',{day:'2-digit',month:'2-digit',year:'numeric'}); }

function showToast(msg, type='info') {
    const el = $('liveToast');
    if (!el) { alert(msg); return; }
    const tm = $('toast-message'); if(tm) tm.textContent = msg;
    const th = $('toast-title'); if(th) th.textContent = {success:'Success',error:'Error',warning:'Warning',info:'Info'}[type]||'Info';
    new bootstrap.Toast(el).show();
}

function waitForReady(cb) {
    if (window.supabaseClient && window.currentUserId) cb();
    else setTimeout(() => waitForReady(cb), 150);
}

document.addEventListener('DOMContentLoaded', () => {
    waitForReady(() => { loadCustomersForSelect(); populateYears(); });
});

// ---- REPORT TYPE SELECTOR ----
window.selectReportType = function(type) {
    document.querySelectorAll('.report-section').forEach(s => s.style.display = 'none');
    const el = $(type + '-section');
    if (el) el.style.display = 'block';
};

// ---- DAILY REPORT ----
window.loadDailyReport = async function() {
    const date = $('daily-date')?.value;
    if (!date) return showToast('Please select a date', 'warning');
    const start = new Date(date); start.setHours(0,0,0,0);
    const end   = new Date(date); end.setHours(23,59,59,999);

    const { data, error } = await sb()
        .from('transactions')
        .select('*, customer:customers(name, sr_no), tank:tanks(fuel_type)')
        .eq('user_id', uid())
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: true });

    if (error) { showToast('Error: ' + error.message, 'error'); return; }
    renderDailyReport(data || [], date);
};

function renderDailyReport(data, date) {
    const container = $('report-output');
    if (!container) return;
    if (!data.length) { container.innerHTML = '<div class="alert alert-info">Is date ka koi data nahi</div>'; return; }

    let sales=0, payments=0, expenses=0;
    const rows = data.map((t,i) => {
        const amt = parseFloat(t.amount||0);
        if (t.transaction_type==='Credit') sales += amt;
        else if (t.transaction_type==='Debit') payments += amt;
        else expenses += amt;
        return `<tr>
            <td>${i+1}</td>
            <td>${fmtDate(t.created_at)}</td>
            <td>${t.customer?.name||'-'}</td>
            <td><span class="badge bg-${t.transaction_type==='Credit'?'danger':t.transaction_type==='Debit'?'success':'warning'}">${t.transaction_type}</span></td>
            <td>${t.tank?.fuel_type||t.description||'-'}</td>
            <td>${fmt(t.liters||0)}</td>
            <td>${fmt(t.unit_price||0)}</td>
            <td>${fmt(amt)}</td>
        </tr>`;
    }).join('');

    container.innerHTML = `
        <div class="card"><div class="card-body">
        <h5 class="mb-3">Daily Report — ${fmtDate(date)}</h5>
        <div class="row mb-3">
            <div class="col-md-3"><div class="card bg-danger text-white p-2 text-center"><small>Sales</small><strong>Rs. ${fmt(sales)}</strong></div></div>
            <div class="col-md-3"><div class="card bg-success text-white p-2 text-center"><small>Payments</small><strong>Rs. ${fmt(payments)}</strong></div></div>
            <div class="col-md-3"><div class="card bg-warning p-2 text-center"><small>Expenses</small><strong>Rs. ${fmt(expenses)}</strong></div></div>
            <div class="col-md-3"><div class="card bg-primary text-white p-2 text-center"><small>Net</small><strong>Rs. ${fmt(sales-payments-expenses)}</strong></div></div>
        </div>
        <div class="table-responsive"><table class="table table-sm table-bordered">
            <thead class="table-dark"><tr><th>#</th><th>Date</th><th>Customer</th><th>Type</th><th>Item</th><th>Liters</th><th>Rate</th><th>Amount</th></tr></thead>
            <tbody>${rows}</tbody>
        </table></div>
        <button class="btn btn-primary btn-sm mt-2" onclick="window.print()"><i class="bi bi-printer"></i> Print</button>
        </div></div>`;
}

// ---- CUSTOMER LEDGER ----
window.loadCustomerLedger = async function() {
    const customerId = $('customer-select')?.value;
    const fromDate   = $('customer-from-date')?.value;
    const toDate     = $('customer-to-date')?.value;
    if (!customerId||!fromDate||!toDate) return showToast('Please fill all fields', 'warning');

    const { data: customer } = await sb().from('customers').select('*').eq('id', customerId).eq('user_id', uid()).single();
    const { data, error } = await sb()
        .from('transactions')
        .select('*, tank:tanks(fuel_type)')
        .eq('customer_id', customerId)
        .eq('user_id', uid())
        .gte('created_at', new Date(fromDate).toISOString())
        .lte('created_at', new Date(toDate+'T23:59:59').toISOString())
        .order('created_at', { ascending: true });

    if (error) { showToast('Error: ' + error.message, 'error'); return; }
    renderLedger(data||[], customer||{}, fromDate, toDate);
};

function renderLedger(data, customer, fromDate, toDate) {
    const container = $('report-output');
    if (!container) return;
    if (!data.length) { container.innerHTML = '<div class="alert alert-info">Koi transaction nahi mila</div>'; return; }

    let total=0;
    const rows = data.map((t,i) => {
        const amt = parseFloat(t.amount||0);
        if (t.transaction_type==='Credit') total += amt;
        else if (t.transaction_type==='Debit') total -= amt;
        return `<tr>
            <td>${i+1}</td>
            <td>${fmtDate(t.created_at)}</td>
            <td>${t.id}</td>
            <td>${t.tank?.fuel_type||t.description||'-'}</td>
            <td>${fmt(t.liters||0)}</td>
            <td>${fmt(t.unit_price||0)}</td>
            <td>${t.transaction_type==='Credit'?fmt(t.amount):''}</td>
            <td>${t.transaction_type==='Debit'?fmt(t.amount):''}</td>
        </tr>`;
    }).join('');

    container.innerHTML = `
        <div class="card"><div class="card-body">
        <h5>Ledger: ${customer.name||''} (Leg ${customer.sr_no||''})</h5>
        <p class="text-muted">From: ${fmtDate(fromDate)} To: ${fmtDate(toDate)}</p>
        <div class="table-responsive"><table class="table table-sm table-bordered">
            <thead class="table-dark"><tr><th>#</th><th>Date</th><th>Slip#</th><th>Item</th><th>Liters</th><th>Rate</th><th>Debit</th><th>Credit</th></tr></thead>
            <tbody>${rows}
            <tr class="table-warning fw-bold"><td colspan="6">Balance</td><td colspan="2">Rs. ${fmt(total)}</td></tr>
            </tbody>
        </table></div>
        <button class="btn btn-primary btn-sm mt-2" onclick="window.print()"><i class="bi bi-printer"></i> Print</button>
        </div></div>`;
}

// ---- SUMMARY REPORT ----
window.loadSummaryReport = async function() {
    const fromDate = $('summary-from-date')?.value;
    const toDate   = $('summary-to-date')?.value;
    if (!fromDate||!toDate) return showToast('Please select date range', 'warning');

    const { data, error } = await sb()
        .from('transactions')
        .select('*, customer:customers(name, sr_no), tank:tanks(fuel_type)')
        .eq('user_id', uid())
        .gte('created_at', new Date(fromDate).toISOString())
        .lte('created_at', new Date(toDate+'T23:59:59').toISOString())
        .order('created_at', { ascending: true });

    if (error) { showToast('Error: ' + error.message, 'error'); return; }
    renderSummary(data||[], fromDate, toDate);
};

function renderSummary(data, fromDate, toDate) {
    const container = $('report-output');
    if (!container) return;
    let sales=0, payments=0, expenses=0, liters=0;
    data.forEach(t => {
        const a = parseFloat(t.amount||0);
        if(t.transaction_type==='Credit'){sales+=a; liters+=parseFloat(t.liters||0);}
        else if(t.transaction_type==='Debit') payments+=a;
        else expenses+=a;
    });

    container.innerHTML = `
        <div class="card"><div class="card-body">
        <h5>Summary: ${fmtDate(fromDate)} — ${fmtDate(toDate)}</h5>
        <div class="row">
            <div class="col-md-3"><div class="card bg-danger text-white p-3 text-center"><h6>Total Sales</h6><h4>Rs. ${fmt(sales)}</h4><small>${fmt(liters)} L</small></div></div>
            <div class="col-md-3"><div class="card bg-success text-white p-3 text-center"><h6>Payments Received</h6><h4>Rs. ${fmt(payments)}</h4></div></div>
            <div class="col-md-3"><div class="card bg-warning p-3 text-center"><h6>Expenses</h6><h4>Rs. ${fmt(expenses)}</h4></div></div>
            <div class="col-md-3"><div class="card bg-primary text-white p-3 text-center"><h6>Net Balance</h6><h4>Rs. ${fmt(sales-payments-expenses)}</h4></div></div>
        </div>
        <p class="mt-2 text-muted">Total transactions: ${data.length}</p>
        <button class="btn btn-primary btn-sm mt-2" onclick="window.print()"><i class="bi bi-printer"></i> Print</button>
        </div></div>`;
}

// ---- LOAD CUSTOMERS FOR SELECT ----
async function loadCustomersForSelect() {
    const { data, error } = await sb().from('customers').select('id, sr_no, name').eq('user_id', uid()).order('sr_no');
    if (error) return;
    const sel = $('customer-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">Customer Select Karein</option>';
    (data||[]).forEach(c => { sel.innerHTML += `<option value="${c.id}">${c.sr_no} - ${c.name}</option>`; });
}

function populateYears() {
    const sel = $('report-year');
    if (!sel) return;
    const current = new Date().getFullYear();
    for (let i = current; i >= current-5; i--) {
        const opt = document.createElement('option');
        opt.value = i; opt.textContent = i;
        if (i===current) opt.selected = true;
        sel.appendChild(opt);
    }
    // Set default dates
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];
    ['daily-date','customer-from-date','customer-to-date','summary-from-date','summary-to-date'].forEach(id => {
        const el = $(id);
        if (el) el.value = id.includes('from') ? firstOfMonth : today;
    });
}

})();
