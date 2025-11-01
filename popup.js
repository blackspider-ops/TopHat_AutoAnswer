// Popup script for TopHat AutoJoin & AutoAnswer

let classes = [];
let nextClassId = 1;

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' }
];

document.addEventListener('DOMContentLoaded', () => {
  // Initialize immediately with event listeners
  document.getElementById('add-class').addEventListener('click', addNewClass);
  document.getElementById('add-current-class').addEventListener('click', addCurrentClass);
  document.getElementById('refresh-alarms').addEventListener('click', refreshAlarms);
  
  // Add event delegation for dynamically created schedule elements
  document.addEventListener('change', (e) => {
    e.stopPropagation(); // Prevent event bubbling
    
    if (e.target.classList.contains('day-checkbox-input')) {
      const classId = parseInt(e.target.getAttribute('data-class-id'));
      const scheduleIndex = parseInt(e.target.getAttribute('data-schedule-index'));
      updateScheduleDays(classId, scheduleIndex, e.target);
    }
    
    if (e.target.classList.contains('schedule-time-input')) {
      const classId = parseInt(e.target.getAttribute('data-class-id'));
      const scheduleIndex = parseInt(e.target.getAttribute('data-schedule-index'));
      updateScheduleTime(classId, scheduleIndex, e.target.value);
    }
  });
  
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-schedule-btn')) {
      e.stopPropagation(); // Prevent event bubbling
      const classId = parseInt(e.target.getAttribute('data-class-id'));
      const scheduleIndex = parseInt(e.target.getAttribute('data-schedule-index'));
      removeScheduleItem(classId, scheduleIndex);
    }
  });
  
  // Load data progressively without blocking popup display
  initializePopup();
});

async function initializePopup() {
  try {
    // Load classes first (fastest operation)
    await loadClasses();
    renderClasses();
    
    // Update status (requires alarms API call)
    updateStatus();
    
    // Check current tab last (slowest operation)
    checkCurrentTab();
    
  } catch (error) {
    console.error('Error initializing popup:', error);
    // Still render what we can
    renderClasses();
  }
}

async function loadClasses() {
  try {
    const result = await chrome.storage.sync.get(['classes', 'nextClassId']);
    classes = result.classes || [];
    nextClassId = result.nextClassId || 1;
  } catch (error) {
    console.error('Error loading classes:', error);
  }
}

async function saveClasses() {
  try {
    await chrome.storage.sync.set({ 
      classes: classes,
      nextClassId: nextClassId
    });
    
    // Notify background script to refresh alarms
    chrome.runtime.sendMessage({ action: 'refreshAlarms' });
    
    await updateStatus();
  } catch (error) {
    console.error('Error saving classes:', error);
  }
}

async function updateStatus() {
  try {
    const activeClasses = classes.filter(c => c.enabled);
    
    // Update status counters immediately (no async needed)
    document.getElementById('total-classes').textContent = classes.length;
    document.getElementById('active-classes').textContent = activeClasses.length;
    
    // Get next alarm info asynchronously
    updateNextAlarm();
    
  } catch (error) {
    console.error('Error updating status:', error);
  }
}

async function updateNextAlarm() {
  try {
    // Get alarms with timeout
    const alarmsPromise = chrome.alarms.getAll();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Alarms timeout')), 1000)
    );
    
    const alarms = await Promise.race([alarmsPromise, timeoutPromise]);
    
    if (alarms.length === 0) {
      document.getElementById('next-alarm').textContent = 'None';
      return;
    }
    
    const nextAlarm = getNextAlarm(alarms);
    document.getElementById('next-alarm').textContent = nextAlarm || 'None';
    
  } catch (error) {
    console.error('Error getting alarms:', error);
    document.getElementById('next-alarm').textContent = 'Error';
  }
}

function renderClasses() {
  const container = document.getElementById('classes-container');
  container.innerHTML = '';
  
  if (classes.length === 0) {
    container.innerHTML = '<div class="no-classes">No classes configured yet.<br>Click "Add New Class" to get started.</div>';
    return;
  }
  
  classes.forEach(classItem => {
    const classEl = createClassElement(classItem);
    container.appendChild(classEl);
  });
}

