// logging.js - Tracks metrics for evaluation

class MetricsLogger {
  constructor() {
    this.sessionStart = Date.now();
    this.metrics = {
      selections: [],
      misclicks: 0,
      voiceCommands: 0,
      keyboardCommands: 0,
      totalPointerDistance: 0,
      sessionDuration: 0
    };
    this.lastPosition = null;
  }

  // Log a successful selection
  logSelection(candidate, method, timeToSelect) {
    this.metrics.selections.push({
      timestamp: Date.now(),
      element: candidate.type,
      text: candidate.text.substring(0, 50), // Truncate for privacy
      method: method, // 'voice' or 'keyboard'
      timeToSelect: timeToSelect,
      isRisky: candidate.isRisky || false
    });

    if (method === 'voice') {
      this.metrics.voiceCommands++;
    } else {
      this.metrics.keyboardCommands++;
    }
  }

  // Log a misclick (click outside predicted elements)
  logMisclick() {
    this.metrics.misclicks++;
  }

  // Track pointer travel distance
  updatePointerDistance(x, y) {
    if (this.lastPosition) {
      const dx = x - this.lastPosition.x;
      const dy = y - this.lastPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      this.metrics.totalPointerDistance += distance;
    }
    this.lastPosition = { x, y };
  }

  // Get current metrics
  getMetrics() {
    this.metrics.sessionDuration = Date.now() - this.sessionStart;
    return { ...this.metrics };
  }

  // Export metrics as JSON
  exportMetrics() {
    const metrics = this.getMetrics();
    const blob = new Blob([JSON.stringify(metrics, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice-hints-metrics-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  // Save to chrome.storage
  async saveToStorage() {
    const metrics = this.getMetrics();
    try {
      const result = await chrome.storage.local.get(['metricsHistory']);
      const history = result.metricsHistory || [];
      history.push({
        ...metrics,
        savedAt: Date.now()
      });

      // Keep only last 100 sessions
      if (history.length > 100) {
        history.shift();
      }

      await chrome.storage.local.set({ metricsHistory: history });
    } catch (error) {
      console.error('[Voice Hints] Error saving metrics:', error);
    }
  }

  // Reset metrics
  reset() {
    this.sessionStart = Date.now();
    this.metrics = {
      selections: [],
      misclicks: 0,
      voiceCommands: 0,
      keyboardCommands: 0,
      totalPointerDistance: 0,
      sessionDuration: 0
    };
    this.lastPosition = null;
  }
}

window.MetricsLogger = MetricsLogger;
