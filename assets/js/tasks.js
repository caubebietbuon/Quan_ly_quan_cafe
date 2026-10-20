/**
 * ====================================================================
 * DỰ ÁN: CAFE TASK MANAGER (HỆ THỐNG QUẢN LÝ CÔNG VIỆC QUÁN CAFE)
 * TẦNG NGHIỆP VỤ: TÌM KIẾM, LỌC KẾT HỢP, SẮP XẾP & PHÂN TRANG (PAGINATION)
 * File: assets/js/tasks.js
 * Phụ trách: Người 3 (Search, Filter, Sort, Pagination & UML Activity)
 * ====================================================================
 * Mô tả chức năng:
 * 1. Lấy dữ liệu công việc chuẩn từ window.TaskService.getAllTasks()
 * 2. Lọc đa điều kiện đồng thời:
 *    - Search: Tìm kiếm không phân biệt hoa thường trong title & description
 *    - Filter Status: Lọc theo trạng thái ('all' | 'Pending' | 'Done')
 *    - Filter Priority: Lọc theo độ ưu tiên ('all' | 'Low' | 'Medium' | 'High')
 *    - Sort: Sắp xếp theo ngày hạn chót deadline (Gần nhất -> Xa nhất, Xa nhất -> Gần nhất, Mặc định)
 * 3. Phân trang (Pagination):
 *    - Chia danh sách sau lọc thành từng trang (mặc định 5 task/trang)
 *    - Điều khiển Trang trước, Trang sau, Nhảy trực tiếp đến số trang
 *    - Cập nhật số lượng kết quả hiển thị realtime
 * 4. Tích hợp Data Contract:
 *    - Gọi window.renderTaskList(paginatedTasks) để Người 2 hiển thị giao diện
 *    - Tự động cung cấp Fallback Renderer nếu Người 2 chưa hoàn thành code
 *    - Lắng nghe sự kiện 'tasks:changed' từ TaskService để tự động đồng bộ
 * ====================================================================
 */

