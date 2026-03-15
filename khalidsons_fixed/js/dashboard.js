// =============================================
// FILE: js/dashboard.js
// Dashboard - WITH USER_ID FILTERING
// =============================================

document.addEventListener('DOMContentLoaded', async function() {
    if (!document.body.dataset.page || document.body.dataset.page !== 'index') return;

    function waitForReady(cb) {
        if (window.supabaseClient && window.currentUserId) cb();
        else setTimeout(() => waitForReady(cb), 150);
    }

    waitForReady(async () => {
        await initDashboard();
    });
});

async function initDashboard() {
    try {
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

async function loadStockData() {
    try {
        const uid = window.currentUserId;
        const { data, error } = await window.supabaseClient
            .from('tanks')
            .select('*')
            .eq('user_id', uid);

        if (error) { console.error('Error loading stock:', error); return; }
        if (!data || data.length === 0) { setStockDisplay(0, 0); return; }

        const petrol = data.find(t => t.fuel_type === 'Petrol') || { current_stock: 0 };
        const diesel = data.find(t => t.fuel_type === 'Diesel') || { current_stock: 0 };
        setStockDisplay(petrol.current_stock, diesel.current_stock);
    } catch (e) { setStockDisplay(0, 0); }
}

async function loadTodaySummary() {
    try {
        const uid = window.currentUserId;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const { data, error } = await window.supabaseClient
            .from('transactions')
            .select('*')
            .eq('user_id', uid)
            .gte('created_at', today.toISOString())
            .lt('created_at', tomorrow.toISOString());

        if (error) { console.error('Error loading today summary:', error); return; }

        let totalSales = 0, totalPayments = 0, totalExpenses = 0;
        (data || []).forEach(t => {
            if (t.transaction_type === 'Credit') totalSales += parseFloat(t.amount || 0);
            else if (t.transaction_type === 'Debit') totalPayments += parseFloat(t.amount || 0);
            else if (t.transaction_type === 'Expense') totalExpenses += parseFloat(t.amount || 0);
        });

        const fmtEl = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = 'Rs. ' + val.toLocaleString('en-PK', { minimumFractionDigits: 2 });
        };
        fmtEl('todaySales', totalSales);
        fmtEl('todayPayments', totalPayments);
        fmtEl('todayExpenses', totalExpenses);
        fmtEl('todayNet', totalSales - totalPayments - totalExpenses);
    } catch (e) { console.error('Today summary exception:', e); }
}

async function loadRecentTransactions() {
    try {
        const uid = window.currentUserId;
        const { data, error } = await window.supabaseClient
            .from('transactions')
            .select('*, customers(name)')
            .eq('user_id', uid)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) { console.error('Error loading recent transactions:', error); return; }

        const tbody = document.getElementById('recentTransactions');
        if (!tbody) return;

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">Koi transaction nahi mila</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(t => `
            <tr>
                <td>${new Date(t.created_at).toLocaleDateString('en-PK')}</td>
                <td>${t.customers?.name || 'N/A'}</td>
                <td><span class="badge bg-${t.transaction_type === 'Credit' ? 'danger' : t.transaction_type === 'Debit' ? 'success' : 'warning'}">${t.transaction_type}</span></td>
                <td>Rs. ${parseFloat(t.amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
                <td>${t.description || '-'}</td>
            </tr>
        `).join('');
    } catch (e) { console.error('Recent transactions exception:', e); }
}

function setStockDisplay(petrol, diesel) {
    const fmtEl = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = parseFloat(val || 0).toLocaleString('en-PK', { minimumFractionDigits: 0 }) + ' L';
    };
    fmtEl('petrolStock', petrol);
    fmtEl('dieselStock', diesel);
}