function createClassElement(classItem) {
  const div = document.createElement('div');
  div.className = 'class-item collapsed';
  div.setAttribute('data-class-id', classItem.id);
  
  div.innerHTML = `
    <div class="class-header">
      <div class="class-name-display">${classItem.name || 'Unnamed Class'}</div>
      <div class="class-controls">
        <button class="expand-btn" data-class-id="${classItem.id}">Edit</button>
        <label class="toggle-switch">
          <input type="checkbox" ${classItem.enabled ? 'checked' : ''} 
                 data-class-id="${classItem.id}" class="class-toggle">
          <span class="slider"></span>
        </label>
        <button class="btn-danger btn-small remove-btn" data-class-id="${classItem.id}">×</button>
      </div>
    </div>
    
    <div class="class-details">
      <div class="form-group">
        <label>Class Name:</label>
        <input type="text" value="${classItem.name || ''}" 
               data-class-id="${classItem.id}" class="class-name-input"
               placeholder="e.g., Biology 101">
      </div>
      
      <div class="form-group">
        <label>TopHat Class URL:</label>
        <input type="url" value="${classItem.url || ''}" 
               data-class-id="${classItem.id}" class="class-url-input"
               placeholder="https://app.tophat.com/e/123456">
      </div>
      
      <div class="form-group">
        <label>Schedule:</label>
        <div id="schedule-${classItem.id}">
          ${renderSchedule(classItem)}
        </div>
        <button class="btn-secondary btn-small add-schedule-btn" data-class-id="${classItem.id}">+ Add Time</button>
      </div>
    </div>
  `;
  
  // Add event listeners
  const expandBtn = div.querySelector('.expand-btn');
  expandBtn.addEventListener('click', () => toggleClass(classItem.id));
  
  const toggleInput = div.querySelector('.class-toggle');
  toggleInput.addEventListener('change', () => toggleClassEnabled(classItem.id));
  
  const removeBtn = div.querySelector('.remove-btn');
  removeBtn.addEventListener('click', () => removeClass(classItem.id));
  
  const nameInput = div.querySelector('.class-name-input');
  nameInput.addEventListener('change', (e) => updateClassName(classItem.id, e.target.value));
  
  const urlInput = div.querySelector('.class-url-input');
  urlInput.addEventListener('change', (e) => updateClassUrl(classItem.id, e.target.value));
  
  const addScheduleBtn = div.querySelector('.add-schedule-btn');
  addScheduleBtn.addEventListener('click', () => addScheduleItem(classItem.id));
  
  return div;
}

function renderSchedule(classItem) {
  if (!classItem.schedule || classItem.schedule.length === 0) {
    return '<p style="color: #666; font-style: italic; font-size: 12px; margin: 5px 0;">No schedule set</p>';
  }
  
  return classItem.schedule.map((scheduleItem, index) => {
    const timeInputId = `time-input-${classItem.id}-${index}`;
    return `
      <div class="schedule-item" data-schedule-index="${index}">
        <div class="days-selector">
          ${DAYS_OF_WEEK.map(day => `
            <label class="day-checkbox">
              <input type="checkbox" value="${day.value}" 
                     ${scheduleItem.days.includes(day.value) ? 'checked' : ''}
                     data-class-id="${classItem.id}" data-schedule-index="${index}" class="day-checkbox-input">
              <span>${day.label}</span>
            </label>
          `).join('')}
        </div>
        <input type="text" value="${scheduleItem.time || ''}" 
               id="${timeInputId}"
               data-class-id="${classItem.id}" data-schedule-index="${index}" class="schedule-time-input"
               placeholder="HH:MM"
               pattern="[0-9]{2}:[0-9]{2}"
               maxlength="5"
               style="width: 60px; font-family: monospace;"
               title="Enter time in 24-hour format (e.g., 09:00 or 14:30)">
        <button class="btn-danger btn-small remove-schedule-btn" 
                data-class-id="${classItem.id}" data-schedule-index="${index}">×</button>
      </div>
    `;
  }).join('');
}

async function addNewClass() {
  try {
    // First, try to open TopHat and scan for classes
    const button = document.getElementById('add-class');
    const originalText = button.textContent;
    
    button.textContent = 'Opening TopHat...';
    button.disabled = true;
    
    // Open TopHat in a new tab - try dashboard first
    const tab = await chrome.tabs.create({ 
      url: 'https://app.tophat.com',
      active: true 
    });
    
    // Wait a moment for the page to load and potential redirects
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get the final URL after any redirects
    const updatedTab = await chrome.tabs.get(tab.id);
    
    // Try to scan for classes on whatever page we ended up on
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: scanForTopHatClassesAdvanced
      });
      
      const foundClasses = results[0].result;
      
      if (foundClasses && foundClasses.length > 0) {
        // Show found classes and let user select
        await showClassSelectionDialog(foundClasses);
      } else {
        // No classes found, proceed with manual entry
        await addManualClass();
      }
      
    } catch (error) {
      // Could not scan for classes, proceed with manual entry
      await addManualClass();
    }
    
    button.textContent = originalText;
    button.disabled = false;
    
  } catch (error) {
    console.error('Error in addNewClass:', error);
    // Fallback to manual entry
    await addManualClass();
  }
}

