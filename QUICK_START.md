# Quick Start Guide

Get up and running with TopHat AutoJoin & AutoAnswer in 5 minutes!

## 1. Install the Extension

1. Download or clone this repository
2. Open Chrome: `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the extension folder
6. Pin the extension icon to your toolbar

## 2. Add Your First Class

### Option A: From TopHat Page (Recommended)
1. Navigate to your TopHat class page
2. Click the extension icon
3. Click "Add Current Class"
4. The class name and URL will be auto-detected

### Option B: Manual Entry
1. Click the extension icon
2. Click "+ Add New Class"
3. Enter class name (e.g., "Biology 101")
4. Enter TopHat URL (e.g., `https://app.tophat.com/e/123456`)

## 3. Set Schedule

1. Click "Edit" on your class
2. Click "+ Add Time"
3. Select days (Mon, Tue, Wed, etc.)
4. Enter time in 24-hour format:
   - `09:00` for 9:00 AM
   - `14:30` for 2:30 PM
   - `23:45` for 11:45 PM
5. Click "Done"

## 4. Enable Automation

Toggle the switch next to your class to **ON** (blue)

## 5. Test It!

### Test Auto-Answer (Immediate)
1. Navigate to a TopHat page with questions
2. The extension will automatically answer unanswered questions
3. Check browser console (F12) to see activity

### Test Alarm (Scheduled)
1. Set a schedule for 2 minutes from now
2. Wait for the alarm
3. Chrome will automatically open your TopHat class

## Common Time Formats

| You Want | Enter |
|----------|-------|
| 9:00 AM | `09:00` |
| 12:00 PM (noon) | `12:00` |
| 2:30 PM | `14:30` |
| 5:45 PM | `17:45` |
| 11:00 PM | `23:00` |

## Tips

- **Multiple Time Slots**: Click "+ Add Time" multiple times for classes that meet on different days/times
- **Auto-Parse Schedule**: Name your class "Bio MWF 10:00 AM" and the schedule will be auto-detected
- **Disable Temporarily**: Toggle the switch OFF to pause automation without deleting the class
- **Next Alarm**: Check the popup to see when your next class will auto-open

## Troubleshooting

### Extension Not Working?
1. Make sure the class is **enabled** (toggle is blue)
2. Verify you're **logged into TopHat**
3. Check the **URL is correct** in class settings
4. Reload the extension: `chrome://extensions/` → Click refresh icon

### Questions Not Being Answered?
1. Make sure you're on a TopHat page with **unanswered questions**
2. Check browser console (F12) for errors
3. Verify the class is **enabled**

### Alarm Not Triggering?
1. **Chrome must be running** for alarms to work
2. Check "Next Alarm" in popup shows correct time
3. Verify schedule has both **days selected** and **time set**
4. Click "Refresh Alarms" button

## Need More Help?

- Read the full [README.md](README.md)
- Check [INSTALL.md](INSTALL.md) for detailed installation
- See [CONTRIBUTING.md](CONTRIBUTING.md) to report issues

## Example Setup

```
Class: Biology 101 MWF 10:00 AM
URL: https://app.tophat.com/e/123456
Schedule:
  - Days: Mon, Wed, Fri
  - Time: 10:00
Status: Enabled ✓
```

When Monday/Wednesday/Friday at 10:00 AM arrives:
1. Chrome opens TopHat class tab
2. Extension detects unanswered questions
3. Randomly answers each question
4. Moves to next question
5. Repeats until all questions answered

That's it! You're all set up. 🎉
