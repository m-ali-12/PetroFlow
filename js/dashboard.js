// =============================================
// FILE: js/dashboard.js  
// Dashboard Functions - Error Free
// =============================================

let dashboardTodayTransactions = [];

// Wait for DOM and auth
// Wait for DOM and then Auth
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard waiting for auth...');
    
    // Check if on index page
    if (document.body.dataset.page !== 'index') return;

    // If session is already ready (fast load)
    if (window.PETRO_SESSION_READY) {
        initDashboard();
    } else {
        // Wait for auth.js to signal reality
        document.addEventListener('petroSessionReady', () => {
            initDashboard();
        });
    }
});

// =============================================
// Initialize Dashboard
// =============================================
async function initDashboard() {
    try {
        console.log('Loading dashboard data...');
        
        // Load all data
        await Promise.all([
            loadStockData(),
            loadTodaySummary(),
            loadRecentTransactions()
        ]);
        
        console.log('✅ Dashboard loaded');
        
    } catch (error) {
        console.error('Dashboard init error:', error);
    }
}

// =============================================
// Load Stock Data
// =============================================
async function loadStockData() {
    try {
        // RLS requires an active auth session — wait for it
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (!session) {
            console.warn('loadStockData: no session yet, skipping');
            setStockDisplay(0, 0);
            return;
        }

        const { data, error } = await window.supabaseClient
            .from('tanks')
            .select('*');
        
        if (error) {
            console.error('Error loading stock:', error);
            return;
        }
        
        if (!data || data.length === 0) {
            console.log('No stock data');
            setStockDisplay(0, 0);
            return;
        }
        
        // Find petrol and diesel
        const petrol = data.find(t => t.fuel_type === 'Petrol') || { current_stock: 0, capacity: 25000 };
        const diesel = data.find(t => t.fuel_type === 'Diesel') || { current_stock: 0, capacity: 25000 };
        
        setStockDisplay(petrol.current_stock, diesel.current_stock);
        
    } catch (error) {
        console.error('Stock load exception:', error);
        setStockDisplay(0, 0);
    }
}

// =============================================
// Load Today's Summary
// =============================================
async function loadTodaySummary() {
    try {
        // RLS requires an active auth session
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (!session) { setSummaryDisplay(0, 0, 0); return; }

        const today = new Date().toISOString().split('T')[0];
        
        const { data, error } = await window.supabaseClient
            .from('transactions')
            .select('*')
            .gte('created_at', today + 'T00:00:00')
            .lte('created_at', today + 'T23:59:59');
        
        if (error) {
            console.error('Error loading summary:', error);
            return;
        }
        
        let sales = 0;
        let vasooli = 0;
        let expenses = 0;
        dashboardTodayTransactions = data || [];
        const customerIds = [...new Set(dashboardTodayTransactions.map(t => t.customer_id).filter(Boolean))];
        if (customerIds.length) {
            const { data: custData } = await window.supabaseClient
                .from('customers')
                .select('id,name,sr_no,balance')
                .in('id', customerIds);
            const cMap = {};
            (custData || []).forEach(c => cMap[c.id] = c);
            dashboardTodayTransactions.forEach(t => { t._customer = cMap[t.customer_id] || null; t._customerName = cMap[t.customer_id]?.name || null; });
        }
        
        if (dashboardTodayTransactions.length > 0) {
            dashboardTodayTransactions.forEach(t => {
                const a = parseFloat(t.charges ?? t.amount ?? 0) || 0;
                if (t.transaction_type === 'Credit' || t.transaction_type === 'CashSale') sales += a;
                else if (t.transaction_type === 'Debit') vasooli += a;
                else if (t.transaction_type === 'Expense') expenses += a;
            });
        }
        
        setSummaryDisplay(sales, vasooli, expenses);
        bindDashboardSummaryCards();
        
    } catch (error) {
        console.error('Summary load exception:', error);
        setSummaryDisplay(0, 0, 0);
    }
}

