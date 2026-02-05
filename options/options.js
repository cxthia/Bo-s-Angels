// options.js - Options page logic

const DEFAULT_SETTINGS = {
  coneAngle: 40,
  maxDistance: 600,
  topK: 6,
  hysteresis: 800,
  riskConfirmation: true,
  badgeSize: 'medium'
};

let currentSettings = { ...DEFAULT_SETTINGS };

// DOM elements
const coneAngleInput = document.getElementById('coneAngle');
const coneAngleValue = document.getElementById('coneAngleValue');
const maxDistanceInput = document.getElementById('maxDistance');
const maxDistanceValue = document.getElementById('maxDistanceValue');
const topKInput = document.getElementById('topK');
const topKValue = document.getElementById('topKValue');
const hysteresisInput = document.getElementById('hysteresis');
const hysteresisValue = document.getElementById('hysteresisValue');
const riskConfirmationCheckbox = document.getElementById('riskConfirmation');
const badgeSizeSelect = document.getElementById('badgeSize');
const exportBtn = document.getElementById('exportBtn');
const clearBtn = document.getElementById('clearBtn');
const resetBtn = document.getElementById('resetBtn');
const saveStatus = document.getElementById('saveStatus');
const metricsInfo = document.getElementById('metricsInfo');

// Initialize
async function init() {
  await loadSettings();
  updateUI();
  await loadMetricsInfo();
  setupListeners();
}

// Load settings from storage
async function loadSettings() {
  const result = await chrome.storage.local.get(['settings']);
  if (result.settings) {
    currentSettings = { ...DEFAULT_SETTINGS, ...result.settings };
  }
}

// Update UI with current settings
function updateUI() {
  coneAngleInput.value = currentSettings.coneAngle;
  coneAngleValue.textContent = currentSettings.coneAngle;
  
  maxDistanceInput.value = currentSettings.maxDistance;
  maxDistanceValue.textContent = currentSettings.maxDistance;
  
  topKInput.value = currentSettings.topK;
  topKValue.textContent = currentSettings.topK;
  
  hysteresisInput.value = currentSettings.hysteresis;
  hysteresisValue.textContent = currentSettings.hysteresis;
  
  riskConfirmationCheckbox.checked = currentSettings.riskConfirmation;
  badgeSizeSelect.value = currentSettings.badgeSize;
}

// Setup event listeners
function setupListeners() {
  coneAngleInput.addEventListener('input', (e) => {
    coneAngleValue.textContent = e.target.value;
    currentSettings.coneAngle = parseInt(e.target.value);
    saveSettings();
  });

  maxDistanceInput.addEventListener('input', (e) => {
    maxDistanceValue.textContent = e.target.value;
    currentSettings.maxDistance = parseInt(e.target.value);
    saveSettings();
  });

  topKInput.addEventListener('input', (e) => {
    topKValue.textContent = e.target.value;
    currentSettings.topK = parseInt(e.target.value);
    saveSettings();
  });

  hysteresisInput.addEventListener('input', (e) => {
    hysteresisValue.textContent = e.target.value;
    currentSettings.hysteresis = parseInt(e.target.value);
    saveSettings();
  });

  riskConfirmationCheckbox.addEventListener('change', (e) => {
    currentSettings.riskConfirmation = e.target.checked;
    saveSettings();
  });

  badgeSizeSelect.addEventListener('change', (e) => {
    currentSettings.badgeSize = e.target.value;
    saveSettings();
  });

  exportBtn.addEventListener('click', exportMetrics);
  clearBtn.addEventListener('click', clearMetrics);
  resetBtn.addEventListener('click', resetSettings);
}

// Save settings to storage
async function saveSettings() {
  console.log('[Options] Saving settings:', currentSettings);
  await chrome.storage.local.set({ settings: currentSettings });
  console.log('[Options] Settings saved to storage');
  showSaveStatus('Settings saved');
}

// Show save status message
function showSaveStatus(message) {
  saveStatus.textContent = message;
  saveStatus.className = 'save-status show';
  
  setTimeout(() => {
    saveStatus.className = 'save-status';
  }, 2000);
}

// Export metrics
async function exportMetrics() {
  try {
    const result = await chrome.storage.local.get(['metricsHistory']);
    const metrics = result.metricsHistory || [];
    
    if (metrics.length === 0) {
      showSaveStatus('No metrics to export');
      return;
    }

    const blob = new Blob([JSON.stringify(metrics, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice-hints-metrics-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    showSaveStatus('Metrics exported');
  } catch (error) {
    console.error('[Options] Error exporting metrics:', error);
    showSaveStatus('Error exporting metrics');
  }
}

// Clear metrics
async function clearMetrics() {
  if (!confirm('Are you sure you want to clear all metrics? This cannot be undone.')) {
    return;
  }

  try {
    await chrome.storage.local.set({ metricsHistory: [] });
    showSaveStatus('Metrics cleared');
    await loadMetricsInfo();
  } catch (error) {
    console.error('[Options] Error clearing metrics:', error);
    showSaveStatus('Error clearing metrics');
  }
}

// Reset settings to default
async function resetSettings() {
  if (!confirm('Are you sure you want to reset all settings to default?')) {
    return;
  }

  currentSettings = { ...DEFAULT_SETTINGS };
  updateUI();
  await saveSettings();
  showSaveStatus('Settings reset to default');
}

// Load and display metrics info
async function loadMetricsInfo() {
  try {
    const result = await chrome.storage.local.get(['metricsHistory']);
    const metrics = result.metricsHistory || [];
    
    if (metrics.length === 0) {
      metricsInfo.innerHTML = '<p>No metrics collected yet</p>';
      return;
    }

    const totalSessions = metrics.length;
    const totalSelections = metrics.reduce((sum, m) => sum + (m.selections?.length || 0), 0);
    const totalVoice = metrics.reduce((sum, m) => sum + (m.voiceCommands || 0), 0);
    const totalKeyboard = metrics.reduce((sum, m) => sum + (m.keyboardCommands || 0), 0);

    metricsInfo.innerHTML = `
      <p><strong>Total Sessions:</strong> ${totalSessions}</p>
      <p><strong>Total Selections:</strong> ${totalSelections}</p>
      <p><strong>Voice Commands:</strong> ${totalVoice}</p>
      <p><strong>Keyboard Commands:</strong> ${totalKeyboard}</p>
    `;
  } catch (error) {
    console.error('[Options] Error loading metrics:', error);
    metricsInfo.innerHTML = '<p>Error loading metrics</p>';
  }
}

// Initialize on load
init();
