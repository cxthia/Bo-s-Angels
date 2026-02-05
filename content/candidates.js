// candidates.js - Detects and manages clickable elements on the page

const MAX_CANDIDATES = 200;
const MIN_ELEMENT_SIZE = 100; // px² - minimum area to be considered clickable

// Selectors for interactive elements
const INTERACTIVE_SELECTORS = [
  'button',
  'a[href]',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="tab"]',
  '[tabindex]:not([tabindex="-1"])',
  '[onclick]'
].join(',');

class CandidateDetector {
  constructor() {
    this.candidates = [];
    this.observer = null;
    this.updateCallbacks = [];
  }

  // Check if element is visible and interactable
  isVisible(element) {
    if (!element.offsetParent && element.tagName !== 'BODY') return false;
    
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }

    const rect = element.getBoundingClientRect();
    const area = rect.width * rect.height;
    
    // Must have minimum size and be within viewport
    return area >= MIN_ELEMENT_SIZE &&
           rect.width > 10 && rect.height > 10 && // Not too thin/narrow
           rect.top < window.innerHeight && rect.bottom > 0 &&
           rect.left < window.innerWidth && rect.right > 0 &&
           rect.top >= 0 && rect.left >= 0; // Fully in viewport
  }

  // Check if element is disabled
  isDisabled(element) {
    return element.disabled || 
           element.getAttribute('aria-disabled') === 'true' ||
           element.classList.contains('disabled');
  }

  // Check if element is truly clickable (not covered or pointer-events: none)
  isClickable(element) {
    // Check if element or parent has pointer-events: none
    let current = element;
    while (current && current !== document.body) {
      const style = window.getComputedStyle(current);
      if (style.pointerEvents === 'none') {
        return false;
      }
      current = current.parentElement;
    }
    return true;
  }

  // Get candidate score (priority based on element type)
  getElementPriority(element) {
    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute('role');

    if (tagName === 'button' || role === 'button') return 10;
    if (tagName === 'a') return 9;
    if (tagName === 'input' && element.type === 'submit') return 10;
    if (tagName === 'input') return 7;
    if (tagName === 'select') return 7;
    if (role === 'menuitem' || role === 'tab') return 8;
    return 5;
  }

  // Extract candidates from DOM
  detectCandidates() {
    const elements = document.querySelectorAll(INTERACTIVE_SELECTORS);
    const candidates = [];

    for (let i = 0; i < elements.length && candidates.length < MAX_CANDIDATES; i++) {
      const element = elements[i];
      
      if (!this.isVisible(element) || this.isDisabled(element) || !this.isClickable(element)) {
        continue;
      }

      const rect = element.getBoundingClientRect();
      const priority = this.getElementPriority(element);

      candidates.push({
        element: element,
        rect: rect,
        center: {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        },
        size: rect.width * rect.height,
        priority: priority,
        text: element.textContent?.trim() || element.getAttribute('aria-label') || '',
        type: element.tagName.toLowerCase()
      });
    }

    this.candidates = candidates;
    this.notifyUpdate();
    return candidates;
  }

  // Set up MutationObserver to track DOM changes
  startObserving() {
    if (this.observer) return;

    this.observer = new MutationObserver(() => {
      // Debounce updates
      if (this.updateTimeout) {
        clearTimeout(this.updateTimeout);
      }
      this.updateTimeout = setTimeout(() => {
        this.detectCandidates();
      }, 300);
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'hidden', 'disabled']
    });
  }

  stopObserving() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
  }

  // Register callback for candidate updates
  onUpdate(callback) {
    this.updateCallbacks.push(callback);
  }

  notifyUpdate() {
    this.updateCallbacks.forEach(cb => cb(this.candidates));
  }

  getCandidates() {
    return this.candidates;
  }
}

// Export for use in content script
window.CandidateDetector = CandidateDetector;
