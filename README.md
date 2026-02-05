# Bo-s-Angels - Predictive Voice Hints

A Chrome extension that assists users with motor disabilities by predicting click targets based on pointer movement and enabling voice-based selection.

## Features

- **Smart Prediction**: Uses pointer direction and velocity to predict intended click targets
- **Voice Commands**: Select elements by saying "one" through "six" or "click [number]"
- **Keyboard Fallback**: Press 1-6 keys to select numbered hints
- **Risk Confirmation**: Requires confirmation for dangerous actions (delete, pay, submit)
- **On-Device Processing**: Candidate detection and ranking runs locally
- **Metrics Tracking**: Logs selection times, misclicks, and usage patterns

## Installation

1. **Load Extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `Bo-s-Angels` folder

2. **Grant Microphone Permission** (for voice):
   - Click the extension icon
   - Toggle "Enable Voice Commands"
   - Accept the microphone permission prompt when asked

## Usage

### Quick Start

1. Click the extension icon to open the popup
2. Ensure "Enable Extension" is checked
3. Navigate to any webpage and move your mouse
4. When hints appear, press 1-6 on keyboard or say "one" through "six"

### Keyboard Shortcuts

- **Alt+H**: Toggle hint overlay
- **1-6**: Select numbered hint
- **Enter**: Confirm risky action
- **Escape**: Cancel pending selection

### Voice Commands

- **"one"** through **"six"**: Select the numbered hint
- **"click one"**, **"select two"**: Alternative syntax
- **"confirm"**: Confirm a risky action
- **"cancel"** / **"stop"**: Cancel pending action

### Settings

Open the options page to customize:
- Prediction cone angle (20°-60°)
- Maximum detection distance (300-1200px)
- Number of hints shown (3-9)
- Prediction stability duration
- Badge size
- Risk confirmation toggle

## Architecture

```
Bo-s-Angels/
├── manifest.json           # Extension configuration
├── background/
│   └── service-worker.js  # Message routing, offscreen lifecycle
├── content/
│   ├── content-script.js  # Main orchestrator
│   ├── candidates.js      # Clickable element detection
│   ├── pointer.js         # Pointer tracking & cone filtering
│   ├── ranking.js         # Scoring & top-K selection
│   ├── risk.js            # Risky action detection
│   ├── overlay.js         # Shadow DOM hint rendering
│   ├── overlay.css        # Hint styles
│   ├── input.js           # Keyboard & voice input handling
│   └── logging.js         # Metrics collection
├── offscreen/
│   ├── offscreen.html     # Persistent voice recognition
│   └── offscreen.js       # Web Speech API integration
├── popup/
│   ├── popup.html         # Extension popup UI
│   ├── popup.js
│   └── popup.css
├── options/
│   ├── options.html       # Settings page
│   ├── options.js
│   └── options.css
└── icons/                 # Extension icons
```

## Testing

### Manual Test Cases

1. **Dense UI Navigation**:
   - Visit a page with many small buttons (e.g., Gmail, GitHub)
   - Move mouse toward target area
   - Verify hints appear on likely targets
   - Select using keyboard or voice

2. **Risk Confirmation**:
   - Find a "Delete" or "Submit" button
   - Say the button's number
   - Verify confirmation is required (say "confirm" or press number twice)

3. **Voice Recognition**:
   - Enable voice in popup
   - Verify "Listening" indicator appears
   - Speak commands and verify they execute

4. **Performance**:
   - Test on heavy pages (e.g., Notion, Figma)
   - Verify no noticeable lag when moving mouse
   - Check that hints update smoothly

### Export Metrics

1. Use the extension for a few minutes
2. Open Options page
3. Click "Export Metrics as JSON"
4. Analyze selection times, voice vs keyboard usage, etc.

## Development Notes

### Key Components

- **Candidate Detection**: Queries DOM for interactive elements every 300ms when changes detected
- **Pointer Tracking**: Samples positions every 50ms, maintains 600ms history window
- **Cone Filtering**: Filters elements within 40° cone ahead of pointer direction
- **Scoring**: Combines alignment, distance, size, element type, and risk penalty
- **Hysteresis**: Keeps predictions stable for 800ms to prevent flicker
- **Offscreen Document**: Enables persistent voice recognition while popup is closed

### Performance Considerations

- Candidate count capped at 200 elements
- Prediction updates throttled to 20 Hz via requestAnimationFrame
- MutationObserver debounced with 300ms delay
- Shadow DOM isolates overlay styles from page

### Privacy

- No network transmission of user behavior
- Metrics stored locally in chrome.storage
- No capture of typed content, passwords, or form values
- Voice recognition uses browser's built-in API (cloud-backed by Chrome)

## Troubleshooting

**Hints not appearing**:
- Check extension is enabled in popup
- Verify you're moving the mouse (hints only appear during movement)
- Some sites may have conflicting styles or scripts

**Voice not working**:
- Check microphone permissions in browser
- Ensure "Enable Voice Commands" is toggled in popup
- Try refreshing the page
- Chrome's Speech API requires internet connection

**Performance issues**:
- Try reducing "Number of Hints" in settings
- Increase "Prediction Stability" to reduce updates
- Some complex web apps may have performance impact

## License

Hackathon project - MIT License
