// Employee Salary Management JavaScript
const supabase = window.supabaseClient;

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
        window.location.href = 'login.html';
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
        // If payment method is bank transfer, deduct from bank balance
        if (data.payment_method === 'bank_transfer' && data.bank_id) {
            const { data: bank, error: bankFetchError } = await supabase
                .from('banks')
                .select('balance, name')
                .eq('id', data.bank_id)
                .single();

            if (bankFetchError) throw bankFetchError;

            const netSalary = parseFloat(data.net_salary || 0);
            if (parseFloat(bank.balance || 0) < netSalary) {
                alert(`Error: Insufficient balance in ${bank.name}. Current balance is Rs. ${parseFloat(bank.balance || 0).toLocaleString()}`);
                return;
            }

            const newBalance = parseFloat(bank.balance || 0) - netSalary;

            // Update bank balance
            const { error: updateError } = await supabase
                .from('banks')
                .update({ balance: newBalance })
                .eq('id', data.bank_id);

            if (updateError) throw updateError;

            // Record transaction in bank ledger
            const employee = employees.find(e => e.id == data.employee_id);
            const employeeName = employee ? employee.full_name : '';
            await supabase.from('bank_transactions').insert([{
                bank_id: data.bank_id,
                transaction_date: data.payment_date,
                transaction_type: 'salary_payment',
                amount: netSalary,
                description: `Salary Payment to ${employeeName} for ${data.salary_month}`,
                balance_before: bank.balance,
                balance_after: newBalance,
                created_by: currentUser.id
            }]);
        }

        const { error } = await supabase
            .from('employee_salary_payments')
            .insert([data]);

        if (error) throw error;

        alert('Salary paid successfully!');
        closeModal('pay-salary-modal');
        event.target.reset();
        await loadSalaryPayments();
        await updateStats();
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

// Edit employee
window.editEmployee = async function(empId) {
    const emp = employees.find(e => e.id === empId);
    if (!emp) { alert('Employee not found'); return; }

    const newName = prompt('Full Name:', emp.full_name);
    if (newName === null) return;
    const newDesignation = prompt('Designation:', emp.designation || '');
    if (newDesignation === null) return;
    const newPhone = prompt('Phone:', emp.phone || '');
    if (newPhone === null) return;
    const newSalary = prompt('Monthly Salary:', emp.salary_amount);
    if (newSalary === null) return;
    const newStatus = prompt('Status (active/suspended):', emp.status || 'active');
    if (newStatus === null) return;

    try {
        const { error } = await supabase
            .from('employees')
            .update({
                full_name: newName,
                designation: newDesignation,
                phone: newPhone,
                salary_amount: parseFloat(newSalary),
                status: newStatus
            })
            .eq('id', empId);

        if (error) throw error;
        alert('Employee updated successfully!');
        await loadEmployees();
        populateEmployeeDropdowns();
        await updateStats();
    } catch (error) {
        console.error('Error updating employee:', error);
        alert('Error: ' + error.message);
    }
};

// Delete employee
window.deleteEmployee = async function(empId) {
    const emp = employees.find(e => e.id === empId);
    if (!emp) { alert('Employee not found'); return; }

    if (!confirm(`Are you sure you want to delete employee "${emp.full_name}"?\n\nThis will NOT delete their salary payment history.`)) return;

    try {
        // Check for pending advances
        const { data: pendingAdvances } = await supabase
            .from('employee_advances')
            .select('id')
            .eq('employee_id', empId)
            .neq('repayment_status', 'fully_repaid');

        if (pendingAdvances && pendingAdvances.length > 0) {
            if (!confirm(`This employee has ${pendingAdvances.length} pending advance(s). Still delete?`)) return;
        }

        const { error } = await supabase
            .from('employees')
            .delete()
            .eq('id', empId);

        if (error) throw error;
        alert('Employee deleted successfully!');
        await loadEmployees();
        populateEmployeeDropdowns();
        await updateStats();
    } catch (error) {
        console.error('Error deleting employee:', error);
        alert('Error: ' + error.message);
    }
};

