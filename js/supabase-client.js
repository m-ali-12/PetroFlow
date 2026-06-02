// Compatibility bridge for old pages/components.
// Main Supabase setup lives in /js/config.js.
(function () {
  if (window.supabaseClient) return;
  console.warn('supabase-client.js loaded before config.js. Please load /js/config.js before this file.');
})();
