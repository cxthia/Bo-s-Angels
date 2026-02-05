// input.js - Handles keyboard and voice selection

class InputHandler {
  constructor() {
    this.currentPredictions = [];
    this.pendingConfirmation = null;
    this.lastKeyPress = { key: null, time: 0 };
    this.enabled = false;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (enabled) {
      document.addEventListener('keydown', this.handleKeydown);
    } else {
      document.removeEventListener('keydown', this.handleKeydown);
    }
  }

  setPredictions(predictions) {
    this.currentPredictions = predictions;
  }

  handleKeydown = (event) => {
    if (!this.enabled || !this.currentPredictions.length) return;

    // Handle number keys 1-9
    const key = event.key;
    if (key >= '1' && key <= '9') {
      const index = parseInt(key) - 1;
      if (index < this.currentPredictions.length) {
        event.preventDefault();
        this.selectCandidate(index);
      }
    }

    // Handle Enter for confirmation
    if (key === 'Enter' && this.pendingConfirmation !== null) {
      event.preventDefault();
      this.confirmSelection();
    }

    // Handle Escape to cancel
    if (key === 'Escape' && this.pendingConfirmation !== null) {
      event.preventDefault();
      this.cancelSelection();
    }
  }

  selectCandidate(index) {
    const candidate = this.currentPredictions[index];
    if (!candidate) return;

    // Check if risky
    if (candidate.isRisky) {
      // Check for double-press (press same key within 800ms)
      const now = Date.now();
      const number = index + 1;
      
      if (this.lastKeyPress.key === number && now - this.lastKeyPress.time < 800) {
        // Double-press detected
        this.performAction(candidate);
        this.lastKeyPress = { key: null, time: 0 };
      } else {
        // First press - set pending confirmation
        this.pendingConfirmation = candidate;
        this.lastKeyPress = { key: number, time: now };
        this.onConfirmationRequired?.(candidate, index);
      }
    } else {
      // Not risky - execute immediately
      this.performAction(candidate);
    }
  }

  confirmSelection() {
    if (this.pendingConfirmation) {
      this.performAction(this.pendingConfirmation);
      this.pendingConfirmation = null;
      this.onConfirmationComplete?.();
    }
  }

  cancelSelection() {
    this.pendingConfirmation = null;
    this.lastKeyPress = { key: null, time: 0 };
    this.onConfirmationCancelled?.();
  }

  performAction(candidate) {
    const element = candidate.element;
    
    try {
      // Log the action
      this.onAction?.(candidate);

      // Scroll into view if needed
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Perform appropriate action based on element type
      if (element.tagName === 'INPUT' || 
          element.tagName === 'TEXTAREA' || 
          element.tagName === 'SELECT') {
        element.focus();
      } else {
        // Simulate click
        element.click();
      }

      console.log('[Voice Hints] Action performed:', candidate.text);
    } catch (error) {
      console.error('[Voice Hints] Error performing action:', error);
    }
  }

  // Handle voice commands
  handleVoiceCommand(command) {
    if (!this.enabled || !this.currentPredictions.length) return false;

    const lowerCommand = command.toLowerCase().trim();

    // Parse "click N", "select N", or just "N"
    let number = null;
    
    const numberWords = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4,
      'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9
    };

    // Check for confirmation
    if (lowerCommand.includes('confirm') && this.pendingConfirmation) {
      this.confirmSelection();
      return true;
    }

    // Check for cancel
    if (lowerCommand.includes('cancel') || lowerCommand.includes('stop')) {
      this.cancelSelection();
      return true;
    }

    // Extract number from command
    for (const [word, num] of Object.entries(numberWords)) {
      if (lowerCommand.includes(word)) {
        number = num;
        break;
      }
    }

    // Try parsing digit
    if (!number) {
      const match = lowerCommand.match(/\d+/);
      if (match) {
        number = parseInt(match[0]);
      }
    }

    if (number && number >= 1 && number <= this.currentPredictions.length) {
      this.selectCandidate(number - 1);
      return true;
    }

    return false;
  }

  getPendingConfirmation() {
    return this.pendingConfirmation;
  }

  // Callbacks
  onAction(callback) {
    this.onAction = callback;
  }

  onConfirmationRequired(callback) {
    this.onConfirmationRequired = callback;
  }

  onConfirmationComplete(callback) {
    this.onConfirmationComplete = callback;
  }

  onConfirmationCancelled(callback) {
    this.onConfirmationCancelled = callback;
  }
}

window.InputHandler = InputHandler;
