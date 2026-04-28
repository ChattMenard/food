// @ts-check
/**
 * Accessibility Manager
 * Handles ARIA labels, keyboard navigation, and accessibility compliance
 */

class AccessibilityManager {
  constructor() {
    /** @type {boolean} */
    this.keyboardNavigationEnabled = true;
    /** @type {Map<string, Element>} */
    this.focusTrapElements = new Map();
    /** @type {string[]} */
    this.announcements = [];
    /** @type {Element|null} */
    this.currentFocus = null;
    /** @type {Element[]} */
    this.skipLinks = [];
    
    this.setupAccessibility();
  }

  setupAccessibility() {
    // Setup keyboard navigation
    this.setupKeyboardNavigation();
    
    // Add ARIA labels to existing elements
    this.addARIALabels();
    
    // Setup focus management
    this.setupFocusManagement();
    
    // Add skip links
    this.addSkipLinks();
    
    // Setup screen reader announcements
    this.setupScreenReaderAnnouncements();
    
    // Setup accessibility testing
    this.setupAccessibilityTesting();
  }

  setupKeyboardNavigation() {
    // Add keyboard event listeners
    document.addEventListener('keydown', (/** @type {KeyboardEvent} */ event) => {
      this.handleKeyboardNavigation(event);
    });
    
    // Ensure all interactive elements are focusable
    this.ensureFocusableElements();
    
    // Add focus indicators
    this.addFocusIndicators();
  }

  handleKeyboardNavigation(event) {
    switch (event.key) {
      case 'Tab':
        // Handle tab navigation
        this.handleTabNavigation(event);
        break;
        
      case 'Escape':
        // Handle escape key for modals and dropdowns
        this.handleEscapeKey(event);
        break;
        
      case 'Enter':
      case ' ':
        // Handle activation for custom elements
        this.handleActivationKey(event);
        break;
        
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        // Handle arrow key navigation
        this.handleArrowNavigation(event);
        break;
    }
  }

  handleTabNavigation(event) {
    // Track current focus for focus management
    this.currentFocus = event.target;
    
    // Check if we're entering a focus trap
    const focusTrap = this.findFocusTrap(event.target);
    if (focusTrap) {
      this.manageFocusTrap(event, focusTrap);
    }
  }

  handleEscapeKey(event) {
    // Close modals, dropdowns, or escape focus traps
    const modal = document.querySelector('.modal[aria-hidden="false"]');
    if (modal) {
      this.closeModal(modal);
      event.preventDefault();
    }
    
    const dropdown = document.querySelector('.dropdown.show');
    if (dropdown) {
      this.closeDropdown(dropdown);
      event.preventDefault();
    }
    
    // Exit focus trap
    if (this.focusTrapElements.has(event.target)) {
      this.exitFocusTrap();
      event.preventDefault();
    }
  }

  handleActivationKey(event) {
    // Handle activation for custom interactive elements
    const target = event.target;
    
    if (target.tagName === 'DIV' && target.getAttribute('role') === 'button') {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        target.click();
      }
    }
    
