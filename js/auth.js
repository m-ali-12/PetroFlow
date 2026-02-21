// =============================================
// FILE: js/auth.js
// Authentication System - Supabase v2 Fixed
// =============================================

const isLoginPage = window.location.pathname.includes('login') || 
                    window.location.pathname.includes('signup');

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Auth system initializing...');
    
    if (typeof supabase === 'undefined') {
        console.error('Supabase client not initialized!');
        return;
    }
    
    console.log('Supabase client available');
    
    if (!isLoginPage) {
        await checkAuth();
    } else {
        setupAuthForms();
    }
});

async function checkAuth() {
    try {
        const { data, error } = await supabase.auth.getUser();
        
        if (error || !data.user) {
            console.log('No authenticated user, redirecting to login');
            redirectToLogin();
            return;
        }
        
        console.log('User authenticated:', data.user.email);
        updateUserDisplay(data.user);
        
    } catch (error) {
        console.error('Auth check failed:', error);
        redirectToLogin();
    }
}

function setupAuthForms() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail')?.value;
    const password = document.getElementById('loginPassword')?.value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    if (!email || !password) {
        showAuthError('Please enter email and password');
        return;
    }
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing in...';
    }
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password
        });
        
        if (error) {
            console.error('Login error:', error);
            showAuthError(error.message.includes('Invalid') ? 'Invalid email or password' : error.message);
            
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Sign In';
            }
            return;
        }
        
        console.log('Login successful');
        showAuthSuccess('Login successful! Redirecting...');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
        
    } catch (error) {
        console.error('Login exception:', error);
        showAuthError('Login failed. Please try again.');
        
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Sign In';
        }
    }
}

async function handleSignup(e) {
    e.preventDefault();
    
    const email = document.getElementById('signupEmail')?.value;
    const password = document.getElementById('signupPassword')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    if (!email || !password || !confirmPassword) {
        showAuthError('Please fill all fields');
        return;
    }
    
    if (password !== confirmPassword) {
        showAuthError('Passwords do not match');
        return;
    }
    
    if (password.length < 6) {
        showAuthError('Password must be at least 6 characters');
        return;
    }
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating account...';
    }
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password: password,
            options: {
                emailRedirectTo: window.location.origin + '/index.html'
            }
        });
        
        if (error) {
            console.error('Signup error:', error);
            showAuthError(error.message);
            
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="bi bi-person-plus"></i> Sign Up';
            }
            return;
        }
        
        console.log('Signup successful');
        
        if (data.user && !data.session) {
            showAuthSuccess('Account created! Please check your email to verify.');
        } else if (data.session) {
            showAuthSuccess('Account created successfully! Redirecting...');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        }
        
    } catch (error) {
        console.error('Signup exception:', error);
        showAuthError('Signup failed. Please try again.');
        
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-person-plus"></i> Sign Up';
        }
    }
}

async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            console.error('Logout error:', error);
            alert('Logout failed. Please try again.');
            return;
        }
        
        localStorage.clear();
        window.location.href = 'login.html';
        
    } catch (error) {
        console.error('Logout exception:', error);
        alert('Logout failed. Please try again.');
    }
}

function redirectToLogin() {
    if (!isLoginPage) {
        window.location.href = 'login.html';
    }
}

function updateUserDisplay(user) {
    const userEmail = document.getElementById('user-email');
    if (userEmail) {
        userEmail.textContent = user.email;
    }
    
    const userAvatar = document.getElementById('user-avatar');
    if (userAvatar) {
        userAvatar.textContent = user.email.charAt(0).toUpperCase();
    }
}

function showAuthError(message) {
    console.error('Auth Error:', message);
    
    const errorDiv = document.querySelector('.alert-danger') || 
                     document.getElementById('auth-error');
    
    if (errorDiv) {
        errorDiv.className = 'alert alert-danger';
        errorDiv.innerHTML = '<i class="bi bi-exclamation-triangle me-2"></i>' + message;
        errorDiv.style.display = 'block';
    } else {
        const form = document.getElementById('loginForm') || document.getElementById('signupForm');
        if (form) {
            const alert = document.createElement('div');
            alert.className = 'alert alert-danger';
            alert.innerHTML = '<i class="bi bi-exclamation-triangle me-2"></i>' + message;
            form.insertBefore(alert, form.firstChild);
        } else {
            alert(message);
        }
    }
}

function showAuthSuccess(message) {
    console.log('Auth Success:', message);
    
    const errorDiv = document.querySelector('.alert-danger') || 
                     document.getElementById('auth-error');
    
    if (errorDiv) {
        errorDiv.className = 'alert alert-success';
        errorDiv.innerHTML = '<i class="bi bi-check-circle me-2"></i>' + message;
        errorDiv.style.display = 'block';
    }
}

window.handleLogout = handleLogout;
window.checkAuth = checkAuth;

console.log('Auth.js loaded successfully');