// =============================================
// Load Recent Transactions
// =============================================
async function loadRecentTransactions() {
    try {
        // Fetch recent transactions (no FK join to avoid PGRST200)
        const { data: txData, error: txError } = await window.supabaseClient
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (txError) {
            console.error('Error loading transactions:', txError);
            displayTransactions([]);
            return;
        }

        const transactions = txData || [];

        // Fetch customer names separately if we have customer_ids
        const customerIds = [...new Set(transactions.map(t => t.customer_id).filter(Boolean))];
        if (customerIds.length > 0) {
            const { data: custData } = await window.supabaseClient
                .from('customers')
                .select('id, name')
                .in('id', customerIds);
            
            const custMap = {};
            (custData || []).forEach(c => custMap[c.id] = c.name);
            transactions.forEach(t => { t._customerName = custMap[t.customer_id] || null; });
        }

        displayTransactions(transactions);
        
    } catch (error) {
        console.error('Transactions load exception:', error);
        displayTransactions([]);
    }
}

// =============================================
// Display Functions
// =============================================

function setStockDisplay(petrol, diesel) {
    const petrolEl = document.getElementById('petrol-stock');
    const dieselEl = document.getElementById('diesel-stock');
    const petrolCapEl = document.getElementById('petrol-capacity');
    const dieselCapEl = document.getElementById('diesel-capacity');
    const petrolProgress = document.getElementById('petrol-progress');
    const dieselProgress = document.getElementById('diesel-progress');
    
    if (petrolEl) petrolEl.textContent = formatNumber(petrol);
    if (dieselEl) dieselEl.textContent = formatNumber(diesel);
    if (petrolCapEl) petrolCapEl.textContent = '25,000';
    if (dieselCapEl) dieselCapEl.textContent = '25,000';
    
    if (petrolProgress) {
        const pct = (petrol / 25000) * 100;
        petrolProgress.style.width = pct + '%';
    }
    
    if (dieselProgress) {
        const pct = (diesel / 25000) * 100;
        dieselProgress.style.width = pct + '%';
    }
}

function setSummaryDisplay(sales, vasooli, expenses) {
    const salesEl = document.getElementById('today-sales');
    const vasooliEl = document.getElementById('today-vasooli');
    const expensesEl = document.getElementById('today-expenses');
    const netEl = document.getElementById('today-net');
    
    if (salesEl) salesEl.textContent = 'Rs. ' + formatNumber(sales);
    if (vasooliEl) vasooliEl.textContent = 'Rs. ' + formatNumber(vasooli);
    if (expensesEl) expensesEl.textContent = 'Rs. ' + formatNumber(expenses);
    
    const net = sales + vasooli - expenses;
    if (netEl) netEl.textContent = 'Rs. ' + formatNumber(net);
}

function displayTransactions(transactions) {
    const tbody = document.getElementById('recent-transactions');
    if (!tbody) return;
    
    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No transactions today</td></tr>';
        return;
    }
    
    tbody.innerHTML = transactions.map(t => `
        <tr>
            <td>${new Date(t.created_at).toLocaleTimeString('en-PK', {hour: '2-digit', minute: '2-digit'})}</td>
            <td>${t._customerName || 'N/A'}</td>
            <td><span class="badge bg-${getTypeBadge(t.transaction_type)}">${getTypeLabel(t.transaction_type)}</span></td>
            <td>Rs. ${formatNumber(t.charges ?? t.amount)}</td>
            <td>${t.liters ? formatNumber(t.liters) + ' L' : '-'}</td>
        </tr>
    `).join('');
}


function getTypeLabel(type) {
    const labels = { Credit:'Sale', Debit:'Vasooli', Expense:'Expense', Advance:'Advance', AdvanceUsed:'Advance Used', CashSale:'Cash Sale', BankDeposit:'Bank Deposit' };
    return labels[type] || type || '-';
}

