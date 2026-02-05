// risk.js - Detects risky actions that require confirmation

const RISKY_KEYWORDS = [
  'delete', 'remove', 'erase', 'clear',
  'pay', 'purchase', 'buy', 'checkout', 'confirm purchase',
  'submit', 'send', 'post',
  'sign out', 'log out', 'logout',
  'uninstall', 'unsubscribe',
  'cancel subscription', 'end membership'
];

class RiskDetector {
  constructor() {
    this.enabled = true;
  }

  // Check if element represents a risky action
  isRisky(candidate) {
    if (!this.enabled) return false;

    const element = candidate.element;
    const text = candidate.text.toLowerCase();
    const ariaLabel = (element.getAttribute('aria-label') || '').toLowerCase();
    const title = (element.getAttribute('title') || '').toLowerCase();
    const value = (element.value || '').toLowerCase();
    const type = element.type?.toLowerCase();

    // Check text content
    for (const keyword of RISKY_KEYWORDS) {
      if (text.includes(keyword) || 
          ariaLabel.includes(keyword) || 
          title.includes(keyword) ||
          value.includes(keyword)) {
        return true;
      }
    }

    // Check form submission
    if (type === 'submit' || element.tagName.toLowerCase() === 'button' && element.form) {
      // Check if form is for sensitive operations
      const form = element.form || element.closest('form');
      if (form) {
        const formAction = (form.action || '').toLowerCase();
        const formId = (form.id || '').toLowerCase();
        if (formAction.includes('payment') || 
            formAction.includes('delete') ||
            formId.includes('payment') ||
            formId.includes('checkout')) {
          return true;
        }
      }
    }

    return false;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

window.RiskDetector = RiskDetector;
