// assets/js/transactions-enhancements-WORKING.js
(function () {
  "use strict";

  function $(id) {
    return document.getElementById(id);
  }

  function safeNumber(v) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }

  // Ensure core object exists
  const core = window.__TXN__;
  if (!core) {
    console.warn("⚠️ __TXN__ core not found. Load transactions-page-FINAL.js before this file.");
  }

  // =========================================================
  // SALE: Toggle Entry Method
  // =========================================================
  window.toggleSaleMethod = function (method) {
    const litersSection = $("sale-liters-section");
    const amountSection = $("sale-amount-section");

    if (method === "liters") {
      if (litersSection) litersSection.style.display = "block";
      if (amountSection) amountSection.style.display = "none";
      if ($("sale-liters")) $("sale-liters").required = true;
      if ($("sale-amount-direct")) $("sale-amount-direct").required = false;
    } else {
      if (litersSection) litersSection.style.display = "none";
      if (amountSection) amountSection.style.display = "block";
      if ($("sale-liters")) $("sale-liters").required = false;
      if ($("sale-amount-direct")) $("sale-amount-direct").required = true;
    }
  };

  // =========================================================
  // SALE: Update Fuel Price into unit price
  // =========================================================
  window.updateSaleFuelPrice = function () {
    const fuelType = $("sale-fuel-type")?.value;
    if (!fuelType) return;

    const prices = core?.fuelPrices || { Petrol: 285, Diesel: 305 };
    const price = safeNumber(prices[fuelType]) || (fuelType === "Petrol" ? 285 : 305);

    if ($("sale-unit-price")) $("sale-unit-price").value = price;

    // recalc if something already entered
    if ($("sale-liters")?.value) window.calcSaleFromLiters();
    if ($("sale-amount-direct")?.value) window.calcSaleFromAmount();
  };

  // =========================================================
  // SALE: Calculate total from liters
  // =========================================================
  window.calcSaleFromLiters = function () {
    const liters = safeNumber($("sale-liters")?.value);
    const rate = safeNumber($("sale-unit-price")?.value);
    const total = liters > 0 && rate > 0 ? liters * rate : 0;

    if ($("sale-amount")) $("sale-amount").value = total > 0 ? total.toFixed(2) : "";
  };

  // =========================================================
  // SALE: Calculate liters from amount
  // =========================================================
  window.calcSaleFromAmount = function () {
    const amount = safeNumber($("sale-amount-direct")?.value);
    const rate = safeNumber($("sale-unit-price")?.value);
    if (amount > 0 && rate > 0) {
      const liters = amount / rate;
      if ($("sale-liters")) $("sale-liters").value = liters.toFixed(2);
      if ($("sale-amount")) $("sale-amount").value = amount.toFixed(2);
    } else {
      if ($("sale-amount")) $("sale-amount").value = "";
    }
  };

  // =========================================================
  // VASOOLI: Fuel prices input UI (Petrol/Diesel)
  // We inject a small box into vasooli modal (no HTML changes required)
  // =========================================================
  function injectFuelPriceBoxIfMissing() {
    const modalBody = $("vasooliModal")?.querySelector(".modal-body");
    if (!modalBody) return;

    if (modalBody.querySelector("#fuel-price-box")) return;

    const box = document.createElement("div");
    box.id = "fuel-price-box";
    box.className = "alert alert-light border mb-3";

    box.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-2">
        <strong>Fuel Prices (Auto Calculation)</strong>
        <button type="button" class="btn btn-sm btn-outline-primary" id="btn-save-fuel-prices">
          Save Prices
        </button>
      </div>
      <div class="row g-2">
        <div class="col-md-6">
          <label class="form-label small mb-1">Petrol Price</label>
          <input type="number" step="0.01" class="form-control" id="input-petrol-price" placeholder="e.g. 285">
        </div>
        <div class="col-md-6">
          <label class="form-label small mb-1">Diesel Price</label>
          <input type="number" step="0.01" class="form-control" id="input-diesel-price" placeholder="e.g. 305">
        </div>
      </div>
      <small class="text-muted d-block mt-2">
        Agar price change ho to yahan update karo. Vasooli liters enter karoge to amount auto calculate hoga.
      </small>
    `;

    // Insert at top of modal body
    modalBody.insertBefore(box, modalBody.firstChild);

    // Save button
    const btn = document.getElementById("btn-save-fuel-prices");
    if (btn) {
      btn.addEventListener("click", async () => {
        const p = safeNumber(document.getElementById("input-petrol-price")?.value) || 285;
        const d = safeNumber(document.getElementById("input-diesel-price")?.value) || 305;

        // update core + settings
        if (core?.saveFuelPricesToSettings) {
          await core.saveFuelPricesToSettings(p, d);
        } else {
          // fallback
          if (core) core.fuelPrices = { Petrol: p, Diesel: d };
        }

        alert("✅ Fuel prices saved!");
        window.calculateVasooliAmount();
      });
    }
  }

  // Refresh UI price inputs from current loaded prices
  window.refreshFuelUI = function () {
    injectFuelPriceBoxIfMissing();
    const prices = core?.fuelPrices || { Petrol: 285, Diesel: 305 };

    const p = document.getElementById("input-petrol-price");
    const d = document.getElementById("input-diesel-price");

    if (p) p.value = safeNumber(prices.Petrol) || 285;
    if (d) d.value = safeNumber(prices.Diesel) || 305;
  };

  // =========================================================
  // VASOOLI: calculate amount = liters * fuelPrice
  // =========================================================
  window.calculateVasooliAmount = function () {
    const fuelCategory = $("vasooli-fuel-category")?.value;
    const liters = safeNumber($("vasooli-liters")?.value);
    const amountInput = $("vasooli-amount");

    if (!amountInput) return;

    if (!fuelCategory || liters <= 0) return;

    const prices = core?.fuelPrices || { Petrol: 285, Diesel: 305 };
    const price = safeNumber(prices[fuelCategory]) || (fuelCategory === "Petrol" ? 285 : 305);

    const amount = liters * price;
    amountInput.value = amount.toFixed(2);
  };

  // =========================================================
  // Hook vasooli inputs (no HTML change required)
  // =========================================================
  function hookVasooliInputs() {
    const fuelSel = $("vasooli-fuel-category");
    const litersInput = $("vasooli-liters");

    if (fuelSel) {
      fuelSel.addEventListener("change", () => {
        window.calculateVasooliAmount();
      });
    }

    if (litersInput) {
      litersInput.addEventListener("input", () => {
        window.calculateVasooliAmount();
      });
    }

    // If form submit doesn't call addVasooli in your HTML, enforce it:
    const form = $("vasooliForm");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (typeof window.addVasooli === "function") window.addVasooli();
      });
    }
  }

  // =========================================================
  // Hook sale inputs
  // =========================================================
  function hookSaleInputs() {
    const fuelSel = $("sale-fuel-type");
    const liters = $("sale-liters");
    const amountDirect = $("sale-amount-direct");

    if (fuelSel) fuelSel.addEventListener("change", window.updateSaleFuelPrice);
    if (liters) liters.addEventListener("input", window.calcSaleFromLiters);
    if (amountDirect) amountDirect.addEventListener("input", window.calcSaleFromAmount);
  }

  document.addEventListener("DOMContentLoaded", () => {
    hookSaleInputs();
    hookVasooliInputs();
  });

  // Also when vasooli modal opens
  const vasooliModal = $("vasooliModal");
  if (vasooliModal) {
    vasooliModal.addEventListener("shown.bs.modal", () => {
      window.refreshFuelUI();
      hookVasooliInputs();
    });
  }
})();


// // Transactions Enhancements - Complete Working Version
// (function() {
// 'use strict';

// const supabase = window.supabaseClient;
// function $(id) { return document.getElementById(id); }

// function formatNumber(num) {
//   return Number(num || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// }

// // ============================================
// // NEW SALE FUNCTIONS
// // ============================================

// // Toggle Entry Method
// window.toggleSaleMethod = function(method) {
//   const litersSection = $('sale-liters-section');
//   const amountSection = $('sale-amount-section');
  
//   if (method === 'liters') {
//     if (litersSection) litersSection.style.display = 'block';
//     if (amountSection) amountSection.style.display = 'none';
//     if ($('sale-liters')) $('sale-liters').required = true;
//     if ($('sale-amount-direct')) $('sale-amount-direct').required = false;
//   } else {
//     if (litersSection) litersSection.style.display = 'none';
//     if (amountSection) amountSection.style.display = 'block';
//     if ($('sale-liters')) $('sale-liters').required = false;
//     if ($('sale-amount-direct')) $('sale-amount-direct').required = true;
//   }
// };

// // Update Fuel Price
// window.updateSaleFuelPrice = function() {
//   const fuelType = $('sale-fuel-type')?.value;
//   if (!fuelType) return;

//   // Get price from localStorage or use defaults
//   const prices = JSON.parse(localStorage.getItem('fuel_prices') || '{}');
//   const defaultPrices = { 'Petrol': 285, 'Diesel': 305 };
  
//   const price = prices[fuelType] || defaultPrices[fuelType] || 0;
  
//   if ($('sale-unit-price')) {
//     $('sale-unit-price').value = price;
//   }
  
//   console.log('Fuel price set:', fuelType, '=', price);
  
//   // Recalculate if liters entered
//   if ($('sale-liters')?.value) {
//     window.calcSaleFromLiters();
//   }
// };

// // Calculate from Liters
// window.calcSaleFromLiters = function() {
//   const liters = parseFloat($('sale-liters')?.value) || 0;
//   const rate = parseFloat($('sale-unit-price')?.value) || 0;
  
//   console.log('Calculating from liters:', liters, 'x', rate);
  
//   if (liters > 0 && rate > 0) {
//     const total = liters * rate;
//     if ($('sale-amount')) {
//       $('sale-amount').value = total.toFixed(2);
//     }
//   } else {
//     if ($('sale-amount')) {
//       $('sale-amount').value = '';
//     }
//   }
// };

// // Calculate from Amount
// window.calcSaleFromAmount = function() {
//   const amount = parseFloat($('sale-amount-direct')?.value) || 0;
//   const rate = parseFloat($('sale-unit-price')?.value) || 0;
  
//   console.log('Calculating from amount:', amount, '÷', rate);
  
//   if (amount > 0 && rate > 0) {
//     const liters = amount / rate;
//     if ($('sale-liters')) {
//       $('sale-liters').value = liters.toFixed(2);
//     }
//     if ($('sale-amount')) {
//       $('sale-amount').value = amount.toFixed(2);
//     }
//   } else {
//     if ($('sale-amount')) {
//       $('sale-amount').value = '';
//     }
//   }
// };

// // ============================================
// // VASOOLI FUNCTIONS
// // ============================================

// // Load Customer Balance
// window.loadVasooliCustomerBalance = async function(customerId) {
//   console.log('Loading balance for customer:', customerId);
  
//   if (!customerId) {
//     if ($('vasooli-balance-info')) {
//       $('vasooli-balance-info').style.display = 'none';
//     }
//     return;
//   }

//   try {
//     const { data: customer, error } = await supabase
//       .from('customers')
//       .select('balance')
//       .eq('id', customerId)
//       .single();

//     if (error) throw error;

//     if (customer && $('vasooli-current-balance')) {
//       const balance = Number(customer.balance || 0);
//       $('vasooli-current-balance').textContent = 'Rs. ' + formatNumber(balance);
//       if ($('vasooli-balance-info')) {
//         $('vasooli-balance-info').style.display = 'block';
//       }
//       console.log('Balance loaded:', balance);
//     }
//   } catch (error) {
//     console.error('Error loading balance:', error);
//   }
// };

// // Add Vasooli
// window.addVasooli = async function() {
//   const customerId = $('vasooli-customer')?.value;
//   const amount = parseFloat($('vasooli-amount')?.value);
//   const month = $('vasooli-month')?.value;
//   const method = $('vasooli-method')?.value || 'Cash';
//   const description = $('vasooli-description')?.value || '';

//   console.log('Adding vasooli:', { customerId, amount, month, method });

//   if (!customerId || !amount) {
//     alert('Please select customer and enter amount');
//     return;
//   }

//   try {
//     // Build description
//     let fullDescription = 'Payment received';
//     if (month) {
//       const date = new Date(month + '-01');
//       const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
//       fullDescription = `Payment for ${monthName}`;
//     }
//     if (description) {
//       fullDescription += ` - ${description}`;
//     }
//     fullDescription += ` via ${method}`;

//     // Insert transaction
//     const { error } = await supabase
//       .from('transactions')
//       .insert([{
//         customer_id: parseInt(customerId),
//         transaction_type: 'Debit',
//         amount: amount,
//         description: fullDescription,
//         payment_method: method,
//         payment_month: month || null
//       }]);

//     if (error) throw error;

//     alert('Payment recorded successfully!');
    
//     // Close modal
//     const modal = bootstrap.Modal.getInstance($('vasooliModal'));
//     if (modal) modal.hide();
    
//     // Reset form
//     if ($('vasooliForm')) $('vasooliForm').reset();
//     if ($('vasooli-balance-info')) $('vasooli-balance-info').style.display = 'none';
    
//     // Reload data
//     if (typeof window.loadInitialTransactions === 'function') {
//       window.loadInitialTransactions();
//     }

//   } catch (error) {
//     console.error('Error adding vasooli:', error);
//     alert('Error: ' + error.message);
//   }
// };

// // ============================================
// // EXPENSE FUNCTIONS
// // ============================================

// // Add Expense
// window.addExpense = async function() {
//   const amount = parseFloat($('expense-amount')?.value);
//   const description = $('expense-description')?.value;
//   const expenseType = $('expense-type')?.value;
//   const account = $('expense-account')?.value;

//   console.log('Adding expense:', { amount, description, expenseType, account });

//   if (!amount || !description || !expenseType || !account) {
//     alert('Please fill all required fields');
//     return;
//   }

//   try {
//     // Find Owner customer OR use first customer
//     let customerId = null;
    
//     const { data: owner } = await supabase
//       .from('customers')
//       .select('id')
//       .eq('category', 'Owner')
//       .maybeSingle();

//     if (owner) {
//       customerId = owner.id;
//     } else {
//       // No Owner found, use first customer
//       const { data: firstCustomer } = await supabase
//         .from('customers')
//         .select('id')
//         .limit(1)
//         .single();
      
//       if (firstCustomer) {
//         customerId = firstCustomer.id;
//       } else {
//         // No customers at all - create Owner
//         const { data: newOwner, error: createError } = await supabase
//           .from('customers')
//           .insert([{
//             sr_no: 0,
//             name: 'Owner',
//             category: 'Owner',
//             balance: 0
//           }])
//           .select()
//           .single();
        
//         if (createError) throw createError;
//         customerId = newOwner.id;
//       }
//     }

//     console.log('Using customer ID:', customerId);

//     // Insert expense
//     const { error } = await supabase
//       .from('transactions')
//       .insert([{
//         customer_id: customerId,
//         transaction_type: 'Expense',
//         amount: amount,
//         description: `${expenseType}: ${description} (From: ${account})`,
//         expense_type: expenseType,
//         expense_account: account
//       }]);

//     if (error) throw error;

//     alert('Expense recorded successfully!');
    
//     // Close modal
//     const modal = bootstrap.Modal.getInstance($('expenseModal'));
//     if (modal) modal.hide();
    
//     // Reset form
//     if ($('expenseForm')) $('expenseForm').reset();
    
//     // Reload data
//     if (typeof window.loadInitialTransactions === 'function') {
//       window.loadInitialTransactions();
//     }

//   } catch (error) {
//     console.error('Error adding expense:', error);
//     alert('Error: ' + error.message);
//   }
// };

// // ============================================
// // INITIALIZE
// // ============================================

// // Set fuel price when modal opens
// document.addEventListener('DOMContentLoaded', () => {
//   // Listen for modal open events
//   const saleModal = $('newSaleModal');
//   if (saleModal) {
//     saleModal.addEventListener('shown.bs.modal', () => {
//       console.log('New Sale modal opened');
//       // Set initial fuel price
//       if ($('sale-fuel-type')?.value) {
//         window.updateSaleFuelPrice();
//       }
//     });
//   }
// });

// console.log('✅ Transaction enhancements loaded');

// })();