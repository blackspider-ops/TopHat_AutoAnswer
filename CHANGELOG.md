# Changelog

All notable changes to the TopHat AutoJoin & AutoAnswer extension will be documented in this file.

## [1.0.3] - 2024-11-05

### Added
- Multiple retry attempts after answering (checks 3 times over 13 seconds)
- Important event logging (always visible in console)
- Auto-clear answered questions cache after 30 seconds of inactivity

### Changed
- Increased wait time between questions (3s → 3s, 5s, 5s)
- Better progress tracking to ensure all questions are answered

### Fixed
- Issue where second question might not be detected after answering first

## [1.0.2] - 2024-11-05

### Added
- Support for "Unanswered" status text (Classroom tab)
- Now works in both Content and Classroom tabs

### Changed
- Improved question detection to handle different TopHat layouts

## [1.0.1] - 2024-11-05

### Changed
- Limited answer selection to first 4 options only (ignores 5th option and beyond)

## [1.0.0] - 2024-11-01

### Initial Release

#### Features
- **Auto-Answer System**
  - Automatically detects unanswered questions in TopHat
  - Randomly selects answers from multiple choice options
  - Natural delays (1-4 seconds) between actions
  - Skips already answered questions
  - Handles multiple questions sequentially

- **Alarm & Scheduling**
  - Chrome alarms API for reliable scheduling
  - Weekly recurring alarms
  - Multiple time slots per class
  - Automatic tab opening at scheduled times
  - Support for 24-hour time format (HH:MM)

- **Class Management**
  - Add/edit/delete classes
  - Enable/disable automation per class
  - Auto-detect class info from TopHat pages
  - Auto-parse schedules from class names (e.g., "MWF 10:00 AM")
  - Persistent storage with Chrome sync

- **User Interface**
  - Clean popup for quick access
  - Detailed options page
  - Status indicators (total classes, active classes, next alarm)
  - Collapsible class cards
  - Toggle switches for enable/disable

#### Technical Details
- Chrome Manifest V3 compliant
- Service worker for background tasks
- Content script for DOM manipulation
- MutationObserver for dynamic content detection
- Chrome sync storage for cross-device settings

#### Known Limitations
- Only handles multiple choice questions (radio buttons)
- Requires user to be logged into TopHat
- Chrome must be running for alarms to trigger
- DOM-dependent (may need updates if TopHat changes structure)

### Security & Privacy
- Minimal permissions (alarms, tabs, storage, scripting)
- Only accesses TopHat domains
- No external API calls
- No data collection or tracking
- All data stored locally

### Browser Support
- Chrome 88+ (Manifest V3 support)
- Edge 88+ (Chromium-based)
- Other Chromium browsers with MV3 support
