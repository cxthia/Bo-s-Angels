// permission.js - Handles microphone permission request via iframe

console.log("[Permission] Permission page loaded");

async function requestMicrophonePermission() {
  try {
    console.log("[Permission] Requesting microphone access...");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    console.log("[Permission] Microphone access granted!");
    
    // Stop all tracks - we just needed permission
    stream.getTracks().forEach(track => track.stop());
    
    // Notify background that permission was granted
    console.log("[Permission] Sending permission-granted message to background...");
    chrome.runtime.sendMessage({
      type: "permission-granted",
      permission: "microphone"
    }).then(response => {
      console.log("[Permission] Background response:", response);
    }).catch(error => {
      console.error("[Permission] Failed to send to background:", error);
    });
    
  } catch (error) {
    console.error("[Permission] Microphone permission error:", error.name, error.message);
    
    // Notify background of the error
    chrome.runtime.sendMessage({
      type: "permission-denied",
      permission: "microphone",
      error: error.name,
      message: error.message
    });
  }
}

// Request permission when page loads
requestMicrophonePermission();
