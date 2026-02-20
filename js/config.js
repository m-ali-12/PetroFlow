// // Supabase Configuration
// const SUPABASE_URL = 'https://ycoxgzplqkqqhzqrclvt.supabase.co';
// const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljb3hnenBscWtxcWh6cXJjbHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTE2MjEsImV4cCI6MjA4NjIyNzYyMX0.wYQN_c-LVl949E1Hp0AAeyHtvDEpo92Llpo4b21cHN8';


// // Create client safely and attach to window
// window.supabaseClient = window.supabase.createClient(
//   SUPABASE_URL,
//   SUPABASE_ANON_KEY
// );

// // Optional fuel config
// window.config = {
//   FUEL_PRICES: {
//     Petrol: 270,
//     Diesel: 280
//   }
// };

// FILE: config.js - Configuration & Price Management



// const SUPABASE_URL = 'https://ycoxgzplqkqqhzqrclvt.supabase.co';
// const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljb3hnenBscWtxcWh6cXJjbHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTE2MjEsImV4cCI6MjA4NjIyNzYyMX0.wYQN_c-LVl949E1Hp0AAeyHtvDEpo92Llpo4b21cHN8';
// const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// const TABLES = {
//     tanks: 'tanks', customers: 'customers', transactions: 'transactions',
//     dailyReports: 'daily_reports', mobilCustomers: 'mobil_customers',
//     mobilStock: 'mobil_stock', mobilTransactions: 'mobil_transactions',
//     shops: 'shops', rentPayments: 'rent_payments'
// };

// let DEFAULT_PRICES = { petrol: 276.50, diesel: 289.75 };

// function getCurrentPrices() {
//     return {
//         petrol: parseFloat(localStorage.getItem('petrol_price')) || DEFAULT_PRICES.petrol,
//         diesel: parseFloat(localStorage.getItem('diesel_price')) || DEFAULT_PRICES.diesel
//     };
// }

// function getPrice(fuelType) {
//     const prices = getCurrentPrices();
//     return fuelType === 'Petrol' ? prices.petrol : prices.diesel;
// }

// function savePrice(fuelType, price) {
//     localStorage.setItem(fuelType === 'Petrol' ? 'petrol_price' : 'diesel_price', price);
// }

// function formatCurrency(amount) {
//     return 'Rs. ' + parseFloat(amount).toLocaleString('en-PK', {minimumFractionDigits: 2});
// }

// function showToast(title, message, type = 'success') {
//     alert(`${title}: ${message}`);
// }

// function showSection(sectionName) {
//     document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
//     const section = document.getElementById(sectionName + '-section');
//     if (section) section.style.display = 'block';
// }

// window.getCurrentPrices = getCurrentPrices;
// window.getPrice = getPrice;
// window.savePrice = savePrice;
// window.formatCurrency = formatCurrency;
// window.showToast = showToast;
// window.showSection = showSection;
// window.TABLES = TABLES;
// window.supabase = supabase;


const SUPABASE_URL = 'https://ycoxgzplqkqqhzqrclvt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljb3hnenBscWtxcWh6cXJjbHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTE2MjEsImV4cCI6MjA4NjIyNzYyMX0.wYQN_c-LVl949E1Hp0AAeyHtvDEpo92Llpo4b21cHN8';

// FIX: window.supabase ki jagah direct supabase.createClient use karein
// Yeh check karega ke library load hui hai ya nahi
let supabase;
try {
    supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
    console.error("Supabase library loading error:", e);
}

const TABLES = {
    tanks: 'tanks', customers: 'customers', transactions: 'transactions',
    dailyReports: 'daily_reports', mobilCustomers: 'mobil_customers',
    mobilStock: 'mobil_stock', mobilTransactions: 'mobil_transactions',
    shops: 'shops', rentPayments: 'rent_payments'
};

let DEFAULT_PRICES = { petrol: 276.50, diesel: 289.75 };

function getCurrentPrices() {
    return {
        petrol: parseFloat(localStorage.getItem('petrol_price')) || DEFAULT_PRICES.petrol,
        diesel: parseFloat(localStorage.getItem('diesel_price')) || DEFAULT_PRICES.diesel
    };
}

function getPrice(fuelType) {
    const prices = getCurrentPrices();
    return fuelType === 'Petrol' ? prices.petrol : prices.diesel;
}

function savePrice(fuelType, price) {
    localStorage.setItem(fuelType === 'Petrol' ? 'petrol_price' : 'diesel_price', price);
}

function formatCurrency(amount) {
    return 'Rs. ' + parseFloat(amount).toLocaleString('en-PK', {minimumFractionDigits: 2});
}

function showToast(title, message, type = 'success') {
    alert(`${title}: ${message}`);
}

function showSection(sectionName) {
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    const section = document.getElementById(sectionName + '-section');
    if (section) section.style.display = 'block';
}

// Global Exports
window.getCurrentPrices = getCurrentPrices;
window.getPrice = getPrice;
window.savePrice = savePrice;
window.formatCurrency = formatCurrency;
window.showToast = showToast;
window.showSection = showSection;
window.TABLES = TABLES;
window.supabase = supabase; // Ab ye error nahi dega