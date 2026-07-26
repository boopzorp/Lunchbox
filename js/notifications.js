/**
 * Lunchbox Notification & Audio Engine — Duolingo-Style Nudges + System OS Alerts (Point 3)
 * Synthesizes audio sound effects and delivers persistent OS desktop/mobile notifications.
 */

class NotificationEngine {
  constructor() {
    this.audioCtx = null;
    this.nudgeInterval = null;
    this.init();
  }

  init() {
    this.setupAudio();
    this.scheduleRecurringNudges();
  }

  setupAudio() {
    document.addEventListener('click', () => {
      if (!this.audioCtx && 'AudioContext' in window) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } else if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    }, { once: true });
  }

  playSound(type = 'chime') {
    const settings = window.store?.getSettings() || {};
    if (settings.soundEnabled === false) return;
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      if (type === 'pop') {
        // High playful pop when checking off an item or unlocking timer
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'chime') {
        // Subtle paper / UI chime
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(660, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'alert') {
        // Duolingo loving parent chime
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880, now + 0.1); // A5
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch (e) {
      console.warn("Audio synth error:", e);
    }
  }

  showToast(icon, title, message, persistent = false) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-item' + (persistent ? ' toast-persistent' : '');
    toast.style.animation = 'fade-in-shelf 0.3s ease-out';
    
    const closeBtnHTML = persistent ? '' : `
      <button onclick="this.parentElement.remove()" style="background: transparent; border: none; color: var(--text-subtle); cursor: pointer; font-size: 14px; padding: 4px;" title="Dismiss notification">✕</button>
    `;

    toast.innerHTML = `
      <span style="font-size: 26px;">${icon}</span>
      <div style="flex: 1;">
        <div style="font-weight: 700; font-size: 14px; color: var(--text-main);">${title}</div>
        <div style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">${message}</div>
      </div>
      ${closeBtnHTML}
    `;

    container.appendChild(toast);
    this.playSound('alert');

    if (!persistent) {
      setTimeout(() => {
        if (toast.parentElement) {
          toast.style.opacity = '0';
          toast.style.transform = 'translateY(-10px)';
          toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          setTimeout(() => toast.remove(), 300);
        }
      }, 6000);
    }
  }

  scheduleRecurringNudges() {
    if (this.nudgeInterval) clearInterval(this.nudgeInterval);

    // Load last 6h nudge timestamp and notebook index
    this.load6HState();

    // Check immediately on load/init
    this.check6HourNudge();

    // Check every 1 minute if 6 hours (21,600,000 ms) has passed
    this.nudgeInterval = setInterval(() => {
      this.check6HourNudge();
    }, 60 * 1000);
  }

  load6HState() {
    try {
      const data = JSON.parse(localStorage.getItem('lunchbox_6h_nudge_state') || '{}');
      this.lastNudgeTime = data.lastNudgeTime || 0;
      this.currentNotebookIndex = data.currentNotebookIndex || 0;
    } catch (e) {
      this.lastNudgeTime = 0;
      this.currentNotebookIndex = 0;
    }
  }

  save6HState() {
    localStorage.setItem('lunchbox_6h_nudge_state', JSON.stringify({
      lastNudgeTime: this.lastNudgeTime,
      currentNotebookIndex: this.currentNotebookIndex
    }));
  }

  check6HourNudge() {
    const SIX_HOURS_MS = 6 * 60 * 60 * 1000; // 6 Hours
    const now = Date.now();

    if (now - this.lastNudgeTime >= SIX_HOURS_MS) {
      this.triggerNotebookNudge();
    }
  }

  triggerNotebookNudge() {
    if (!window.store) return;

    const activeNotebooks = window.store.getActiveNotebooks();
    if (!activeNotebooks || activeNotebooks.length === 0) return;

    // Requirement 2: Pick notebook in rotation across user's notebooks every 6 hours
    const nbIndex = (this.currentNotebookIndex || 0) % activeNotebooks.length;
    const targetNb = activeNotebooks[nbIndex];

    // Advance index for next 6-hour cycle
    this.currentNotebookIndex = (nbIndex + 1) % activeNotebooks.length;
    this.lastNudgeTime = Date.now();
    this.save6HState();

    // Requirement 3: Text-only loving nudges (no images) reminding user that the app exists & inviting them back
    const pendingItems = (targetNb.items || []).filter(i => !i.completed);
    let nudgeMessage = "";

    if (pendingItems.length > 0) {
      const randomItem = pendingItems[Math.floor(Math.random() * pendingItems.length)];
      nudgeMessage = `Hey! Don't forget: "${randomItem.title}" inside ${targetNb.title}. I'm right here whenever you want to unpack!`;
    } else {
      const nudgeMessages = [
        `Hey there! Just a friendly reminder from ${targetNb.title} — I'm right here in your Lunchbox whenever you're ready to check in!`,
        `Hey, I exist! Don't forget your thoughts and reminders packed inside ${targetNb.title}.`,
        `Mindful check-in: Take a quick look at ${targetNb.title} in your Lunchbox vault today!`,
        `Pippy says hi! Your ${targetNb.title} sketchbook is waiting for you whenever you have a free moment.`
      ];
      nudgeMessage = nudgeMessages[Math.floor(Math.random() * nudgeMessages.length)];
    }

    const title = `${targetNb.icon || '📝'} ${targetNb.title}`;
    const icon = targetNb.icon || '🍱';

    // 1. Show DISMISSABLE in-app toast with close button (persistent: false)
    this.showToast(icon, title, nudgeMessage, false);

    // 2. Add to history
    window.store.addNotificationToHistory({
      type: 'notebook',
      title: title,
      message: nudgeMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    // 3. Send DISMISSABLE system OS notification (requireInteraction: false)
    if (window.stickyManager) {
      window.stickyManager.sendSystemNotification(title, nudgeMessage, false);
    }
  }

  triggerRandomNudge() {
    this.triggerNotebookNudge();
  }

  testDuolingoNudge() {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission().then(() => {
        this.triggerNotebookNudge();
      });
    } else {
      this.triggerNotebookNudge();
    }
  }
}

