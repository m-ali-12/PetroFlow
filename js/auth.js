// =============================================
// FILE: js/auth.js — AUTHENTICATION COMPLETE
// =============================================
(function() {
    'use strict';

    if (window.PETRO_AUTH_LOADED) return;
    window.PETRO_AUTH_LOADED = true;

    const isAuthPage = window.location.pathname.includes('login') ||
                       window.location.pathname.includes('signup') ||
                       window.location.pathname.includes('forgot-password') ||
                       window.location.pathname.includes('setup-config');

    window.addEventListener('DOMContentLoaded', function() {
        setTimeout(init, 250);
    });

    let _authAttempts = 0;
    function init() {
        _authAttempts++;
        if (!window.supabaseClient) {
            if (_authAttempts > 60) {
                // 9 seconds ke baad bhi nahi mila — config error
                console.error('❌ supabaseClient nahi bana. js/config.js mein SUPABASE_ANON_KEY check karein.');
                // Phir bhi navbar attach karo
                attachLogout();
                return;
            }
            setTimeout(init, 150);
            return;
        }

        if (!isAuthPage) {
            checkAuth();
        } else {
            // Auth pages: agar already logged in ho to dashboard pe bhejo
            window.supabaseClient.auth.getSession().then(({ data }) => {
                if (data?.session?.user && !window.location.pathname.includes('setup-config')) {
                    window.location.replace('index.html');
                }
            });
        }

        // Logout button — navbar mein load hone ke baad bhi kaam kare
        attachLogout();
        // Navbar dynamically load hoti hai, so observe for it
        const observer = new MutationObserver(() => attachLogout());
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function attachLogout() {
        const btn = document.getElementById('logout-btn');
        if (btn && !btn._logoutAttached) {
            btn._logoutAttached = true;
            btn.addEventListener('click', async function(e) {
                e.preventDefault();
                try {
                    if (window.supabaseClient) await window.supabaseClient.auth.signOut();
                } catch(err) { console.error('Logout err:', err); }
                window.currentUser   = null;
                window.currentUserId = null;
                window.location.replace('login.html');
            });
        }
    }

    async function checkAuth() {
        try {
            const { data, error } = await window.supabaseClient.auth.getSession();
            if (error || !data?.session?.user) {
                window.location.replace('login.html');
                return;
            }
            window.currentUser   = data.session.user;
            window.currentUserId = data.session.user.id;

            // Show user email in navbar
            const emailEl = document.getElementById('user-email-display');
            if (emailEl) emailEl.textContent = data.session.user.email;

            console.log('✅ Auth OK:', data.session.user.email);
        } catch(err) {
            console.error('Auth check error:', err);
            window.location.replace('login.html');
        }
    }

    // Global logout (for any button with onclick="handleLogout()")
    window.handleLogout = async function() {
        try {
            if (window.supabaseClient) await window.supabaseClient.auth.signOut();
        } catch(err) {}
        window.currentUser   = null;
        window.currentUserId = null;
        window.location.replace('login.html');
    };

    console.log('✅ auth.js loaded');
})();
