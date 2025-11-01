// Background service worker for TopHat AutoJoin & AutoAnswer

const DEBUG = false;

function log(...args) {
  if (DEBUG) {
    console.log('[TopHat Extension]', ...args);
  }
}

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  log('Extension installed');
  setupAlarms();
});

chrome.runtime.onStartup.addListener(() => {
  log('Extension startup');
  setupAlarms();
});

// Setup alarms based on stored classes
async function setupAlarms() {
  try {
    const { classes = [] } = await chrome.storage.sync.get('classes');
    
    // Clear existing alarms
    await chrome.alarms.clearAll();
    
    // Create alarms for enabled classes
    classes.forEach(classItem => {
      if (classItem.enabled && classItem.schedule) {
        createAlarmsForClass(classItem);
      }
    });
    
    log('Alarms setup complete');
  } catch (error) {
    console.error('Error setting up alarms:', error);
  }
}

function createAlarmsForClass(classItem) {
  const { id, name, schedule } = classItem;
  
  schedule.forEach(scheduleItem => {
    const { days, time } = scheduleItem;
    
    days.forEach(day => {
      const alarmName = `class_${id}_${day}_${time.replace(':', '')}`;
      
      // Calculate next occurrence
      const nextAlarmTime = getNextAlarmTime(day, time);
      
      if (nextAlarmTime) {
        chrome.alarms.create(alarmName, {
          when: nextAlarmTime,
          periodInMinutes: 7 * 24 * 60 // Weekly repeat
        });
        
        log(`Created alarm: ${alarmName} for ${new Date(nextAlarmTime)}`);
      }
    });
  });
}

function getNextAlarmTime(dayOfWeek, time) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const targetDay = days.indexOf(dayOfWeek.toLowerCase());
  
  if (targetDay === -1) {
    log(`Invalid day: ${dayOfWeek}`);
    return null;
  }
  
  // Parse time - handle both 24-hour (HH:MM) and 12-hour (HH:MM AM/PM) formats
  let hours, minutes;
  
  if (time.includes('AM') || time.includes('PM')) {
    // 12-hour format
    const isPM = time.includes('PM');
    const timeOnly = time.replace(/\s*(AM|PM)/i, '').trim();
    [hours, minutes] = timeOnly.split(':').map(Number);
    
    if (isPM && hours !== 12) {
      hours += 12;
    } else if (!isPM && hours === 12) {
      hours = 0;
    }
  } else {
    // 24-hour format
    [hours, minutes] = time.split(':').map(Number);
  }
  
  if (isNaN(hours) || isNaN(minutes)) {
    log(`Invalid time format: ${time}`);
    return null;
  }
  
  const now = new Date();
  const target = new Date();
  
  // Set target time
  target.setHours(hours, minutes, 0, 0);
  
  // Calculate days until target day
  const currentDay = now.getDay();
  let daysUntil = targetDay - currentDay;
  
  if (daysUntil < 0 || (daysUntil === 0 && now > target)) {
    daysUntil += 7; // Next week
  }
  
  target.setDate(now.getDate() + daysUntil);
  
  log(`Next alarm for ${dayOfWeek} at ${time}: ${target.toLocaleString()}`);
  
  return target.getTime();
}

// Handle alarm triggers
chrome.alarms.onAlarm.addListener(async (alarm) => {
  log('Alarm triggered:', alarm.name);
  
  try {
    const { classes = [] } = await chrome.storage.sync.get('classes');
    
    // Parse alarm name to get class info
    const match = alarm.name.match(/^class_(\d+)_/);
    if (!match) return;
    
    const classId = parseInt(match[1]);
    const classItem = classes.find(c => c.id === classId);
    
    if (!classItem || !classItem.enabled) {
      log('Class not found or disabled:', classId);
      return;
    }
    
    await openClassTab(classItem);
    
  } catch (error) {
    console.error('Error handling alarm:', error);
  }
});

async function openClassTab(classItem) {
  try {
    const { url, name } = classItem;
    
    // Check if tab with this URL is already open
    const tabs = await chrome.tabs.query({ url: url + '*' });
    
    if (tabs.length > 0) {
      // Focus existing tab
      await chrome.tabs.update(tabs[0].id, { active: true });
      await chrome.windows.update(tabs[0].windowId, { focused: true });
      log(`Focused existing tab for ${name}`);
    } else {
      // Create new tab
      await chrome.tabs.create({ url, active: true });
      log(`Opened new tab for ${name}`);
    }
    
  } catch (error) {
    console.error('Error opening class tab:', error);
  }
}

// Listen for storage changes to update alarms
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.classes) {
    log('Classes updated, refreshing alarms');
    setupAlarms();
  }
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'refreshAlarms') {
    setupAlarms().then(() => {
      sendResponse({ success: true });
    });
    return true; // Keep message channel open for async response
  }
});