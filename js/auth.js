// =============================================
// FILE: js/auth.js
// SIMPLIFIED WORKING VERSION
// =============================================

const isAuthPage = window.location.pathname.includes('login') || 
                   window.location.pathname.includes('signup');

// Only initialize once
if (!window.authInitialized) {
    window.authInitialized = true;
    
    document.addEventListener('DOMContentLoaded', async function() {
        console.log('Auth initializing...');
        
        // Wait a moment for Supabase to load
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!window.supabase) {
            console.error('Supabase not available');
            return;
        }
        
        console.log('Supabase available');
        
        if (isAuthPage) {
            setupForms();
        } else {
            checkAuth();
        }
    });
}

async function checkAuth() {
    try {
        if (!window.supabase || !window.supabase.auth) {
            console.error('Supabase auth not available');
            redirectToLogin();
            return;
        }
        
        const { data, error } = await window.supabase.auth.getUser();
        
        if (error || !data || !data.user) {
            console.log('No user, redirecting...');
            redirectToLogin();
            return;
        }
        
        console.log('User authenticated:', data.user.email);
        
    } catch (err) {
        console.error('Auth check error:', err);
        redirectToLogin();
    }
}

function setupForms() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.onsubmit = handleLogin;
    }
    
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.onsubmit = handleSignup;
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail')?.value;
    const password = document.getElementById('loginPassword')?.value;
    
    if (!email || !password) {
        alert('Enter email and password');
        return false;
    }
    
    try {
        const { data, error } = await window.supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            alert('Login failed: ' + error.message);
            return false;
        }
        
        console.log('Login successful');
        window.location.href = 'index.html';
        
    } catch (err) {
        console.error('Login error:', err);
        alert('Login error');
    }
    
    return false;
}

async function handleSignup(e) {
    e.preventDefault();
    
    const email = document.getElementById('signupEmail')?.value;
    const password = document.getElementById('signupPassword')?.value;
    const confirm = document.getElementById('confirmPassword')?.value;
    
    if (!email || !password) {
        alert('Fill all fields');
        return false;
    }
    
    if (password !== confirm) {
        alert('Passwords do not match');
        return false;
    }
    
    try {
        const { data, error } = await window.supabase.auth.signUp({
            email: email,
            password: password
        });
        
        if (error) {
            alert('Signup failed: ' + error.message);
            return false;
        }
        
        alert('Account created!');
        if (data.session) {
            window.location.href = 'index.html';
        }
        
    } catch (err) {
        console.error('Signup error:', err);
        alert('Signup error');
    }
    
    return false;
}

async function handleLogout() {
    try {
        await window.supabase.auth.signOut();
        window.location.href = 'login.html';
    } catch (err) {
        console.error('Logout error:', err);
    }
}

function redirectToLogin() {
    if (!isAuthPage) {
        window.location.replace('login.html');
    }
}

window.handleLogout = handleLogout;
window.checkAuth = checkAuth;

console.log('✅ Auth.js loaded');