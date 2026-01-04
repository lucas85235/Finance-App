/**
 * Finance Dashboard - Main Entry Point
 * Initializes the application using ES6 modules
 */

import { FinanceManager } from './models/FinanceManager.js';
import { UIController } from './views/UIController.js';

// Initialize Application
let fm, ui;

document.addEventListener('DOMContentLoaded', () => {
    fm = new FinanceManager();
    ui = new UIController(fm);

    // Expose to window for inline onclick handlers
    window.ui = ui;
    window.fm = fm;
});
