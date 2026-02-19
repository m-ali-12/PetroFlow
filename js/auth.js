// =============================================
// FILE: js/auth.js
// Authentication System - FIXED VERSION
// =============================================

// Check if on login page
const isLoginPage = window.location.pathname.includes('login.html') || 
                    window.location.pathname.includes('signup.html');

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Auth system initializing...');
    
    // Check if Supabase is available
    if (typeof supabase === 'undefined') {
        console.error('Supabase client not initialized! Check config.js');
        showAuthError('System Error: Database connection failed');
        return;
    }
    
    // If not on login/signup page, check if user is logged in
    if (!isLoginPage) {
        await checkAuth();
    } else {
        // Setup login/signup forms
        setupAuthForms();
    }
});

// =============================================
// Check Authentication Status
// =============================================
async function checkAuth() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Auth check error:', error);
            redirectToLogin();
            return;
        }
        
        if (!session) {
            console.log('No active session, redirecting to login');
            redirectToLogin();
            return;
        }
        
        // User is logged in
        console.log('User authenticated:', session.user.email);
        updateUserDisplay(session.user);
        
    } catch (error) {
        console.error('Auth check failed:', error);
        redirectToLogin();
    }
}

// =============================================
// Setup Login/Signup Forms
// =============================================
function setupAuthForms() {
    // Login Form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Signup Form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
    
    // Forgot Password
    const forgotLink = document.getElementById('forgotPassword');
    if (forgotLink) {
        forgotLink.addEventListener('click', handleForgotPassword);
    }
}

// =============================================
// Handle Login
// =============================================
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail')?.value;
    const password = document.getElementById('loginPassword')?.value;
    const errorDiv = document.getElementById('login-error');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    if (!email || !password) {
        showAuthError('Please enter email and password', errorDiv);
        return;
    }
    
    // Disable button
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
            showAuthError(getErrorMessage(error), errorDiv);
            
            // Re-enable button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Sign In';
            }
            return;
        }
        
        // Success
        console.log('Login successful:', data.user.email);
        
        // Show success message
        showAuthSuccess('Login successful! Redirecting...', errorDiv);
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
        
    } catch (error) {
        console.error('Login exception:', error);
        showAuthError('Login failed. Please try again.', errorDiv);
        
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Sign In';
        }
    }
}

// =============================================
// Handle Signup
// =============================================
async function handleSignup(e) {
    e.preventDefault();
    
    const email = document.getElementById('signupEmail')?.value;
    const password = document.getElementById('signupPassword')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    const errorDiv = document.getElementById('signup-error');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // Validation
    if (!email || !password || !confirmPassword) {
        showAuthError('Please fill all fields', errorDiv);
        return;
    }
    
    if (password !== confirmPassword) {
        showAuthError('Passwords do not match', errorDiv);
        return;
    }
    
    if (password.length < 6) {
        showAuthError('Password must be at least 6 characters', errorDiv);
        return;
    }
    
    // Disable button
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating account...';
    }
    
    try {
        // IMPORTANT: Email confirmation is disabled by default in Supabase
        // To enable: Go to Authentication > Settings > Enable email confirmations
        
        const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password: password,
            options: {
                // Email redirect URL (optional)
                emailRedirectTo: window.location.origin + '/index.html',
                
                // Additional user metadata (optional)
                data: {
                    created_at: new Date().toISOString()
                }
            }
        });
        
        if (error) {
            console.error('Signup error:', error);
            showAuthError(getErrorMessage(error), errorDiv);
            
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="bi bi-person-plus"></i> Sign Up';
            }
            return;
        }
        
        // Check if email confirmation is required
        if (data.user && !data.session) {
            // Email confirmation required
            showAuthSuccess(
                'Account created! Please check your email to verify your account. (Check spam folder too)', 
                errorDiv
            );
            
            // Show message to user
            setTimeout(() => {
                alert('Verification email sent to: ' + email + '\n\nPlease check your email (and spam folder) to activate your account.');
            }, 1000);
            
        } else if (data.session) {
            // Auto-login (email confirmation disabled)
            showAuthSuccess('Account created successfully! Redirecting...', errorDiv);
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        }
        
    } catch (error) {
        console.error('Signup exception:', error);
        showAuthError('Signup failed. Please try again.', errorDiv);
        
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-person-plus"></i> Sign Up';
        }
    }
}

// =============================================
// Handle Forgot Password
// =============================================
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

// =============================================
// Handle Logout
// =============================================
async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            console.error('Logout error:', error);
            alert('Logout failed. Please try again.');
            return;
        }
        
        // Clear any local storage
        localStorage.clear();
        
        // Redirect to login
        window.location.href = 'login.html';
        
    } catch (error) {
        console.error('Logout exception:', error);
        alert('Logout failed. Please try again.');
    }
}

// =============================================
// Helper Functions
// =============================================

function redirectToLogin() {
    if (!isLoginPage) {
        window.location.href = 'login.html';
    }
}

function updateUserDisplay(user) {
    // Update user info in navbar if exists
    const userEmail = document.getElementById('user-email');
    if (userEmail) {
        userEmail.textContent = user.email;
    }
    
    const userAvatar = document.getElementById('user-avatar');
    if (userAvatar) {
        userAvatar.textContent = user.email.charAt(0).toUpperCase();
    }
}