function ensureDashboardModal() {
    let modal = document.getElementById('dashboardSummaryModal');
    if (modal) return modal;
    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="modal fade" id="dashboardSummaryModal" tabindex="-1">
      <div class="modal-dialog modal-xl modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title" id="dashboardSummaryTitle">Today Details</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body" id="dashboardSummaryBody"></div>
        </div>
      </div>
    </div>`;
    document.body.appendChild(wrap.firstElementChild);
    return document.getElementById('dashboardSummaryModal');
}

function showDashboardDetails(kind) {
    const titles = { sales:'Today Sales Details', vasooli:'Today Vasooli Details', expenses:'Today Expenses Details', net:'Today Net Cash Details' };
    let rows = dashboardTodayTransactions.slice();
    if (kind === 'sales') rows = rows.filter(t => t.transaction_type === 'Credit' || t.transaction_type === 'CashSale');
    else if (kind === 'vasooli') rows = rows.filter(t => t.transaction_type === 'Debit');
    else if (kind === 'expenses') rows = rows.filter(t => t.transaction_type === 'Expense');
    else if (kind === 'net') rows = rows.filter(t => ['Credit','CashSale','Debit','Expense'].includes(t.transaction_type));

    const modal = ensureDashboardModal();
    document.getElementById('dashboardSummaryTitle').textContent = titles[kind] || 'Today Details';
    const body = document.getElementById('dashboardSummaryBody');
    const total = rows.reduce((s,t)=>s+(parseFloat(t.charges ?? t.amount ?? 0)||0),0);
    if (!rows.length) {
        body.innerHTML = '<div class="text-center text-muted py-5"><i class="bi bi-inbox fs-1 d-block mb-2"></i>No records found today</div>';
    } else {
        body.innerHTML = `<div class="alert alert-light border d-flex justify-content-between flex-wrap gap-2"><strong>Records: ${rows.length}</strong><strong>Total: Rs. ${formatNumber(total)}</strong></div>
        <div class="table-responsive"><table class="table table-sm table-hover align-middle">
        <thead class="table-dark"><tr><th>Time</th><th>Customer</th><th>Type</th><th>Amount</th><th>Liters</th><th>Description</th></tr></thead>
        <tbody>${rows.map(t=>`<tr><td>${new Date(t.created_at).toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'})}</td><td>${t._customerName || 'N/A'} ${t._customer?.sr_no ? '(#'+t._customer.sr_no+')' : ''}</td><td><span class="badge bg-${getTypeBadge(t.transaction_type)}">${getTypeLabel(t.transaction_type)}</span></td><td class="fw-bold">Rs. ${formatNumber(t.charges ?? t.amount)}</td><td>${t.liters ? formatNumber(t.liters)+' L' : '-'}</td><td>${t.description || '-'}</td></tr>`).join('')}</tbody></table></div>`;
    }
    new bootstrap.Modal(modal).show();
}

function bindDashboardSummaryCards() {
    const map = { 'dash-card-sales':'sales', 'dash-card-vasooli':'vasooli', 'dash-card-expenses':'expenses', 'dash-card-net':'net' };
    Object.entries(map).forEach(([id,kind]) => {
        const card = document.getElementById(id);
        if (card && !card.dataset.bound) { card.dataset.bound = '1'; card.addEventListener('click', () => showDashboardDetails(kind)); }
    });
}

function getTypeBadge(type) {
    if (type === 'Credit' || type === 'CashSale') return 'success';
    if (type === 'Debit') return 'primary';
    if (type === 'Expense') return 'warning';
    if (type === 'Advance' || type === 'AdvanceUsed') return 'info';
    if (type === 'BankDeposit') return 'dark';
    return 'secondary';
}

function formatNumber(num) {
    return parseFloat(num || 0).toLocaleString('en-PK', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

// =============================================
// Export for use
// =============================================
window.initDashboard = initDashboard;
window.loadStockData = loadStockData;

console.log('✅ Dashboard.js loaded');