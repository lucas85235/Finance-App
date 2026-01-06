/**
 * ReportsView - Reports view component
 * Handles period reports with statistics and PDF generation
 */

import { BaseView } from './BaseView.js';
import { Events, eventBus } from '../services/EventBus.js';
import { formatCurrency } from '../utils/helpers.js';
import { generatePDF } from '../utils/pdf-generator.js';
import { showToast } from '../utils/toast.js';

export class ReportsView extends BaseView {
    constructor(financeManager) {
        super('reports', financeManager);
    }

    cacheElements() {
        // Will be populated after we add content to the HTML
    }

    bindEvents() {
        this.subscribe(Events.PERIOD_CHANGED, () => this.render());
        this.subscribe(Events.TRANSACTION_ADDED, () => this.render());
        this.subscribe(Events.TRANSACTION_UPDATED, () => this.render());
        this.subscribe(Events.TRANSACTION_DELETED, () => this.render());
        this.subscribe(Events.DATA_IMPORTED, () => this.render());
    }

    render() {
        if (!this.isActive || !this.element) return;

        const totals = this.fm.getTotals();
        const topExpenses = this.fm.getTopExpenses();
        const monthlyData = this.fm.getMonthlyData();

        const avgIncome = monthlyData.incomes.length > 0
            ? monthlyData.incomes.reduce((a, b) => a + b, 0) / monthlyData.incomes.length
            : 0;
        const avgExpense = monthlyData.expenses.length > 0
            ? monthlyData.expenses.reduce((a, b) => a + b, 0) / monthlyData.expenses.length
            : 0;

        this.element.innerHTML = `
            <div class="reports-container" style="display: flex; flex-direction: column; gap: 2rem;">
                
                <!-- Summary Stats -->
                <section class="chart-section">
                    <h2 class="section-title">📊 Resumo do Período</h2>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-top: 1rem;">
                        <div class="stat-card" style="background: var(--bg-glass); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.5rem;">
                            <div style="color: var(--text-muted); font-size: 0.9rem;">Total Receitas</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: var(--income-color);">${formatCurrency(totals.income)}</div>
                        </div>
                        <div class="stat-card" style="background: var(--bg-glass); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.5rem;">
                            <div style="color: var(--text-muted); font-size: 0.9rem;">Total Despesas</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: var(--expense-color);">${formatCurrency(totals.expense)}</div>
                        </div>
                        <div class="stat-card" style="background: var(--bg-glass); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.5rem;">
                            <div style="color: var(--text-muted); font-size: 0.9rem;">Saldo</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: ${totals.balance >= 0 ? 'var(--income-color)' : 'var(--expense-color)'};">${formatCurrency(totals.balance)}</div>
                        </div>
                        <div class="stat-card" style="background: var(--bg-glass); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.5rem;">
                            <div style="color: var(--text-muted); font-size: 0.9rem;">Taxa de Poupança</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: var(--accent-primary);">
                                ${totals.income > 0 ? ((totals.balance / totals.income) * 100).toFixed(1) : 0}%
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Monthly Averages -->
                <section class="chart-section">
                    <h2 class="section-title">📈 Médias Mensais</h2>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-top: 1rem;">
                        <div class="stat-card" style="background: var(--bg-glass); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.5rem;">
                            <div style="color: var(--text-muted); font-size: 0.9rem;">Receita Média/Mês</div>
                            <div style="font-size: 1.25rem; font-weight: 600; color: var(--income-color);">${formatCurrency(avgIncome)}</div>
                        </div>
                        <div class="stat-card" style="background: var(--bg-glass); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.5rem;">
                            <div style="color: var(--text-muted); font-size: 0.9rem;">Despesa Média/Mês</div>
                            <div style="font-size: 1.25rem; font-weight: 600; color: var(--expense-color);">${formatCurrency(avgExpense)}</div>
                        </div>
                        <div class="stat-card" style="background: var(--bg-glass); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.5rem;">
                            <div style="color: var(--text-muted); font-size: 0.9rem;">Meses Analisados</div>
                            <div style="font-size: 1.25rem; font-weight: 600; color: var(--text-primary);">${monthlyData.labels.length}</div>
                        </div>
                    </div>
                </section>

                <!-- Top Categories -->
                <section class="chart-section">
                    <h2 class="section-title">🏆 Top Categorias de Despesas</h2>
                    <div style="margin-top: 1rem;">
                        ${topExpenses.length === 0 ? `
                            <p class="text-muted">Nenhuma despesa registrada no período.</p>
                        ` : topExpenses.map((cat, index) => `
                            <div style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
                                <span style="font-size: 1.25rem; font-weight: 700; color: var(--text-muted); width: 30px;">#${index + 1}</span>
                                <div style="flex: 1;">
                                    <div style="font-weight: 500;">${cat.category}</div>
                                    <div style="width: 100%; background: var(--bg-secondary); border-radius: 4px; height: 6px; margin-top: 0.25rem;">
                                        <div style="width: ${cat.percentage}%; background: var(--expense-color); border-radius: 4px; height: 100%;"></div>
                                    </div>
                                </div>
                                <span style="font-weight: 600; color: var(--expense-color);">${formatCurrency(cat.amount)}</span>
                            </div>
                        `).join('')}
                    </div>
                </section>

                <!-- Export Actions -->
                <section class="chart-section">
                    <h2 class="section-title">📄 Exportar Relatório</h2>
                    <div style="margin-top: 1rem;">
                        <button class="btn btn-primary" id="reports-pdf-btn">
                            📄 Gerar PDF
                        </button>
                    </div>
                </section>

            </div>
        `;

        // Bind PDF button
        const pdfBtn = this.element.querySelector('#reports-pdf-btn');
        pdfBtn?.addEventListener('click', () => {
            generatePDF(this.fm);
            showToast('Relatório PDF gerado!', 'success');
        });
    }
}
