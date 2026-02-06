# Bo's Angels - Predictive Voice Hints

**An accessible Chrome extension that assists users with motor disabilities by predicting click targets and enabling voice-based selection.**

🏆 **Hackathon Project** - Intuition v12  
👥 **Team**: Bo's Angels

---

## 🎯 Problem Statement

Users with motor disabilities (tremors, limited dexterity, motor control issues) struggle with:
- Clicking small UI elements accurately
- Navigating dense interfaces
- Completing tasks quickly without frustration

## 💡 Solution

**Predictive Voice Hints** uses intelligent pointer tracking to predict where users intend to click, displaying numbered hints that can be activated via:
- **Voice commands** ("one", "two", "three")
- **Keyboard shortcuts** (1-6 keys)
- Safety confirmations for risky actions (delete, submit, pay)

## ✨ Key Features

- **🎯 Smart Prediction**: Analyzes pointer direction, velocity, and trajectory to predict likely click targets
- **🎤 Voice Commands**: Hands-free selection by saying "one" through "six"
- **⌨️ Keyboard Fallback**: Press 1-6 keys for non-voice users
- **🛡️ Risk Protection**: Requires confirmation for dangerous actions (delete, pay, submit)
- **🔒 Privacy-First**: All processing runs locally, no data transmission
- **📊 Metrics Tracking**: Logs selection times, misclicks, and usage patterns for evaluation

---

## 🚀 Quick Start (2 Minutes)

### Installation

1. **Clone or Download This Repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Bo-s-Angels.git
   cd Bo-s-Angels
   ```

2. **Load Extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **"Developer mode"** (toggle in top-right corner)
   - Click **"Load unpacked"**
   - Select the `Bo-s-Angels` folder
   - ✅ Extension installed!

3. **Grant Microphone Permission** (for voice commands)
   - Click the extension icon in the Chrome toolbar
   - Toggle **"Enable Voice Commands"** to ON
   - Accept the microphone permission prompt

### First Use

1. Open the included [test-page.html](test-page.html) file in Chrome
2. Click the extension icon and ensure **"Enable Extension"** is checked
3. Move your mouse toward any button - watch numbered hints appear!
4. Try pressing `1`, `2`, `3` on your keyboard or saying **"one"**, **"two"**, **"three"**

**That's it!** The extension is now predicting your intended clicks.

---

## 📖 Usage Guide

---

## 📖 Usage Guide

### How It Works

1. **Move your mouse** toward any area with clickable elements
2. **Numbered hints (1-6)** appear on predicted targets in your path
3. **Select a hint** by pressing the number key or saying the number
4. The element is clicked automatically!

### Input Methods

#### Keyboard Shortcuts
- **1-6**: Select the numbered hint
- **Alt+H**: Toggle hints on/off
- **Enter**: Confirm risky action
- **Escape**: Cancel pending action

#### Voice Commands
- **"one"** through **"six"**: Select the numbered hint
- **"click one"**, **"select two"**: Alternative phrasing
- **"confirm"**: Approve a risky action
- **"cancel"** / **"stop"**: Cancel pending action

### Settings & Customization

Click the **Settings** link in the popup to adjust:
- **Prediction Cone Angle**: 20°-60° (how wide the prediction area is)
- **Detection Distance**: 300-1200px (how far ahead to look)
- **Number of Hints**: 3-9 (how many predictions to show)
- **Stability Duration**: 300-1500ms (how long predictions stay)
- **Badge Size**: Small/Medium/Large/XLarge
- **Risk Confirmation**: Enable/disable safety checks

---

## 🏗️ Repository Structure

---

## 🏗️ Repository Structure

```
Bo-s-Angels/
├── manifest.json              # Chrome extension configuration
├── test-page.html            # Demo page with test scenarios
│
├── background/
│   └── service-worker.js     # Message routing, offscreen lifecycle
│
├── content/                  # Core prediction logic (injected into pages)
│   ├── content-script.js     # Main orchestrator
│   ├── candidates.js         # Clickable element detection
│   ├── pointer.js            # Pointer tracking & cone filtering
│   ├── ranking.js            # Multi-factor scoring & top-K selection
│   ├── risk.js               # Risky action detection
│   ├── overlay.js            # Shadow DOM hint rendering
│   ├── overlay.css           # Hint badge styles
│   ├── input.js              # Keyboard & voice input handling
│   └── logging.js            # Metrics collection & export
│
├── offscreen/               # Persistent voice recognition
│   ├── offscreen.html
│   └── offscreen.js         # Web Speech API integration
│
├── popup/                   # Extension popup UI
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
│
├── options/                 # Settings page
│   ├── options.html
│   ├── options.js
│   └── options.css
│
├── permission/              # Permission handling
│   ├── permission.html
│   └── permission.js
│
└── icons/                   # Extension icons (16px, 48px, 128px)
```

---

## 🔬 Technical Implementation

### Architecture Overview

**1. Candidate Detection** ([candidates.js](content/candidates.js))
- Queries DOM for interactive elements (buttons, links, inputs, etc.)
- Filters hidden/disabled elements
- MutationObserver tracks DOM changes with 300ms debounce
- Caps at 200 elements for performance

**2. Pointer Tracking** ([pointer.js](content/pointer.js))
- Samples mouse position every 50ms (20 Hz) using requestAnimationFrame
- Maintains 600ms position history window
- Computes velocity with weighted moving average
- Creates 40° prediction cone ahead of pointer

**3. Ranking Algorithm** ([ranking.js](content/ranking.js))
- **Alignment Score**: Cosine similarity to pointer direction
- **Distance Score**: Proximity to pointer (inverse)
- **Size Score**: Larger elements ranked higher
- **Priority Score**: Buttons > Links > Inputs
- **Risk Penalty**: Reduces score for dangerous actions
- Hysteresis (800ms) prevents hint flicker

**4. Risk Detection** ([risk.js](content/risk.js))
- Keyword matching: delete, remove, pay, purchase, submit, sign out, etc.
- Checks element text, aria-label, title, and form action URLs
- Requires double confirmation (press twice or say "confirm")

**5. Voice Recognition** ([offscreen/offscreen.js](offscreen/offscreen.js))
- Uses Chrome's Web Speech API (webkitSpeechRecognition)
- Runs in persistent offscreen document to stay active
- Continuous mode with automatic error recovery
- Forwards transcripts to content script via background

**6. UI Overlay** ([overlay.js](content/overlay.js))
- Isolated Shadow DOM prevents style conflicts
- Fixed-position numbered badges (1-6)
- Highlight rings around target elements
- Color coding: Blue (safe), Red (risky)
- Pulse animation during voice listening

### Performance Optimizations

- **Throttled Updates**: 20 Hz refresh rate prevents excessive computation
- **Debounced DOM Observation**: 300ms delay aggregates rapid changes
- **Smart Caching**: Retains valid predictions during hysteresis window
- **Shadow DOM Isolation**: Overlay styles don't affect page performance

### Privacy & Security

- ✅ **No Data Transmission**: All processing runs locally in browser
- ✅ **No User Tracking**: Metrics stored only in local chrome.storage
- ✅ **No Content Capture**: Never logs passwords, form values, or typed text
- ⚠️ **Voice API**: Chrome's Speech API is cloud-backed (Google requirement)

---

## 🧪 Testing & Validation

---

## 🧪 Testing & Validation

### Included Test Page

The [test-page.html](test-page.html) includes multiple test scenarios:
1. **Standard Buttons**: Basic click target prediction
2. **Dense Small Buttons**: Tests accuracy with many small elements
3. **Risky Actions**: Validates confirmation flow (Delete, Pay, Submit)
4. **Form Elements**: Input fields, dropdowns, checkboxes
5. **Navigation Links**: Menu bars and link grids

### Real-World Testing

Test on complex web applications:
- **Gmail**: Dense UI with small buttons
- **GitHub**: Code navigation and file trees
- **Twitter/X**: Feed interactions and buttons
- **Google Docs**: Toolbar buttons and menus

### Metrics Export

1. Use the extension for several minutes
2. Open **Options** page (click Settings in popup)
3. Click **"Export Metrics as JSON"**
4. Analyze:
   - Average selection time
   - Voice vs keyboard usage ratio
   - Misclick count
   - Total pointer travel distance

---

## 🐛 Troubleshooting

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| **No hints appearing** | • Check extension is enabled in popup<br>• Move your mouse (hints only show during movement)<br>• Try refreshing the page<br>• Some sites may have conflicting scripts |
| **Voice not working** | • Check microphone permissions in Chrome<br>• Toggle "Enable Voice Commands" in popup<br>• Requires internet connection (Chrome's Speech API is cloud-based)<br>• Try closing and reopening popup |
| **Performance is slow** | • Open Options → reduce "Number of Hints" (try 3-4)<br>• Increase "Prediction Stability" to 1000ms+<br>• Complex pages (Notion, Figma) may have higher impact |
| **Hints appear in wrong places** | • Adjust "Cone Angle" in Options (try narrower, like 30°)<br>• Reduce "Detection Distance" for nearby elements only |
| **Extension not loading** | • Check Chrome version (requires Manifest V3 support)<br>• Ensure all files are present in folder<br>• Check for errors in `chrome://extensions/` |

