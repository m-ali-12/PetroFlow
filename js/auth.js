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

//     // Get supabase client — support both naming conventions
//     const client = window.supabaseClient || window.supabase;

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

//     const client = window.supabaseClient || window.supabase;

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
// // Auth State Listener — handles token refresh
// // =============================================
// function setupAuthStateListener() {
//     const client = window.supabaseClient || window.supabase;
//     if (!client) return;

//     client.auth.onAuthStateChange((event, session) => {
//         console.log('Auth event:', event);

//         // TOKEN_REFRESHED aur SIGNED_IN pe kuch mat karo — sab theek hai
//         if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
//             if (session) {
//                 updateUserDisplay(session.user);
//             }
//             return;
//         }

//         // Sirf SIGNED_OUT pe redirect karo
//         // Lekin agar hum khud logout nahin kar rahe to ignore karo
//         if (event === 'SIGNED_OUT') {
//             // Check karo ke session abhi bhi exist karta hai
//             // (kabhi kabhi Supabase false SIGNED_OUT deta hai)
//             client.auth.getSession().then(({ data: { session: currentSession } }) => {
//                 if (!currentSession && !isRedirecting) {
//                     console.log('Session ended, redirecting to login');
//                     safeRedirectToLogin();
//                 }
//             });
//         }
//     });
// }

// // =============================================
// // Safe Redirect — prevent multiple redirects
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
//     if (loginForm) {
//         loginForm.addEventListener('submit', handleLogin);
//     }

//     const signupForm = document.getElementById('signupForm');
//     if (signupForm) {
//         signupForm.addEventListener('submit', handleSignup);
//     }

//     const forgotLink = document.getElementById('forgotPassword');
//     if (forgotLink) {
//         forgotLink.addEventListener('click', handleForgotPassword);
//     }
// }

// // =============================================
// // Handle Login
// // =============================================
// async function handleLogin(e) {
//     e.preventDefault();

//     const client = window.supabaseClient || window.supabase;
//     const email = document.getElementById('loginEmail')?.value;
//     const password = document.getElementById('loginPassword')?.value;
//     const errorDiv = document.getElementById('login-error');
//     const submitBtn = e.target.querySelector('button[type="submit"]');

//     if (!email || !password) {
//         showAuthError('Please enter email and password', errorDiv);
//         return;
//     }

//     if (submitBtn) {
//         submitBtn.disabled = true;
//         submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing in...';
//     }

//     try {
//         const { data, error } = await client.auth.signInWithPassword({
//             email: email.trim(),
//             password: password
//         });

//         if (error) {
//             console.error('Login error:', error);
//             showAuthError(getErrorMessage(error), errorDiv);

//             if (submitBtn) {
//                 submitBtn.disabled = false;
//                 submitBtn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Sign In';
//             }
//             return;
//         }

//         console.log('Login successful:', data.user.email);
//         showAuthSuccess('Login successful! Redirecting...', errorDiv);

//         setTimeout(() => {
//             window.location.replace('index.html');
//         }, 1000);

//     } catch (error) {
//         console.error('Login exception:', error);
//         showAuthError('Login failed. Please try again.', errorDiv);

//         if (submitBtn) {
//             submitBtn.disabled = false;
//             submitBtn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Sign In';
//         }
//     }
// }

// // =============================================
// // Handle Signup
// // =============================================
// async function handleSignup(e) {
//     e.preventDefault();

//     const client = window.supabaseClient || window.supabase;
//     const email = document.getElementById('signupEmail')?.value;
//     const password = document.getElementById('signupPassword')?.value;
//     const confirmPassword = document.getElementById('confirmPassword')?.value;
//     const errorDiv = document.getElementById('signup-error');
//     const submitBtn = e.target.querySelector('button[type="submit"]');

//     if (!email || !password || !confirmPassword) {
//         showAuthError('Please fill all fields', errorDiv);
//         return;
//     }

//     if (password !== confirmPassword) {
//         showAuthError('Passwords do not match', errorDiv);
//         return;
//     }

//     if (password.length < 6) {
//         showAuthError('Password must be at least 6 characters', errorDiv);
//         return;
//     }

//     if (submitBtn) {
//         submitBtn.disabled = true;
//         submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating account...';
//     }

//     try {
//         const { data, error } = await client.auth.signUp({
//             email: email.trim(),
//             password: password,
//             options: {
//                 emailRedirectTo: window.location.origin + '/index.html',
//                 data: {
//                     created_at: new Date().toISOString()
//                 }
//             }
//         });

//         if (error) {
//             console.error('Signup error:', error);
//             showAuthError(getErrorMessage(error), errorDiv);

