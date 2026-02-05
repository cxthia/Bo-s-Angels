// overlay.js - Renders hint overlay using Shadow DOM

class HintOverlay {
  constructor() {
    this.container = null;
    this.shadowRoot = null;
    this.badges = [];
    this.highlights = [];
    this.statusIndicator = null;
    this.visible = false;
  }

  init() {
    // Create container
    this.container = document.createElement('div');
    this.container.id = 'voice-hints-overlay';
    
    // Attach Shadow DOM for style isolation
    this.shadowRoot = this.container.attachShadow({ mode: 'open' });

    // Load styles
    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = chrome.runtime.getURL('content/overlay.css');
    this.shadowRoot.appendChild(styleLink);

    // Create hint container
    const hintContainer = document.createElement('div');
    hintContainer.className = 'hint-container';
    this.shadowRoot.appendChild(hintContainer);

    // Create status indicator
    this.statusIndicator = document.createElement('div');
    this.statusIndicator.className = 'status-indicator';
    this.statusIndicator.textContent = 'Hints Active';
    this.shadowRoot.appendChild(this.statusIndicator);

    document.body.appendChild(this.container);
  }

  // Render hints for top K candidates
  render(predictions) {
    if (!this.shadowRoot) {
      this.init();
    }

    // Clear existing hints
    this.clear();

    if (!predictions || predictions.length === 0) {
      return;
    }

    const hintContainer = this.shadowRoot.querySelector('.hint-container');

    predictions.forEach((candidate, index) => {
      const number = index + 1;
      
      // Create highlight ring
      const highlight = document.createElement('div');
      highlight.className = 'hint-highlight';
      if (candidate.isRisky) {
        highlight.classList.add('risky');
      }

      const rect = candidate.rect;
      highlight.style.left = rect.left + 'px';
      highlight.style.top = rect.top + 'px';
      highlight.style.width = rect.width + 'px';
      highlight.style.height = rect.height + 'px';

      hintContainer.appendChild(highlight);
      this.highlights.push(highlight);

      // Create numbered badge
      const badge = document.createElement('div');
      badge.className = 'hint-badge';
      if (candidate.isRisky) {
        badge.classList.add('risky');
      }
      badge.textContent = number;

      // Position badge (offset from element to avoid overlap)
      let badgeX = rect.left - 20;
      let badgeY = rect.top - 20;

      // Keep within viewport
      badgeX = Math.max(10, Math.min(badgeX, window.innerWidth - 50));
      badgeY = Math.max(10, Math.min(badgeY, window.innerHeight - 50));

      badge.style.left = badgeX + 'px';
      badge.style.top = badgeY + 'px';

      // Make badge clickable (triggers same action as voice/keyboard)
      badge.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onBadgeClick?.(number);
      });

      hintContainer.appendChild(badge);
      this.badges.push(badge);
    });

    this.visible = true;
    this.container.style.display = 'block';
  }

  clear() {
    this.badges.forEach(badge => badge.remove());
    this.highlights.forEach(highlight => highlight.remove());
    this.badges = [];
    this.highlights = [];
  }

  hide() {
    this.clear();
    if (this.container) {
      this.container.style.display = 'none';
    }
    this.visible = false;
  }

  show() {
    if (this.container) {
      this.container.style.display = 'block';
    }
    this.visible = true;
  }

  updateStatus(text, listening = false) {
    if (this.statusIndicator) {
      this.statusIndicator.textContent = text;
      if (listening) {
        this.statusIndicator.classList.add('listening');
      } else {
        this.statusIndicator.classList.remove('listening');
      }
    }
  }

  hideStatus() {
    if (this.statusIndicator) {
      this.statusIndicator.style.display = 'none';
    }
  }

  showStatus() {
    if (this.statusIndicator) {
      this.statusIndicator.style.display = 'block';
    }
  }

  setBadgeSize(size) {
    // size: 'small', 'medium', 'large', 'xlarge'
    this.badges.forEach(badge => {
      badge.classList.remove('size-small', 'size-large', 'size-xlarge');
      if (size !== 'medium') {
        badge.classList.add(`size-${size}`);
      }
    });
  }

  destroy() {
    this.clear();
    if (this.container) {
      this.container.remove();
      this.container = null;
      this.shadowRoot = null;
    }
  }

  onBadgeClick(callback) {
    this.onBadgeClick = callback;
  }
}

window.HintOverlay = HintOverlay;
