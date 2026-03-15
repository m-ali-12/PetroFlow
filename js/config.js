// =============================================
// FILE: js/config.js
// Khalid & Sons Petroleum - Configuration
// =============================================

// ⚠️ APNI SUPABASE KEYS YAHAN DAALEIN
const SUPABASE_URL = 'https://ycoxgzplqkqqhzqrc1vt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljb3hnenBscWtxcWh6cXJjMXZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc1NDIwMTYsImV4cCI6MjA1MzExODAxNn0.m7dPGWHPYiXx4hJpW3dXc8LPxsZQCDnGqJMQQVw7234';

// Supabase Client Initialize
if (window.supabase && typeof window.supabase.createClient === 'function') {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
    console.error('Supabase library load nahi hua! CDN link check karein.');
}

// Utility Functions
function formatNumber(num) {
    return Number(num || 0).toLocaleString('en-PK', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-PK', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
}

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

function showToast(msg, type = 'success') {
    // Auto-create toast container if missing
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }
    const id = 'toast-' + Date.now();
    const bgClass = type === 'success' ? 'bg-success text-white'
        : type === 'danger' || type === 'error' ? 'bg-danger text-white'
        : type === 'warning' ? 'bg-warning text-dark'
        : 'bg-info text-white';
    const icon = type === 'success' ? 'bi-check-circle-fill'
        : type === 'danger' || type === 'error' ? 'bi-x-circle-fill'
        : 'bi-exclamation-triangle-fill';
    container.insertAdjacentHTML('beforeend', `
      <div id="${id}" class="toast align-items-center border-0 ${bgClass}" role="alert">
        <div class="d-flex">
          <div class="toast-body fw-semibold">
            <i class="bi ${icon} me-2"></i>${msg}
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
      </div>`);
    const toastEl = document.getElementById(id);
    const toast = new bootstrap.Toast(toastEl, { delay: 3500 });
    toast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

window.formatNumber = formatNumber;
window.formatDate = formatDate;
window.getTodayDate = getTodayDate;
window.showToast = showToast;

// Convenience alias — all JS files can use `supabase` directly
Object.defineProperty(window, 'supabase', {
    get: function() { return window.supabaseClient; },
    configurable: true
});

console.log('Config loaded. Supabase:', window.supabaseClient ? 'OK' : 'FAILED');
