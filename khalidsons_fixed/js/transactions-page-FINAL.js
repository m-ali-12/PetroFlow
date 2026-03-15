// assets/js/transactions-page-FINAL.js
(function () {
  "use strict";

  const supabase = window.supabaseClient;
  if (!supabase) {
    console.error("❌ supabaseClient not found on window");
    return;
  }

  // =============================
  // Globals
  // =============================
  let allTransactions = [];
  let allCustomers = [];
  let isSubmitting = false;

  let fuelPrices = { Petrol: 285, Diesel: 305 }; // fallback defaults

  // pagination (optional)
  let currentPage = 1;
  let itemsPerPage = 10;
  let sortOrder = "desc"; // "desc" newest first

  // =============================
  // Helpers
  // =============================
  function $(id) {
    return document.getElementById(id);
  }

  function formatNumber(num) {
    return Number(num || 0).toLocaleString("en-PK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function showToast(message, type = "error") {
    // If you already have bootstrap toast, hook here. Otherwise fallback to alert only when needed
    console[type === "error" ? "error" : "log"](message);
    // Avoid annoying page-load alerts. Only alert on user actions.
  }

  async function getUserOrNull() {
    try {
      const { data } = await supabase.auth.getUser();
      return data?.user || null;
    } catch (e) {
      return null;
    }
  }

  // Insert with fallback (if DB columns missing)
  // If optional columns not exist, retry with minimal payload
  async function safeInsertTransaction(payload) {
    // try full insert
    let res = await supabase.from("transactions").insert([payload]);
    if (!res.error) return res;

    const msg = (res.error?.message || "").toLowerCase();

    // If columns missing / schema mismatch, retry with minimal required fields
    // Supabase/Postgres common message: "column .... does not exist"
    if (msg.includes("does not exist") || msg.includes("column") || msg.includes("schema")) {
      const minimal = {
        user_id: payload.user_id,
        customer_id: payload.customer_id,
        transaction_type: payload.transaction_type,
        amount: payload.amount,
        description: payload.description || null,
        created_at: payload.created_at || undefined,
      };
      res = await supabase.from("transactions").insert([minimal]);
      return res;
    }

    return res;
  }

  // Ensure settings row exists (optional but best)
  async function ensureSettingsRow(userId) {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("id, petrol_price, diesel_price")
        .eq("user_id", userId)
        .maybeSingle();

      if (!error && data) return data;

      // Create settings if not exists
      const { data: created, error: createErr } = await supabase
        .from("settings")
        .insert([
          {
            user_id: userId,
            petrol_price: fuelPrices.Petrol,
            diesel_price: fuelPrices.Diesel,
          },
        ])
        .select()
        .single();

      if (createErr) return null;
      return created;
    } catch (e) {
      return null;
    }
  }

  async function loadFuelPrices() {
    const user = await getUserOrNull();
    if (!user) {
      console.warn("⚠️ User not logged in, using default prices.");
      fuelPrices = { Petrol: 285, Diesel: 305 };
      return;
    }

    try {
      const settingsRow = await ensureSettingsRow(user.id);
      if (!settingsRow) {
        fuelPrices = { Petrol: 285, Diesel: 305 };
        return;
      }

      fuelPrices = {
        Petrol: parseFloat(settingsRow.petrol_price) || 285,
        Diesel: parseFloat(settingsRow.diesel_price) || 305,
      };

      console.log("✅ Fuel prices loaded:", fuelPrices);
    } catch (e) {
      fuelPrices = { Petrol: 285, Diesel: 305 };
    }
  }

  async function saveFuelPricesToSettings(petrol, diesel) {
    const user = await getUserOrNull();
    if (!user) return;

    // ensure row
    await ensureSettingsRow(user.id);

    const { error } = await supabase
      .from("settings")
      .update({
        petrol_price: petrol,
        diesel_price: diesel,
      })
      .eq("user_id", user.id);

    if (!error) {
      fuelPrices = { Petrol: petrol, Diesel: diesel };
      console.log("✅ Fuel prices updated:", fuelPrices);
    } else {
      console.warn("⚠️ Could not update settings:", error.message);
    }
  }

  // =============================
  // UI: Summary Cards
  // =============================
  function updateSummaryCards(transactions) {
    let credit = 0,
      debit = 0,
      expense = 0;
    let creditCount = 0,
      debitCount = 0,
      expenseCount = 0;

    transactions.forEach((t) => {
      const amt = parseFloat(t.amount) || 0;
      if (t.transaction_type === "Credit") {
        credit += amt;
        creditCount++;
      } else if (t.transaction_type === "Debit") {
        debit += amt;
        debitCount++;
      } else if (t.transaction_type === "Expense") {
        expense += amt;
        expenseCount++;
      }
    });

    if ($("total-credit")) $("total-credit").textContent = "Rs. " + formatNumber(credit);
    if ($("credit-count")) $("credit-count").textContent = creditCount + " transactions";

    if ($("total-debit")) $("total-debit").textContent = "Rs. " + formatNumber(debit);
    if ($("debit-count")) $("debit-count").textContent = debitCount + " transactions";

    if ($("total-expense")) $("total-expense").textContent = "Rs. " + formatNumber(expense);
    if ($("expense-count")) $("expense-count").textContent = expenseCount + " transactions";

    if ($("net-balance")) $("net-balance").textContent = "Rs. " + formatNumber(credit - expense);

    if ($("transaction-count")) {
      $("transaction-count").textContent = transactions.length + " transactions";
    }
  }

  // =============================
  // UI: Table + Pagination
  // =============================
  function renderPaginationControls(totalPages) {
    const container = document.querySelector(".card-body.p-0");
    if (!container) return;

    const existing = container.querySelector(".pagination-controls");
    if (existing) existing.remove();

    if (totalPages <= 1) return;

    const html = `
      <div class="pagination-controls p-3 border-top d-flex justify-content-between align-items-center">
        <div>
          <button class="btn btn-sm btn-outline-primary" ${currentPage === 1 ? "disabled" : ""} id="btn-prev">
            <i class="bi bi-chevron-left"></i> Previous
          </button>
          <span class="mx-3">Page ${currentPage} of ${totalPages}</span>
          <button class="btn btn-sm btn-outline-primary" ${currentPage === totalPages ? "disabled" : ""} id="btn-next">
            Next <i class="bi bi-chevron-right"></i>
          </button>
        </div>
        <div class="d-flex gap-2">
          <select class="form-select form-select-sm w-auto" id="itemsPerPageSelect">
            <option value="10" ${itemsPerPage === 10 ? "selected" : ""}>10 per page</option>
            <option value="25" ${itemsPerPage === 25 ? "selected" : ""}>25 per page</option>
            <option value="50" ${itemsPerPage === 50 ? "selected" : ""}>50 per page</option>
            <option value="100" ${itemsPerPage === 100 ? "selected" : ""}>100 per page</option>
            <option value="999999" ${itemsPerPage === 999999 ? "selected" : ""}>Show All</option>
          </select>
          <select class="form-select form-select-sm w-auto" id="sortOrderSelect">
            <option value="desc" ${sortOrder === "desc" ? "selected" : ""}>Newest First</option>
            <option value="asc" ${sortOrder === "asc" ? "selected" : ""}>Oldest First</option>
          </select>
        </div>
      </div>
    `;

    container.insertAdjacentHTML("beforeend", html);

    const prevBtn = document.getElementById("btn-prev");
    const nextBtn = document.getElementById("btn-next");
    const ipp = document.getElementById("itemsPerPageSelect");
    const sortSel = document.getElementById("sortOrderSelect");

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        if (currentPage > 1) {
          currentPage--;
          displayTransactions(allTransactions);
        }
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        currentPage++;
        displayTransactions(allTransactions);
      });
    }
    if (ipp) {
      ipp.addEventListener("change", (e) => {
        itemsPerPage = parseInt(e.target.value, 10);
        currentPage = 1;
        displayTransactions(allTransactions);
      });
    }
    if (sortSel) {
      sortSel.addEventListener("change", async (e) => {
        sortOrder = e.target.value;
        await loadInitialTransactions();
      });
    }
  }

  function updatePaginationBadge(totalItems) {
    const badge = $("transaction-count");
    if (!badge) return;

    if (totalItems === 0) {
      badge.textContent = "0 transactions";
      return;
    }

    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, totalItems);
    badge.textContent = `Showing ${start}-${end} of ${totalItems} transactions`;
  }

  function displayTransactions(transactions) {
    const tbody = $("transactions-table");
    if (!tbody) return;

    if (!transactions || transactions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4">No transactions found</td></tr>`;
      updatePaginationBadge(0);
      renderPaginationControls(1);
      return;
    }

    // pagination
    const totalItems = transactions.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // clamp page
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = itemsPerPage === 999999 ? totalItems : startIndex + itemsPerPage;
    const pageItems = itemsPerPage === 999999 ? transactions : transactions.slice(startIndex, endIndex);

    tbody.innerHTML = pageItems
      .map((t) => {
        const date = new Date(t.created_at);
        const badgeClass =
          t.transaction_type === "Credit"
            ? "bg-success text-white"
            : t.transaction_type === "Debit"
            ? "bg-primary text-white"
            : "bg-warning text-dark";

        const fuelType = t.fuel_type || "-";
        const liters = t.liters > 0 ? formatNumber(t.liters) + " L" : "-";
        const unitPrice = t.unit_price ? "Rs. " + formatNumber(t.unit_price) : "-";
        const amount = "Rs. " + formatNumber(t.amount);

        const customerName = t.customers?.name || "N/A";
        const sr = t.customers?.sr_no ? `(${t.customers.sr_no})` : "";

        return `
          <tr>
            <td>${date.toLocaleString("en-PK", { dateStyle: "short", timeStyle: "short" })}</td>
            <td>${customerName} ${sr}</td>
            <td><span class="badge ${badgeClass}">${t.transaction_type}</span></td>
            <td>${fuelType}</td>
            <td>${liters}</td>
            <td>${unitPrice}</td>
            <td><strong>${amount}</strong></td>
            <td><small>${t.description || "-"}</small></td>
            <td>
              <button class="btn btn-sm btn-outline-danger" onclick="window.deleteTransaction(${t.id})">
                <i class="bi bi-trash"></i>
              </button>
            </td>
          </tr>
        `;
      })
      .join("");

    updatePaginationBadge(totalItems);
    renderPaginationControls(totalPages);
  }

  // =============================
  // Load: Transactions + Customers
  // =============================
  async function loadInitialTransactions() {
    const user = await getUserOrNull();
    if (!user) {
      console.warn("⚠️ Not logged in, skipping transactions load.");
      // no popup on load
      const tbody = $("transactions-table");
      if (tbody) tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4">Please login first</td></tr>`;
      return;
    }

    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*, customers!inner(name, sr_no)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: sortOrder === "asc" })
        .limit(1000);

      if (error) throw error;

      allTransactions = data || [];
      displayTransactions(allTransactions);
      updateSummaryCards(allTransactions);
    } catch (err) {
      console.error("❌ Error loading transactions:", err);
      const tbody = $("transactions-table");
      if (tbody) tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-4">${err.message}</td></tr>`;
    }
  }

  // async function loadCustomers() {
  //   const user = await getUserOrNull();
  //   if (!user) {
  //     console.warn("⚠️ Not logged in, skipping customers load.");
  //     return;
  //   }

  //   try {
  //     const { data, error } = await supabase
  //       .from("customers")
  //       .select("*")
  //       .eq("user_id", user.id)
  //       .order("sr_no");

  //     if (error) throw error;

  //     allCustomers = data || [];
  //     populateCustomerDropdowns();
  //   } catch (err) {
  //     console.error("❌ Error loading customers:", err);
  //     // Avoid popup on load
  //   }
  // }

  async function loadCustomers(){

 const { data:{ user } } =
 await supabase.auth.getUser();

 if(!user){

 console.log("User not logged in");
 return;

 }

 const { data, error } =
 await supabase
 .from("customers")
 .select("*")
 .eq("user_id", user.id);

 if(error){

 console.error(error);
 return;

 }

 allCustomers = data;

 populateCustomerDropdowns();

}


  function populateCustomerDropdowns() {
    const saleSelect = $("sale-customer");
    const vasooliSelect = $("vasooli-customer");

    if (saleSelect) {
      let html = `<option value="">Select Customer</option>`;
      allCustomers.forEach((c) => {
        html += `<option value="${c.id}">${c.sr_no} - ${c.name}</option>`;
      });
      saleSelect.innerHTML = html;
    }

    if (vasooliSelect) {
      let html = `<option value="">Select Customer</option>`;
      allCustomers.forEach((c) => {
        if ((c.category || "").toLowerCase() !== "owner") {
          html += `<option value="${c.id}">${c.sr_no} - ${c.name}</option>`;
        }
      });
      vasooliSelect.innerHTML = html;
    }
  }

  // =============================
  // Filters (buttons in HTML call these)
  // =============================
  window.applyFilters = async function () {
    const user = await getUserOrNull();
    if (!user) return;

    const type = $("filter-type")?.value || "";
    const dateFrom = $("filter-date-from")?.value;
    const dateTo = $("filter-date-to")?.value;

    try {
      let query = supabase
        .from("transactions")
        .select("*, customers!inner(name, sr_no)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (type) query = query.eq("transaction_type", type);

      if (dateFrom) {
        query = query.gte("created_at", new Date(dateFrom).toISOString());
      }

      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query = query.lte("created_at", end.toISOString());
      }

      const { data, error } = await query.limit(1000);
      if (error) throw error;

      allTransactions = data || [];
      currentPage = 1;
      displayTransactions(allTransactions);
      updateSummaryCards(allTransactions);
    } catch (err) {
      console.error("❌ Filter error:", err);
    }
  };

  window.clearTransactionFilters = function () {
    if ($("filter-type")) $("filter-type").value = "";
    if ($("filter-date-from")) $("filter-date-from").value = "";
    if ($("filter-date-to")) $("filter-date-to").value = "";
    currentPage = 1;
    loadInitialTransactions();
  };

  // =============================
  // Modals helpers
  // =============================
  function closeModal(modalId) {
    const el = $(modalId);
    if (!el) return;
    const modal = bootstrap.Modal.getInstance(el);
    if (modal) modal.hide();

    const form = el.querySelector("form");
    if (form) form.reset();
  }

  // =============================
  // New Sale (called by window.addSale())
  // =============================
  window.addSale = async function () {
    if (isSubmitting) return;

    const user = await getUserOrNull();
    if (!user) return;

    const customerId = $("sale-customer")?.value;
    const fuelType = $("sale-fuel-type")?.value;
    const liters = parseFloat($("sale-liters")?.value) || 0;
    const unitPrice = parseFloat($("sale-unit-price")?.value) || 0;
    const amount = parseFloat($("sale-amount")?.value) || 0;
    const paymentType = $("sale-payment-type")?.value || "cash";
    const notes = $("sale-description")?.value || "";

    if (!customerId || !fuelType || !amount) {
      alert("Please fill required fields (Customer, Fuel, Amount)");
      return;
    }

    isSubmitting = true;
    try {
      const payload = {
        user_id: user.id,
        customer_id: parseInt(customerId, 10),
        transaction_type: paymentType === "cash" ? "Debit" : "Credit",
        amount: amount,
        liters: liters > 0 ? liters : null,
        unit_price: unitPrice > 0 ? unitPrice : null,
        fuel_type: fuelType,
        description: notes ? `${fuelType} sale - ${notes}` : `${fuelType} sale`,
      };

      const { error } = await safeInsertTransaction(payload);
      if (error) throw error;

      alert("✅ Sale saved!");
      closeModal("newSaleModal");
      await loadInitialTransactions();
      await loadCustomers();
    } catch (err) {
      console.error("❌ addSale error:", err);
      alert("Error: " + err.message);
    } finally {
      isSubmitting = false;
    }
  };

  // =============================
  // Vasooli (called by window.addVasooli())
  // =============================
  window.addVasooli = async function () {
    if (isSubmitting) return;

    const user = await getUserOrNull();
    if (!user) return;

    const customerId = $("vasooli-customer")?.value;
    const fuelCategory = $("vasooli-fuel-category")?.value || "";
    const liters = parseFloat($("vasooli-liters")?.value) || 0;
    const amount = parseFloat($("vasooli-amount")?.value) || 0;
    const paymentDate = $("vasooli-date")?.value || null;
    const month = $("vasooli-month")?.value || null;
    const description = $("vasooli-description")?.value || "";

    if (!customerId || !amount) {
      alert("Please select customer and enter amount");
      return;
    }

    // If user chose petrol/diesel but prices missing -> force ask prices
    if ((fuelCategory === "Petrol" || fuelCategory === "Diesel") && (!fuelPrices[fuelCategory] || fuelPrices[fuelCategory] <= 0)) {
      alert("Fuel price missing. Please set Petrol/Diesel prices first.");
      return;
    }

    isSubmitting = true;
    try {
      const customer = allCustomers.find((c) => c.id === parseInt(customerId, 10));
      const customerName = customer?.name || "Customer";

      let fullDesc = fuelCategory ? `${fuelCategory} payment` : "Payment received";
      if (liters > 0 && fuelCategory) fullDesc += ` (${liters} L)`;
      if (month) fullDesc += ` for ${month}`;
      fullDesc += ` from ${customerName}`;
      if (description) fullDesc += ` - ${description}`;

      const payload = {
        user_id: user.id,
        customer_id: parseInt(customerId, 10),
        transaction_type: "Debit",
        amount: amount,
        liters: liters > 0 ? liters : null,
        unit_price: fuelCategory && liters > 0 ? fuelPrices[fuelCategory] : null,
        fuel_type: fuelCategory || null,
        payment_month: month,
        description: fullDesc,
      };

      if (paymentDate) payload.created_at = new Date(paymentDate).toISOString();

      const { error } = await safeInsertTransaction(payload);
      if (error) throw error;

      alert("✅ Vasooli saved!");
      closeModal("vasooliModal");
      await loadInitialTransactions();
      await loadCustomers();
    } catch (err) {
      console.error("❌ addVasooli error:", err);
      alert("Error: " + err.message);
    } finally {
      isSubmitting = false;
    }
  };

  // =============================
  // Expense (called by window.addExpense())
  // =============================
  window.addExpense = async function () {
    if (isSubmitting) return;

    const user = await getUserOrNull();
    if (!user) return;

    const amount = parseFloat($("expense-amount")?.value) || 0;
    const description = $("expense-description")?.value || "";
    const expenseType = $("expense-type")?.value || "";
    const expenseAccount = $("expense-account")?.value || "";

    if (!amount || !description) {
      alert("Please fill amount and description");
      return;
    }

    isSubmitting = true;
    try {
      // Find Owner customer, else first customer, else create Owner
      let owner = allCustomers.find((c) => (c.category || "").toLowerCase() === "owner");
      let ownerId = owner?.id || null;

      if (!ownerId && allCustomers.length > 0) ownerId = allCustomers[0].id;

      if (!ownerId) {
        const { data: created, error: createErr } = await supabase
          .from("customers")
          .insert([{ user_id: user.id, sr_no: 0, name: "Owner", category: "Owner", balance: 0 }])
          .select()
          .single();

        if (createErr) throw createErr;
        ownerId = created.id;
        await loadCustomers();
      }

      const fullDesc =
        expenseType || expenseAccount
          ? `${expenseType || "Expense"}: ${description} (From: ${expenseAccount || "N/A"})`
          : description;

      const payload = {
        user_id: user.id,
        customer_id: ownerId,
        transaction_type: "Expense",
        amount: amount,
        description: fullDesc,
        expense_type: expenseType || null,
        expense_account: expenseAccount || null,
      };

      const { error } = await safeInsertTransaction(payload);
      if (error) throw error;

      alert("✅ Expense saved!");
      closeModal("expenseModal");
      await loadInitialTransactions();
      await loadCustomers();
    } catch (err) {
      console.error("❌ addExpense error:", err);
      alert("Error: " + err.message);
    } finally {
      isSubmitting = false;
    }
  };

  // =============================
  // Delete Transaction
  // =============================
  window.deleteTransaction = async function (id) {
    const user = await getUserOrNull();
    if (!user) return;

    if (!confirm("Delete this transaction?")) return;

    try {
      const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;

      alert("✅ Deleted!");
      await loadInitialTransactions();
    } catch (err) {
      console.error("❌ delete error:", err);
      alert("Error: " + err.message);
    }
  };

  // =============================
  // Init + Modal events (ask prices in vasooli)
  // =============================
  function setupModalHooks() {
    // When vasooli modal opens, if user wants, ask prices once
    const vasooliModal = $("vasooliModal");
    if (vasooliModal) {
      vasooliModal.addEventListener("shown.bs.modal", async () => {
        // If prices are defaults but user wants custom, we give inputs in enhancements file too
        // just ensure they are loaded
        await loadFuelPrices();
        if (typeof window.refreshFuelUI === "function") {
          window.refreshFuelUI();
        }
      });
    }

    const saleModal = $("newSaleModal");
    if (saleModal) {
      saleModal.addEventListener("shown.bs.modal", async () => {
        await loadFuelPrices();
        if (typeof window.updateSaleFuelPrice === "function") {
          window.updateSaleFuelPrice();
        }
      });
    }
  }

  // Expose for enhancements file
  window.__TXN__ = {
    getUserOrNull,
    loadFuelPrices,
    saveFuelPricesToSettings,
    get fuelPrices() {
      return fuelPrices;
    },
    set fuelPrices(v) {
      fuelPrices = v;
    },
  };

  document.addEventListener("DOMContentLoaded", async () => {
    await loadFuelPrices();
    await loadCustomers();
    await loadInitialTransactions();
    setupModalHooks();
  });
})();


