// popup.js - Popup UI logic

let state = {
  enabled: true,
  voiceEnabled: false,
  isListening: false
};

// DOM elements
const enableExtensionCheckbox = document.getElementById('enableExtension');
const enableVoiceCheckbox = document.getElementById('enableVoice');
const statusDiv = document.getElementById('status');
const voiceStatusDiv = document.getElementById('voiceStatus');
const settingsBtn = document.getElementById('settingsBtn');

// Initialize popup
async function init() {
  // Load state from storage
  const result = await chrome.storage.local.get(['enabled', 'voiceEnabled']);
  state.enabled = result.enabled !== false;
  state.voiceEnabled = result.voiceEnabled || false;

  // Update UI
  enableExtensionCheckbox.checked = state.enabled;
  enableVoiceCheckbox.checked = state.voiceEnabled;
  updateStatus();

  // Get current state from background
  try {
    const response = await chrome.runtime.sendMessage({ type: 'get-state' });
    if (response) {
      state.enabled = response.enabled;
      state.voiceEnabled = response.voiceEnabled;
      enableExtensionCheckbox.checked = state.enabled;
      enableVoiceCheckbox.checked = state.voiceEnabled;
      updateStatus();
    }
  } catch (error) {
    console.error('[Popup] Error getting state:', error);
  }
}

// Event listeners
enableExtensionCheckbox.addEventListener('change', async (e) => {
  state.enabled = e.target.checked;
  
  try {
    await chrome.runtime.sendMessage({
      type: 'enable-extension',
      enabled: state.enabled
    });
    updateStatus();
  } catch (error) {
    console.error('[Popup] Error toggling extension:', error);
    statusDiv.textContent = 'Error: ' + error.message;
    statusDiv.className = 'status error';
  }
});

enableVoiceCheckbox.addEventListener('change', async (e) => {
  state.voiceEnabled = e.target.checked;
  
  // Show loading state
  voiceStatusDiv.textContent = state.voiceEnabled ? 'Starting...' : 'Stopping...';
  voiceStatusDiv.className = 'voice-status loading';

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'enable-voice',
      enabled: state.voiceEnabled
    });

    if (response.success) {
      updateStatus();
    } else {
      throw new Error(response.error || 'Failed to toggle voice');
    }
  } catch (error) {
    console.error('[Popup] Error toggling voice:', error);
    
    // Revert checkbox
    enableVoiceCheckbox.checked = !state.voiceEnabled;
    state.voiceEnabled = !state.voiceEnabled;
    
    voiceStatusDiv.textContent = 'Error: ' + error.message;
    voiceStatusDiv.className = 'voice-status error';
  }
});

settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Update status display
function updateStatus() {
  if (!state.enabled) {
    statusDiv.textContent = 'Disabled';
    statusDiv.className = 'status disabled';
    voiceStatusDiv.textContent = '';
  } else {
    statusDiv.textContent = 'Active';
    statusDiv.className = 'status active';

    if (state.voiceEnabled) {
      voiceStatusDiv.textContent = '🎤 Listening';
      voiceStatusDiv.className = 'voice-status listening';
    } else {
      voiceStatusDiv.textContent = '';
      voiceStatusDiv.className = 'voice-status';
    }
  }
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'speech-started':
      state.isListening = true;
      voiceStatusDiv.textContent = '🎤 Listening';
      voiceStatusDiv.className = 'voice-status listening';
      break;

    case 'speech-stopped':
      state.isListening = false;
      if (state.voiceEnabled) {
        voiceStatusDiv.textContent = 'Reconnecting...';
        voiceStatusDiv.className = 'voice-status loading';
      } else {
        voiceStatusDiv.textContent = '';
        voiceStatusDiv.className = 'voice-status';
      }
      break;

    case 'speech-error':
      if (message.error === 'permission-denied') {
        voiceStatusDiv.textContent = '❌ Microphone permission denied';
        voiceStatusDiv.className = 'voice-status error';
        enableVoiceCheckbox.checked = false;
        state.voiceEnabled = false;
      } else if (message.error === 'not-supported') {
        voiceStatusDiv.textContent = '❌ Speech API not supported';
        voiceStatusDiv.className = 'voice-status error';
        enableVoiceCheckbox.disabled = true;
      } else {
        voiceStatusDiv.textContent = '⚠️ Error: ' + message.error;
        voiceStatusDiv.className = 'voice-status error';
      }
      break;
  }
});

// Initialize on load
init();
