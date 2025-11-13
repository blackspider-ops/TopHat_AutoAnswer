// Content script for TopHat AutoJoin & AutoAnswer

const DEBUG = false;
const answeredQuestions = new Set();
let lastCheckTime = 0;
let consecutiveNoQuestionCount = 0;

function log(...args) {
  if (DEBUG) {
    console.log('[TopHat Content]', ...args);
  }
}

// Always log important events
function logImportant(...args) {
  console.log('[TopHat Content]', ...args);
}

// Question selectors - updated to match TopHat's actual DOM structure
const QUESTION_SELECTORS = {
  container: '[data-testid="question-container"], .question-container, .poll-container, div:has(> input[type="radio"])',
  options: 'input[type="radio"], input[type="checkbox"], .option-button, .poll-option, label input[type="radio"]',
  submitButton: 'button[type="submit"], .submit-button, .answer-submit, [data-testid="submit-answer"], button:contains("Submit")',
  questionId: '[data-question-id], [data-testid="question-id"]'
};

class TopHatAutoAnswerer {
  constructor() {
    this.observer = null;
    this.isEnabled = true;
    this.init();
  }

  async init() {
    log('TopHat AutoAnswerer initialized');
    log('Current URL:', window.location.href);
    
    // Check if automation is enabled for this class
    await this.checkIfEnabled();
    
    if (this.isEnabled) {
      log('Auto-answering is ENABLED for this class');
      this.startObserving();
      // Also check for existing questions on page load
      setTimeout(() => {
        this.checkForActiveQuestions();
      }, 2000); // Wait longer for page to fully load
      
      // Check periodically for new questions (every 5 seconds)
      this.periodicCheck = setInterval(() => {
        this.checkForActiveQuestions();
      }, 5000);
    } else {
      log('Auto-answering is DISABLED for this class');
    }
  }

  async checkIfEnabled() {
    try {
      const { classes = [] } = await chrome.storage.sync.get('classes');
      const currentUrl = window.location.href;
      
      // Find matching class by URL
      const matchingClass = classes.find(classItem => 
        classItem.enabled && currentUrl.includes(classItem.url)
      );
      
      this.isEnabled = !!matchingClass;
      log('Auto-answering enabled:', this.isEnabled);
      
    } catch (error) {
      console.error('Error checking if enabled:', error);
      this.isEnabled = false;
    }
  }

