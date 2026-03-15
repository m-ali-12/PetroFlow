// =============================================
// FILE: js/auth.js
// AUTHENTICATION - FULLY ENABLED
// =============================================

(function() {
    'use strict';
    
    if (window.PETRO_AUTH_LOADED) return;
    window.PETRO_AUTH_LOADED = true;
    
    const isAuthPage = window.location.pathname.includes('login') || 
                       window.location.pathname.includes('signup') ||
                       window.location.pathname.includes('forgot-password');
    
    // Initialize
    window.addEventListener('DOMContentLoaded', function() {
        setTimeout(init, 200);
    });
    
    function init() {
        if (!window.supabaseClient) {
            setTimeout(init, 100);
            return;
        }
        
        console.log('✅ Auth ready');
        
        if (!isAuthPage) {
            checkAuth();
        } else {
            // On auth pages: if already logged in, redirect to dashboard
            redirectIfLoggedIn();
        }
    }
    
    async function redirectIfLoggedIn() {
        try {
            const { data } = await window.supabaseClient.auth.getSession();
            if (data?.session?.user) {
                window.location.replace('index.html');
            }
        } catch(e) {
            // Not logged in, stay on page
        }
    }
    
    async function checkAuth() {
        try {
            const { data, error } = await window.supabaseClient.auth.getSession();
            
            if (error || !data?.session?.user) {
                console.warn('Not authenticated, redirecting to login...');
                window.location.replace('login.html');
                return;
            }
            
            // Store current user globally for easy access
            window.currentUser = data.session.user;
            window.currentUserId = data.session.user.id;
            
            console.log('✅ Logged in:', data.session.user.email);
            
        } catch (err) {
            console.error('Auth error:', err);
            window.location.replace('login.html');
        }
    }
    
    // Logout handler
    window.handleLogout = async function() {
        try {
            if (window.supabaseClient) {
                await window.supabaseClient.auth.signOut();
            }
            window.currentUser = null;
            window.currentUserId = null;
            window.location.replace('login.html');
        } catch (err) {
            console.error('Logout error:', err);
            window.location.replace('login.html');
        }
    };
    
    console.log('✅ Auth.js loaded (authentication ENABLED)');
    
})();