//             if (submitBtn) {
//                 submitBtn.disabled = false;
//                 submitBtn.innerHTML = '<i class="bi bi-person-plus"></i> Sign Up';
//             }
//             return;
//         }

//         if (data.user && !data.session) {
//             showAuthSuccess(
//                 'Account created! Please check your email to verify your account.',
//                 errorDiv
//             );
//         } else if (data.session) {
//             showAuthSuccess('Account created successfully! Redirecting...', errorDiv);
//             setTimeout(() => {
//                 window.location.replace('index.html');
//             }, 1500);
//         }

//     } catch (error) {
//         console.error('Signup exception:', error);
//         showAuthError('Signup failed. Please try again.', errorDiv);

//         if (submitBtn) {
//             submitBtn.disabled = false;
//             submitBtn.innerHTML = '<i class="bi bi-person-plus"></i> Sign Up';
//         }
//     }
// }

// // =============================================
// // Handle Forgot Password
// // =============================================
// async function handleForgotPassword(e) {
//     e.preventDefault();

//     const client = window.supabaseClient || window.supabase;
//     const email = prompt('Enter your email address:');
//     if (!email) return;

//     try {
//         const { error } = await client.auth.resetPasswordForEmail(email, {
//             redirectTo: window.location.origin + '/reset-password.html'
//         });

//         if (error) {
//             alert('Error: ' + error.message);
//             return;
//         }

//         alert('Password reset email sent! Check your inbox.');

//     } catch (error) {
//         console.error('Password reset error:', error);
//         alert('Failed to send reset email. Please try again.');
//     }
// }

// // =============================================
// // Handle Logout
// // =============================================
// async function handleLogout() {
//     const client = window.supabaseClient || window.supabase;

//     try {
//         isRedirecting = true; // logout ke baad redirect rok do listener se
//         const { error } = await client.auth.signOut();

//         if (error) {
//             console.error('Logout error:', error);
//             isRedirecting = false;
//             alert('Logout failed. Please try again.');
//             return;
//         }

//         localStorage.clear();
//         window.location.replace('login.html');

//     } catch (error) {
//         console.error('Logout exception:', error);
//         isRedirecting = false;
//         alert('Logout failed. Please try again.');
//     }
// }

// // =============================================
// // Helper Functions
// // =============================================

// function redirectToLogin() {
//     safeRedirectToLogin();
// }

// function updateUserDisplay(user) {
//     const userEmail = document.getElementById('user-email');
//     if (userEmail) userEmail.textContent = user.email;

//     const userAvatar = document.getElementById('user-avatar');
//     if (userAvatar) userAvatar.textContent = user.email.charAt(0).toUpperCase();
// }

// function showAuthError(message, element) {
//     if (element) {
//         element.className = 'alert alert-danger';
//         element.textContent = message;
//         element.style.display = 'block';
//     } else {
//         const errorDiv = document.querySelector('.auth-error');
//         if (errorDiv) {
//             errorDiv.className = 'alert alert-danger';
//             errorDiv.textContent = message;
//             errorDiv.style.display = 'block';
//         }
//     }
// }

// function showAuthSuccess(message, element) {
//     if (element) {
//         element.className = 'alert alert-success';
//         element.textContent = message;
//         element.style.display = 'block';
//     }
// }

// function getErrorMessage(error) {
//     const errorMessages = {
//         'Invalid login credentials': 'Invalid email or password',
//         'Email not confirmed': 'Please verify your email first',
//         'User already registered': 'This email is already registered',
//         'Password should be at least 6 characters': 'Password must be at least 6 characters'
//     };

//     return errorMessages[error.message] || error.message || 'An error occurred';
// }

// // =============================================
// // Global exports
// // =============================================
// window.handleLogout = handleLogout;
// window.checkAuth = checkAuth;

// =============================================
// FILE: js/auth.js
// Authentication System - FIXED VERSION
// =============================================
// =============================================
// FILE: js/auth.js
// Authentication System - Network Error Fixed
// =============================================

