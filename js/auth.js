// =============================================
// FILE: js/auth.js
// AUTHENTICATION - ACTIVE WITH 5 USER LIMIT
// =============================================

(function() {
    'use strict';
    
    if (window.PETRO_AUTH_LOADED) return;
    window.PETRO_AUTH_LOADED = true;
    
    const isAuthPage = window.location.pathname.includes('login') || 
                       window.location.pathname.includes('signup');
    
    // ✅ AUTH ACTIVE — wait for supabase then check
    window.addEventListener('DOMContentLoaded', function() {
        setTimeout(init, 100);
    });
    
    function init() {
        if (!window.supabaseClient) {
            setTimeout(init, 100);
            return;
        }
        console.log('Auth ready');
        if (!isAuthPage) {
            checkAuth();
        }
    }
    
    async function checkAuth() {
        try {
            const { data, error } = await window.supabaseClient.auth.getUser();
            
            if (error || !data?.user) {
                window.location.replace('login.html');
                return;
            }
            
            // ✅ Store current user globally so app.js can use it
            window.CURRENT_USER = data.user;
            console.log('✅ Logged in:', data.user.email);
            
        } catch (err) {
            console.error('Auth error:', err);
            window.location.replace('login.html');
        }
    }
    
    // ✅ Logout handler
    window.handleLogout = async function() {
        try {
            if (window.supabaseClient) {
                await window.supabaseClient.auth.signOut();
            }
            window.CURRENT_USER = null;
            window.location.href = 'login.html';
        } catch (err) {
            console.error('Logout error:', err);
        }
    };
    
    console.log('✅ Auth loaded (authentication ACTIVE)');
    
})();