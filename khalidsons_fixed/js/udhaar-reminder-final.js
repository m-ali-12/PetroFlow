/**
 * udhaar-reminder.js  v1.0
 * Khalid & Sons Petroleum — Udhaar Reminder & Session Tracker
 *
 * ══════════════════════════════════════════════════════════════
 * PROBLEM SOLVED:
 *   1. Machine reading mein udhaar darj hoti hai (e.g. Rs. 12,000)
 *   2. Kuch customers ka Credit transactions page pe enter nahi hota
 *   3. Break ke baad user bhool jata hai → NUKSAN
 *
 * SOLUTION:
 *   A) "Udhaar Session" system:
 *      - Jab daily reading save hoti hai → us din ka udhaar amount
 *        localStorage mein "pending session" ban jata hai
 *      - Transactions page pe top par ORANGE BANNER dikhta hai:
 *        "⚠️ Aaj Rs. 12,000 ka udhaar pending hai — X customers entered, Y remaining"
 *      - User manually customers enter karta jaata hai
 *      - Jab entered Credit txns ka total = machine udhaar → session auto-close
 *
 *   B) Customers page pe "Pending Udhaar" column:
 *      - Daily reading ka unmatched udhaar amount show hota hai
 *      - Green tick jab matched, orange warning jab pending
 *
 * DB READS (read-only, no new tables needed):
 *   - transactions: entry_method='machine_reading', transaction_type='CashSale'
 *     → description JSON mein udhaar field
 *   - transactions: transaction_type='Credit', same date
 *     → already entered customer credits
 *
 * STORAGE: localStorage (session memory — resets on clear)
 *   Key: 'udhaar_sessions'
 *   Value: [{date, machineUdhaar, fuelType, readingId, closedAt?}]
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'udhaar_sessions';
  const MAX_SESSIONS = 30; // last 30 days

  /* ─── Helpers ─────────────────────────────────────────────── */
  const fmt = n => Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const today = () => new Date().toISOString().split('T')[0];
  const sb = () => window.supabaseClient;

  /* ─── Session Storage ─────────────────────────────────────── */
  function getSessions() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch(e) { return []; }
  }
  function saveSessions(arr) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr.slice(-MAX_SESSIONS)));
  }

  /**
   * Called from daily-readings.js after successful insert
   * Registers a new udhaar session for today
   * @param {string} date  - YYYY-MM-DD
   * @param {number} amount - total udhaar from all machines that day
   * @param {string} fuelType - 'Petrol' | 'Diesel' | 'Mixed'
   */
  window.UdhaarReminder = window.UdhaarReminder || {};
  window.UdhaarReminder.registerSession = function(date, amount, fuelType) {
    if (!amount || amount <= 0) return;
    const sessions = getSessions();
    // Upsert: same date ka existing session update karo
    const idx = sessions.findIndex(s => s.date === date);
    const session = {
      date,
      machineUdhaar: amount,
      fuelType: fuelType || 'Mixed',
      registeredAt: new Date().toISOString(),
      closedAt: null,
      manuallyDismissed: false
    };
    if (idx >= 0) sessions[idx] = session;
    else sessions.push(session);
    saveSessions(sessions);
  };

  /**
   * Manually dismiss a session (user confirms all customers entered)
   */
  /**
   * Manually refresh banner (called after save from daily-readings)
   */
  window.UdhaarReminder.refreshBanner = function() {
    const old = document.getElementById('udhaar-reminder-banner');
    if (old) old.remove();
    loadAndRenderBanner();
  };

  window.UdhaarReminder.dismissSession = function(date) {
    const sessions = getSessions();
    const idx = sessions.findIndex(s => s.date === date);
    if (idx >= 0) {
      sessions[idx].manuallyDismissed = true;
      sessions[idx].closedAt = new Date().toISOString();
      saveSessions(sessions);
    }
    // Remove banner
    const banner = document.getElementById('udhaar-reminder-banner');
    if (banner) banner.remove();
  };

  /* ─── Core: Load & Render Banner ─────────────────────────── */
  async function loadAndRenderBanner() {
    const supabase = sb();
    if (!supabase) { setTimeout(loadAndRenderBanner, 300); return; }

    const sessions = getSessions();
    if (!sessions.length) return;

    // Only show open sessions from last 3 days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const openSessions = sessions.filter(s =>
      !s.manuallyDismissed && !s.closedAt &&
      new Date(s.date) >= threeDaysAgo
    );
    if (!openSessions.length) return;

    // For each open session, fetch how much Credit txns have been entered that day
    const enriched = await Promise.all(openSessions.map(async session => {
      const dayStart = session.date + 'T00:00:00+05:00';
      const dayEnd   = session.date + 'T23:59:59+05:00';

      // Credit transactions entered for this day
      const { data: credits } = await supabase
        .from('transactions')
        .select('id, charges, customer_id')
        .eq('transaction_type', 'Credit')
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd);

      const enteredAmount = (credits || []).reduce((sum, t) => sum + (parseFloat(t.charges) || 0), 0);
      const uniqueCustomers = new Set((credits || []).map(t => t.customer_id)).size;
      const pendingAmount = Math.max(0, session.machineUdhaar - enteredAmount);
      const pct = session.machineUdhaar > 0
        ? Math.min(100, Math.round((enteredAmount / session.machineUdhaar) * 100))
        : 100;

      // Auto-close if fully entered (within Rs. 1 tolerance)
      if (pendingAmount <= 1) {
        const arr = getSessions();
        const i = arr.findIndex(s => s.date === session.date);
        if (i >= 0) { arr[i].closedAt = new Date().toISOString(); saveSessions(arr); }
        return null; // don't show banner
      }

      return { ...session, enteredAmount, pendingAmount, uniqueCustomers, pct };
    }));

    const visible = enriched.filter(Boolean);
    if (!visible.length) return;

    renderBanner(visible);
  }

  /* ─── Render ─────────────────────────────────────────────── */
  function renderBanner(sessions) {
    // Remove existing banner
    const old = document.getElementById('udhaar-reminder-banner');
    if (old) old.remove();

    // Insert banner at top of main content area
    const banner = document.createElement('div');
    banner.id = 'udhaar-reminder-banner';
    banner.style.cssText = `
      background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
      border: 2px solid #f0a500;
      border-radius: 10px;
      padding: 0;
      margin: 0 0 18px 0;
      box-shadow: 0 2px 12px rgba(240,165,0,0.18);
      overflow: hidden;
    `;

    const sessionHTML = sessions.map(s => {
      const isToday = s.date === today();
      const dateLabel = isToday ? '⚡ Aaj' : `📅 ${s.date}`;
      const statusColor = s.pct < 50 ? '#dc3545' : s.pct < 100 ? '#fd7e14' : '#198754';

      return `
        <div style="padding:14px 18px;border-bottom:1px solid rgba(240,165,0,0.3);">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">

            <div style="flex:1;min-width:200px;">
              <div style="font-size:13px;font-weight:800;color:#856404;margin-bottom:6px;">
                ⚠️ ${dateLabel} — Udhaar Pending Hai!
              </div>
              <div style="display:flex;gap:18px;flex-wrap:wrap;font-size:12px;font-family:'Courier New',monospace;">
                <span>📊 Machine Reading: <strong>Rs. ${fmt(s.machineUdhaar)}</strong></span>
                <span style="color:#198754;">✅ Enter Kiya: <strong>Rs. ${fmt(s.enteredAmount)}</strong></span>
                <span style="color:#dc3545;font-weight:800;">🔴 Baaki: <strong>Rs. ${fmt(s.pendingAmount)}</strong></span>
                <span>👥 Customers: <strong>${s.uniqueCustomers}</strong> entered</span>
              </div>

              <!-- Progress bar -->
              <div style="margin-top:8px;background:rgba(0,0,0,0.1);border-radius:20px;height:8px;overflow:hidden;">
                <div style="height:100%;border-radius:20px;background:${statusColor};width:${s.pct}%;transition:width .6s ease;"></div>
              </div>
              <div style="font-size:10px;color:#856404;margin-top:3px;">${s.pct}% complete — Rs.${fmt(s.pendingAmount)} abhi bhi darj nahi</div>
            </div>

            <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;">
              <button
                onclick="window.UdhaarReminder.dismissSession('${s.date}')"
                style="background:#198754;color:#fff;border:none;border-radius:6px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;"
                title="Sab customers enter ho gaye hain">
                ✅ Sab Enter Ho Gaye
              </button>
              <button
                onclick="document.getElementById('udhaar-reminder-banner').style.display='none'"
                style="background:rgba(0,0,0,0.1);color:#856404;border:none;border-radius:6px;padding:7px 10px;font-size:12px;cursor:pointer;"
                title="Abhi ke liye chhupao">
                ✕
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    banner.innerHTML = `
      <div style="background:#f0a500;padding:8px 18px;display:flex;align-items:center;gap:8px;">
        <span style="font-size:14px;">🔔</span>
        <span style="font-weight:800;color:#fff;font-size:13px;letter-spacing:.3px;">UDHAAR REMINDER — Credit Customers Pending</span>
        <span style="margin-left:auto;background:rgba(255,255,255,0.2);color:#fff;border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700;">${sessions.length} session${sessions.length > 1 ? 's' : ''}</span>
      </div>
      ${sessionHTML}
    `;

    // Insert after navbar, at top of main wrapper
    const mainWrap = document.querySelector('.main-wrapper, .container-fluid.main-wrapper, .container-xl, .container');
    if (mainWrap) {
      mainWrap.insertBefore(banner, mainWrap.firstElementChild);
    } else {
      // fallback: insert right after body start
      document.body.insertBefore(banner, document.body.firstElementChild);
    }
  }

  /* ─── Customers Page: Pending Udhaar Column ──────────────── */
  /**
   * Returns pending udhaar for a specific date (today by default)
   * Used in customers-page.js to show udhaar info in summary
   */
  window.UdhaarReminder.getDailySummary = async function(date) {
    date = date || today();
    const supabase = sb();
    if (!supabase) return null;

    const dayStart = date + 'T00:00:00+05:00';
    const dayEnd   = date + 'T23:59:59+05:00';

    // Machine readings for today
    const { data: readings } = await supabase
      .from('transactions')
      .select('description, fuel_type, charges, liters')
      .eq('transaction_type', 'CashSale')
      .eq('entry_method', 'machine_reading')
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd);

    let totalMachineUdhaar = 0;
    (readings || []).forEach(r => {
      try {
        const meta = JSON.parse(r.description || '{}');
        totalMachineUdhaar += parseFloat(meta.udhaar || 0);
      } catch(e) {}
    });

    // Credit transactions for today
    const { data: credits } = await supabase
      .from('transactions')
      .select('id, charges, customer_id')
      .eq('transaction_type', 'Credit')
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd);

    const enteredAmount = (credits || []).reduce((sum, t) => sum + (parseFloat(t.charges) || 0), 0);
    const uniqueCustomers = new Set((credits || []).map(t => t.customer_id)).size;
    const pendingAmount = Math.max(0, totalMachineUdhaar - enteredAmount);

    return {
      date,
      machineUdhaar: totalMachineUdhaar,
      enteredAmount,
      pendingAmount,
      uniqueCustomers,
      hasReadings: (readings || []).length > 0
    };
  };

  /* ─── patchDailySave removed ─────────────────────────────────
     daily-readings-v2.js mein pehle se registerSession built-in hai.
     Double registration se bachne ke liye yeh patch hata diya.
     daily-readings-v2.js mein save ke baad khud registerSession call
     hoti hai aur banner setTimeout(loadAndRenderBanner,800) refresh karta hai.
  ─────────────────────────────────────────────────────────── */

  /* ─── Init ────────────────────────────────────────────────── */
  function init() {
    const page = document.body?.getAttribute('data-page') || '';

    // Show banner on transactions page and customers page
    if (['transactions', 'customers', 'daily-readings'].includes(page)) {
      loadAndRenderBanner();
    }

    // daily-readings page pe save ke baad banner refresh
    // (daily-readings-v2.js mein registerSession already built-in hai)
    if (page === 'daily-readings') {
      // Re-check banner after 2s — in case a reading was just saved
      setTimeout(loadAndRenderBanner, 2000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOMContentLoaded already fired
    setTimeout(init, 100);
  }

})();