const isLoginPage = window.location.pathname.includes('login') || 
                    window.location.pathname.includes('signup');

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Auth system initializing...');
    
    if (typeof supabase === 'undefined') {
        console.error('Supabase client not initialized!');
        showAuthError('System Error: Database connection failed. Please check config.js');
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
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Auth check error:', error);
            redirectToLogin();
            return;
        }
        
        if (!session) {
            console.log('No active session');
            redirectToLogin();
            return;
        }
        
        console.log('User authenticated:', session.user.email);
        updateUserDisplay(session.user);
        
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
    
    const forgotLink = document.querySelector('[href*="forgot"]');
    if (forgotLink) {
        forgotLink.addEventListener('click', handleForgotPassword);
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
        console.log('Attempting login for:', email);
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password
        });
        
        if (error) {
            console.error('Login error:', error);
            
            let errorMessage = 'Login failed. Please try again.';
            
            if (error.message.includes('Invalid login credentials')) {
                errorMessage = 'Invalid email or password';
            } else if (error.message.includes('Email not confirmed')) {
                errorMessage = 'Please verify your email first';
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage = 'Network error. Please check your internet connection.';
            } else {
                errorMessage = error.message;
            }
            
            showAuthError(errorMessage);
            
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
        
        let errorMessage = 'Login failed. ';
        
        if (error.message && error.message.includes('fetch')) {
            errorMessage += 'Network error - please check your internet connection and Supabase settings.';
        } else {
            errorMessage += error.message || 'Please try again.';
        }
        
        showAuthError(errorMessage);
        
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
        console.log('Attempting signup for:', email);
        
        const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password: password,
            options: {
                emailRedirectTo: window.location.origin + '/index.html',
                data: {
                    created_at: new Date().toISOString()
                }
            }
        });
        
        if (error) {
            console.error('Signup error:', error);
            
            let errorMessage = 'Signup failed. ';
            
            if (error.message.includes('already registered')) {
                errorMessage = 'This email is already registered. Please login instead.';
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage = 'Network error. Please check your internet connection.';
            } else {
                errorMessage += error.message;
            }
            
            showAuthError(errorMessage);
            
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="bi bi-person-plus"></i> Sign Up';
            }
            return;
        }
        
        console.log('Signup successful');
        
        if (data.user && !data.session) {
            showAuthSuccess('Account created! Please check your email to verify (check spam folder too).');
            
            setTimeout(() => {
                alert('Verification email sent to: ' + email + '\n\nCheck your inbox and spam folder.');
            }, 1000);
            
        } else if (data.session) {
            showAuthSuccess('Account created successfully! Redirecting...');
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        }
        
    } catch (error) {
        console.error('Signup exception:', error);
        
        let errorMessage = 'Signup failed. ';
        
        if (error.message && error.message.includes('fetch')) {
            errorMessage += 'Network error - please check your internet connection and Supabase settings.';
        } else {
            errorMessage += error.message || 'Please try again.';
        }
        
        showAuthError(errorMessage);
        
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-person-plus"></i> Sign Up';
        }
    }
}

async function handleForgotPassword(e) {
    e.preventDefault();
    
    const email = prompt('Enter your email address:');
    
    if (!email) return;
    
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password.html'
        });
        
        if (error) {
            alert('Error: ' + error.message);
            return;
        }
        
        alert('Password reset email sent! Check your inbox.');
        
    } catch (error) {
        console.error('Password reset error:', error);
        alert('Failed to send reset email. Please try again.');
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
                     document.querySelector('.auth-error') ||
                     document.getElementById('auth-error');
    
    if (errorDiv) {
        errorDiv.className = 'alert alert-danger';
        errorDiv.innerHTML = '<i class="bi bi-exclamation-triangle me-2"></i>' + message;
        errorDiv.style.display = 'block';
    } else {
        const loginForm = document.getElementById('loginForm') || document.getElementById('signupForm');
        if (loginForm) {
            const existingAlert = loginForm.querySelector('.alert');
            if (existingAlert) {
                existingAlert.remove();
            }
            
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-danger';
            alertDiv.innerHTML = '<i class="bi bi-exclamation-triangle me-2"></i>' + message;
            loginForm.insertBefore(alertDiv, loginForm.firstChild);
        } else {
            alert(message);
        }
    }
}

function showAuthSuccess(message) {
    console.log('Auth Success:', message);
    
    const errorDiv = document.querySelector('.alert-danger') || 
                     document.querySelector('.auth-error') ||
                     document.getElementById('auth-error');
    
    if (errorDiv) {
        errorDiv.className = 'alert alert-success';
        errorDiv.innerHTML = '<i class="bi bi-check-circle me-2"></i>' + message;
        errorDiv.style.display = 'block';
    } else {
        const loginForm = document.getElementById('loginForm') || document.getElementById('signupForm');
        if (loginForm) {
            const existingAlert = loginForm.querySelector('.alert');
            if (existingAlert) {
                existingAlert.remove();
            }
            
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-success';
            alertDiv.innerHTML = '<i class="bi bi-check-circle me-2"></i>' + message;
            loginForm.insertBefore(alertDiv, loginForm.firstChild);
        }
    }
}

window.handleLogout = handleLogout;
window.checkAuth = checkAuth;

console.log('Auth.js loaded successfully');