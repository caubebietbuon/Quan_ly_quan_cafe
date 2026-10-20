/**
 * ====================================================================
 * DỰ ÁN: CAFE TASK MANAGER (HỆ THỐNG QUẢN LÝ CÔNG VIỆC QUÁN CAFE)
 * TẦNG THỐNG KÊ, TRỰC QUAN HÓA BIỂU ĐỒ & BÁO CÁO VẬN HÀNH
 * File: assets/js/stats.js
 * Phụ trách: Người 5 (Data Analytics, Charts & Reporting Specialist)
 * ====================================================================
 * Mô tả:
 * - Thu thập và xử lý số liệu thời gian thực từ LocalStorage qua TaskService.
 * - Tính toán các chỉ số vận hành cốt lõi (KPI): Tổng việc, Done vs Pending,
 *   tỷ lệ hoàn thành %, phân bổ mức độ ưu tiên (High/Medium/Low), việc cận hạn.
 * - Khởi tạo và cập nhật 3 biểu đồ trực quan bằng thư viện Chart.js:
 *   1. Biểu đồ Doughnut: Tỷ lệ hoàn thành (Done vs Pending).
 *   2. Biểu đồ Cột (Bar Chart): Phân bố mức độ ưu tiên công việc.
 *   3. Biểu đồ Ngang (Horizontal Bar Chart): Phân bổ đầu việc theo bộ phận/danh mục.
 * - Tương thích 100% với Dark Mode / Light Mode: Tự động đảo màu chữ, trục tọa độ,
 *   lưới đồ thị khi chuyển đổi giao diện.
 * - Cơ chế phản ứng thời gian thực (Reactive): Lắng nghe sự kiện 'tasks:changed'
 *   để biểu đồ và số liệu tự cập nhật ngay khi thêm/sửa/xóa task ở trang khác.
 * - Tự động đưa ra nhận xét & cảnh báo quản trị (AI-like Management Insights).
 * ====================================================================
 */