// Transactions Page - FINAL WORKING VERSION
// (function() {
// 'use strict';

// const supabase = window.supabaseClient;
// let allTransactions = [];

// function $(id) { return document.getElementById(id); }

// function formatNumber(num) {
//   return Number(num || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// }

// // Update Summary Cards
// function updateSummaryCards(transactions) {
//   console.log('Updating summary with', transactions.length, 'transactions');
  
//   let totalCredit = 0, creditCount = 0;
//   let totalDebit = 0, debitCount = 0;
//   let totalExpense = 0, expenseCount = 0;

//   transactions.forEach(t => {
//     const amount = parseFloat(t.amount) || 0;
//     if (t.transaction_type === 'Credit') {
//       totalCredit += amount;
//       creditCount++;
//     } else if (t.transaction_type === 'Debit') {
//       totalDebit += amount;
//       debitCount++;
//     } else if (t.transaction_type === 'Expense') {
//       totalExpense += amount;
//       expenseCount++;
//     }
//   });

//   const netBalance = totalCredit - totalExpense;

//   if ($('total-credit')) $('total-credit').textContent = 'Rs. ' + formatNumber(totalCredit);
//   if ($('credit-count')) $('credit-count').textContent = creditCount + ' transactions';
  
//   if ($('total-debit')) $('total-debit').textContent = 'Rs. ' + formatNumber(totalDebit);
//   if ($('debit-count')) $('debit-count').textContent = debitCount + ' transactions';
  
