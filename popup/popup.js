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
  
  if (state.voiceEnabled) {
    // Request microphone permission via iframe injection
    voiceStatusDiv.textContent = 'Requesting microphone...';
    voiceStatusDiv.className = 'voice-status loading';
    
    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        throw new Error('No active tab found');
      }
      
      // Check if tab URL is valid for content scripts
      if (tab.url && (
        tab.url.startsWith('chrome://') ||
        tab.url.startsWith('edge://') ||
        tab.url.startsWith('chrome-extension://') ||
        tab.url.startsWith('about:') ||
        tab.url === 'chrome://newtab/'
      )) {
        throw new Error('Cannot run on this page. Please navigate to a normal website (like google.com)');
      }
      
      // Request content script to inject permission iframe
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'request-microphone-permission'
      });
      
      if (!response || !response.success) {
        throw new Error('Content script not ready. Try refreshing the page');
      }
      
      console.log('[Popup] Permission iframe injection requested');
      
      // Wait for permission result from background
      // The background will receive permission-granted or permission-denied message
      // We'll get updated via the existing message flow
      voiceStatusDiv.textContent = 'Waiting for permission...';
      
    } catch (error) {
      console.error('[Popup] Error requesting permission:', error);
      
      // Revert checkbox
      enableVoiceCheckbox.checked = false;
      state.voiceEnabled = false;
      
      // Better error messages
      let errorMessage = error.message;
      let errorHint = 'Try refreshing the page';
      
      if (error.message.includes('Receiving end does not exist')) {
        errorMessage = 'Extension not ready on this page';
        errorHint = 'Navigate to a website like google.com and try again';
      } else if (error.message.includes('Cannot run on this page')) {
        errorMessage = 'Cannot use on special pages';
        errorHint = 'Go to any normal website (google.com, youtube.com, etc.)';
      }
      
      voiceStatusDiv.innerHTML = `❌ ${errorMessage}<br><small>${errorHint}</small>`;
      voiceStatusDiv.className = 'voice-status error';
    }
  } else {
    // Disabling voice
    voiceStatusDiv.textContent = 'Stopping...';
    voiceStatusDiv.className = 'voice-status loading';
    
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'enable-voice',
        enabled: false
      });

      if (response.success) {
        updateStatus();
      } else {
        throw new Error(response.error || 'Failed to stop voice');
      }
    } catch (error) {
      console.error('[Popup] Error stopping voice:', error);
      voiceStatusDiv.textContent = 'Error: ' + error.message;
      voiceStatusDiv.className = 'voice-status error';
    }
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
        voiceStatusDiv.innerHTML = '❌ Microphone denied<br><small>Please allow microphone in Chrome settings</small>';
        voiceStatusDiv.className = 'voice-status error';
        enableVoiceCheckbox.checked = false;
        state.voiceEnabled = false;
        
        // Show instructions
        setTimeout(() => {
          if (confirm('Microphone access was denied. Would you like to see instructions on how to enable it?')) {
            alert('To enable microphone:\n\n1. Click the lock/camera icon in the address bar\n2. Find "Microphone" setting\n3. Change to "Allow"\n4. Reload this extension\n5. Try enabling voice again');
          }
        }, 500);
      } else if (message.error === 'not-supported') {
        voiceStatusDiv.textContent = '❌ Speech API not supported';
        voiceStatusDiv.className = 'voice-status error';
        enableVoiceCheckbox.disabled = true;
      } else {
        voiceStatusDiv.textContent = '⚠️ Error: ' + message.error;
        voiceStatusDiv.className = 'voice-status error';
      }
      break;

    case 'voice-enabled':
      if (message.success) {
        voiceStatusDiv.textContent = '✅ Voice enabled';
        voiceStatusDiv.className = 'voice-status listening';
        enableVoiceCheckbox.checked = true;
        state.voiceEnabled = true;
      }
      break;

    case 'voice-error':
      enableVoiceCheckbox.checked = false;
      state.voiceEnabled = false;
      
      if (message.errorName === 'NotAllowedError' || message.error === 'NotAllowedError') {
        voiceStatusDiv.innerHTML = '❌ Permission denied<br><small>Please allow microphone when prompted</small>';
      } else if (message.errorName === 'NotFoundError') {
        voiceStatusDiv.innerHTML = '❌ No microphone<br><small>Connect a microphone and try again</small>';
      } else {
        voiceStatusDiv.innerHTML = `❌ Error<br><small>${message.error || 'Unknown error'}</small>`;
      }
      voiceStatusDiv.className = 'voice-status error';
      break;
  }
});

// Initialize on load
init();