// View payment details
window.viewPaymentDetails = async function(paymentId) {
    const payment = salaryPayments.find(p => p.id === paymentId);
    if (!payment) { alert('Payment not found'); return; }

    const details = `
=== Salary Payment Details ===
Employee: ${payment.employees?.full_name || '-'}
Code: ${payment.employees?.employee_code || '-'}
Month: ${payment.salary_month}
Payment Date: ${new Date(payment.payment_date).toLocaleDateString()}

Basic Salary: Rs. ${parseFloat(payment.basic_salary).toLocaleString()}
Advance Deduction: Rs. ${parseFloat(payment.advance_deduction || 0).toLocaleString()}
Other Deductions: Rs. ${parseFloat(payment.other_deductions || 0).toLocaleString()}
Bonuses: Rs. ${parseFloat(payment.bonuses || 0).toLocaleString()}
─────────────────────────
Net Salary: Rs. ${parseFloat(payment.net_salary).toLocaleString()}

Payment Method: ${payment.payment_method || '-'}
Bank: ${payment.banks?.name || 'N/A'}
Reference: ${payment.reference_no || '-'}
Notes: ${payment.notes || '-'}
    `.trim();

    alert(details);
};

// Repay advance
window.repayAdvance = async function(advanceId) {
    const advance = advances.find(a => a.id === advanceId);
    if (!advance) { alert('Advance not found'); return; }

    const remaining = parseFloat(advance.amount) - parseFloat(advance.total_repaid || 0);
    if (remaining <= 0) {
        alert('This advance is already fully repaid.');
        return;
    }

    const amountStr = prompt(
        `Remaining balance: Rs. ${remaining.toLocaleString()}\nEnter repayment amount:`,
        remaining
    );
    if (amountStr === null) return;

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) { alert('Invalid amount'); return; }
    if (amount > remaining) { alert('Repayment amount cannot exceed remaining balance'); return; }

    try {
        const newTotalRepaid = parseFloat(advance.total_repaid || 0) + amount;
        const newRemaining = parseFloat(advance.amount) - newTotalRepaid;
        const newStatus = newRemaining <= 0 ? 'fully_repaid' : 'partially_repaid';

        const { error } = await supabase
            .from('employee_advances')
            .update({
                total_repaid: newTotalRepaid,
                remaining_balance: newRemaining,
                repayment_status: newStatus
            })
            .eq('id', advanceId);

        if (error) throw error;
        alert(`Repayment of Rs. ${amount.toLocaleString()} recorded successfully!`);
        await loadAdvances();
        await loadEmployees();
        await updateStats();
    } catch (error) {
        console.error('Error processing repayment:', error);
        alert('Error: ' + error.message);
    }
};