async function addManualClass() {
  const newClass = {
    id: nextClassId++,
    name: '',
    url: '',
    enabled: true,
    schedule: [],
    isDraft: true // Mark as draft until user clicks "Done"
  };
  
  classes.push(newClass);
  renderClasses();
  // Don't save yet - wait for user to finish editing
  
  // Auto-expand the new class
  setTimeout(() => {
    toggleClass(newClass.id);
  }, 100);
}

// Advanced function to run in TopHat context to scan for classes
function scanForTopHatClassesAdvanced() {
  const foundClasses = [];
  const currentUrl = window.location.href;
  
  // If we're on an individual class page, extract that class info
  if (currentUrl.includes('/e/')) {
    const classInfo = extractCurrentClassInfo();
    if (classInfo) {
      foundClasses.push(classInfo);
    }
  }
  
  // Also look for navigation links to other classes
  const navLinks = document.querySelectorAll('a[href*="/e/"]');
  navLinks.forEach(link => {
    const href = link.href;
    const text = link.textContent.trim();
    
    // Skip if it's the current page or invalid
    if (href === currentUrl || !text || text.length < 3) return;
    
    // Look for course name patterns
    const courseNameMatch = text.match(/([A-Z]{2,6}\s*\d{3,4}[A-Z]?)/);
    if (courseNameMatch) {
      const courseName = courseNameMatch[1];
      if (!foundClasses.some(c => c.url === href || c.name === courseName)) {
        foundClasses.push({ name: courseName, url: href });
      }
    }
  });
  
  // Look for course cards/items on dashboard pages
  const courseElements = document.querySelectorAll('div, article, section');
  courseElements.forEach(element => {
    const courseLink = element.querySelector('a[href*="/e/"]');
    if (!courseLink) return;
    
    let courseName = null;
    let courseUrl = courseLink.href;
    
    // Skip if it's the current page
    if (courseUrl === currentUrl) return;
    
    const textContent = element.textContent.trim();
    
    // Match patterns like "Math 220", "BIOL 101", etc.
    const courseNameMatch = textContent.match(/([A-Z]{2,6}\s*\d{3,4}[A-Z]?)/);
    if (courseNameMatch) {
      courseName = courseNameMatch[1];
    }
    
    // Look for headings or titles within the element
    if (!courseName) {
      const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6, .title, .course-title, .class-title');
      for (const heading of headings) {
        const headingText = heading.textContent.trim();
        if (headingText && 
            !headingText.includes('My Courses') && 
            !headingText.includes('Dashboard') &&
            headingText.length < 50) {
          courseName = headingText;
          break;
        }
      }
    }
    
    // Clean up the course name
    if (courseName) {
      courseName = courseName
        .replace(/^\s*(SECTION\s*\d+\s*)?/i, '') // Remove "SECTION 014" prefix
        .replace(/\s*(JOIN\s*[A-Z0-9]+)\s*$/i, '') // Remove "JOIN TH7331" suffix
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      // Skip if it's still generic text
      if (courseName && 
          !['My Courses', 'Dashboard', 'Home', 'TopHat'].includes(courseName) &&
          courseName.length > 2) {
        
        // Check if we already have this course
        if (!foundClasses.some(c => c.url === courseUrl || c.name === courseName)) {
          foundClasses.push({ name: courseName, url: courseUrl });
        }
      }
    }
  });
  
  return foundClasses;
}

// Helper function to extract info from current class page
function extractCurrentClassInfo() {
  const currentUrl = window.location.href;
  let courseName = null;
  
  // Try to get course name from breadcrumbs or navigation
  const breadcrumbs = document.querySelectorAll('.breadcrumb, nav, .navigation');
  for (const breadcrumb of breadcrumbs) {
    const courseNameMatch = breadcrumb.textContent.match(/([A-Z]{2,6}\s*\d{3,4}[A-Z]?)/);
    if (courseNameMatch) {
      courseName = courseNameMatch[1];
      break;
    }
  }
  
  // Try to get from page headers
  if (!courseName) {
    const headers = document.querySelectorAll('h1, h2, .course-title, .class-title');
    for (const header of headers) {
      const text = header.textContent.trim();
      const courseNameMatch = text.match(/([A-Z]{2,6}\s*\d{3,4}[A-Z]?)/);
      if (courseNameMatch) {
        courseName = courseNameMatch[1];
        break;
      }
    }
  }
  
  // Extract from URL as fallback
  if (!courseName) {
    const urlMatch = currentUrl.match(/\/e\/(\w+)/);
    if (urlMatch) {
      courseName = `Class ${urlMatch[1]}`;
    }
  }
  
  // Get the base class URL (remove /content/course-work etc.)
  const baseUrl = currentUrl.match(/(https:\/\/app\.tophat\.com\/e\/\w+)/);
  const classUrl = baseUrl ? baseUrl[1] : currentUrl;
  
  if (courseName) {
    return {
      name: courseName,
      url: classUrl
    };
  }
  
  return null;
}

