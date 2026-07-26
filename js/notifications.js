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

  showToast(icon, title, message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.style.animation = 'fade-in-shelf 0.3s ease-out';
    toast.innerHTML = `
      <span style="font-size: 26px;">${icon}</span>
      <div style="flex: 1;">
        <div style="font-weight: 700; font-size: 14px; color: var(--text-main);">${title}</div>
        <div style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">${message}</div>
      </div>
      <button onclick="this.parentElement.remove()" style="background: transparent; border: none; color: var(--text-subtle); cursor: pointer; font-size: 14px;">✕</button>
    `;

    container.appendChild(toast);
    this.playSound('alert');

    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }
    }, 5000);
  }

  scheduleRecurringNudges() {
    if (this.nudgeInterval) clearInterval(this.nudgeInterval);

    // Schedule periodic notebook check-ins every 25 mins
    this.nudgeInterval = setInterval(() => {
      this.triggerNotebookNudge();
    }, 1000 * 60 * 25);
  }

  triggerNotebookNudge() {
    let icon = '🍱';
    let title = "🍱 Lunchbox Remembrance Check";
    let message = "Take a mindful moment to review your active sketchbooks today.";

    if (window.store) {
      const activeNotebooks = window.store.getActiveNotebooks();
      // Find notebooks with uncompleted items
      const candidateNotebooks = activeNotebooks.filter(nb => (nb.items || []).some(i => !i.completed));
      
      if (candidateNotebooks.length > 0) {
        const randomNb = candidateNotebooks[Math.floor(Math.random() * candidateNotebooks.length)];
        const pendingItems = randomNb.items.filter(i => !i.completed);
        const randomItem = pendingItems[Math.floor(Math.random() * pendingItems.length)];
        
        icon = randomNb.icon || '📋';
        title = `${randomNb.icon} ${randomNb.title}`;
        message = `Don't forget: "${randomItem.title}"${randomItem.due ? ` (Due: ${randomItem.due})` : ''}`;
      } else {
        const parentNudges = [
          { icon: '🍱', title: "🍱 Don't forget your lunchbox!", message: "All caught up! Why not capture a new thought, movie recommendation, or goal today?" },
          { icon: '🦉', title: "🦉 Pippy AI Buddy checks in", message: "Your active journals are neat & tidy. Have a wonderful and peaceful day!" },
          { icon: '🌱', title: "🌱 Mindful Remembrance", message: "Taking a quick break? Reflect on your goals in your remembrance vault." }
        ];
        const n = parentNudges[Math.floor(Math.random() * parentNudges.length)];
        icon = n.icon;
        title = n.title;
        message = n.message;
      }
    }

    // 1. Show inside-app toast
    this.showToast(icon, title, message);
    
    // 2. Add to history
    if (window.store) {
      window.store.addNotificationToHistory({
        type: 'notebook',
        title: title,
        message: message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }

    // 3. Send REAL OS System Notification outside the website!
    if (window.stickyManager) {
      window.stickyManager.sendSystemNotification(title, message, false);
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

