(function () {
"use strict";

// =============================
// GLOBAL CACHE
// =============================
let customersCache = [];
let transactionsCache = [];
let tanksCache = [];

const supabase = window.supabaseClient;

function $(id) {
    return document.getElementById(id);
}

function formatNumber(num) {
    return Number(num || 0).toLocaleString("en-PK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function showToast(msg, type = "info") {
    console.log(type.toUpperCase() + ": " + msg);
}

// =============================
// AUTH SAFE USER FETCH
// =============================
async function getUserIdSafe() {

    if (!window.auth) return null;

    const user = await window.auth.getCurrentUser();

    if (!user || !user.id) {
        console.error("User not authenticated");
        return null;
    }

    return user.id;
}

// =============================
// LOAD CUSTOMERS FIXED
// =============================
async function loadCustomers() {

    try {

        const userId = await getUserIdSafe();

        if (!userId) return;

        const { data, error } = await supabase
            .from("customers")
            .select("*")
            .eq("user_id", userId)
            .order("sr_no");

        if (error) throw error;

        customersCache = data || [];

        updateCustomersTable();
        populateCustomerDropdowns();

    } catch (e) {

        console.error(e);
        showToast("Customers load error", "error");

    }
}


// =============================
// UPDATE CUSTOMER TABLE
// =============================
function updateCustomersTable() {

    const tbody = $("customers-table");

    if (!tbody) return;

    if (!customersCache.length) {

        tbody.innerHTML =
            `<tr>
                <td colspan="6" class="text-center text-muted">
                    No customers found
                </td>
            </tr>`;

        return;
    }

    let html = "";

    customersCache.forEach(c => {

        html += `
        <tr>
            <td>${c.sr_no}</td>
            <td>${c.name}</td>
            <td>${c.phone || "-"}</td>
            <td>${c.category}</td>
            <td>Rs. ${formatNumber(c.balance)}</td>
        </tr>`;
    });

    tbody.innerHTML = html;
}


// =============================
// POPULATE DROPDOWN
// =============================
function populateCustomerDropdowns() {

    const dropdown = $("sale-customer");

    if (!dropdown) return;

    let html = `<option value="">Select</option>`;

    customersCache.forEach(c => {

        html += `<option value="${c.id}">
                    ${c.sr_no} - ${c.name}
                </option>`;
    });

    dropdown.innerHTML = html;
}



// =============================
// LOAD TANKS
// =============================
async function loadTanks() {

    const { data, error } = await supabase
        .from("tanks")
        .select("*");

    if (error) return;

    tanksCache = data;
}



// =============================
// SALE PRICE INPUT FIX
// =============================
function setupSaleCalculation() {

    const fuelSelect = $("sale-fuel-type");
    const litersInput = $("sale-liters");
    const rateInput = $("sale-unit-price");
    const amountInput = $("sale-amount");

    if (!fuelSelect || !rateInput) return;

    fuelSelect.addEventListener("change", () => {

        const fuel = fuelSelect.value;

        // DO NOT AUTO LOAD FROM CONFIG
        rateInput.value = "";

        litersInput.value = "";
        amountInput.value = "";

    });

    litersInput.addEventListener("input", () => {

        const liters = parseFloat(litersInput.value);
        const rate = parseFloat(rateInput.value);

        if (liters > 0 && rate > 0) {

            amountInput.value = (liters * rate).toFixed(2);

        }

    });

    amountInput.addEventListener("input", () => {

        const amount = parseFloat(amountInput.value);
        const rate = parseFloat(rateInput.value);

        if (amount > 0 && rate > 0) {

            litersInput.value = (amount / rate).toFixed(2);

        }

    });
}



// =============================
// ADD SALE FIXED
// =============================
window.addSale = async function () {

    const userId = await getUserIdSafe();

    if (!userId) {
        showToast("Login required", "error");
        return;
    }

    const customerId = $("sale-customer").value;
    const fuelType = $("sale-fuel-type").value;
    const liters = parseFloat($("sale-liters").value);
    const price = parseFloat($("sale-unit-price").value);
    const amount = parseFloat($("sale-amount").value);

    if (!customerId || !fuelType || !liters || !price || !amount) {

        showToast("Fill all fields", "error");
        return;
    }

    const tank = tanksCache.find(t => t.fuel_type === fuelType);

    if (!tank) {

        showToast("Tank not found", "error");
        return;
    }

    const { error } = await supabase
        .from("transactions")
        .insert({

            user_id: userId,
            customer_id: customerId,
            tank_id: tank.id,
            liters: liters,
            unit_price: price,
            amount: amount,
            transaction_type: "Credit"

        });

    if (error) {

        console.error(error);
        showToast("Insert failed", "error");
        return;
    }

    showToast("Sale added", "success");

};




// =============================
// INIT
// =============================
document.addEventListener("DOMContentLoaded", async () => {

    await loadCustomers();
    await loadTanks();

    setupSaleCalculation();

});

})();


// code with error but working 


// app.js (FINAL) — keeps your current flow, adds auth-safe user filtering,
// // fixes "uuid undefined" error, restores modals open functions,
// // and auto-calculates Sale Amount/Liters with Petrol/Diesel price input.

// // Wrap everything in IIFE to avoid global scope conflicts
// (function () {
//   "use strict";

//   // =============================
//   // Global Cache
//   // =============================
//   let customersCache = [];
//   let transactionsCache = [];
//   let tanksCache = [];

//   // =============================
//   // Get Supabase instance
//   // =============================
//   const supabase = window.supabaseClient;

//   // =============================
//   // Helpers
//   // =============================
//   function $(id) {
//     return document.getElementById(id);
//   }

//   function formatNumber(num) {
//     const n = Number(num || 0);
//     return n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
//   }

//   function parseNum(v) {
//     const n = parseFloat(String(v ?? "").replace(/,/g, ""));
//     return Number.isFinite(n) ? n : 0;
//   }

//   function showToast(message, type = "info") {
//     const toast = $("liveToast");
//     if (!toast) return;

//     const toastTitle = $("toast-title");
//     const toastMessage = $("toast-message");

//     const titles = { success: "Success", error: "Error", warning: "Warning", info: "Information" };
//     if (toastTitle) toastTitle.textContent = titles[type] || "Notification";
//     if (toastMessage) toastMessage.textContent = message;

//     const bsToast = new bootstrap.Toast(toast);
//     bsToast.show();
//   }

//   // =============================
//   // Auth Helpers (FIX "uuid undefined")
//   // =============================
//   async function getAuthUser() {
//     try {
//       // Your custom auth wrapper
//       if (window.auth && typeof window.auth.getCurrentUser === "function") {
//         const u = await window.auth.getCurrentUser();
//         // u can be {id,...} OR {user:{id}} OR {data:{user}}
//         if (u?.id) return u;
//         if (u?.user?.id) return u.user;
//         if (u?.data?.user?.id) return u.data.user;
//         return null;
//       }

//       // Supabase native
//       if (supabase?.auth?.getUser) {
//         const { data, error } = await supabase.auth.getUser();
//         if (error) return null;
//         return data?.user || null;
//       }
//     } catch (e) {
//       console.error("getAuthUser error:", e);
//     }
//     return null;
//   }

//   async function getAuthUserId() {
//     const user = await getAuthUser();
//     return user?.id || null;
//   }

//   // =============================
//   // Layout Loaders (Navbar/Footer)
//   // =============================
//   async function loadComponent(placeholderId, url) {
//     const ph = $(placeholderId);
//     if (!ph) {
//       console.warn(`Placeholder ${placeholderId} not found`);
//       return false;
//     }

//     try {
//       const res = await fetch(url, { cache: "no-store" });
//       if (!res.ok) {
//         console.error(`Failed to load ${url}: ${res.status} ${res.statusText}`);
//         return false;
//       }
//       const html = await res.text();
//       ph.innerHTML = html;
//       console.log(`✅ Loaded: ${url}`);
//       return true;
//     } catch (error) {
//       console.error(`Error loading component ${url}:`, error);
//       return false;
//     }
//   }

//   // Fallback loader: components/navbar.html -> navbar.html (same for footer)
//   async function loadComponentWithFallback(placeholderId, primaryUrl, fallbackUrl) {
//     const ok = await loadComponent(placeholderId, primaryUrl);
//     if (!ok && fallbackUrl) {
//       await loadComponent(placeholderId, fallbackUrl);
//     }
//   }

//   function setActiveNav() {
//     const bodyPage = document.body.getAttribute("data-page");
//     if (!bodyPage) return;

//     document.querySelectorAll(".nav-link[data-page], .footer-link[data-page]").forEach((a) => {
//       a.classList.remove("active");
//       if (a.getAttribute("data-page") === bodyPage) a.classList.add("active");
//     });
//   }

//   function initClock() {
//     const dEl = $("current-date");
//     const tEl = $("current-time");
//     if (!dEl || !tEl) return;

//     function tick() {
//       const now = new Date();
//       dEl.textContent = now.toLocaleDateString("en-PK", { dateStyle: "medium" });
//       tEl.textContent = now.toLocaleTimeString("en-PK", { timeStyle: "short" });
//     }
//     tick();
//     setInterval(tick, 1000 * 30);
//   }

//   function initFooterYear() {
//     const y = $("footer-year");
//     if (y) y.textContent = new Date().getFullYear();
//   }

//   // =============================
//   // Settings (Fuel Prices)
//   // =============================
//   function ensureConfigPrices() {
//     window.config = window.config || {};
//     window.config.FUEL_PRICES = window.config.FUEL_PRICES || { Petrol: 0, Diesel: 0 };
//   }

//   function loadFuelPrices() {
//     ensureConfigPrices();
//     const stored = localStorage.getItem("fuel_prices");
//     if (stored) {
//       try {
//         window.config.FUEL_PRICES = JSON.parse(stored);
//       } catch {
//         // ignore parse error
//       }
//     }

//     if ($("petrol-price")) $("petrol-price").value = window.config.FUEL_PRICES.Petrol || "";
//     if ($("diesel-price")) $("diesel-price").value = window.config.FUEL_PRICES.Diesel || "";
//   }

//   window.saveFuelPrices = function () {
//     ensureConfigPrices();
//     const petrolPrice = parseNum($("petrol-price")?.value);
//     const dieselPrice = parseNum($("diesel-price")?.value);

//     if (!(petrolPrice > 0) || !(dieselPrice > 0)) {
//       showToast("Please enter valid prices", "error");
//       return;
//     }

//     window.config.FUEL_PRICES.Petrol = petrolPrice;
//     window.config.FUEL_PRICES.Diesel = dieselPrice;
//     localStorage.setItem("fuel_prices", JSON.stringify(window.config.FUEL_PRICES));

//     showToast("Fuel prices saved!", "success");
//   };

//   // =============================
//   // Data Loaders
//   // =============================
//   async function loadTanks() {
//     try {
//       const { data, error } = await supabase.from("tanks").select("*").order("id");
//       if (error) throw error;
//       tanksCache = data || [];
//       updateStockDisplay();
//     } catch (e) {
//       console.error(e);
//       showToast("Error loading stock data", "error");
//     }
//   }

//   function updateStockDisplay() {
//     const petrolTank = tanksCache.find((t) => t.fuel_type === "Petrol");
//     const dieselTank = tanksCache.find((t) => t.fuel_type === "Diesel");

//     if (petrolTank && $("petrol-stock")) {
//       $("petrol-stock").textContent = formatNumber(petrolTank.current_stock);
//       if ($("petrol-progress")) {
//         const pct = petrolTank.capacity ? (petrolTank.current_stock / petrolTank.capacity) * 100 : 0;
//         $("petrol-progress").style.width = pct + "%";
//       }
//     }

//     if (dieselTank && $("diesel-stock")) {
//       $("diesel-stock").textContent = formatNumber(dieselTank.current_stock);
//       if ($("diesel-progress")) {
//         const pct = dieselTank.capacity ? (dieselTank.current_stock / dieselTank.capacity) * 100 : 0;
//         $("diesel-progress").style.width = pct + "%";
//       }
//     }

//     const carMobil = tanksCache.find((t) => t.name === "Car Mobil");
//     const openMobil = tanksCache.find((t) => t.name === "Open Mobil");

//     if (carMobil && $("mobil-car-stock-page")) $("mobil-car-stock-page").textContent = `${formatNumber(carMobil.current_stock)} Liters`;
//     if (openMobil && $("mobil-open-stock-page")) $("mobil-open-stock-page").textContent = `${formatNumber(openMobil.current_stock)} Liters`;

//     if (carMobil && $("car-mobil-stock")) $("car-mobil-stock").innerHTML = `${formatNumber(carMobil.current_stock)} <small>liters</small>`;
//     if (openMobil && $("open-mobil-stock")) $("open-mobil-stock").innerHTML = `${formatNumber(openMobil.current_stock)} <small>liters</small>`;
//   }

//   async function loadCustomers() {
//     try {
//       const userId = await getAuthUserId();

//       // If you have login system: must have userId, otherwise block safely
//       if (!userId) {
//         customersCache = [];
//         updateCustomersTable();
//         populateCustomerDropdowns();
//         console.warn("No userId found; customers not loaded.");
//         return;
//       }

//       // IMPORTANT: correct syntax is .eq('user_id', userId)
//       const { data, error } = await supabase.from("customers").select("*").eq("user_id", userId).order("sr_no", { ascending: true });

//       if (error) throw error;
//       customersCache = data || [];
//       updateCustomersTable();
//       populateCustomerDropdowns();
//     } catch (e) {
//       console.error(e);
//       showToast("Error loading customers", "error");
//     }
//   }

//   function updateCustomersTable() {
//     const tbody = $("customers-table");
//     if (!tbody) return;

//     if (customersCache.length === 0) {
//       tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No customers found</td></tr>';
//       return;
//     }

//     let html = "";
//     customersCache.forEach((c) => {
//       const bal = parseNum(c.balance);
//       const balanceClass = bal > 0 ? "balance-positive" : bal < 0 ? "balance-negative" : "balance-zero";
//       const balanceText =
//         bal > 0 ? `Udhaar: Rs. ${formatNumber(bal)}` : bal < 0 ? `Advance: Rs. ${formatNumber(Math.abs(bal))}` : "Zero";

//       html += `
//         <tr>
//           <td>${c.sr_no ?? "-"}</td>
//           <td><strong>${c.name ?? "-"}</strong></td>
//           <td>${c.phone || "-"}</td>
//           <td><span class="badge badge-info">${c.category || "-"}</span></td>
//           <td class="${balanceClass}">${balanceText}</td>
//           <td>
//             <button class="btn btn-sm btn-outline-primary" onclick="viewCustomerDetails(${c.id})">
//               <i class="bi bi-eye"></i>
//             </button>
//           </td>
//         </tr>
//       `;
//     });

//     tbody.innerHTML = html;
//   }

//   function populateCustomerDropdowns() {
//     const saleCustomer = $("sale-customer");
//     const vasooliCustomer = $("vasooli-customer");

//     let options = '<option value="">Select Customer</option>';
//     customersCache.forEach((c) => (options += `<option value="${c.id}">${c.sr_no} - ${c.name}</option>`));

//     if (saleCustomer) saleCustomer.innerHTML = options;
//     if (vasooliCustomer) vasooliCustomer.innerHTML = options;
//   }

//   async function loadTransactions() {
//     try {
//       const userId = await getAuthUserId();

//       if (!userId) {
//         transactionsCache = [];
//         updateTransactionsTable();
//         updateRecentTransactions();
//         console.warn("No userId found; transactions not loaded.");
//         return;
//       }

//       const { data, error } = await supabase
//         .from("transactions")
//         .select(`*, customer:customers(name, sr_no), tank:tanks(fuel_type)`)
//         .eq("user_id", userId)
//         .order("created_at", { ascending: false })
//         .limit(200);

//       if (error) throw error;
//       transactionsCache = data || [];
//       updateTransactionsTable();
//       updateRecentTransactions();
//     } catch (e) {
//       console.error(e);
//       showToast("Error loading transactions", "error");
//     }
//   }

//   function updateTransactionsTable() {
//     const tbody = $("transactions-table");
//     if (!tbody) return;

//     if (transactionsCache.length === 0) {
//       tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">No transactions found</td></tr>';
//       return;
//     }

//     let html = "";
//     transactionsCache.forEach((t) => {
//       const date = new Date(t.created_at);
//       const typeClass = t.transaction_type === "Credit" ? "badge-danger" : t.transaction_type === "Debit" ? "badge-success" : "badge-warning";

//       html += `
//         <tr>
//           <td>${date.toLocaleString("en-PK", { dateStyle: "short", timeStyle: "short" })}</td>
//           <td>${t.customer?.name || "N/A"} (${t.customer?.sr_no || "-"})</td>
//           <td><span class="badge ${typeClass}">${t.transaction_type}</span></td>
//           <td>${t.tank?.fuel_type || "-"}</td>
//           <td>${t.liters > 0 ? formatNumber(t.liters) + " L" : "-"}</td>
//           <td>${t.unit_price ? "Rs. " + formatNumber(t.unit_price) : "-"}</td>
//           <td><strong>Rs. ${formatNumber(t.amount)}</strong></td>
//           <td>${t.description || "-"}</td>
//           <td>
//             <button class="btn btn-sm btn-outline-danger" onclick="deleteTransaction(${t.id})">
//               <i class="bi bi-trash"></i>
//             </button>
//           </td>
//         </tr>
//       `;
//     });

//     tbody.innerHTML = html;
//   }

//   function updateRecentTransactions() {
//     const tbody = $("recent-transactions");
//     if (!tbody) return;

//     const recent = transactionsCache.slice(0, 10);
//     if (recent.length === 0) {
//       tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No transactions yet</td></tr>';
//       return;
//     }

//     let html = "";
//     recent.forEach((t) => {
//       const date = new Date(t.created_at);
//       const typeClass = t.transaction_type === "Credit" ? "badge-danger" : t.transaction_type === "Debit" ? "badge-success" : "badge-warning";

//       html += `
//         <tr>
//           <td>${date.toLocaleString("en-PK", { timeStyle: "short" })}</td>
//           <td>${t.customer?.name || "N/A"}</td>
//           <td><span class="badge ${typeClass}">${t.transaction_type}</span></td>
//           <td><strong>Rs. ${formatNumber(t.amount)}</strong></td>
//           <td>${t.liters > 0 ? formatNumber(t.liters) + " L" : "-"}</td>
//         </tr>
//       `;
//     });

//     tbody.innerHTML = html;
//   }

//   // =============================
//   // Global functions
//   // =============================
//   window.viewCustomerDetails = function (id) {
//     const c = customersCache.find((x) => x.id === id);
//     if (!c) return;
//     alert(
//       `Customer Details:\n\nSR No: ${c.sr_no}\nName: ${c.name}\nPhone: ${c.phone || "N/A"}\nCategory: ${c.category}\nBalance: Rs. ${formatNumber(c.balance)}`
//     );
//   };

//   window.deleteTransaction = async function (id) {
//     if (!confirm("Are you sure you want to delete this transaction? This cannot be undone.")) return;
//     try {
//       const userId = await getAuthUserId();
//       if (!userId) return showToast("Login required", "error");

//       const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", userId);
//       if (error) throw error;

//       showToast("Transaction deleted successfully!", "success");
//       await loadTransactions();
//     } catch (e) {
//       console.error(e);
//       showToast("Error deleting transaction: " + e.message, "error");
//     }
//   };

//   // =============================
//   // Modal Openers (Fix "openNewSaleModal is not defined")
//   // =============================
//   function safeShowModal(modalId) {
//     const modalEl = $(modalId);
//     if (!modalEl) {
//       showToast(`Modal not found: ${modalId}`, "error");
//       return;
//     }
//     const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
//     modal.show();
//   }

//   window.openNewSaleModal = function () {
//     // Prefill fuel prices when opening
//     ensureConfigPrices();
//     safeShowModal("newSaleModal");
//     hydrateSalePriceFromFuel(); // sets unit price based on selected fuel if empty
//     recalcSaleTotals(); // compute amount/liters if possible
//   };

//   window.openVasooliModal = function () {
//     safeShowModal("vasooliModal");
//   };

//   window.openExpenseModal = function () {
//     safeShowModal("expenseModal");
//   };

//   // =============================
//   // SALE FORM: Price Input + Auto Calculations
//   // =============================
//   function getSelectedFuel() {
//     return $("sale-fuel-type")?.value || "";
//   }

//   function getFuelDefaultPrice(fuelType) {
//     ensureConfigPrices();
//     if (fuelType === "Petrol") return parseNum(window.config.FUEL_PRICES.Petrol);
//     if (fuelType === "Diesel") return parseNum(window.config.FUEL_PRICES.Diesel);
//     return 0;
//   }

//   function hydrateSalePriceFromFuel() {
//     const fuelType = getSelectedFuel();
//     const unitEl = $("sale-unit-price");
//     if (!unitEl) return;

//     // If user already typed something, don't override
//     const current = parseNum(unitEl.value);
//     if (current > 0) return;

//     const def = getFuelDefaultPrice(fuelType);
//     if (def > 0) unitEl.value = def;
//   }

//   function getEntryMode() {
//     // If you have toggle buttons, set a hidden input id="sale-entry-mode" to "liters" or "amount"
//     // Otherwise default: liters mode.
//     const m = $("sale-entry-mode")?.value;
//     return m === "amount" ? "amount" : "liters";
//   }

//   function recalcSaleTotals() {
//     const litersEl = $("sale-liters");
//     const unitEl = $("sale-unit-price");
//     const amountEl = $("sale-amount");

//     if (!unitEl || !amountEl) return;

//     const unit = parseNum(unitEl.value);
//     const mode = getEntryMode();

//     if (mode === "amount") {
//       const amount = parseNum(amountEl.value);
//       if (unit > 0 && litersEl) {
//         const liters = amount / unit;
//         litersEl.value = liters > 0 ? liters.toFixed(3) : "";
//       }
//     } else {
//       // liters mode
//       const liters = litersEl ? parseNum(litersEl.value) : 0;
//       if (unit > 0 && liters > 0) {
//         amountEl.value = (liters * unit).toFixed(2);
//       }
//     }
//   }

//   function initSaleAutoCalc() {
//     const fuelEl = $("sale-fuel-type");
//     const litersEl = $("sale-liters");
//     const unitEl = $("sale-unit-price");
//     const amountEl = $("sale-amount");

//     if (fuelEl) {
//       fuelEl.addEventListener("change", () => {
//         hydrateSalePriceFromFuel();
//         recalcSaleTotals();
//       });
//     }

//     if (litersEl) litersEl.addEventListener("input", recalcSaleTotals);
//     if (unitEl) unitEl.addEventListener("input", recalcSaleTotals);
//     if (amountEl) amountEl.addEventListener("input", recalcSaleTotals);

//     // Optional: if you have two buttons for entry method
//     const byLitersBtn = document.querySelector('[data-sale-entry="liters"]');
//     const byAmountBtn = document.querySelector('[data-sale-entry="amount"]');
//     const modeHidden = $("sale-entry-mode");

//     if (byLitersBtn && modeHidden) {
//       byLitersBtn.addEventListener("click", () => {
//         modeHidden.value = "liters";
//         recalcSaleTotals();
//       });
//     }
//     if (byAmountBtn && modeHidden) {
//       byAmountBtn.addEventListener("click", () => {
//         modeHidden.value = "amount";
//         recalcSaleTotals();
//       });
//     }
//   }

//   // =============================
//   // Transaction Functions
//   // =============================
//   window.addSale = async function () {
//     const userId = await getAuthUserId();
//     if (!userId) return showToast("Login required", "error");

//     const customerId = $("sale-customer")?.value;
//     const fuelType = $("sale-fuel-type")?.value;
//     const liters = parseNum($("sale-liters")?.value);
//     const unitPrice = parseNum($("sale-unit-price")?.value);
//     const amount = parseNum($("sale-amount")?.value);
//     const paymentType = $("sale-payment-type")?.value;
//     const description = $("sale-description")?.value;

//     // Must get price from user (unitPrice required)
//     if (!customerId || !fuelType || !(unitPrice > 0)) {
//       showToast("Customer, Fuel, and Rate per Liter are required", "error");
//       return;
//     }

//     // Either liters OR amount should be valid, and both must end up > 0
//     if (!(amount > 0) || !(liters > 0)) {
//       showToast("Please enter Liters or Amount (auto-calc will fill the other).", "error");
//       return;
//     }

//     const tank = tanksCache.find((t) => t.fuel_type === fuelType);
//     if (!tank) return showToast("Tank not found", "error");

//     if (tank.current_stock < liters) {
//       showToast("Not enough stock! Current: " + tank.current_stock + " L", "error");
//       return;
//     }

//     try {
//       const { error: transError } = await supabase.from("transactions").insert([
//         {
//           user_id: userId,
//           customer_id: parseInt(customerId),
//           tank_id: tank.id,
//           transaction_type: "Credit",
//           amount,
//           liters,
//           unit_price: unitPrice,
//           description: description || null,
//         },
//       ]);

//       if (transError) throw transError;

//       const { error: tankError } = await supabase
//         .from("tanks")
//         .update({ current_stock: tank.current_stock - liters, last_updated: new Date().toISOString() })
//         .eq("id", tank.id);

//       if (tankError) throw tankError;

//       if (paymentType === "credit") {
//         const customer = customersCache.find((c) => c.id === parseInt(customerId));
//         const { error: customerError } = await supabase
//           .from("customers")
//           .update({ balance: parseNum(customer?.balance) + amount })
//           .eq("id", customerId)
//           .eq("user_id", userId);

//         if (customerError) throw customerError;
//       }

//       showToast("Sale added successfully!", "success");
//       const modalEl = $("newSaleModal");
//       if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
//       $("newSaleForm")?.reset();

//       await loadTanks();
//       await loadCustomers();
//       await loadTransactions();
//     } catch (e) {
//       console.error(e);
//       showToast("Error adding sale: " + e.message, "error");
//     }
//   };

//   window.addVasooli = async function () {
//     const userId = await getAuthUserId();
//     if (!userId) return showToast("Login required", "error");

//     const customerId = $("vasooli-customer")?.value;
//     const amount = parseNum($("vasooli-amount")?.value);
//     const description = $("vasooli-description")?.value;

//     if (!customerId || !(amount > 0)) {
//       showToast("Please fill all required fields", "error");
//       return;
//     }

//     try {
//       const { error: transError } = await supabase.from("transactions").insert([
//         {
//           user_id: userId,
//           customer_id: parseInt(customerId),
//           tank_id: null,
//           transaction_type: "Debit",
//           amount,
//           liters: 0,
//           unit_price: null,
//           description: description || "Vasooli",
//         },
//       ]);

//       if (transError) throw transError;

//       const customer = customersCache.find((c) => c.id === parseInt(customerId));
//       const { error: customerError } = await supabase
//         .from("customers")
//         .update({ balance: parseNum(customer?.balance) - amount })
//         .eq("id", customerId)
//         .eq("user_id", userId);

//       if (customerError) throw customerError;

//       showToast("Vasooli recorded successfully!", "success");
//       const modalEl = $("vasooliModal");
//       if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
//       $("vasooliForm")?.reset();

//       await loadCustomers();
//       await loadTransactions();
//     } catch (e) {
//       console.error(e);
//       showToast("Error recording vasooli: " + e.message, "error");
//     }
//   };

//   window.addExpense = async function () {
//     const userId = await getAuthUserId();
//     if (!userId) return showToast("Login required", "error");

//     const amount = parseNum($("expense-amount")?.value);
//     const description = $("expense-description")?.value;

//     if (!(amount > 0) || !description) {
//       showToast("Please fill all required fields", "error");
//       return;
//     }

//     try {
//       // Owner account: keep your logic, but MUST be filtered by user_id
//       const owner = customersCache.find((c) => c.category === "Owner" && String(c.sr_no) === "0");
//       if (!owner) return showToast("Owner account not found. Please create one first.", "error");

//       const { error } = await supabase.from("transactions").insert([
//         {
//           user_id: userId,
//           customer_id: owner.id,
//           tank_id: null,
//           transaction_type: "Expense",
//           amount,
//           liters: 0,
//           unit_price: null,
//           description,
//         },
//       ]);

//       if (error) throw error;

//       showToast("Expense recorded successfully!", "success");
//       const modalEl = $("expenseModal");
//       if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
//       $("expenseForm")?.reset();

//       await loadTransactions();
//     } catch (e) {
//       console.error(e);
//       showToast("Error recording expense: " + e.message, "error");
//     }
//   };

//   // =============================
//   // Init
//   // =============================
//   document.addEventListener("DOMContentLoaded", async () => {
//     console.log("🚀 App initializing...");

//     // Load navbar/footer (robust paths)
//     await loadComponentWithFallback("navbar-placeholder", "components/navbar.html", "navbar.html");
//     await loadComponentWithFallback("footer-placeholder", "components/footer.html", "footer.html");

//     setActiveNav();
//     initClock();
//     initFooterYear();
//     loadFuelPrices();
//     initSaleAutoCalc();

//     const page = document.body.getAttribute("data-page");
//     console.log(`📄 Current page: ${page}`);

//     // Always load tanks (usually shared)
//     await loadTanks();

//     // Load user-specific data
//     await loadCustomers();
//     await loadTransactions();

//     if (page === "reports") {
//       if ($("report-date")) $("report-date").value = new Date().toISOString().split("T")[0];
//     }

//     console.log("✅ App initialized successfully!");
//   });
// })(); // End IIFE
