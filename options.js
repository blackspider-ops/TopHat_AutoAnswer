// Options page script for TopHat AutoJoin & AutoAnswer

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

// Initialize options page
document.addEventListener('DOMContentLoaded', async () => {
  await loadClasses();
  renderClasses();
  
  document.getElementById('add-class').addEventListener('click', addNewClass);
});

async function loadClasses() {
  try {
    const result = await chrome.storage.sync.get(['classes', 'nextClassId']);
    classes = result.classes || [];
    nextClassId = result.nextClassId || 1;
  } catch (error) {
    console.error('Error loading classes:', error);
    showStatus('Error loading settings', 'error');
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
    
    showStatus('Settings saved successfully!', 'success');
  } catch (error) {
    console.error('Error saving classes:', error);
    showStatus('Error saving settings', 'error');
  }
}

function showStatus(message, type) {
  const statusEl = document.getElementById('status-message');
  statusEl.textContent = message;
  statusEl.className = `status-message status-${type}`;
  statusEl.style.display = 'block';
  
  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 3000);
}

function renderClasses() {
  const container = document.getElementById('classes-container');
  container.innerHTML = '';
  
  if (classes.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #666; margin: 40px 0;">No classes configured. Click "Add New Class" to get started.</p>';
    return;
  }
  
  classes.forEach(classItem => {
    const classEl = createClassElement(classItem);
    container.appendChild(classEl);
  });
}

function createClassElement(classItem) {
  const div = document.createElement('div');
  div.className = 'class-item';
  div.innerHTML = `
    <div class="class-header">
      <div class="class-name">${classItem.name || 'Unnamed Class'}</div>
      <div class="class-controls">
        <label class="toggle-switch">
          <input type="checkbox" ${classItem.enabled ? 'checked' : ''} 
                 onchange="toggleClass(${classItem.id})">
          <span class="slider"></span>
        </label>
        <button class="btn-danger" onclick="removeClass(${classItem.id})">Delete</button>
      </div>
    </div>
    
    <div class="form-group">
      <label>Class Name:</label>
      <input type="text" value="${classItem.name || ''}" 
             onchange="updateClassName(${classItem.id}, this.value)"
             placeholder="e.g., Biology 101">
    </div>
    
    <div class="form-group">
      <label>TopHat Class URL:</label>
      <input type="url" value="${classItem.url || ''}" 
             onchange="updateClassUrl(${classItem.id}, this.value)"
             placeholder="https://app.tophat.com/e/123456">
    </div>
    
    <div class="form-group">
      <label>Schedule:</label>
      <div id="schedule-${classItem.id}">
        ${renderSchedule(classItem)}
      </div>
      <button class="btn-secondary" onclick="addScheduleItem(${classItem.id})">+ Add Time Slot</button>
    </div>
  `;
  
  return div;
}

function renderSchedule(classItem) {
  if (!classItem.schedule || classItem.schedule.length === 0) {
    return '<p style="color: #666; font-style: italic;">No schedule set</p>';
  }
  
  return classItem.schedule.map((scheduleItem, index) => `
    <div class="schedule-item">
      <div class="days-selector">
        ${DAYS_OF_WEEK.map(day => `
          <label class="day-checkbox">
            <input type="checkbox" value="${day.value}" 
                   ${scheduleItem.days.includes(day.value) ? 'checked' : ''}
                   onchange="updateScheduleDays(${classItem.id}, ${index}, this)">
            <span>${day.label}</span>
          </label>
        `).join('')}
      </div>
      <input type="time" value="${scheduleItem.time || ''}" 
             onchange="updateScheduleTime(${classItem.id}, ${index}, this.value)">
      <button class="btn-danger" onclick="removeScheduleItem(${classItem.id}, ${index})">Remove</button>
    </div>
  `).join('');
}

function addNewClass() {
  const newClass = {
    id: nextClassId++,
    name: '',
    url: '',
    enabled: true,
    schedule: []
  };
  
  classes.push(newClass);
  renderClasses();
  saveClasses();
}

function removeClass(classId) {
  if (confirm('Are you sure you want to delete this class?')) {
    classes = classes.filter(c => c.id !== classId);
    renderClasses();
    saveClasses();
  }
}

function toggleClass(classId) {
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
    saveClasses();
  }
}

function updateClassUrl(classId, url) {
  const classItem = classes.find(c => c.id === classId);
  if (classItem) {
    classItem.url = url;
    saveClasses();
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
    
    renderClasses();
    saveClasses();
  }
}

function removeScheduleItem(classId, scheduleIndex) {
  const classItem = classes.find(c => c.id === classId);
  if (classItem && classItem.schedule) {
    classItem.schedule.splice(scheduleIndex, 1);
    renderClasses();
    saveClasses();
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
    
    saveClasses();
  }
}

function updateScheduleTime(classId, scheduleIndex, time) {
  const classItem = classes.find(c => c.id === classId);
  if (classItem && classItem.schedule && classItem.schedule[scheduleIndex]) {
    classItem.schedule[scheduleIndex].time = time;
    saveClasses();
  }
}