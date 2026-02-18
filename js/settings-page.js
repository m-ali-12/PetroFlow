// =============================================
// SETTINGS PAGE - PRICE HISTORY & SEO
// =============================================
(function() {
  'use strict';
  const supabase = window.supabaseClient;

  window.saveFuelPricesWithHistory = async function() {
    const petrol = parseFloat(document.getElementById('petrol-price').value);
    const diesel = parseFloat(document.getElementById('diesel-price').value);
    const date = document.getElementById('price-effective-date').value;

    if(!petrol || !diesel || !date) return alert("Fill all fields");

    const { data: { user } } = await supabase.auth.getUser();
    
    // Get existing history
    const { data } = await supabase.from('settings').select('price_history').eq('user_id', user.id).maybeSingle();
    let history = data?.price_history || [];
    
    // Add new entry
    history.push({ date, petrol, diesel });
    
    const { error } = await supabase.from('settings').upsert({
      user_id: user.id,
      price_history: history,
      current_petrol: petrol,
      current_diesel: diesel,
      updated_at: new Date()
    });

    if(!error) alert("Prices updated for " + date);
  };
})();