  startObserving() {
    // Create mutation observer to watch for new questions
    this.observer = new MutationObserver((mutations) => {
      let shouldCheck = false;
      
      mutations.forEach((mutation) => {
        // Check if new nodes were added that might contain questions
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (let node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (this.containsQuestion(node)) {
                shouldCheck = true;
                break;
              }
            }
          }
        }
        
        // Check for attribute changes that might indicate question state changes
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'class' || 
             mutation.attributeName === 'data-state' ||
             mutation.attributeName === 'style')) {
          if (this.containsQuestion(mutation.target)) {
            shouldCheck = true;
          }
        }
      });
      
      if (shouldCheck) {
        // Debounce the check
        clearTimeout(this.checkTimeout);
        this.checkTimeout = setTimeout(() => {
          this.checkForActiveQuestions();
        }, 500);
      }
    });

    // Start observing
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-state', 'style']
    });

    log('Started observing DOM for questions');
  }

  containsQuestion(element) {
    return element.querySelector && (
      element.querySelector(QUESTION_SELECTORS.container) ||
      element.matches && element.matches(QUESTION_SELECTORS.container)
    );
  }

  checkForActiveQuestions() {
    if (!this.isEnabled) {
      log('Auto-answering is disabled for this page');
      return;
    }
    
    log('Checking for active questions...');
    
    // Simple approach: Find "Not answered" or "Unanswered" text in the sidebar
    const allElements = document.querySelectorAll('*');
    let notAnsweredElement = null;
    
    for (const element of allElements) {
      const text = element.textContent.trim();
      // Check for both "Not answered" (Content tab) and "Unanswered" (Classroom tab)
      if (text === 'Not answered' || text === 'Unanswered') {
        notAnsweredElement = element;
        log(`Found "${text}" element:`, element);
        break;
      }
    }
    
    if (!notAnsweredElement) {
      log('No "Not answered" or "Unanswered" text found - all questions may be answered');
      consecutiveNoQuestionCount++;
      
      // If we haven't found questions for a while, clear the answered set
      // This helps if the page refreshed or new questions appeared
      if (consecutiveNoQuestionCount > 6) { // 6 checks * 5 seconds = 30 seconds
        log('Clearing answered questions cache after 30 seconds of no questions');
        answeredQuestions.clear();
        consecutiveNoQuestionCount = 0;
      }
      return;
    }
    
    // Reset counter when we find a question
    consecutiveNoQuestionCount = 0;
    logImportant(`Found unanswered question! Attempting to answer...`);
    
    // Find the clickable parent - look for the question item container
    // Try multiple parent levels to find the clickable element
    let clickTarget = notAnsweredElement;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (clickTarget && attempts < maxAttempts) {
      // Check if this element or its siblings contain "Question" text
      const hasQuestionText = clickTarget.textContent.includes('Question');
      
      // Try to find a clickable element at this level
      const clickable = clickTarget.tagName === 'A' || 
                       clickTarget.tagName === 'BUTTON' ||
                       clickTarget.getAttribute('role') === 'button' ||
                       clickTarget.onclick ||
                       hasQuestionText;
      
      if (clickable && hasQuestionText) {
        log('Found clickable question container, clicking it');
        clickTarget.click();
        
        // Wait for the question to load, then find and answer it
        setTimeout(() => {
          this.answerCurrentQuestion();
        }, 1500);
        return;
      }
      
      clickTarget = clickTarget.parentElement;
      attempts++;
    }
    
    // Fallback: just click the "Not answered" element itself
    log('Clicking "Not answered" element directly');
    notAnsweredElement.click();
    
    setTimeout(() => {
      this.answerCurrentQuestion();
    }, 1500);
  }
  
  answerCurrentQuestion() {
    log('Looking for radio buttons to answer...');
    
    // Find all radio buttons on the page
    const allRadios = document.querySelectorAll('input[type="radio"]');
    log(`Found ${allRadios.length} total radio buttons`);
    
    if (allRadios.length === 0) {
      log('No radio buttons found');
      return;
    }
    
    // Group by name attribute
    const radioGroups = {};
    allRadios.forEach(radio => {
      const name = radio.getAttribute('name');
      if (name) {
        if (!radioGroups[name]) {
          radioGroups[name] = [];
        }
        radioGroups[name].push(radio);
      }
    });
    
    log(`Found ${Object.keys(radioGroups).length} radio button groups`);
    
    // Find the first unanswered group (not checked AND enabled)
    for (const [groupName, radios] of Object.entries(radioGroups)) {
      const checkedRadios = radios.filter(r => r.checked);
      const enabledRadios = radios.filter(r => !r.disabled);
      const hasChecked = checkedRadios.length > 0;
      const hasEnabled = enabledRadios.length > 0;
      
      log(`Group "${groupName}": ${radios.length} options, ${checkedRadios.length} checked, ${enabledRadios.length} enabled`);
      
      // Question is unanswered if it has enabled options but none are checked
      if (!hasChecked && hasEnabled) {
        logImportant(`Found unanswered question group: ${groupName} with ${enabledRadios.length} options - answering now!`);
        const container = this.findQuestionContainer(radios[0]);
        this.handleQuestion(container, enabledRadios);
        return;
      }
    }
    
    log('No unanswered radio button groups found - all questions may be answered or disabled');
  }
  
  findQuestionContainer(element) {
    // Walk up the DOM tree to find a suitable container
    let current = element;
    let depth = 0;
    const maxDepth = 10;
    
    while (current && current.parentElement && depth < maxDepth) {
      current = current.parentElement;
      depth++;
      
      // Look for a container that has multiple radio buttons
      const radios = current.querySelectorAll('input[type="radio"]');
      if (radios.length >= 2) {
        return current;
      }
    }
    
    return null;
  }
  
  findSmallestCommonContainer(radios) {
    if (radios.length === 0) return null;
    if (radios.length === 1) return radios[0].parentElement;
    
    // Start with the first radio's parents
    let candidates = [];
    let current = radios[0];
    let depth = 0;
    const maxDepth = 15;
    
    // Collect all parent elements of the first radio
    while (current && current.parentElement && depth < maxDepth) {
      current = current.parentElement;
      candidates.push(current);
      depth++;
    }
    
    // Find the smallest parent that contains all radios
    for (const candidate of candidates) {
      const radiosInCandidate = candidate.querySelectorAll('input[type="radio"]');
      const containsAll = radios.every(radio => 
        Array.from(radiosInCandidate).includes(radio)
      );
      
      if (containsAll) {
        // Make sure it doesn't contain radios from other groups
        const radioName = radios[0].getAttribute('name');
        const allRadiosInContainer = Array.from(radiosInCandidate);
        const onlyThisGroup = allRadiosInContainer.every(r => 
          r.getAttribute('name') === radioName
        );
        
        if (onlyThisGroup) {
          return candidate;
        }
      }
    }
    
    return null;
  }
  
  filterNestedContainers(containers) {
    // Remove containers that contain other containers in the list
    // Keep only the innermost (most specific) containers
    return containers.filter(container => {
      // Check if this container contains any other container in the list
      const containsOther = containers.some(other => 
        other !== container && container.contains(other)
      );
      
      // Keep this container only if it doesn't contain others
      return !containsOther;
    });
  }

  isQuestionActive(container, radios) {
    // Check various indicators that a question is active/visible
    const style = window.getComputedStyle(container);
    if (style.display === 'none' || style.visibility === 'hidden') {
      log('Container is hidden');
      return false;
    }
    
    // Use the provided radios array instead of querying again
    const allOptions = radios || container.querySelectorAll('input[type="radio"]');
    const enabledOptions = Array.from(allOptions).filter(opt => !opt.disabled);
    const hasEnabledOptions = enabledOptions.length > 0;
    
    // Check if any enabled options are visible
    const hasVisibleOptions = enabledOptions.some(option => {
      const optionStyle = window.getComputedStyle(option);
      const isVisible = optionStyle.display !== 'none' && 
                       optionStyle.visibility !== 'hidden' &&
                       optionStyle.opacity !== '0';
      return isVisible;
    });
    
    // Check if any option is already checked (question already answered)
    const hasCheckedOption = Array.from(allOptions).some(opt => opt.checked);
    
    log(`Question active check: hasEnabledOptions=${hasEnabledOptions} (${enabledOptions.length}/${allOptions.length}), hasVisibleOptions=${hasVisibleOptions}, hasCheckedOption=${hasCheckedOption}`);
    
    // Question is active if it has enabled, visible options and no option is checked yet
    return hasEnabledOptions && hasVisibleOptions && !hasCheckedOption;
  }

  isQuestionAnswered(container, radios) {
    // Generate a unique identifier for this question
    const questionId = this.getQuestionId(container, radios);
    const wasAnsweredBefore = answeredQuestions.has(questionId);
    
    // Also check if any radio is currently checked (more reliable)
    const hasCheckedOption = radios && Array.from(radios).some(opt => opt.checked);
    
    const isAnswered = wasAnsweredBefore || hasCheckedOption;
    if (isAnswered) {
      log(`Question ${questionId} is answered: wasAnsweredBefore=${wasAnsweredBefore}, hasCheckedOption=${hasCheckedOption}`);
    }
    
    return isAnswered;
  }

  getQuestionId(container, radios) {
    // Try to get a unique identifier for the question from data attributes
    const idElement = container.querySelector(QUESTION_SELECTORS.questionId);
    if (idElement) {
      const id = idElement.getAttribute('data-question-id') || 
                 idElement.getAttribute('data-testid');
      if (id) {
        return `question_${id}`;
      }
    }
    
    // Check container itself for ID attributes
    const containerId = container.getAttribute('data-question-id') || 
                       container.getAttribute('data-testid') ||
                       container.getAttribute('id');
    if (containerId) {
      return `question_${containerId}`;
    }
    
    // Use the radio button name combined with container position
    if (radios && radios.length > 0) {
      const radioName = radios[0].getAttribute('name');
      if (radioName) {
        // Get container index to differentiate questions with same radio name
        const allContainers = document.querySelectorAll('div');
        const containerIndex = Array.from(allContainers).indexOf(container);
        return `radio_${radioName}_container_${containerIndex}`;
      }
    }
    
    // Fallback: use question text hash (first 50 chars for uniqueness)
    const questionText = container.textContent.trim().substring(0, 50).replace(/\s+/g, '_');
    return `question_text_${questionText}`;
  }

  async handleQuestion(container, radios) {
    const questionId = this.getQuestionId(container, radios);
    
    // Mark as answered immediately to prevent double-processing
    answeredQuestions.add(questionId);
    log(`Marked question ${questionId} as being processed`);
    
    try {
      // Random delay to avoid instant answers
      const delay = Math.random() * 3000 + 1000; // 1-4 seconds
      log(`Waiting ${Math.round(delay)}ms before answering...`);
      await this.sleep(delay);
      
      // Find and click a random option
      await this.selectRandomOption(container, radios);
      
      logImportant(`✓ Successfully answered question: ${questionId}`);
      
      // Wait a bit after answering, then check for next question multiple times
      await this.sleep(3000); // Wait longer for page to update
      logImportant('→ Checking for next question (attempt 1/3)...');
      this.checkForActiveQuestions();
      
      // Check again after a longer delay in case questions load slowly
      await this.sleep(5000);
      logImportant('→ Checking for next question (attempt 2/3)...');
      this.checkForActiveQuestions();
      
      // One more check after even longer delay
      await this.sleep(5000);
      logImportant('→ Checking for next question (attempt 3/3)...');
      this.checkForActiveQuestions();
      
    } catch (error) {
      // Check if it's an "already answered" error
      if (error.message && error.message.includes('already answered')) {
        log(`Skipping question (already answered): ${questionId}`);
        // Keep it in answered set so we don't try again
      } else {
        console.error('Error handling question:', error);
        // Remove from answered set if there was an error
        answeredQuestions.delete(questionId);
      }
    }
  }

  async waitForOptions(container, maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
      // Look for radio buttons with the same name attribute (they're part of the same question)
      const allRadios = container.querySelectorAll('input[type="radio"]');
      
      if (allRadios.length > 0) {
        // Group by name attribute to find all options for the same question
        const radioGroups = {};
        allRadios.forEach(radio => {
          const name = radio.getAttribute('name') || 'default';
          if (!radioGroups[name]) {
            radioGroups[name] = [];
          }
          radioGroups[name].push(radio);
        });
        
        // Find the largest group (most options) and filter for enabled ones
        let largestGroup = [];
        Object.values(radioGroups).forEach(group => {
          if (group.length > largestGroup.length) {
            largestGroup = group;
          }
        });
        
        // Filter out disabled options
        const enabledOptions = largestGroup.filter(option => !option.disabled);
        
        log(`Found ${largestGroup.length} total options, ${enabledOptions.length} enabled`);
        
        if (enabledOptions.length > 0) {
          return enabledOptions;
        }
        
        // If all options are disabled, the question is already answered
        if (largestGroup.length > 0 && enabledOptions.length === 0) {
          throw new Error('Question already answered (all options disabled)');
        }
      }
      
      await this.sleep(200); // Wait 200ms before retry
    }
    
    throw new Error('No visible options found after waiting');
  }

  async selectRandomOption(container, radios) {
    // Use provided radios or wait for options
    const options = radios ? radios.filter(r => !r.disabled) : await this.waitForOptions(container);
    
    if (options.length === 0) {
      throw new Error('No options available');
    }
    
    // Limit to first 4 options only (ignore 5th option and beyond)
    const limitedOptions = options.slice(0, 4);
    
    log(`Found ${options.length} total options, limiting to first ${limitedOptions.length}`);
    
    // Select random option from the limited set
    const randomIndex = Math.floor(Math.random() * limitedOptions.length);
    const selectedOption = limitedOptions[randomIndex];
    
    log(`Selecting option ${randomIndex + 1} of ${limitedOptions.length} (from ${options.length} total)`, selectedOption);
    
    // Try multiple ways to click the option
    try {
      // Method 1: Direct click on the input
      selectedOption.click();
      log('Clicked option directly');
    } catch (e) {
      log('Direct click failed, trying label click');
      
      // Method 2: Click the label if it exists
      const label = selectedOption.closest('label') || 
                   document.querySelector(`label[for="${selectedOption.id}"]`);
      if (label) {
        label.click();
        log('Clicked label');
      }
    }
    
    // Also try to set checked property
    selectedOption.checked = true;
    
    // Trigger change event
    const changeEvent = new Event('change', { bubbles: true });
    selectedOption.dispatchEvent(changeEvent);
    log('Dispatched change event');
    
    // Small delay before looking for submit button
    await this.sleep(500);
    
    // Look for and click submit button if present
    const submitButtons = [
      ...container.querySelectorAll('button'),
      ...document.querySelectorAll('button')
    ];
    
    log(`Found ${submitButtons.length} buttons`);
    
    for (const button of submitButtons) {
      const buttonText = button.textContent.toLowerCase();
      const ariaDisabled = button.getAttribute('aria-disabled') === 'true';
      const isDisabled = button.disabled || ariaDisabled;
      
      log(`Button text: "${buttonText}", disabled: ${isDisabled}`);
      
      if ((buttonText.includes('submit') || buttonText.includes('answer')) && !isDisabled) {
        log('Clicking submit button:', button);
        button.click();
        return; // Exit after clicking
      }
    }
    
    log('No enabled submit button found - answer may auto-submit');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    if (this.checkTimeout) {
      clearTimeout(this.checkTimeout);
    }
    
    if (this.periodicCheck) {
      clearInterval(this.periodicCheck);
      this.periodicCheck = null;
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new TopHatAutoAnswerer();
  });
} else {
  new TopHatAutoAnswerer();
}

