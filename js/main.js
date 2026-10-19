/**
 * ====================================================================
 * DỰ ÁN: QUẢN LÝ QUÁN COFFEE (MVP)
 * NHIỆM VỤ 1: KHUNG GIAO DIỆN CHUNG + HEADER + FOOTER
 * File: js/main.js
 * Phụ trách: Người 1 (Leader / UI/UX & Front-end Integration)
 * ====================================================================
 * Mô tả:
 * 1. Quản lý trạng thái và danh sách tài khoản hệ thống (Admin, Nhân viên, Khách hàng, Khách vãng lai).
 * 2. Cung cấp API dùng chung window.CoffeeAuth cho cả nhóm tích hợp.
 * 3. Xử lý đồng bộ Header (hiển thị thông tin người dùng, giỏ hàng, đăng xuất).
 * 4. Tương tác Mobile Navigation Drawer và Modal chọn tài khoản kiểm thử.
 * 5. Tự động nhận diện trang hiện tại (Active Link).
 * 6. Hiệu ứng Sticky Header khi cuộn trang.
 * ====================================================================
 */

(function () {
  'use strict';

  /* ------------------------------------------------------------------
     1. DANH SÁCH TÀI KHOẢN HỆ THỐNG MẪU (MVP DEMO ACCOUNTS)
     ------------------------------------------------------------------ */
  const DEMO_ACCOUNTS = {
    admin: {
      username: 'admin',
      role: 'admin',
      name: 'Lê Hoàng (Chủ quán)',
      avatar: 'AD',
      roleBadgeText: 'Admin',
      roleBadgeClass: 'badge-completed',
      description: 'Quản lý toàn bộ món, kho hàng, nhân viên và doanh thu'
    },
    staff: {
      username: 'nhanvien',
      role: 'staff',
      name: 'Trần Thị Mai (Pha chế)',
      avatar: 'NV',
      roleBadgeText: 'Pha chế',
      roleBadgeClass: 'badge-preparing',
      description: 'Nhận đơn & pha chế: PENDING -> PREPARING -> COMPLETED'
    },
    customer: {
      username: 'khachhang',
      role: 'customer',
      name: 'Nguyễn Văn A (Khách hàng)',
      avatar: 'KH',
      roleBadgeText: 'Khách hàng',
      roleBadgeClass: 'badge-role',
      description: 'Xem menu, giỏ hàng, đặt hàng và theo dõi đơn'
    },
    guest: {
      username: '',
      role: 'guest',
      name: 'Khách vãng lai',
      avatar: '?',
      roleBadgeText: 'Khách vãng lai',
      roleBadgeClass: 'badge-pending',
      description: 'Chưa đăng nhập, chỉ xem menu và giá'
    }
  };

  const AUTH_STORAGE_KEY = 'coffee_current_user';

  /* ------------------------------------------------------------------
     2. MODULE XÁC THỰC DÙNG CHUNG (COFFEE AUTH)
     ------------------------------------------------------------------ */
  const CoffeeAuth = {
    accounts: DEMO_ACCOUNTS,

    /**
     * Lấy thông tin người dùng hiện tại từ localStorage
     */
    getCurrentUser: function () {
      try {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (err) {
        console.warn('[CoffeeAuth] Lỗi đọc dữ liệu người dùng:', err);
      }
      return DEMO_ACCOUNTS.guest;
    },

    /**
     * Cập nhật thông tin người dùng và đồng bộ UI Header
     */
    setUser: function (user) {
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
        this.renderAuthUI();
        // Bắn Custom Event để các trang nghiệp vụ của thành viên khác có thể lắng nghe
        window.dispatchEvent(new CustomEvent('coffee:auth-changed', { detail: user }));
      } catch (err) {
        console.error('[CoffeeAuth] Lỗi lưu trạng thái người dùng:', err);
      }
    },

    /**
     * Đăng nhập nhanh theo khóa tài khoản ('admin' | 'staff' | 'customer' | 'guest')
     */
    loginAs: function (accountKey) {
      const account = DEMO_ACCOUNTS[accountKey] || DEMO_ACCOUNTS.guest;
      this.setUser(account);
    },

    /**
     * Đăng xuất, đưa về vai trò Khách vãng lai
     */
    logout: function () {
      this.setUser(DEMO_ACCOUNTS.guest);
    },

    /**
     * Render giao diện Header theo vai trò người dùng hiện tại
     */
    renderAuthUI: function () {
      const user = this.getCurrentUser();
      const guestContainers = document.querySelectorAll('.auth-guest');
      const userContainers = document.querySelectorAll('.auth-user');
      const cartBtns = document.querySelectorAll('.btn-cart');

      if (!user || user.role === 'guest') {
        // Trạng thái: Khách vãng lai
        guestContainers.forEach(el => el.style.display = 'flex');
        userContainers.forEach(el => el.style.display = 'none');
      } else {
        // Trạng thái: Đã đăng nhập (Admin, Nhân viên, Khách hàng)
        guestContainers.forEach(el => el.style.display = 'none');
        userContainers.forEach(el => el.style.display = 'flex');

        // Cập nhật tên hiển thị
        const nameElements = document.querySelectorAll('.user-display-name');
        nameElements.forEach(el => {
          el.textContent = user.name || 'Người dùng';
        });

        // Cập nhật avatar chữ cái
        const avatarElements = document.querySelectorAll('.user-avatar-small');
        avatarElements.forEach(el => {
          el.textContent = user.avatar || (user.name ? user.name.charAt(0).toUpperCase() : 'U');
        });

        // Cập nhật huy hiệu vai trò
        const roleElements = document.querySelectorAll('.user-role-badge');
        roleElements.forEach(el => {
          el.className = 'user-role-badge badge';
          if (user.role === 'admin') {
            el.classList.add('badge-completed');
            el.textContent = 'Admin';
          } else if (user.role === 'staff') {
            el.classList.add('badge-preparing');
            el.textContent = 'Pha chế';
          } else {
            el.classList.add('badge-role');
            el.textContent = 'Khách hàng';
          }
        });

        // Ẩn/Hiện giỏ hàng: chỉ hiển thị cho Customer
        cartBtns.forEach(cart => {
          if (user.role === 'customer') {
            cart.style.display = 'inline-flex';
          } else {
            cart.style.display = 'none';
          }
        });
      }

      // Đánh dấu thẻ tài khoản active trong Modal
      const accountCards = document.querySelectorAll('.account-card');
      accountCards.forEach(card => {
        const cardKey = card.getAttribute('data-account');
        if (cardKey === user.role) {
          card.classList.add('is-active');
        } else {
          card.classList.remove('is-active');
        }
      });
    }
  };

  // Xuất API CoffeeAuth ra window cho cả nhóm sử dụng
  window.CoffeeAuth = CoffeeAuth;

  /* ------------------------------------------------------------------
     3. QUẢN LÝ MOBILE NAVIGATION (HAMBURGER DRAWER)
     ------------------------------------------------------------------ */
  function initMobileNav() {
    const toggleBtn = document.getElementById('mobile-nav-toggle');
    const siteNav = document.getElementById('site-nav');
    const overlay = document.getElementById('mobile-nav-overlay');
    const closeBtn = document.getElementById('mobile-nav-close');
    const navLinks = document.querySelectorAll('.site-nav .nav-link');

    if (!toggleBtn || !siteNav) return;

    function openNav() {
      siteNav.classList.add('is-open');
      if (overlay) overlay.classList.add('is-active');
      toggleBtn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    function closeNav() {
      siteNav.classList.remove('is-open');
      if (overlay) overlay.classList.remove('is-active');
      toggleBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    toggleBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      const isOpen = siteNav.classList.contains('is-open');
      if (isOpen) {
        closeNav();
      } else {
        openNav();
      }
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', closeNav);
    }

    if (overlay) {
      overlay.addEventListener('click', closeNav);
    }

    navLinks.forEach(link => {
      link.addEventListener('click', closeNav);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && siteNav.classList.contains('is-open')) {
        closeNav();
      }
    });
  }

  /* ------------------------------------------------------------------
     4. TỰ ĐỘNG GẮN ACTIVE LINK THEO TRANG HIỆN TẠI
     ------------------------------------------------------------------ */
  function initActiveNavLinks() {
    const currentPath = window.location.pathname.toLowerCase();
    const navLinks = document.querySelectorAll('.nav-link');

    let currentFileName = currentPath.substring(currentPath.lastIndexOf('/') + 1);
    if (!currentFileName || currentFileName === '' || currentFileName === 'index.html') {
      currentFileName = 'trangchu.html';
    }

    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;

      const linkFileName = href.substring(href.lastIndexOf('/') + 1).toLowerCase();

      if (linkFileName === currentFileName) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });
  }

  /* ------------------------------------------------------------------
     5. STICKY HEADER SHADOW KHI CUỘN TRANG
     ------------------------------------------------------------------ */
  function initHeaderScroll() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    function handleScroll() {
      if (window.scrollY > 20) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  }

  /* ------------------------------------------------------------------
     6. MODAL CHỌN TÀI KHOẢN HỆ THỐNG (ADMIN / NHÂN VIÊN / KHÁCH)
     ------------------------------------------------------------------ */
  function initAccountModal() {
    const triggerBtns = document.querySelectorAll('.btn-open-account-modal');
    const modalBackdrop = document.getElementById('account-modal-backdrop');
    const closeBtn = document.getElementById('account-modal-close');
    const selectAccountBtns = document.querySelectorAll('.btn-select-account');
    const logoutBtns = document.querySelectorAll('.btn-logout-common');

    if (!modalBackdrop) return;

    function openModal() {
      modalBackdrop.classList.add('is-open');
      modalBackdrop.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      CoffeeAuth.renderAuthUI();
    }

    function closeModal() {
      modalBackdrop.classList.remove('is-open');
      modalBackdrop.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    triggerBtns.forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        openModal();
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }

    modalBackdrop.addEventListener('click', function (e) {
      if (e.target === modalBackdrop) {
        closeModal();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modalBackdrop.classList.contains('is-open')) {
        closeModal();
      }
    });

    // Bấm chọn tài khoản bất kỳ
    selectAccountBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        const accountKey = this.getAttribute('data-account');
        CoffeeAuth.loginAs(accountKey);
        closeModal();
      });
    });

    // Nút đăng xuất dùng chung
    logoutBtns.forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        CoffeeAuth.logout();
      });
    });
  }

  /* ------------------------------------------------------------------
     7. KHỞI CHẠY KHI TẢI XONG TRANG
     ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', function () {
    initMobileNav();
    initActiveNavLinks();
    initHeaderScroll();
    initAccountModal();
    CoffeeAuth.renderAuthUI();
  });

})();