---

## 🎓 Use Cases

### Target Users
- **Motor Disabilities**: Tremors, limited dexterity, motor control issues
- **Accessibility Needs**: RSI, arthritis, temporary injuries
- **Power Users**: Anyone wanting faster, hands-free navigation

### Example Scenarios
1. **Email Management**: Quickly navigate Gmail toolbar and thread actions
2. **Code Reviews**: Navigate GitHub file trees and review buttons
3. **Online Shopping**: Browse products and checkout with voice
4. **Social Media**: Interact with feeds hands-free
5. **Form Filling**: Navigate complex forms with keyboard shortcuts

---

## 🤝 Contributing

This is a hackathon project created for **Intuition v12**. Feedback and suggestions are welcome!

### Development Setup

1. Clone the repository
2. Make changes to source files
3. Reload extension in `chrome://extensions/`
4. Test on [test-page.html](test-page.html) and real websites

### Project Structure Tips
- Content scripts are injected into all pages
- Background service worker handles messaging
- Offscreen document enables persistent voice recognition
- Shadow DOM in overlay.js prevents style conflicts

---

## 📄 License

MIT License - Created for Intuition v12 Hackathon

---

## 🏆 Acknowledgments

**Team Bo's Angels** - Intuition v12 Hackathon

Built with:
- Chrome Extension Manifest V3
- Web Speech API (Chrome)
- Shadow DOM
- Chrome Storage API

---

## 📞 Contact

For questions, issues, or feedback about this hackathon project, please open an issue on GitHub.

**Status**: ✅ Fully functional prototype ready for evaluation
