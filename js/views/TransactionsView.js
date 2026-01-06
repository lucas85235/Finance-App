/**
 * TransactionsView - Transactions list view component
 * Handles transaction table, filters, and inspector panel
 */

import { BaseView } from './BaseView.js';
import { Events, eventBus } from '../services/EventBus.js';
import { formatCurrency, formatDate, escapeHtml } from '../utils/helpers.js';
import { validateTransaction, showFormErrors, clearFormErrors } from '../utils/validators.js';
import { showToast } from '../utils/toast.js';

export class TransactionsView extends BaseView {
    constructor(financeManager, inspectorManager) {
        super('transactions', financeManager);
        this.inspector = inspectorManager;
    }

    cacheElements() {
        this.tableBody = document.getElementById('transactions-body');
        this.emptyState = document.getElementById('empty-state');
        this.filterType = document.getElementById('filter-type');
        this.filterCategory = document.getElementById('filter-category');
        this.searchInput = document.getElementById('search-input');
        this.sidebarIncome = document.getElementById('sidebar-income');
        this.sidebarExpense = document.getElementById('sidebar-expense');
        this.sidebarBalance = document.getElementById('sidebar-balance');
        this.upcomingList = document.getElementById('transactions-upcoming-list');
    }

    bindEvents() {
        this.filterType?.addEventListener('change', (e) => {
            this.fm.currentFilter = e.target.value;
            this.renderTransactions();
        });

        let searchTimeout;
        this.searchInput?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.fm.searchQuery = e.target.value.trim();
                this.renderTransactions();
            }, 300);
        });

        this.subscribe(Events.TRANSACTION_ADDED, () => this.render());
        this.subscribe(Events.TRANSACTION_UPDATED, () => this.render());
        this.subscribe(Events.TRANSACTION_DELETED, () => this.render());
        this.subscribe(Events.PERIOD_CHANGED, () => this.render());
        this.subscribe(Events.CATEGORY_CHANGED, () => this.populateCategoryFilter());
        this.subscribe(Events.DATA_IMPORTED, () => this.render());
        this.subscribe(Events.RENDER_REQUESTED, () => this.render());

        // Sync with global search
        this.subscribe(Events.FILTER_CHANGED, (data) => {
            if (data?.query !== undefined && this.searchInput) {
                this.searchInput.value = data.query;
            }
            this.renderTransactions();
        });
    }

    render() {
        if (!this.isActive) return;
        this.populateCategoryFilter();
        this.renderTransactions();
        this.renderSidebar();
        this.renderUpcomingInstallments();
    }

    populateCategoryFilter() {
        if (!this.filterCategory) return;

        const categories = this.fm.categories;
        const currentVal = this.filterCategory.value;

        let options = '<option value="all">Todas as Categorias</option>';
        categories.forEach(cat => {
            options += `<option value="${escapeHtml(cat.name)}">${cat.icon} ${escapeHtml(cat.name)}</option>`;
        });

        this.filterCategory.innerHTML = options;

        if (currentVal && categories.some(c => c.name === currentVal)) {
            this.filterCategory.value = currentVal;
        }
    }

    renderTransactions() {
        const transactions = this.fm.getUnifiedTransactions();

        if (transactions.length === 0) {
            this.tableBody.innerHTML = '';
            this.emptyState?.classList.remove('hidden');
            return;
        }

        this.emptyState?.classList.add('hidden');

        this.tableBody.innerHTML = transactions.map(t => {
            const isInstallment = t.isInstallment === true;
            const isOverdue = isInstallment && t.installmentData?.status === 'overdue';

            return `
            <tr data-id="${t.id}" ${isInstallment ? 'data-installment="true"' : ''} ${isOverdue ? 'class="overdue-installment"' : ''}>
                <td>${formatDate(t.date)}</td>
                <td>
                    ${isInstallment ? '<span class="badge-installment">🏦 Parcela</span> ' : ''}
                    ${escapeHtml(t.description)}
                    ${isOverdue ? ' <span style="color: var(--expense-color); font-size: 0.75rem;">⚠️ Atrasada</span>' : ''}
                </td>
                <td><span class="category-tag">${escapeHtml(t.category)}</span></td>
                <td>${escapeHtml(t.account || '-')}</td>
                <td class="amount ${t.type}">
                    ${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount)}
                </td>
                <td>
                    <div class="action-buttons">
                        ${isInstallment ? `
                            <button class="btn btn-success" data-action="pay-installment" 
                                    data-financing-id="${t.installmentData.financingId}"
                                    data-installment-number="${t.installmentData.number}" 
                                    title="Marcar como paga">
                                ✓
                            </button>
                            <button class="btn btn-info" data-action="view-financing" 
                                    data-financing-id="${t.installmentData.financingId}" 
                                    title="Ver financiamento">
                                👁️
                            </button>
                        ` : `
                            <button class="btn btn-edit" data-action="edit" data-id="${t.id}" title="Editar">
                                ✏️
                            </button>
                            <button class="btn btn-danger" data-action="delete" data-id="${t.id}" title="Excluir">
                                🗑️
                            </button>
                        `}
                    </div>
                </td>
            </tr>
        `}).join('');

        this.tableBody.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                const id = e.currentTarget.dataset.id;
                const financingId = e.currentTarget.dataset.financingId;
                const installmentNumber = e.currentTarget.dataset.installmentNumber;

                if (action === 'edit') {
                    this.inspector.openEditTransaction(id);
                } else if (action === 'delete') {
                    this.handleDelete(id);
                } else if (action === 'pay-installment') {
                    this.handlePayInstallment(financingId, parseInt(installmentNumber));
                } else if (action === 'view-financing') {
                    this.handleViewFinancing(financingId);
                }
            });
        });
    }

    renderSidebar() {
        const totals = this.fm.getTotals();

        if (this.sidebarIncome) this.sidebarIncome.textContent = formatCurrency(totals.income);
        if (this.sidebarExpense) this.sidebarExpense.textContent = formatCurrency(totals.expense);
        if (this.sidebarBalance) {
            this.sidebarBalance.textContent = formatCurrency(totals.balance);
            this.sidebarBalance.style.color = totals.balance < 0 ? 'var(--expense-color)' : 'var(--income-color)';
        }
    }

    renderUpcomingInstallments() {
        if (!this.upcomingList) return;

        if (typeof financingUI === 'undefined' || !financingUI || !financingUI.fm) {
            this.upcomingList.innerHTML = `<p class="text-muted">Nenhum financiamento cadastrado</p>`;
            return;
        }

        const upcomingInstallments = financingUI.fm.getUpcomingInstallments(5);

        if (upcomingInstallments.length === 0) {
            this.upcomingList.innerHTML = `<p class="text-muted">Nenhuma parcela pendente</p>`;
            return;
        }

        this.upcomingList.innerHTML = upcomingInstallments.map(installment => {
            const isOverdue = installment.status === 'overdue';
            const statusIcon = isOverdue ? '🔴' : '🟡';

            return `
                <div style="padding: 0.75rem; background: var(--bg-primary); border-radius: 8px; margin-bottom: 0.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.85rem;">${statusIcon} ${installment.financingName}</span>
                        <span style="font-weight: 600; color: var(--expense-color);">${formatCurrency(installment.payment)}</span>
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
                        Parcela ${installment.number} • ${formatDate(installment.dueDate)}
                        ${isOverdue ? ' <span style="color: var(--expense-color);">(Atrasada)</span>' : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    handleDelete(id) {
        if (!confirm('Tem certeza que deseja excluir esta transação?')) return;

        if (this.fm.deleteTransaction(id)) {
            eventBus.emit(Events.TRANSACTION_DELETED, { id });
            showToast('Transação excluída', 'success');
        }
    }

    handlePayInstallment(financingId, installmentNumber) {
        if (!confirm(`Marcar parcela ${installmentNumber} como paga?`)) return;

        if (typeof financingUI !== 'undefined' && financingUI?.fm) {
            const success = financingUI.fm.markInstallmentPaid(financingId, installmentNumber);
            if (success) {
                showToast('Parcela marcada como paga!', 'success');
                this.render();
                eventBus.emit(Events.RENDER_REQUESTED);
            }
        }
    }

    handleViewFinancing(financingId) {
        const navItem = document.querySelector('.nav-item[data-view="financing"]');
        if (navItem) {
            navItem.click();
            setTimeout(() => {
                if (typeof financingUI !== 'undefined' && financingUI?.showAmortizationTable) {
                    financingUI.showAmortizationTable(financingId);
                }
            }, 300);
        }
    }
}
