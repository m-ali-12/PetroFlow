// =============================================
// FILE: js/config.js
// SINGLE SOURCE OF TRUTH FOR SUPABASE
// FIXED INVALID API KEY ERROR
// =============================================

(function() {
    'use strict';
    
    if (window.PETRO_CONFIG_LOADED) {
        console.log('Config already loaded');
        return;
    }
    
    window.PETRO_CONFIG_LOADED = true;
    
    // ✅ FIXED: correct project URL (contains number 1, not letter l)
    const SUPABASE_URL = 'https://ycoxgzplqkqqhzqrc1vt.supabase.co';
    
    // ✅ Your correct anon key (already correct)
    const SUPABASE_ANON_KEY =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
        'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljb3hnenBscWtxcWh6cXJjMXZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc1NDIwMTYsImV4cCI6MjA1MzExODAxNn0.' +
        'm7dPGWHPYiXx4hJpW3dXc8LPxsZQCDnGqJMQQVw7234';
    
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
                    }
                }
            );
            
            console.log('✅ Supabase initialized correctly');
        }
    }
    
    initSupabase();
    
    // =============================================
    // Tables
    // =============================================
    
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
    
    // =============================================
    // Helper functions
    // =============================================
    
    window.formatNumber = function(num) {
        return parseFloat(num || 0).toLocaleString('en-PK', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };
    
    window.formatCurrency = function(amount) {
        return 'Rs. ' + window.formatNumber(amount);
    };
    
    window.getPrice = function(fuelType) {
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