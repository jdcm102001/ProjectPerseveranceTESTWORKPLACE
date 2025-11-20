/**
 * TimerManager - Handles period countdown timer
 *
 * Features:
 * - 10-minute countdown per period
 * - Auto-advance on expiration
 * - Pause/Resume functionality
 * - Visual display in header
 * - Event dispatching for UI updates
 */

const TimerManager = {
    // Timer configuration
    PERIOD_DURATION_SECONDS: 600,  // 10 minutes per period

    // Timer state
    remainingSeconds: 600,
    isRunning: false,
    isPaused: false,
    intervalId: null,

    // Callbacks
    onTick: null,        // Called every second with remainingSeconds
    onExpire: null,      // Called when timer reaches 0
    onPause: null,       // Called when timer paused
    onResume: null,      // Called when timer resumed

    /**
     * Initialize timer for current period
     * @param {Object} options - Configuration options
     * @param {Function} options.onTick - Callback for each second
     * @param {Function} options.onExpire - Callback on timer expiration
     * @param {Function} options.onPause - Callback on pause
     * @param {Function} options.onResume - Callback on resume
     * @param {boolean} options.autoStart - Start timer immediately (default: true)
     */
    init(options = {}) {
        this.onTick = options.onTick || null;
        this.onExpire = options.onExpire || null;
        this.onPause = options.onPause || null;
        this.onResume = options.onResume || null;

        this.reset();

        if (options.autoStart !== false) {
            this.start();
        }

        console.log('⏱️ Timer initialized: 10:00 per period');
    },

    /**
     * Start or resume the timer
     */
    start() {
        if (this.isRunning) {
            console.warn('Timer already running');
            return;
        }

        this.isRunning = true;
        this.isPaused = false;

        this.intervalId = setInterval(() => {
            this.tick();
        }, 1000);

        // Trigger onResume if we're resuming from pause
        if (this.onResume && this.remainingSeconds < this.PERIOD_DURATION_SECONDS) {
            this.onResume(this.remainingSeconds);
        }

        console.log(`▶️ Timer started: ${this.formatTime(this.remainingSeconds)}`);

        // Dispatch event
        window.dispatchEvent(new CustomEvent('timer-started', {
            detail: { remainingSeconds: this.remainingSeconds }
        }));
    },

    /**
     * Pause the timer
     */
    pause() {
        if (!this.isRunning) {
            console.warn('Timer not running');
            return;
        }

        clearInterval(this.intervalId);
        this.intervalId = null;
        this.isRunning = false;
        this.isPaused = true;

        if (this.onPause) {
            this.onPause(this.remainingSeconds);
        }

        console.log(`⏸️ Timer paused at ${this.formatTime(this.remainingSeconds)}`);

        // Dispatch event
        window.dispatchEvent(new CustomEvent('timer-paused', {
            detail: { remainingSeconds: this.remainingSeconds }
        }));
    },

    /**
     * Resume paused timer
     */
    resume() {
        if (!this.isPaused) {
            console.warn('Timer not paused');
            return;
        }

        this.start();
    },

    /**
     * Stop the timer completely
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        this.isRunning = false;
        this.isPaused = false;

        console.log('⏹️ Timer stopped');

        // Dispatch event
        window.dispatchEvent(new CustomEvent('timer-stopped', {
            detail: { remainingSeconds: this.remainingSeconds }
        }));
    },

    /**
     * Reset timer to period duration
     */
    reset() {
        this.stop();
        this.remainingSeconds = this.PERIOD_DURATION_SECONDS;

        if (this.onTick) {
            this.onTick(this.remainingSeconds);
        }

        console.log('🔄 Timer reset to 10:00');

        // Dispatch event
        window.dispatchEvent(new CustomEvent('timer-reset', {
            detail: { remainingSeconds: this.remainingSeconds }
        }));
    },

    /**
     * Handle timer tick (called every second)
     */
    tick() {
        this.remainingSeconds--;

        // Call tick callback
        if (this.onTick) {
            this.onTick(this.remainingSeconds);
        }

        // Dispatch tick event
        window.dispatchEvent(new CustomEvent('timer-tick', {
            detail: { remainingSeconds: this.remainingSeconds }
        }));

        // Check for expiration
        if (this.remainingSeconds <= 0) {
            this.handleExpiration();
        }

        // Warning at 1 minute remaining
        if (this.remainingSeconds === 60) {
            console.warn('⚠️ 1 minute remaining in period!');
            window.dispatchEvent(new CustomEvent('timer-warning', {
                detail: { remainingSeconds: 60 }
            }));
        }

        // Warning at 30 seconds remaining
        if (this.remainingSeconds === 30) {
            console.warn('⚠️ 30 seconds remaining in period!');
            window.dispatchEvent(new CustomEvent('timer-warning', {
                detail: { remainingSeconds: 30 }
            }));
        }
    },

    /**
     * Handle timer expiration
     */
    handleExpiration() {
        this.stop();

        console.log('⏰ Period timer expired! Auto-advancing...');

        // Call expiration callback
        if (this.onExpire) {
            this.onExpire();
        }

        // Dispatch expiration event
        window.dispatchEvent(new CustomEvent('timer-expired', {
            detail: { autoAdvance: true }
        }));
    },

    /**
     * Format seconds as MM:SS
     * @param {number} seconds - Total seconds
     * @returns {string} Formatted time (e.g., "09:45")
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },

    /**
     * Get timer status for display
     * @returns {Object} Status object
     */
    getStatus() {
        return {
            remainingSeconds: this.remainingSeconds,
            formattedTime: this.formatTime(this.remainingSeconds),
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            progressPercentage: ((this.PERIOD_DURATION_SECONDS - this.remainingSeconds) / this.PERIOD_DURATION_SECONDS) * 100
        };
    },

    /**
     * Add time to timer (for testing or game events)
     * @param {number} seconds - Seconds to add
     */
    addTime(seconds) {
        this.remainingSeconds += seconds;

        // Cap at period duration
        if (this.remainingSeconds > this.PERIOD_DURATION_SECONDS) {
            this.remainingSeconds = this.PERIOD_DURATION_SECONDS;
        }

        console.log(`⏱️ Added ${seconds}s to timer: ${this.formatTime(this.remainingSeconds)}`);

        if (this.onTick) {
            this.onTick(this.remainingSeconds);
        }
    },

    /**
     * Set custom duration (for testing)
     * @param {number} seconds - New duration in seconds
     */
    setDuration(seconds) {
        this.PERIOD_DURATION_SECONDS = seconds;
        this.reset();

        console.log(`⏱️ Timer duration set to ${this.formatTime(seconds)}`);
    }
};

// Export for ES6 modules
export { TimerManager };

// Also expose globally for HTML onclick handlers and console access
window.TimerManager = TimerManager;
