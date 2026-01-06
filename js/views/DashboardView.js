/**
 * DashboardView - Dashboard view component
 * Handles summary cards, charts, and top expenses
 */

import { BaseView } from './BaseView.js';
import { Events, eventBus } from '../services/EventBus.js';
import { formatCurrency, formatDate, generateColors } from '../utils/helpers.js';

export class DashboardView extends BaseView {
    constructor(financeManager) {
        super('dashboard', financeManager);
        this.chart = null;
        this.monthlyChart = null;
    }

    cacheElements() {
        this.totalIncome = document.getElementById('total-income');
        this.totalExpense = document.getElementById('total-expense');
        this.totalBalance = document.getElementById('total-balance');
        this.chartCanvas = document.getElementById('category-chart');
        this.chartEmpty = document.getElementById('chart-empty');
        this.monthlyChartCanvas = document.getElementById('monthly-chart');
        this.monthlyChartEmpty = document.getElementById('monthly-chart-empty');
        this.topExpensesList = document.getElementById('top-expenses-list');
        this.upcomingList = document.getElementById('upcoming-installments-list');
    }

    bindEvents() {
        this.subscribe(Events.TRANSACTION_ADDED, () => this.render());
        this.subscribe(Events.TRANSACTION_UPDATED, () => this.render());
        this.subscribe(Events.TRANSACTION_DELETED, () => this.render());
        this.subscribe(Events.PERIOD_CHANGED, () => this.render());
        this.subscribe(Events.DATA_IMPORTED, () => this.render());
        this.subscribe(Events.RENDER_REQUESTED, () => this.render());
    }

    render() {
        if (!this.isActive) return;
        this.renderSummary();
        this.renderChart();
        this.renderMonthlyChart();
        this.renderTopExpenses();
        this.renderUpcomingInstallments();
    }

    renderSummary() {
        const totals = this.fm.getTotals();

        this.totalIncome.textContent = formatCurrency(totals.income);
        this.totalExpense.textContent = formatCurrency(totals.expense);
        this.totalBalance.textContent = formatCurrency(totals.balance);

        const balanceCard = document.querySelector('.summary-card.balance .card-value');
        if (balanceCard) {
            balanceCard.style.color = totals.balance < 0 ? 'var(--expense-color)' : 'var(--balance-color)';
        }
    }

