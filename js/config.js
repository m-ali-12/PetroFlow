// // =============================================
// // FILE: js/auth.js
// // Authentication System - STABLE VERSION
// // =============================================

// const isLoginPage = window.location.pathname.includes('login.html') || 
//                     window.location.pathname.includes('signup.html');

// // Flag to prevent multiple redirects
// let authCheckDone = false;
// let isRedirecting = false;

// document.addEventListener('DOMContentLoaded', async function() {
//     console.log('Auth system initializing...');

//     // ✅ FIX: Always use supabaseClient only
//     const client = window.supabaseClient;

//     if (!client) {
//         console.error('Supabase client not found! Check config.js');
//         if (!isLoginPage) safeRedirectToLogin();
//         return;
//     }

//     if (!isLoginPage) {
//         await checkAuth();
//         setupAuthStateListener();
//     } else {
//         setupAuthForms();
//     }
// });

// // =============================================
// // Check Authentication Status (runs ONCE)
// // =============================================
// async function checkAuth() {
//     if (authCheckDone) return;
//     authCheckDone = true;

//     const client = window.supabaseClient;

//     try {
//         const { data: { session }, error } = await client.auth.getSession();

//         if (error) {
//             console.error('Auth check error:', error);
//             safeRedirectToLogin();
//             return;
//         }

//         if (!session) {
//             console.log('No active session, redirecting to login');
//             safeRedirectToLogin();
//             return;
//         }

//         console.log('User authenticated:', session.user.email);
//         updateUserDisplay(session.user);

//     } catch (error) {
//         console.error('Auth check failed:', error);
//         safeRedirectToLogin();
//     }
// }

// // =============================================
// // Auth State Listener
// // =============================================
// function setupAuthStateListener() {
//     const client = window.supabaseClient;
//     if (!client) return;

//     client.auth.onAuthStateChange((event, session) => {

//         console.log('Auth event:', event);

//         if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {

//             if (session) updateUserDisplay(session.user);

//             return;
//         }

//         if (event === 'SIGNED_OUT') {

//             client.auth.getSession().then(({ data: { session } }) => {

//                 if (!session && !isRedirecting)
//                     safeRedirectToLogin();

//             });
//         }
//     });
// }

// // =============================================
// // Safe Redirect
// // =============================================
// function safeRedirectToLogin() {

//     if (isRedirecting || isLoginPage) return;

//     isRedirecting = true;

//     window.location.replace('login.html');
// }

// // =============================================
// // Setup Login/Signup Forms
// // =============================================
// function setupAuthForms() {

//     const loginForm = document.getElementById('loginForm');

//     if (loginForm)
//         loginForm.addEventListener('submit', handleLogin);

//     const signupForm = document.getElementById('signupForm');

//     if (signupForm)
//         signupForm.addEventListener('submit', handleSignup);

//     const forgotLink = document.getElementById('forgotPassword');

//     if (forgotLink)
//         forgotLink.addEventListener('click', handleForgotPassword);
// }

// // =============================================
// // Handle Login
// // =============================================
// async function handleLogin(e) {

//     e.preventDefault();

//     const client = window.supabaseClient;

//     const email = document.getElementById('loginEmail')?.value;
//     const password = document.getElementById('loginPassword')?.value;

//     const errorDiv = document.getElementById('login-error');

//     const submitBtn =
//         e.target.querySelector('button[type="submit"]');

//     if (!email || !password) {

//         showAuthError(
//             'Please enter email and password',
//             errorDiv
//         );

//         return;
//     }

//     if (submitBtn) {

//         submitBtn.disabled = true;

//         submitBtn.innerHTML =
//             '<span class="spinner-border spinner-border-sm me-2"></span>Signing in...';
//     }

//     try {

//         const { data, error } =
//             await client.auth.signInWithPassword({

//                 email: email.trim(),

//                 password: password
//             });

//         if (error) {

//             console.error('Login error:', error);

//             showAuthError(
//                 getErrorMessage(error),
//                 errorDiv
//             );

//             if (submitBtn) {

//                 submitBtn.disabled = false;

//                 submitBtn.innerHTML =
//                     '<i class="bi bi-box-arrow-in-right"></i> Sign In';
//             }

//             return;
//         }

//         console.log(
//             'Login successful:',
//             data.user.email
//         );

//         showAuthSuccess(
//             'Login successful! Redirecting...',
//             errorDiv
//         );

//         setTimeout(() => {

//             window.location.replace('index.html');

//         }, 1000);

//     } catch (error) {

//         console.error(
//             'Login exception:',
//             error
//         );

//         showAuthError(
//             'Login failed. Please try again.',
//             errorDiv
//         );

//         if (submitBtn) {

//             submitBtn.disabled = false;

//             submitBtn.innerHTML =
//                 '<i class="bi bi-box-arrow-in-right"></i> Sign In';
//         }
//     }
// }

// // =============================================
// // Handle Signup
// // =============================================
// async function handleSignup(e) {

//     e.preventDefault();

