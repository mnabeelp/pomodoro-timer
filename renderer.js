// Pomodoro Timer Renderer Process
class PomodoroTimer {
    constructor() {
        this.workDuration = 25 * 60; // 25 minutes in seconds
        this.breakDuration = 5 * 60; // 5 minutes in seconds
        this.currentDuration = this.workDuration;
        this.timeLeft = this.currentDuration;
        this.isRunning = false;
        this.isWorkSession = true;
        this.sessionCount = 1;
        this.timerInterval = null;
        this.notificationsEnabled = true;

        this.initializeElements();
        this.bindEvents();
        this.loadSettings();
        this.updateDisplay();
    }

    initializeElements() {
        // Timer display elements
        this.timerDisplay = document.getElementById('timer-display');
        this.timerStatus = document.getElementById('timer-status');
        this.sessionCountElement = document.getElementById('session-count');
        this.nextSessionElement = document.getElementById('next-session');

        // Control buttons
        this.startBtn = document.getElementById('start-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        this.resetBtn = document.getElementById('reset-btn');

        // Settings elements
        this.workDurationInput = document.getElementById('work-duration');
        this.breakDurationInput = document.getElementById('break-duration');
        this.themeSelect = document.getElementById('theme-select');
        this.alwaysOnTopCheckbox = document.getElementById('always-on-top');
        this.notificationsCheckbox = document.getElementById('enable-notifications');
        this.applySettingsBtn = document.getElementById('apply-settings');

        // Window controls
        this.minimizeBtn = document.getElementById('minimize-btn');
        this.closeBtn = document.getElementById('close-btn');

        // Drag handle
        this.dragHandle = document.getElementById('drag-handle');
    }

    bindEvents() {
        // Timer controls
        this.startBtn.addEventListener('click', () => this.startTimer());
        this.pauseBtn.addEventListener('click', () => this.pauseTimer());
        this.resetBtn.addEventListener('click', () => this.resetTimer());

        // Settings
        this.applySettingsBtn.addEventListener('click', () => this.applySettings());

        // Window controls
        this.minimizeBtn.addEventListener('click', () => window.electronAPI.minimizeWindow());
        this.closeBtn.addEventListener('click', () => window.electronAPI.closeWindow());

        // Drag functionality
        this.dragHandle.addEventListener('mousedown', (e) => this.startDrag(e));

        // Theme change
        this.themeSelect.addEventListener('change', () => this.applyTheme());

        // Always on top change
        this.alwaysOnTopCheckbox.addEventListener('change', () => {
            if (window.electronAPI && window.electronAPI.setAlwaysOnTop) {
                window.electronAPI.setAlwaysOnTop(this.alwaysOnTopCheckbox.checked);
            }
        });
    }

    async loadSettings() {
        // Load settings from main process via IPC
        if (window.electronAPI && window.electronAPI.getSettings) {
            try {
                const settings = await window.electronAPI.getSettings();
                this.workDuration = settings.workDuration;
                this.breakDuration = settings.breakDuration;
                this.notificationsEnabled = settings.notificationsEnabled;

                // Update UI with loaded settings
                this.workDurationInput.value = this.workDuration / 60;
                this.breakDurationInput.value = this.breakDuration / 60;
                this.notificationsCheckbox.checked = this.notificationsEnabled;
                this.alwaysOnTopCheckbox.checked = settings.alwaysOnTop;
                this.themeSelect.value = settings.theme;

                // Apply theme immediately
                this.applyTheme();

                // Update timer if not running
                if (!this.isRunning) {
                    this.currentDuration = this.isWorkSession ? this.workDuration : this.breakDuration;
                    this.timeLeft = this.currentDuration;
                    this.updateDisplay();
                }
            } catch (error) {
                console.error('Failed to load settings:', error);
                // Fallback to defaults
                this.workDurationInput.value = this.workDuration / 60;
                this.breakDurationInput.value = this.breakDuration / 60;
                this.notificationsCheckbox.checked = this.notificationsEnabled;
            }
        } else {
            // Fallback to defaults
            this.workDurationInput.value = this.workDuration / 60;
            this.breakDurationInput.value = this.breakDuration / 60;
            this.notificationsCheckbox.checked = this.notificationsEnabled;
        }
    }

    startTimer() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.startBtn.disabled = true;
            this.pauseBtn.disabled = false;

            this.timerInterval = setInterval(() => {
                this.timeLeft--;
                this.updateDisplay();

                if (this.timeLeft <= 0) {
                    this.timerComplete();
                }
            }, 1000);
        }
    }

    pauseTimer() {
        if (this.isRunning) {
            this.isRunning = false;
            this.startBtn.disabled = false;
            this.pauseBtn.disabled = true;
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    resetTimer() {
        this.pauseTimer();
        this.timeLeft = this.currentDuration;
        this.updateDisplay();
    }

    timerComplete() {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.isRunning = false;

        // Show notification
        if (this.notificationsEnabled) {
            const title = this.isWorkSession ? 'Work Session Complete!' : 'Break Time Over!';
            const body = this.isWorkSession
                ? 'Time for a break!'
                : 'Back to work!';

            if (window.electronAPI && window.electronAPI.showNotification) {
                window.electronAPI.showNotification(title, body);
            }
        }

        // Switch session type
        this.isWorkSession = !this.isWorkSession;

        if (this.isWorkSession) {
            this.sessionCount++;
            this.currentDuration = this.workDuration;
        } else {
            this.currentDuration = this.breakDuration;
        }

        this.timeLeft = this.currentDuration;
        this.updateDisplay();

        // Auto-start next session after 3 seconds
        setTimeout(() => {
            if (!this.isRunning) {
                this.startTimer();
            }
        }, 3000);
    }

    updateDisplay() {
        // Update timer display
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        this.timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        // Update status
        this.timerStatus.textContent = this.isWorkSession ? 'Work Session' : 'Break Time';

        // Update session info
        this.sessionCountElement.textContent = `Session: ${this.sessionCount}`;
        this.nextSessionElement.textContent = this.isWorkSession
            ? `Next: ${this.breakDuration / 60} min break`
            : `Next: ${this.workDuration / 60} min work`;
    }

    async applySettings() {
        // Update timer durations
        this.workDuration = parseInt(this.workDurationInput.value) * 60;
        this.breakDuration = parseInt(this.breakDurationInput.value) * 60;

        // Update notifications setting
        this.notificationsEnabled = this.notificationsCheckbox.checked;

        // Reset timer if needed
        if (!this.isRunning) {
            this.currentDuration = this.isWorkSession ? this.workDuration : this.breakDuration;
            this.timeLeft = this.currentDuration;
            this.updateDisplay();
        }

        // Apply theme
        this.applyTheme();

        // Save all settings via IPC
        if (window.electronAPI && window.electronAPI.setSettings) {
            try {
                const settings = {
                    workDuration: this.workDuration,
                    breakDuration: this.breakDuration,
                    theme: this.themeSelect.value,
                    alwaysOnTop: this.alwaysOnTopCheckbox.checked,
                    notificationsEnabled: this.notificationsEnabled
                };

                await window.electronAPI.setSettings(settings);

                // Apply always on top setting
                if (window.electronAPI.setAlwaysOnTop) {
                    window.electronAPI.setAlwaysOnTop(settings.alwaysOnTop);
                }

                // Show confirmation
                alert('Settings applied successfully!');
            } catch (error) {
                console.error('Failed to save settings:', error);
                alert('Failed to save settings. Please try again.');
            }
        } else {
            alert('Settings applied (but not saved permanently).');
        }
    }

    applyTheme() {
        const theme = this.themeSelect.value;
        document.body.className = '';

        if (theme !== 'default') {
            document.body.classList.add(`theme-${theme}`);
        }
    }

    startDrag(e) {
        e.preventDefault();

        let offsetX = e.clientX;
        let offsetY = e.clientY;

        const mouseMoveHandler = (moveEvent) => {
            const dx = moveEvent.clientX - offsetX;
            const dy = moveEvent.clientY - offsetY;

            if (window.electronAPI && window.electronAPI.setWindowPosition) {
                const currentX = moveEvent.screenX - dx;
                const currentY = moveEvent.screenY - dy;
                window.electronAPI.setWindowPosition(currentX, currentY);
            }

            offsetX = moveEvent.clientX;
            offsetY = moveEvent.clientY;
        };

        const mouseUpHandler = () => {
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
        };

        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    }
}
// Export for unit testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PomodoroTimer };
}

// Initialize timer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.pomodoroTimer = new PomodoroTimer();
});