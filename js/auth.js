// =============================================
// FILE: js/auth.js
// Authentication System - Multi-User Support
// =============================================

const isLoginPage = window.location.pathname.includes('login') ||
                    window.location.pathname.includes('signup');

let authCheckDone = false;
let isRedirecting = false;

document.addEventListener('DOMContentLoaded', async function () {
    const client = window.supabaseClient;
    if (!client) {
        console.error('Supabase client nahi mila');
        if (!isLoginPage) safeRedirectToLogin();
        return;
    }

    if (!isLoginPage) {
        await checkAuth();
        setupAuthStateListener();
    } else {
        setupAuthForms();
    }
});

// =============================================
// Check Auth
// =============================================
async function checkAuth() {
    if (authCheckDone) return;
    authCheckDone = true;

    const client = window.supabaseClient;
    try {
        const { data, error } = await client.auth.getSession();
        if (error || !data.session) {
            console.log('Session nahi mili, login page par jao');
            safeRedirectToLogin();
            return;
        }
        console.log('User logged in:', data.session.user.email);
        window._currentUserId = data.session.user.id;
        window._currentUser = data.session.user;
        updateUserDisplay(data.session.user);
    } catch (err) {
        console.error('Auth check error:', err);
        safeRedirectToLogin();
    }
}

// =============================================
// Auth State Listener
// =============================================
function setupAuthStateListener() {
    const client = window.supabaseClient;
    if (!client) return;

    client.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
            if (!isRedirecting) safeRedirectToLogin();
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (session) {
                window._currentUserId = session.user.id;
                window._currentUser = session.user;
                updateUserDisplay(session.user);
            }
        }
    });
}

function safeRedirectToLogin() {
    if (isRedirecting || isLoginPage) return;
    isRedirecting = true;
    window.location.replace('login.html');
}

// =============================================
// Auth Forms Setup
// =============================================
function setupAuthForms() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    const signupForm = document.getElementById('signupForm');
    if (signupForm) signupForm.addEventListener('submit', handleSignup);

    const forgotLink = document.getElementById('forgotPassword');
    if (forgotLink) forgotLink.addEventListener('click', handleForgotPassword);

    // Already logged in check
    const client = window.supabaseClient;
    if (client) {
        client.auth.getSession().then(({ data }) => {
            if (data?.session) {
                window.location.replace('index.html');
            }
        });
    }
}

// =============================================
// Handle Login
// =============================================
async function handleLogin(e) {
    e.preventDefault();
    const client = window.supabaseClient;
    const email = document.getElementById('loginEmail')?.value?.trim();
    const password = document.getElementById('loginPassword')?.value;
    const errorDiv = document.getElementById('login-error');
    const btn = e.target.querySelector('button[type="submit"]');

    if (!email || !password) {
        showAuthMessage('Email aur password darj karein', 'danger', errorDiv);
        return;
    }

    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Login ho raha hai...'; }

    try {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;

        showAuthMessage('Login kamyab! Redirect ho raha hai...', 'success', errorDiv);
        setTimeout(() => window.location.replace('index.html'), 1000);
    } catch (err) {
        const msgs = {
            'Invalid login credentials': 'Email ya password galat hai',
            'Email not confirmed': 'Pehle email verify karein',
        };
        showAuthMessage(msgs[err.message] || err.message, 'danger', errorDiv);
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>Login'; }
    }
}

// =============================================
// Handle Signup
// =============================================
async function handleSignup(e) {
    e.preventDefault();
    const client = window.supabaseClient;
    const email = document.getElementById('signupEmail')?.value?.trim();
    const password = document.getElementById('signupPassword')?.value;
    const confirmPass = document.getElementById('confirmPassword')?.value;
    const pumpName = document.getElementById('pumpName')?.value?.trim() || 'My Petrol Pump';
    const errorDiv = document.getElementById('signup-error');
    const btn = e.target.querySelector('button[type="submit"]');

    if (!email || !password || !confirmPass) {
        showAuthMessage('Sab fields bharein', 'danger', errorDiv); return;
    }
    if (password !== confirmPass) {
        showAuthMessage('Passwords match nahi karte', 'danger', errorDiv); return;
    }
    if (password.length < 6) {
        showAuthMessage('Password kam az kam 6 characters ka hona chahiye', 'danger', errorDiv); return;
    }

    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Account ban raha hai...'; }

    try {
        const { data, error } = await client.auth.signUp({
            email, password,
            options: {
                data: { pump_name: pumpName },
                emailRedirectTo: window.location.origin + '/login.html'
            }
        });
        if (error) throw error;

        if (data.user && !data.session) {
            showAuthMessage('Account ban gaya! Email check karein aur verify karein.', 'success', errorDiv);
        } else if (data.session) {
            showAuthMessage('Account ban gaya! Redirect ho raha hai...', 'success', errorDiv);
            setTimeout(() => window.location.replace('index.html'), 1500);
        }
    } catch (err) {
        const msgs = {
            'User already registered': 'Yeh email pehle se registered hai',
        };
        showAuthMessage(msgs[err.message] || err.message, 'danger', errorDiv);
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-person-plus me-2"></i>Account Banayein'; }
    }
}

// =============================================
// Handle Forgot Password
// =============================================
async function handleForgotPassword(e) {
    e.preventDefault();
    const client = window.supabaseClient;
    const email = prompt('Apna email darj karein:');
    if (!email) return;

    try {
        const { error } = await client.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password.html'
        });
        if (error) throw error;
        alert('Password reset email bhej di! Inbox check karein.');
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// =============================================
// Logout
// =============================================
async function handleLogout() {
    const client = window.supabaseClient;
    try {
        isRedirecting = true;
        await client.auth.signOut();
        localStorage.clear();
        window.location.replace('login.html');
    } catch (err) {
        console.error('Logout error:', err);
        isRedirecting = false;
        alert('Logout fail hua: ' + err.message);
    }
}

// =============================================
// UI Helpers
// =============================================
function updateUserDisplay(user) {
    const emailEl = document.getElementById('user-email');
    const avatarEl = document.getElementById('user-avatar');
    const nameEl = document.getElementById('user-name');

    if (emailEl) emailEl.textContent = user.email;
    if (avatarEl) avatarEl.textContent = user.email.charAt(0).toUpperCase();
    if (nameEl) {
        const pumpName = user.user_metadata?.pump_name || user.email.split('@')[0];
        nameEl.textContent = pumpName;
    }
}

function showAuthMessage(message, type, element) {
    if (!element) return;
    element.className = `alert alert-${type}`;
    element.textContent = message;
    element.style.display = 'block';
}

// Global exports
window.handleLogout = handleLogout;
window.checkAuth = checkAuth;

// =============================================
// requireAuth — call at page load
// Redirects to login if not authenticated
// Sets window._currentUserId
// =============================================
async function requireAuth() {
    const client = window.supabaseClient;
    if (!client) {
        console.error('Supabase not initialized');
        window.location.replace('login.html');
        return;
    }
    try {
        const { data, error } = await client.auth.getSession();
        if (error || !data.session) {
            window.location.replace('login.html');
            return;
        }
        window._currentUserId = data.session.user.id;
        window._currentUser   = data.session.user;
        updateUserDisplay(data.session.user);
        return data.session.user;
    } catch(e) {
        console.error('requireAuth error:', e);
        window.location.replace('login.html');
    }
}

window.requireAuth = requireAuth;