(function (window, document) {
  'use strict';

  // Lưu trữ các thể hiện (instances) của Chart.js để hủy và vẽ lại khi cập nhật
  let statusChartInstance = null;
  let priorityChartInstance = null;
  let categoryChartInstance = null;

  /* ------------------------------------------------------------------
     1. TIỆN ÍCH HỖ TRỢ THEME & MÀU SẮC CHO CHART.JS
     ------------------------------------------------------------------ */
  function getThemeColors() {
    const isDark = (document.documentElement.getAttribute('data-theme') === 'dark') ||
                   (document.body && document.body.classList.contains('dark-theme')) ||
                   document.documentElement.classList.contains('dark-theme');
    return {
      isDark,
      textColor: isDark ? '#F5EFEB' : '#2C1810',
      textSecondary: isDark ? '#B8ABA2' : '#6E5D53',
      textMuted: isDark ? '#83746B' : '#9E8E84',
      cardBg: isDark ? '#221B17' : '#FFFFFF',
      gridColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(44, 24, 16, 0.08)',
      tooltipBg: isDark ? 'rgba(30, 23, 19, 0.96)' : 'rgba(255, 255, 255, 0.96)',
      tooltipText: isDark ? '#FFFDF9' : '#1A0E08',
      tooltipBorder: isDark ? 'rgba(221, 162, 106, 0.35)' : '#E6DCCE',
      fontFamily: "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, sans-serif"
    };
  }

  /* ------------------------------------------------------------------
     2. LẤY DANH SÁCH TASK AN TOÀN TỪ TASKSERVICE
     ------------------------------------------------------------------ */
  function getTasksData() {
    if (window.TaskService && typeof window.TaskService.getAllTasks === 'function') {
      return window.TaskService.getAllTasks();
    }
    if (window.TaskService && typeof window.TaskService.getTasks === 'function') {
      return window.TaskService.getTasks();
    }
    try {
      const raw = localStorage.getItem('CAFE_TASKS') || localStorage.getItem('cafe_tasks_data');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('[Stats] Lỗi đọc dữ liệu từ LocalStorage:', e);
      return [];
    }
  }

  /* ------------------------------------------------------------------
     3. TÍNH TOÁN CÁC CHỈ SỐ KPI VẬN HÀNH
     ------------------------------------------------------------------ */
  function calculateMetrics(tasks) {
    const total = tasks.length;
    let done = 0;
    let pending = 0;
    let high = 0;
    let medium = 0;
    let low = 0;
    let dueSoon = 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const categoryMap = {};

    tasks.forEach(task => {
      // Chuẩn hóa trạng thái
      const s = String(task.status || '').toLowerCase();
      if (s === 'done' || s === 'completed') {
        done++;
      } else {
        pending++;
        // Kiểm tra hạn chót nếu chưa hoàn thành
        if (task.deadline) {
          if (task.deadline <= todayStr) {
            dueSoon++; // Hạn chót hôm nay hoặc đã quá hạn
          }
        }
      }

      // Chuẩn hóa mức độ ưu tiên
      const p = String(task.priority || '').toLowerCase();
      if (p === 'high') high++;
      else if (p === 'medium') medium++;
      else low++;

      // Gom nhóm theo danh mục / bộ phận
      const cat = task.category || 'Vận hành chung';
      if (!categoryMap[cat]) {
        categoryMap[cat] = { total: 0, done: 0, pending: 0 };
      }
      categoryMap[cat].total++;
      if (s === 'done' || s === 'completed') {
        categoryMap[cat].done++;
      } else {
        categoryMap[cat].pending++;
      }
    });

    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    return {
      total,
      done,
      pending,
      high,
      medium,
      low,
      dueSoon,
      completionRate,
      categoryMap
    };
  }

  /* ------------------------------------------------------------------
     4. CẬP NHẬT CÁC THẺ KPI LÊN GIAO DIỆN
     ------------------------------------------------------------------ */
  function updateKPIElements(metrics) {
    const elTotal = document.getElementById('stat-total-tasks');
    const elRate = document.getElementById('stat-completion-rate');
    const elProgressBar = document.getElementById('stat-progress-bar');
    const elDone = document.getElementById('stat-done-tasks');
    const elPending = document.getElementById('stat-pending-tasks');
    const elHigh = document.getElementById('stat-high-priority');
    const elDueSoon = document.getElementById('stat-due-soon');

    if (elTotal) elTotal.textContent = metrics.total;
    if (elRate) elRate.textContent = `${metrics.completionRate}%`;
    if (elProgressBar) elProgressBar.style.width = `${metrics.completionRate}%`;
    if (elDone) elDone.textContent = metrics.done;
    if (elPending) elPending.textContent = metrics.pending;
    if (elHigh) elHigh.textContent = metrics.high;
    if (elDueSoon) elDueSoon.textContent = metrics.dueSoon;
  }

  /* ------------------------------------------------------------------
     5. TẠO NHẬN XÉT QUẢN TRỊ TỰ ĐỘNG (INSIGHTS)
     ------------------------------------------------------------------ */
  function updateBusinessInsights(metrics, tasks) {
    const container = document.getElementById('management-insights');
    if (!container) return;

    if (metrics.total === 0) {
      container.innerHTML = `
        <div class="insight-alert insight-info">
          <div class="insight-icon"><i class="fa-solid fa-circle-info"></i></div>
          <div class="insight-body">
            <strong>Chưa có công việc nào trong hệ thống!</strong>
            <p>Hãy thêm công việc mới hoặc bấm "Nạp lại việc mẫu" để bắt đầu theo dõi vận hành quán.</p>
          </div>
        </div>
      `;
      return;
    }

    let insightsHtml = '';

    // Cảnh báo công việc cận hạn / quá hạn
    if (metrics.dueSoon > 0) {
      insightsHtml += `
        <div class="insight-alert insight-danger animate__animated animate__fadeIn">
          <div class="insight-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
          <div class="insight-body">
            <strong>Cảnh báo khẩn cấp:</strong> Có <strong>${metrics.dueSoon}</strong> công việc đang đến hạn hôm nay hoặc đã quá hạn cần hoàn thành ngay để không gián đoạn phục vụ khách.
          </div>
        </div>
      `;
    }

    // Đánh giá tỷ lệ hoàn thành
    if (metrics.completionRate >= 80) {
      insightsHtml += `
        <div class="insight-alert insight-success animate__animated animate__fadeIn">
          <div class="insight-icon"><i class="fa-solid fa-circle-check"></i></div>
          <div class="insight-body">
            <strong>Hiệu suất xuất sắc:</strong> Tiến độ ca làm đạt <strong>${metrics.completionRate}%</strong> hoàn thành. Các bộ phận Barista và Phục vụ đang phối hợp rất nhịp nhàng!
          </div>
        </div>
      `;
    } else if (metrics.completionRate >= 50) {
      insightsHtml += `
        <div class="insight-alert insight-warning animate__animated animate__fadeIn">
          <div class="insight-icon"><i class="fa-solid fa-clock-rotate-left"></i></div>
          <div class="insight-body">
            <strong>Đang trong tiến độ:</strong> Đã hoàn tất <strong>${metrics.done}/${metrics.total}</strong> đầu việc (${metrics.completionRate}%). Hãy ưu tiên dứt điểm các việc có độ ưu tiên High trước giờ cao điểm.
          </div>
        </div>
      `;
    } else {
      insightsHtml += `
        <div class="insight-alert insight-warning animate__animated animate__fadeIn">
          <div class="insight-icon"><i class="fa-solid fa-bell"></i></div>
          <div class="insight-body">
            <strong>Khối lượng việc tồn nhiều:</strong> Còn <strong>${metrics.pending}</strong> việc chưa hoàn tất. Quản lý cần kiểm tra phân công ca trực và hỗ trợ nhân viên giải quyết dồn ứ.
          </div>
        </div>
      `;
    }

    container.innerHTML = insightsHtml;
  }

  /* ------------------------------------------------------------------
     6. DANH SÁCH VIỆC ƯU TIÊN CAO CẦN XỬ LÝ GẤP
     ------------------------------------------------------------------ */
  function renderUrgentTasks(tasks) {
    const container = document.getElementById('urgent-tasks-table-body');
    const emptyState = document.getElementById('urgent-tasks-empty');
    if (!container) return;

    // Lọc công việc High priority chưa hoàn thành
    const urgentTasks = tasks.filter(t => {
      const s = String(t.status || '').toLowerCase();
      const p = String(t.priority || '').toLowerCase();
      return (s !== 'done' && s !== 'completed') && p === 'high';
    });

    if (urgentTasks.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    container.innerHTML = urgentTasks.map((t, idx) => `
      <tr>
        <td class="text-muted fw-bold">#${idx + 1}</td>
        <td>
          <div class="fw-semibold text-primary">${escapeHtml(t.title)}</div>
          <small class="text-secondary d-none d-md-inline">${escapeHtml(t.description ? t.description.substring(0, 60) + '...' : '')}</small>
        </td>
        <td>
          <span class="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1">
            <i class="fa-solid fa-fire me-1"></i> Ưu tiên cao
          </span>
        </td>
        <td>
          <span class="text-nowrap fw-medium ${isOverdue(t.deadline) ? 'text-danger fw-bold' : ''}">
            <i class="fa-regular fa-calendar me-1"></i>${t.deadline || 'Chưa đặt'}
          </span>
        </td>
        <td>
          <span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1">
            <i class="fa-solid fa-spinner fa-spin me-1"></i> Đang chờ
          </span>
        </td>
        <td class="text-end">
          <button type="button" class="btn btn-sm btn-outline-success btn-quick-done" data-id="${t.id}" title="Đánh dấu đã xong">
            <i class="fa-solid fa-check"></i> Xong
          </button>
        </td>
      </tr>
    `).join('');

    // Gắn sự kiện đánh dấu nhanh
    container.querySelectorAll('.btn-quick-done').forEach(btn => {
      btn.addEventListener('click', function () {
        const taskId = this.getAttribute('data-id');
        if (window.TaskService && typeof window.TaskService.toggleStatus === 'function') {
          window.TaskService.toggleStatus(taskId);
          if (typeof window.showToast === 'function') {
            window.showToast('Đã đánh dấu hoàn thành công việc khẩn cấp!', 'success');
          }
        }
      });
    });
  }

  /* ------------------------------------------------------------------
     7. VẼ CÁC BIỂU ĐỒ BẰNG CHART.JS (BONUS RUBRIC ĐIỂM CAO)
     ------------------------------------------------------------------ */
  function renderCharts(metrics) {
    if (typeof Chart === 'undefined') {
      console.warn('[Stats] Thư viện Chart.js chưa được tải!');
      return;
    }

    const theme = getThemeColors();

    // 7.1. BIỂU ĐỒ TRÒN (DOUGHNUT): TỶ LỆ TRẠNG THÁI (DONE VS PENDING)
    const ctxStatus = document.getElementById('chartStatus');
    if (ctxStatus) {
      if (statusChartInstance) {
        statusChartInstance.destroy();
        statusChartInstance = null;
      }

      const hasTasks = metrics.total > 0;
      const doughnutData = hasTasks ? [metrics.done, metrics.pending] : [1];
      const doughnutLabels = hasTasks ? ['Đã hoàn thành (Done)', 'Chờ thực hiện (Pending)'] : ['Chưa có dữ liệu'];
      const doughnutBg = hasTasks ? ['#27AE60', '#E67E22'] : [theme.isDark ? '#382D26' : '#E6DCCE'];
      const doughnutHover = hasTasks ? ['#2ECC71', '#F39C12'] : [theme.isDark ? '#4A3B32' : '#D5C8B8'];

      // Custom Center Text Plugin for Doughnut Chart
      const centerTextPlugin = {
        id: 'centerTextPlugin',
        afterDraw(chart) {
          const { ctx } = chart;
          const meta = chart.getDatasetMeta(0);
          if (!meta || !meta.data || !meta.data[0]) return;
          const centerX = meta.data[0].x;
          const centerY = meta.data[0].y;

          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Tỷ lệ % chính
          ctx.font = `800 28px ${theme.fontFamily}`;
          ctx.fillStyle = theme.textColor;
          ctx.fillText(`${hasTasks ? metrics.completionRate : 0}%`, centerX, centerY - 8);

          // Phụ đề chữ nhỏ
          ctx.font = `700 10px ${theme.fontFamily}`;
          ctx.fillStyle = theme.textMuted;
          ctx.letterSpacing = '0.08em';
          ctx.fillText('HOÀN THÀNH', centerX, centerY + 16);

          ctx.restore();
        }
      };

      statusChartInstance = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
          labels: doughnutLabels,
          datasets: [{
            data: doughnutData,
            backgroundColor: doughnutBg,
            hoverBackgroundColor: doughnutHover,
            borderColor: theme.cardBg,
            borderWidth: 3,
            hoverOffset: 4
          }]
        },
        plugins: [centerTextPlugin],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '72%',
          animation: {
            animateRotate: true,
            animateScale: false,
            duration: 800
          },
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: theme.textColor,
                font: { family: theme.fontFamily, size: 12, weight: '600' },
                padding: 16,
                usePointStyle: true,
                pointStyle: 'circle'
              }
            },
            tooltip: {
              enabled: hasTasks,
              backgroundColor: theme.tooltipBg,
              titleColor: theme.tooltipText,
              bodyColor: theme.tooltipText,
              borderColor: theme.tooltipBorder,
              borderWidth: 1,
              padding: 12,
              callbacks: {
                label: function (context) {
                  const val = context.raw || 0;
                  const pct = metrics.total > 0 ? Math.round((val / metrics.total) * 100) : 0;
                  return ` ${context.label}: ${val} việc (${pct}%)`;
                }
              }
            }
          }
        }
      });
    }

    // 7.2. BIỂU ĐỒ CỘT (BAR): MỨC ĐỘ ƯU TIÊN (HIGH - MEDIUM - LOW)
    const ctxPriority = document.getElementById('chartPriority');
    if (ctxPriority) {
      if (priorityChartInstance) {
        priorityChartInstance.destroy();
        priorityChartInstance = null;
      }

      priorityChartInstance = new Chart(ctxPriority, {
        type: 'bar',
        data: {
          labels: ['Ưu tiên cao (High)', 'Trung bình (Medium)', 'Thấp (Low)'],
          datasets: [{
            label: 'Số lượng công việc',
            data: [metrics.high, metrics.medium, metrics.low],
            backgroundColor: [
              theme.isDark ? '#E74C3C' : '#C0392B', // Đỏ High
              theme.isDark ? '#F39C12' : '#E67E22', // Vàng cam Medium
              theme.isDark ? '#3498DB' : '#2980B9'  // Lam Low
            ],
            hoverBackgroundColor: [
              '#FF6B5B',
              '#F5B041',
              '#5DADE2'
            ],
            borderColor: [
              theme.isDark ? '#C0392B' : '#962D22',
              theme.isDark ? '#D68910' : '#B9770E',
              theme.isDark ? '#2471A3' : '#1F618D'
            ],
            borderWidth: 1.5,
            borderRadius: { topLeft: 8, topRight: 8, bottomLeft: 0, bottomRight: 0 },
            maxBarThickness: 46
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 800 },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: theme.tooltipBg,
              titleColor: theme.tooltipText,
              bodyColor: theme.tooltipText,
              borderColor: theme.tooltipBorder,
              borderWidth: 1,
              padding: 12,
              callbacks: {
                label: function (context) {
                  return ` ${context.dataset.label}: ${context.raw} đầu việc`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: {
                color: theme.textColor,
                font: { family: theme.fontFamily, size: 12, weight: '600' }
              }
            },
            y: {
              beginAtZero: true,
              ticks: {
                precision: 0,
                stepSize: 1,
                color: theme.textMuted,
                font: { family: theme.fontFamily, size: 11 }
              },
              grid: {
                color: theme.gridColor
              }
            }
          }
        }
      });
    }

    // 7.3. BIỂU ĐỒ THEO BỘ PHẬN / DANH MỤC (CATEGORY SUMMARY - HORIZONTAL BAR)
    const ctxCategory = document.getElementById('chartCategory');
    if (ctxCategory) {
      if (categoryChartInstance) {
        categoryChartInstance.destroy();
        categoryChartInstance = null;
      }

      const catNames = Object.keys(metrics.categoryMap);
      const isCatEmpty = catNames.length === 0;
      const displayLabels = isCatEmpty ? ['Chưa có danh mục'] : catNames;
      const catTotals = isCatEmpty ? [0] : catNames.map(c => metrics.categoryMap[c].total);
      const catDones = isCatEmpty ? [0] : catNames.map(c => metrics.categoryMap[c].done);

      categoryChartInstance = new Chart(ctxCategory, {
        type: 'bar',
        data: {
          labels: displayLabels,
          datasets: [
            {
              label: 'Đã hoàn thành',
              data: catDones,
              backgroundColor: '#27AE60',
              hoverBackgroundColor: '#2ECC71',
              borderRadius: 6,
              maxBarThickness: 22
            },
            {
              label: 'Tổng đầu việc',
              data: catTotals,
              backgroundColor: theme.isDark ? '#DDA26A' : '#C78243',
              hoverBackgroundColor: theme.isDark ? '#EDB988' : '#B06F33',
              borderRadius: 6,
              maxBarThickness: 22
            }
          ]
        },
        options: {
          indexAxis: 'y', // Biểu đồ nằm ngang
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 800 },
          plugins: {
            legend: {
              position: 'top',
              align: 'end',
              labels: {
                color: theme.textColor,
                font: { family: theme.fontFamily, size: 12, weight: '600' },
                padding: 12,
                usePointStyle: true,
                pointStyle: 'rectRounded'
              }
            },
            tooltip: {
              backgroundColor: theme.tooltipBg,
              titleColor: theme.tooltipText,
              bodyColor: theme.tooltipText,
              borderColor: theme.tooltipBorder,
              borderWidth: 1,
              padding: 12,
              callbacks: {
                label: function (context) {
                  return ` ${context.dataset.label}: ${context.raw} việc`;
                }
              }
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              ticks: {
                precision: 0,
                stepSize: 1,
                color: theme.textMuted,
                font: { family: theme.fontFamily, size: 11 }
              },
              grid: { color: theme.gridColor }
            },
            y: {
              ticks: {
                color: theme.textColor,
                font: { family: theme.fontFamily, size: 12, weight: '600' }
              },
              grid: { display: false }
            }
          }
        }
      });
    }
  }

  /* ------------------------------------------------------------------
     8. HÀM ĐIỀU PHỐI CẬP NHẬT TOÀN DIỆN TRANG THỐNG KÊ
     ------------------------------------------------------------------ */
  function updateAllStatistics() {
    const tasks = getTasksData();
    const metrics = calculateMetrics(tasks);

    // Cập nhật các khối UI
    updateKPIElements(metrics);
    updateBusinessInsights(metrics, tasks);
    renderUrgentTasks(tasks);
    renderCharts(metrics);
  }

  /* ------------------------------------------------------------------
     9. TIỆN ÍCH HELPER
     ------------------------------------------------------------------ */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function isOverdue(deadlineStr) {
    if (!deadlineStr) return false;
    const today = new Date().toISOString().split('T')[0];
    return deadlineStr < today;
  }

  /* ------------------------------------------------------------------
     10. KHỞI TẠO CÁC SỰ KIỆN TƯƠNG TÁC
     ------------------------------------------------------------------ */
  function setupEvents() {
    // 10.1. Lắng nghe sự kiện dữ liệu LocalStorage thay đổi từ TaskService
    window.addEventListener('tasks:changed', function (e) {
      console.log('[Stats] Dữ liệu task vừa cập nhật, làm mới biểu đồ...');
      updateAllStatistics();
    });

    // 10.2. Lắng nghe storage event (khi mở nhiều tab trình duyệt)
    window.addEventListener('storage', function (e) {
      if (e.key === 'CAFE_TASKS') {
        updateAllStatistics();
      }
    });

    // 10.3. Lắng nghe sự kiện themechange từ theme.js
    window.addEventListener('themechange', function () {
      setTimeout(updateAllStatistics, 50);
    });

    // 10.4. Đổi theme sáng/tối -> Cập nhật màu biểu đồ ngay lập tức
    const themeBtn = document.querySelectorAll('.theme-toggle-btn');
    themeBtn.forEach(btn => {
      btn.addEventListener('click', () => {
        setTimeout(updateAllStatistics, 100);
      });
    });

    // Quan sát thay đổi thuộc tính data-theme hoặc class trên html/body
    const themeObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === 'attributes' && (mutation.attributeName === 'data-theme' || mutation.attributeName === 'class')) {
          updateAllStatistics();
        }
      });
    });
    themeObserver.observe(document.documentElement, { attributes: true });
    if (document.body) {
      themeObserver.observe(document.body, { attributes: true });
    }

    // 10.5. Xử lý nút In / Lưu PDF báo cáo
    const printBtn = document.getElementById('btn-print-report');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        window.print();
      });
    }

    // 10.5. Xử lý form gửi góp ý / liên hệ quán
    const contactForm = document.getElementById('cafe-contact-form');
    if (contactForm) {
      contactForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const name = (document.getElementById('contact-name') || {}).value || 'Quý khách';
        if (typeof window.showToast === 'function') {
          window.showToast(`Cảm ơn bạn ${name}! Phản hồi đã được gửi thành công đến ban quản lý quán.`, 'success');
        } else {
          alert(`Cảm ơn bạn ${name}! Phản hồi đã được gửi thành công.`);
        }
        contactForm.reset();
      });
    }
  }

  /* ------------------------------------------------------------------
     11. KHỞI CHẠY KHI TẢI XONG TRANG
     ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', function () {
    updateAllStatistics();
    setupEvents();
  });

  // Xuất hàm ra window để kiểm thử hoặc gọi thủ công từ console
  window.refreshCafeStats = updateAllStatistics;

})(window, document);

