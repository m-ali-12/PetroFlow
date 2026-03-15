// =============================================
// FILE: js/app.js  
// Main App - Navbar/Footer loader + Quick Stock
// =============================================
(function () {
    'use strict';

    function getSupabase() { return window.supabaseClient; }

    // Load navbar and footer components
    async function loadComponent(id, url) {
        const el = document.getElementById(id);
        if (!el) return;
        try {
            const res = await fetch(url, { cache: 'no-store' });
            if (res.ok) {
                el.innerHTML = await res.text();
                setActiveNav();
                setupLogoutButton();
                updateNavUserInfo();
            }
        } catch (e) {
            console.warn('Component load failed:', url, e.message);
        }
    }

    function setActiveNav() {
        const page = document.body.getAttribute('data-page');
        if (!page) return;
        document.querySelectorAll('.nav-link[data-page]').forEach(a => {
            a.classList.toggle('active', a.getAttribute('data-page') === page);
        });
    }

    function setupLogoutButton() {
        const btn = document.getElementById('logout-btn');
        if (btn) btn.addEventListener('click', window.handleLogout);
    }

    function updateNavUserInfo() {
        const client = getSupabase();
        if (!client) return;
        client.auth.getUser().then(({ data }) => {
            if (!data?.user) return;
            window._currentUserId = data.user.id;
            window._currentUser = data.user;
            const emailEl = document.getElementById('user-email');
            const avatarEl = document.getElementById('user-avatar');
            const nameEl = document.getElementById('user-name');
            if (emailEl) emailEl.textContent = data.user.email;
            if (avatarEl) avatarEl.textContent = data.user.email.charAt(0).toUpperCase();
            if (nameEl) {
                nameEl.textContent = data.user.user_metadata?.pump_name || data.user.email.split('@')[0];
            }
        });
    }

    // Load Quick Stock for Dashboard
    async function loadQuickStock() {
        const sb = getSupabase();
        if (!sb) { setTimeout(loadQuickStock, 200); return; }

        const userId = window._currentUserId;
        if (!userId) { setTimeout(loadQuickStock, 300); return; }

        try {
            // Today's summary
            const today = new Date().toISOString().split('T')[0];
            const startISO = today + 'T00:00:00+05:00';
            const endISO = today + 'T23:59:59+05:00';

            let query = sb.from('transactions')
                .select('transaction_type, charges, liters, fuel_type, entry_method')
                .gte('created_at', startISO)
                .lte('created_at', endISO);

            if (userId) query = query.eq('user_id', userId);

            const { data: txns } = await query;

            let sales = 0, vasooli = 0, expenses = 0, creditSales = 0;
            (txns || []).forEach(t => {
                const a = parseFloat(t.charges) || 0;
                if (t.transaction_type === 'Credit') { sales += a; creditSales += a; }
                if (t.transaction_type === 'CashSale') sales += a;
                if (t.transaction_type === 'Debit') vasooli += a;
                if (t.transaction_type === 'Expense') expenses += a;
            });

            const fmt = window.formatNumber || (n => Number(n || 0).toFixed(2));
            setEl('today-sales', 'Rs. ' + fmt(sales));
            setEl('today-vasooli', 'Rs. ' + fmt(vasooli));
            setEl('today-expenses', 'Rs. ' + fmt(expenses));
            setEl('today-net', 'Rs. ' + fmt(sales + vasooli - expenses));

            const countEl = document.getElementById('today-sales-count');
            const salesCount = (txns || []).filter(t => t.transaction_type === 'Credit' || t.transaction_type === 'CashSale').length;
            if (countEl) countEl.textContent = salesCount + ' transactions';

            // Recent transactions
            let rQuery = sb.from('transactions')
                .select('*, customers(name, sr_no)')
                .order('id', { ascending: false })
                .limit(10);
            if (userId) rQuery = rQuery.eq('user_id', userId);

            const { data: recent } = await rQuery;
            renderRecentTransactions(recent || []);

            // Load settings for fuel prices
            loadSettingsForDisplay();

        } catch (e) {
            console.warn('Dashboard load error:', e.message);
        }
    }

    function setEl(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    function renderRecentTransactions(txns) {
        const tbody = document.getElementById('recent-transactions');
        if (!tbody) return;

        if (!txns.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">Koi transaction nahi</td></tr>';
            return;
        }

        const fmt = window.formatNumber || (n => Number(n || 0).toFixed(2));
        tbody.innerHTML = txns.map(t => {
            const d = t.created_at ? new Date(t.created_at) : null;
            const timeStr = d ? d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }) : '-';
            const typeColor = {
                'Credit': 'success', 'CashSale': 'primary',
                'Debit': 'info', 'Expense': 'warning', 'Advance': 'secondary'
            };
            const color = typeColor[t.transaction_type] || 'secondary';
            return `<tr>
                <td>${timeStr}</td>
                <td>${t.customers?.name || 'N/A'}</td>
                <td><span class="badge bg-${color}">${t.transaction_type}</span></td>
                <td><strong>Rs. ${fmt(t.charges)}</strong></td>
                <td>${t.liters > 0 ? fmt(t.liters) + ' L' : '-'}</td>
            </tr>`;
        }).join('');
    }

    async function loadSettingsForDisplay() {
        const sb = getSupabase();
        if (!sb) return;
        try {
            const { data } = await sb.from('settings').select('price_history, petrol_price, diesel_price').limit(1).maybeSingle();
            if (!data) return;
            let petrol = 0, diesel = 0;
            if (data.price_history?.length) {
                const sorted = [...data.price_history].sort((a, b) => new Date(b.date) - new Date(a.date));
                petrol = parseFloat(sorted[0].petrol) || 0;
                diesel = parseFloat(sorted[0].diesel) || 0;
            } else {
                petrol = parseFloat(data.petrol_price) || 0;
                diesel = parseFloat(data.diesel_price) || 0;
            }
            setEl('nav-petrol-price', petrol > 0 ? 'P: Rs.' + petrol : '');
            setEl('nav-diesel-price', diesel > 0 ? 'D: Rs.' + diesel : '');
        } catch (e) { /* silent */ }
    }

    // Init
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('App initializing...');

        // Wait for supabase
        await new Promise(resolve => {
            function check() { if (window.supabaseClient) return resolve(); setTimeout(check, 100); }
            check();
        });

        await loadComponent('navbar-placeholder', 'components/navbar.html');
        await loadComponent('footer-placeholder', 'components/footer.html');

        const page = document.body.getAttribute('data-page');
        if (page === 'index') {
            loadQuickStock();
        }

        console.log('App ready, page:', page);
    });
})();
