// content-script.js - Main orchestrator for content script modules

// Import all modules (they're loaded via manifest)
// Scripts: candidates.js, pointer.js, risk.js, ranking.js, overlay.js, input.js, logging.js

let state = {
  enabled: false,
  voiceEnabled: false,
  hintsVisible: false,
  settings: null
};

// Module instances
let candidateDetector;
let pointerTracker;
let riskDetector;
let ranker;
let overlay;
let inputHandler;
let logger;

// Current predictions
let currentPredictions = [];
let selectionStartTime = null;

// Minimum display time for badges (to prevent them from disappearing too quickly)
const MIN_BADGE_DISPLAY_TIME = 5000; // 5 seconds
let lastBadgeRenderTime = 0;
let badgeClearTimeout = null;

// Initialize
async function init() {
  console.log('[Voice Hints] Initializing content script');

  // Load settings
  const result = await chrome.storage.local.get(['enabled', 'voiceEnabled', 'settings']);
  state.enabled = result.enabled !== false;
  state.voiceEnabled = result.voiceEnabled || false;
  state.settings = result.settings || {
    coneAngle: 40,
    maxDistance: 600,
    topK: 6,
    hysteresis: 800,
    riskConfirmation: true,
    badgeSize: 'medium'
  };

  // Initialize modules
  candidateDetector = new window.CandidateDetector();
  pointerTracker = new window.PointerTracker();
  riskDetector = new window.RiskDetector();
  ranker = new window.CandidateRanker();
  overlay = new window.HintOverlay();
  inputHandler = new window.InputHandler();
  logger = new window.MetricsLogger();

  // Apply settings
  applySettings();

  // Load learned weights for ML
  await ranker.loadWeights();

  // Set up event handlers
  setupEventHandlers();

  // Start tracking if enabled
  if (state.enabled) {
    start();
  }
}

function applySettings() {
  console.log('[Voice Hints] Applying settings:', state.settings);
  
  ranker.setTopK(state.settings.topK);
  ranker.setHysteresisTime(state.settings.hysteresis || 2000);
  riskDetector.setEnabled(state.settings.riskConfirmation);
  
  // Apply badge size if set
  if (state.settings.badgeSize && overlay) {
    console.log('[Voice Hints] Setting badge size to:', state.settings.badgeSize);
    overlay.setBadgeSize(state.settings.badgeSize);
  }
  
  // Update pointer tracker cone settings
  if (pointerTracker) {
    console.log('[Voice Hints] Setting cone angle:', state.settings.coneAngle, 'max distance:', state.settings.maxDistance);
    pointerTracker.setConeAngle(state.settings.coneAngle || 40);
    pointerTracker.setMaxDistance(state.settings.maxDistance || 600);
  }
}

function setupEventHandlers() {
  // Candidate updates
  candidateDetector.onUpdate((candidates) => {
    updatePredictions();
  });

  // Pointer updates
  pointerTracker.onUpdate(() => {
    updatePredictions();
  });

  // Input handler callbacks
  inputHandler.onAction = (candidate) => {
    const timeToSelect = selectionStartTime ? Date.now() - selectionStartTime : 0;
    logger.logSelection(candidate, 'keyboard', timeToSelect);
    
    // ML: Learn from user's choice
    ranker.learnFromFeedback(candidate, currentPredictions);
    
    selectionStartTime = null;
  };

  inputHandler.onConfirmationRequired = (candidate, index) => {
    overlay.updateStatus(`Press ${index + 1} again or say "confirm"`, false);
  };

  inputHandler.onConfirmationComplete = () => {
    overlay.updateStatus('Hints Active', false);
  };

  inputHandler.onConfirmationCancelled = () => {
    overlay.updateStatus('Cancelled', false);
    setTimeout(() => {
      overlay.updateStatus('Hints Active', false);
    }, 1000);
  };

  // Badge clicks
  overlay.onBadgeClick = (number) => {
    inputHandler.selectCandidate(number - 1);
  };

  // Track pointer for metrics
  document.addEventListener('mousemove', (e) => {
    logger.updatePointerDistance(e.clientX, e.clientY);
  });
}

function start() {
  console.log('[Voice Hints] Starting');
  
  // Detect initial candidates
  candidateDetector.detectCandidates();
  candidateDetector.startObserving();

  // Start pointer tracking
  pointerTracker.start();

  // Enable input handler
  inputHandler.setEnabled(true);

  // Mark selection start time
  selectionStartTime = Date.now();

  state.hintsVisible = true;
}

function stop() {
  console.log('[Voice Hints] Stopping');
  
  candidateDetector.stopObserving();
  pointerTracker.stop();
  inputHandler.setEnabled(false);
  overlay.hide();

  state.hintsVisible = false;

  // Save metrics
  logger.saveToStorage();
}