async function showClassSelectionDialog(foundClasses) {
  // Create a simple selection interface
  const container = document.getElementById('classes-container');
  const originalContent = container.innerHTML;
  
  container.innerHTML = `
    <div style="background: #e8f4fd; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
      <h3 style="margin: 0 0 10px 0; color: #1976d2;">Found ${foundClasses.length} TopHat Classes</h3>
      <p style="margin: 0 0 15px 0; font-size: 13px; color: #666;">Select classes to add:</p>
      ${foundClasses.map((cls, index) => {
        const autoSchedule = parseScheduleFromText(cls.name);
        const scheduleText = autoSchedule.length > 0 
          ? `<div style="font-size: 11px; color: #28a745; margin-top: 3px;">✓ Schedule detected: ${formatSchedulePreview(autoSchedule)}</div>`
          : '';
        
        return `
          <div style="margin-bottom: 10px; padding: 8px; background: white; border-radius: 4px;">
            <label style="display: flex; align-items: center; cursor: pointer;">
              <input type="checkbox" id="class-${index}" style="margin-right: 8px;">
              <div style="flex: 1;">
                <div style="font-weight: 500; font-size: 13px;">${cls.name}</div>
                <div style="font-size: 11px; color: #666; word-break: break-all;">${cls.url}</div>
                ${scheduleText}
              </div>
            </label>
          </div>
        `;
      }).join('')}
      <div style="margin-top: 15px; display: flex; gap: 10px;">
        <button id="add-selected-classes" class="btn-primary" style="flex: 1;">Add Selected</button>
        <button id="cancel-selection" class="btn-secondary" style="flex: 1;">Cancel</button>
      </div>
    </div>
  `;
  
  // Add event listeners
  document.getElementById('add-selected-classes').addEventListener('click', () => {
    const selectedClasses = [];
    foundClasses.forEach((cls, index) => {
      const checkbox = document.getElementById(`class-${index}`);
      if (checkbox && checkbox.checked) {
        selectedClasses.push(cls);
      }
    });
    
    // Add selected classes with auto-detected schedules
    selectedClasses.forEach(cls => {
      const autoSchedule = parseScheduleFromText(cls.name);
      
      const newClass = {
        id: nextClassId++,
        name: cls.name,
        url: cls.url,
        enabled: true,
        schedule: autoSchedule.length > 0 ? autoSchedule : []
      };
      classes.push(newClass);
    });
    
    // Restore original content and save
    container.innerHTML = originalContent;
    renderClasses();
    saveClasses();
  });
  
  document.getElementById('cancel-selection').addEventListener('click', () => {
    container.innerHTML = originalContent;
    renderClasses();
  });
}

function removeClass(classId) {
  const classItem = classes.find(c => c.id === classId);
  
  // If it's a draft, just remove without confirmation
  if (classItem && classItem.isDraft) {
    classes = classes.filter(c => c.id !== classId);
    renderClasses();
    return;
  }
  
  // For saved classes, ask for confirmation
  if (confirm('Delete this class?')) {
    classes = classes.filter(c => c.id !== classId);
    renderClasses();
    saveClasses();
  }
}

function toggleClass(classId) {
  const classElement = document.querySelector(`[data-class-id="${classId}"]`);
  const classItem = classes.find(c => c.id === classId);
  
  if (classElement && classItem) {
    const isCurrentlyCollapsed = classElement.classList.contains('collapsed');
    const editBtn = classElement.querySelector('.expand-btn');
    
    if (isCurrentlyCollapsed) {
      // Expanding - show edit mode
      classElement.classList.remove('collapsed');
      if (editBtn) editBtn.textContent = 'Done';
    } else {
      // Collapsing - user clicked "Done"
      
      // Validate class before saving
      if (classItem.isDraft) {
        if (!classItem.name || classItem.name.trim() === '') {
          alert('Please enter a class name before saving.');
          return;
        }
        
        if (!classItem.url || classItem.url.trim() === '') {
          alert('Please enter a TopHat class URL before saving.');
          return;
        }
        
        // Remove draft status and save
        delete classItem.isDraft;
        saveClasses();
      }
      
      classElement.classList.add('collapsed');
      if (editBtn) editBtn.textContent = 'Edit';
    }
  }
}

function toggleClassEnabled(classId) {
  const classItem = classes.find(c => c.id === classId);
  if (classItem) {
    classItem.enabled = !classItem.enabled;
    saveClasses();
  }
}