//   if ($('total-expense')) $('total-expense').textContent = 'Rs. ' + formatNumber(totalExpense);
//   if ($('expense-count')) $('expense-count').textContent = expenseCount + ' transactions';
  
//   if ($('net-balance')) $('net-balance').textContent = 'Rs. ' + formatNumber(netBalance);
//   if ($('transaction-count')) $('transaction-count').textContent = transactions.length + ' transactions';

//   console.log('✅ Summary updated:', { totalCredit, totalDebit, totalExpense, netBalance });
// }

// // Apply Filters
// window.applyFilters = async function() {
//   const type = $('filter-type')?.value || '';
//   const dateFrom = $('filter-date-from')?.value;
//   const dateTo = $('filter-date-to')?.value;

//   try {
//     let query = supabase
//       .from('transactions')
//       .select('*, customers!inner(name, sr_no)')
//       .order('created_at', { ascending: false });

//     if (type) {
//       query = query.eq('transaction_type', type);
//     }

//     if (dateFrom) {
//       query = query.gte('created_at', new Date(dateFrom).toISOString());
//     }

//     if (dateTo) {
//       const endDate = new Date(dateTo);
//       endDate.setHours(23, 59, 59, 999);
//       query = query.lte('created_at', endDate.toISOString());
//     }

//     const { data, error } = await query.limit(200);