window.notificationEngine = new NotificationEngine();

// --- GENERIC IN-APP DIALOG SYSTEM (Replaces native browser alert() and confirm()) ---
class AppModalManager {
  alert(message, title = 'Notice', icon = '💡') {
    return new Promise((resolve) => {
      const modal = document.getElementById('app-dialog-modal');
      const iconEl = document.getElementById('app-dialog-icon');
      const headingEl = document.getElementById('app-dialog-heading');
      const msgEl = document.getElementById('app-dialog-message');
      const cancelBtn = document.getElementById('app-dialog-cancel-btn');
      const confirmBtn = document.getElementById('app-dialog-confirm-btn');

      if (!modal) {
        if (window.notificationEngine) window.notificationEngine.showToast(icon, title, message);
        resolve(true);
        return;
      }

      if (iconEl) iconEl.textContent = icon;
      if (headingEl) headingEl.textContent = title;
      if (msgEl) msgEl.textContent = message;
      if (cancelBtn) cancelBtn.style.display = 'none';
      
      if (confirmBtn) {
        confirmBtn.textContent = 'OK';
        confirmBtn.className = 'btn btn-primary';
        confirmBtn.style.background = '';
        confirmBtn.style.color = '';
        confirmBtn.style.border = '';
      }

      const handleConfirm = () => {
        modal.close();
        cleanup();
        resolve(true);
      };

      const handleClose = () => {
        cleanup();
        resolve(true);
      };

      function cleanup() {
        if (confirmBtn) confirmBtn.removeEventListener('click', handleConfirm);
        modal.removeEventListener('close', handleClose);
      }

      if (confirmBtn) confirmBtn.onclick = handleConfirm;
      modal.addEventListener('close', handleClose, { once: true });
      modal.showModal();
      if (window.notificationEngine) window.notificationEngine.playSound('chime');
    });
  }

  confirm(message, title = 'Confirm Action', icon = '❓', confirmText = 'Confirm', cancelText = 'Cancel', isDangerous = false) {
    return new Promise((resolve) => {
      const modal = document.getElementById('app-dialog-modal');
      const iconEl = document.getElementById('app-dialog-icon');
      const headingEl = document.getElementById('app-dialog-heading');
      const msgEl = document.getElementById('app-dialog-message');
      const cancelBtn = document.getElementById('app-dialog-cancel-btn');
      const confirmBtn = document.getElementById('app-dialog-confirm-btn');

      if (!modal) {
        resolve(false);
        return;
      }

      if (iconEl) iconEl.textContent = icon;
      if (headingEl) headingEl.textContent = title;
      if (msgEl) msgEl.textContent = message;

      if (cancelBtn) {
        cancelBtn.style.display = 'block';
        cancelBtn.textContent = cancelText;
      }

      if (confirmBtn) {
        confirmBtn.textContent = confirmText;
        if (isDangerous) {
          confirmBtn.className = 'btn';
          confirmBtn.style.background = '#E53935';
          confirmBtn.style.color = '#FFFFFF';
          confirmBtn.style.border = 'none';
        } else {
          confirmBtn.className = 'btn btn-primary';
          confirmBtn.style.background = '';
          confirmBtn.style.color = '';
          confirmBtn.style.border = '';
        }
      }

      let resolved = false;

      const handleConfirm = () => {
        if (resolved) return;
        resolved = true;
        modal.close();
        cleanup();
        resolve(true);
      };

      const handleCancel = () => {
        if (resolved) return;
        resolved = true;
        modal.close();
        cleanup();
        resolve(false);
      };

      const handleClose = () => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve(false);
      };

      function cleanup() {
        if (confirmBtn) confirmBtn.removeEventListener('click', handleConfirm);
        if (cancelBtn) cancelBtn.removeEventListener('click', handleCancel);
        modal.removeEventListener('close', handleClose);
      }

      if (confirmBtn) confirmBtn.onclick = handleConfirm;
      if (cancelBtn) cancelBtn.onclick = handleCancel;
      modal.addEventListener('close', handleClose, { once: true });
      modal.showModal();
      if (window.notificationEngine) window.notificationEngine.playSound('chime');
    });
  }
}

window.appModal = new AppModalManager();

// Global safety override to prevent native browser alert dialogs
window.alert = function(message) {
  window.appModal.alert(String(message), 'Lunchbox Notice', '💡');
};

