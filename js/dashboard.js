// =============================================
// FILE: js/dashboard.js  
// Dashboard Functions - Error Free
// =============================================

// Wait for DOM and auth
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Dashboard initializing...');
    
    // Check if on index page
    if (!document.body.dataset.page || document.body.dataset.page !== 'index') {
        console.log('Not on dashboard page');
        return;
    }
    
    // Wait for supabase
    function waitForSupabase(callback) {
        if (window.supabaseClient) {
            callback();
        } else {
            setTimeout(() => waitForSupabase(callback), 100);
        }
    }
    
    waitForSupabase(async () => {
        await initDashboard();
    });
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
        
        if (data && data.length > 0) {
            data.forEach(t => {
                if (t.transaction_type === 'Credit') sales += parseFloat(t.amount || 0);
                else if (t.transaction_type === 'Debit') vasooli += parseFloat(t.amount || 0);
                else if (t.transaction_type === 'Expense') expenses += parseFloat(t.amount || 0);
            });
        }
        
        setSummaryDisplay(sales, vasooli, expenses);
        
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
        const { data, error } = await window.supabaseClient
            .from('transactions')
            .select('*, customers(name)')
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (error) {
            console.error('Error loading transactions:', error);
            return;
        }
        
        displayTransactions(data || []);
        
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
            <td>${t.customers?.name || 'N/A'}</td>
            <td><span class="badge bg-${getTypeBadge(t.transaction_type)}">${t.transaction_type}</span></td>
            <td>Rs. ${formatNumber(t.amount)}</td>
            <td>${t.liters ? formatNumber(t.liters) + ' L' : '-'}</td>
        </tr>
    `).join('');
}

function getTypeBadge(type) {
    if (type === 'Credit') return 'success';
    if (type === 'Debit') return 'primary';
    if (type === 'Expense') return 'warning';
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