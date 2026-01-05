/**
 * Financing Manager - Data Model
 * Handles financing CRUD and localStorage persistence
 */

import { generateAmortizationTable, updateInstallmentStatuses, calculateFinancingSummary, simulateExtraAmortization } from '../utils/amortization.js';
import { showToast } from '../utils/toast.js';

export class FinancingManager {
    constructor() {
        this.storageKey = 'finance_dashboard_financings';
        this.financings = this.loadFromStorage();
    }

    // Generate unique ID
    generateId() {
        return 'fin_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    // Load from localStorage
    loadFromStorage() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                const financings = JSON.parse(data);
                // Update statuses based on current date
                return financings.map(f => ({
                    ...f,
                    installments: updateInstallmentStatuses(f.installments)
                }));
            }
            return [];
        } catch (error) {
            console.error('Error loading financings:', error);
            return [];
        }
    }

    // Save to localStorage
    saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.financings));
        } catch (error) {
            console.error('Error saving financings:', error);
            showToast('Erro ao salvar financiamentos', 'error');
        }
    }

    /**
     * Add new financing
     * @param {Object} data - Financing data
     * @returns {Object} Created financing
     */
    addFinancing(data) {
        const { name, type, principal, annualRate, termMonths, system, cetRate, startDate, paidInstallments = 0, anticipatedInstallments = 0 } = data;

        // Generate amortization table
        const installments = generateAmortizationTable(
            system,
            principal,
            annualRate,
            termMonths,
            startDate
        );

        // Mark already paid installments
        const totalPaid = paidInstallments + anticipatedInstallments;
        for (let i = 0; i < Math.min(totalPaid, installments.length); i++) {
            installments[i].status = 'paid';
            installments[i].paidDate = installments[i].dueDate;
        }

        const financing = {
            id: this.generateId(),
            name,
            type: type || 'other',
            principal,
            annualRate,
            monthlyRate: annualRate / 12,
            termMonths,
            system,
            cetRate: cetRate || null,
            startDate,
            paidInstallments: paidInstallments,
            anticipatedInstallments: anticipatedInstallments,
            installments,
            createdAt: new Date().toISOString()
        };

        this.financings.push(financing);
        this.saveToStorage();
        return financing;
    }

    /**
     * Update financing
     * @param {string} id - Financing ID
     * @param {Object} updates - Updates to apply
     * @returns {boolean} Success
     */
    updateFinancing(id, updates) {
        const index = this.financings.findIndex(f => f.id === id);
        if (index === -1) return false;

        // If core parameters changed, regenerate table
        const financing = this.financings[index];
        const needsRegeneration =
            updates.principal !== undefined ||
            updates.annualRate !== undefined ||
            updates.termMonths !== undefined ||
            updates.system !== undefined ||
            updates.startDate !== undefined;

        if (needsRegeneration) {
            const newData = { ...financing, ...updates };
            newData.installments = generateAmortizationTable(
                newData.system,
                newData.principal,
                newData.annualRate,
                newData.termMonths,
                newData.startDate
            );
            this.financings[index] = newData;
        } else {
            this.financings[index] = { ...financing, ...updates };
        }

        this.saveToStorage();
        return true;
    }

    /**
     * Delete financing
     * @param {string} id - Financing ID
     * @returns {boolean} Success
     */
    deleteFinancing(id) {
        const index = this.financings.findIndex(f => f.id === id);
        if (index === -1) return false;

        this.financings.splice(index, 1);
        this.saveToStorage();
        return true;
    }

    /**
     * Get financing by ID
     * @param {string} id - Financing ID
     * @returns {Object|null} Financing or null
     */
    getFinancing(id) {
        return this.financings.find(f => f.id === id) || null;
    }

    /**
     * Get all financings
     * @returns {Array} All financings
     */
    getAllFinancings() {
        return this.financings;
    }

    /**
     * Get financing summary
     * @param {string} id - Financing ID
     * @returns {Object|null} Summary or null
     */
    getFinancingSummary(id) {
        const financing = this.getFinancing(id);
        if (!financing) return null;
        return calculateFinancingSummary(financing.installments, financing.principal);
    }

    /**
     * Get total remaining balance across all financings
     * @returns {number} Total remaining balance
     */
    getTotalRemainingBalance() {
        return this.financings.reduce((total, f) => {
            const summary = calculateFinancingSummary(f.installments, f.principal);
            return total + summary.remainingBalance;
        }, 0);
    }

    /**
     * Get all upcoming installments across all financings
     * @param {number} count - Max installments to return
     * @returns {Array} Upcoming installments with financing info
     */
    getUpcomingInstallments(count = 5) {
        const allInstallments = [];

        this.financings.forEach(f => {
            f.installments
                .filter(i => i.status !== 'paid')
                .forEach(i => {
                    allInstallments.push({
                        ...i,
                        financingId: f.id,
                        financingName: f.name
                    });
                });
        });

        // Sort by due date and return first N
        return allInstallments
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
            .slice(0, count);
    }

    /**
     * Mark installment as paid
     * @param {string} financingId - Financing ID
     * @param {number} installmentNumber - Installment number
     * @param {string} paidDate - Date paid (YYYY-MM-DD)
     * @param {string} transactionId - Optional linked transaction ID
     * @returns {boolean} Success
     */
    markInstallmentPaid(financingId, installmentNumber, paidDate = null, transactionId = null) {
        const financing = this.getFinancing(financingId);
        if (!financing) return false;

        const installment = financing.installments.find(i => i.number === installmentNumber);
        if (!installment) return false;

        installment.status = 'paid';
        installment.paidDate = paidDate || new Date().toISOString().split('T')[0];
        installment.linkedTransactionId = transactionId;

        this.saveToStorage();
        return true;
    }

    /**
     * Link transaction to installment
     * @param {string} financingId - Financing ID
     * @param {number} installmentNumber - Installment number
     * @param {string} transactionId - Transaction ID
     * @returns {boolean} Success
     */
    linkTransaction(financingId, installmentNumber, transactionId) {
        return this.markInstallmentPaid(financingId, installmentNumber, null, transactionId);
    }

    /**
     * Get overdue installments count
     * @returns {number} Count of overdue installments
     */
    getOverdueCount() {
        return this.financings.reduce((count, f) => {
            return count + f.installments.filter(i => i.status === 'overdue').length;
        }, 0);
    }

    /**
     * Apply extra amortization to a financing
     * @param {string} id - Financing ID
     * @param {number} extraAmount - Amount to amortize
     * @param {string} strategy - 'reduce_term' or 'reduce_payment'
     * @returns {Object|null} Result details or null
     */
    applyExtraAmortization(id, extraAmount, strategy) {
        const financing = this.getFinancing(id);
        if (!financing) return null;

        const simulation = simulateExtraAmortization(financing, extraAmount, strategy);

        if (!simulation) {
            throw new Error('Não foi possível realizar a simulação.');
        }

        // Merge installments
        const paidInstallments = financing.installments.filter(i => i.status === 'paid');
        const lastNumber = paidInstallments.length > 0 ? paidInstallments[paidInstallments.length - 1].number : 0;

        // Renumber new installments
        const activeNewInstallments = simulation.newInstallments.map(i => ({
            ...i,
            number: i.number + lastNumber
        }));

        const finalInstallments = [...paidInstallments, ...activeNewInstallments];

        // Update financing
        // We need to update the "Effective" term and principal? 
        // Technically the original principal was X. The History is preserved in paidInstallments.
        // The Future is in activeNewInstallments.

        // We should update the financing object mostly to persist the new table.
        // We might want to track "Extra Amortizations" history too, but for now P1 says just apply.

        const index = this.financings.findIndex(f => f.id === id);
        this.financings[index] = {
            ...financing,
            installments: finalInstallments,
            termMonths: finalInstallments.length // Approximate new total term
        };

        this.saveToStorage();

        return {
            newTerm: finalInstallments.length,
            savings: simulation.savings
        };
    }
}
