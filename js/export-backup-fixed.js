// Fixed Export & Backup System
// This module handles complete database export as JSON with structure

import { supabase } from './supabase-client.js';

// Main export function - exports complete database structure + data as JSON
window.exportAllDataAsJSON = async function() {
    try {
        const button = event.target;
        button.disabled = true;
        button.textContent = 'Exporting...';
        
        console.log('Starting database export...');
        
        // List of all tables to export
        const tables = [
            'banks', 'cash_advances', 'cash_deposits', 'companies',
            'company_repayments', 'company_transactions', 'customers',
            'daily_reports', 'expense_categories', 'expense_types',
            'mobil_products', 'mobil_sales', 'mobil_stock',
            'rent_payments', 'settings', 'shops', 'stock_entries',
            'stock_purchases', 'tanks', 'transactions', 'user_profiles',
            'employees', 'employee_salary_payments', 'employee_advances',
            'employee_advance_repayments', 'bank_balances', 'bank_transfers', 'bank_transactions'
        ];
        
        let exportData = {
            exportDate: new Date().toISOString(),
            exportVersion: '3.1',
            systemName: 'PetroFlow',
            tables: {},
            metadata: {
                totalTables: 0,
                totalRecords: 0,
                databaseSize: 'Unknown'
            }
        };
        
        let totalRecords = 0;
        
        // Export each table
        for (const table of tables) {
            try {
                const { data, error, count } = await supabase
                    .from(table)
                    .select('*', { count: 'exact' });
                
                if (error) {
                    console.warn(`Warning: Could not fetch ${table}:`, error.message);
                    continue;
                }
                
                if (data && data.length > 0) {
                    exportData.tables[table] = {
                        recordCount: data.length,
                        data: data
                    };
                    totalRecords += data.length;
                    console.log(`✓ Exported ${table}: ${data.length} records`);
                } else {
                    exportData.tables[table] = {
                        recordCount: 0,
                        data: []
                    };
                    console.log(`✓ Exported ${table}: 0 records`);
                }
            } catch (err) {
                console.warn(`Error exporting ${table}:`, err);
            }
        }
        
        exportData.metadata.totalTables = Object.keys(exportData.tables).length;
        exportData.metadata.totalRecords = totalRecords;
        
        // Create the JSON file
        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Download file
        const link = document.createElement('a');
        link.href = url;
        const timestamp = new Date().toISOString().split('T')[0];
        link.download = `petroflow_complete_backup_${timestamp}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        alert(`✅ Export successful!\n\nTables: ${exportData.metadata.totalTables}\nRecords: ${exportData.metadata.totalRecords}\n\nFile: petroflow_complete_backup_${timestamp}.json`);
        
        button.disabled = false;
        button.textContent = 'Export All Data (JSON)';
        
    } catch (error) {
        console.error('Export error:', error);
        alert('❌ Export failed: ' + error.message);
        button.disabled = false;
        button.textContent = 'Export All Data (JSON)';
    }
};

// Backup system - complete database backup as SQL file (text format)
window.createDatabaseBackup = async function() {
    try {
        const button = event.target;
        button.disabled = true;
        button.textContent = 'Creating backup...';
        
        console.log('Starting database backup...');
        
        // Get all data
        const tables = [
            'banks', 'cash_advances', 'cash_deposits', 'companies',
            'company_repayments', 'company_transactions', 'customers',
            'daily_reports', 'expense_categories', 'expense_types',
            'mobil_products', 'mobil_sales', 'mobil_stock',
            'rent_payments', 'settings', 'shops', 'stock_entries',
            'stock_purchases', 'tanks', 'transactions', 'user_profiles',
            'employees', 'employee_salary_payments', 'employee_advances',
            'employee_advance_repayments', 'bank_balances', 'bank_transfers', 'bank_transactions'
        ];
        
        let sqlContent = `-- PetroFlow Database Backup
-- Generated: ${new Date().toISOString()}
-- Version: 3.1
-- System: Complete backup with all tables and data

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

-- ============================================================================
-- DATA EXPORT
-- ============================================================================

`;
        
        let backupData = {
            exportDate: new Date().toISOString(),
            exportVersion: '3.1',
            tables: {},
            totalRecords: 0
        };
        
        // Collect data from each table
        for (const table of tables) {
            try {
                const { data, error } = await supabase
                    .from(table)
                    .select('*');
                
                if (error) {
                    console.warn(`Warning: ${table} - ${error.message}`);
                    continue;
                }
                
                if (data && data.length > 0) {
                    sqlContent += `\n-- Table: ${table}\n-- Records: ${data.length}\n`;
                    sqlContent += `DELETE FROM ${table};\n`;
                    sqlContent += `INSERT INTO ${table} VALUES\n`;
                    
                    data.forEach((row, index) => {
                        const values = Object.values(row).map(v => {
                            if (v === null) return 'NULL';
                            if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
                            if (typeof v === 'boolean') return v ? 'true' : 'false';
                            return v;
                        }).join(', ');
                        
                        sqlContent += `(${values})${index < data.length - 1 ? ',\n' : ';\n'}`;
                    });
                    
                    backupData.tables[table] = data.length;
                    backupData.totalRecords += data.length;
                    
                    console.log(`✓ Backed up ${table}: ${data.length} records`);
                }
            } catch (err) {
                console.warn(`Error backing up ${table}:`, err);
            }
        }
        
        sqlContent += `\n-- ============================================================================\n`;
        sqlContent += `-- BACKUP SUMMARY\n`;
        sqlContent += `-- ============================================================================\n`;
        sqlContent += `-- Total Tables: ${Object.keys(backupData.tables).length}\n`;
        sqlContent += `-- Total Records: ${backupData.totalRecords}\n`;
        sqlContent += `-- Backup Date: ${new Date().toLocaleString()}\n`;
        sqlContent += `-- ============================================================================\n`;
        
        // Create and download SQL file
        const blob = new Blob([sqlContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const timestamp = new Date().toISOString().split('T')[0];
        link.download = `petroflow_backup_${timestamp}.sql`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        alert(`✅ Backup successful!\n\nTables: ${Object.keys(backupData.tables).length}\nRecords: ${backupData.totalRecords}\n\nFile: petroflow_backup_${timestamp}.sql`);
        
        button.disabled = false;
        button.textContent = 'Create Complete Backup';
        
    } catch (error) {
        console.error('Backup error:', error);
        alert('❌ Backup failed: ' + error.message);
        button.disabled = false;
        button.textContent = 'Create Complete Backup';
    }
};

console.log('✅ Export & Backup system loaded!');
