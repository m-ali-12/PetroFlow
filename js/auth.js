// Authentication & Multi-Tenant Management
(function() {
'use strict';

const supabase = window.supabaseClient;

// Check if user is authenticated
async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  
  const publicPages = ['login.html', 'signup.html', 'forgot-password.html', 'reset-password.html'];
  const currentPage = window.location.pathname.split('/').pop();

  if (!session && !publicPages.includes(currentPage)) {
    // Not logged in, redirect to login
    window.location.href = 'login.html';
    return null;
  }

  if (session && publicPages.includes(currentPage)) {
    // Already logged in, redirect to dashboard
    window.location.href = 'index.html';
    return session;
  }

  return session;
}

// Get current user details
async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Get pump details for current user
function getPumpDetails() {
  const pumpDetails = localStorage.getItem('pump_details');
  if (pumpDetails) {
    return JSON.parse(pumpDetails);
  }

  // Default pump details
  return {
    name: 'Khalid & Sons Petroleum',
    city: 'Sahiwal',
    province: 'Punjab',
    address: 'Kacha Paka Near Shah Fardia Park Road, Bilal Colony',
    owner: 'Muhammad Khalid',
    phone: '0321-6001723'
  };
}

// Update pump details
function updatePumpDetails(details) {
  localStorage.setItem('pump_details', JSON.stringify(details));
  
  // Update navbar/footer if they exist
  updatePumpNameInUI();
}

// Update pump name in UI
function updatePumpNameInUI() {
  const pumpDetails = getPumpDetails();
  
  // Update navbar brand if exists
  const navbarBrand = document.querySelector('.navbar-brand');
  if (navbarBrand) {
    navbarBrand.textContent = pumpDetails.name;
  }

  // Update footer if exists
  const footerBrand = document.querySelector('.footer-brand h5');
  if (footerBrand) {
    footerBrand.textContent = pumpDetails.name;
  }
}

// Logout function
async function logout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    // Clear local data
    localStorage.clear();
    
    window.location.href = 'login.html';
  } catch (error) {
    console.error('Logout error:', error);
    alert('Error logging out: ' + error.message);
  }
}

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', async () => {
  const session = await checkAuth();
  
  if (session) {
    // User is authenticated
    const user = await getCurrentUser();
    
    // Load pump details from user metadata
    if (user && user.user_metadata) {
      const metadata = user.user_metadata;
      if (metadata.pump_name) {
        const pumpDetails = {
          name: metadata.pump_name,
          city: metadata.city || 'N/A',
          province: metadata.province || 'N/A',
          address: metadata.address || '',
          owner: metadata.full_name || user.email,
          phone: metadata.phone || ''
        };
        updatePumpDetails(pumpDetails);
      }
    }

    // Update UI with pump name
    updatePumpNameInUI();

    // Add logout button functionality if it exists
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
          logout();
        }
      });
    }
  }
});

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    console.log('User signed in:', session.user.email);
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out');
    window.location.href = 'login.html';
  }
});

// Export functions for global use
window.auth = {
  checkAuth,
  getCurrentUser,
  getPumpDetails,
  updatePumpDetails,
  logout
};

console.log('✅ Auth system initialized');

})();