//     const client = window.supabaseClient;

//     const email =
//         document.getElementById('signupEmail')?.value;

//     const password =
//         document.getElementById('signupPassword')?.value;

//     const confirmPassword =
//         document.getElementById('confirmPassword')?.value;

//     const errorDiv =
//         document.getElementById('signup-error');

//     const submitBtn =
//         e.target.querySelector('button[type="submit"]');

//     if (!email || !password || !confirmPassword) {

//         showAuthError(
//             'Please fill all fields',
//             errorDiv
//         );

//         return;
//     }

//     if (password !== confirmPassword) {

//         showAuthError(
//             'Passwords do not match',
//             errorDiv
//         );

//         return;
//     }

//     if (password.length < 6) {

//         showAuthError(
//             'Password must be at least 6 characters',
//             errorDiv
//         );

//         return;
//     }

//     if (submitBtn) {

//         submitBtn.disabled = true;

//         submitBtn.innerHTML =
//             '<span class="spinner-border spinner-border-sm me-2"></span>Creating account...';
//     }

//     try {

//         const { data, error } =
//             await client.auth.signUp({

//                 email: email.trim(),

//                 password: password
//             });

//         if (error) {

//             showAuthError(
//                 getErrorMessage(error),
//                 errorDiv
//             );

//             return;
//         }

//         showAuthSuccess(
//             'Account created successfully!',
//             errorDiv
//         );

//     } catch (error) {

//         showAuthError(
//             'Signup failed.',
//             errorDiv
//         );
//     }
// }

// // =============================================
// // Forgot Password
// // =============================================
// async function handleForgotPassword(e) {

//     e.preventDefault();

//     const client = window.supabaseClient;

//     const email =
//         prompt('Enter your email');

//     if (!email) return;

//     await client.auth.resetPasswordForEmail(email);
// }

// // =============================================
// // Logout
// // =============================================
// async function handleLogout() {

//     const client = window.supabaseClient;

//     isRedirecting = true;

//     await client.auth.signOut();

//     window.location.replace('login.html');
// }

// // =============================================
// // Helpers
// // =============================================
// function updateUserDisplay(user) {

//     const el =
//         document.getElementById('user-email');

//     if (el) el.textContent = user.email;
// }

// function showAuthError(message, el) {

//     if (!el) return;

//     el.className = 'alert alert-danger';

//     el.textContent = message;

//     el.style.display = 'block';
// }

// function showAuthSuccess(message, el) {

//     if (!el) return;

//     el.className = 'alert alert-success';

//     el.textContent = message;

//     el.style.display = 'block';
// }

// function getErrorMessage(error) {

//     return error.message ||
//            'Authentication error';
// }

// // =============================================
// // Global exports
// // =============================================
// window.handleLogout = handleLogout;
// window.checkAuth = checkAuth;

// =============================================
// FILE: js/config.js
// Configuration & Settings Management
// =============================================

// =============================================
// Supabase Configuration
// =============================================

// ⚠️ IMPORTANT: replace with your REAL Supabase URL

// Go to: Supabase Dashboard → Settings → API → Project URL

// here new code start

// const SUPABASE_URL = 'https://ycoxgzplqkqqhzqrclvt.supabase.co';
// const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljb3hnenBscWtxcWh6cXJjbHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTE2MjEsImV4cCI6MjA4NjIyNzYyMX0.wYQN_c-LVl949E1Hp0AAeyHtvDEpo92Llpo4b21cHN8';

// // Wait until Supabase library loads
// let supabaseClient = null;

// if (window.supabase && typeof window.supabase.createClient === 'function') {

//     supabaseClient = window.supabase.createClient(
//         SUPABASE_URL,
//         SUPABASE_ANON_KEY,
//         {
//             auth: {
//                 persistSession: true,
//                 autoRefreshToken: true,
//                 detectSessionInUrl: true
//             }
//         }
//     );

//     console.log('Supabase initialized successfully');

// } else {

//     console.error('Supabase library not loaded');

// }

// // =============================================
// // Table Names
// // =============================================

// const TABLES = {

//     tanks: 'tanks',
//     customers: 'customers',
//     transactions: 'transactions',
//     dailyReports: 'daily_reports',

//     mobilCustomers: 'mobil_customers',
//     mobilStock: 'mobil_stock',
//     mobilTransactions: 'mobil_transactions',

//     shops: 'shops',
//     rentPayments: 'rent_payments'

// };

// // =============================================
// // Default Prices
// // =============================================

// const DEFAULT_PRICES = {

//     petrol: 276.50,
//     diesel: 289.75

// };

// // =============================================
// // Tank Capacity
// // =============================================

// const TANK_CAPACITY = 25000;

// // =============================================
// // Price Functions
// // =============================================

// function getCurrentPrices() {

//     return {

//         petrol: parseFloat(localStorage.getItem('petrol_price')) || DEFAULT_PRICES.petrol,

//         diesel: parseFloat(localStorage.getItem('diesel_price')) || DEFAULT_PRICES.diesel