function updateClassName(classId, name) {
  const classItem = classes.find(c => c.id === classId);
  if (classItem) {
    classItem.name = name;
    // Update the display name immediately
    const classEl = document.querySelector(`[data-class-id="${classId}"]`);
    if (classEl) {
      const displayEl = classEl.querySelector('.class-name-display');
      if (displayEl) {
        displayEl.textContent = name || 'Unnamed Class';
      }
    }
    // Only save if not a draft
    if (!classItem.isDraft) {
      saveClasses();
    }
  }
}

function updateClassUrl(classId, url) {
  const classItem = classes.find(c => c.id === classId);
  if (classItem) {
    classItem.url = url;
    // Only save if not a draft
    if (!classItem.isDraft) {
      saveClasses();
    }
  }
}

function addScheduleItem(classId) {
  const classItem = classes.find(c => c.id === classId);
  if (classItem) {
    if (!classItem.schedule) {
      classItem.schedule = [];
    }
    
    classItem.schedule.push({
      days: [],
      time: '09:00'
    });
    
    // Remember if class was expanded
    const classElement = document.querySelector(`[data-class-id="${classId}"]`);
    const wasExpanded = classElement && !classElement.classList.contains('collapsed');
    
    renderClasses();
    
    // Only save if not a draft
    if (!classItem.isDraft) {
      saveClasses();
    }
    
    // Restore expanded state
    if (wasExpanded) {
      setTimeout(() => {
        const newClassElement = document.querySelector(`[data-class-id="${classId}"]`);
        if (newClassElement && newClassElement.classList.contains('collapsed')) {
          toggleClass(classId);
        }
      }, 50);
    }
  }
}

function removeScheduleItem(classId, scheduleIndex) {
  const classItem = classes.find(c => c.id === classId);
  if (classItem && classItem.schedule) {
    classItem.schedule.splice(scheduleIndex, 1);
    
    // Remember if class was expanded
    const classElement = document.querySelector(`[data-class-id="${classId}"]`);
    const wasExpanded = classElement && !classElement.classList.contains('collapsed');
    
    renderClasses();
    
    // Only save if not a draft
    if (!classItem.isDraft) {
      saveClasses();
    }
    
    // Restore expanded state
    if (wasExpanded) {
      setTimeout(() => {
        const newClassElement = document.querySelector(`[data-class-id="${classId}"]`);
        if (newClassElement && newClassElement.classList.contains('collapsed')) {
          toggleClass(classId);
        }
      }, 50);
    }
  }
}

function updateScheduleDays(classId, scheduleIndex, checkbox) {
  const classItem = classes.find(c => c.id === classId);
  if (classItem && classItem.schedule && classItem.schedule[scheduleIndex]) {
    const scheduleItem = classItem.schedule[scheduleIndex];
    const day = checkbox.value;
    
    if (checkbox.checked) {
      if (!scheduleItem.days.includes(day)) {
        scheduleItem.days.push(day);
      }
    } else {
      scheduleItem.days = scheduleItem.days.filter(d => d !== day);
    }
    
    // Only save if not a draft
    if (!classItem.isDraft) {
      saveClasses();
    }
  }
}

function updateScheduleTime(classId, scheduleIndex, time) {
  const classItem = classes.find(c => c.id === classId);
  if (classItem && classItem.schedule && classItem.schedule[scheduleIndex]) {
    // Validate time format (HH:MM in 24-hour format)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    
    if (time && !timeRegex.test(time)) {
      // Invalid format - show error
      alert('Please enter time in 24-hour format (HH:MM)\nExamples: 09:00, 14:30, 23:45');
      return;
    }
    
    // Normalize time to HH:MM format (pad with zeros)
    if (time && timeRegex.test(time)) {
      const [hours, minutes] = time.split(':');
      time = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    }
    
    classItem.schedule[scheduleIndex].time = time;
    // Only save if not a draft
    if (!classItem.isDraft) {
      saveClasses();
    }
  }
}

async function refreshAlarms() {
  const button = document.getElementById('refresh-alarms');
  const originalText = button.textContent;
  
  button.textContent = 'Refreshing...';
  button.disabled = true;
  
  try {
    await chrome.runtime.sendMessage({ action: 'refreshAlarms' });
    await updateStatus();
  } catch (error) {
    console.error('Error refreshing alarms:', error);
  }
  
  button.textContent = originalText;
  button.disabled = false;
}

function isValidTopHatClassPage(url) {
  // Check if URL is a valid TopHat class page
  if (!url || !url.includes('app.tophat.com')) {
    return false;
  }
  
  // Invalid pages to exclude
  const invalidPaths = [
    '/login',
    '/auth',
    '/signup',
    '/register',
    '/forgot',
    '/reset',
    '/verify',
    '/logout',
    '/settings',
    '/profile',
    '/account'
  ];
  
  // Check if URL contains any invalid paths
  for (const invalidPath of invalidPaths) {
    if (url.includes(invalidPath)) {
      return false;
    }
  }
  
  // Valid class pages should either:
  // 1. Have /e/ in the URL (individual class)
  // 2. Be the dashboard/courses page with course cards
  return url.includes('/e/') || 
         url.includes('app.tophat.com/') || 
         url.includes('/courses') ||
         url === 'https://app.tophat.com' ||
         url === 'https://app.tophat.com/';
}

