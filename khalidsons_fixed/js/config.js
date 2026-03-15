// =============================================
// FILE: js/config.js
// SINGLE SOURCE OF TRUTH FOR SUPABASE
// =============================================

(function () {
    'use strict';

    if (window.PETRO_CONFIG_LOADED) {
        console.log('Config already loaded');
        return;
    }

    window.PETRO_CONFIG_LOADED = true;

    // ⚠️  IMPORTANT: Apna Supabase URL aur ANON KEY yahan dalein
    // Supabase Dashboard → Settings → API → Project URL & anon public key
    const SUPABASE_URL = 'https://ycoxgzplqkqqhzqrclvt.supabase.co';
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljb3hnenBscWtxcWh6cXJjbHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTE2MjEsImV4cCI6MjA4NjIyNzYyMX0.wYQN_c-LVl949E1Hp0AAeyHtvDEpo92Llpo4b21cHN8";

    function initSupabase() {
        if (!window.supabase || typeof window.supabase.createClient !== 'function') {
            console.error('Supabase library not loaded!');
            setTimeout(initSupabase, 100);
            return;
        }

        if (!window.supabaseClient) {
            window.supabaseClient = window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_ANON_KEY,
                {
                    auth: {
                        persistSession: true,        // ✅ Session localStorage mein save hogi
                        autoRefreshToken: true,      // ✅ Token auto-refresh
                        detectSessionInUrl: true     // ✅ OAuth redirects support
                    },
                    global: {
                        headers: {
                            apikey: SUPABASE_ANON_KEY
                        }
                    }
                }
            );

            console.log('✅ Supabase initialized');
        }
    }

    initSupabase();

    window.TABLES = {
        tanks: 'tanks',
        customers: 'customers',
        transactions: 'transactions',
        dailyReports: 'daily_reports',
        mobilCustomers: 'mobil_customers',
        mobilStock: 'mobil_stock',
        mobilTransactions: 'mobil_transactions',
        shops: 'shops',
        rentPayments: 'rent_payments'
    };

    window.formatNumber = function (num) {
        return parseFloat(num || 0).toLocaleString('en-PK', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    window.formatCurrency = function (amount) {
        return 'Rs. ' + window.formatNumber(amount);
    };

    window.getPrice = function (fuelType) {
        const prices = {
            petrol: parseFloat(localStorage.getItem('petrol_price')) || 276.50,
            diesel: parseFloat(localStorage.getItem('diesel_price')) || 289.75
        };
        return fuelType === 'Petrol' ? prices.petrol : prices.diesel;
    };

    console.log('✅ Config loaded successfully');

})();
