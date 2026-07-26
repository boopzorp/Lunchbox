/**
 * Lunchbox Main Application Controller — Ultra-Minimal iPadOS "Paper" Edition
 * 3D Carousel sliding animations, customizable book covers & spines, crisp text legibility, desktop & touch swipe gestures, and draggable/resizable Pinterest collage stickers.
 */

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

class App {
  constructor() {
    this.viewMode = (window.authEngine && window.authEngine.isAuthenticated()) ? 'shelf' : 'landing'; // Forefront Gated Landing Page
    this.currentView = 'nb-tasks';
    this.currentSpreadIdx = 0; // 0 is Cover Spread, 1 is Inside Spread 1, etc.
    this.carouselIndex = 0; // Active center book index in carousel
    this.draggedSticker = null;
    this.resizingSticker = null;
    this.isFlipping = false;
    
    this.swipeStartX = 0;
    this.swipeStartY = 0;
    this.isSwiping = false;

    this.init();
  }

  init() {
    const start = () => {
      this.setupTheme();
      this.render();
      this.setupEventListeners();
      this.setupSwipeGestures();
      
      if (window.store) {
        window.store.subscribe(() => {
          this.render();
        });
      }

      if (window.lunchboxAI) {
        window.lunchboxAI.renderChat();
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }
  }

  setupTheme() {
    const settings = window.store?.getSettings() || { theme: 'light' };
    document.documentElement.setAttribute('data-theme', settings.theme);
  }

  setupEventListeners() {
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768) {
        const paletteLeft = document.getElementById('palette-left');
        const paletteRight = document.getElementById('palette-right');
        if (paletteLeft && !paletteLeft.classList.contains('collapsed') && !e.target.closest('#palette-left') && !e.target.closest('.mobile-nav-btn')) {
          paletteLeft.classList.add('collapsed');
        }
        if (paletteRight && !paletteRight.classList.contains('collapsed') && !e.target.closest('#palette-right') && !e.target.closest('.mobile-nav-btn')) {
          paletteRight.classList.add('collapsed');
        }
      }
    });
    document.addEventListener('keydown', (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'SELECT') return;
      if (e.key === 'ArrowLeft') {
        if (this.viewMode === 'shelf') {
          this.spinCarousel(-1);
        } else {
          this.prevPage();
        }
      } else if (e.key === 'ArrowRight') {
        if (this.viewMode === 'shelf') {
          this.spinCarousel(1);
        } else {
          this.nextPage();
        }
      } else if (e.key === 'Escape' && this.viewMode === 'book') {
        this.showShelfView();
      }
    });

    const aiForm = document.getElementById('ai-chat-form');
    const aiInput = document.getElementById('ai-chat-input');
    if (aiForm && aiInput) {
      aiForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = aiInput.value.trim();
        if (text && window.lunchboxAI) {
          window.lunchboxAI.processUserQuery(text);
          aiInput.value = '';
        }
      });
    }

    const itemForm = document.getElementById('new-item-form');
    if (itemForm) {
      itemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleCreateItem(new FormData(itemForm));
      });
    }

    const nbForm = document.getElementById('new-notebook-form');
    if (nbForm) {
      nbForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleCreateNotebook(new FormData(nbForm));
      });
    }

    const editNbForm = document.getElementById('edit-notebook-form');
    if (editNbForm) {
      editNbForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleUpdateNotebookDetails(new FormData(editNbForm));
      });
    }

    const editItemForm = document.getElementById('edit-item-form');
    if (editItemForm) {
      editItemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleUpdateItem(new FormData(editItemForm));
      });
    }

    const stickerForm = document.getElementById('add-sticker-form');
    if (stickerForm) {
      stickerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAddSticker(new FormData(stickerForm));
      });
    }

    const closeAi = document.getElementById('close-ai-drawer');
    if (closeAi) {
      closeAi.addEventListener('click', () => this.toggleAIDrawer(false));
    }

    document.addEventListener('mousemove', (e) => this.handleStickerDragMove(e));
    document.addEventListener('mouseup', () => this.handleStickerDragEnd());
  }

  // FLAWLESS DESKTOP MOUSE DRAG AND MOBILE TOUCH SWIPE GESTURES
  setupSwipeGestures() {
    const mainContainer = document.getElementById('main-book-container');
    if (!mainContainer) return;

    const startSwipe = (clientX, clientY) => {
      this.swipeStartX = clientX;
      this.swipeStartY = clientY;
      this.isSwiping = true;
    };

    const moveSwipe = (clientX, clientY, e) => {
      if (!this.isSwiping) return;
      const deltaX = clientX - this.swipeStartX;
      const deltaY = clientY - this.swipeStartY;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20) {
        if (e.cancelable) e.preventDefault();
      }
    };

    const endSwipe = (clientX, clientY) => {
      if (!this.isSwiping) return;
      const deltaX = clientX - this.swipeStartX;
      const deltaY = clientY - this.swipeStartY;

      if (Math.abs(deltaX) > 40 && Math.abs(deltaY) < 100) {
        if (deltaX < 0) {
          if (this.viewMode === 'shelf') this.spinCarousel(1);
          else this.nextPage();
        } else {
          if (this.viewMode === 'shelf') this.spinCarousel(-1);
          else this.prevPage();
        }
      }
      this.isSwiping = false;
    };

    // Mobile Touch Events
    mainContainer.addEventListener('touchstart', (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
      startSwipe(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    mainContainer.addEventListener('touchmove', (e) => {
      if (!this.isSwiping) return;
      moveSwipe(e.touches[0].clientX, e.touches[0].clientY, e);
    }, { passive: false });

    mainContainer.addEventListener('touchend', (e) => {
      if (!this.isSwiping) return;
      endSwipe(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    }, { passive: true });

    // Desktop Mouse Drag Swiping
    mainContainer.addEventListener('mousedown', (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || e.target.closest('.draggable-sticker') || e.target.closest('.circular-fab') || e.target.closest('button')) return;
      startSwipe(e.clientX, e.clientY);
    });

    mainContainer.addEventListener('mousemove', (e) => {
      if (!this.isSwiping) return;
      moveSwipe(e.clientX, e.clientY, e);
    });

    mainContainer.addEventListener('mouseup', (e) => {
      if (!this.isSwiping) return;
      endSwipe(e.clientX, e.clientY);
    });
  }

  togglePalette(side, forceState = null) {
    const palette = document.getElementById(`palette-${side}`);
    if (!palette) return;
    if (forceState === true) {
      palette.classList.remove('collapsed');
    } else if (forceState === false) {
      palette.classList.add('collapsed');
    } else {
      palette.classList.toggle('collapsed');
    }
    if (window.notificationEngine) window.notificationEngine.playSound('chime');
  }

  showShelfView() {
    this.viewMode = 'shelf';
    this.render();
    if (window.notificationEngine) window.notificationEngine.playSound('chime');
  }

  spinCarousel(direction) {
    const notebooks = window.store.getActiveNotebooks();
    if (notebooks.length <= 1) return;
    this.carouselIndex = (this.carouselIndex + direction + notebooks.length) % notebooks.length;
    
    const stage = document.querySelector('.carousel-stage');
    if (stage && this.viewMode === 'shelf') {
      this.updateCarouselDOM();
    } else {
      this.render();
    }
    if (window.notificationEngine) window.notificationEngine.playSound('chime');
  }

  updateCarouselDOM() {
    const notebooks = window.store.getActiveNotebooks();
    const cards = document.querySelectorAll('.carousel-book-card');
    const spineColorMap = {
      green: 'var(--spine-green)',
      slate: 'var(--spine-slate)',
      terracotta: 'var(--spine-terracotta)',
      yellow: 'var(--spine-yellow)',
      lavender: 'var(--spine-lavender)',
      obsidian: '#1A1A1A',
      crimson: '#8B0000',
      pink: '#D87093'
    };

    cards.forEach((card, i) => {
      const nb = notebooks[i];
      if (!nb) {
        card.style.display = 'none';
        return;
      }
      card.style.display = 'block';

      let cardClass = 'carousel-book-hidden';
      const diff = (i - this.carouselIndex + notebooks.length) % notebooks.length;
      
      if (diff === 0) cardClass = 'carousel-book-active';
      else if (diff === 1 || diff === -(notebooks.length - 1)) cardClass = 'carousel-book-next';
      else if (diff === notebooks.length - 1 || diff === -1) cardClass = 'carousel-book-prev';
      else if (diff === 2) cardClass = 'carousel-book-far-next';
      else if (diff === notebooks.length - 2) cardClass = 'carousel-book-far-prev';

      const coverBgClass = `cover-bg-${nb.coverColor || 'cream'}`;
      card.className = `carousel-book-card ${cardClass} ${coverBgClass}`;
      
      const spine = card.querySelector('.book-cover-spine');
      if (spine) {
        spine.style.background = spineColorMap[nb.spineColor || nb.color] || spineColorMap.green;
        const spineTextEl = spine.querySelector('.book-cover-spine-text');
        if (spineTextEl) spineTextEl.innerText = nb.spineText || '2026 • LUNCHBOX';
      }

      card.onclick = diff === 0 ? 
        () => window.app.openNotebook(notebooks[i].id) : 
        () => { window.app.carouselIndex = i; window.app.updateCarouselDOM(); window.notificationEngine?.playSound('chime'); };
    });
    this.renderPaletteNotebooks();
  }

  openNotebook(nbId) {
    this.currentView = nbId;
    this.viewMode = 'book';
    this.currentSpreadIdx = 0;
    
    const notebooks = window.store.getNotebooks();
    const idx = notebooks.findIndex(n => n.id === nbId);
    if (idx !== -1) this.carouselIndex = idx;

    document.querySelectorAll('.palette-item').forEach(btn => {
      if (btn.getAttribute('data-view') === nbId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const formatSelect = document.getElementById('palette-format-select');
    const nb = window.store.getNotebook(nbId);
    if (formatSelect && nb) {
      formatSelect.value = nb.pageFormat || 'grid';
    }

    this.render();
    if (window.notificationEngine) window.notificationEngine.playSound('chime');
  }

  switchView(viewId) {
    if (viewId === 'all' || viewId === 'shelf') {
      this.showShelfView();
      return;
    }
    if (viewId === 'settings') {
      this.openSettingsModal();
      return;
    }
    if (viewId === 'history') {
      if (window.stickyManager) window.stickyManager.openWidgetModal();
      return;
    }
    this.openNotebook(viewId);
  }

  prevPage() {
    if (this.isFlipping) return;
    if (this.currentSpreadIdx === 0) {
      this.showShelfView();
      return;
    }
    
    this.isFlipping = true;
    const rightPage = document.getElementById(`page-spread-${this.currentSpreadIdx}-right`);
    if (rightPage) {
      rightPage.classList.add('page-flipping-left');
    }

    if (window.notificationEngine) window.notificationEngine.playSound('chime');

    setTimeout(() => {
      this.currentSpreadIdx--;
      this.renderBookWorkspace();
      this.isFlipping = false;
    }, 280);
  }

  nextPage() {
    if (this.isFlipping) return;
    const nb = window.store.getNotebook(this.currentView);
    if (!nb) return;
    const totalSpreads = Math.max(1, Math.ceil(nb.items.length / 8)) + 1;
    if (this.currentSpreadIdx >= totalSpreads - 1) return;
    
    this.isFlipping = true;
    const rightPage = document.getElementById(`page-spread-${this.currentSpreadIdx}-right`);
    if (rightPage) {
      rightPage.classList.add('page-flipping-right');
    }

    if (window.notificationEngine) window.notificationEngine.playSound('chime');

    setTimeout(() => {
      this.currentSpreadIdx++;
      this.renderBookWorkspace();
      this.isFlipping = false;
    }, 280);
  }

  handleFormatChange(newFormat) {
    if (this.currentView === 'settings' || this.currentView === 'history' || this.viewMode === 'shelf') return;
    window.store.updateNotebook(this.currentView, { pageFormat: newFormat });
    if (window.notificationEngine) window.notificationEngine.playSound('chime');
  }

  toggleAIDrawer(open) {
    const drawer = document.getElementById('ai-assistant-drawer');
    if (!drawer) return;
    if (open) {
      drawer.classList.add('open');
      document.getElementById('ai-chat-input')?.focus();
      if (window.notificationEngine) window.notificationEngine.playSound('chime');
    } else {
      drawer.classList.remove('open');
    }
  }

  render() {
    const paletteLeft = document.getElementById('palette-left');
    const paletteRight = document.getElementById('palette-right');
    const mobileHeader = document.querySelector('.mobile-top-bar');

    if (this.viewMode === 'landing') {
      if (paletteLeft) paletteLeft.style.display = 'none';
      if (paletteRight) paletteRight.style.display = 'none';
      if (mobileHeader) mobileHeader.style.display = 'none';
      document.body.classList.add('landing-mode');
    } else {
      if (paletteLeft) paletteLeft.style.display = 'flex';
      if (paletteRight) paletteRight.style.display = 'flex';
      if (mobileHeader) mobileHeader.style.display = '';
      document.body.classList.remove('landing-mode');
    }

    this.renderPaletteNotebooks();
    this.renderBookWorkspace();
    if (window.stickyManager) {
      window.stickyManager.renderStickyBanner();
    }
  }

  renderPaletteNotebooks() {
    const topActionsEl = document.getElementById('palette-top-actions');
    const listEl = document.getElementById('palette-notebook-list');

    const isAuthenticated = window.authEngine && window.authEngine.isAuthenticated();

    if (topActionsEl) {
      if (isAuthenticated) {
        const user = window.authEngine.getCurrentUser();
        const displayName = user ? (user.displayName || user.email?.split('@')[0]) : 'User';
        topActionsEl.innerHTML = `
          <button class="palette-item ${this.viewMode === 'shelf' ? 'active' : ''}" onclick="window.app.showShelfView()" title="View Carousel Shelf">
            <span class="palette-icon">📚</span>
            <span class="palette-label" style="font-weight: 700;">Carousel Shelf</span>
          </button>

          <button class="palette-item" onclick="window.app.handleSignOutPrompt()" title="Sign out (${displayName})" style="color: #E53935;">
            <span class="palette-icon">🚪</span>
            <span class="palette-label" style="font-weight: 700;">Sign Out</span>
          </button>
        `;
      } else {
        topActionsEl.innerHTML = `
          <button class="palette-item ${this.viewMode === 'landing' ? 'active' : ''}" onclick="window.app.showLandingView()" title="Lunchbox Product Landing Page">
            <span class="palette-icon">🏠</span>
            <span class="palette-label" style="font-weight: 700;">Landing Page</span>
          </button>

          <button class="palette-item ${this.viewMode === 'shelf' ? 'active' : ''}" onclick="window.app.showShelfView()" title="View Carousel Shelf">
            <span class="palette-icon">📚</span>
            <span class="palette-label" style="font-weight: 700;">Carousel Shelf</span>
          </button>
        `;
      }
    }

    if (!listEl) return;

    const activeNotebooks = window.store.getActiveNotebooks();
    const archivedNotebooks = window.store.getArchivedNotebooks();

    listEl.innerHTML = `
      ${activeNotebooks.map(nb => {
        const count = nb.items.filter(i => !i.completed).length;
        const isActive = (this.currentView === nb.id && this.viewMode === 'book') ? 'active' : '';
        return `
          <button class="palette-item ${isActive}" data-view="${nb.id}" onclick="window.app.openNotebook('${nb.id}')" title="${nb.title}">
            <span class="palette-icon">${nb.icon}</span>
            <span class="palette-label">${nb.title}</span>
            <span class="palette-badge">${count}</span>
          </button>
        `;
      }).join('')}

      <div style="border-top: 1px solid var(--border-subtle); margin: 6px 0; padding-top: 6px;"></div>

      <button class="palette-item ${this.viewMode === 'archives' ? 'active' : ''}" onclick="window.app.showArchivesView()" title="Archived Sketchbooks">
        <span class="palette-icon">📦</span>
        <span class="palette-label">Archives Vault</span>
        <span class="palette-badge">${archivedNotebooks.length}</span>
      </button>
    `;
  }

  handleSignOutPrompt() {
    window.authEngine.signOut();
    this.viewMode = 'landing';
    this.render();
    if (window.notificationEngine) {
      window.notificationEngine.showToast('🔒', 'Signed Out', 'You have been signed out.');
    }
  }

  renderBookWorkspace() {
    const container = document.getElementById('main-book-container');
    if (!container) return;

    if (this.viewMode === 'landing') {
      container.innerHTML = this.renderLandingPage();
      return;
    }

    if (this.viewMode === 'archives') {
      container.innerHTML = this.renderArchivesView();
      return;
    }

    if (this.viewMode === 'shelf') {
      container.innerHTML = this.renderiPadPaperCarousel();
      return;
    }

    const notebooks = window.store.getNotebooks();
    const activeIdx = notebooks.findIndex(n => n.id === this.currentView);
    if (activeIdx === -1) {
      this.showShelfView();
      return;
    }

    const activeNb = notebooks[activeIdx];
    const formatClass = `format-${activeNb.pageFormat || 'grid'}`;

    const spineColorMap = {
      green: 'var(--spine-green)',
      slate: 'var(--spine-slate)',
      terracotta: 'var(--spine-terracotta)',
      yellow: 'var(--spine-yellow)',
      lavender: 'var(--spine-lavender)',
      obsidian: '#1A1A1A',
      crimson: '#8B0000',
      pink: '#D87093'
    };
    const spineBg = spineColorMap[activeNb.spineColor || activeNb.color] || spineColorMap.green;
    const spineLabelText = activeNb.spineText || '2026 • LUNCHBOX';

    if (this.currentSpreadIdx === 0) {
      container.innerHTML = this.renderCoverSpread(activeNb, spineBg, spineLabelText, formatClass);
      return;
    }

    const insideIdx = this.currentSpreadIdx - 1;
    
    // SORTING RULE: Active / Uncompleted items stay on front pages, completed items sink to back archive pages
    const activeItems = (activeNb.items || []).filter(i => !i.completed);
    const completedItems = (activeNb.items || []).filter(i => i.completed);
    const sortedItems = [...activeItems, ...completedItems];

    const totalInsideSpreads = Math.max(1, Math.ceil(sortedItems.length / 8));
    if (insideIdx >= totalInsideSpreads) this.currentSpreadIdx = totalInsideSpreads;

    const currentSpreadItems = sortedItems.slice(insideIdx * 8, (insideIdx + 1) * 8);
    const leftPageItems = currentSpreadItems.slice(0, 4);
    const rightPageItems = currentSpreadItems.slice(4, 8);

    const pageNumLeft = (insideIdx * 2) + 1;
    const pageNumRight = (insideIdx * 2) + 2;

    const leftStickers = (activeNb.stickers || []).filter(s => s.spreadIdx === this.currentSpreadIdx && s.pageSide === 'left');
    const rightStickers = (activeNb.stickers || []).filter(s => s.spreadIdx === this.currentSpreadIdx && s.pageSide === 'right');

    container.innerHTML = `
      <div class="papers-book-wrapper">
        
        <div class="papers-book">
          
          <!-- LEFT INSIDE PAGE -->
          <div class="book-page book-page-left ${formatClass}" id="page-spread-${this.currentSpreadIdx}-left" style="position: relative;">
            ${leftStickers.map(st => this.renderStickerHTML(activeNb.id, st)).join('')}
            
            <div style="margin-bottom: 16px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px;">
              <div class="washi-tape" style="top: -10px; left: 12px;"></div>
              <div style="font-size: 15px; font-weight: 700; color: var(--text-main); display: flex; align-items: center; justify-content: space-between;">
                <span>${activeNb.icon} ${activeNb.title}</span>
                <span style="font-size: 11px; font-weight: 600; color: var(--text-subtle);">P. ${pageNumLeft}</span>
              </div>
            </div>

            <div class="items-list-papers">
              ${leftPageItems.length === 0 ? `
                <div style="margin: auto 0; padding: 24px; text-align: center; border: 1px dashed var(--border-color); border-radius: 14px; background: rgba(0,0,0,0.01);">
                  <div class="washi-tape washi-tape-lavender" style="top: -10px; right: 20px;"></div>
                  <span style="font-size: 26px; display: block; margin-bottom: 6px;">✏️ 🌿</span>
                  <p style="font-size: 13px; font-weight: 600; color: var(--text-main);">Ruled Page ${pageNumLeft}</p>
                  <p style="font-size: 11.5px; color: var(--text-subtle);">Active items sit on front pages. Actioned-off items automatically move to back archive pages!</p>
                </div>
              ` : `
                ${leftPageItems.map((item, i) => this.renderPaperCard(activeNb.id, item, i === 0 ? 'yellow' : null)).join('')}
              `}
            </div>

            <div class="page-curl page-curl-left" onclick="window.app.prevPage()" title="Turn to previous page (or swipe right)">
              <span class="page-curl-hint">◀ P. ${pageNumLeft - 1}</span>
            </div>
          </div>

          <!-- THE CLOTH SPINE -->
          <div class="book-cloth-spine" style="background: ${spineBg};">
            <span class="spine-text">${spineLabelText}</span>
          </div>

          <!-- RIGHT INSIDE PAGE -->
          <div class="book-page book-page-right ${formatClass}" id="page-spread-${this.currentSpreadIdx}-right" style="position: relative;">
            ${rightStickers.map(st => this.renderStickerHTML(activeNb.id, st)).join('')}
            
            <div style="margin-bottom: 16px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 13.5px; font-weight: 700; color: var(--text-main);">Checklist P. ${pageNumRight}</span>
              <span style="font-size: 11px; color: var(--text-subtle);">(${insideIdx + 1}/${totalInsideSpreads})</span>
            </div>

            <div class="items-list-papers">
              ${rightPageItems.length === 0 ? `
                <div style="margin: auto 0; text-align: center; padding: 30px; color: var(--text-muted);">
                  <span style="font-size: 28px; display: block; margin-bottom: 6px;">📝</span>
                  <p style="font-size: 13.5px; font-weight: 600; color: var(--text-main);">Page ${pageNumRight} is open</p>
                  <p style="font-size: 12px; color: var(--text-subtle);">Write below or use ✏️ in side tool menu.</p>
                </div>
              ` : `
                ${rightPageItems.map((item, i) => this.renderPaperCard(activeNb.id, item, i === 0 ? 'mint' : null)).join('')}
              `}
            </div>

            <form class="paper-line-input" onsubmit="window.app.quickAddItem(event, '${activeNb.id}')">
              <span class="pencil-prompt" title="Write a reminder">✏️</span>
              <input type="text" name="quickTitle" class="paper-input-field" placeholder="Write on page ${pageNumRight}..." required autocomplete="off" />
              <button type="submit" class="paper-submit-btn" title="Add item to page">↵ Add</button>
            </form>

            ${insideIdx < totalInsideSpreads - 1 ? `
              <div class="page-curl page-curl-right" onclick="window.app.nextPage()" title="Turn to next page (or swipe left)">
                <span class="page-curl-hint">P. ${pageNumRight + 1} ▶</span>
              </div>
            ` : ''}
          </div>

        </div>
      </div>
    `;
  }

  showArchivesView() {
    this.viewMode = 'archives';
    this.render();
    if (window.notificationEngine) window.notificationEngine.playSound('chime');
  }

  showLandingView() {
    this.viewMode = 'landing';
    this.render();
    if (window.notificationEngine) window.notificationEngine.playSound('chime');
  }

  renderLandingPage() {
    return `
      <div class="landing-page">
        
        <!-- TOP LANDING NAVBAR -->
        <nav class="landing-nav" style="display: flex; align-items: center; justify-content: space-between; padding: 16px 0 24px 0; border-bottom: 1px solid var(--border-subtle); margin-bottom: 30px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="icon.png" alt="Lunchbox Icon" style="width: 38px; height: 38px; border-radius: 10px; object-fit: cover; box-shadow: var(--shadow-sm);" />
            <span style="font-family: var(--font-brand); font-size: 34px; font-weight: 700; color: var(--text-main);">Lunchbox</span>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 12px; font-weight: 600; color: var(--text-muted); background: var(--bg-surface); padding: 6px 14px; border-radius: 20px; border: 1px solid var(--border-subtle);">
              ✨ Minimal Remembrance Vault
            </span>
          </div>
        </nav>

        <!-- FOREFRONT GATED SPLIT HERO -->
        <div class="landing-split-hero">
          
          <!-- LEFT COLUMN: PRODUCT STORY & 3D VISUAL PREVIEW -->
          <div>
            <h1 class="landing-title" style="margin-left: 0; max-width: 100%;">
              Never forget a thought again. <br/>Your tactile remembrance vault.
            </h1>
            
            <p class="landing-subtitle" style="margin-left: 0; max-width: 95%;">
              A minimal, sensory journal experience with 3D cover lineups, custom Google fonts, collage photo stickers, and background OS notifications. Built for mindful focus and organization.
            </p>

            <!-- HERO INTERACTIVE 3D APP VISUAL PREVIEW -->
            <div class="hero-3d-preview-wrapper">
              <div style="width: 290px; height: 380px; background: #FFFDF9; border-radius: 14px 20px 20px 14px; border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 20px 50px rgba(0,0,0,0.15); position: relative; display: flex; text-align: left; overflow: hidden;">
                <div style="width: 34px; height: 100%; background: var(--spine-green); display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 16px 0; color: rgba(255,255,255,0.9); font-size: 10.5px; font-weight: 700; letter-spacing: 1.5px; writing-mode: vertical-rl;">
                  <span>2026 • LUNCHBOX</span>
                  <span>JOURNAL</span>
                </div>
                <div style="flex: 1; padding: 24px 20px; display: flex; flex-direction: column; justify-content: space-between; position: relative;">
                  <div>
                    <span style="font-size: 38px; display: block; margin-bottom: 10px;">📝</span>
                    <h3 style="font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 800; color: #1D1D1F; margin-bottom: 6px;">Daily Tasks & Actions</h3>
                    <p style="font-size: 12.5px; color: #6E6E73; line-height: 1.4;">Things you must do today so you can relax tonight!</p>
                  </div>
                  
                  <!-- Floating Polaroid Preview -->
                  <div style="position: absolute; right: 12px; bottom: 48px; width: 80px; height: 70px; background: white; padding: 4px; box-shadow: 0 6px 16px rgba(0,0,0,0.12); transform: rotate(5deg); border-radius: 4px;">
                    <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150" style="width: 100%; height: 46px; object-fit: cover; border-radius: 2px;" alt="Sticker preview" />
                    <div style="font-size: 7px; text-align: center; color: #555; margin-top: 2px; font-family: cursive;">Memories ✨</div>
                  </div>

                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 600; color: #8E8E93;">
                    <span>📐 grid paper</span>
                    <span>3 active tasks</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- RIGHT COLUMN: THE FOREFRONT AUTHENTICATION GATE -->
          <div class="forefront-auth-card">
            <h3 style="font-size: 20px; font-weight: 800; color: var(--text-main); margin-bottom: 6px;">
              🔐 Access Your Vault
            </h3>
            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px; line-height: 1.4;">
              Sign in or register an account to unlock your personal journals and cloud database.
            </p>

            <div class="auth-tab-bar" style="margin-bottom: 22px;">
              <button id="forefront-tab-signin" class="auth-tab-btn active" onclick="window.app.switchForefrontTab('signin')">Sign In</button>
              <button id="forefront-tab-signup" class="auth-tab-btn" onclick="window.app.switchForefrontTab('signup')">Create Account</button>
            </div>

            <!-- FOREFRONT SIGN IN FORM -->
            <form id="forefront-signin-form" onsubmit="window.app.handleAuthSubmit(event, 'signin')">
              <div style="margin-bottom: 14px;">
                <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Email Address</label>
                <input type="email" name="email" required placeholder="you@example.com" style="width: 100%; padding: 11px 14px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-palette); color: var(--text-main); font-size: 13.5px;" />
              </div>
              <div style="margin-bottom: 20px;">
                <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Password</label>
                <input type="password" name="password" required placeholder="••••••••" style="width: 100%; padding: 11px 14px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-palette); color: var(--text-main); font-size: 13.5px;" />
              </div>
              <button type="submit" class="btn btn-primary" style="width: 100%; padding: 13px; font-size: 14.5px; font-weight: 700; border-radius: 26px; margin-bottom: 14px; box-shadow: 0 6px 20px rgba(0,0,0,0.15);">
                🚀 Sign In & Unlock Vault
              </button>
            </form>

            <!-- FOREFRONT SIGN UP FORM -->
            <form id="forefront-signup-form" onsubmit="window.app.handleAuthSubmit(event, 'signup')" style="display: none;">
              <div style="margin-bottom: 14px;">
                <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Display Name</label>
                <input type="text" name="displayName" required placeholder="Your Name" style="width: 100%; padding: 11px 14px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-palette); color: var(--text-main); font-size: 13.5px;" />
              </div>
              <div style="margin-bottom: 14px;">
                <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Email Address</label>
                <input type="email" name="email" required placeholder="you@example.com" style="width: 100%; padding: 11px 14px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-palette); color: var(--text-main); font-size: 13.5px;" />
              </div>
              <div style="margin-bottom: 20px;">
                <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Password</label>
                <input type="password" name="password" required placeholder="Create password (6+ chars)" style="width: 100%; padding: 11px 14px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-palette); color: var(--text-main); font-size: 13.5px;" />
              </div>
              <button type="submit" class="btn btn-primary" style="width: 100%; padding: 13px; font-size: 14.5px; font-weight: 700; border-radius: 26px; margin-bottom: 14px; box-shadow: 0 6px 20px rgba(0,0,0,0.15);">
                ✨ Create Account & Launch
              </button>
            </form>

            <div style="text-align: center; margin: 14px 0; font-size: 12px; color: var(--text-subtle);">OR CONNECT WITH</div>

            <button class="btn btn-outline" style="width: 100%; padding: 11px; font-size: 14px; font-weight: 600; border-radius: 26px; display: flex; align-items: center; justify-content: center; gap: 8px;" onclick="window.app.handleGoogleAuth()">
              <span>🌐</span> Continue with Google
            </button>
          </div>

        </div>

        <!-- VISUAL FEATURE SHOWCASE GRID -->
        <section class="landing-grid">
          
          <div class="landing-card">
            <span class="landing-card-icon">📚</span>
            <h3 class="landing-card-title">3D Tactile Cover Carousel</h3>
            <p class="landing-card-desc">
              Customizable cloth spines, elastic bands, linen textures, and curated Google fonts (Cinzel, Playfair, Caveat, Outfit).
            </p>
          </div>

          <div class="landing-card">
            <span class="landing-card-icon">📌</span>
            <h3 class="landing-card-title">Collage & Photo Stickers</h3>
            <p class="landing-card-desc">
              Decorate your journal covers and paper pages with draggable memory polaroids, stickers, and washi tapes.
            </p>
          </div>

          <div class="landing-card">
            <span class="landing-card-icon">🔔</span>
            <h3 class="landing-card-title">Native OS Sticky Nudges</h3>
            <p class="landing-card-desc">
              Delivers background system notifications directly to your macOS, Windows, Android, and iOS notification center.
            </p>
          </div>

        </section>

        <!-- FOOTER -->
        <footer style="text-align: center; margin-top: 50px; padding-top: 20px; border-top: 1px dashed var(--border-subtle); color: var(--text-subtle); font-size: 13px;">
          Lunchbox Remembrance Vault • Built for Mindful Focus & Organization
        </footer>

      </div>
    `;
  }

  async openAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    if (window.authEngine && window.authEngine.isAuthenticated()) {
      const user = window.authEngine.getCurrentUser();
      const confirmed = await window.appModal.confirm(
        `You are currently logged into the Lunchbox Vault as:\n\n👤 ${user.displayName || 'User'} (${user.email})\n\nWould you like to Sign Out and lock the vault?`,
        'Sign Out of Vault',
        '🔒',
        'Sign Out',
        'Cancel',
        true
      );
      if (confirmed) {
        window.authEngine.signOut();
        this.viewMode = 'landing';
        this.render();
      }
      return;
    }
    modal.showModal();
    if (window.notificationEngine) window.notificationEngine.playSound('chime');
  }

  openFirestoreModal() {
    const modal = document.getElementById('firestore-modal');
    if (!modal) return;
    const config = JSON.parse(localStorage.getItem('lunchbox_firebase_config') || '{}');
    if (config.apiKey && document.getElementById('fb-apiKey')) document.getElementById('fb-apiKey').value = config.apiKey;
    if (config.authDomain && document.getElementById('fb-authDomain')) document.getElementById('fb-authDomain').value = config.authDomain;
    if (config.projectId && document.getElementById('fb-projectId')) document.getElementById('fb-projectId').value = config.projectId;
    if (config.storageBucket && document.getElementById('fb-storageBucket')) document.getElementById('fb-storageBucket').value = config.storageBucket;
    modal.showModal();
    if (window.notificationEngine) window.notificationEngine.playSound('chime');
  }

  handleFirestoreSave(e) {
    e.preventDefault();
    const config = {
      apiKey: document.getElementById('fb-apiKey').value.trim(),
      authDomain: document.getElementById('fb-authDomain').value.trim(),
      projectId: document.getElementById('fb-projectId').value.trim(),
      storageBucket: document.getElementById('fb-storageBucket').value.trim()
    };
    localStorage.setItem('lunchbox_firebase_config', JSON.stringify(config));
    document.getElementById('firestore-modal')?.close();
    if (window.notificationEngine) {
      window.notificationEngine.showToast('🔥', 'Firebase Database Connected!', `Project ID: ${config.projectId || 'Config Saved'}`);
    }
  }

  switchAuthTab(tab) {
    const signinForm = document.getElementById('auth-signin-form');
    const signupForm = document.getElementById('auth-signup-form');
    const btnSignin = document.getElementById('tab-btn-signin');
    const btnSignup = document.getElementById('tab-btn-signup');

    if (tab === 'signin') {
      if (signinForm) signinForm.style.display = 'block';
      if (signupForm) signupForm.style.display = 'none';
      if (btnSignin) btnSignin.classList.add('active');
      if (btnSignup) btnSignup.classList.remove('active');
    } else {
      if (signinForm) signinForm.style.display = 'none';
      if (signupForm) signupForm.style.display = 'block';
      if (btnSignin) btnSignin.classList.remove('active');
      if (btnSignup) btnSignup.classList.add('active');
    }
  }

  switchForefrontTab(tab) {
    const signinForm = document.getElementById('forefront-signin-form');
    const signupForm = document.getElementById('forefront-signup-form');
    const btnSignin = document.getElementById('forefront-tab-signin');
    const btnSignup = document.getElementById('forefront-tab-signup');

    if (tab === 'signin') {
      if (signinForm) signinForm.style.display = 'block';
      if (signupForm) signupForm.style.display = 'none';
      if (btnSignin) btnSignin.classList.add('active');
      if (btnSignup) btnSignup.classList.remove('active');
    } else {
      if (signinForm) signinForm.style.display = 'none';
      if (signupForm) signupForm.style.display = 'block';
      if (btnSignin) btnSignin.classList.remove('active');
      if (btnSignup) btnSignup.classList.add('active');
    }
  }

  async handleAuthSubmit(e, type) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    const displayName = formData.get('displayName');

    let res;
    if (type === 'signup') {
      res = await window.authEngine.signUp(email, password, displayName);
    } else {
      res = await window.authEngine.signIn(email, password);
    }

    if (res.success) {
      document.getElementById('auth-modal')?.close();
      if (window.notificationEngine) {
        window.notificationEngine.showToast('👤', 'Welcome to Lunchbox!', `Signed in as ${res.user.displayName}`);
      }
      this.render();
    } else {
      window.appModal.alert("Auth Error: " + res.error, "Authentication Error", "⚠️");
    }
  }

  async handleGoogleAuth() {
    const res = await window.authEngine.signInWithGoogle();
    if (res.success) {
      document.getElementById('auth-modal')?.close();
      if (window.notificationEngine) {
        window.notificationEngine.showToast('🌐', 'Google Authentication', `Signed in as ${res.user.displayName}`);
      }
      this.render();
    }
  }

  handleGuestAuth() {
    window.authEngine.signOut();
    document.getElementById('auth-modal')?.close();
    if (window.notificationEngine) {
      window.notificationEngine.showToast('👤', 'Guest Mode', 'Continuing in guest local vault mode.');
    }
    this.render();
  }

  updateAuthUI() {
    if (typeof this.renderPaletteNotebooks === 'function') {
      this.renderPaletteNotebooks();
    }
    this.render();
  }

  // --- iPAD "PAPER" 3D CAROUSEL LINEUP VIEW WITH CUSTOMIZABLE COLORS & CRISP COVER TEXT ---
  renderiPadPaperCarousel() {
    const activeNotebooks = window.store.getActiveNotebooks();
    const archivedNotebooks = window.store.getArchivedNotebooks();
    if (this.carouselIndex >= activeNotebooks.length) this.carouselIndex = 0;

    const spineColorMap = {
      green: 'var(--spine-green)',
      slate: 'var(--spine-slate)',
      terracotta: 'var(--spine-terracotta)',
      yellow: 'var(--spine-yellow)',
      lavender: 'var(--spine-lavender)',
      obsidian: '#1A1A1A',
      crimson: '#8B0000',
      pink: '#D87093'
    };

    return `
      <div class="paper-carousel-lineup">
        
        <div class="carousel-title-bar">
          <div id="bookmark-lock-container" class="bookmark-lock-container"></div>
          <h1 class="carousel-title-text">My Notebooks</h1>
          <p class="carousel-subtitle-text">${activeNotebooks.length} active notebooks • Drag horizontally or click any book to glide & open</p>
          
          <div style="display: flex; justify-content: center; gap: 10px; margin-top: 14px; margin-bottom: 6px;">
            <button class="btn btn-sm btn-primary" style="border-radius: 20px; font-weight: 700; padding: 6px 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);" onclick="window.app.showShelfView()">
              📚 Main Vault (${activeNotebooks.length})
            </button>
            <button class="btn btn-sm btn-outline" style="border-radius: 20px; font-weight: 600; padding: 6px 16px;" onclick="window.app.showArchivesView()">
              📦 Archives (${archivedNotebooks.length})
            </button>
          </div>
        </div>

        ${activeNotebooks.length === 0 ? `
          <div style="text-align: center; padding: 60px 20px; background: var(--bg-surface); border-radius: 20px; border: 1px dashed var(--border-color); max-width: 500px; margin: 40px auto;">
            <span style="font-size: 44px; display: block; margin-bottom: 12px;">📚</span>
            <h3 style="font-size: 18px; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">All Sketchbooks Archived</h3>
            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">Create a new journal or restore one from your Archives Vault.</p>
            <div style="display: flex; gap: 10px; justify-content: center;">
              <button class="btn btn-primary" onclick="window.app.openAddNotebookModal()">＋ New Journal</button>
              <button class="btn btn-outline" onclick="window.app.showArchivesView()">📦 View Archives</button>
            </div>
          </div>
        ` : `
          <div class="carousel-stage">
            ${activeNotebooks.map((nb, i) => {
              let cardClass = 'carousel-book-hidden';
              const diff = (i - this.carouselIndex + activeNotebooks.length) % activeNotebooks.length;
              
              if (diff === 0) cardClass = 'carousel-book-active';
              else if (diff === 1 || diff === -(activeNotebooks.length - 1)) cardClass = 'carousel-book-next';
              else if (diff === activeNotebooks.length - 1 || diff === -1) cardClass = 'carousel-book-prev';
              else if (diff === 2) cardClass = 'carousel-book-far-next';
              else if (diff === activeNotebooks.length - 2) cardClass = 'carousel-book-far-prev';

              const spineBg = spineColorMap[nb.spineColor || nb.color] || spineColorMap.green;
              const coverBgClass = `cover-bg-${nb.coverColor || 'cream'}`;
              const spineLabelText = nb.spineText || '2026 • LUNCHBOX';
              const count = nb.items.filter(it => !it.completed).length;
              const coverFontFamily = nb.coverFont || 'Inter';
              const coverTextColor = nb.coverTextColor || (nb.coverColor === 'obsidian' || nb.coverColor === 'navy' || nb.coverColor === 'charcoal' ? '#FFFFFF' : '#1E293B');
              const coverTitleText = nb.coverTitle || nb.title;
              const showWhiteBox = nb.showCoverLabel !== false;

              return `
                <div class="carousel-book-card ${cardClass} ${coverBgClass}" onclick="${diff === 0 ? `window.app.openNotebook('${nb.id}')` : `window.app.carouselIndex = ${i}; window.app.updateCarouselDOM(); window.notificationEngine?.playSound('chime');`}" title="${diff === 0 ? `Open ${nb.title}` : `Focus ${nb.title}`}">
                  
                  <div class="book-cover-spine" style="background: ${spineBg};">
                    <span class="book-cover-spine-text">${spineLabelText}</span>
                  </div>

                  <div class="elastic-band" title="Black Elastic Strap"></div>

                  <div class="book-cover-content">
                    
                    <!-- UNOPENED COVER STICKERS -->
                    ${showWhiteBox ? `
                      ${(nb.stickers || []).filter(s => s.spreadIdx === 0).map(st => `
                        <div class="carousel-cover-sticker" style="left: ${Math.max(10, Math.min(50, st.x))}%; top: ${Math.max(45, Math.min(72, st.y))}%; transform: rotate(${st.rotation}deg) scale(0.62);" title="${st.caption || 'Cover decoration'}">
                          <img src="${st.url}" class="sticker-img" alt="Decoration" onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200&auto=format&fit=crop&q=80'" />
                        </div>
                      `).join('')}
                    ` : `
                      <!-- DOCKED CORNER STICKERS FOR FULL CANVAS MODE (ZERO TEXT FRICTION) -->
                      ${(nb.stickers || []).filter(s => s.spreadIdx === 0).slice(0, 2).map((st, sIdx) => `
                        <div class="carousel-cover-sticker" style="${sIdx === 0 ? 'left: 10px; bottom: 38px;' : 'right: 28px; bottom: 38px;'} transform: rotate(${sIdx === 0 ? -6 : 6}deg) scale(0.56);" title="${st.caption || 'Cover decoration'}">
                          <img src="${st.url}" class="sticker-img" alt="Decoration" onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200&auto=format&fit=crop&q=80'" />
                        </div>
                      `).join('')}
                    `}

                    ${showWhiteBox ? `
                      <!-- CLASSIC PAPER LABEL CARD (WHITE BOX) -->
                      <div class="cover-text-box">
                        <span class="cover-icon-large">${nb.icon}</span>
                        <h3 class="cover-title" style="font-family: '${coverFontFamily}', sans-serif; color: ${coverTextColor};">${coverTitleText}</h3>
                        <p class="cover-desc">${nb.description}</p>
                      </div>
                    ` : `
                      <!-- FULL COVER CANVAS (NO WHITE BOX) WITH GOOGLE FONT -->
                      <div class="cover-text-full" style="padding: 16px 8px; text-align: center; font-family: '${coverFontFamily}', serif, sans-serif;">
                        <span class="cover-icon-large" style="display: block; margin-bottom: 10px;">${nb.icon}</span>
                        <h3 style="font-family: '${coverFontFamily}', serif, sans-serif; font-size: 22px; font-weight: 800; color: ${coverTextColor}; line-height: 1.25; margin-bottom: 8px; letter-spacing: -0.2px;">${coverTitleText}</h3>
                        <p style="font-size: 12px; color: ${coverTextColor}; opacity: 0.85; line-height: 1.4;">${nb.description}</p>
                      </div>
                    `}
                    
                    <div class="cover-footer">
                      <span style="font-weight: 700; color: ${coverTextColor};">📐 ${nb.pageFormat || 'grid'}</span>
                      <span style="background: rgba(0,0,0,0.06); color: ${coverTextColor}; padding: 2px 8px; border-radius: 12px; font-weight: 700;">${count} active</span>
                    </div>
                  </div>

                </div>
              `;
            }).join('')}
          </div>

          <div class="carousel-bottom-controls">
            <button class="circular-fab" onclick="window.app.handleArchiveActiveBook()" title="Move active sketchbook to Archives">
              📦
            </button>
            <button class="circular-fab" onclick="window.app.openEditNotebookModal('${activeNotebooks[this.carouselIndex]?.id}')" title="Customize Book Color, Spine & Text">
              🎨
            </button>
            <button class="circular-fab" onclick="window.app.openAddNotebookModal()" title="Create New Sketchbook">
              ＋
            </button>
            <button class="circular-fab circular-fab-primary" onclick="window.app.openNotebook('${activeNotebooks[this.carouselIndex]?.id}')" title="Open selected sketchbook">
              📖
            </button>
            <button class="circular-fab" style="background: rgba(229,57,53,0.1); border-color: rgba(229,57,53,0.3); color: #E53935;" onclick="window.app.handleDeleteActiveBookPermanently()" title="Permanently delete active sketchbook">
              🗑️
            </button>
          </div>
        `}

      </div>
    `;
  }

  renderArchivesView() {
    const archivedNotebooks = window.store.getArchivedNotebooks();
    const activeNotebooks = window.store.getActiveNotebooks();

    return `
      <div class="paper-carousel-lineup" style="max-width: 900px; margin: 0 auto; padding: 20px;">
        
        <div class="carousel-title-bar" style="margin-bottom: 24px;">
          <h1 class="carousel-title-text">📦 Archives Vault</h1>
          <p class="carousel-subtitle-text">${archivedNotebooks.length} archived journals • Restore to Main Vault or permanently delete</p>
          
          <div style="display: flex; justify-content: center; gap: 8px; margin-top: 12px;">
            <button class="btn btn-sm btn-outline" style="border-radius: 20px; font-weight: 600; padding: 4px 14px;" onclick="window.app.showShelfView()">
              📚 Main Vault (${activeNotebooks.length})
            </button>
            <button class="btn btn-sm btn-primary" style="border-radius: 20px; font-weight: 700; padding: 4px 14px;" onclick="window.app.showArchivesView()">
              📦 Archives (${archivedNotebooks.length})
            </button>
          </div>
        </div>

        ${archivedNotebooks.length === 0 ? `
          <div style="text-align: center; padding: 60px 20px; background: var(--bg-surface); border-radius: 20px; border: 1px dashed var(--border-color); max-width: 500px; margin: 20px auto;">
            <span style="font-size: 48px; display: block; margin-bottom: 12px;">📦</span>
            <h3 style="font-size: 18px; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">No Archived Sketchbooks</h3>
            <p style="font-size: 13px; color: var(--text-muted); max-width: 400px; margin: 0 auto 18px auto;">
              When you archive a journal, it moves here to keep your main desk clutter-free.
            </p>
            <button class="btn btn-primary" onclick="window.app.showShelfView()">Back to Main Vault</button>
          </div>
        ` : `
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px;">
            ${archivedNotebooks.map(nb => `
              <div style="background: var(--bg-surface); border-radius: 18px; border: 1px solid var(--border-color); padding: 18px; position: relative; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <span style="font-size: 32px;">${nb.icon}</span>
                    <span style="background: rgba(0,0,0,0.06); color: var(--text-muted); font-weight: 700; font-size: 10px; padding: 2px 8px; border-radius: 10px; text-transform: uppercase;">📦 ARCHIVED</span>
                  </div>
                  <h3 style="font-size: 16px; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">${nb.title}</h3>
                  <p style="font-size: 12.5px; color: var(--text-muted); line-height: 1.4; margin-bottom: 16px;">${nb.description}</p>
                </div>
                
                <div style="display: flex; gap: 8px; border-top: 1px solid var(--border-subtle); padding-top: 12px; margin-top: 10px;">
                  <button class="btn btn-sm btn-outline" style="flex: 1; font-size: 11.5px;" onclick="window.app.handleUnarchiveBook('${nb.id}')">
                    ↩️ Restore
                  </button>
                  <button class="btn btn-sm btn-outline" style="color: #E53935; border-color: rgba(229,57,53,0.3); font-size: 11.5px;" onclick="window.app.handleDeleteBookPermanently('${nb.id}')">
                    🗑️ Delete
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `}

      </div>
    `;
  }

  handleArchiveActiveBook() {
    const activeNotebooks = window.store.getActiveNotebooks();
    if (activeNotebooks.length === 0) return;
    const nb = activeNotebooks[this.carouselIndex] || activeNotebooks[0];
    if (nb) {
      window.store.archiveNotebook(nb.id);
      this.carouselIndex = 0;
      if (window.notificationEngine) {
        window.notificationEngine.showToast('📦', 'Moved to Archives', `"${nb.title}" was moved to your Archives Vault.`);
      }
      this.render();
    }
  }

  handleArchiveModalBook() {
    if (this.editingNotebookId) {
      const nb = window.store.getNotebook(this.editingNotebookId);
      if (nb) {
        window.store.archiveNotebook(nb.id);
        if (window.notificationEngine) {
          window.notificationEngine.showToast('📦', 'Moved to Archives', `"${nb.title}" was moved to your Archives Vault.`);
        }
        this.render();
      }
    }
  }

  handleUnarchiveBook(id) {
    const nb = window.store.getNotebook(id);
    if (nb) {
      window.store.unarchiveNotebook(id);
      if (window.notificationEngine) {
        window.notificationEngine.showToast('↩️', 'Restored to Main Vault', `"${nb.title}" was restored to your active sketchbooks.`);
      }
      this.render();
    }
  }

  handleDeleteBookPermanently(id) {
    const nb = window.store.getNotebook(id);
    if (!nb) return;

    const modal = document.getElementById('delete-confirm-modal');
    const titleEl = document.getElementById('delete-confirm-notebook-title');
    const actionBtn = document.getElementById('delete-confirm-action-btn');

    if (!modal || !actionBtn) return;

    if (titleEl) {
      titleEl.textContent = `Are you sure you want to delete "${nb.title}"?`;
    }

    actionBtn.onclick = () => {
      window.store.deleteNotebook(id);
      modal.close();
      this.carouselIndex = 0;
      if (window.notificationEngine) {
        window.notificationEngine.showToast('🗑️', 'Permanently Deleted', `"${nb.title}" was permanently removed.`);
      }
      this.render();
    };

    modal.showModal();
  }

  handleDeleteActiveBookPermanently() {
    const activeNotebooks = window.store.getActiveNotebooks();
    if (activeNotebooks.length === 0) return;
    const nb = activeNotebooks[this.carouselIndex] || activeNotebooks[0];
    if (nb) {
      this.handleDeleteBookPermanently(nb.id);
    }
  }

  handleDeleteModalBookPermanently() {
    if (this.editingNotebookId) {
      this.handleDeleteBookPermanently(this.editingNotebookId);
    }
  }

  renderCoverSpread(nb, spineBg, spineLabelText, formatClass) {
    const leftStickers = (nb.stickers || []).filter(s => s.spreadIdx === 0 && s.pageSide === 'left');
    const rightStickers = (nb.stickers || []).filter(s => s.spreadIdx === 0 && s.pageSide === 'right');

    return `
      <div class="papers-book-wrapper">
        
        <div class="papers-book">
          
          <div class="book-page book-page-left ${formatClass}" id="page-spread-0-left" style="position: relative;">
            ${leftStickers.map(st => this.renderStickerHTML(nb.id, st)).join('')}
            
            <div class="book-page-content">
              <div style="position: relative; margin-top: 10px;">
                <div class="washi-tape washi-tape-mint" style="top: -16px; left: 45px; transform: rotate(-3deg); z-index: 2;"></div>
                <div style="font-size: 11px; font-weight: 700; color: var(--text-subtle); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; position: relative; z-index: 5;">2026 Remembrance Journal</div>
                <h2 style="font-size: 22px; font-weight: 700; color: var(--text-main); position: relative; z-index: 5;">Inside Cover Notes</h2>
                <p style="font-size: 13.5px; color: var(--text-muted); margin-top: 6px; line-height: 1.5; position: relative; z-index: 5;">${nb.description}</p>
              </div>

              <div style="padding: 14px; background: rgba(0,0,0,0.03); border-radius: 14px; border: 1px dashed var(--border-color); font-size: 12.5px; color: var(--text-muted); text-align: center;">
                <button class="btn btn-sm btn-outline" onclick="window.app.openEditNotebookModal('${nb.id}')" style="width: 100%; margin-bottom: 8px;">🎨 Customize Book Design</button>
                <span>✨ Paste Pinterest image URLs from Tools palette, drag & corner resize them!</span>
              </div>
            </div>

            <div class="page-curl page-curl-left" onclick="window.app.showShelfView()" title="Turn back to Shelf Carousel">
              <span class="page-curl-hint">◀ Shelf</span>
            </div>
          </div>

          <div class="book-cloth-spine" style="background: ${spineBg};">
            <span class="spine-text">${spineLabelText}</span>
          </div>

          <div class="book-page book-page-right ${formatClass}" id="page-spread-0-right" style="position: relative;">
            ${rightStickers.map(st => this.renderStickerHTML(nb.id, st)).join('')}
            
            <div class="book-page-content" style="text-align: center;">
              <div style="margin-top: 20px;">
                <div class="washi-tape" style="top: -10px; right: 20px;"></div>
                <div style="font-size: 56px; margin-bottom: 12px;">${nb.icon}</div>
                <span style="font-size: 11px; font-weight: 700; background: var(--color-slate-bg); color: var(--color-slate); padding: 4px 10px; border-radius: 12px; text-transform: uppercase;">${nb.pageFormat || 'grid'} paper</span>
                <h1 style="font-size: 32px; font-weight: 800; color: var(--text-main); margin-top: 10px; line-height: 1.2;">${nb.title}</h1>
                <p style="font-size: 13.5px; color: var(--text-muted); margin-top: 6px;">${nb.items.length} total items (${nb.items.filter(i => !i.completed).length} active on Page 1)</p>
              </div>

              <div style="font-size: 13px; font-weight: 600; color: var(--text-subtle); margin-bottom: 20px;">
                <span>👉 Tap bottom right corner curl or swipe left to turn page</span>
              </div>
            </div>

            <div class="page-curl page-curl-right" onclick="window.app.nextPage()" title="Turn to Page 1 & 2 (or swipe left)">
              <span class="page-curl-hint">Page 1 ▶</span>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  renderStickerHTML(nbId, st) {
    const w = st.width || 160;
    return `
      <div class="draggable-sticker" id="${st.id}" style="left: ${st.x}%; top: ${st.y}%; width: ${w}px; transform: rotate(${st.rotation}deg);" 
           onmousedown="window.app.startStickerDrag(event, '${nbId}', '${st.id}')" title="Drag to reposition • Drag bottom-right corner ↘ to resize">
        <button class="sticker-del-btn" onclick="event.stopPropagation(); window.app.deleteSticker('${nbId}', '${st.id}')" title="Delete sticker">✕</button>
        <img src="${st.url}" class="sticker-img" alt="Pinterest Sticker" onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200&auto=format&fit=crop&q=80'" />
        ${st.caption ? `<div class="sticker-caption">${st.caption}</div>` : ''}
        <div class="sticker-resize-handle" onmousedown="window.app.startStickerResize(event, '${nbId}', '${st.id}')" title="Drag to resize sticker">↘</div>
      </div>
    `;
  }

  startStickerDrag(e, nbId, stId) {
    if (e.target.classList.contains('sticker-del-btn') || e.target.classList.contains('sticker-resize-handle')) return;
    e.preventDefault();
    const el = document.getElementById(stId);
    if (!el) return;

    const parent = el.parentElement;
    const parentRect = parent.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialLeftPct = parseFloat(el.style.left) || 20;
    const initialTopPct = parseFloat(el.style.top) || 20;

    this.draggedSticker = { nbId, stId, el, parentRect, startX, startY, initialLeftPct, initialTopPct };
  }

  handleStickerDragMove(e) {
    if (this.resizingSticker) {
      this.handleStickerResizeMove(e);
      return;
    }
    if (!this.draggedSticker) return;
    e.preventDefault();
    const { el, parentRect, startX, startY, initialLeftPct, initialTopPct } = this.draggedSticker;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    const deltaLeftPct = (deltaX / parentRect.width) * 100;
    const deltaTopPct = (deltaY / parentRect.height) * 100;
    const newLeft = Math.max(2, Math.min(80, initialLeftPct + deltaLeftPct));
    const newTop = Math.max(2, Math.min(80, initialTopPct + deltaTopPct));

    el.style.left = `${newLeft}%`;
    el.style.top = `${newTop}%`;
  }

  handleStickerDragEnd() {
    if (this.resizingSticker) {
      this.handleStickerResizeEnd();
      return;
    }
    if (!this.draggedSticker) return;
    const { nbId, stId, el } = this.draggedSticker;
    const finalLeft = parseFloat(el.style.left);
    const finalTop = parseFloat(el.style.top);
    window.store.updateStickerPosition(nbId, stId, { x: finalLeft, y: finalTop });
    this.draggedSticker = null;
    if (window.notificationEngine) window.notificationEngine.playSound('chime');
  }

  // --- STICKER RESIZING ENGINE ---
  startStickerResize(e, nbId, stId) {
    e.preventDefault();
    e.stopPropagation();
    const el = document.getElementById(stId);
    if (!el) return;

    const startX = e.clientX;
    const initialWidth = el.offsetWidth;

    this.resizingSticker = { nbId, stId, el, startX, initialWidth };
  }

  handleStickerResizeMove(e) {
    if (!this.resizingSticker) return;
    e.preventDefault();
    const { el, startX, initialWidth } = this.resizingSticker;
    const deltaX = e.clientX - startX;
    const newWidth = Math.max(70, Math.min(420, initialWidth + deltaX));
    el.style.width = `${newWidth}px`;
  }

  handleStickerResizeEnd() {
    if (!this.resizingSticker) return;
    const { nbId, stId, el } = this.resizingSticker;
    const finalWidth = parseInt(el.style.width) || el.offsetWidth;
    window.store.updateStickerSize(nbId, stId, finalWidth);
    this.resizingSticker = null;
    if (window.notificationEngine) window.notificationEngine.playSound('chime');
  }

  // --- CENTERED GLASSMORPHIC SETTINGS MODAL ---
  openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    const settings = window.store.getSettings();
    const themeSelect = document.getElementById('setting-theme');
    const soundCheck = document.getElementById('setting-sound');
    if (themeSelect) themeSelect.value = settings.theme || 'light';
    if (soundCheck) soundCheck.checked = settings.soundEnabled !== false;
    modal.showModal();
    if (window.notificationEngine) window.notificationEngine.playSound('chime');
  }

  handleSaveSettings() {
    const theme = document.getElementById('setting-theme')?.value || 'light';
    const soundEnabled = document.getElementById('setting-sound')?.checked;
    window.store.updateSettings({ theme, soundEnabled });
    this.setupTheme();
    this.render();
    if (window.notificationEngine) window.notificationEngine.playSound('chime');
  }

  openNewNotebookModal() {
    const modal = document.getElementById('new-notebook-modal');
    if (!modal) return;
    document.getElementById('new-notebook-form')?.reset();
    modal.showModal();
    if (window.notificationEngine) window.notificationEngine.playSound('chime');
  }

  openAddNotebookModal() {
    this.openNewNotebookModal();
  }

  handleCreateNotebook(formData) {
    const title = formData.get('title');
    const icon = formData.get('icon') || '🎒';
    const spineColor = formData.get('spineColor') || 'green';
    const coverColor = formData.get('coverColor') || 'cream';
    const spineText = formData.get('spineText') || '2026 • LUNCHBOX';
    const description = formData.get('description') || 'Packed with thoughts and memories.';

    if (!title) return;

    const newNb = window.store.addNotebook({
      title,
      icon,
      color: spineColor,
      spineColor,
      coverColor,
      spineText,
      description
    });

    document.getElementById('new-notebook-modal')?.close();
    document.getElementById('new-notebook-form')?.reset();
    
    this.showShelfView();
    if (window.notificationEngine) {
      window.notificationEngine.showToast('📖', 'Notebook Created', `"${newNb.title}" is ready on your shelf.`);
    }
  }

  // --- SKETCHBOOK CUSTOMIZATION STUDIO ---
  openEditNotebookModal(notebookId = '') {
    const targetId = notebookId || (this.viewMode === 'book' ? this.currentView : window.store.getNotebooks()[this.carouselIndex]?.id);
    const nb = window.store.getNotebook(targetId);
    if (!nb) return;

    const modal = document.getElementById('edit-notebook-modal');
    if (!modal) return;

    document.getElementById('edit-nb-id').value = nb.id;
    document.getElementById('edit-nb-title').value = nb.title;
    document.getElementById('edit-nb-icon').value = nb.icon || '🎒';
    document.getElementById('edit-nb-show-label').value = nb.showCoverLabel !== false ? 'true' : 'false';
    document.getElementById('edit-nb-spine-color').value = nb.spineColor || nb.color || 'green';
    document.getElementById('edit-nb-cover-color').value = nb.coverColor || 'cream';
    document.getElementById('edit-nb-cover-title').value = nb.coverTitle || '';
    document.getElementById('edit-nb-cover-font').value = nb.coverFont || 'Inter';
    document.getElementById('edit-nb-cover-text-color').value = nb.coverTextColor || '#1E293B';
    document.getElementById('edit-nb-spine-text').value = nb.spineText || '2026 • LUNCHBOX';
    document.getElementById('edit-nb-desc').value = nb.description || '';

    modal.showModal();
  }

  handleUpdateNotebookDetails(formData) {
    const id = formData.get('id');
    const title = formData.get('title');
    const icon = formData.get('icon');
    const showCoverLabel = formData.get('showCoverLabel') === 'true';
    const spineColor = formData.get('spineColor');
    const coverColor = formData.get('coverColor');
    const coverTitle = formData.get('coverTitle');
    const coverFont = formData.get('coverFont');
    const coverTextColor = formData.get('coverTextColor');
    const spineText = formData.get('spineText');
    const description = formData.get('description');

    if (!id || !title) return;

    window.store.updateNotebook(id, {
      title,
      icon,
      showCoverLabel,
      spineColor,
      color: spineColor,
      coverColor,
      coverTitle,
      coverFont,
      coverTextColor,
      spineText,
      description
    });

    document.getElementById('edit-notebook-modal')?.close();
    this.render();
    if (window.notificationEngine) window.notificationEngine.playSound('chime');
  }

  openAddStickerModal() {
    if (this.viewMode === 'shelf') {
      window.appModal.alert("Please open a sketchbook from the carousel before adding a sticker!", "Open a Sketchbook", "🖼️");
      return;
    }
    const modal = document.getElementById('add-sticker-modal');
    if (modal) {
      document.getElementById('sticker-url-input')?.focus();
      modal.showModal();
    }
  }

  handleAddSticker(formData) {
    const url = formData.get('url');
    const pageSide = formData.get('pageSide') || 'right';
    const width = formData.get('width') || 160;
    const caption = formData.get('caption');
    if (!url) return;

    window.store.addSticker(this.currentView, {
      url,
      spreadIdx: this.currentSpreadIdx,
      pageSide,
      x: Math.round(20 + Math.random() * 40),
      y: Math.round(20 + Math.random() * 40),
      width: parseInt(width),
      caption
    });

    document.getElementById('add-sticker-modal')?.close();
    document.getElementById('add-sticker-form')?.reset();
    this.renderBookWorkspace();
    if (window.notificationEngine) window.notificationEngine.playSound('chime');
  }

  deleteSticker(nbId, stId) {
    window.store.deleteSticker(nbId, stId);
    this.renderBookWorkspace();
    if (window.notificationEngine) window.notificationEngine.playSound('chime');
  }

  renderPaperCard(nbId, item, washiColor = null) {
    const priorityEmoji = { high: '🔥', medium: '⚡', low: '🌱' };
    const pEmoji = priorityEmoji[item.priority] || '⚡';
    let washiHTML = washiColor ? `<div class="washi-tape washi-tape-${washiColor}" style="top: -6px; right: 12px; width: 60px; height: 16px;"></div>` : '';

    const safeTitle = escapeHTML(item.title);
    const safeDue = escapeHTML(item.due);
    const safeCategory = escapeHTML(item.category);
    const safeNotes = escapeHTML(item.notes);

    return `
      <div class="paper-item-card ${item.completed ? 'paper-item-completed' : ''}">
        ${washiHTML}
        <input type="checkbox" class="custom-checkbox" ${item.completed ? 'checked' : ''} 
          onchange="window.app.handleToggleItem('${nbId}', '${item.id}')" id="chk-${item.id}" />
        <div class="item-content" onclick="window.app.openEditItemModal('${nbId}', '${item.id}')" style="cursor: pointer;" title="Click to edit entry">
          <div class="item-title-line">
            <span class="item-title-text">${safeTitle}</span>
            <span class="item-badge item-priority-${item.priority}">${pEmoji}</span>
            ${safeDue ? `<span class="item-badge">🕒 ${safeDue}</span>` : ''}
            <span class="item-badge" style="color: var(--color-slate);">${safeCategory}</span>
          </div>
          ${safeNotes ? `<div class="item-notes">${safeNotes}</div>` : ''}
        </div>
        <div class="item-actions">
          <button class="item-edit-btn" onclick="event.stopPropagation(); window.app.openEditItemModal('${nbId}', '${item.id}')" title="Edit Entry Details">✏️</button>
          <button class="item-del-btn" onclick="event.stopPropagation(); window.app.handleDeleteItem('${nbId}', '${item.id}')" title="Delete Entry">✕</button>
        </div>
      </div>
    `;
  }

  openEditItemModal(notebookId, itemId) {
    const nb = window.store.getNotebook(notebookId);
    if (!nb) return;
    const item = (nb.items || []).find(i => i.id === itemId);
    if (!item) return;

    const modal = document.getElementById('edit-item-modal');
    if (!modal) return;

    document.getElementById('edit-item-nb-id').value = notebookId;
    document.getElementById('edit-item-id').value = itemId;
    document.getElementById('edit-item-title-input').value = item.title || '';
    document.getElementById('edit-item-priority').value = item.priority || 'medium';
    document.getElementById('edit-item-due').value = item.due || '';
    document.getElementById('edit-item-category').value = item.category || '';
    document.getElementById('edit-item-notes').value = item.notes || '';

    modal.showModal();
    if (window.notificationEngine) window.notificationEngine.playSound('chime');
  }

  handleUpdateItem(formData) {
    const nbId = formData.get('notebookId');
    const itemId = formData.get('itemId');
    const title = formData.get('title');
    const priority = formData.get('priority');
    const due = formData.get('due');
    const category = formData.get('category');
    const notes = formData.get('notes');

    if (!nbId || !itemId || !title) return;

    window.store.updateItem(nbId, itemId, { title, priority, due, category, notes });
    document.getElementById('edit-item-modal')?.close();
    this.renderBookWorkspace();
    if (window.notificationEngine) window.notificationEngine.playSound('chime');
  }

  quickAddItem(e, nbId) {
    e.preventDefault();
    const input = e.target.querySelector('input[name="quickTitle"]');
    if (!input || !input.value.trim()) return;

    window.store.addItem(nbId, {
      title: input.value.trim(),
      priority: 'medium',
      due: 'Today',
      category: 'Quick Pack',
      notes: ''
    });

    input.value = '';
    if (window.notificationEngine) window.notificationEngine.playSound('chime');
    this.renderBookWorkspace();
  }

  openNewItemModal(notebookId = '') {
    const modal = document.getElementById('new-item-modal');
    if (!modal) return;
    const select = document.getElementById('new-item-notebook-select');
    if (select) {
      select.innerHTML = window.store.getNotebooks().map(nb => `
        <option value="${nb.id}" ${nb.id === (notebookId || this.currentView) ? 'selected' : ''}>${nb.icon} ${nb.title}</option>
      `).join('');
    }
    document.getElementById('new-item-title')?.focus();
    modal.showModal();
  }

  openNewNotebookModal() {
    const modal = document.getElementById('new-notebook-modal');
    if (!modal) return;
    document.getElementById('new-nb-title')?.focus();
    modal.showModal();
  }

  handleCreateItem(formData) {
    const nbId = formData.get('notebookId');
    const title = formData.get('title');
    const priority = formData.get('priority');
    const due = formData.get('due');
    const category = formData.get('category');
    const notes = formData.get('notes');
    if (!title || !nbId) return;

    window.store.addItem(nbId, { title, priority, due, category, notes });
    document.getElementById('new-item-modal')?.close();
    document.getElementById('new-item-form')?.reset();
    if (window.notificationEngine) window.notificationEngine.playSound('chime');
  }

  handleCreateNotebook(formData) {
    const title = formData.get('title');
    const icon = formData.get('icon') || '🎒';
    const spineColor = formData.get('spineColor') || 'green';
    const coverColor = formData.get('coverColor') || 'cream';
    const spineText = formData.get('spineText') || '2026 • LUNCHBOX';
    const description = formData.get('description');
    if (!title) return;

    const newNb = window.store.addNotebook({ title, icon, color: spineColor, spineColor, coverColor, spineText, description });
    document.getElementById('new-notebook-modal')?.close();
    document.getElementById('new-notebook-form')?.reset();
    this.openNotebook(newNb.id);
    if (window.notificationEngine) window.notificationEngine.playSound('chime');
  }

  handleToggleItem(nbId, itemId) {
    const item = window.store.toggleItem(nbId, itemId);
    if (item && item.completed) {
      if (window.notificationEngine) window.notificationEngine.playSound('pop');
    } else {
      if (window.notificationEngine) window.notificationEngine.playSound('chime');
    }
    this.renderBookWorkspace();
  }

  handleDeleteItem(nbId, itemId) {
    window.store.deleteItem(nbId, itemId);
    if (window.notificationEngine) window.notificationEngine.playSound('chime');
    this.renderBookWorkspace();
  }

  async resetDemoData() {
    const confirmed = await window.appModal.confirm(
      "Reset Lunchbox back to default sample sketchbooks and stickers?",
      "Reset Sample Data",
      "🔄",
      "Reset Data",
      "Cancel",
      true
    );
    if (confirmed) {
      window.store.resetToDefault();
      if (window.stickyManager) window.stickyManager.init();
      document.getElementById('settings-modal')?.close();
      this.showShelfView();
    }
  }
}

window.app = new App();