//     };

// }

// function savePrice(fuelType, price) {

//     const key = fuelType === 'Petrol'
//         ? 'petrol_price'
//         : 'diesel_price';

//     localStorage.setItem(key, price);

// }

// function getPrice(fuelType) {

//     const prices = getCurrentPrices();

//     return fuelType === 'Petrol'
//         ? prices.petrol
//         : prices.diesel;

// }

// function initializePrices() {

//     const prices = getCurrentPrices();

//     const petrolInput = document.getElementById('petrol-price');

//     const dieselInput = document.getElementById('diesel-price');

//     if (petrolInput)
//         petrolInput.value = prices.petrol;

//     if (dieselInput)
//         dieselInput.value = prices.diesel;

// }

// // =============================================
// // Utilities
// // =============================================

// function formatNumber(num) {

//     return parseFloat(num).toLocaleString('en-PK', {

//         minimumFractionDigits: 2,
//         maximumFractionDigits: 2

//     });

// }

// function formatCurrency(amount) {

//     return 'Rs. ' + formatNumber(amount);

// }

// function formatDate(date) {

//     return new Date(date).toLocaleDateString('en-PK', {

//         year: 'numeric',
//         month: 'short',
//         day: 'numeric'

//     });

// }

// function formatDateSQL(date) {

//     return new Date(date)
//         .toISOString()
//         .split('T')[0];

// }

// function getTodayDate() {

//     return formatDateSQL(new Date());

// }

// function showToast(title, message, type = 'success') {

//     alert(title + ': ' + message);

// }

// function showLoading(show = true) {

//     const loader = document.getElementById('loading-overlay');

//     if (loader)
//         loader.style.display = show
//             ? 'flex'
//             : 'none';

// }

// // =============================================
// // Export globals
// // =============================================

// window.supabaseClient = supabaseClient;

// window.TABLES = TABLES;

// window.getCurrentPrices = getCurrentPrices;

// window.savePrice = savePrice;

// window.getPrice = getPrice;

// window.initializePrices = initializePrices;

// window.formatNumber = formatNumber;

// window.formatCurrency = formatCurrency;

// window.formatDate = formatDate;

// window.formatDateSQL = formatDateSQL;

// window.getTodayDate = getTodayDate;

// window.showToast = showToast;

// window.showLoading = showLoading;

// window.TANK_CAPACITY = TANK_CAPACITY;

// console.log('Config loaded successfully');
// console.log('Supabase client initialized:', supabaseClient ? 'Yes' : 'No');

// 417 new code start and end here


// =============================================
// FILE: js/config.js
// FINAL WORKING VERSION
// =============================================

// Supabase Configuration
const SUPABASE_URL = 'https://ycoxgzplqkqqhzqrc1vt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljb3hnenBscWtxcWh6cXJjMXZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc1NDIwMTYsImV4cCI6MjA1MzExODAxNn0.m7dPGWHPYiXx4hJpW3dXc8LPxsZQCDnGqJMQQVw7234';

// Wait for Supabase library to load
let supabase;

function initializeSupabase() {
    if (typeof window.supabase === 'undefined' || typeof window.supabase.createClient === 'undefined') {
        console.error('Supabase library not loaded!');
        return null;
    }
    
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase initialized successfully');
        return supabase;
    } catch (error) {
        console.error('Error initializing Supabase:', error);
        return null;
    }
}

// Initialize immediately
supabase = initializeSupabase();

// Make available globally
window.supabase = supabase;

// Table Names
const TABLES = {
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

// Default Prices
const DEFAULT_PRICES = {
    petrol: 276.50,
    diesel: 289.75
};

// Utility Functions
function getCurrentPrices() {
    return {
        petrol: parseFloat(localStorage.getItem('petrol_price')) || DEFAULT_PRICES.petrol,
        diesel: parseFloat(localStorage.getItem('diesel_price')) || DEFAULT_PRICES.diesel
    };
}

function savePrice(fuelType, price) {
    const key = fuelType === 'Petrol' ? 'petrol_price' : 'diesel_price';
    localStorage.setItem(key, price);
}

function getPrice(fuelType) {
    const prices = getCurrentPrices();
    return fuelType === 'Petrol' ? prices.petrol : prices.diesel;
}

function formatNumber(num) {
    return parseFloat(num || 0).toLocaleString('en-PK', {
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

function showToast(title, message) {
    const toast = document.getElementById('liveToast');
    if (toast) {
        document.getElementById('toast-title').textContent = title;
        document.getElementById('toast-message').textContent = message;
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    } else {
        alert(title + ': ' + message);
    }
}

// Make functions global
window.TABLES = TABLES;
window.getCurrentPrices = getCurrentPrices;
window.savePrice = savePrice;
window.getPrice = getPrice;
window.formatNumber = formatNumber;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.showToast = showToast;
window.initializeSupabase = initializeSupabase;

console.log('✅ Config.js loaded');
console.log('Supabase client:', supabase ? 'Ready' : 'Not initialized');