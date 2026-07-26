/**
 * Lunchbox Store
 * Handles LocalStorage persistence, CRUD operations for notebooks, items, custom collage stickers,
 * and customizable book aesthetics (cover color, spine color, spine text, cover title & description).
 */

const STORAGE_KEY = 'lunchbox_app_data_v3'; // Bumped for customizable book cover aesthetics

const DEFAULT_DATA = {
  settings: {
    theme: 'light', // 'light' | 'dark'
    soundEnabled: true,
    stickyDismissedToday: false,
    stickyDate: new Date().toDateString(),
    stickyTimeSpentSeconds: 0,
    stickyRequiredSeconds: 300,
    notificationFrequency: 'hourly',
    aiApiKey: '',
    aiModel: 'built-in'
  },
  notebooks: [
    {
      id: 'nb-tasks',
      title: 'Daily Tasks & Action Items',
      icon: '📋',
      color: 'green',
      spineColor: 'green',
      coverColor: 'cream',
      spineText: '2026 • LUNCHBOX',
      pageFormat: 'grid', // 'grid', 'lined', 'dots', 'unruled'
      description: 'Things you must do today so you can relax tonight!',
      stickers: [
        { id: 'st-1', url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&auto=format&fit=crop&q=80', spreadIdx: 0, pageSide: 'left', x: 15, y: 20, rotation: -4, caption: 'Vintage Books' }
      ],
      items: [
        { id: 'item-1', title: 'Welcome to Lunchbox! Write your first note here.', completed: false, priority: 'medium', due: 'Today', category: 'Personal', notes: 'You can create custom books, change paper styles, and add stickers.' }
      ]
    }
  ],
  notificationsHistory: [
    {
      id: 'notif-init-1',
      title: '🍱 Welcome to Lunchbox!',
      message: 'Your personal remembrance vault is ready. Create new notebooks and add your reminders anytime!',
      time: 'Just now',
      read: false,
      type: 'parent'
    }
  ]
};

class Store {
  constructor() {
    this.data = this.load();
    this.listeners = [];
  }

  load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        this.saveRaw(DEFAULT_DATA);
        return JSON.parse(JSON.stringify(DEFAULT_DATA));
      }
      const parsed = JSON.parse(stored);
      
      if (!parsed.notebooks || !Array.isArray(parsed.notebooks) || parsed.notebooks.length === 0) {
        parsed.notebooks = JSON.parse(JSON.stringify(DEFAULT_DATA.notebooks));
      } else {
        parsed.notebooks.forEach(nb => {
          if (!nb.pageFormat) nb.pageFormat = 'grid';
          if (!nb.stickers) nb.stickers = [];
          if (!nb.spineColor) nb.spineColor = nb.color || 'green';
          if (!nb.coverColor) nb.coverColor = 'cream';
          if (!nb.spineText) nb.spineText = '2026 • LUNCHBOX';
        });
      }
      if (!parsed.notificationsHistory || !Array.isArray(parsed.notificationsHistory)) {
        parsed.notificationsHistory = JSON.parse(JSON.stringify(DEFAULT_DATA.notificationsHistory));
      }
      if (!parsed.settings) {
        parsed.settings = JSON.parse(JSON.stringify(DEFAULT_DATA.settings));
      }

      const today = new Date().toDateString();
      if (parsed.settings && parsed.settings.stickyDate !== today) {
        parsed.settings.stickyDismissedToday = false;
        parsed.settings.stickyTimeSpentSeconds = 0;
        parsed.settings.stickyDate = today;
      }
      return parsed;
    } catch (e) {
      console.error('Failed to load storage, initializing default', e);
      return JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
  }

  saveRaw(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }

  save() {
    this.saveRaw(this.data);
    this.notify();
    // Real-time Cloud Firestore Backup
    if (window.firebaseDb && window.authEngine && window.authEngine.isAuthenticated()) {
      const user = window.authEngine.getCurrentUser();
      try {
        const cleanData = JSON.parse(JSON.stringify(this.data));
        window.firebaseDb.collection('users').doc(user.uid).set(cleanData, { merge: true })
          .catch(err => console.error("Cloud sync error:", err));
      } catch (err) {
        console.error("Failed to serialize data for Firestore:", err);
      }
    }
  }

  setState(newData) {
    if (newData && newData.notebooks) {
      this.data = newData;
      this.saveRaw(this.data);
      this.notify();
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(l => l(this.data));
  }

  getSettings() {
    return this.data.settings || {};
  }

  updateSettings(newSettings) {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.save();
  }

  getNotebooks() {
    return this.data.notebooks || [];
  }

  getActiveNotebooks() {
    return (this.data.notebooks || []).filter(n => !n.archived);
  }

  getArchivedNotebooks() {
    return (this.data.notebooks || []).filter(n => n.archived === true);
  }

  getNotebook(id) {
    return (this.data.notebooks || []).find(n => n.id === id);
  }

  addNotebook({ title, icon, color, spineColor, coverColor, spineText, description }) {
    const newNb = {
      id: 'nb-' + Date.now(),
      title,
      icon: icon || '🎒',
      color: color || 'green',
      spineColor: spineColor || color || 'green',
      coverColor: coverColor || 'cream',
      spineText: spineText || '2026 • LUNCHBOX',
      pageFormat: 'grid',
      description: description || 'Packed with thoughts and memories.',
      archived: false,
      stickers: [],
      items: []
    };
    this.data.notebooks.push(newNb);
    this.save();
    return newNb;
  }

  updateNotebook(id, updates) {
    const nb = this.getNotebook(id);
    if (nb) {
      Object.assign(nb, updates);
      this.save();
    }
  }

  archiveNotebook(id) {
    const nb = this.getNotebook(id);
    if (nb) {
      nb.archived = true;
      this.save();
    }
  }

  unarchiveNotebook(id) {
    const nb = this.getNotebook(id);
    if (nb) {
      nb.archived = false;
      this.save();
    }
  }

  deleteNotebook(id) {
    this.data.notebooks = (this.data.notebooks || []).filter(n => n.id !== id);
    this.save();
  }

  addSticker(notebookId, { url, spreadIdx, pageSide, x, y, width, rotation, caption }) {
    const nb = this.getNotebook(notebookId);
    if (!nb) return;
    if (!nb.stickers) nb.stickers = [];
    const newSticker = {
      id: 'st-' + Date.now(),
      url,
      spreadIdx: spreadIdx !== undefined ? spreadIdx : 0,
      pageSide: pageSide || 'right',
      x: x !== undefined ? x : 30,
      y: y !== undefined ? y : 30,
      width: width ? parseInt(width) : 160,
      rotation: rotation !== undefined ? rotation : Math.round((Math.random() - 0.5) * 16),
      caption: caption || ''
    };
    nb.stickers.push(newSticker);
    this.save();
    return newSticker;
  }

  updateStickerPosition(notebookId, stickerId, { x, y }) {
    const nb = this.getNotebook(notebookId);
    if (!nb || !nb.stickers) return;
    const st = nb.stickers.find(s => s.id === stickerId);
    if (st) {
      if (x !== undefined) st.x = x;
      if (y !== undefined) st.y = y;
      this.save();
    }
  }

  updateStickerSize(notebookId, stickerId, width) {
    const nb = this.getNotebook(notebookId);
    if (!nb || !nb.stickers) return;
    const st = nb.stickers.find(s => s.id === stickerId);
    if (st) {
      st.width = parseInt(width);
      this.save();
    }
  }

  deleteSticker(notebookId, stickerId) {
    const nb = this.getNotebook(notebookId);
    if (!nb || !nb.stickers) return;
    nb.stickers = nb.stickers.filter(s => s.id !== stickerId);
    this.save();
  }

  addItem(notebookId, { title, priority, due, category, notes }) {
    const nb = this.getNotebook(notebookId);
    if (!nb) return;
    const newItem = {
      id: 'item-' + Date.now(),
      title,
      completed: false,
      priority: priority || 'medium',
      due: due || 'Today',
      category: category || 'General',
      notes: notes || ''
    };
    nb.items.unshift(newItem);
    this.save();
    return newItem;
  }

  toggleItem(notebookId, itemId) {
    const nb = this.getNotebook(notebookId);
    if (!nb) return null;
    const item = nb.items.find(i => i.id === itemId);
    if (item) {
      item.completed = !item.completed;
      this.save();
      return item;
    }
    return null;
  }

  deleteItem(notebookId, itemId) {
    const nb = this.getNotebook(notebookId);
    if (!nb) return;
    nb.items = nb.items.filter(i => i.id !== itemId);
    this.save();
  }

  updateItem(notebookId, itemId, updates) {
    const nb = this.getNotebook(notebookId);
    if (!nb) return null;
    const item = nb.items.find(i => i.id === itemId);
    if (item) {
      Object.assign(item, updates);
      this.save();
      return item;
    }
    return null;
  }

  addNotificationToHistory(notif) {
    if (!this.data.notificationsHistory) this.data.notificationsHistory = [];
    this.data.notificationsHistory.unshift({
      id: 'notif-' + Date.now(),
      title: notif.title,
      message: notif.message,
      time: notif.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false,
      type: notif.type || 'parent'
    });
    if (this.data.notificationsHistory.length > 30) {
      this.data.notificationsHistory = this.data.notificationsHistory.slice(0, 30);
    }
    this.save();
  }

  markAllNotificationsRead() {
    if (!this.data.notificationsHistory) return;
    this.data.notificationsHistory.forEach(n => n.read = true);
    this.save();
  }

  resetToDefault() {
    this.saveRaw(DEFAULT_DATA);
    this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    this.notify();
  }
}

window.store = new Store();
