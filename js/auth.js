// =============================================
// FILE: js/auth.js
// AUTHENTICATION - WORKS WITH LOGIN.JS
// =============================================

(function() {
    'use strict';
    
    if (window.PETRO_AUTH_LOADED) return;
    window.PETRO_AUTH_LOADED = true;
    
    const isAuthPage = window.location.pathname.includes('login') || 
                       window.location.pathname.includes('signup');
    
    // Initialize
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
            
            console.log('✅ Logged in:', data.user.email);
            
        } catch (err) {
            console.error('Auth error:', err);
            window.location.replace('login.html');
        }
    }
    
    window.handleLogout = async function() {
        try {
            await window.supabaseClient.auth.signOut();
            window.location.href = 'login.html';
        } catch (err) {
            console.error('Logout error:', err);
        }
    };
    
    console.log('✅ Auth loaded');
    
})();