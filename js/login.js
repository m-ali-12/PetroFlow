// =============================================
// FILE: js/login.js
// LOGIN PAGE FUNCTIONALITY
// =============================================

(function() {
    'use strict';
    
    // Wait for DOM
    window.addEventListener('DOMContentLoaded', function() {
        setTimeout(initLogin, 200);
    });
    
    function initLogin() {
        if (!window.supabaseClient) {
            setTimeout(initLogin, 100);
            return;
        }
        
        console.log('Login page ready');
        
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
        const btn = e.target.querySelector('button[type="submit"]');
        
        if (!email || !password) {
            showError('Please enter email and password');
            return;
        }
        
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Signing in...';
        }
        
        try {
            const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                email: email.trim(),
                password: password
            });
            
            if (error) {
                showError(error.message);
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Sign In';
                }
                return;
            }
            
            console.log('Login successful');
            window.location.href = 'index.html';
            
        } catch (err) {
            console.error('Login error:', err);
            showError('Login failed: ' + err.message);
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Sign In';
            }
        }
    }
    
    async function handleSignup(e) {
        e.preventDefault();
        
        const email = document.getElementById('signupEmail')?.value;
        const password = document.getElementById('signupPassword')?.value;
        const confirm = document.getElementById('confirmPassword')?.value;
        const btn = e.target.querySelector('button[type="submit"]');
        
        if (!email || !password) {
            showError('Please fill all fields');
            return;
        }
        
        if (password !== confirm) {
            showError('Passwords do not match');
            return;
        }
        
        if (password.length < 6) {
            showError('Password must be at least 6 characters');
            return;
        }
        
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Creating account...';
        }
        
        try {
            const { data, error } = await window.supabaseClient.auth.signUp({
                email: email.trim(),
                password: password
            });
            
            if (error) {
                showError(error.message);
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="bi bi-person-plus"></i> Sign Up';
                }
                return;
            }
            
            showSuccess('Account created successfully!');
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
            
        } catch (err) {
            console.error('Signup error:', err);
            showError('Signup failed: ' + err.message);
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-person-plus"></i> Sign Up';
            }
        }
    }
    
    function showError(message) {
        // Find or create error element
        let errorDiv = document.querySelector('.alert-danger');
        
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'alert alert-danger';
            const form = document.getElementById('loginForm') || document.getElementById('signupForm');
            if (form) {
                form.insertBefore(errorDiv, form.firstChild);
            }
        }
        
        errorDiv.innerHTML = '<i class="bi bi-exclamation-triangle me-2"></i>' + message;
        errorDiv.style.display = 'block';
    }
    
    function showSuccess(message) {
        let successDiv = document.querySelector('.alert-success');
        
        if (!successDiv) {
            successDiv = document.createElement('div');
            successDiv.className = 'alert alert-success';
            const form = document.getElementById('loginForm') || document.getElementById('signupForm');
            if (form) {
                form.insertBefore(successDiv, form.firstChild);
            }
        }
        
        successDiv.innerHTML = '<i class="bi bi-check-circle me-2"></i>' + message;
        successDiv.style.display = 'block';
    }
    
    console.log('✅ Login.js loaded');
    
})();