//     if (error) throw error;

//     allTransactions = data || [];
//     displayTransactions(allTransactions);
//     updateSummaryCards(allTransactions);
//   } catch (error) {
//     console.error('Error filtering transactions:', error);
//   }
// };

// // Clear Filters
// window.clearTransactionFilters = function() {
//   if ($('filter-type')) $('filter-type').value = '';
//   if ($('filter-date-from')) $('filter-date-from').value = '';
//   if ($('filter-date-to')) $('filter-date-to').value = '';
  
//   loadInitialTransactions();
// };

// // Display Transactions
// function displayTransactions(transactions) {
//   const tbody = $('transactions-table');
//   if (!tbody) return;

//   if (transactions.length === 0) {
//     tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">No transactions found</td></tr>';
//     return;
//   }

//   let html = '';
//   transactions.forEach(t => {
//     const date = new Date(t.created_at);
//     const typeClass = t.transaction_type === 'Credit' ? 'bg-success' :
//       t.transaction_type === 'Debit' ? 'bg-primary' : 'bg-warning';

//     // Get fuel type from description or leave blank
//     const fuelType = t.description?.includes('Petrol') ? 'Petrol' : 
//                      t.description?.includes('Diesel') ? 'Diesel' : '-';

//     html += `
//       <tr>
//         <td>${date.toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}</td>
//         <td>${t.customers?.name || 'N/A'} ${t.customers?.sr_no ? '(' + t.customers.sr_no + ')' : ''}</td>
//         <td><span class="badge ${typeClass}">${t.transaction_type}</span></td>
//         <td>${fuelType}</td>
//         <td>${t.liters > 0 ? formatNumber(t.liters) + ' L' : '-'}</td>
//         <td>${t.unit_price ? 'Rs. ' + formatNumber(t.unit_price) : '-'}</td>
//         <td><strong>Rs. ${formatNumber(t.amount)}</strong></td>
//         <td><small>${t.description || '-'}</small></td>
//         <td>
//           <button class="btn btn-sm btn-outline-danger" onclick="deleteTransaction(${t.id})">
//             <i class="bi bi-trash"></i>
//           </button>
//         </td>
//       </tr>
//     `;
//   });

