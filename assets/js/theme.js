/**
 * ====================================================================
 * DỰ ÁN: CAFE TASK MANAGER
 * MODULE THEME: QUẢN LÝ CHẾ ĐỘ SÁNG / TỐI (DARK MODE / LIGHT MODE)
 * File: assets/js/theme.js
 * ====================================================================
 */

(function () {
  'use strict';

  // Lấy các nút bấm chuyển đổi theme (hỗ trợ cả id 'theme-toggle-btn', 'theme-toggle', và class '.theme-toggle-btn')
  const getToggleButtons = () => document.querySelectorAll('#theme-toggle-btn, #theme-toggle, .theme-toggle-btn');

  // 1. Kiểm tra trạng thái đã lưu từ trước trong localStorage
  const savedTheme = localStorage.getItem('theme') || 
                     localStorage.getItem('CAFE_THEME') || 
                     localStorage.getItem('cafe_theme');

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
        btn.setAttribute('title', 'Chuyển sang Giao diện Sáng (Light Mode)');
        btn.setAttribute('aria-label', 'Chuyển sang Giao diện Sáng');
      } else {
        btn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        `;
        btn.setAttribute('title', 'Chuyển sang Giao diện Tối (Dark Mode)');
        btn.setAttribute('aria-label', 'Chuyển sang Giao diện Tối');
      }
    });
  }

  function applyTheme(theme) {
    const isDark = theme === 'dark';
    
    // Thêm hoặc xóa class 'dark-theme' trên toàn bộ <body> và <html>
    if (document.body) {
      document.body.classList.toggle('dark-theme', isDark);
    }
    document.documentElement.classList.toggle('dark-theme', isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    // Lưu lại lựa chọn vào localStorage
    try {
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      localStorage.setItem('CAFE_THEME', isDark ? 'dark' : 'light');
      localStorage.setItem('cafe_theme', isDark ? 'dark' : 'light');
    } catch (e) {
      console.warn('[theme.js] Không thể lưu theme vào LocalStorage:', e);
    }

    updateButtonIcons(isDark);
  }

  // Khởi tạo ngay trạng thái ban đầu
  if (savedTheme === 'dark') {
    if (document.body) {
      document.body.classList.add('dark-theme');
    }
    document.documentElement.classList.add('dark-theme');
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  // 2. Bắt sự kiện khi người dùng click đổi giao diện
  function bindThemeToggleEvents() {
    const buttons = getToggleButtons();
    buttons.forEach(btn => {
      if (btn.dataset.themeBound) return;
      btn.dataset.themeBound = 'true';

      btn.addEventListener('click', () => {
        // Thêm hoặc xóa class 'dark-theme' trên toàn bộ <body>
        const isCurrentlyDark = document.body ? document.body.classList.contains('dark-theme') : false;
        const newTheme = isCurrentlyDark ? 'light' : 'dark';
        applyTheme(newTheme);

        if (typeof window.showToast === 'function') {
          window.showToast(`Đã chuyển sang ${newTheme === 'dark' ? 'Giao diện Tối' : 'Giao diện Sáng'}`, 'info');
        }
      });
    });

    updateButtonIcons(document.body ? document.body.classList.contains('dark-theme') : (savedTheme === 'dark'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
      }
      bindThemeToggleEvents();
    });
  } else {
    bindThemeToggleEvents();
  }

  // Xuất hàm toàn cục để các script khác có thể gọi nếu cần
  window.applyTheme = applyTheme;
})();
