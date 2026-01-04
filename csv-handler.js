/**
 * CSV Handler Module
 * Handles import and export of transaction data in CSV format
 * Supports multiple CSV formats including MockData.csv format
 */

const CSVHandler = {
    /**
     * Export transactions to CSV file
     * @param {Array} transactions - Array of transaction objects
     */
    exportToCSV(transactions) {
        if (!transactions || transactions.length === 0) {
            showToast('Não há transações para exportar', 'error');
            return;
        }

        // CSV Header
        const headers = ['ID', 'Tipo', 'Valor', 'Descrição', 'Categoria', 'Data'];

        // Convert transactions to CSV rows
        const rows = transactions.map(t => {
            return [
                t.id,
                t.type === 'income' ? 'Receita' : 'Despesa',
                t.amount.toFixed(2).replace('.', ','),
                `"${t.description.replace(/"/g, '""')}"`, // Escape quotes
                t.category,
                t.date
            ].join(';');
        });

        // Combine headers and rows
        const csvContent = [headers.join(';'), ...rows].join('\n');

        // Add BOM for Excel compatibility with UTF-8
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

        // Create download link
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const date = new Date().toISOString().split('T')[0];

        link.setAttribute('href', url);
        link.setAttribute('download', `financas_${date}.csv`);
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showToast(`${transactions.length} transações exportadas com sucesso!`, 'success');
    },

    /**
     * Import transactions from CSV file
     * @param {File} file - CSV file to import
     * @returns {Promise<Array>} - Array of parsed transactions
     */
    importFromCSV(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (event) => {
                try {
                    const content = event.target.result;
                    const lines = content.split(/\r?\n/).filter(line => line.trim());

                    if (lines.length < 2) {
                        reject(new Error('Arquivo CSV vazio ou inválido'));
                        return;
                    }

                    // Detect CSV format from header
                    const header = lines[0].toLowerCase();
                    const isMockDataFormat = header.includes('date') && header.includes('account');

                    // Skip header row
                    const transactions = [];

                    for (let i = 1; i < lines.length; i++) {
                        const line = lines[i];
                        let parsed;

                        if (isMockDataFormat) {
                            parsed = this.parseMockDataLine(line);
                        } else {
                            parsed = this.parseCSVLine(line);
                        }

                        if (parsed) {
                            transactions.push(parsed);
                        }
                    }

                    if (transactions.length === 0) {
                        reject(new Error('Nenhuma transação válida encontrada no arquivo'));
                        return;
                    }

                    resolve(transactions);
                } catch (error) {
                    reject(new Error('Erro ao processar arquivo CSV: ' + error.message));
                }
            };

            reader.onerror = () => {
                reject(new Error('Erro ao ler o arquivo'));
            };

            reader.readAsText(file, 'UTF-8');
        });
    },

    /**
     * Parse a MockData.csv format line
     * Format: "Date";"Description";"Value";"Account";"Category";"Subcategory";"Tags"
     * Date format: DD/MM/YYYY
     * Value: negative = expense, positive = income
     * @param {string} line - CSV line to parse
     * @returns {Object|null} - Transaction object or null if invalid
     */
    parseMockDataLine(line) {
        const parts = this.splitCSVLine(line);

        if (parts.length < 5) {
            return null;
        }

        const [dateStr, description, valueStr, account, category] = parts;

        // Parse value (negative = expense, positive = income)
        const value = parseFloat(valueStr.replace(',', '.').replace(/[^\d.-]/g, ''));

        if (isNaN(value) || value === 0) {
            return null;
        }

        // Determine type based on value sign
        const type = value < 0 ? 'expense' : 'income';
        const amount = Math.abs(value);

        // Parse date from DD/MM/YYYY to YYYY-MM-DD
        const dateParts = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (!dateParts) {
            return null;
        }
        const date = `${dateParts[3]}-${dateParts[2]}-${dateParts[1]}`;

        // Map category to our categories
        const mappedCategory = this.mapCategory(category, type);

        return {
            id: this.generateId(),
            type,
            amount,
            description: description || category || 'Sem descrição',
            category: mappedCategory,
            date
        };
    },

    /**
     * Map external categories to internal categories
     * @param {string} externalCategory - Category from imported CSV
     * @param {string} type - Transaction type (income/expense)
     * @returns {string} - Mapped category
     */
    mapCategory(externalCategory, type) {
        const categoryMap = {
            // Expenses
            'comida': 'Alimentação',
            'alimentação': 'Alimentação',
            'supermercado': 'Compras',
            'mercado': 'Compras',
            'transporte': 'Transporte',
            'gasolina': 'Transporte',
            'uber': 'Transporte',
            'casa': 'Moradia',
            'moradia': 'Moradia',
            'aluguel': 'Moradia',
            'saúde': 'Saúde',
            'saude': 'Saúde',
            'farmácia': 'Saúde',
            'farmacia': 'Saúde',
            'educação': 'Educação',
            'educacao': 'Educação',
            'lazer': 'Lazer',
            'entretenimento': 'Lazer',
            'compras': 'Compras',
            'contas': 'Contas',
            'pet': 'Outros Despesa',
            'outros': type === 'income' ? 'Outros Receita' : 'Outros Despesa',
            // Income
            'salário': 'Salário',
            'salario': 'Salário',
            'freelance': 'Freelance',
            'investimentos': 'Investimentos',
            'investimento': 'Investimentos'
        };

        const lowerCategory = (externalCategory || '').toLowerCase().trim();
        return categoryMap[lowerCategory] || (type === 'income' ? 'Outros Receita' : 'Outros Despesa');
    },

    /**
     * Parse a standard CSV line (our export format)
     * Format: ID;Tipo;Valor;Descrição;Categoria;Data
     * @param {string} line - CSV line to parse
     * @returns {Object|null} - Transaction object or null if invalid
     */
    parseCSVLine(line) {
        const parts = this.splitCSVLine(line);

        if (parts.length < 6) {
            return null;
        }

        const [id, typeStr, amountStr, description, category, date] = parts;

        // Parse type
        const type = typeStr.toLowerCase().includes('receita') ? 'income' : 'expense';

        // Parse amount (handle Brazilian format with comma)
        const amount = parseFloat(amountStr.replace(',', '.').replace(/[^\d.-]/g, ''));

        if (isNaN(amount) || amount <= 0) {
            return null;
        }

        // Validate date (YYYY-MM-DD format)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return null;
        }

        return {
            id: id || this.generateId(),
            type,
            amount,
            description: description.replace(/^"|"$/g, '').replace(/""/g, '"'),
            category: category || 'Outros',
            date
        };
    },

    /**
     * Split a CSV line handling quoted values
     * @param {string} line - CSV line
     * @returns {Array} - Array of values
     */
    splitCSVLine(line) {
        const parts = [];
        let current = '';
        let inQuotes = false;

        for (let char of line) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ';' && !inQuotes) {
                parts.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        parts.push(current.trim().replace(/^"|"$/g, ''));

        return parts;
    },

    /**
     * Generate a unique ID
     * @returns {string} - UUID-like string
     */
    generateId() {
        return 'xxxx-xxxx-xxxx'.replace(/x/g, () => {
            return Math.floor(Math.random() * 16).toString(16);
        });
    }
};

