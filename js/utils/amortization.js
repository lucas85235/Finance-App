/**
 * Amortization Calculator
 * Supports PRICE (fixed payments) and SAC (constant amortization) systems
 */

/**
 * Calculate PRICE system (French amortization - fixed payments)
 * PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
 * 
 * @param {number} principal - Loan principal amount
 * @param {number} annualRate - Annual interest rate (percentage, e.g., 12 for 12%)
 * @param {number} termMonths - Loan term in months
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @returns {Array} Array of installment objects
 */
export function calculatePRICE(principal, annualRate, termMonths, startDate) {
    const monthlyRate = (annualRate / 100) / 12;
    const installments = [];

    // Calculate fixed payment (PMT)
    let pmt;
    if (monthlyRate === 0) {
        pmt = principal / termMonths;
    } else {
        const factor = Math.pow(1 + monthlyRate, termMonths);
        pmt = principal * (monthlyRate * factor) / (factor - 1);
    }

    let balance = principal;
    const start = new Date(startDate + 'T00:00:00');

    for (let i = 1; i <= termMonths; i++) {
        const interest = balance * monthlyRate;
        const amortization = pmt - interest;
        balance = Math.max(0, balance - amortization);

        // Calculate due date
        const dueDate = new Date(start);
        dueDate.setMonth(dueDate.getMonth() + i);

        installments.push({
            number: i,
            dueDate: dueDate.toISOString().split('T')[0],
            principal: round(amortization),
            interest: round(interest),
            payment: round(pmt),
            balance: round(balance),
            status: 'pending',
            paidDate: null,
            linkedTransactionId: null
        });
    }

    return installments;
}

/**
 * Calculate SAC system (Constant Amortization System)
 * Amortization = P / n (constant)
 * Interest = Balance * r (decreasing)
 * 
 * @param {number} principal - Loan principal amount
 * @param {number} annualRate - Annual interest rate (percentage)
 * @param {number} termMonths - Loan term in months
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @returns {Array} Array of installment objects
 */
export function calculateSAC(principal, annualRate, termMonths, startDate) {
    const monthlyRate = (annualRate / 100) / 12;
    const installments = [];

    const constantAmortization = principal / termMonths;
    let balance = principal;
    const start = new Date(startDate + 'T00:00:00');

    for (let i = 1; i <= termMonths; i++) {
        const interest = balance * monthlyRate;
        const payment = constantAmortization + interest;
        balance = Math.max(0, balance - constantAmortization);

        // Calculate due date
        const dueDate = new Date(start);
        dueDate.setMonth(dueDate.getMonth() + i);

        installments.push({
            number: i,
            dueDate: dueDate.toISOString().split('T')[0],
            principal: round(constantAmortization),
            interest: round(interest),
            payment: round(payment),
            balance: round(balance),
            status: 'pending',
            paidDate: null,
            linkedTransactionId: null
        });
    }

    return installments;
}

/**
 * Generate amortization table based on system type
 * @param {string} system - 'PRICE' or 'SAC'
 * @param {number} principal - Loan principal
 * @param {number} annualRate - Annual interest rate
 * @param {number} termMonths - Term in months
 * @param {string} startDate - Start date
 * @returns {Array} Installments array
 */
export function generateAmortizationTable(system, principal, annualRate, termMonths, startDate) {
    if (system === 'PRICE') {
        return calculatePRICE(principal, annualRate, termMonths, startDate);
    } else if (system === 'SAC') {
        return calculateSAC(principal, annualRate, termMonths, startDate);
    }
    throw new Error(`Sistema de amortização desconhecido: ${system}`);
}

/**
 * Calculate summary statistics for a financing
 * @param {Array} installments - Array of installments
 * @param {number} principal - Original principal
 * @returns {Object} Summary stats
 */
export function calculateFinancingSummary(installments, principal) {
    const totalPayment = installments.reduce((sum, i) => sum + i.payment, 0);
    const totalInterest = installments.reduce((sum, i) => sum + i.interest, 0);
    const paidInstallments = installments.filter(i => i.status === 'paid');
    const pendingInstallments = installments.filter(i => i.status === 'pending');
    const overdueInstallments = installments.filter(i => i.status === 'overdue');

    const paidAmount = paidInstallments.reduce((sum, i) => sum + i.payment, 0);
    const remainingBalance = pendingInstallments.length > 0
        ? pendingInstallments[0].balance + pendingInstallments[0].principal
        : 0;

    return {
        principal: round(principal),
        totalPayment: round(totalPayment),
        totalInterest: round(totalInterest),
        paidCount: paidInstallments.length,
        pendingCount: pendingInstallments.length,
        overdueCount: overdueInstallments.length,
        paidAmount: round(paidAmount),
        remainingBalance: round(remainingBalance),
        progressPercent: round((paidInstallments.length / installments.length) * 100)
    };
}

/**
 * Update installment statuses based on current date
 * @param {Array} installments - Array of installments
 * @returns {Array} Updated installments
 */
export function updateInstallmentStatuses(installments) {
    const today = new Date().toISOString().split('T')[0];

    return installments.map(installment => {
        if (installment.status === 'paid') {
            return installment;
        }

        if (installment.dueDate < today) {
            return { ...installment, status: 'overdue' };
        }

        return { ...installment, status: 'pending' };
    });
}