//   tbody.innerHTML = html;
// }

// // Load Initial Transactions
// async function loadInitialTransactions() {
//   console.log('Loading initial transactions...');
  
//   try {
//     const { data, error } = await supabase
//       .from('transactions')
//       .select('*, customers!inner(name, sr_no)')
//       .order('created_at', { ascending: false })
//       .limit(100);

//     if (error) throw error;

//     console.log('Loaded transactions:', data?.length || 0);

//     allTransactions = data || [];
//     displayTransactions(allTransactions);
//     updateSummaryCards(allTransactions);
//   } catch (error) {
//     console.error('❌ Error loading transactions:', error);
//     const tbody = $('transactions-table');
//     if (tbody) {
//       tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-4">
//         Error: ${error.message}
//       </td></tr>`;
//     }
//   }
// }

// // Load Customers for Modals
// async function loadCustomersForModals() {
//   console.log('Loading customers for modals...');
  
//   try {
//     const { data: customers, error } = await supabase
//       .from('customers')
//       .select('id, sr_no, name, category')
//       .order('sr_no');

//     if (error) throw error;

//     console.log('Loaded customers:', customers?.length || 0);

//     // Populate dropdowns
//     if ($('sale-customer')) {
//       let html = '<option value="">Select Customer</option>';
//       customers.forEach(c => {
//         html += `<option value="${c.id}">${c.sr_no} - ${c.name}</option>`;
//       });
//       $('sale-customer').innerHTML = html;
//     }

