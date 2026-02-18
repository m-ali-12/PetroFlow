// =============================================
// MOBIL OIL MANAGEMENT - COMPLETE
// =============================================
(function() {
  'use strict';
  const supabase = window.supabaseClient;
  function $(id) { return document.getElementById(id); }

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    setupAutoCalc();
    loadInventory();
    loadMobilTransactions();
  }

  function setupAutoCalc() {
    const calc = () => {
      const q = parseFloat($('sale-quantity-mobil').value) || 0;
      const r = parseFloat($('sale-rate-mobil').value) || 0;
      $('sale-amount-mobil').value = (q * r).toFixed(2);
    };
    $('sale-quantity-mobil')?.addEventListener('input', calc);
    $('sale-rate-mobil')?.addEventListener('input', calc);
  }

  window.saveMobilSale = async function(e) {
    const { data: { user } } = await supabase.auth.getUser();
    const amt = parseFloat($('sale-amount-mobil').value);
    
    const { error } = await supabase.from('transactions').insert([{
      user_id: user.id,
      type: 'Mobil Sale',
      item_name: $('sale-item-name').value,
      quantity: parseFloat($('sale-quantity-mobil').value),
      amount: amt,
      date: $('sale-date').value
    }]);

    if (!error) {
      alert("Mobil sale recorded!");
      location.reload();
    }
  };

  async function loadInventory() {
    const { data } = await supabase.from('transactions').select('type, quantity').ilike('type', '%Mobil%');
    let stock = 0;
    data?.forEach(t => {
      if (t.type === 'Mobil Purchase') stock += t.quantity;
      else stock -= t.quantity;
    });
    if ($('current-mobil-stock')) $('current-mobil-stock').textContent = stock.toFixed(2) + " Ltr/Units";
  }

  document.addEventListener('DOMContentLoaded', init);
})();