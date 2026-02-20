// =============================================
// FILE: js/config.js
// Configuration & Settings Management
// =============================================

// Supabase Configuration
const SUPABASE_URL = 'https://ycoxgzplqkqqhzqrc1vt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljb3hnenBscWtxcWh6cXJjMXZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc1NDIwMTYsImV4cCI6MjA1MzExODAxNn0.m7dPGWHPYiXx4hJpW3dXc8LPxsZQCDnGqJMQQVw7234';

// ✅ FIX: window.supabase = Supabase LIBRARY hai
// Hum client ko alag naam "supabaseClient" dete hain
// Taake library overwrite na ho
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Table Names
const TABLES = {
    // Fuel Management
    tanks: 'tanks',
    customers: 'customers',
    transactions: 'transactions',
    dailyReports: 'daily_reports',
    
    // Mobil Oil
    mobilCustomers: 'mobil_customers',
    mobilStock: 'mobil_stock',
    mobilTransactions: 'mobil_transactions',
    
    // Rent Management
    shops: 'shops',
    rentPayments: 'rent_payments'
};

// Default Prices (fallback)
const DEFAULT_PRICES = {
    petrol: 276.50,
    diesel: 289.75
};

// Tank Capacity
const TANK_CAPACITY = 25000;

// =============================================
// Price Management Functions
// =============================================

function getCurrentPrices() {
    return {
        petrol: parseFloat(localStorage.getItem('petrol_price')) || DEFAULT_PRICES.petrol,
        diesel: parseFloat(localStorage.getItem('diesel_price')) || DEFAULT_PRICES.diesel
    };
}

function savePrice(fuelType, price) {
    const key = fuelType === 'Petrol' ? 'petrol_price' : 'diesel_price';
    localStorage.setItem(key, price);
    console.log(`Price saved: ${fuelType} = Rs. ${price}`);
}

function getPrice(fuelType) {
    const prices = getCurrentPrices();
    return fuelType === 'Petrol' ? prices.petrol : prices.diesel;
}

function initializePrices() {
    const prices = getCurrentPrices();
    
    const petrolInput = document.getElementById('petrol-price');
    const dieselInput = document.getElementById('diesel-price');
    
    if (petrolInput) petrolInput.value = prices.petrol;
    if (dieselInput) dieselInput.value = prices.diesel;
    
    console.log('Prices initialized:', prices);
}

// =============================================
// Utility Functions
// =============================================

function formatNumber(num) {
    return parseFloat(num).toLocaleString('en-PK', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatCurrency(amount) {
    return 'Rs. ' + formatNumber(amount);
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-PK', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateSQL(date) {
    return new Date(date).toISOString().split('T')[0];
}

function getTodayDate() {
    return formatDateSQL(new Date());
}

function showToast(title, message, type = 'success') {
    const toastTitle = document.getElementById('toast-title');
    const toastMessage = document.getElementById('toast-message');
    const toastElement = document.getElementById('liveToast');
    
    if (toastTitle && toastMessage && toastElement) {
        toastTitle.textContent = title;
        toastMessage.textContent = message;
        
        toastElement.className = `toast ${type === 'success' ? 'bg-success' : 'bg-danger'} text-white`;
        
        const toast = new bootstrap.Toast(toastElement);
        toast.show();
    } else {
        alert(`${title}: ${message}`);
    }
}

function showLoading(show = true) {
    const loader = document.getElementById('loading-overlay');
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
}

// =============================================
// Make available globally
// =============================================

// ✅ FIX: supabaseClient naam se export karo — window.supabase library ko mat chhuo
window.supabaseClient = supabaseClient;

window.TABLES = TABLES;
window.getCurrentPrices = getCurrentPrices;
window.savePrice = savePrice;
window.getPrice = getPrice;
window.initializePrices = initializePrices;
window.formatNumber = formatNumber;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.formatDateSQL = formatDateSQL;
window.getTodayDate = getTodayDate;
window.showToast = showToast;
window.showLoading = showLoading;
window.TANK_CAPACITY = TANK_CAPACITY;

console.log('Config loaded successfully');
console.log('Supabase client initialized:', supabaseClient ? 'Yes' : 'No');