async function checkCurrentTab() {
  try {
    // Get the current active tab with timeout
    const tabPromise = chrome.tabs.query({ active: true, currentWindow: true });
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Tab query timeout')), 1000)
    );
    
    const [tab] = await Promise.race([tabPromise, timeoutPromise]);
    
    if (tab && tab.url && isValidTopHatClassPage(tab.url)) {
      // Show basic TopHat detection immediately
      document.getElementById('current-page-info').style.display = 'block';
      document.getElementById('current-page-title').textContent = 'TopHat Page';
      document.getElementById('current-page-url').textContent = tab.url;
      document.getElementById('add-current-class').style.display = 'block';
      document.getElementById('add-class').style.display = 'none';
      
      // Try to get detailed class info asynchronously
      getDetailedClassInfo(tab);
      
    } else {
      // Hide current page info if not on valid TopHat page
      document.getElementById('current-page-info').style.display = 'none';
      document.getElementById('add-current-class').style.display = 'none';
      document.getElementById('add-class').style.display = 'block';
    }
  } catch (error) {
    console.error('Error checking current tab:', error);
    // Ensure default state is shown
    document.getElementById('current-page-info').style.display = 'none';
    document.getElementById('add-current-class').style.display = 'none';
    document.getElementById('add-class').style.display = 'block';
  }
}

async function getDetailedClassInfo(tab) {
  try {
    // Try to get class info from content script with timeout
    const messagePromise = chrome.tabs.sendMessage(tab.id, { action: 'getClassInfo' });
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Content script timeout')), 2000)
    );
    
    const classInfo = await Promise.race([messagePromise, timeoutPromise]);
    
    // Update with detailed info
    if (classInfo && classInfo.name) {
      document.getElementById('current-page-title').textContent = classInfo.name;
      
      // Check if this class already exists
      const existingClass = classes.find(c => {
        const baseUrl = c.url.split('?')[0].split('#')[0];
        const currentBaseUrl = tab.url.split('?')[0].split('#')[0];
        return baseUrl === currentBaseUrl || c.name === classInfo.name;
      });
      
      const btn = document.getElementById('add-current-class');
      if (existingClass) {
        btn.textContent = '✓ Current Class Already Added';
        btn.disabled = true;
        btn.style.backgroundColor = '#28a745';
      } else {
        btn.textContent = `+ Add "${classInfo.name}"`;
        btn.disabled = false;
        btn.style.backgroundColor = '#007bff';
      }
    }
    
  } catch (error) {
    // Fallback to basic info if content script fails
    const btn = document.getElementById('add-current-class');
    btn.textContent = '+ Add Current TopHat Class';
    btn.disabled = false;
    btn.style.backgroundColor = '#007bff';
  }
}

async function addCurrentClass() {
  try {
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url || !isValidTopHatClassPage(tab.url)) {
      alert('Please navigate to a valid TopHat class page first');
      return;
    }
    
    // Inject script to extract class information
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: extractTopHatClassInfo
    });
    
    const classInfo = results[0].result;
    
    if (!classInfo || !isValidClassInfo(classInfo)) {
      alert('Could not extract valid class information from this page. Please make sure you are on a TopHat class page with course content.');
      return;
    }
    
    // Try to auto-detect schedule from class name or page content
    const autoSchedule = parseScheduleFromText(classInfo.name);
    
    // Create new class with extracted info
    const newClass = {
      id: nextClassId++,
      name: classInfo.name || 'TopHat Class',
      url: classInfo.url || tab.url,
      enabled: true,
      schedule: autoSchedule.length > 0 ? autoSchedule : [],
      isDraft: true // Mark as draft until user clicks "Done"
    };
    
    classes.push(newClass);
    renderClasses();
    // Don't save yet - wait for user to finish editing
    
    // Auto-expand the new class for schedule setup
    setTimeout(() => {
      toggleClass(newClass.id);
    }, 100);
    
    // Update button state
    await checkCurrentTab();
    
  } catch (error) {
    console.error('Error adding current class:', error);
    alert('Error extracting class information. Please add manually.');
  }
}

