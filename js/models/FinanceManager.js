/**
 * Finance Manager - Data Model
 * Handles transactions, categories, and localStorage persistence
 */

import { DEFAULT_CATEGORIES } from '../config/categories.js';
import { showToast } from '../utils/toast.js';

export class FinanceManager {
    constructor() {
        this.storageKey = 'finance_dashboard_data';
        this.categoriesKey = 'finance_dashboard_categories';

        this.transactions = this.loadFromStorage();
        this.categories = this.loadCategories();

        this.chart = null;
        this.monthlyChart = null;
        this.currentFilter = 'all';
        this.currentPeriod = 'all';
        this.searchQuery = '';
    }

    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    // Load data from localStorage
    loadFromStorage() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error loading data:', error);
            return [];
        }
    }

    // Save data to localStorage
    saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.transactions));
        } catch (error) {
            console.error('Error saving data:', error);
            showToast('Erro ao salvar dados', 'error');
        }
    }

    // Load categories from localStorage
    loadCategories() {
        try {
            const data = localStorage.getItem(this.categoriesKey);
            if (data) return JSON.parse(data);

            // Use default categories
            this.saveCategories(DEFAULT_CATEGORIES);
            return [...DEFAULT_CATEGORIES];
        } catch (error) {
            console.error('Error loading categories:', error);
            return [];
        }
    }

    // Save categories to localStorage
    saveCategories(categories = this.categories) {
        try {
            localStorage.setItem(this.categoriesKey, JSON.stringify(categories));
        } catch (error) {
            console.error('Error saving categories:', error);
        }
    }

    // Add new category
    addCategory(category) {
        const newCategory = {
            id: this.generateId(),
            ...category
        };
        this.categories.push(newCategory);
        this.saveCategories();
        return newCategory;
    }

    // Delete category
    deleteCategory(id) {
        const category = this.categories.find(c => c.id === id);
        if (!category) return false;

        const typeCount = this.categories.filter(c => c.type === (category.type || 'expense')).length;
        if (typeCount <= 1) {
            throw new Error('Deve haver pelo menos uma categoria deste tipo.');
        }

        this.categories = this.categories.filter(c => c.id !== id);
        this.saveCategories();
        return true;
    }

    // Add new transaction
    addTransaction(transaction) {
        const newTransaction = {
            id: this.generateId(),
            ...transaction
        };
        this.transactions.unshift(newTransaction);
        this.saveToStorage();
        return newTransaction;
    }

    // Delete transaction by ID
    deleteTransaction(id) {
        const index = this.transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            this.transactions.splice(index, 1);
            this.saveToStorage();
            return true;
        }
        return false;
    }

    // Update transaction by ID
    updateTransaction(id, updates) {
        const index = this.transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            this.transactions[index] = { ...this.transactions[index], ...updates };
            this.saveToStorage();
            return true;
        }
        return false;
    }

    // Get transaction by ID
    getTransaction(id) {
        return this.transactions.find(t => t.id === id);
    }

    // Import transactions (merge with existing)
    importTransactions(newTransactions) {
        const imported = newTransactions.map(t => ({
            ...t,
            id: this.generateId()
        }));
        this.transactions = [...imported, ...this.transactions];
        this.saveToStorage();
        return imported.length;
    }

    // Get filtered transactions
    getFilteredTransactions() {
        let transactions = this.transactions;

        if (this.currentFilter !== 'all') {
            transactions = transactions.filter(t => t.type === this.currentFilter);
        }

        if (this.currentPeriod !== 'all') {
            transactions = transactions.filter(t => t.date.startsWith(this.currentPeriod));
        }

        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            transactions = transactions.filter(t =>
                t.description.toLowerCase().includes(query) ||
                t.category.toLowerCase().includes(query)
            );
        }

        return transactions;
    }

    // Calculate totals
    getTotals() {
        return this.transactions.reduce((acc, t) => {
            if (t.type === 'income') {
                acc.income += t.amount;
            } else {
                acc.expense += t.amount;
            }
            acc.balance = acc.income - acc.expense;
            return acc;
        }, { income: 0, expense: 0, balance: 0 });
    }

    // Get expenses by category (for chart)
    getExpensesByCategory() {
        const categories = {};
        this.transactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                categories[t.category] = (categories[t.category] || 0) + t.amount;
            });
        return categories;
    }

    // Get monthly data for evolution chart
    getMonthlyData() {
        const monthlyData = {};
        const monthNames = [
            'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
            'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
        ];

        this.transactions.forEach(t => {
            if (!t.date) return;
            const period = t.date.substring(0, 7);

            if (!monthlyData[period]) {
                monthlyData[period] = { income: 0, expense: 0 };
            }

            if (t.type === 'income') {
                monthlyData[period].income += t.amount;
            } else {
                monthlyData[period].expense += t.amount;
            }
        });

        const sortedPeriods = Object.keys(monthlyData).sort().slice(-12);

        return {
            labels: sortedPeriods.map(p => {
                const [year, month] = p.split('-');
                return `${monthNames[parseInt(month) - 1]}/${year.slice(2)}`;
            }),
            incomes: sortedPeriods.map(p => monthlyData[p].income),
            expenses: sortedPeriods.map(p => monthlyData[p].expense)
        };
    }

    // Get top 5 expenses by category
    getTopExpenses() {
        const categories = this.getExpensesByCategory();
        const sorted = Object.entries(categories)
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        const maxAmount = sorted.length > 0 ? sorted[0].amount : 0;

        return sorted.map(item => ({
            ...item,
            percentage: maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0
        }));
    }
}