// Listen for messages from popup to extract class info
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getClassInfo') {
    const classInfo = extractClassInfo();
    sendResponse(classInfo);
  }
});

function extractClassInfo() {
  const classInfo = {
    url: window.location.href,
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
    } else {
      classInfo.name = 'My Courses';
    }
    
    return classInfo;
  }
  
  // For individual course pages, try to extract course name
  const selectors = [
    'h1[data-testid="course-title"]',
    '.course-title',
    'h1.course-name',
    '[data-testid="course-name"]',
    '.header-title',
    '.course-header h1',
    '.class-title',
    '[data-testid="class-name"]',
    '.classroom-header h1',
    '.session-title'
  ];
  
  // Try specific selectors first
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim()) {
      let text = element.textContent.trim();
      // Skip generic titles
      if (!['TopHat', 'Dashboard', 'Home', 'Login', 'My Courses'].includes(text)) {
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
      if (title !== 'My Courses' && title !== 'Dashboard') {
        classInfo.name = title;
      }
    }
  }
  
  // Last resort: extract from URL
  if (!classInfo.name) {
    const urlMatch = window.location.pathname.match(/\/e\/(\w+)/);
    if (urlMatch) {
      classInfo.name = `Class ${urlMatch[1]}`;
    } else {
      classInfo.name = 'TopHat Page';
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
  
  return classInfo;
}

// Handle page navigation in SPAs
let currentUrl = window.location.href;
const urlObserver = new MutationObserver(() => {
  if (window.location.href !== currentUrl) {
    currentUrl = window.location.href;
    log('URL changed, reinitializing');
    
    // Small delay to let the new page load
    setTimeout(() => {
      new TopHatAutoAnswerer();
    }, 1000);
  }
});

urlObserver.observe(document.body, {
  childList: true,
  subtree: true
});