function updatePredictions() {
  if (!state.enabled || !state.hintsVisible) {
    return;
  }

  // Get all candidates
  const candidates = candidateDetector.getCandidates();
  
  // Show nearby elements (proximity-based only)
  const filtered = pointerTracker.filterByProximity(candidates, 300);

  // Check for risky actions
  const withRisk = filtered.map(c => ({
    ...c,
    isRisky: riskDetector.isRisky(c)
  }));

  // Rank and select top K
  const predictions = ranker.selectTopK(withRisk);

  // Update current predictions
  currentPredictions = predictions;
  inputHandler.setPredictions(predictions);

  // Render overlay
  if (predictions.length > 0) {
    overlay.render(predictions);
    lastBadgeRenderTime = Date.now();
  } else {
    clearBadgesWithDelay();
  }
}

function clearBadgesWithDelay() {
  // Don't clear immediately - wait for minimum display time
  const timeSinceLastRender = Date.now() - lastBadgeRenderTime;
  if (timeSinceLastRender < MIN_BADGE_DISPLAY_TIME && currentPredictions.length > 0) {
    // Schedule clear after remaining time
    if (!badgeClearTimeout) {
      const remainingTime = MIN_BADGE_DISPLAY_TIME - timeSinceLastRender;
      badgeClearTimeout = setTimeout(() => {
        overlay.clear();
        currentPredictions = [];
        inputHandler.setPredictions([]);
        badgeClearTimeout = null;
      }, remainingTime);
    }
  } else {
    // Clear immediately if enough time has passed
    overlay.clear();
    currentPredictions = [];
    inputHandler.setPredictions([]);
  }
}

// Inject iframe for microphone permission
function injectMicrophonePermissionIframe() {
  // Check if iframe already exists
  if (document.getElementById('voice-hints-permission-iframe')) {
    console.log('[Voice Hints] Permission iframe already exists');
    return;
  }

  console.log('[Voice Hints] Injecting permission iframe');
  
  const iframe = document.createElement('iframe');
  iframe.id = 'voice-hints-permission-iframe';
  iframe.src = chrome.runtime.getURL('permission/permission.html');
  iframe.allow = 'microphone';
  iframe.style.display = 'none';
  iframe.style.position = 'fixed';
  iframe.style.top = '-1000px';
  iframe.style.left = '-1000px';
  iframe.style.width = '1px';
  iframe.style.height = '1px';
  
  document.body.appendChild(iframe);
  
  console.log('[Voice Hints] Permission iframe injected');
}

// Handle messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Voice Hints] Received message:', message.type);

  switch (message.type) {
    case 'toggle-hints':
      state.enabled = message.enabled;
      if (state.enabled) {
        start();
      } else {
        stop();
      }
      sendResponse({ success: true });
      break;

    case 'voice-command':
      handleVoiceCommand(message);
      sendResponse({ success: true });
      break;

    case 'update-settings':
      state.settings = message.settings;
      applySettings();
      sendResponse({ success: true });
      break;

    case 'request-microphone-permission':
      injectMicrophonePermissionIframe();
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }

  return true;
});

function handleVoiceCommand(message) {
  if (!state.enabled) return;

  const { transcript, isFinal } = message;

  if (!isFinal) {
    // Show interim result
    overlay.updateStatus(`Heard: "${transcript}"`, true);
    return;
  }

  // Process final command
  const handled = inputHandler.handleVoiceCommand(transcript);

  if (handled) {
    overlay.updateStatus('Command executed', false);
    
    // Log voice selection
    const candidate = currentPredictions.find((p, i) => {
      const numberWords = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
      return transcript.toLowerCase().includes(numberWords[i]);
    });

    if (candidate) {
      const timeToSelect = selectionStartTime ? Date.now() - selectionStartTime : 0;
      logger.logSelection(candidate, 'voice', timeToSelect);
      
      // ML: Learn from user's voice choice
      ranker.learnFromFeedback(candidate, currentPredictions);
      
      selectionStartTime = Date.now(); // Reset for next selection
    }

    setTimeout(() => {
      overlay.updateStatus('Hints Active', state.voiceEnabled);
    }, 1000);
  } else {
    overlay.updateStatus(`Unknown command: "${transcript}"`, true);
    setTimeout(() => {
      overlay.updateStatus('Hints Active', state.voiceEnabled);
    }, 2000);
  }
}

// Storage change listener
chrome.storage.onChanged.addListener((changes, areaName) => {
  console.log('[Voice Hints] Storage changed:', changes, 'area:', areaName);
  
  if (areaName === 'local') {
    if (changes.enabled) {
      state.enabled = changes.enabled.newValue;
      if (state.enabled) {
        start();
      } else {
        stop();
      }
    }

    if (changes.settings) {
      console.log('[Voice Hints] Settings changed from', changes.settings.oldValue, 'to', changes.settings.newValue);
      state.settings = changes.settings.newValue;
      applySettings();
      if (state.enabled) {
        updatePredictions();
      }
    }
  }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