/**
 * Get next pending installments
 * @param {Array} installments - Array of installments
 * @param {number} count - Number of installments to return
 * @returns {Array} Next pending installments
 */
export function getNextInstallments(installments, count = 3) {
    return installments
        .filter(i => i.status !== 'paid')
        .slice(0, count);
}

/**
 * Simulate extra amortization
 * @param {Object} currentFinancing - Current financing object
 * @param {number} extraAmount - Amount to amortize
 * @param {string} strategy - 'reduce_term' or 'reduce_payment'
 * @returns {Object} Simulation results
 */
export function simulateExtraAmortization(currentFinancing, extraAmount, strategy) {
    const { principal, annualRate, system, installments } = currentFinancing;
    /* 
    Calculate remaining balance from pending installments.
    Actually, we should look at the balance of the last PAID installment, 
    or the principal if none paid, minus the extra amount.
    
    Better approach:
    1. Find current balance (balance after last paid installment)
    2. Subtract extraAmount from that balance
    3. use remaining term (count of pending installments)
    4. Recalculate based on strategy
    */

    const paidInstallments = installments.filter(i => i.status === 'paid');
    const pendingInstallments = installments.filter(i => i.status !== 'paid');

    // If no pending installments, nothing to simulate
    if (pendingInstallments.length === 0) return null;

    let currentBalance;
    if (paidInstallments.length > 0) {
        currentBalance = paidInstallments[paidInstallments.length - 1].balance;
    } else {
        currentBalance = principal;
    }

    const newBalance = Math.max(0, currentBalance - extraAmount);
    const monthlyRate = (annualRate / 100) / 12;

    // Remaining term based on pending count
    // But for simulation, we assume today is the day.

    let newInstallments = [];
    let newTerm = pendingInstallments.length;
    let oldTerm = pendingInstallments.length;

    const startDate = new Date().toISOString().split('T')[0]; // Simulation starts 'now'

    if (newBalance <= 0) {
        return {
            newInstallments: [],
            savings: {
                interest: pendingInstallments.reduce((sum, i) => sum + i.interest, 0),
                months: pendingInstallments.length
            },
            newTerm: 0
        };
    }

    if (strategy === 'reduce_payment') {
        // Keep term, reduce payment
        if (system === 'PRICE') {
            newInstallments = calculatePRICE(newBalance, annualRate, oldTerm, startDate);
        } else {
            newInstallments = calculateSAC(newBalance, annualRate, oldTerm, startDate);
        }
    } else {
        // reduce_term (Default)
        // For SAC, it's just reducing N = P / Amortization
        // For PRICE, we need to solve for N given PMT

        let startPayment = pendingInstallments[0].payment;
        // In PRICE, PMT is fixed. In SAC, it varies, so we typically keep the First Payment of the remaining series as reference?
        // Actually for SAC, "reducing term" usually means keeping the Amortization constant? No.
        // Usually means keeping the Payment amount similar to what it was?

        // Standard approach for 'reduce_term':
        // PRICE: Keep PMT constant, calculate new N.
        // SAC: Recalculate new total term? 
        // SAC 'reduce term' is tricky because payments decrease. 
        // Common interpretation: Maintain the same INITIAL payment of the new series?
        // Simplest interpretation for MVP:
        // PRICE: Keep PMT, find N.
        // SAC: Keep 'Amortization' constant? No that would result in same term.
        // SAC Reduce Term: We want to match the previous initial payment?

        // Let's implement PRICE reduce term clearly first.
        if (system === 'PRICE') {
            // PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
            // We know PMT, P (newBalance), r. Find n.
            // Formula: n = - ln(1 - (P*r/PMT)) / ln(1+r)

            const pmt = startPayment; // Keep paying the same amount
            if (newBalance * monthlyRate >= pmt) {
                // Impossible to pay off if interest >= payment
                // Fallback to reduce payment
                newInstallments = calculatePRICE(newBalance, annualRate, oldTerm, startDate);
            } else {
                const n = -Math.log(1 - (newBalance * monthlyRate / pmt)) / Math.log(1 + monthlyRate);
                newTerm = Math.ceil(n);
                newInstallments = calculatePRICE(newBalance, annualRate, newTerm, startDate);
            }
        } else {
            // SAC Reduce Term
            // Keep the constant amortization amount? 
            // Previous Amortization = Principal / Term
            // New Amortization = Previous Amortization
            // New Term = New Balance / New Amortization
            const oldAmortization = pendingInstallments[0].principal;
            newTerm = Math.ceil(newBalance / oldAmortization);
            newInstallments = calculateSAC(newBalance, annualRate, newTerm, startDate);
        }
    }

    const originalInterest = pendingInstallments.reduce((sum, i) => sum + i.interest, 0);
    const newInterest = newInstallments.reduce((sum, i) => sum + i.interest, 0);

    return {
        newInstallments,
        savings: {
            interest: round(originalInterest - newInterest),
            months: oldTerm - newInstallments.length
        },
        newTerm: newInstallments.length,
        strategy
    };
}


/**
 * Round to 2 decimal places
 */
function round(value) {
    return Math.round(value * 100) / 100;
}
