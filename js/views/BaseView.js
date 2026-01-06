/**
 * BaseView - Base class for all view components
 * Provides lifecycle management and common utilities
 */

import { eventBus } from '../services/EventBus.js';

export class BaseView {
    constructor(viewId, financeManager) {
        this.viewId = viewId;
        this.fm = financeManager;
        this.element = document.getElementById(`view-${viewId}`);
        this.eventSubscriptions = [];
        this.isActive = false;
    }

    init() {
        this.cacheElements();
        this.bindEvents();
    }

    cacheElements() {
        // Override in subclasses to cache DOM elements
    }

    bindEvents() {
        // Override in subclasses to bind event listeners
    }

    activate() {
        this.isActive = true;
        this.render();
    }

    deactivate() {
        this.isActive = false;
    }

    render() {
        // Override in subclasses
    }

    subscribe(event, callback) {
        const unsubscribe = eventBus.on(event, callback);
        this.eventSubscriptions.push(unsubscribe);
        return unsubscribe;
    }

    destroy() {
        this.eventSubscriptions.forEach(unsub => unsub());
        this.eventSubscriptions = [];
    }

    $(selector) {
        return this.element?.querySelector(selector);
    }

    $$(selector) {
        return this.element?.querySelectorAll(selector) || [];
    }
}
