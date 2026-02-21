// =============================================
// FILE: js/auth.js
// Complete Auth Fix - No Loops, No Errors
// =============================================

// Check if we're on login/signup page
const isAuthPage = window.location.pathname.includes('login') || 
                   window.location.pathname.includes('signup') ||
                   window.location.pathname.includes('auth');

// Prevent multiple initializations
if (!window.authInitialized) {
    window.authInitialized = true;
    
    document.addEventListener('DOMContentLoaded', async function() {
        console.log('Auth initializing...');
        
        // Check if Supabase exists
        if (typeof supabase === 'undefined') {
            console.error('Supabase not loaded!');
            if (!isAuthPage) {
                setTimeout(() => window.location.href = 'login.html', 100);
            }
            return;
        }
        
        console.log('Supabase available');
        
        // If on auth page, setup forms only
        if (isAuthPage) {
            setupAuthForms();
            return; // Don't check auth on login page
        }
        
        // If on other pages, check auth
        await checkAuth();
    });
}

// =============================================
// Check Authentication
// =============================================
async function checkAuth() {
    try {
        // Use getUser() instead of getSession()
        const { data, error } = await supabase.auth.getUser();
        
        if (error) {
            console.error('Auth error:', error.message);
            redirectToLogin();
            return;
        }
        
        if (!data || !data.user) {
            console.log('No user found');
            redirectToLogin();
            return;
        }
        
        // User is authenticated
        console.log('Authenticated:', data.user.email);
        updateUserInfo(data.user);
        
    } catch (err) {
        console.error('Auth check failed:', err);
        redirectToLogin();
    }
}

// =============================================
// Setup Login/Signup Forms
// =============================================
function setupAuthForms() {
    console.log('Setting up auth forms');
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.onsubmit = handleLogin;
        console.log('Login form ready');
    }
    
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.onsubmit = handleSignup;
        console.log('Signup form ready');
    }
}

// =============================================
// Handle Login
// =============================================
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail')?.value?.trim();
    const password = document.getElementById('loginPassword')?.value;
    const btn = e.target.querySelector('button[type="submit"]');
    
    if (!email || !password) {
        alert('Please enter email and password');
        return false;
    }
    
    // Show loading
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Signing in...';
    }
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            console.error('Login error:', error);
            alert('Login failed: ' + (error.message || 'Invalid credentials'));
            
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Sign In';
            }
            return false;
        }
        
        if (data && data.user) {
            console.log('Login successful');
            alert('Login successful!');
            
            // Wait a moment, then redirect
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 500);
        }
        
    } catch (err) {
        console.error('Login exception:', err);
        alert('Login error: ' + err.message);
        
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'Sign In';
        }
    }
    
    return false;
}

// =============================================
// Handle Signup
// =============================================
async function handleSignup(e) {
    e.preventDefault();
    
    const email = document.getElementById('signupEmail')?.value?.trim();
    const password = document.getElementById('signupPassword')?.value;
    const confirm = document.getElementById('confirmPassword')?.value;
    const btn = e.target.querySelector('button[type="submit"]');
    
    if (!email || !password) {
        alert('Please fill all fields');
        return false;
    }
    
    if (password !== confirm) {
        alert('Passwords do not match');
        return false;
    }
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return false;
    }
    
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Creating account...';
    }
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password
        });
        
        if (error) {
            console.error('Signup error:', error);
            alert('Signup failed: ' + error.message);
            
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Sign Up';
            }
            return false;
        }
        
        console.log('Signup successful');
        alert('Account created! ' + (data.session ? 'Redirecting...' : 'Check your email to verify.'));
        
        if (data.session) {
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        }
        
    } catch (err) {
        console.error('Signup exception:', err);
        alert('Signup error: ' + err.message);
        
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'Sign Up';
        }
    }
    
    return false;
}

// =============================================
// Handle Logout
// =============================================
async function handleLogout() {
    if (!confirm('Are you sure you want to logout?')) {
        return;
    }
    
    try {
        await supabase.auth.signOut();
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = 'login.html';
    } catch (err) {
        console.error('Logout error:', err);
        alert('Logout failed');
    }
}

// =============================================
// Helper Functions
// =============================================

function redirectToLogin() {
    if (!isAuthPage) {
        console.log('Redirecting to login...');
        // Use replace to prevent back button loop
        window.location.replace('login.html');
    }
}

function updateUserInfo(user) {
    // Update user display elements
    const userEmail = document.getElementById('user-email');
    if (userEmail) userEmail.textContent = user.email;
    
    const userName = document.getElementById('user-name');
    if (userName) userName.textContent = user.email.split('@')[0];
    
    const userAvatar = document.querySelector('.user-avatar');
    if (userAvatar) userAvatar.textContent = user.email.charAt(0).toUpperCase();
}

// =============================================
// Make functions global
// =============================================
window.handleLogout = handleLogout;
window.checkAuth = checkAuth;

console.log('✅ Auth.js loaded');