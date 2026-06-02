// Employee Salary Management JavaScript
import { supabase } from './supabase-client.js';

// Global state
let currentUser = null;
let employees = [];
let salaryPayments = [];
let advances = [];
let banks = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadInitialData();
});

// Check authentication
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '../login.html';
        return;
    }
    currentUser = session.user;
}

// Load all initial data
async function loadInitialData() {
    await Promise.all([
        loadEmployees(),
        loadBanks(),
        loadSalaryPayments(),
        loadAdvances(),
        updateStats()
    ]);
    
    // Populate employee dropdowns
    populateEmployeeDropdowns();
    populateBankDropdowns();
}

// Load employees
async function loadEmployees() {
    try {
        const { data, error } = await supabase
            .from('employees')
            .select(`
                *,
                employee_advances!employee_advances_employee_id_fkey (
                    amount,
                    total_repaid
                )
            `)
            .order('employee_code', { ascending: true });

        if (error) throw error;

        employees = data || [];
        displayEmployees();
    } catch (error) {
        console.error('Error loading employees:', error);
        alert('Error loading employees: ' + error.message);
    }
}

// Display employees in table
function displayEmployees() {
    const tbody = document.querySelector('#employees-table tbody');
    tbody.innerHTML = '';

    employees.forEach(emp => {
        const advanceBalance = (emp.employee_advances || []).reduce((sum, adv) => 
            sum + (parseFloat(adv.amount) - parseFloat(adv.total_repaid)), 0);

        const row = `
            <tr>
                <td>${emp.employee_code}</td>
                <td>${emp.full_name}</td>
                <td>${emp.designation || '-'}</td>
                <td>${emp.phone || '-'}</td>
                <td>Rs. ${parseFloat(emp.salary_amount).toLocaleString()}</td>
                <td>Rs. ${advanceBalance.toLocaleString()}</td>
                <td><span class="badge ${emp.status}">${emp.status}</span></td>
                <td>
                    <button class="btn btn-sm" onclick="editEmployee(${emp.id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteEmployee(${emp.id})">Delete</button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// Load banks
async function loadBanks() {
    try {
        const { data, error } = await supabase
            .from('banks')
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (error) throw error;
        banks = data || [];
    } catch (error) {
        console.error('Error loading banks:', error);
    }
}

// Load salary payments
async function loadSalaryPayments() {
    try {
        const filterMonth = document.getElementById('filter-salary-month')?.value;
        const filterEmployee = document.getElementById('filter-salary-employee')?.value;

        let query = supabase
            .from('employee_salary_payments')
            .select(`
                *,
                employees!employee_salary_payments_employee_id_fkey (
                    employee_code,
                    full_name
                ),
                banks!employee_salary_payments_bank_id_fkey (
                    name
                )
            `)
            .order('payment_date', { ascending: false });

        if (filterMonth) {
            query = query.eq('salary_month', filterMonth);
        }
        if (filterEmployee) {
            query = query.eq('employee_id', filterEmployee);
        }

        const { data, error } = await query;
        if (error) throw error;

        salaryPayments = data || [];
        displaySalaryPayments();
    } catch (error) {
        console.error('Error loading salary payments:', error);
        alert('Error loading salary payments: ' + error.message);
    }
}

// Display salary payments
function displaySalaryPayments() {
    const tbody = document.querySelector('#salaries-table tbody');
    tbody.innerHTML = '';

    salaryPayments.forEach(payment => {
        const row = `
            <tr>
                <td>${new Date(payment.payment_date).toLocaleDateString()}</td>
                <td>${payment.employees?.full_name || '-'}</td>
                <td>${payment.salary_month}</td>
                <td>Rs. ${parseFloat(payment.basic_salary).toLocaleString()}</td>
                <td>Rs. ${parseFloat(payment.advance_deduction || 0).toLocaleString()}</td>
                <td>Rs. ${parseFloat(payment.other_deductions || 0).toLocaleString()}</td>
                <td>Rs. ${parseFloat(payment.bonuses || 0).toLocaleString()}</td>
                <td><strong>Rs. ${parseFloat(payment.net_salary).toLocaleString()}</strong></td>
                <td>${payment.payment_method || '-'}</td>
                <td>
                    <button class="btn btn-sm" onclick="viewPaymentDetails(${payment.id})">View</button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// Load advances
async function loadAdvances() {
    try {
        const { data, error } = await supabase
            .from('employee_advances')
            .select(`
                *,
                employees!employee_advances_employee_id_fkey (
                    employee_code,
                    full_name
                )
            `)
            .order('advance_date', { ascending: false });

        if (error) throw error;

        advances = data || [];
        displayAdvances();
    } catch (error) {
        console.error('Error loading advances:', error);
        alert('Error loading advances: ' + error.message);
    }
}

// Display advances
function displayAdvances() {
    const tbody = document.querySelector('#advances-table tbody');
    tbody.innerHTML = '';

    advances.forEach(adv => {
        const balance = parseFloat(adv.amount) - parseFloat(adv.total_repaid || 0);
        const row = `
            <tr>
                <td>${new Date(adv.advance_date).toLocaleDateString()}</td>
                <td>${adv.employees?.full_name || '-'}</td>
                <td>Rs. ${parseFloat(adv.amount).toLocaleString()}</td>
                <td>${adv.reason}</td>
                <td>Rs. ${parseFloat(adv.total_repaid || 0).toLocaleString()}</td>
                <td>Rs. ${balance.toLocaleString()}</td>
                <td><span class="badge ${adv.repayment_status}">${adv.repayment_status}</span></td>
                <td>
                    <button class="btn btn-sm" onclick="repayAdvance(${adv.id})">Repay</button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// Update statistics
async function updateStats() {
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(e => e.status === 'active').length;
    const totalSalary = employees.reduce((sum, e) => sum + parseFloat(e.salary_amount || 0), 0);
    const totalAdvances = advances.reduce((sum, a) => 
        sum + (parseFloat(a.amount) - parseFloat(a.total_repaid || 0)), 0);

    document.getElementById('stat-total-employees').textContent = totalEmployees;
    document.getElementById('stat-active-employees').textContent = activeEmployees;
    document.getElementById('stat-total-salary').textContent = `Rs. ${totalSalary.toLocaleString()}`;
    document.getElementById('stat-total-advances').textContent = `Rs. ${totalAdvances.toLocaleString()}`;
}

// Populate employee dropdowns
function populateEmployeeDropdowns() {
    const selects = document.querySelectorAll('select[name="employee_id"]');
    const filterSelect = document.getElementById('filter-salary-employee');
    
    const options = employees.map(e => 
        `<option value="${e.id}">${e.employee_code} - ${e.full_name}</option>`
    ).join('');

    selects.forEach(select => {
        select.innerHTML = '<option value="">-- Select Employee --</option>' + options;
    });

    if (filterSelect) {
        filterSelect.innerHTML = '<option value="">All Employees</option>' + options;
    }
}

// Populate bank dropdowns
function populateBankDropdowns() {
    const select = document.getElementById('salary-bank-select');
    if (!select) return;

    const options = banks.map(b => 
        `<option value="${b.id}">${b.name} - ${b.account_number || ''}</option>`
    ).join('');

    select.innerHTML = '<option value="">-- Select Bank --</option>' + options;
}

// Modal functions
window.showAddEmployeeModal = function() {
    document.getElementById('add-employee-modal').classList.add('active');
};

window.showPaySalaryModal = function() {
    // Set today's date
    document.querySelector('#pay-salary-form input[name="payment_date"]').value = 
        new Date().toISOString().split('T')[0];
    
    // Set current month
    const now = new Date();
    document.querySelector('#pay-salary-form input[name="salary_month"]').value = 
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    document.getElementById('pay-salary-modal').classList.add('active');
};

window.showGiveAdvanceModal = function() {
    // Set today's date
    document.querySelector('#give-advance-form input[name="advance_date"]').value = 
        new Date().toISOString().split('T')[0];
    
    document.getElementById('give-advance-modal').classList.add('active');
};

window.closeModal = function(modalId) {
    document.getElementById(modalId).classList.remove('active');
};

// Tab switching
window.switchTab = function(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
};

// Save employee
window.saveEmployee = async function(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    data.created_by = currentUser.id;

    try {
        const { error } = await supabase
            .from('employees')
            .insert([data]);

        if (error) throw error;

        alert('Employee added successfully!');
        closeModal('add-employee-modal');
        event.target.reset();
        await loadEmployees();
        populateEmployeeDropdowns();
        await updateStats();
    } catch (error) {
        console.error('Error saving employee:', error);
        alert('Error: ' + error.message);
    }
};

// Pay salary
window.paySalary = async function(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    data.paid_by = currentUser.id;

    try {
        const { error } = await supabase
            .from('employee_salary_payments')
            .insert([data]);

        if (error) throw error;

        alert('Salary paid successfully!');
        closeModal('pay-salary-modal');
        event.target.reset();
        await loadSalaryPayments();
    } catch (error) {
        console.error('Error paying salary:', error);
        alert('Error: ' + error.message);
    }
};

// Give advance
window.giveAdvance = async function(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    data.created_by = currentUser.id;
    data.total_repaid = 0;
    data.remaining_balance = data.amount;

    try {
        const { error } = await supabase
            .from('employee_advances')
            .insert([data]);

        if (error) throw error;

        alert('Advance given successfully!');
        closeModal('give-advance-modal');
        event.target.reset();
        await loadAdvances();
        await loadEmployees();
        await updateStats();
    } catch (error) {
        console.error('Error giving advance:', error);
        alert('Error: ' + error.message);
    }
};

// Update salary details when employee is selected
window.updateSalaryDetails = function() {
    const empId = document.getElementById('salary-employee-select').value;
    if (!empId) return;

    const employee = employees.find(e => e.id == empId);
    if (!employee) return;

    document.getElementById('basic-salary-display').value = employee.salary_amount;
    
    // Calculate advance balance
    const advanceBalance = (employee.employee_advances || []).reduce((sum, adv) => 
        sum + (parseFloat(adv.amount) - parseFloat(adv.total_repaid)), 0);
    
    document.getElementById('advance-deduction').value = advanceBalance;
    
    // Trigger net salary calculation
    calculateNetSalary();
};

// Calculate net salary
function calculateNetSalary() {
    const form = document.getElementById('pay-salary-form');
    const basic = parseFloat(form.basic_salary.value || 0);
    const advDeduct = parseFloat(form.advance_deduction.value || 0);
    const otherDeduct = parseFloat(form.other_deductions.value || 0);
    const bonuses = parseFloat(form.bonuses.value || 0);
    
    const netSalary = basic - advDeduct - otherDeduct + bonuses;
    document.getElementById('net-salary-display').value = netSalary.toFixed(2);
}

// Listen to form changes for net salary calculation
document.addEventListener('input', function(e) {
    if (e.target.closest('#pay-salary-form')) {
        calculateNetSalary();
    }
});

// Toggle bank field
window.toggleBankField = function(select) {
    const bankGroup = document.getElementById('bank-select-group');
    if (select.value === 'bank_transfer') {
        bankGroup.style.display = 'block';
    } else {
        bankGroup.style.display = 'none';
    }
};

// Export functions
window.loadSalaryPayments = loadSalaryPayments;