function formatSchedulePreview(schedules) {
  if (!schedules || schedules.length === 0) return '';
  
  return schedules.map(schedule => {
    const dayAbbr = {
      'monday': 'Mon',
      'tuesday': 'Tue',
      'wednesday': 'Wed',
      'thursday': 'Thu',
      'friday': 'Fri',
      'saturday': 'Sat',
      'sunday': 'Sun'
    };
    
    const days = schedule.days.map(d => dayAbbr[d] || d).join(', ');
    const time = schedule.time || 'No time';
    
    return days ? `${days} at ${time}` : time;
  }).join('; ');
}

function parseScheduleFromText(text) {
  if (!text) return [];
  
  const schedules = [];
  
  // Common day abbreviations mapping
  const dayMap = {
    'M': 'monday',
    'T': 'tuesday',
    'W': 'wednesday',
    'R': 'thursday',  // R is commonly used for Thursday
    'TH': 'thursday',
    'F': 'friday',
    'S': 'saturday',
    'SU': 'sunday'
  };
  
  // Pattern 1: MWF 10:00 AM, TR 2:30 PM, etc.
  // Matches: MWF, MW, TR, MR, etc. followed by time
  const pattern1 = /([MTWRFS]{1,5})\s+(\d{1,2}):(\d{2})\s*(AM|PM)/gi;
  let match;
  
  while ((match = pattern1.exec(text)) !== null) {
    const dayString = match[1].toUpperCase();
    let hours = parseInt(match[2]);
    const minutes = match[3];
    const period = match[4].toUpperCase();
    
    // Convert to 24-hour format
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    const time = `${hours.toString().padStart(2, '0')}:${minutes}`;
    
    // Parse days
    const days = [];
    let i = 0;
    while (i < dayString.length) {
      // Check for two-letter abbreviations first (TH, SU)
      if (i < dayString.length - 1) {
        const twoChar = dayString.substring(i, i + 2);
        if (dayMap[twoChar]) {
          days.push(dayMap[twoChar]);
          i += 2;
          continue;
        }
      }
      
      // Single letter abbreviation
      const oneChar = dayString[i];
      if (dayMap[oneChar]) {
        days.push(dayMap[oneChar]);
      }
      i++;
    }
    
    if (days.length > 0) {
      schedules.push({ days, time });
    }
  }
  
  // Pattern 2: Monday/Wednesday/Friday 10:00 AM
  const pattern2 = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?:\s*(?:\/|,|and)\s*(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday))*\s+(\d{1,2}):(\d{2})\s*(AM|PM)/gi;
  
  while ((match = pattern2.exec(text)) !== null) {
    const fullMatch = match[0];
    let hours = parseInt(match[match.length - 3]);
    const minutes = match[match.length - 2];
    const period = match[match.length - 1].toUpperCase();
    
    // Convert to 24-hour format
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    const time = `${hours.toString().padStart(2, '0')}:${minutes}`;
    
    // Extract all day names
    const days = [];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    dayNames.forEach(dayName => {
      if (fullMatch.toLowerCase().includes(dayName.toLowerCase())) {
        days.push(dayName.toLowerCase());
      }
    });
    
    if (days.length > 0) {
      schedules.push({ days, time });
    }
  }
  
  // Pattern 3: Just time without days (e.g., "10:00 AM")
  if (schedules.length === 0) {
    const pattern3 = /(\d{1,2}):(\d{2})\s*(AM|PM)/i;
    const timeMatch = text.match(pattern3);
    
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2];
      const period = timeMatch[3].toUpperCase();
      
      // Convert to 24-hour format
      if (period === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }
      
      const time = `${hours.toString().padStart(2, '0')}:${minutes}`;
      
      // Add with no days specified (user can add them)
      schedules.push({ days: [], time });
    }
  }
  
  return schedules;
}

function isValidClassInfo(classInfo) {
  if (!classInfo || !classInfo.name || !classInfo.url) {
    return false;
  }
  
  // Check if URL is valid
  if (!isValidTopHatClassPage(classInfo.url)) {
    return false;
  }
  
  // Check if name is meaningful (not generic)
  const invalidNames = [
    'TopHat Page',
    'My Courses Dashboard', 
    'My Courses',
    'Dashboard',
    'Home',
    'Login',
    'Log in to Top Hat',
    'TopHat',
    'Welcome'
  ];
  
  if (invalidNames.includes(classInfo.name)) {
    return false;
  }
  
  // Name should be at least 3 characters and not just numbers/symbols
  if (classInfo.name.length < 3 || !/[a-zA-Z]/.test(classInfo.name)) {
    return false;
  }
  
  return true;
}

