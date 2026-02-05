// offscreen.js - Persistent voice recognition in offscreen document

let recognition = null;
let isListening = false;

// Initialize speech recognition
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    console.error('[Offscreen] Web Speech API not supported');
    chrome.runtime.sendMessage({
      type: 'speech-error',
      error: 'not-supported'
    });
    return null;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    console.log('[Offscreen] Speech recognition started');
    chrome.runtime.sendMessage({ type: 'speech-started' });
  };

  recognition.onresult = (event) => {
    const result = event.results[event.results.length - 1];
    const transcript = result[0].transcript.trim();
    const isFinal = result.isFinal;
    const confidence = result[0].confidence;

    console.log('[Offscreen] Transcript:', transcript, 'Final:', isFinal, 'Confidence:', confidence);

    // Send to background for routing to content script
    chrome.runtime.sendMessage({
      type: 'speech-result',
      transcript: transcript,
      isFinal: isFinal,
      confidence: confidence
    });
  };

  recognition.onerror = (event) => {
    console.error('[Offscreen] Speech recognition error:', event.error);
    
    // Handle specific errors
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      chrome.runtime.sendMessage({
        type: 'speech-error',
        error: 'permission-denied'
      });
    } else if (event.error === 'network') {
      // Retry after network error
      setTimeout(() => {
        if (isListening) {
          startListening();
        }
      }, 1000);
    } else {
      chrome.runtime.sendMessage({
        type: 'speech-error',
        error: event.error
      });
    }
  };

  recognition.onend = () => {
    console.log('[Offscreen] Speech recognition ended');
    
    // Auto-restart if still supposed to be listening
    if (isListening) {
      console.log('[Offscreen] Restarting recognition...');
      setTimeout(() => {
        if (isListening) {
          startListening();
        }
      }, 100);
    } else {
      chrome.runtime.sendMessage({ type: 'speech-stopped' });
    }
  };

  return recognition;
}

function startListening() {
  if (!recognition) {
    recognition = initSpeechRecognition();
  }

  if (!recognition) {
    return;
  }

  try {
    isListening = true;
    recognition.start();
  } catch (error) {
    console.error('[Offscreen] Error starting recognition:', error);
    // Recognition might already be running
    if (error.name !== 'InvalidStateError') {
      chrome.runtime.sendMessage({
        type: 'speech-error',
        error: error.message
      });
    }
  }
}

function stopListening() {
  isListening = false;
  
  if (recognition) {
    try {
      recognition.stop();
    } catch (error) {
      console.error('[Offscreen] Error stopping recognition:', error);
    }
  }
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Offscreen] Received message:', message.type);

  switch (message.type) {
    case 'start-speech':
      startListening();
      sendResponse({ success: true });
      break;

    case 'stop-speech':
      stopListening();
      sendResponse({ success: true });
      break;

    case 'speech-status':
      sendResponse({ isListening: isListening });
      break;

    default:
      sendResponse({ success: false, error: 'Unknown command' });
  }

  return true; // Keep message channel open for async response
});

// Heartbeat to keep offscreen document alive
setInterval(() => {
  chrome.runtime.sendMessage({ type: 'heartbeat' });
}, 20000); // Every 20 seconds

console.log('[Offscreen] Voice recognition offscreen document loaded');
