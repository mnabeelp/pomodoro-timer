// Pomodoro Timer unit tests
let PomodoroTimer;

// Mock DOM elements and Electron API before requiring module
beforeEach(() => {
  // Clear require cache to isolate tests
  jest.resetModules();

  // Use fake timers for setInterval/setTimeout
  jest.useFakeTimers();

  // Mock document.getElementById
  const mockElements = {
    'timer-display': { textContent: '' },
    'timer-status': { textContent: '' },
    'session-count': { textContent: '' },
    'next-session': { textContent: '' },
    'start-btn': { disabled: false, addEventListener: jest.fn() },
    'pause-btn': { disabled: true, addEventListener: jest.fn() },
    'reset-btn': { addEventListener: jest.fn() },
    'work-duration': { value: '25' },
    'break-duration': { value: '5' },
    'theme-select': { value: 'default', addEventListener: jest.fn() },
    'always-on-top': { checked: true, addEventListener: jest.fn() },
    'enable-notifications': { checked: true, addEventListener: jest.fn() },
    'apply-settings': { addEventListener: jest.fn() },
    'minimize-btn': { addEventListener: jest.fn() },
    'close-btn': { addEventListener: jest.fn() },
    'drag-handle': { addEventListener: jest.fn() }
  };

  document.getElementById = jest.fn((id) => {
    return mockElements[id] || { addEventListener: jest.fn() };
  });

  // Mock document.addEventListener to capture DOMContentLoaded
  document.addEventListener = jest.fn((event, callback) => {
    if (event === 'DOMContentLoaded') {
      // Store callback but don't execute automatically
      window.domContentLoadedCallback = callback;
    }
  });

  // Mock window.electronAPI
  window.electronAPI = {
    getSettings: jest.fn(() => Promise.resolve({
      workDuration: 1500, // 25 minutes in seconds
      breakDuration: 300, // 5 minutes in seconds
      theme: 'default',
      alwaysOnTop: true,
      notificationsEnabled: true
    })),
    setSettings: jest.fn(() => Promise.resolve()),
    setAlwaysOnTop: jest.fn(),
    showNotification: jest.fn(),
    minimizeWindow: jest.fn(),
    closeWindow: jest.fn(),
    setWindowPosition: jest.fn()
  };

  // Mock alert
  window.alert = jest.fn();
  // Mock console.error
  console.error = jest.fn();

  // Now require the module (after mocks are set up)
  const rendererModule = require('../renderer.js');
  PomodoroTimer = rendererModule.PomodoroTimer;
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe('PomodoroTimer', () => {
  test('should be defined', () => {
    expect(PomodoroTimer).toBeDefined();
  });

  test('should initialize with default values', () => {
    const timer = new PomodoroTimer();
    expect(timer.workDuration).toBe(25 * 60);
    expect(timer.breakDuration).toBe(5 * 60);
    expect(timer.currentDuration).toBe(25 * 60);
    expect(timer.timeLeft).toBe(25 * 60);
    expect(timer.isRunning).toBe(false);
    expect(timer.isWorkSession).toBe(true);
    expect(timer.sessionCount).toBe(1);
  });

  test('startTimer should start the timer', () => {
    const timer = new PomodoroTimer();

    timer.startTimer();

    expect(timer.isRunning).toBe(true);
    expect(timer.startBtn.disabled).toBe(true);
    expect(timer.pauseBtn.disabled).toBe(false);
    // Timer interval should be set
    expect(timer.timerInterval).toBeDefined();
  });

  test('pauseTimer should pause a running timer', () => {
    const timer = new PomodoroTimer();
    timer.startTimer();

    timer.pauseTimer();

    expect(timer.isRunning).toBe(false);
    expect(timer.startBtn.disabled).toBe(false);
    expect(timer.pauseBtn.disabled).toBe(true);
    expect(timer.timerInterval).toBeNull();
  });

  test('resetTimer should reset timer to current duration', () => {
    const timer = new PomodoroTimer();
    timer.startTimer();

    // Let timer run for a bit (simulate)
    timer.timeLeft = 1000; // Simulate some time passed

    timer.resetTimer();

    expect(timer.isRunning).toBe(false);
    expect(timer.timeLeft).toBe(timer.currentDuration);
    expect(timer.startBtn.disabled).toBe(false);
    expect(timer.pauseBtn.disabled).toBe(true);
  });

  test('timerComplete should switch session type', () => {
    const timer = new PomodoroTimer();
    timer.isRunning = true;
    timer.timerInterval = setInterval(() => {}, 1000);
    timer.timeLeft = 0;

    // Mock notification
    window.electronAPI.showNotification = jest.fn();

    timer.timerComplete();

    expect(timer.isRunning).toBe(false);
    expect(timer.isWorkSession).toBe(false); // Should switch to break
    expect(timer.currentDuration).toBe(timer.breakDuration);
    expect(timer.timeLeft).toBe(timer.breakDuration);
    expect(timer.sessionCount).toBe(1); // Still 1 because we were in work session
    expect(timer.timerInterval).toBeNull();

    // Should have called notification
    expect(window.electronAPI.showNotification).toHaveBeenCalledWith(
      'Work Session Complete!',
      'Time for a break!'
    );
  });

  test('timerComplete should increment session count when switching to work', () => {
    const timer = new PomodoroTimer();
    timer.isRunning = true;
    timer.isWorkSession = false; // Start in break session
    timer.timerInterval = setInterval(() => {}, 1000);
    timer.timeLeft = 0;
    timer.sessionCount = 1;

    window.electronAPI.showNotification = jest.fn();

    timer.timerComplete();

    expect(timer.isWorkSession).toBe(true); // Should switch to work
    expect(timer.sessionCount).toBe(2); // Incremented
    expect(timer.currentDuration).toBe(timer.workDuration);
    expect(timer.timerInterval).toBeNull();
    expect(window.electronAPI.showNotification).toHaveBeenCalledWith(
      'Break Time Over!',
      'Back to work!'
    );
  });

  test('timerComplete should auto-start next session after 3 seconds', () => {
    const timer = new PomodoroTimer();
    timer.isRunning = true;
    timer.timerInterval = setInterval(() => {}, 1000);
    timer.timeLeft = 0;

    timer.timerComplete();

    // Timer should not be running immediately
    expect(timer.isRunning).toBe(false);
    expect(timer.timerInterval).toBeNull();

    // Fast-forward 3 seconds
    jest.advanceTimersByTime(3000);

    // Should have called startTimer
    expect(timer.isRunning).toBe(true);
    expect(timer.timerInterval).toBeDefined();
  });

  test('updateDisplay should format time correctly', () => {
    const timer = new PomodoroTimer();

    // Test 25 minutes (1500 seconds)
    timer.timeLeft = 1500;
    timer.updateDisplay();
    expect(timer.timerDisplay.textContent).toBe('25:00');

    // Test 1 minute 5 seconds (65 seconds)
    timer.timeLeft = 65;
    timer.updateDisplay();
    expect(timer.timerDisplay.textContent).toBe('01:05');

    // Test 0 seconds
    timer.timeLeft = 0;
    timer.updateDisplay();
    expect(timer.timerDisplay.textContent).toBe('00:00');
  });

  test('updateDisplay should update status and session info', () => {
    const timer = new PomodoroTimer();

    timer.isWorkSession = true;
    timer.sessionCount = 3;
    timer.workDuration = 1500;
    timer.breakDuration = 300;

    timer.updateDisplay();

    expect(timer.timerStatus.textContent).toBe('Work Session');
    expect(timer.sessionCountElement.textContent).toBe('Session: 3');
    expect(timer.nextSessionElement.textContent).toBe('Next: 5 min break');

    // Switch to break session
    timer.isWorkSession = false;
    timer.updateDisplay();

    expect(timer.timerStatus.textContent).toBe('Break Time');
    expect(timer.nextSessionElement.textContent).toBe('Next: 25 min work');
  });

  test('applySettings should update timer durations', async () => {
    const timer = new PomodoroTimer();
    // Wait for initial loadSettings to complete
    await Promise.resolve();

    // Change input values
    timer.workDurationInput.value = '30';
    timer.breakDurationInput.value = '10';
    timer.notificationsCheckbox.checked = false;

    await timer.applySettings();

    expect(timer.workDuration).toBe(30 * 60);
    expect(timer.breakDuration).toBe(10 * 60);
    expect(timer.notificationsEnabled).toBe(false);

    // Should call electronAPI.setSettings
    expect(window.electronAPI.setSettings).toHaveBeenCalled();
    // Should show success alert
    expect(window.alert).toHaveBeenCalledWith('Settings applied successfully!');
  });

  test('applySettings should show error alert on failure', async () => {
    const timer = new PomodoroTimer();

    // Mock setSettings to reject
    window.electronAPI.setSettings = jest.fn(() => Promise.reject(new Error('Failed')));

    // Change input values
    timer.workDurationInput.value = '30';
    timer.breakDurationInput.value = '10';

    // Need to handle async applySettings (it's async due to await)
    // The method is async but we don't await in test; it will fire and forget
    // We'll mock alert to capture error
    window.alert.mockClear();

    timer.applySettings();

    // Wait for promise to settle
    await Promise.resolve();

    // Should show error alert
    expect(window.alert).toHaveBeenCalledWith('Failed to save settings. Please try again.');
  });

  test('applyTheme should add theme class to body', () => {
    const timer = new PomodoroTimer();

    // Mock document.body
    document.body.className = '';

    timer.themeSelect.value = 'dark';
    timer.applyTheme();

    expect(document.body.className).toBe('theme-dark');

    timer.themeSelect.value = 'default';
    timer.applyTheme();

    expect(document.body.className).toBe('');
  });
});