(function (window, document) {
  'use strict';

  /* ------------------------------------------------------------------
     1. KHỞI TẠO STATE QUẢN LÝ BỘ LỌC & PHÂN TRANG
     ------------------------------------------------------------------ */
  const state = {
    keyword: '',          // Từ khóa tìm kiếm
    status: 'all',        // 'all' | 'Pending' | 'Done'
    priority: 'all',      // 'all' | 'Low' | 'Medium' | 'High'
    sortBy: 'default',    // 'default' | 'deadline-asc' | 'deadline-desc'
    currentPage: 1,       // Trang hiện tại (1-indexed)
    pageSize: 5,          // Số công việc trên 1 trang (mặc định: 5)
    totalFiltered: 0,     // Tổng số công việc sau khi lọc
    totalPages: 1         // Tổng số trang
  };

  /* ------------------------------------------------------------------
     2. THAM CHIẾU CÁC PHẦN TỬ DOM TRÊN GIAO DIỆN
     ------------------------------------------------------------------ */
  let dom = {};

  function initDomReferences() {
    dom = {
      // Inputs & Selects của Người 3
      searchInput: document.getElementById('filter-search'),
      statusSelect: document.getElementById('filter-status'),
      prioritySelect: document.getElementById('filter-priority'),
      sortSelect: document.getElementById('filter-sort'),
      pageSizeSelect: document.getElementById('filter-page-size'),
      btnResetFilters: document.getElementById('btn-reset-filters'),
      btnClearSearch: document.getElementById('btn-clear-search'),
      
      // Thông tin kết quả & Phân trang
      resultsInfo: document.getElementById('filter-results-info'),
      paginationContainer: document.getElementById('tasks-pagination'),
      paginationWrapper: document.getElementById('tasks-pagination-wrapper'),
      
      // Khu vực danh sách task (thuộc Người 2)
      taskListContainer: document.getElementById('task-list'),
      emptyStateContainer: document.getElementById('empty-state')
    };
  }

  /* ------------------------------------------------------------------
     3. TIỆN ÍCH CHUẨN HÓA VĂN BẢN (SEARCH HỖ TRỢ TIẾNG VIỆT KHÔNG DẤU)
     ------------------------------------------------------------------ */
  /**
   * Bỏ dấu tiếng Việt và chuyển chữ thường để tìm kiếm linh hoạt hơn
   * Ví dụ: "Cà phê" khớp với "ca phe" hoặc "CÀ PHÊ"
   * @param {string} str 
   * @returns {string}
   */
  function removeVietnameseTones(str) {
    if (!str) return '';
    str = String(str).toLowerCase();
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
    str = str.replace(/đ/g, 'd');
    // Bỏ các ký tự dấu tổ hợp Unicode
    str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, '');
    str = str.replace(/\u02C6|\u0306|\u031B/g, '');
    return str.trim();
  }

  /* ------------------------------------------------------------------
     4. HÀM CỐT LÕI: APPLY FILTER AND SORT (KẾT HỢP ĐỒNG THỜI 4 ĐIỀU KIỆN)
     ------------------------------------------------------------------ */
  /**
   * Áp dụng đồng thời 4 tiêu chí lọc và tính toán phân trang:
   * 1. Tìm kiếm trong title hoặc description (không phân biệt hoa/thường, hỗ trợ tiếng Việt)
   * 2. Lọc theo trạng thái (Pending / Done)
   * 3. Lọc theo độ ưu tiên (Low / Medium / High)
   * 4. Sắp xếp theo hạn chót (Deadline)
   * @returns {Array} Mảng các công việc của trang hiện tại
   */
  function applyFilterAndSort() {
    // Bước 1: Lấy toàn bộ danh sách task từ TaskService (Data Contract)
    let rawTasks = [];
    if (window.TaskService && typeof window.TaskService.getAllTasks === 'function') {
      rawTasks = window.TaskService.getAllTasks();
    } else {
      console.warn('[Người 3] TaskService chưa khả dụng, kiểm tra thứ tự nhúng script.');
      return [];
    }

    if (!Array.isArray(rawTasks)) {
      rawTasks = [];
    }

    // Đọc giá trị mới nhất từ DOM (nếu có)
    if (dom.searchInput) state.keyword = dom.searchInput.value.trim();
    if (dom.statusSelect) state.status = dom.statusSelect.value;
    if (dom.prioritySelect) state.priority = dom.prioritySelect.value;
    if (dom.sortSelect) state.sortBy = dom.sortSelect.value;
    if (dom.pageSizeSelect) state.pageSize = parseInt(dom.pageSizeSelect.value, 10) || 5;

    // Chuẩn bị từ khóa tìm kiếm (bỏ dấu và giữ nguyên bản thường)
    const rawTerm = state.keyword.toLowerCase();
    const cleanTerm = removeVietnameseTones(state.keyword);

    // Bước 2: Lọc mảng theo 3 tiêu chí Tìm kiếm + Status + Priority
    let filtered = rawTasks.filter(task => {
      if (!task) return false;

      // 2.1. Tìm kiếm trong Title & Description
      if (rawTerm) {
        const titleRaw = (task.title || '').toLowerCase();
        const descRaw = (task.description || '').toLowerCase();
        const titleClean = removeVietnameseTones(task.title || '');
        const descClean = removeVietnameseTones(task.description || '');

        const matchTitle = titleRaw.includes(rawTerm) || titleClean.includes(cleanTerm);
        const matchDesc = descRaw.includes(rawTerm) || descClean.includes(cleanTerm);

        if (!matchTitle && !matchDesc) {
          return false;
        }
      }

      // 2.2. Lọc theo Trạng thái (Status: "Pending" | "Done")
      if (state.status && state.status !== 'all') {
        const taskStatus = String(task.status || '').trim().toLowerCase();
        const targetStatus = state.status.toLowerCase();
        if (taskStatus !== targetStatus) {
          return false;
        }
      }

      // 2.3. Lọc theo Độ ưu tiên (Priority: "Low" | "Medium" | "High")
      if (state.priority && state.priority !== 'all') {
        const taskPriority = String(task.priority || '').trim().toLowerCase();
        const targetPriority = state.priority.toLowerCase();
        if (taskPriority !== targetPriority) {
          return false;
        }
      }

      return true;
    });

    // Bước 3: Sắp xếp (Sort) theo Deadline hoặc Mặc định
    let sorted = [...filtered];

    if (state.sortBy === 'deadline-asc') {
      // Hạn chót GẦN NHẤT trước (Tăng dần theo ngày)
      sorted.sort((a, b) => {
        const dateA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const dateB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return dateA - dateB;
      });
    } else if (state.sortBy === 'deadline-desc') {
      // Hạn chót XA NHẤT trước (Giảm dần theo ngày)
      sorted.sort((a, b) => {
        const dateA = a.deadline ? new Date(a.deadline).getTime() : -Infinity;
        const dateB = b.deadline ? new Date(b.deadline).getTime() : -Infinity;
        return dateB - dateA;
      });
    }
    // Nếu là 'default', giữ nguyên thứ tự nạp từ LocalStorage

    // Bước 4: Tính toán Phân trang (Pagination)
    state.totalFiltered = sorted.length;
    state.totalPages = Math.ceil(state.totalFiltered / state.pageSize) || 1;

    // Đảm bảo currentPage luôn nằm trong khoảng hợp lệ [1, totalPages]
    if (state.currentPage > state.totalPages) {
      state.currentPage = state.totalPages;
    }
    if (state.currentPage < 1) {
      state.currentPage = 1;
    }

    const startIndex = (state.currentPage - 1) * state.pageSize;
    const endIndex = startIndex + state.pageSize;
    const paginatedTasks = sorted.slice(startIndex, endIndex);

    // Bước 5: Cập nhật giao diện thanh công cụ & Phân trang (Người 3 phụ trách)
    updateResultsInfo(rawTasks.length, state.totalFiltered, startIndex, Math.min(endIndex, state.totalFiltered));
    renderPaginationUI();

    // Bước 6: Gọi hàm render của Người 2 theo đúng Data Contract
    dispatchRenderToNguoi2(paginatedTasks, state.totalFiltered);

    return paginatedTasks;
  }

  /* ------------------------------------------------------------------
     5. GIAO DIỆN PHÂN TRANG (PAGINATION UI)
     ------------------------------------------------------------------ */
  /**
   * Vẽ danh sách nút chuyển trang (Trang trước, Danh sách trang, Trang sau)
   */
  function renderPaginationUI() {
    if (!dom.paginationContainer) return;

    // Nếu không có dữ liệu hoặc chỉ có 1 trang và ít hơn pageSize, có thể ẩn hoặc disable
    if (state.totalFiltered === 0) {
      dom.paginationContainer.innerHTML = '';
      if (dom.paginationWrapper) dom.paginationWrapper.style.display = 'none';
      return;
    }

    if (dom.paginationWrapper) {
      dom.paginationWrapper.style.display = 'flex';
    }

    const { currentPage, totalPages } = state;
    let html = '';

    // Nút "Trang trước" (Prev)
    const isPrevDisabled = currentPage <= 1;
    html += `
      <li class="page-item ${isPrevDisabled ? 'disabled' : ''}">
        <button class="page-link" type="button" data-page="${currentPage - 1}" ${isPrevDisabled ? 'disabled tabindex="-1" aria-disabled="true"' : ''} aria-label="Trang trước">
          <span aria-hidden="true">&laquo;</span>
          <span class="d-none d-sm-inline ms-1">Trước</span>
        </button>
      </li>
    `;

    // Tính toán dải số trang hiển thị (thông minh khi số trang lớn)
    const pagesToShow = getPaginationRange(currentPage, totalPages);

    pagesToShow.forEach(page => {
      if (page === '...') {
        html += `
          <li class="page-item disabled">
            <span class="page-link">…</span>
          </li>
        `;
      } else {
        const isActive = page === currentPage;
        html += `
          <li class="page-item ${isActive ? 'active' : ''}" ${isActive ? 'aria-current="page"' : ''}>
            <button class="page-link" type="button" data-page="${page}">
              ${page}
            </button>
          </li>
        `;
      }
    });

    // Nút "Trang sau" (Next)
    const isNextDisabled = currentPage >= totalPages;
    html += `
      <li class="page-item ${isNextDisabled ? 'disabled' : ''}">
        <button class="page-link" type="button" data-page="${currentPage + 1}" ${isNextDisabled ? 'disabled tabindex="-1" aria-disabled="true"' : ''} aria-label="Trang sau">
          <span class="d-none d-sm-inline me-1">Sau</span>
          <span aria-hidden="true">&raquo;</span>
        </button>
      </li>
    `;

    dom.paginationContainer.innerHTML = html;

    // Bắt sự kiện click trên các nút phân trang
    const pageButtons = dom.paginationContainer.querySelectorAll('button[data-page]');
    pageButtons.forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        const targetPage = parseInt(this.getAttribute('data-page'), 10);
        if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= totalPages && targetPage !== currentPage) {
          goToPage(targetPage);
        }
      });
    });
  }

  /**
   * Tính toán dải số trang hiển thị gọn gàng (có dấu ...)
   * Ví dụ: [1, 2, 3, '...', 10]
   */
  function getPaginationRange(current, total) {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const delta = 1; // Số trang lân cận bên trái và phải của trang hiện tại
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
        range.push(i);
      }
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  }

  /**
   * Chuyển đến trang chỉ định
   * @param {number} pageNumber 
   */
  function goToPage(pageNumber) {
    state.currentPage = pageNumber;
    applyFilterAndSort();

    // Cuộn nhẹ lên đầu danh sách task để người dùng dễ theo dõi
    if (dom.taskListContainer) {
      dom.taskListContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /* ------------------------------------------------------------------
     6. CẬP NHẬT THÔNG BÁO SỐ LƯỢNG KẾT QUẢ
     ------------------------------------------------------------------ */
  /**
   * Cập nhật badge thống kê kết quả lọc realtime
   */
  function updateResultsInfo(totalAll, totalFiltered, startIndex, endIndex) {
    if (!dom.resultsInfo) return;

    if (totalAll === 0) {
      dom.resultsInfo.innerHTML = '<span class="text-muted">Chưa có công việc nào trong hệ thống.</span>';
      return;
    }

    if (totalFiltered === 0) {
      dom.resultsInfo.innerHTML = `
        <span class="badge bg-danger-subtle text-danger border border-danger-subtle">
          Không tìm thấy công việc nào phù hợp với bộ lọc
        </span>
      `;
      return;
    }

    const hasActiveFilters = Boolean(
      state.keyword || 
      state.status !== 'all' || 
      state.priority !== 'all' || 
      state.sortBy !== 'default'
    );

    const fromNum = startIndex + 1;
    const toNum = endIndex;

    let badgeClass = 'bg-light text-dark border';
    if (hasActiveFilters) {
      badgeClass = 'bg-primary-subtle text-primary border border-primary-subtle';
    }

    dom.resultsInfo.innerHTML = `
      <span class="badge ${badgeClass} px-3 py-2" style="font-size: 0.85rem; font-weight: 500;">
        Hiển thị <strong>${fromNum}-${toNum}</strong> trong tổng số <strong>${totalFiltered}</strong> công việc
        ${hasActiveFilters ? ` (đã lọc từ ${totalAll} việc)` : ''}
      </span>
    `;
  }

  /* ------------------------------------------------------------------
     7. TÍCH HỢP DATA CONTRACT: BÀN GIAO MẢNG CHO NGƯỜI 2 HIỂN THỊ
     ------------------------------------------------------------------ */
  /**
   * Gọi hàm renderTaskList của Người 2 hoặc kích hoạt Fallback Renderer
   * @param {Array} tasksToRender Mảng công việc sau lọc & phân trang
   * @param {number} totalFilteredCount Tổng số lượng sau lọc
   */
  function dispatchRenderToNguoi2(tasksToRender, totalFilteredCount) {
    // 1. Kiểm tra Người 2 đã định nghĩa hàm window.renderTaskList chưa
    if (typeof window.renderTaskList === 'function') {
      window.renderTaskList(tasksToRender);
    } else {
      // 2. Fallback Renderer: Hiển thị đẹp mắt để Người 3 tự kiểm thử và chạy độc lập
      renderTaskListFallback(tasksToRender, totalFilteredCount);
    }

    // Hiển thị hoặc ẩn Empty State
    if (dom.emptyStateContainer) {
      if (totalFilteredCount === 0) {
        dom.emptyStateContainer.style.display = 'block';
        if (dom.taskListContainer) dom.taskListContainer.style.display = 'none';
      } else {
        dom.emptyStateContainer.style.display = 'none';
        if (dom.taskListContainer) dom.taskListContainer.style.display = 'flex';
      }
    }
  }

  /**
   * Fallback Renderer của Người 3 (Đảm bảo trang tasks.html chạy mượt mà ngay cả khi Người 2 chưa code)
   */
  function renderTaskListFallback(tasks, totalFilteredCount) {
    if (!dom.taskListContainer) return;

    if (totalFilteredCount === 0) {
      dom.taskListContainer.innerHTML = '';
      return;
    }

    const priorityBadgeMap = {
      'High': '<span class="badge badge-priority-high">Cao</span>',
      'Medium': '<span class="badge badge-priority-medium">Trung bình</span>',
      'Low': '<span class="badge badge-priority-low">Thấp</span>'
    };

    const statusBadgeMap = {
      'Done': '<span class="badge badge-completed"><i class="fa-solid fa-check me-1"></i>Đã xong</span>',
      'Pending': '<span class="badge badge-pending"><i class="fa-regular fa-clock me-1"></i>Chờ làm</span>'
    };

    dom.taskListContainer.innerHTML = tasks.map(task => {
      const isDone = task.status === 'Done';
      const formattedDate = task.deadline || 'Chưa đặt hạn';

      return `
        <div class="card task-card ${isDone ? 'task-done' : ''}" data-task-id="${task.id}" style="border-left: 4px solid ${isDone ? 'var(--status-completed)' : 'var(--status-pending)'};">
          <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
            <div style="flex: 1; min-width: 250px;">
              <div class="d-flex align-items-center gap-2 mb-1 flex-wrap">
                <span class="badge bg-secondary-subtle text-secondary" style="font-family: monospace;">${task.id}</span>
                ${statusBadgeMap[task.status] || ''}
                ${priorityBadgeMap[task.priority] || ''}
                <span class="badge bg-light text-muted border">${task.category || 'Vận hành quán'}</span>
              </div>
              <h5 class="task-title mb-1 ${isDone ? 'text-decoration-line-through text-muted' : ''}" style="font-size: 1.1rem; font-weight: 600;">
                ${escapeHtml(task.title)}
              </h5>
              <p class="task-desc mb-2 text-secondary" style="font-size: 0.9rem; line-height: 1.5;">
                ${escapeHtml(task.description || '')}
              </p>
              <div class="d-flex align-items-center gap-3 text-muted" style="font-size: 0.85rem;">
                <span><i class="fa-regular fa-calendar me-1"></i>Hạn chót: <strong>${formattedDate}</strong></span>
              </div>
            </div>

            <!-- Nút thao tác nhanh -->
            <div class="d-flex gap-2 align-items-center">
              <button type="button" class="btn btn-sm ${isDone ? 'btn-outline' : 'btn-primary'} btn-toggle-status" data-task-id="${task.id}" title="${isDone ? 'Đánh dấu Chưa hoàn thành' : 'Đánh dấu Đã hoàn thành'}">
                <i class="fa-solid ${isDone ? 'fa-rotate-left' : 'fa-check'} me-1"></i>
                <span>${isDone ? 'Làm lại' : 'Hoàn thành'}</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Bắt sự kiện Toggle status cho các nút fallback
    const toggleBtns = dom.taskListContainer.querySelectorAll('.btn-toggle-status');
    toggleBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        const taskId = this.getAttribute('data-task-id');
        if (taskId && window.TaskService && typeof window.TaskService.toggleStatus === 'function') {
          window.TaskService.toggleStatus(taskId);
          if (typeof window.showToast === 'function') {
            window.showToast('Đã đổi trạng thái công việc!', 'info');
          }
        }
      });
    });
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /* ------------------------------------------------------------------
     8. RESET BỘ LỌC VỀ MẶC ĐỊNH
     ------------------------------------------------------------------ */
  /**
   * Đưa tất cả tiêu chí tìm kiếm, lọc, sắp xếp về trạng thái ban đầu
   */
  function resetFilters() {
    state.keyword = '';
    state.status = 'all';
    state.priority = 'all';
    state.sortBy = 'default';
    state.currentPage = 1;

    if (dom.searchInput) dom.searchInput.value = '';
    if (dom.statusSelect) dom.statusSelect.value = 'all';
    if (dom.prioritySelect) dom.prioritySelect.value = 'all';
    if (dom.sortSelect) dom.sortSelect.value = 'default';

    applyFilterAndSort();

    if (typeof window.showToast === 'function') {
      window.showToast('Đã đặt lại bộ lọc về mặc định.', 'info');
    }
  }

  /* ------------------------------------------------------------------
     9. GẮN SỰ KIỆN TƯƠNG TÁC (EVENT LISTENERS)
     ------------------------------------------------------------------ */
  function attachEventListeners() {
    // 9.1. Sự kiện Tìm kiếm: Realtime khi người dùng gõ phím
    if (dom.searchInput) {
      dom.searchInput.addEventListener('input', function () {
        state.currentPage = 1; // Luôn quay về trang 1 khi tìm kiếm mới
        applyFilterAndSort();
      });
    }

    // Nút xóa nhanh nội dung tìm kiếm
    if (dom.btnClearSearch) {
      dom.btnClearSearch.addEventListener('click', function () {
        if (dom.searchInput) {
          dom.searchInput.value = '';
          dom.searchInput.focus();
        }
        state.currentPage = 1;
        applyFilterAndSort();
      });
    }

    // 9.2. Sự kiện Lọc theo Trạng thái (Pending / Done)
    if (dom.statusSelect) {
      dom.statusSelect.addEventListener('change', function () {
        state.currentPage = 1; // Luôn quay về trang 1 khi lọc
        applyFilterAndSort();
      });
    }

    // 9.3. Sự kiện Lọc theo Độ ưu tiên (Low / Medium / High)
    if (dom.prioritySelect) {
      dom.prioritySelect.addEventListener('change', function () {
        state.currentPage = 1;
        applyFilterAndSort();
      });
    }

    // 9.4. Sự kiện Sắp xếp theo Deadline
    if (dom.sortSelect) {
      dom.sortSelect.addEventListener('change', function () {
        state.currentPage = 1;
        applyFilterAndSort();
      });
    }

    // 9.5. Sự kiện Thay đổi số lượng task trên 1 trang (Page size)
    if (dom.pageSizeSelect) {
      dom.pageSizeSelect.addEventListener('change', function () {
        state.pageSize = parseInt(this.value, 10) || 5;
        state.currentPage = 1;
        applyFilterAndSort();
      });
    }

    // 9.6. Sự kiện Nút Reset Filters
    if (dom.btnResetFilters) {
      dom.btnResetFilters.addEventListener('click', resetFilters);
    }

    // 9.7. Lắng nghe sự kiện đồng bộ dữ liệu từ TaskService ('tasks:changed')
    // Khi Người 2 Thêm/Sửa/Xóa hoặc Người 1 Clear All/Import/Export, bộ lọc tự chạy lại
    window.addEventListener('tasks:changed', function (event) {
      console.log('[Người 3] Nhận sự kiện tasks:changed:', event.detail);
      applyFilterAndSort();
    });
  }

  /* ------------------------------------------------------------------
     10. KHỞI CHẠY (INITIALIZATION)
     ------------------------------------------------------------------ */
  function init() {
    initDomReferences();
    attachEventListeners();

    // Chạy lọc và hiển thị lần đầu tiên
    applyFilterAndSort();
  }

  // Đảm bảo DOM sẵn sàng trước khi khởi tạo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ------------------------------------------------------------------
     11. XUẤT CÁC HÀM CÔNG KHAI RA ĐỐI TƯỢNG TOÀN CỤC (WINDOW)
     ------------------------------------------------------------------ */
  window.TaskFilter = {
    applyFilterAndSort: applyFilterAndSort,
    resetFilters: resetFilters,
    goToPage: goToPage,
    getState: function () { return { ...state }; },
    setState: function (newState) {
      Object.assign(state, newState);
      applyFilterAndSort();
    }
  };

  // Alias tương thích trực tiếp theo quy ước đề bài
  window.applyFilterAndSort = applyFilterAndSort;

})(window, document);
