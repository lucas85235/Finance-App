/**
 * EventBus - Simple pub/sub system for component communication
 */
class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
        return () => this.off(event, callback);
    }

    off(event, callback) {
        if (!this.listeners.has(event)) return;
        const listeners = this.listeners.get(event);
        const index = listeners.indexOf(callback);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }

    emit(event, data) {
        if (!this.listeners.has(event)) return;
        this.listeners.get(event).forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`EventBus error in "${event}":`, error);
            }
        });
    }

    clear() {
        this.listeners.clear();
    }
}

export const eventBus = new EventBus();

export const Events = {
    TRANSACTION_ADDED: 'transaction:added',
    TRANSACTION_UPDATED: 'transaction:updated',
    TRANSACTION_DELETED: 'transaction:deleted',
    CATEGORY_CHANGED: 'category:changed',
    PERIOD_CHANGED: 'period:changed',
    FILTER_CHANGED: 'filter:changed',
    PRIVACY_TOGGLED: 'privacy:toggled',
    VIEW_CHANGED: 'view:changed',
    DATA_IMPORTED: 'data:imported',
    DATA_RESET: 'data:reset',
    RENDER_REQUESTED: 'render:requested'
};
