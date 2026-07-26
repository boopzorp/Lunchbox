/**
 * Lunchbox Remembrance Engine — System Sticky Notifications & 5-Min Lock (Point 3)
 * Integrates Web Notification API for native OS desktop/mobile notifications outside the browser tab.
 */

class StickyNotificationManager {
  constructor() {
    this.timerInterval = null;
    this.activeSeconds = 0;
    this.requiredSeconds = 300; // 5 minutes
    this.isUnlocked = false;
    this.systemNotificationSent = false;
    this.init();
  }

  init() {
    this.loadState();
    this.setupTracking();
    this.renderStickyBanner();
    this.registerServiceWorker();
    this.checkSystemPermission();
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js?v=20260726').then(reg => {
        this.swRegistration = reg;
      }).catch(err => {
        console.warn('Service Worker registration skipped:', err);
      });
    }
  }

  loadState() {
    const saved = localStorage.getItem('lunchbox_sticky_timer');
    if (saved) {
      const data = JSON.parse(saved);
      this.activeSeconds = data.activeSeconds || 0;
      this.isUnlocked = data.isUnlocked || false;
      this.systemNotificationSent = data.systemNotificationSent || false;
    }
  }

  saveState() {
    localStorage.setItem('lunchbox_sticky_timer', JSON.stringify({
      activeSeconds: this.activeSeconds,
      isUnlocked: this.isUnlocked,
      systemNotificationSent: this.systemNotificationSent,
      lastUpdated: new Date().toISOString()
    }));
  }

  checkSystemPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      document.addEventListener('click', () => {
        if (Notification.permission === 'default') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              this.sendSystemNotification("🍱 Lunchbox Linked to OS", "Sticky remembrance is now active on your system desktop and mobile notifications!");
            }
          });
        }
      }, { once: true });
    }
  }

  sendSystemNotification(title, body, requireInteraction = false, customTag = null) {
    if (!('Notification' in window)) {
      console.warn("Web Notifications API is not supported in this browser environment.");
      return;
    }

    const options = {
      body: body,
      icon: 'icon.png',
      badge: 'icon.png',
      tag: customTag || (requireInteraction ? 'lunchbox-sticky-persistent' : ('lunchbox-nudge-' + Date.now())),
      requireInteraction: requireInteraction,
      renotify: true,
      silent: false,
      data: { url: window.location.href, timestamp: Date.now() }
    };

    const dispatchNotification = () => {
      try {
        if (this.swRegistration && this.swRegistration.showNotification) {
          this.swRegistration.showNotification(title, options);
        } else if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(title, options);
          }).catch(() => {
            this.fallbackNotification(title, options);
          });
        } else {
          this.fallbackNotification(title, options);
        }
      } catch (err) {
        this.fallbackNotification(title, options);
      }
    };

    if (Notification.permission === 'granted') {
      dispatchNotification();
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          dispatchNotification();
        }
      });
    }
  }

  fallbackNotification(title, options) {
    try {
      const notif = new Notification(title, options);
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    } catch (e) {
      console.warn("Fallback notification failed:", e);
    }
  }

  setupTracking() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    // Track active engagement time
    this.timerInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && !this.isUnlocked) {
        this.activeSeconds++;
        this.saveState();
        this.renderStickyBanner();

        // Check if unlocked!
        if (this.activeSeconds >= this.requiredSeconds) {
          this.unlockRemembrance();
        }
      }
    }, 1000);

    // Send OS system notification if tab is backgrounded before 5 minutes are completed!
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && !this.isUnlocked && !this.systemNotificationSent) {
        const rem = Math.ceil((this.requiredSeconds - this.activeSeconds) / 60);
        this.sendSystemNotification(
          "📌 Lunchbox Reminder Sticky",
          `Don't forget your lunchbox! You still have ${rem} mindful min remaining today to clear this sticky OS notification.`,
          true
        );
        this.systemNotificationSent = true;
        this.saveState();
      }
    });
  }

  unlockRemembrance() {
    this.isUnlocked = true;
    this.saveState();
    this.renderStickyBanner();
    
    // Play celebratory sound
    if (window.notificationEngine) {
      window.notificationEngine.playSound('pop');
    }

    // Send triumphant OS System Notification!
    this.sendSystemNotification(
      "✨ Lunchbox Vault Unlocked!",
      "You have spent 5 mindful minutes inside your remembrance journals today! Sticky notifications removed.",
      false
    );

    // Show inside-app toast
    if (window.notificationEngine) {
      window.notificationEngine.showToast('🍱', 'Sticky Lock Removed!', 'You spent 5 mindful minutes inside Lunchbox today!');
    }
  }

  renderStickyBanner() {
    const container = document.getElementById('bookmark-lock-container');
    if (!container) return;

    if (this.isUnlocked) {
      container.innerHTML = `
        <div class="bookmark-lock" style="border-color: rgba(52, 199, 89, 0.4); background: rgba(232, 249, 238, 0.95); color: #1E4D2B; cursor: default;">
          <span>✨</span>
          <span>Mindful Lock Unlocked</span>
          <span class="bookmark-timer-pill" style="background: rgba(52,199,89,0.2); color: #1E4D2B;">05:00</span>
        </div>
      `;
      return;
    }

    const remaining = Math.max(0, this.requiredSeconds - this.activeSeconds);
    const mins = Math.floor(remaining / 60).toString().padStart(2, '0');
    const secs = (remaining % 60).toString().padStart(2, '0');

    const osBtnHTML = ('Notification' in window && Notification.permission !== 'granted') ? 
      `<button class="btn btn-sm btn-outline" style="padding: 2px 8px; font-size: 11px;" onclick="window.stickyManager.enableOSNotifications()">🔔 Link OS</button>` : '';

    container.innerHTML = `
      <div class="bookmark-lock" onclick="window.stickyManager.showOSLockModal()" title="Click to view OS System Lock status">
        <span>📌</span>
        <span>Mindful Lock:</span>
        <span class="bookmark-timer-pill">${mins}:${secs}</span>
        <span>left</span>
        ${osBtnHTML}
      </div>
    `;
  }

  enableOSNotifications() {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          this.sendSystemNotification("🍱 OS Linked Successfully", "Sticky notifications will now alert you on your desktop and mobile screen when you leave!");
          this.renderStickyBanner();
        }
      });
    }
  }

  showOSLockModal() {
    const modal = document.getElementById('home-screen-widget-modal');
    if (!modal) return;
    
    const remaining = Math.max(0, this.requiredSeconds - this.activeSeconds);
    const mins = Math.floor(remaining / 60).toString().padStart(2, '0');
    const secs = (remaining % 60).toString().padStart(2, '0');
    
    const osStatus = !('Notification' in window) ? 'Not supported in this browser' :
                     (Notification.permission === 'granted' ? '🟢 Linked & Active on Desktop/Mobile OS' : '🔴 Click below to Link System Notifications');

    const preview = document.getElementById('widget-preview-content');
    if (preview) {
      preview.innerHTML = `
        <div style="background: #1D1D1F; color: #fff; padding: 20px; border-radius: 18px; font-family: -apple-system, sans-serif; position: relative;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span style="font-size: 12px; font-weight: 600; color: #86868B;">SYSTEM NOTIFICATION LOCK</span>
            <span style="background: #FF6B57; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">STICKY</span>
          </div>
          <div style="display: flex; gap: 12px; align-items: center;">
            <span style="font-size: 32px;">🍱</span>
            <div>
              <div style="font-weight: 700; font-size: 15px;">Lunchbox Remembrance Lock</div>
              <div style="font-size: 12.5px; color: #A1A1A6; margin-top: 2px;">Keep your focus. Spend 5 mindful minutes to unlock your notes for today.</div>
            </div>
          </div>
          <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <span style="font-family: monospace; font-size: 14px; font-weight: 700; color: #34C759;">⏳ ${mins}:${secs} remaining</span>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-sm" style="background: rgba(255,255,255,0.15); color: #fff; font-size: 12px;" onclick="window.notificationEngine?.triggerNotebookNudge()">🔔 Notebook Nudge</button>
              <button class="btn btn-sm" style="background: #fff; color: #1D1D1F; font-weight: 700; font-size: 12px;" onclick="window.stickyManager.enableOSNotifications()">📌 Link System</button>
            </div>
          </div>
        </div>
        <div style="margin-top: 14px; font-size: 12.5px; color: var(--text-muted); text-align: center;">
          System Status: <strong>${osStatus}</strong>
        </div>
        
        <div style="margin-top: 14px; padding: 12px; background: rgba(0,0,0,0.04); border-radius: 12px; border: 1px solid var(--border-subtle); font-size: 12px; line-height: 1.4; color: var(--text-muted);">
          <div style="font-weight: 700; color: var(--text-main); margin-bottom: 4px;">🍎 macOS System Notification Troubleshooting:</div>
          If notifications don't show up in your Mac Notification Center (top-right menu bar):
          <ol style="margin: 4px 0 0 16px; padding: 0;">
            <li>Open <strong>System Settings > Notifications > Google Chrome</strong></li>
            <li>Ensure <strong>"Allow Notifications"</strong> is ON and Alert Style is set to <strong>Banners</strong></li>
            <li>Turn off Mac <strong>Do Not Disturb / Focus Mode</strong></li>
          </ol>
        </div>
      `;
    }
    
    modal.showModal();
  }

  openWidgetModal() {
    this.showOSLockModal();
  }

  reset() {
    this.activeSeconds = 0;
    this.isUnlocked = false;
    this.systemNotificationSent = false;
    this.saveState();
    this.renderStickyBanner();
  }
}

window.stickyManager = new StickyNotificationManager();
