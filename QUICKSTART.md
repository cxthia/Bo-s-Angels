# Quick Start Guide

## Installation (30 seconds)

1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select this folder: `Bo-s-Angels`
5. ✅ Extension installed!

## First Use (1 minute)

1. **Click the extension icon** (blue "V" in toolbar)
2. **Check "Enable Extension"** is ON
3. **Toggle "Enable Voice Commands"** (accept microphone permission)
4. **Open the test page**: `test-page.html` in Chrome
5. **Move your mouse** toward any button
6. **Watch numbered hints appear** on predicted targets!

## Try It Out

### Keyboard Selection
- Move mouse toward buttons
- Press `1`, `2`, `3`, etc. to select the numbered hint
- Press `Alt+H` to toggle hints on/off

### Voice Selection
- Move mouse toward buttons
- Say **"one"**, **"two"**, **"three"**, etc.
- For risky buttons (Delete, Pay), say **"confirm"**

### Test Scenarios

**Easy targets** → Standard Buttons section  
**Small targets** → Dense Small Buttons section  
**Risk confirmation** → Risky Actions section  
**Form inputs** → Form Elements section  

## Troubleshooting

**No hints appearing?**
- Check extension is enabled in popup
- Move your mouse (hints only show during movement)
- Try refreshing the page

**Voice not working?**
- Check microphone permission in browser
- Look for "Listening" indicator in popup
- Ensure internet connection (Chrome's API is cloud-backed)
- Try closing and reopening the popup

**Performance slow?**
- Open Options → reduce "Number of Hints"
- Increase "Prediction Stability"
- Some complex pages may impact performance

## Customization

Click **Settings** in popup to adjust:
- Prediction cone angle
- Detection distance
- Number of hints (3-9)
- Badge size
- Risk confirmation toggle

## Demo Tips

1. **Show the problem**: Try clicking small buttons without the extension
2. **Enable extension**: Show hints appearing as you move
3. **Demonstrate voice**: Say numbers to select
4. **Show risk safety**: Try deleting something - requires confirmation
5. **Export metrics**: Show improved selection times and reduced misclicks

## Files Overview

```
manifest.json          → Extension config
background/            → Message routing
content/               → Core prediction logic (8 files)
offscreen/             → Persistent voice recognition
popup/                 → Extension popup UI
options/               → Settings page
test-page.html         → Demo page with test scenarios
```

## Next Steps

- Test on real websites (Gmail, GitHub, etc.)
- Customize settings in Options page
- Export metrics to show improvement
- Share feedback for improvements!

---

**Need help?** Check [README.md](README.md) for detailed documentation  
**Implementation details?** See [IMPLEMENTATION.md](IMPLEMENTATION.md)
