// =============================================
// FILE: js/config.js
// SINGLE SOURCE OF TRUTH FOR SUPABASE
// FINAL FIX FOR INVALID API KEY ERROR
// =============================================

(function () {
    'use strict';

    if (window.PETRO_CONFIG_LOADED) {
        console.log('Config already loaded');
        return;
    }

    window.PETRO_CONFIG_LOADED = true;

    // // ✅ MUST MATCH PROJECT REF INSIDE YOUR API KEY
    // const SUPABASE_URL = 'https://ljcfbctwpcznzyhabfiw.supabase.co';
    
    const SUPABASE_URL = 'https://ugdcucdgokahdicenbcf.supabase.co';

    // ✅ COPY EXACT FROM SUPABASE DASHBOARD → SETTINGS → API → anon public
    // const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqY2ZiY3R3cGN6bnp5aGFiZml3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NzUwNjQsImV4cCI6MjA4OTA1MTA2NH0.zQ4Rw8zkFOd46Ef6AXy6lg5FM7Q4xsi4-c0s0Kl1SjY";

    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnZGN1Y2Rnb2thaGRpY2VuYmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MjUyMjEsImV4cCI6MjA4OTMwMTIyMX0.P9rYp5RSj9TNw8OtF0Nupy5jUJkNEEf2QYJswdc8mjw"

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
                        persistSession: false,
                        autoRefreshToken: false,
                        detectSessionInUrl: false
                    },
                    global: {
                        headers: {
                            apikey: SUPABASE_ANON_KEY
                        }
                    }
                }
            );

            console.log('✅ Supabase initialized correctly');
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

        return fuelType === 'Petrol'
            ? prices.petrol
            : prices.diesel;
    };

    console.log('✅ Config loaded successfully');

})();