// service-worker.js - Background service worker for message routing and offscreen management

let offscreenDocumentExists = false;
let extensionEnabled = true;
let voiceEnabled = false;

// Initialize extension state
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Background] Extension installed');
  
  // Set default settings
  await chrome.storage.local.set({
    enabled: true,
    voiceEnabled: false,
    settings: {
      coneAngle: 40,
      maxDistance: 600,
      topK: 6,
      hysteresis: 800,
      riskConfirmation: true
    }
  });
});

// Handle keyboard command
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-hints') {
    toggleHints();
  }
});

async function toggleHints() {
  extensionEnabled = !extensionEnabled;
  await chrome.storage.local.set({ enabled: extensionEnabled });
  
  // Notify all tabs
  const tabs = await chrome.tabs.query({});
  tabs.forEach(tab => {
    chrome.tabs.sendMessage(tab.id, {
      type: 'toggle-hints',
      enabled: extensionEnabled
    }).catch(() => {
      // Tab might not have content script
    });
  });
}

// Manage offscreen document
async function createOffscreenDocument() {
  if (offscreenDocumentExists) {
    return;
  }

  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen/offscreen.html',
      reasons: ['USER_MEDIA'],
      justification: 'Speech recognition requires DOM access for microphone'
    });
    offscreenDocumentExists = true;
    console.log('[Background] Offscreen document created');
  } catch (error) {
    console.error('[Background] Error creating offscreen document:', error);
  }
}

async function closeOffscreenDocument() {
  if (!offscreenDocumentExists) {
    return;
  }

  try {
    await chrome.offscreen.closeDocument();
    offscreenDocumentExists = false;
    console.log('[Background] Offscreen document closed');
  } catch (error) {
    console.error('[Background] Error closing offscreen document:', error);
  }
}

// Handle messages from popup, offscreen, and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Received message:', message.type, 'from', sender.tab ? 'tab' : 'extension');

  switch (message.type) {
    case 'enable-extension':
      handleEnableExtension(message.enabled, sendResponse);
      break;

    case 'enable-voice':
      handleEnableVoice(message.enabled, sendResponse);
      break;

    case 'speech-result':
      handleSpeechResult(message, sendResponse);
      break;

    case 'speech-started':
    case 'speech-stopped':
    case 'speech-error':
      broadcastToPopup(message);
      sendResponse({ success: true });
      break;

    case 'heartbeat':
      // Keep offscreen alive
      sendResponse({ success: true });
      break;

    case 'get-state':
      sendResponse({
        enabled: extensionEnabled,
        voiceEnabled: voiceEnabled
      });
      break;

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }

  return true; // Keep message channel open for async responses
});

async function handleEnableExtension(enabled, sendResponse) {
  extensionEnabled = enabled;
  await chrome.storage.local.set({ enabled: enabled });
  
  // Notify all tabs
  const tabs = await chrome.tabs.query({});
  tabs.forEach(tab => {
    chrome.tabs.sendMessage(tab.id, {
      type: 'toggle-hints',
      enabled: enabled
    }).catch(() => {});
  });

  sendResponse({ success: true });
}

async function handleEnableVoice(enabled, sendResponse) {
  voiceEnabled = enabled;
  await chrome.storage.local.set({ voiceEnabled: enabled });

  if (enabled) {
    // Create offscreen document and start listening
    await createOffscreenDocument();
    
    // Wait a bit for offscreen to initialize
    setTimeout(async () => {
      try {
        await chrome.runtime.sendMessage({ type: 'start-speech' });
        sendResponse({ success: true });
      } catch (error) {
        console.error('[Background] Error starting speech:', error);
        sendResponse({ success: false, error: error.message });
      }
    }, 500);
  } else {
    // Stop listening
    try {
      await chrome.runtime.sendMessage({ type: 'stop-speech' });
      // Don't close offscreen immediately - keep it for quick restart
      sendResponse({ success: true });
    } catch (error) {
      console.error('[Background] Error stopping speech:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
}

async function handleSpeechResult(message, sendResponse) {
  // Route speech result to active tab
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      await chrome.tabs.sendMessage(tabs[0].id, {
        type: 'voice-command',
        transcript: message.transcript,
        isFinal: message.isFinal,
        confidence: message.confidence
      });
    }
    sendResponse({ success: true });
  } catch (error) {
    console.error('[Background] Error routing speech result:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function broadcastToPopup(message) {
  // Send to popup if it's open
  try {
    await chrome.runtime.sendMessage(message);
  } catch (error) {
    // Popup might not be open
  }
}

// Clean up on extension unload
chrome.runtime.onSuspend.addListener(() => {
  console.log('[Background] Extension suspending, cleaning up');
  closeOffscreenDocument();
});

console.log('[Background] Service worker initialized');