// Generate report
window.generateReport = async function() {
    const reportType = document.getElementById('report-type').value;
    const reportMonth = document.getElementById('report-month').value;
    const output = document.getElementById('report-output');

    if (!reportType) {
        output.innerHTML = '<div class="alert alert-info">Please select a report type.</div>';
        return;
    }

    try {
        let html = '';

        switch (reportType) {
            case 'monthly-summary': {
                let query = supabase
                    .from('employee_salary_payments')
                    .select(`*, employees!employee_salary_payments_employee_id_fkey (employee_code, full_name)`)
                    .order('payment_date', { ascending: false });

                if (reportMonth) query = query.eq('salary_month', reportMonth);

                const { data, error } = await query;
                if (error) throw error;

                const totalPaid = (data || []).reduce((sum, p) => sum + parseFloat(p.net_salary || 0), 0);

                html = `<h3>Monthly Salary Summary ${reportMonth ? '- ' + reportMonth : ''}</h3>
                    <p><strong>Total Payments:</strong> ${(data || []).length} | <strong>Total Paid:</strong> Rs. ${totalPaid.toLocaleString()}</p>
                    <table><thead><tr><th>Employee</th><th>Month</th><th>Basic</th><th>Deductions</th><th>Net Paid</th></tr></thead><tbody>`;

                (data || []).forEach(p => {
                    const deductions = parseFloat(p.advance_deduction || 0) + parseFloat(p.other_deductions || 0);
                    html += `<tr>
                        <td>${p.employees?.full_name || '-'}</td>
                        <td>${p.salary_month}</td>
                        <td>Rs. ${parseFloat(p.basic_salary).toLocaleString()}</td>
                        <td>Rs. ${deductions.toLocaleString()}</td>
                        <td><strong>Rs. ${parseFloat(p.net_salary).toLocaleString()}</strong></td>
                    </tr>`;
                });
                html += '</tbody></table>';
                break;
            }

            case 'employee-summary': {
                html = `<h3>Employee-wise Summary</h3>
                    <table><thead><tr><th>Code</th><th>Name</th><th>Designation</th><th>Salary</th><th>Advance Balance</th><th>Status</th></tr></thead><tbody>`;

                employees.forEach(emp => {
                    const advBal = (emp.employee_advances || []).reduce((sum, a) =>
                        sum + (parseFloat(a.amount) - parseFloat(a.total_repaid || 0)), 0);
                    html += `<tr>
                        <td>${emp.employee_code}</td>
                        <td>${emp.full_name}</td>
                        <td>${emp.designation || '-'}</td>
                        <td>Rs. ${parseFloat(emp.salary_amount).toLocaleString()}</td>
                        <td>Rs. ${advBal.toLocaleString()}</td>
                        <td><span class="badge ${emp.status}">${emp.status}</span></td>
                    </tr>`;
                });
                html += '</tbody></table>';
                break;
            }

            case 'advances-report': {
                html = `<h3>All Advances Report</h3>
                    <table><thead><tr><th>Date</th><th>Employee</th><th>Amount</th><th>Repaid</th><th>Balance</th><th>Status</th></tr></thead><tbody>`;

                advances.forEach(adv => {
                    const balance = parseFloat(adv.amount) - parseFloat(adv.total_repaid || 0);
                    html += `<tr>
                        <td>${new Date(adv.advance_date).toLocaleDateString()}</td>
                        <td>${adv.employees?.full_name || '-'}</td>
                        <td>Rs. ${parseFloat(adv.amount).toLocaleString()}</td>
                        <td>Rs. ${parseFloat(adv.total_repaid || 0).toLocaleString()}</td>
                        <td>Rs. ${balance.toLocaleString()}</td>
                        <td>${adv.repayment_status}</td>
                    </tr>`;
                });
                html += '</tbody></table>';
                break;
            }

            case 'pending-advances': {
                const pending = advances.filter(a => a.repayment_status !== 'fully_repaid');
                const totalPending = pending.reduce((sum, a) =>
                    sum + (parseFloat(a.amount) - parseFloat(a.total_repaid || 0)), 0);

                html = `<h3>Pending Advances</h3>
                    <p><strong>Total Pending:</strong> ${pending.length} advances | <strong>Total Amount:</strong> Rs. ${totalPending.toLocaleString()}</p>
                    <table><thead><tr><th>Date</th><th>Employee</th><th>Original</th><th>Remaining</th><th>Reason</th></tr></thead><tbody>`;

                pending.forEach(adv => {
                    const balance = parseFloat(adv.amount) - parseFloat(adv.total_repaid || 0);
                    html += `<tr>
                        <td>${new Date(adv.advance_date).toLocaleDateString()}</td>
                        <td>${adv.employees?.full_name || '-'}</td>
                        <td>Rs. ${parseFloat(adv.amount).toLocaleString()}</td>
                        <td><strong>Rs. ${balance.toLocaleString()}</strong></td>
                        <td>${adv.reason || '-'}</td>
                    </tr>`;
                });
                html += '</tbody></table>';
                break;
            }
        }

        output.innerHTML = html;
    } catch (error) {
        console.error('Error generating report:', error);
        output.innerHTML = `<div class="alert alert-danger">Error generating report: ${error.message}</div>`;
    }
};
