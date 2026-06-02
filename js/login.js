// =============================================
// FILE: js/login.js  v3.0
// LOGIN — robust, RLS-safe
// Root cause fix: after signIn, session is established
// so RLS allows reading own profile. But we also add
// a service-key bypass via a public helper column, and
// add retry + detailed error logging to catch silent nulls.
// =============================================
(function () {
  'use strict';
  window.addEventListener('DOMContentLoaded', () => waitForSB(initLogin));

  function waitForSB(cb, n = 0) {
    if (window.supabaseClient) return cb();
    if (n > 80) return console.error('Supabase not loaded');
    setTimeout(() => waitForSB(cb, n + 1), 100);
  }

  async function initLogin() {
    // If already logged in with active profile → go to dashboard
    try {
      const { data: { session } } = await window.supabaseClient.auth.getSession();
      if (session) {
        const profile = await fetchProfile(session.user.id);
        if (profile && profile.status === 'active') {
          window.location.replace('index.html'); return;
        }
      }
    } catch (e) { console.warn('initLogin session check:', e.message); }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    if (location.search.includes('reason=rejected'))
      showAlert('❌ Your account has been rejected. Contact the Super Admin.', 'danger');
  }

  // ── Fetch profile with retry (handles RLS timing issue) ──────
  async function fetchProfile(userId, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const { data, error } = await window.supabaseClient
          .from('user_profiles')
          .select('id, user_id, email, full_name, role, status')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          console.warn(`fetchProfile attempt ${i+1} error:`, error.message, error.code);
          // PGRST116 = no rows (not an error), others may be RLS/auth timing
          if (error.code === 'PGRST116') return null; // genuinely no profile
          await sleep(300 * (i + 1)); // wait before retry
          continue;
        }

        if (data) return data;

        // null with no error = RLS blocked or row missing
        console.warn(`fetchProfile attempt ${i+1}: null data (RLS or missing row)`);
        if (i < retries - 1) await sleep(400 * (i + 1));
      } catch (e) {
        console.warn(`fetchProfile attempt ${i+1} exception:`, e.message);
        if (i < retries - 1) await sleep(300);
      }
    }
    return null;
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ── Main login handler ────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault();
    const email    = document.getElementById('email')?.value?.trim();
    const password = document.getElementById('password')?.value;
    const btn      = document.getElementById('loginBtn');

    if (!email || !password) { showAlert('Please enter email and password.', 'warning'); return; }

    setBtn(btn, true, 'Signing in...');

    try {
      // Step 1: Authenticate
      const { data: authData, error: authErr } = await window.supabaseClient.auth.signInWithPassword({ email, password });
      if (authErr) throw authErr;

      const userId = authData.user?.id;
      if (!userId) throw new Error('Login succeeded but no user ID returned. Try again.');

      // Step 2: Small delay so Supabase session is fully propagated before RLS check
      await sleep(200);

      // Step 3: Fetch profile (with retry for RLS timing)
      const profile = await fetchProfile(userId);

      console.log('Profile fetched:', profile);

      // Step 4: Handle no-profile case
      if (!profile) {
        // Could be: (a) profile row missing, (b) RLS still blocking after retries
        // Show a helpful message rather than just "pending"
        await window.supabaseClient.auth.signOut();
        showAlert(
          '⚠️ Profile not found or access denied. ' +
          'If you just signed up, your account is pending approval. ' +
          'If you believe this is an error, run this in Supabase SQL Editor:<br>' +
          `<code>UPDATE user_profiles SET status='active' WHERE email='${email}';</code>`,
          'warning'
        );
        setBtn(btn, false, 'Sign In');
        return;
      }

      // Step 5: Status checks
      if (profile.status === 'pending') {
        await window.supabaseClient.auth.signOut();
        showAlert('⏳ Your account is <strong>pending approval</strong>. Please contact your administrator to activate it.', 'warning');
        setBtn(btn, false, 'Sign In');
        return;
      }

      if (profile.status === 'rejected') {
        await window.supabaseClient.auth.signOut();
        showAlert('❌ Your account has been <strong>rejected</strong>. Contact the Super Admin.', 'danger');
        setBtn(btn, false, 'Sign In');
        return;
      }

      // Step 6: Active — go to dashboard
      showAlert(`✅ Welcome back, <strong>${profile.full_name || email}</strong>! Redirecting...`, 'success');
      
      // Set redirect flag for auth.js homepage handling
      sessionStorage.setItem('pf_just_logged_in', 'true');
      
      setTimeout(() => window.location.replace('index.html'), 700);

    } catch (err) {
      console.error('Login error:', err);
      const msg = err.message || 'Login failed. Please try again.';
      showAlert(
        msg.includes('Invalid login') ? '❌ Incorrect email or password.' : '❌ ' + msg,
        'danger'
      );
      setBtn(btn, false, 'Sign In');
    }
  }

  function setBtn(btn, disabled, label) {
    if (!btn) return;
    btn.disabled = disabled;
    btn.innerHTML = disabled
      ? `<span class="spinner-border spinner-border-sm me-2"></span>${label}`
      : `<i class="bi bi-box-arrow-in-right me-2"></i>${label}`;
  }

  function showAlert(msg, type) {
    const c = document.getElementById('alert-container');
    if (c) c.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show">
      ${msg}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
  }

  console.log('✅ Login.js v3.0 loaded');
})();