function showAuthError(message, element) {
    if (element) {
        element.className = 'alert alert-danger';
        element.textContent = message;
        element.style.display = 'block';
    } else {
        // Fallback to generic error display
        const errorDiv = document.querySelector('.auth-error');
        if (errorDiv) {
            errorDiv.className = 'alert alert-danger';
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    }
}

function showAuthSuccess(message, element) {
    if (element) {
        element.className = 'alert alert-success';
        element.textContent = message;
        element.style.display = 'block';
    }
}

function getErrorMessage(error) {
    // Convert Supabase errors to user-friendly messages
    const errorMessages = {
        'Invalid login credentials': 'Invalid email or password',
        'Email not confirmed': 'Please verify your email first',
        'User already registered': 'This email is already registered',
        'Password should be at least 6 characters': 'Password must be at least 6 characters'
    };
    
    return errorMessages[error.message] || error.message || 'An error occurred';
}

// =============================================
// Make functions available globally
// =============================================
window.handleLogout = handleLogout;
window.checkAuth = checkAuth;

// Authentication & Multi-Tenant Management
// (function() {
// 'use strict';

// const supabase = window.supabaseClient;

// // Check if user is authenticated
// async function checkAuth() {
//   const { data: { session } } = await supabase.auth.getSession();
  
//   const publicPages = ['login.html', 'signup.html', 'forgot-password.html', 'reset-password.html'];
//   const currentPage = window.location.pathname.split('/').pop();

//   if (!session && !publicPages.includes(currentPage)) {
//     // Not logged in, redirect to login
//     window.location.href = 'login.html';
//     return null;
//   }

//   if (session && publicPages.includes(currentPage)) {
//     // Already logged in, redirect to dashboard
//     window.location.href = 'index.html';
//     return session;
//   }

//   return session;
// }

// // Get current user details
// async function getCurrentUser() {
//   const { data: { user } } = await supabase.auth.getUser();
//   return user;
// }

// // Get pump details for current user
// function getPumpDetails() {
//   const pumpDetails = localStorage.getItem('pump_details');
//   if (pumpDetails) {
//     return JSON.parse(pumpDetails);
//   }

//   // Default pump details
//   return {
//     name: 'Khalid & Sons Petroleum',
//     city: 'Sahiwal',
//     province: 'Punjab',
//     address: 'Kacha Paka Near Shah Fardia Park Road, Bilal Colony',
//     owner: 'Muhammad Khalid',
//     phone: '0321-6001723'
//   };
// }

// // Update pump details
// function updatePumpDetails(details) {
//   localStorage.setItem('pump_details', JSON.stringify(details));
  
//   // Update navbar/footer if they exist
//   updatePumpNameInUI();
// }

// // Update pump name in UI
// function updatePumpNameInUI() {
//   const pumpDetails = getPumpDetails();
  
//   // Update navbar brand if exists
//   const navbarBrand = document.querySelector('.navbar-brand');
//   if (navbarBrand) {
//     navbarBrand.textContent = pumpDetails.name;
//   }

//   // Update footer if exists
//   const footerBrand = document.querySelector('.footer-brand h5');
//   if (footerBrand) {
//     footerBrand.textContent = pumpDetails.name;
//   }
// }

// // Logout function
// async function logout() {
//   try {
//     const { error } = await supabase.auth.signOut();
//     if (error) throw error;

//     // Clear local data
//     localStorage.clear();
    
//     window.location.href = 'login.html';
//   } catch (error) {
//     console.error('Logout error:', error);
//     alert('Error logging out: ' + error.message);
//   }
// }

// // Initialize auth on page load
// document.addEventListener('DOMContentLoaded', async () => {
//   const session = await checkAuth();
  
//   if (session) {
//     // User is authenticated
//     const user = await getCurrentUser();
    
//     // Load pump details from user metadata
//     if (user && user.user_metadata) {
//       const metadata = user.user_metadata;
//       if (metadata.pump_name) {
//         const pumpDetails = {
//           name: metadata.pump_name,
//           city: metadata.city || 'N/A',
//           province: metadata.province || 'N/A',
//           address: metadata.address || '',
//           owner: metadata.full_name || user.email,
//           phone: metadata.phone || ''
//         };
//         updatePumpDetails(pumpDetails);
//       }
//     }

//     // Update UI with pump name
//     updatePumpNameInUI();

//     // Add logout button functionality if it exists
//     const logoutBtn = document.getElementById('logout-btn');
//     if (logoutBtn) {
//       logoutBtn.addEventListener('click', (e) => {
//         e.preventDefault();
//         if (confirm('Are you sure you want to logout?')) {
//           logout();
//         }
//       });
//     }
//   }
// });

// // Listen for auth state changes
// supabase.auth.onAuthStateChange((event, session) => {
//   if (event === 'SIGNED_IN') {
//     console.log('User signed in:', session.user.email);
//   } else if (event === 'SIGNED_OUT') {
//     console.log('User signed out');
//     window.location.href = 'login.html';
//   }
// });

// // Export functions for global use
// window.auth = {
//   checkAuth,
//   getCurrentUser,
//   getPumpDetails,
//   updatePumpDetails,
//   logout
// };

// console.log('✅ Auth system initialized');

// })();