// This function runs in the context of the TopHat page
function extractTopHatClassInfo() {
  // Check if we're on a login or invalid page
  const currentUrl = window.location.href;
  const invalidPaths = ['/login', '/auth', '/signup', '/register', '/forgot', '/reset', '/verify', '/logout'];
  
  for (const invalidPath of invalidPaths) {
    if (currentUrl.includes(invalidPath)) {
      return null; // Don't extract info from login/auth pages
    }
  }
  
  // Check for login page indicators in the content
  const pageText = document.body.textContent.toLowerCase();
  if (pageText.includes('log in to top hat') || 
      pageText.includes('welcome back! please log in') ||
      pageText.includes('sign in') ||
      document.querySelector('input[type="password"]')) {
    return null; // This is a login page
  }
  
  const classInfo = {
    url: currentUrl,
    name: null
  };
  
  // First, check if we're on a dashboard/courses page
  if (window.location.pathname === '/' || 
      window.location.pathname.includes('/courses') ||
      window.location.pathname.includes('/dashboard')) {
    
    // Look for course cards/links on dashboard and extract the first one found
    const courseElements = document.querySelectorAll('div, article, section');
    let foundCourse = null;
    
    courseElements.forEach(element => {
      if (foundCourse) return; // Already found one
      
      const courseLink = element.querySelector('a[href*="/e/"]');
      if (!courseLink) return;
      
      const textContent = element.textContent.trim();
      
      // Match course name patterns like "Math 220", "BIOL 101"
      const courseNameMatch = textContent.match(/([A-Z]{2,6}\s*\d{3,4}[A-Z]?)/);
      if (courseNameMatch) {
        foundCourse = {
          name: courseNameMatch[1],
          url: courseLink.href
        };
      }
    });
    
    if (foundCourse) {
      classInfo.name = foundCourse.name;
      classInfo.url = foundCourse.url;
      return classInfo;
    } else {
      return null; // No valid courses found on dashboard
    }
  }
  
  // For individual course pages, try to extract course name
  const selectors = [
    'h1[data-testid="course-title"]',
    '.course-title',
    'h1.course-name',
    '[data-testid="course-name"]',
    '.header-title',
    '.course-header h1',
    '.class-title'
  ];
  
  // Try specific selectors first
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim()) {
      let text = element.textContent.trim();
      // Skip generic titles
      if (!['TopHat', 'Dashboard', 'Home', 'Login', 'My Courses', 'Log in to Top Hat'].includes(text)) {
        classInfo.name = text;
        break;
      }
    }
  }
  
  // If no specific selector worked, try to find course name patterns in the page
  if (!classInfo.name) {
    const pageText = document.body.textContent;
    const courseNameMatch = pageText.match(/([A-Z]{2,6}\s*\d{3,4}[A-Z]?)/);
    if (courseNameMatch) {
      classInfo.name = courseNameMatch[1];
    }
  }
  
  // Try page title as fallback
  if (!classInfo.name) {
    if (document.title && document.title !== 'TopHat' && !document.title.includes('Login')) {
      let title = document.title.replace(' - TopHat', '').replace(' | TopHat', '').trim();
      if (title !== 'My Courses' && title !== 'Dashboard' && title !== 'Log in to Top Hat') {
        classInfo.name = title;
      }
    }
  }
  
  // Last resort: extract from URL if it's a valid class URL
  if (!classInfo.name) {
    const urlMatch = window.location.pathname.match(/\/e\/(\w+)/);
    if (urlMatch) {
      classInfo.name = `Class ${urlMatch[1]}`;
    } else {
      return null; // No valid class info found
    }
  }
  
  // Clean up the class name
  if (classInfo.name) {
    classInfo.name = classInfo.name
      .replace(/^\s*-\s*/, '') // Remove leading dash
      .replace(/\s*-\s*TopHat\s*$/, '') // Remove trailing "- TopHat"
      .replace(/\s*\|\s*TopHat\s*$/, '') // Remove trailing "| TopHat"
      .replace(/^\s*(SECTION\s*\d+\s*)?/i, '') // Remove "SECTION 014" prefix
      .replace(/\s*(JOIN\s*[A-Z0-9]+)\s*$/i, '') // Remove "JOIN TH7331" suffix
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }
  
  // Final validation - return null if name is still invalid
  const invalidNames = ['TopHat Page', 'My Courses Dashboard', 'Dashboard', 'Home', 'Login'];
  if (!classInfo.name || invalidNames.includes(classInfo.name) || classInfo.name.length < 3) {
    return null;
  }
  
  return classInfo;
}

function getNextAlarm(alarms) {
  if (alarms.length === 0) return null;
  
  // Find the alarm with the earliest scheduledTime
  const nextAlarm = alarms.reduce((earliest, current) => {
    return current.scheduledTime < earliest.scheduledTime ? current : earliest;
  });
  
  const date = new Date(nextAlarm.scheduledTime);
  const now = new Date();
  
  // Format the date/time
  if (date.toDateString() === now.toDateString()) {
    // Today - show time only
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (date.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000) {
    // Within a week - show day and time
    return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  } else {
    // Further out - show date and time
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}