// =============================================
// FILE: js/config.js
// ABSOLUTE FINAL FIX - NO DUPLICATE DECLARATION
// =============================================

// Check if supabase is already declared
if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    console.log('Using existing Supabase client');
} else {
    // Only create if doesn't exist
    const SUPABASE_URL = 'https://ycoxgzplqkqqhzqrc1vt.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljb3hnenBscWtxcWh6cXJjMXZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc1NDIwMTYsImV4cCI6MjA1MzExODAxNn0.m7dPGWHPYiXx4hJpW3dXc8LPxsZQCDnGqJMQQVw7234';

    // Create client
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase client initialized');
    } else {
        console.error('❌ Supabase library not loaded! Check if CDN script is included.');
    }
}

// Table names
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

// Utility functions
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

window.savePrice = function(fuelType, price) {
    const key = fuelType === 'Petrol' ? 'petrol_price' : 'diesel_price';
    localStorage.setItem(key, price);
};

window.showToast = function(title, message) {
    alert(title + ': ' + message);
};

console.log('✅ Config loaded');