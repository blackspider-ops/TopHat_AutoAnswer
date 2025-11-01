# TopHat AutoJoin & AutoAnswer

> A Chrome Manifest V3 extension that automatically joins TopHat classes at scheduled times and answers multiple-choice questions with randomized responses.

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?logo=google-chrome)](https://github.com/yourusername/tophat-autojoin)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## ⚠️ Disclaimer

This extension is for **educational and accessibility purposes only**. Users are responsible for:
- Following their institution's academic integrity policies
- Complying with TopHat's terms of service
- Understanding that automated participation may not reflect actual learning

---

## Features

### 🕒 Automatic Class Joining
- Schedule classes with specific days and times
- Automatically opens TopHat class URLs when alarms trigger
- Focuses existing tabs or creates new ones as needed
- Weekly recurring alarms with chrome.alarms API

### 🤖 Intelligent Auto-Answering
- Monitors TopHat pages for new multiple-choice questions
- Randomly selects and submits answers with realistic delays (1-4 seconds)
- Prevents double-answering the same question
- Works with polls and multiple-choice question types

### ⚙️ Easy Configuration
- Clean options page for managing multiple classes
- Toggle automation on/off per class
- Multiple time slots per class supported
- Data synced across Chrome instances

### 🛡️ Robust & Safe
- Only works when user is logged into TopHat
- Graceful handling of page navigation and DOM changes
- Minimal permissions required
- Debug logging available for troubleshooting

## Installation

### From Source (Development)

1. **Clone or download** this repository to your local machine

2. **Open Chrome** and navigate to `chrome://extensions/`

3. **Enable Developer Mode** by toggling the switch in the top-right corner

4. **Click "Load unpacked"** and select the extension folder

5. **Pin the extension** to your toolbar for easy access

### After Making Changes

If you modify the extension code:
1. Go to `chrome://extensions/`
2. Click the **refresh icon** on the extension card
3. The extension will reload with your changes

### Required Icons
The extension expects icon files in the `icons/` directory:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels) 
- `icon128.png` (128x128 pixels)

You can create simple icons or use placeholder images for development.

## Setup & Usage

### 1. Configure Classes

1. **Click the extension icon** in your Chrome toolbar
2. **Click "Open Settings"** to access the options page
3. **Click "+ Add New Class"** to create a new class entry
4. **Fill in the details:**
   - **Class Name**: A descriptive name (e.g., "Biology 101")
   - **TopHat Class URL**: The full URL to your TopHat class (e.g., `https://app.tophat.com/e/123456`)
   - **Schedule**: Select days of the week and set the class time

### 2. Enable Automation

- **Toggle the switch** next to each class to enable/disable automation
- **Active classes** will show in green in the popup
- **Disabled classes** will show in red

### 3. Test the Setup

1. **Set a test alarm** for a few minutes in the future
2. **Wait for the alarm** - Chrome should automatically open your TopHat class
3. **Navigate to a class** with active questions to test auto-answering
4. **Check the browser console** (F12) for debug logs if needed

## How It Works

### Scheduling System
- Uses Chrome's `chrome.alarms` API for reliable scheduling
- Creates weekly recurring alarms for each enabled class
- Automatically handles daylight saving time changes
- Alarms persist even when Chrome is closed

### Auto-Answering Logic
- **DOM Monitoring**: Uses MutationObserver to detect new questions
- **Question Detection**: Looks for common TopHat question container selectors
- **Smart Delays**: Randomized 1-4 second delays to appear more natural
- **Answer Selection**: Randomly chooses from available multiple-choice options
- **Duplicate Prevention**: Tracks answered questions to avoid double-submission

### Content Script Selectors
The extension looks for these DOM elements (may need adjustment for TopHat updates):

```javascript
const QUESTION_SELECTORS = {
  container: '[data-testid="question-container"], .question-container, .poll-container',
  options: 'input[type="radio"], input[type="checkbox"], .option-button, .poll-option',
  submitButton: 'button[type="submit"], .submit-button, .answer-submit, [data-testid="submit-answer"]',
  questionId: '[data-question-id], [data-testid="question-id"]'
};
```

## Permissions Explained

The extension requires these permissions:

- **`alarms`**: Schedule automatic class joining
- **`tabs`**: Open and focus TopHat class tabs
- **`storage`**: Save class configurations and settings
- **`scripting`**: Inject content scripts for auto-answering
- **`https://app.tophat.com/*`**: Access TopHat pages for automation

## Troubleshooting

### Classes Not Opening Automatically
1. **Check alarm status** in the popup - should show "Next Alarm" time
2. **Verify class is enabled** (green toggle in settings)
3. **Confirm correct URL** format in class settings
4. **Check Chrome notifications** are enabled for the extension

### Auto-Answering Not Working
1. **Enable debug mode** by setting `DEBUG = true` in `content.js`
2. **Open browser console** (F12) on TopHat page
3. **Look for extension logs** starting with `[TopHat Content]`
4. **Verify you're logged into TopHat** and can see questions manually
5. **Check if question selectors** match TopHat's current DOM structure

### General Issues
1. **Reload the extension** from `chrome://extensions/`
2. **Check for Chrome updates** - MV3 features require recent versions
3. **Verify permissions** are granted in extension details
4. **Clear extension storage** and reconfigure if needed

## Development

### File Structure
```
tophat-extension/
├── manifest.json          # Extension manifest (MV3)
├── background.js          # Service worker for alarms/tabs
├── content.js            # DOM monitoring and auto-answering
├── options.html          # Settings page UI
├── options.js            # Settings page logic
├── popup.html            # Extension popup UI
├── popup.js              # Popup functionality
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # This file
```

### Debug Mode
Debug logging is disabled by default. To enable it, set `DEBUG = true` in:
- `background.js` (line 3) - For alarm and tab management logs
- `content.js` (line 3) - For question detection and answering logs

After enabling, reload the extension and check:
- Service worker console: `chrome://extensions/` → Click "service worker"
- Page console: F12 on TopHat pages

### Customizing Selectors
If TopHat updates their DOM structure, update the selectors in `content.js`:

```javascript
const QUESTION_SELECTORS = {
  container: 'your-new-selector',
  options: 'your-option-selector',
  submitButton: 'your-submit-selector',
  questionId: 'your-id-selector'
};
```

## Limitations

- **Multiple Choice Only**: Only handles radio buttons, checkboxes, and clickable options
- **Login Required**: User must be logged into TopHat; extension won't handle authentication
- **DOM Dependent**: May break if TopHat significantly changes their page structure
- **Chrome Only**: Designed for Chromium-based browsers (Chrome, Edge, etc.)

## Legal & Ethical Considerations

This extension is for educational and accessibility purposes. Users are responsible for:
- **Following their institution's academic integrity policies**
- **Using the extension in compliance with TopHat's terms of service**
- **Understanding that automated participation may not reflect actual learning**

## Support

For issues or questions:
1. **Check the troubleshooting section** above
2. **Enable debug mode** and check console logs
3. **Verify TopHat hasn't changed their page structure**
4. **Test with a simple manual question** first

## 🚀 Quick Start

New to the extension? Check out the [Quick Start Guide](QUICK_START.md) to get up and running in 5 minutes!

## 📦 Installation

See [INSTALL.md](INSTALL.md) for detailed installation instructions.

**Quick Install:**
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension folder
5. Pin the extension to your toolbar

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and changes.

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.