    renderChart() {
        const expenses = this.fm.getExpensesByCategory();
        const categories = Object.keys(expenses);

        if (categories.length === 0) {
            if (this.chart) {
                this.chart.destroy();
                this.chart = null;
            }
            this.chartCanvas.style.display = 'none';
            this.chartEmpty.classList.remove('hidden');
            return;
        }

        this.chartCanvas.style.display = 'block';
        this.chartEmpty.classList.add('hidden');

        const entries = Object.entries(expenses).sort((a, b) => b[1] - a[1]);

        let finalLabels = [];
        let finalData = [];

        if (entries.length > 5) {
            const top5 = entries.slice(0, 5);
            const others = entries.slice(5).reduce((sum, entry) => sum + entry[1], 0);
            finalLabels = top5.map(e => e[0]);
            finalData = top5.map(e => e[1]);
            finalLabels.push('Outros');
            finalData.push(others);
        } else {
            finalLabels = entries.map(e => e[0]);
            finalData = entries.map(e => e[1]);
        }

        const data = {
            labels: finalLabels,
            datasets: [{
                data: finalData,
                backgroundColor: generateColors(finalLabels.length),
                borderColor: 'rgba(15, 15, 26, 0.8)',
                borderWidth: 2
            }]
        };

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#a0a0b0',
                        padding: 15,
                        font: { family: 'Inter', size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${formatCurrency(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        };

        if (this.chart) {
            this.chart.data = data;
            this.chart.update();
        } else {
            this.chart = new Chart(this.chartCanvas, {
                type: 'doughnut',
                data,
                options
            });
        }
    }

    renderMonthlyChart() {
        const data = this.fm.getMonthlyData();

        if (data.labels.length === 0) {
            if (this.monthlyChart) {
                this.monthlyChart.destroy();
                this.monthlyChart = null;
            }
            this.monthlyChartCanvas.style.display = 'none';
            this.monthlyChartEmpty.classList.remove('hidden');
            return;
        }

        this.monthlyChartCanvas.style.display = 'block';
        this.monthlyChartEmpty.classList.add('hidden');

        const chartData = {
            labels: data.labels,
            datasets: [
                {
                    label: 'Receitas',
                    data: data.incomes,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Despesas',
                    data: data.expenses,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        };

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#a0a0b0', usePointStyle: true, boxWidth: 8 }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw)}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#6a6a7a',
                        callback: (value) => value >= 1000 ? 'R$ ' + (value / 1000).toFixed(1) + 'k' : value
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#6a6a7a' }
                }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false }
        };

        if (this.monthlyChart) {
            this.monthlyChart.data = chartData;
            this.monthlyChart.update();
        } else {
            this.monthlyChart = new Chart(this.monthlyChartCanvas, {
                type: 'line',
                data: chartData,
                options
            });
        }
    }

    renderTopExpenses() {
        const topExpenses = this.fm.getTopExpenses();

        if (topExpenses.length === 0) {
            this.topExpensesList.innerHTML = `
                <div class="empty-state">
                    <p>Adicione despesas para ver o ranking</p>
                </div>
            `;
            return;
        }

        this.topExpensesList.innerHTML = topExpenses.map(item => `
            <div class="expense-item">
                <div class="expense-header">
                    <div class="expense-category">
                        <span>${this.getCategoryIcon(item.category)}</span>
                        <span>${item.category}</span>
                    </div>
                    <span class="expense-amount">
                        ${formatCurrency(item.amount)}
                    </span>
                </div>
                <div class="expense-bar-bg">
                    <div class="expense-bar-fill" style="width: ${item.percentage}%"></div>
                </div>
            </div>
        `).join('');
    }

    renderUpcomingInstallments() {
        if (!this.upcomingList) return;

        if (typeof financingUI === 'undefined' || !financingUI || !financingUI.fm) {
            this.upcomingList.innerHTML = `
                <div class="empty-state">
                    <p class="text-muted">Nenhum financiamento cadastrado</p>
                </div>
            `;
            return;
        }

        const upcomingInstallments = financingUI.fm.getUpcomingInstallments(5);

        if (upcomingInstallments.length === 0) {
            this.upcomingList.innerHTML = `
                <div class="empty-state">
                    <p class="text-muted">Nenhuma parcela pendente</p>
                </div>
            `;
            return;
        }

        this.upcomingList.innerHTML = upcomingInstallments.map(installment => {
            const isOverdue = installment.status === 'overdue';
            const statusClass = isOverdue ? 'overdue' : 'pending';
            const statusIcon = isOverdue ? '🔴' : '🟡';

            return `
                <div class="expense-item ${statusClass}">
                    <div class="expense-header">
                        <div class="expense-category">
                            <span>${statusIcon}</span>
                            <span>${installment.financingName}</span>
                            <small style="color: var(--text-muted); margin-left: 0.5rem;">
                                Parcela ${installment.number}
                            </small>
                        </div>
                        <span class="expense-amount">
                            ${formatCurrency(installment.payment)}
                        </span>
                    </div>
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">
                        📅 Vence em: ${formatDate(installment.dueDate)}
                        ${isOverdue ? '<span style="color: var(--expense-color);"> (Atrasada)</span>' : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    getCategoryIcon(categoryName) {
        const category = this.fm.categories.find(c => c.name === categoryName);
        return category ? category.icon : '📦';
    }

    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        if (this.monthlyChart) {
            this.monthlyChart.destroy();
            this.monthlyChart = null;
        }
        super.destroy();
    }
}
