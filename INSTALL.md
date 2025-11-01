# Installation Guide

## Quick Start

1. **Download** or clone this extension to your computer
2. **Open Chrome** and go to `chrome://extensions/`
3. **Enable "Developer mode"** (toggle in top-right)
4. **Click "Load unpacked"** and select the extension folder
5. **Pin the extension** to your toolbar
6. **Click the extension icon** and select "Open Settings"
7. **Add your classes** with TopHat URLs and schedules

## Detailed Setup

### Step 1: Get the Extension Files
- Download all files to a folder on your computer
- Make sure you have all these files:
  ```
  manifest.json
  background.js
  content.js
  options.html
  options.js
  popup.html
  popup.js
  icons/ (folder with icon files)
  ```

### Step 2: Load in Chrome
1. Open Chrome browser
2. Type `chrome://extensions/` in the address bar
3. Turn on "Developer mode" switch (top-right corner)
4. Click "Load unpacked" button
5. Navigate to your extension folder and select it
6. The extension should now appear in your extensions list

### Step 3: Configure Classes
1. Click the extension icon in your Chrome toolbar
2. Click "Open Settings" button
3. Click "+ Add New Class"
4. Fill in:
   - **Class Name**: e.g., "Biology 101"
   - **TopHat URL**: e.g., `https://app.tophat.com/e/123456`
   - **Schedule**: Select days and time when class meets
5. Make sure the toggle switch is ON (blue)
6. Repeat for additional classes

### Step 4: Test
1. Set a test class for 2-3 minutes in the future
2. Wait for the alarm - Chrome should open your TopHat class
3. If it works, you're all set!

## Troubleshooting

### Extension Won't Load
- Make sure all files are in the same folder
- Check that `manifest.json` is in the root of the folder
- Try refreshing the extensions page

### Classes Don't Open Automatically
- Check that the class toggle is enabled (blue)
- Verify the TopHat URL is correct
- Make sure Chrome is running when the alarm should trigger

### Auto-Answering Not Working
- Make sure you're logged into TopHat
- Check that there are active multiple-choice questions
- Try refreshing the TopHat page

## Getting TopHat Class URLs

1. Log into TopHat in your browser
2. Navigate to your class
3. Copy the URL from the address bar
4. It should look like: `https://app.tophat.com/e/123456`
5. Use this exact URL in the extension settings

## Security Notes

- The extension only works on TopHat pages you're already logged into
- It doesn't store or transmit any personal information
- All data is stored locally in Chrome's sync storage
- You can disable or remove the extension at any time