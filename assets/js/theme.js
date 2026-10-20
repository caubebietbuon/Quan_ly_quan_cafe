/**
 * ====================================================================
 * DỰ ÁN: CAFE TASK MANAGER
 * MODULE THEME: THANH TÁC VỤ DUYỆT WEB CHẾ ĐỘ TỐI KIỂU CỐC CỐC
 * File: assets/js/theme.js
 * ====================================================================
 */

(function () {
  'use strict';

  // Các khóa lưu trữ trong LocalStorage
  const STORAGE_KEYS = ['theme', 'CAFE_THEME', 'cafe_theme'];

  // Lấy các nút bấm chuyển đổi theme trên giao diện
  const getToggleButtons = () => document.querySelectorAll('#theme-toggle-btn, #theme-toggle, .theme-toggle-btn');

  // Lấy trạng thái theme đã lưu từ trước
  function getSavedTheme() {
    for (const key of STORAGE_KEYS) {
      const val = localStorage.getItem(key);
      if (val === 'dark' || val === 'light') return val;
    }
    // Mặc định kiểm tra chế độ hệ thống nếu chưa lưu
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  // Cập nhật biểu tượng Mặt trời / Mặt trăng trên nút Header
  function updateButtonIcons(isDark) {
    const buttons = getToggleButtons();
    buttons.forEach(btn => {
      if (isDark) {
        btn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        `;
        btn.setAttribute('title', 'Duyệt web chế độ tối (Đang bật)');
        btn.setAttribute('aria-label', 'Duyệt web chế độ tối');
      } else {
        btn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        `;
        btn.setAttribute('title', 'Duyệt web chế độ tối (Đang tắt)');
        btn.setAttribute('aria-label', 'Duyệt web chế độ tối');
      }
    });
  }

  // Đồng bộ nội dung và nút gạt của thanh tác vụ Cốc Cốc
  function syncPopoverUI(isDark) {
    const popover = document.getElementById('coc-coc-theme-popover');
    if (!popover) return;

    const switchInput = popover.querySelector('#coc-coc-switch-input');
    const titleEl = popover.querySelector('#coc-coc-status-title');
    const descEl = popover.querySelector('#coc-coc-status-desc');

    if (switchInput) {
      switchInput.checked = isDark;
    }
    if (titleEl) {
      titleEl.textContent = isDark ? 'Đã bật trên trang này' : 'Đã tắt trên trang này';
    }
    if (descEl) {
      descEl.textContent = isDark ? 'Đang xem trang trong chế độ tối' : 'Kích hoạt để xem trang trong chế độ tối';
    }
  }

  // Áp dụng theme và đồng bộ toàn hệ thống
  function applyTheme(theme, showFeedbackToast = false) {
    const isDark = theme === 'dark';

    // 1. Áp dụng class lên body & html
    if (document.body) {
      document.body.classList.toggle('dark-theme', isDark);
    }
    document.documentElement.classList.toggle('dark-theme', isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    // 2. Lưu lại vào LocalStorage
    try {
      STORAGE_KEYS.forEach(key => localStorage.setItem(key, isDark ? 'dark' : 'light'));
    } catch (e) {
      console.warn('[theme.js] Không thể lưu theme vào LocalStorage:', e);
    }

    // 3. Cập nhật biểu tượng và giao diện popover
    updateButtonIcons(isDark);
    syncPopoverUI(isDark);

    // 4. Phát sự kiện để các biểu đồ / module khác đồng bộ ngay
    const eventDetail = { theme: isDark ? 'dark' : 'light', isDark };
    window.dispatchEvent(new CustomEvent('themechange', { detail: eventDetail }));
    document.dispatchEvent(new CustomEvent('themechange', { detail: eventDetail }));

    // 5. Hiển thị thông báo Toast nếu được yêu cầu
    if (showFeedbackToast && typeof window.showToast === 'function') {
      window.showToast(`Đã ${isDark ? 'bật' : 'tắt'} chế độ tối trên trang này`, 'info');
    }
  }

  // Khởi tạo ngay trạng thái từ ban đầu để tránh chớp màn hình (FOUC)
  const initialTheme = getSavedTheme();
  if (initialTheme === 'dark') {
    if (document.body) document.body.classList.add('dark-theme');
    document.documentElement.classList.add('dark-theme');
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  // Đóng Popover Cốc Cốc
  function closePopover() {
    const popover = document.getElementById('coc-coc-theme-popover');
    if (!popover) return;
    popover.classList.remove('is-open');
    popover.setAttribute('aria-hidden', 'true');

    getToggleButtons().forEach(btn => {
      btn.classList.remove('is-active', 'popover-open');
      btn.setAttribute('aria-expanded', 'false');
    });
  }

  // Mở Popover Cốc Cốc
  function openPopover() {
    const popover = document.getElementById('coc-coc-theme-popover');
    if (!popover) return;

    // Đồng bộ lại UI trước khi hiện
    const isCurrentlyDark = document.body ? document.body.classList.contains('dark-theme') : (getSavedTheme() === 'dark');
    syncPopoverUI(isCurrentlyDark);

    popover.classList.add('is-open');
    popover.setAttribute('aria-hidden', 'false');

    getToggleButtons().forEach(btn => {
      btn.classList.add('is-active', 'popover-open');
      btn.setAttribute('aria-expanded', 'true');
    });
  }

  // Chuyển đổi bật / tắt Popover Cốc Cốc
  function togglePopover(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const popover = document.getElementById('coc-coc-theme-popover');
    if (!popover) return;
    if (popover.classList.contains('is-open')) {
      closePopover();
    } else {
      openPopover();
    }
  }

  // Tạo và gắn cấu trúc HTML thanh tác vụ Cốc Cốc vào DOM
  function createCocCocPopover() {
    if (document.getElementById('coc-coc-theme-popover')) return;

    const navbarActions = document.querySelector('.navbar-actions');
    const toggleBtn = document.querySelector('#theme-toggle-btn, #theme-toggle, .theme-toggle-btn');
    if (!navbarActions && !toggleBtn) return;

    // Lấy tên host động (ví dụ localhost:3000 hoặc tên miền trang web)
    const displayHost = window.location.host || (window.location.protocol === 'file:' ? 'localhost:3000' : 'CafeTaskManager.local');

    const popoverEl = document.createElement('div');
    popoverEl.id = 'coc-coc-theme-popover';
    popoverEl.className = 'coc-coc-popover';
    popoverEl.setAttribute('role', 'dialog');
    popoverEl.setAttribute('aria-label', 'Duyệt web chế độ tối');
    popoverEl.setAttribute('aria-hidden', 'true');

    popoverEl.innerHTML = `
      <!-- Tiêu đề & Cài đặt chuẩn Cốc Cốc -->
      <div class="coc-coc-header">
        <div class="coc-coc-title-group">
          <svg class="coc-coc-moon-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
          <span class="coc-coc-title">Duyệt web chế độ tối</span>
        </div>
        <button type="button" class="coc-coc-gear-btn" id="coc-coc-gear-btn" aria-label="Cài đặt chế độ tối" title="Cài đặt">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
      </div>

      <!-- Badge Tên Miền / Host -->
      <div class="coc-coc-host-badge" id="coc-coc-host-badge">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
        <span class="coc-coc-host-text">${displayHost}</span>
      </div>

      <!-- Thẻ chính có nút Switch bật / tắt -->
      <div class="coc-coc-card" id="coc-coc-card" role="button" tabindex="0" aria-label="Bật hoặc tắt chế độ tối cho trang này">
        <div class="coc-coc-card-info">
          <span class="coc-coc-status-title" id="coc-coc-status-title">Đã tắt trên trang này</span>
          <span class="coc-coc-status-desc" id="coc-coc-status-desc">Kích hoạt để xem trang trong chế độ tối</span>
        </div>
        <div class="coc-coc-switch-wrap">
          <input type="checkbox" id="coc-coc-switch-input" class="coc-coc-switch-input" aria-label="Chuyển đổi chế độ tối">
          <label for="coc-coc-switch-input" class="coc-coc-switch-slider"></label>
        </div>
      </div>
    `;

    // Chèn popover vào cụm navbar-actions
    if (navbarActions) {
      navbarActions.appendChild(popoverEl);
    } else if (toggleBtn && toggleBtn.parentNode) {
      toggleBtn.parentNode.appendChild(popoverEl);
    }

    // Gắn sự kiện khi click vào toàn bộ thẻ Card hoặc nút switch
    const cardEl = popoverEl.querySelector('#coc-coc-card');
    const switchInput = popoverEl.querySelector('#coc-coc-switch-input');

    const handleToggleAction = (e) => {
      if (e) {
        e.stopPropagation();
      }
      const isCurrentlyDark = document.body ? document.body.classList.contains('dark-theme') : false;
      const nextTheme = isCurrentlyDark ? 'light' : 'dark';
      applyTheme(nextTheme, true);
    };

    if (cardEl) {
      cardEl.addEventListener('click', handleToggleAction);
      cardEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleToggleAction(e);
        }
      });
    }

    if (switchInput) {
      switchInput.addEventListener('change', (e) => {
        e.stopPropagation();
        applyTheme(switchInput.checked ? 'dark' : 'light', true);
      });
      // Ngăn chặn sự kiện click kép từ label/input lên thẻ card cha
      switchInput.addEventListener('click', (e) => e.stopPropagation());
    }

    // Gắn sự kiện cho nút Cài đặt ⚙
    const gearBtn = popoverEl.querySelector('#coc-coc-gear-btn');
    if (gearBtn) {
      gearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof window.showToast === 'function') {
          window.showToast(`⚙️ Cốc Cốc Dark Mode: Tự động ghi nhớ cấu hình cho trang ${displayHost}`, 'info');
        }
      });
    }

    // Chặn sự kiện click bên trong popover nổi bọt ra ngoài
    popoverEl.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Đồng bộ trạng thái hiện tại
    const isDark = document.body ? document.body.classList.contains('dark-theme') : (initialTheme === 'dark');
    syncPopoverUI(isDark);
  }

  // Gắn sự kiện cho các nút mở Popover Cốc Cốc trên Navbar
  function bindThemeEvents() {
    createCocCocPopover();

    const buttons = getToggleButtons();
    buttons.forEach(btn => {
      if (btn.dataset.themeBound) return;
      btn.dataset.themeBound = 'true';
      btn.setAttribute('aria-haspopup', 'dialog');
      btn.setAttribute('aria-expanded', 'false');

      // Click vào nút icon trên navbar sẽ mở/đóng Popover Cốc Cốc
      btn.addEventListener('click', togglePopover);
    });

    // Click ra ngoài popover -> đóng popover
    document.addEventListener('click', (e) => {
      const popover = document.getElementById('coc-coc-theme-popover');
      if (!popover || !popover.classList.contains('is-open')) return;

      let isClickInsideButton = false;
      buttons.forEach(btn => {
        if (btn.contains(e.target)) isClickInsideButton = true;
      });

      if (!popover.contains(e.target) && !isClickInsideButton) {
        closePopover();
      }
    });

    // Phím Escape -> đóng popover
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closePopover();
      }
    });

    // Cập nhật lại icon và UI ban đầu
    const isDark = document.body ? document.body.classList.contains('dark-theme') : (initialTheme === 'dark');
    updateButtonIcons(isDark);
    syncPopoverUI(isDark);
  }

  // Khởi động khi DOM sẵn sàng
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (initialTheme === 'dark' && document.body) {
        document.body.classList.add('dark-theme');
      }
      bindThemeEvents();
    });
  } else {
    bindThemeEvents();
  }

  // Đánh dấu để main.js không đè sự kiện
  window.__cocCocThemeInitialized = true;
  window.applyTheme = applyTheme;
  window.toggleCocCocPopover = togglePopover;
})();
