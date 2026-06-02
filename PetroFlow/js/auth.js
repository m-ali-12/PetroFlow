// =============================================
// FILE: js/auth.js  v2.0
// ROLE-BASED AUTHENTICATION (ACTIVE)
// Roles: super_admin, admin, manager, employee
// Multi-admin approval flow included
// =============================================
(function () {
  'use strict';
  if (window.PETRO_AUTH_LOADED) return;
  window.PETRO_AUTH_LOADED = true;

  const path = window.location.pathname;
  const isAuthPage = /login|signup|forgot-password/.test(path);

  // ── Role permission map ──────────────────────────────────────
  window.ROLE_PERMISSIONS = {
    super_admin: {
      label: 'Super Admin', badge: 'danger',
      canApproveAdmins: true, canManageUsers: true,
      canViewAllData: true,   canEditPrices: true,
      canDeleteTransactions: true, canViewReports: true,
      canManageBanks: true,  canManageRent: true, canAccessSettings: true
    },
    admin: {
      label: 'Admin', badge: 'warning',
      canApproveAdmins: false, canManageUsers: true,
      canViewAllData: true,    canEditPrices: true,
      canDeleteTransactions: false, canViewReports: true,
      canManageBanks: true,   canManageRent: true, canAccessSettings: true
    },
    manager: {
      label: 'Manager', badge: 'info',
      canApproveAdmins: false, canManageUsers: false,
      canViewAllData: true,    canEditPrices: false,
      canDeleteTransactions: false, canViewReports: true,
      canManageBanks: true,   canManageRent: false, canAccessSettings: false
    },
    employee: {
      label: 'Employee', badge: 'secondary',
      canApproveAdmins: false, canManageUsers: false,
      canViewAllData: false,   canEditPrices: false,
      canDeleteTransactions: false, canViewReports: false,
      canManageBanks: false,  canManageRent: false, canAccessSettings: false
    }
  };

  window.currentUser        = null;
  window.currentUserProfile = null;
  window.userRole           = null;
  window.userPermissions    = {};

  window.addEventListener('DOMContentLoaded', () => waitForSupabase(init));

  function waitForSupabase(cb, n = 0) {
    if (window.supabaseClient) return cb();
    if (n > 80) return console.error('Supabase timeout');
    setTimeout(() => waitForSupabase(cb, n + 1), 100);
  }

  async function init() {
    if (isAuthPage) return;
    try {
      const { data: { session } } = await window.supabaseClient.auth.getSession();
      if (!session) { window.location.replace('login.html'); return; }

      window.currentUser = session.user;
      const profile = await loadProfile(session.user.id);

      if (!profile) { showPendingPage(null); return; }
      if (profile.status === 'pending')  { showPendingPage(profile); return; }
      if (profile.status === 'rejected') {
        await window.supabaseClient.auth.signOut();
        window.location.replace('login.html?reason=rejected');
        return;
      }

      window.currentUserProfile = profile;
      window.userRole           = profile.role;
      window.userPermissions    = window.ROLE_PERMISSIONS[profile.role] || window.ROLE_PERMISSIONS.employee;
      
      applyRoleUI(profile);

      // ✅ DISPATCH SESSION READY (Fixes 400 errors in other scripts)
      window.PETRO_SESSION_READY = true;
      document.dispatchEvent(new CustomEvent('petroSessionReady', { detail: profile }));

      // ✅ ROLE-BASED HOMEPAGE REDIRECT (only from index.html)
      handleHomepageRedirect(profile);

    } catch (err) {
      console.error('Auth error:', err);
      // Don't loop if we are already on login page
      if (!isAuthPage) window.location.replace('/login.html');
    }
  }

  function handleHomepageRedirect(profile) {
    const isIndex = path === '/' || path.endsWith('index.html');
    if (!isIndex) return;

    // Optional: Only redirect if the user just logged in (can be checked via sessionStorage)
    if (sessionStorage.getItem('pf_just_logged_in') === 'true') {
      sessionStorage.removeItem('pf_just_logged_in');
      const homeMap = {
        super_admin: '/admin-panel.html',
        admin:       '/admin-panel.html',
        manager:     '/customers.html',
        employee:    '/index.html'
      };
      const target = homeMap[profile.role] || '/index.html';
      if (path !== target) window.location.replace(target);
    }
  }

  async function loadProfile(userId) {
    try {
      const { data } = await window.supabaseClient
        .from('user_profiles').select('*').eq('user_id', userId).maybeSingle();
      return data;
    } catch { return null; }
  }

  function applyRoleUI(profile) {
    const p = window.ROLE_PERMISSIONS[profile.role] || {};
    const holder = document.getElementById('user-role-badge');
    if (holder) {
      holder.innerHTML =
        `<span class="badge bg-${p.badge}">${p.label}</span>
         <span class="ms-2 small text-muted">${profile.full_name || ''}</span>`;
    }
    // Hide elements that require a missing permission
    document.querySelectorAll('[data-require-permission]').forEach(el => {
      if (!window.userPermissions[el.dataset.requirePermission]) el.style.display = 'none';
    });
    // Hide elements that require a specific role
    document.querySelectorAll('[data-require-role]').forEach(el => {
      const roles = el.dataset.requireRole.split(',').map(r => r.trim());
      if (!roles.includes(profile.role)) el.style.display = 'none';
    });
  }

  function showPendingPage(profile) {
    document.body.innerHTML = `
      <div style="min-height:100vh; display:flex; align-items:center; justify-content:center;
           background: linear-gradient(135deg, #1e1b4b 0%, #3730a3 40%, #4f46e5 100%);
           font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 20px;">
        
        <div style="background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(20px);
             border-radius: 24px; padding: 48px 40px; max-width: 500px; width: 100%;
             text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
          
          <div style="width: 80px; height: 80px; background: #eef2ff; border-radius: 20px;
               display: flex; align-items: center; justify-content: center; margin: 0 auto 24px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="#4f46e5" class="bi bi-shield-lock" viewBox="0 0 16 16">
              <path d="M5.338 1.59a.5.5 0 0 1 .424.039l6 3.5a.5.5 0 0 1 .238.43V12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5.56a.5.5 0 0 1 .238-.43l6-3.5zM6 14a1 1 0 0 0 1-1V5.26L2.415 8.113A1 1 0 0 0 2 8.94V12a1 1 0 0 0 1 1h3z"/>
              <path d="M8 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
              <path d="M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h13zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-13z"/>
              <path d="M7 6.5A1.5 1.5 0 0 1 8.5 5h3A1.5 1.5 0 0 1 13 6.5v2A1.5 1.5 0 0 1 11.5 10h-3A1.5 1.5 0 0 1 7 8.5v-2zM8.5 6a.5.5 0 0 0-.5.5v2a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 0-.5-.5h-3z"/>
            </svg>
          </div>
          
          <h2 style="color: #1e1b4b; font-weight: 800; font-size: 26px; margin-bottom: 12px; letter-spacing: -0.5px;">
            Account Activation Required
          </h2>
          
          <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin-bottom: 32px;">
            Hello <b>${profile?.full_name || 'User'}</b>. For security reasons, your account for 
            <span style="color: #4f46e5; font-weight: 600;">Khalid & Sons Petroleum</span> 
            is currently <b>Pending Manual Approval</b> by an administrator.
          </p>

          <div style="background: #f9fafb; border: 1px dashed #d1d5db; border-radius: 16px; padding: 20px; margin-bottom: 32px;">
            <div style="font-size: 13px; text-transform: uppercase; color: #9ca3af; font-weight: 700; margin-bottom: 8px; letter-spacing: 1px;">
              Request Details
            </div>
            <div style="color: #111827; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span style="width: 8px; height: 8px; background: #f59e0b; border-radius: 50%;"></span>
              Role: ${profile?.role?.replace('_', ' ').toUpperCase() || 'N/A'}
            </div>
          </div>

          <button onclick="window.handleLogout()"
            style="width: 100%; background: linear-gradient(135deg, #4f46e5, #3730a3); color: #fff;
            border: none; border-radius: 12px; padding: 14px 24px; cursor: pointer; font-weight: 700;
            font-size: 16px; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.4);">
            Return to Login
          </button>
          
          <p style="margin-top: 24px; font-size: 14px; color: #9ca3af;">
            Questions? Contact your site manager.
          </p>
        </div>
      </div>`;
  }

  window.handleLogout = async function () {
    try { await window.supabaseClient.auth.signOut(); } catch {}
    window.currentUser = window.currentUserProfile = null;
    window.location.href = 'login.html';
  };

  // ── Pump Profile Helpers ─────────────────────────────────────
  window.auth = window.auth || {};
  window.auth.getPumpDetails = () => {
    const d = localStorage.getItem('pf_pump_details');
    return d ? JSON.parse(d) : { name: 'Khalid & Sons', owner: 'Super Admin', city: 'Punjab', address: '' };
  };
  window.auth.updatePumpDetails = (details) => {
    localStorage.setItem('pf_pump_details', JSON.stringify(details));
  };
  window.auth.getCurrentUser = async () => {
    const { data } = await window.supabaseClient.auth.getUser();
    return data?.user || window.currentUser;
  };
  window.auth.logout = window.handleLogout;

  window.hasPermission = perm => !!(window.userPermissions && window.userPermissions[perm]);
  window.isRole = (...roles) => roles.includes(window.userRole);

  console.log('✅ Auth v2.1 (sync-enabled) loaded');
})();
