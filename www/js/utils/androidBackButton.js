/**
 * Android Back Button Handler
 * Properly handles Android back button navigation
 */

import { App } from '@capacitor/app';

export class AndroidBackButtonHandler {
    constructor() {
        this.history = [];
        this.maxHistory = 20;
        this.currentTab = 'pantry';
    }
    
    /**
     * Initialize back button handler
     */
    async init() {
        try {
            App.addListener('backButton', ({ canGoBack }) => {
                this.handleBackButton(canGoBack);
            });
            
            console.log('[AndroidBackButton] Initialized');
        } catch (error) {
            console.error('[AndroidBackButton] Initialization failed:', error);
        }
    }
    
    /**
     * Handle back button press
     * @param {boolean} canGoBack - Whether the web view can go back
     */
    handleBackButton(canGoBack) {
        // Check if there's an open modal
        const modal = document.querySelector('[role="dialog"]');
        if (modal && !modal.classList.contains('hidden')) {
            this.closeModal(modal);
            return;
        }
        
        // Check if there's an open dropdown
        const dropdown = document.querySelector('.dropdown.active');
        if (dropdown) {
            dropdown.classList.remove('active');
            return;
        }
        
        // Check if we can navigate back in history
        if (canGoBack && this.history.length > 1) {
            this.history.pop();
            const previousState = this.history[this.history.length - 1];
            this.restoreState(previousState);
            return;
        }
        
        // Default to tab navigation
        this.navigateBackInTabs();
    }
    
    /**
     * Close a modal
     * @param {HTMLElement} modal - Modal element
     */
    closeModal(modal) {
        modal.classList.add('hidden');
        // Dispatch close event if needed
        modal.dispatchEvent(new CustomEvent('modal-closed'));
    }
    
    /**
     * Navigate back in tabs
     */
    navigateBackInTabs() {
        const tabs = ['pantry', 'meals', 'plan', 'shop'];
        const currentIndex = tabs.indexOf(this.currentTab);
        
        if (currentIndex > 0) {
            // Go to previous tab
            const previousTab = tabs[currentIndex - 1];
            this.switchTab(previousTab);
        } else {
            // On first tab, ask to exit
            this.showExitConfirmation();
        }
    }
    
    /**
     * Switch to a specific tab
     * @param {string} tabName - Tab name
     */
    switchTab(tabName) {
        this.currentTab = tabName;
        this.pushHistory({ type: 'tab', tab: tabName });
        
        // Trigger tab change
        window.location.hash = tabName;
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('tab-change', { detail: { tab: tabName } }));
    }
    
    /**
     * Push state to history
     * @param {Object} state - State object
     */
    pushHistory(state) {
        this.history.push({ ...state, timestamp: Date.now() });
        
        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    }
    
    /**
     * Restore state from history
     * @param {Object} state - State to restore
     */
    restoreState(state) {
        switch (state.type) {
            case 'tab':
                this.switchTab(state.tab);
                break;
            case 'modal':
                // Reopen modal with saved data
                this.openModal(state.modalType, state.data);
                break;
            default:
                console.warn('[AndroidBackButton] Unknown state type:', state.type);
        }
    }
    
    /**
     * Open a modal and track it in history
     * @param {string} modalType - Modal type
     * @param {Object} data - Modal data
     */
    openModal(modalType, data = {}) {
        this.pushHistory({ type: 'modal', modalType, data });
        // Modal opening logic would be here
    }
    
    /**
     * Show exit confirmation dialog
     */
    showExitConfirmation() {
        const confirmed = confirm('Exit Main?');
        if (confirmed) {
            App.exitApp();
        }
    }
    
    /**
     * Set current tab
     * @param {string} tabName - Tab name
     */
    setCurrentTab(tabName) {
        this.currentTab = tabName;
    }
    
    /**
     * Clear history
     */
    clearHistory() {
        this.history = [];
    }
}

// Global back button handler instance
let globalBackButtonHandler = null;

/**
 * Get or create the global back button handler
 * @returns {AndroidBackButtonHandler}
 */
export function getBackButtonHandler() {
    if (!globalBackButtonHandler) {
        globalBackButtonHandler = new AndroidBackButtonHandler();
    }
    return globalBackButtonHandler;
}

/**
 * Initialize Android back button handling
 */
export async function initBackButtonHandler() {
    const handler = getBackButtonHandler();
    await handler.init();
}
