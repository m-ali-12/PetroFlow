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

// Supabase Configuration
const SUPABASE_URL = 'https://ycoxgzplqkqqhzqrc1vt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljb3hnenBscWtxcWh6cXJjMXZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc1NDIwMTYsImV4cCI6MjA1MzExODAxNn0.m7dPGWHPYiXx4hJpW3dXc8LPxsZQCDnGqJMQQVw7234';

// Correct Supabase client initialization for CDN v2
let supabaseClient = null;

if (window.supabase && typeof window.supabase.createClient === 'function') {

    supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );

    window.supabaseClient = supabaseClient;

    console.log("Supabase initialized successfully");

} else {

    console.error("Supabase CDN not loaded. Make sure this script is included BEFORE config.js");

}

// Export globally
window.supabaseClient = supabaseClient;

console.log("Config loaded successfully");
console.log("Supabase client initialized:", supabaseClient ? "Yes" : "No");