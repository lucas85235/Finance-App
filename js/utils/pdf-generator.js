/**
 * PDF Generator Module
 * Generates financial reports using jsPDF
 */

import { formatCurrency, formatDate } from './helpers.js';
import { showToast } from './toast.js';

/**
 * Generate PDF Report
 * @param {Object} fm - FinanceManager instance
 */
export function generatePDF(fm) {
    const { jsPDF } = window.jspdf;
    const transactions = fm.getFilteredTransactions();
    const totals = fm.getTotals();
    const period = fm.currentPeriod === 'all' ? 'Todos os Períodos' : fm.currentPeriod;

    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text("Relatório Financeiro", 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 28);
    doc.text(`Período: ${period}`, 14, 33);

    // Summary Cards
    let yPos = 45;
    doc.setDrawColor(200);
    doc.setFillColor(245, 245, 250);
    doc.roundedRect(14, yPos, 60, 25, 3, 3, 'FD');
    doc.roundedRect(79, yPos, 60, 25, 3, 3, 'FD');
    doc.roundedRect(144, yPos, 60, 25, 3, 3, 'FD');

    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text("Receitas", 19, yPos + 8);
    doc.text("Despesas", 84, yPos + 8);
    doc.text("Saldo", 149, yPos + 8);

    doc.setFontSize(14);
    doc.setTextColor(46, 204, 113);
    doc.text(formatCurrency(totals.income), 19, yPos + 18);

    doc.setTextColor(231, 76, 60);
    doc.text(formatCurrency(totals.expense), 84, yPos + 18);

    doc.setTextColor(52, 152, 219);
    doc.text(formatCurrency(totals.balance), 149, yPos + 18);

    // Table
    doc.autoTable({
        startY: yPos + 35,
        head: [['Data', 'Descrição', 'Categoria', 'Conta', 'Tipo', 'Valor']],
        body: transactions.map(t => [
            formatDate(t.date),
            t.description,
            t.category,
            t.account || '-',
            t.type === 'income' ? 'Receita' : 'Despesa',
            formatCurrency(t.amount)
        ]),
        theme: 'grid',
        headStyles: { fillColor: [30, 30, 46], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 3 },
        alternateRowStyles: { fillColor: [245, 245, 250] }
    });

    // Save
    const filename = `relatorio_financeiro_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
    showToast('Relatório PDF gerado com sucesso! 📄');
}