    // Handle list item activation
    if (target.tagName === 'LI' && target.getAttribute('role') === 'option') {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        target.click();
      }
    }
  }

  handleArrowNavigation(event) {
    // Handle arrow key navigation for lists and menus
    const target = event.target;
    const role = target.getAttribute('role');
    
    if (role === 'listbox' || role === 'menu' || role === 'grid') {
      this.navigateList(event, target);
      event.preventDefault();
    }
  }

  navigateList(event, container) {
    const items = container.querySelectorAll('[role="option"], [role="menuitem"], [role="gridcell"]');
    const currentIndex = Array.from(items).indexOf(document.activeElement);
    let newIndex = currentIndex;
    
    switch (event.key) {
      case 'ArrowDown':
        newIndex = (currentIndex + 1) % items.length;
        break;
      case 'ArrowUp':
        newIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
        break;
      case 'ArrowRight':
        if (container.getAttribute('role') === 'grid') {
          newIndex = (currentIndex + 1) % items.length;
        }
        break;
      case 'ArrowLeft':
        if (container.getAttribute('role') === 'grid') {
          newIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
        }
        break;
    }
    
    if (newIndex !== currentIndex && items[newIndex]) {
      items[newIndex].focus();
    }
  }

  addARIALabels() {
    // Add ARIA labels to common elements
    this.addARIALabelsToButtons();
    this.addARIALabelsToForms();
    this.addARIALabelsToNavigation();
    this.addARIALabelsToContent();
    this.addARIALabelsToInteractiveElements();
  }

  addARIALabelsToButtons() {
    const buttons = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
    
    buttons.forEach((/** @type {HTMLButtonElement} */ button) => {
      const text = button.textContent?.trim() || '';
      if (text) {
        button.setAttribute('aria-label', text);
      }
      
      // Add button role if missing
      if (!button.getAttribute('role')) {
        button.setAttribute('role', 'button');
      }
    });
  }

  addARIALabelsToForms() {
    // Add labels to form inputs
    const inputs = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
    
    inputs.forEach((/** @type {HTMLInputElement} */ input) => {
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (label) {
        input.setAttribute('aria-labelledby', label.id);
      } else {
        const placeholder = input.getAttribute('placeholder');
        if (placeholder) {
          input.setAttribute('aria-label', placeholder);
        }
      }
      
      // Add required indicator
      if (input.hasAttribute('required')) {
        input.setAttribute('aria-required', 'true');
      }
    });
    
    // Add fieldset and legend labels
    const fieldsets = document.querySelectorAll('fieldset:not([aria-label])');
    fieldsets.forEach((/** @type {HTMLFieldSetElement} */ fieldset) => {
      const legend = fieldset.querySelector('legend');
      if (legend) {
        fieldset.setAttribute('aria-label', legend.textContent?.trim() || '');
      }
    });
  }

  addARIALabelsToNavigation() {
    // Add navigation labels
    const nav = document.querySelector('nav:not([aria-label])');
    if (nav) {
      nav.setAttribute('aria-label', 'Main navigation');
    }
    
    // Add menu labels
    const menus = document.querySelectorAll('[role="menu"]:not([aria-label])');
    menus.forEach((/** @type {Element} */ menu) => {
      menu.setAttribute('aria-label', 'Menu');
    });
    
    // Add breadcrumb labels
    const breadcrumbs = document.querySelector('.breadcrumb:not([aria-label])');
    if (breadcrumbs) {
      breadcrumbs.setAttribute('aria-label', 'Breadcrumb navigation');
    }
  }

  addARIALabelsToContent() {
    // Add content region labels
    const main = document.querySelector('main:not([aria-label])');
    if (main) {
      main.setAttribute('aria-label', 'Main content');
    }
    
    // Add heading structure
    this.ensureHeadingStructure();
    
    // Add landmark roles
    this.addLandmarkRoles();
  }

  addARIALabelsToInteractiveElements() {
    // Add labels to custom interactive elements
    const customButtons = document.querySelectorAll('[onclick]:not(button):not([role])');
    customButtons.forEach((/** @type {Element} */ element) => {
      element.setAttribute('role', 'button');
      element.setAttribute('tabindex', '0');
      
      const text = element.textContent?.trim() || '';
      if (text) {
        element.setAttribute('aria-label', text);
      }
    });
    
    // Add labels to clickable divs
    const clickableDivs = document.querySelectorAll('div[onclick]:not([aria-label])');
    clickableDivs.forEach((/** @type {HTMLDivElement} */ div) => {
      const text = div.textContent?.trim() || '';
      if (text) {
        div.setAttribute('aria-label', text);
      }
      div.setAttribute('role', 'button');
      div.setAttribute('tabindex', '0');
    });
  }

  ensureHeadingStructure() {
    // Ensure proper heading hierarchy
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let lastLevel = 0;
    
    headings.forEach((/** @type {HTMLHeadingElement} */ heading) => {
      const level = parseInt(heading.tagName.charAt(1));
      
      // Check for skipped heading levels
      if (lastLevel > 0 && level > lastLevel + 1) {
        console.warn(`Skipped heading level: h${lastLevel} to h${level}`);
      }
      
      lastLevel = level;
    });
    
    // Ensure at least one h1
    const h1s = document.querySelectorAll('h1');
    if (h1s.length === 0) {
      const main = document.querySelector('main') || document.body;
      const firstHeading = main.querySelector('h2, h3, h4, h5, h6');
      if (firstHeading) {
        const h1 = document.createElement('h1');
        h1.textContent = firstHeading.textContent;
        h1.setAttribute('aria-hidden', 'true');
        h1.style.cssText = 'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;';
        main.insertBefore(h1, firstHeading);
      }
    }
  }

  addLandmarkRoles() {
    // Add landmark roles for better navigation
    const header = document.querySelector('header:not([role])');
    if (header) {
      header.setAttribute('role', 'banner');
    }
    
    const nav = document.querySelector('nav:not([role])');
    if (nav) {
      nav.setAttribute('role', 'navigation');
    }
    
    const main = document.querySelector('main:not([role])');
    if (main) {
      main.setAttribute('role', 'main');
    }
    
    const aside = document.querySelector('aside:not([role])');
    if (aside) {
      aside.setAttribute('role', 'complementary');
    }
    
    const footer = document.querySelector('footer:not([role])');
    if (footer) {
      footer.setAttribute('role', 'contentinfo');
    }
  }

  setupFocusManagement() {
    // Add focus management for modals and dynamic content
    this.setupModalFocusManagement();
    this.setupDynamicContentFocus();
  }

  ensureFocusableElements() {
    // Ensure all interactive elements are keyboard accessible
    const elements = document.querySelectorAll('button:not([tabindex]), [onclick]:not([tabindex]), a:not([tabindex]), input:not([tabindex]), select:not([tabindex]), textarea:not([tabindex])');
    elements.forEach((/** @type {Element} */ element) => {
      element.setAttribute('tabindex', '0');
    });
  }

  addFocusIndicators() {
    // Add focus indicators via CSS class if needed
    const style = document.createElement('style');
    style.textContent = `
      *:focus { outline: 2px solid #3b82f6; outline-offset: 2px; }
      *:focus:not(:focus-visible) { outline: none; }
      *:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }
    `;
    document.head.appendChild(style);
  }

  findFocusTrap(element) {
    // Check if element is within a focus trap
    if (!element) return null;
    let current = element;
    while (current) {
      if (this.focusTrapElements.has(current)) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  closeModal(modal) {
    // Close a modal by setting aria-hidden
    if (modal) {
      modal.setAttribute('aria-hidden', 'true');
      this.releaseFocus(modal);
    }
  }

  closeDropdown(dropdown) {
    // Close a dropdown by removing show class
    if (dropdown) {
      dropdown.classList.remove('show');
    }
  }

  exitFocusTrap() {
    // Exit the current focus trap
    const trappedElement = this.focusTrapElements.keys().next().value;
    if (trappedElement) {
      this.releaseFocus(trappedElement);
      // Return focus to previously focused element
      if (this.currentFocus && this.currentFocus instanceof HTMLElement) {
        this.currentFocus.focus();
      }
    }
  }

  setupModalFocusManagement() {
    // Observe for modal changes
    const observer = new MutationObserver((/** @type {MutationRecord[]} */ mutations) => {
      mutations.forEach((/** @type {MutationRecord} */ mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
          const target = /** @type {Element} */ (mutation.target);
          if (target.getAttribute('aria-hidden') === 'false') {
            this.trapFocus(target);
          } else {
            this.releaseFocus(target);
          }
        }
      });
    });
    
    document.querySelectorAll('[role="dialog"], .modal').forEach((/** @type {Element} */ modal) => {
      observer.observe(modal, { attributes: true });
    });
  }

  setupDynamicContentFocus() {
    // Manage focus for dynamically loaded content
    const observer = new MutationObserver((/** @type {MutationRecord[]} */ mutations) => {
      mutations.forEach((/** @type {MutationRecord} */ mutation) => {
        mutation.addedNodes.forEach((/** @type {Node} */ node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.addFocusabilityToNewElements(/** @type {Element} */ (node));
          }
        });
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
  }

  addFocusabilityToNewElements(element) {
    // Ensure new interactive elements are focusable
    if (element.matches('button, [onclick], [role="button"], a, input, select, textarea')) {
      if (!element.hasAttribute('tabindex')) {
        element.setAttribute('tabindex', '0');
      }
    }
    
    // Recursively check child elements
    element.querySelectorAll('button, [onclick], [role="button"], a, input, select, textarea').forEach((/** @type {Element} */ child) => {
      if (!child.hasAttribute('tabindex')) {
        child.setAttribute('tabindex', '0');
      }
    });
  }

  trapFocus(element) {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length > 0) {
      this.focusTrapElements.set(element, focusableElements);
      focusableElements[0].focus();
    }
  }

  releaseFocus(element) {
    this.focusTrapElements.delete(element);
  }

  manageFocusTrap(event, focusTrap) {
    const focusableElements = this.focusTrapElements.get(focusTrap);
    if (!focusableElements || !Array.isArray(focusableElements) || focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }

  addSkipLinks() {
    // Add skip links for keyboard navigation
    const skipLinksHTML = `
      <div class="skip-links" style="position: absolute; top: -40px; left: 0; z-index: 10000;">
        <a href="#main-content" style="position: absolute; top: 40px; left: 6px; background: #000; color: #fff; padding: 8px; text-decoration: none; border-radius: 4px;">
          Skip to main content
        </a>
        <a href="#navigation" style="position: absolute; top: 80px; left: 6px; background: #000; color: #fff; padding: 8px; text-decoration: none; border-radius: 4px;">
          Skip to navigation
        </a>
      </div>
    `;
    
    document.body.insertAdjacentHTML('afterbegin', skipLinksHTML);
    
    // Show skip links when focused
    const skipLinks = document.querySelector('.skip-links');
    if (!skipLinks) return;
    
    const skipLinkAnchors = skipLinks.querySelectorAll('a');
    if (!skipLinkAnchors.length) return;
    
    skipLinkAnchors.forEach((/** @type {HTMLAnchorElement} */ anchor) => {
      anchor.addEventListener('focus', () => {
        if (skipLinks instanceof HTMLElement) {
          skipLinks.style.top = '0';
        }
      });
      
      anchor.addEventListener('blur', () => {
        if (skipLinks instanceof HTMLElement) {
          skipLinks.style.top = '-40px';
        }
      });
    });
  }

  setupScreenReaderAnnouncements() {
    // Create live region for announcements
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    document.body.appendChild(liveRegion);
    
    this.liveRegion = liveRegion;
  }

  announce(message, priority = 'polite') {
    if (!this.liveRegion) return;
    
    // Update live region politeness if needed
    if (priority === 'assertive') {
      this.liveRegion.setAttribute('aria-live', 'assertive');
    } else {
      this.liveRegion.setAttribute('aria-live', 'polite');
    }
    
    // Announce message
    this.liveRegion.textContent = message;
    
    // Store reference for timeout
    const liveRegion = this.liveRegion;
    
    // Clear after announcement
    setTimeout(() => {
      if (liveRegion) {
        liveRegion.textContent = '';
      }
    }, 1000);
  }

  setupAccessibilityTesting() {
    // Add accessibility testing tools in development
    if (window.location.hostname === 'localhost') {
      this.addAccessibilityTestingTools();
    }
  }

  addAccessibilityTestingTools() {
    // Add accessibility panel for testing
    const panel = document.createElement('div');
    panel.id = 'accessibility-panel';
    panel.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #1f2937;
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      max-width: 300px;
    `;
    
    panel.innerHTML = `
      <div>🔧 Accessibility Testing</div>
      <button id="test-headings" style="margin: 5px; padding: 5px;">Test Headings</button>
      <button id="test-contrast" style="margin: 5px; padding: 5px;">Test Contrast</button>
      <button id="test-focus" style="margin: 5px; padding: 5px;">Test Focus</button>
      <div id="accessibility-results"></div>
    `;
    
    document.body.appendChild(panel);
    
    // Add event listeners
    const testHeadingsBtn = document.getElementById('test-headings');
    const testContrastBtn = document.getElementById('test-contrast');
    const testFocusBtn = document.getElementById('test-focus');
    
    if (testHeadingsBtn) {
      testHeadingsBtn.addEventListener('click', () => {
        this.testHeadings();
      });
    }
    
    if (testContrastBtn) {
      testContrastBtn.addEventListener('click', () => {
        this.testContrast();
      });
    }
    
    if (testFocusBtn) {
      testFocusBtn.addEventListener('click', () => {
        this.testFocusOrder();
      });
    }
  }

  testHeadings() {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const results = [];
    let lastLevel = 0;
    
    headings.forEach((/** @type {HTMLHeadingElement} */ heading, _index) => {
      const level = parseInt(heading.tagName.charAt(1));
      const text = heading.textContent?.trim() || '';
      
      if (lastLevel > 0 && level > lastLevel + 1) {
        results.push(`❌ Skipped level: h${lastLevel} → h${level} at "${text}"`);
      } else {
        results.push(`✅ h${level}: "${text}"`);
      }
      
      lastLevel = level;
    });
    
    this.displayTestResults('Headings', results);
  }

  testContrast() {
    // Basic contrast testing
    const elements = document.querySelectorAll('*');
    const results = [];
    let issues = 0;
    
    elements.forEach((/** @type {Element} */ element) => {
      const styles = window.getComputedStyle(element);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;
      
      if (color !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
        // Simple contrast check (would need proper calculation in production)
        const colorRgb = this.parseColor(color);
        const bgRgb = this.parseColor(backgroundColor);
        
        if (colorRgb && bgRgb) {
          const contrast = this.calculateContrast(colorRgb, bgRgb);
          if (contrast < 4.5) {
            results.push(`❌ Low contrast (${contrast.toFixed(2)}): ${element.tagName}`);
            issues++;
          }
        }
      }
    });
    
    if (issues === 0) {
      results.push('✅ No contrast issues found');
    }
    
    this.displayTestResults('Contrast', results);
  }

  testFocusOrder() {
    // Test focus order by tabbing through elements
    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const results = [];
    focusableElements.forEach((/** @type {Element} */ element, index) => {
      const tag = element.tagName;
      const id = element.id || '';
      const text = element.textContent?.trim().substring(0, 20) || '';
      results.push(`${index + 1}. ${tag} ${id ? '#' + id : ''} "${text}"`);
    });
    
    this.displayTestResults('Focus Order', results);
  }

  parseColor(color) {
    // Simple color parsing (would need more robust solution)
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3])
      };
    }
    return null;
  }

  calculateContrast(rgb1, rgb2) {
    // Simple contrast calculation (would need WCAG formula in production)
    const luminance1 = (rgb1.r + rgb1.g + rgb1.b) / (255 * 3);
    const luminance2 = (rgb2.r + rgb2.g + rgb2.b) / (255 * 3);
    
    return (Math.max(luminance1, luminance2) + 0.05) / (Math.min(luminance1, luminance2) + 0.05);
  }

  displayTestResults(testName, results) {
    const resultsDiv = document.getElementById('accessibility-results');
    if (resultsDiv) {
      resultsDiv.innerHTML = `
        <div style="margin-top: 10px; font-weight: bold;">${testName} Results:</div>
        <div style="max-height: 200px; overflow-y: auto; margin-top: 5px;">
          ${results.map(result => `<div style="margin: 2px 0;">${result}</div>`).join('')}
        </div>
      `;
    }
  }

  // Public API
  enableKeyboardNavigation(enabled = true) {
    this.keyboardNavigationEnabled = enabled;
  }

  announceToScreenReader(message, priority = 'polite') {
    this.announce(message, priority);
  }

  focusElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
      element.focus();
    }
  }

  // Initialize
  init() {
    // Make globally available
    if (typeof window !== 'undefined') {
      /** @type {any} */ (window).accessibilityManager = this;
    }
    
    console.log('Accessibility manager initialized');
  }
}

// Export singleton instance
const accessibilityManager = new AccessibilityManager();

// Export convenience functions
export const announce = (message, priority) => 
  accessibilityManager.announceToScreenReader(message, priority);

export const focusElement = (selector) => 
  accessibilityManager.focusElement(selector);

export default accessibilityManager;
