// =============================================
// FILE: js/config.js
// SINGLE SOURCE OF TRUTH FOR SUPABASE
// =============================================

(function() {
    'use strict';
    
    // Only initialize if not already done
    if (window.PETRO_CONFIG_LOADED) {
        console.log('Config already loaded');
        return;
    }
    
    window.PETRO_CONFIG_LOADED = true;
    
    const SUPABASE_URL = 'https://ycoxgzplqkqqhzqrc1vt.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljb3hnenBscWtxcWh6cXJjMXZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc1NDIwMTYsImV4cCI6MjA1MzExODAxNn0.m7dPGWHPYiXx4hJpW3dXc8LPxsZQCDnGqJMQQVw7234';
    
    // Wait for Supabase library
    function initSupabase() {
        if (!window.supabase || typeof window.supabase.createClient !== 'function') {
            console.error('Supabase library not loaded!');
            setTimeout(initSupabase, 100);
            return;
        }
        
        // Create client only if doesn't exist
        if (!window.supabaseClient) {
            window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Supabase initialized');
        }
    }
    
    initSupabase();
    
    // Tables
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
    
    // Helper functions
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
        return fuelType === 'Petrol' ? prices.petrol : prices.diesel;
    };
    
    console.log('✅ Config loaded');
    
})();