//     if ($('vasooli-customer')) {
//       let html = '<option value="">Select Customer</option>';
//       customers.forEach(c => {
//         if (c.category !== 'Owner') {
//           html += `<option value="${c.id}">${c.sr_no} - ${c.name}</option>`;
//         }
//       });
//       $('vasooli-customer').innerHTML = html;
//     }

//   } catch (error) {
//     console.error('❌ Error loading customers:', error);
//     if ($('sale-customer')) {
//       $('sale-customer').innerHTML = '<option value="">Error loading</option>';
//     }
//   }
// }

// // Delete Transaction
// window.deleteTransaction = async function(id) {
//   if (!confirm('Are you sure?')) return;
  
//   try {
//     const { error } = await supabase
//       .from('transactions')
//       .delete()
//       .eq('id', id);

//     if (error) throw error;

//     alert('Deleted successfully!');
//     loadInitialTransactions();
//   } catch (error) {
//     console.error('Error deleting:', error);
//     alert('Error: ' + error.message);
//   }
// };

// // Initialize
// document.addEventListener('DOMContentLoaded', () => {
//   if (document.body.getAttribute('data-page') === 'transactions') {
//     console.log('✅ Initializing transactions page...');
    
//     // Set default dates
//     const today = new Date();
//     const thirtyDaysAgo = new Date();
//     thirtyDaysAgo.setDate(today.getDate() - 30);

//     if ($('filter-date-from')) {
//       $('filter-date-from').value = thirtyDaysAgo.toISOString().split('T')[0];
//     }
//     if ($('filter-date-to')) {
//       $('filter-date-to').value = today.toISOString().split('T')[0];
//     }

//     // Load data
//     loadInitialTransactions();
//     loadCustomersForModals();
//   }
// });

// window.loadInitialTransactions = loadInitialTransactions;

// })();