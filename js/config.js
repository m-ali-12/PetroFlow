(function () {
    'use strict';

    if (window.PETRO_CONFIG_LOADED) return;
    window.PETRO_CONFIG_LOADED = true;

    const SUPABASE_URL      = 'https://ejvnglvplhizdkvujszj.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqdm5nbHZwbGhpemRrdnVqc3pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NDkzMjQsImV4cCI6MjA4OTEyNTMyNH0.xBUbPqpMIOY9mHe0aQzLP9J2APoh9OGAm_c8UFFMfZE';

    function initSupabase() {
        if (!window.supabase || typeof window.supabase.createClient !== 'function') {
            setTimeout(initSupabase, 100);
            return;
        }
        if (!window.supabaseClient) {
            window.supabaseClient = window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_ANON_KEY,
                {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: true
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
