/**
 * ====================================================================
 * DỰ ÁN: CAFE TASK MANAGER (HỆ THỐNG QUẢN LÝ CÔNG VIỆC QUÁN CAFE)
 * TẦNG DỮ LIỆU LOCALSTORAGE & QUẢN LÝ CÔNG VIỆC
 * File: assets/js/taskService.js
 * Phụ trách: Người 1 (Leader / Frontend & System Core)
 * ====================================================================
 * Mô tả:
 * - Module độc lập quản lý CRUD công việc quán Cafe trên LocalStorage.
 * - Tự động tạo 5 công việc mẫu khi sử dụng lần đầu tiên.
 * - Phân biệt rõ giữa lần đầu truy cập và trạng thái người dùng chủ động Clear All.
 * - Xử lý an toàn Export JSON & Import JSON với kiểm tra cấu trúc dữ liệu.
 * - Phát sự kiện 'tasks:changed' để các trang và thành phần cập nhật phản ứng.
 * ====================================================================
 */

(function (window) {
  'use strict';

  // Khóa lưu trữ LocalStorage riêng biệt (không ảnh hưởng theme hoặc dữ liệu khác)
  const STORAGE_KEY = 'cafe_tasks_data';
  const INIT_FLAG_KEY = 'cafe_tasks_initialized';

  // 5 công việc mẫu ban đầu liên quan đến hoạt động vận hành quán Cafe
  const DEFAULT_TASKS = [
    {
      id: 'task_default_1',
      title: 'Kiểm tra nguyên liệu cà phê và sữa',
      description: 'Kiểm tra hạn sử dụng, số lượng hạt Robusta/Arabica trong kho và lượng sữa đặc, sữa tươi thanh trùng cho ca làm việc.',
      status: 'completed',
      priority: 'high',
      category: 'Kho & Nguyên liệu',
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'task_default_2',
      title: 'Vệ sinh máy pha cà phê',
      description: 'Chạy chu trình rửa họng pha (backflush) bằng thuốc vệ sinh máy chuyên dụng, lau sạch vòi đánh sữa steam wand.',
      status: 'in-progress',
      priority: 'high',
      category: 'Kỹ thuật & Máy móc',
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 1).toISOString()
    },
    {
      id: 'task_default_3',
      title: 'Chuẩn bị trà và topping',
      description: 'Ủ cốt trà đen, trà nhài và nấu mẻ trân châu đường đen, chuẩn bị thạch phô mai tươi cho ca chiều.',
      status: 'pending',
      priority: 'medium',
      category: 'Pha chế',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'task_default_4',
      title: 'Kiểm tra vệ sinh khu vực phục vụ',
      description: 'Lau dọn bàn ghế khách ngồi, bổ sung khăn giấy, menu tại bàn và kiểm tra độ sạch của sàn quán.',
      status: 'completed',
      priority: 'medium',
      category: 'Phục vụ',
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 3).toISOString()
    },
    {
      id: 'task_default_5',
      title: 'Kiểm kê ly và dụng cụ pha chế',
      description: 'Rà soát số lượng ly mang về (take-away), ống hút giấy, quai xách và nắp đậy trong quầy bar.',
      status: 'pending',
      priority: 'low',
      category: 'Quầy bar',
      createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 1).toISOString()
    }
  ];

  /**
   * Tạo định danh (ID) duy nhất cho công việc
   */
  function generateId() {
    return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }

  /**
   * Kiểm tra khả năng hoạt động của LocalStorage
   */
  function isStorageAvailable() {
    try {
      const test = '__storage_test__';
      window.localStorage.setItem(test, test);
      window.localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.error('[TaskService] LocalStorage không khả dụng:', e);
      return false;
    }
  }

  /**
   * Phát Custom Event thông báo dữ liệu thay đổi
   */
  function emitChange(action, tasks) {
    try {
      const event = new CustomEvent('tasks:changed', {
        detail: { action: action, tasks: tasks || [] }
      });
      window.dispatchEvent(event);
    } catch (e) {
      console.warn('[TaskService] Không thể phát sự kiện tasks:changed:', e);
    }
  }

  /* ------------------------------------------------------------------
     MODULE TASK SERVICE
     ------------------------------------------------------------------ */
  const TaskService = {
    /**
     * Khởi tạo dữ liệu ban đầu: Tự động nạp 5 công việc mẫu nếu là lần đầu chạy ứng dụng.
     * Nếu người dùng đã chủ động Clear All thì không tự ý nạp lại khi tải lại trang!
     */
    init: function () {
      if (!isStorageAvailable()) return;

      const isInitialized = window.localStorage.getItem(INIT_FLAG_KEY);
      const existingData = window.localStorage.getItem(STORAGE_KEY);

      // Chỉ khởi tạo 5 task mẫu nếu chưa từng khởi tạo ứng dụng trước đó
      if (!isInitialized && !existingData) {
        this.saveTasks(DEFAULT_TASKS, false);
        window.localStorage.setItem(INIT_FLAG_KEY, 'true');
        emitChange('init', DEFAULT_TASKS);
      }
    },

    /**
     * Lấy toàn bộ danh sách công việc từ LocalStorage
     * @returns {Array} Mảng các object công việc
     */
    getTasks: function () {
      if (!isStorageAvailable()) return [];

      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];

        const tasks = JSON.parse(raw);
        if (!Array.isArray(tasks)) {
          console.warn('[TaskService] Dữ liệu trong LocalStorage không phải là mảng. Khôi phục về mảng rỗng.');
          return [];
        }
        return tasks;
      } catch (err) {
        console.error('[TaskService] Lỗi phân tích JSON từ LocalStorage:', err);
        return [];
      }
    },

    /**
     * Lấy chi tiết một công việc theo ID
     * @param {string} id 
     * @returns {Object|null}
     */
    getTaskById: function (id) {
      if (!id) return null;
      const tasks = this.getTasks();
      return tasks.find(t => t.id === id) || null;
    },

    /**
     * Lưu mảng công việc vào LocalStorage
     * @param {Array} tasks Mảng công việc cần ghi
     * @param {boolean} triggerEvent Có phát sự kiện thay đổi hay không (mặc định: true)
     * @returns {boolean} Thành công hay thất bại
     */
    saveTasks: function (tasks, triggerEvent = true) {
      if (!isStorageAvailable()) return false;

      if (!Array.isArray(tasks)) {
        console.error('[TaskService] saveTasks yêu cầu tham số là một mảng!');
        return false;
      }

      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        // Đánh dấu hệ thống đã từng được khởi tạo
        window.localStorage.setItem(INIT_FLAG_KEY, 'true');

        if (triggerEvent) {
          emitChange('save', tasks);
        }
        return true;
      } catch (err) {
        console.error('[TaskService] Lỗi khi ghi dữ liệu vào LocalStorage:', err);
        return false;
      }
    },

    /**
     * Thêm một công việc mới
     * @param {Object} taskData { title, description, status, priority, category }
     * @returns {Object|null} Công việc vừa được tạo kèm ID và thời gian
     */
    addTask: function (taskData) {
      if (!taskData || !taskData.title || typeof taskData.title !== 'string' || taskData.title.trim() === '') {
        console.error('[TaskService] addTask thất bại: Tiêu đề công việc là bắt buộc!');
        return null;
      }

      const tasks = this.getTasks();
      const now = new Date().toISOString();

      const newTask = {
        id: taskData.id && !tasks.some(t => t.id === taskData.id) ? taskData.id : generateId(),
        title: taskData.title.trim(),
        description: (taskData.description || '').trim(),
        status: ['pending', 'in-progress', 'completed'].includes(taskData.status) ? taskData.status : 'pending',
        priority: ['low', 'medium', 'high'].includes(taskData.priority) ? taskData.priority : 'medium',
        category: (taskData.category || 'Chung').trim(),
        createdAt: taskData.createdAt || now,
        updatedAt: now
      };

      tasks.unshift(newTask); // Đưa công việc mới lên đầu danh sách
      const success = this.saveTasks(tasks);
      if (success) {
        emitChange('add', tasks);
        return newTask;
      }
      return null;
    },

    /**
     * Cập nhật thông tin công việc theo ID
     * @param {string} id 
     * @param {Object} updateData 
     * @returns {Object|null}
     */
    updateTask: function (id, updateData) {
      if (!id || !updateData) return null;

      const tasks = this.getTasks();
      const index = tasks.findIndex(t => t.id === id);

      if (index === -1) {
        console.warn(`[TaskService] Không tìm thấy công việc với ID: ${id}`);
        return null;
      }

      const current = tasks[index];
      const updated = {
        ...current,
        title: updateData.title !== undefined ? String(updateData.title).trim() : current.title,
        description: updateData.description !== undefined ? String(updateData.description).trim() : current.description,
        status: ['pending', 'in-progress', 'completed'].includes(updateData.status) ? updateData.status : current.status,
        priority: ['low', 'medium', 'high'].includes(updateData.priority) ? updateData.priority : current.priority,
        category: updateData.category !== undefined ? String(updateData.category).trim() : current.category,
        updatedAt: new Date().toISOString()
      };

      tasks[index] = updated;
      const success = this.saveTasks(tasks);
      if (success) {
        emitChange('update', tasks);
        return updated;
      }
      return null;
    },

    /**
     * Xóa một công việc theo ID
     * @param {string} id 
     * @returns {boolean}
     */
    deleteTask: function (id) {
      if (!id) return false;

      const tasks = this.getTasks();
      const filtered = tasks.filter(t => t.id !== id);

      if (filtered.length === tasks.length) {
        return false; // Không tìm thấy để xóa
      }

      const success = this.saveTasks(filtered);
      if (success) {
        emitChange('delete', filtered);
        return true;
      }
      return false;
    },

    /**
     * Xóa toàn bộ công việc (Clear All).
     * Chỉ xóa dữ liệu công việc trong phạm vi ứng dụng, tuyệt đối không dùng localStorage.clear()
     * để bảo vệ theme và các thiết lập khác.
     * Đảm bảo sau khi xóa, tải lại trang sẽ KHÔNG tự động tạo lại 5 công việc mẫu!
     * @returns {boolean}
     */
    clearAllTasks: function () {
      if (!isStorageAvailable()) return false;

      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
        window.localStorage.setItem(INIT_FLAG_KEY, 'true'); // Giữ nguyên cờ đã khởi tạo
        emitChange('clear', []);
        return true;
      } catch (err) {
        console.error('[TaskService] Lỗi khi Clear All:', err);
        return false;
      }
    },

    /**
     * Khởi tạo lại dữ liệu mẫu một cách chủ động (phục vụ nút Reset Demo nếu cần)
     */
    resetDefaultTasks: function () {
      this.saveTasks(DEFAULT_TASKS);
      window.localStorage.setItem(INIT_FLAG_KEY, 'true');
      emitChange('reset', DEFAULT_TASKS);
      return DEFAULT_TASKS;
    },

    /**
     * Xuất toàn bộ dữ liệu công việc ra file JSON tải về máy tính
     * @returns {Object} { success: boolean, count: number, filename: string }
     */
    exportJSON: function () {
      try {
        const tasks = this.getTasks();
        const exportData = {
          app: 'CafeTaskManager',
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          totalTasks: tasks.length,
          tasks: tasks
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
        
        // Đặt tên file theo định dạng chuẩn dễ nhận biết: cafe-tasks-YYYY-MM-DD.json
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `cafe-tasks-export-${dateStr}.json`;

        // Kích hoạt tải về trên trình duyệt nếu có document
        if (typeof document !== 'undefined' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
          const link = document.createElement('a');
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          link.setAttribute('download', filename);
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }

        return { success: true, count: tasks.length, filename: filename };
      } catch (err) {
        console.error('[TaskService] Lỗi Export JSON:', err);
        return { success: false, error: err.message };
      }
    },

    /**
     * Nhập dữ liệu từ file JSON máy tính người dùng.
     * Kiểm tra cấu trúc nghiêm ngặt trước khi ghi để bảo vệ dữ liệu hiện có!
     * @param {File} file Đối tượng File nhận từ thẻ <input type="file">
     * @returns {Promise<Object>} Trả về Promise chứa kết quả hoặc báo lỗi
     */
    importJSON: function (file) {
      return new Promise((resolve, reject) => {
        if (!file) {
          return reject(new Error('Vui lòng chọn một file JSON hợp lệ!'));
        }

        if (!file.name.endsWith('.json') && file.type !== 'application/json') {
          return reject(new Error('Định dạng tệp không hợp lệ! Vui lòng chọn tệp .json'));
        }

        const reader = new FileReader();

        reader.onload = (e) => {
          try {
            const content = e.target.result;
            const parsed = JSON.parse(content);

            // Hỗ trợ cả 2 định dạng: mảng trực tiếp [task1, task2] hoặc object { tasks: [...] }
            let importedTasks = [];
            if (Array.isArray(parsed)) {
              importedTasks = parsed;
            } else if (parsed && Array.isArray(parsed.tasks)) {
              importedTasks = parsed.tasks;
            } else {
              return reject(new Error('Cấu trúc file JSON không hợp lệ! Không tìm thấy mảng danh sách công việc.'));
            }

            // Kiểm tra tính hợp lệ của từng công việc trong tệp
            const validTasks = [];
            const existingTasks = this.getTasks();
            const existingIds = new Set(existingTasks.map(t => t.id));

            for (let i = 0; i < importedTasks.length; i++) {
              const item = importedTasks[i];
              if (!item || typeof item !== 'object' || !item.title || typeof item.title !== 'string' || item.title.trim() === '') {
                // Bỏ qua item rỗng hoặc thiếu tiêu đề
                continue;
              }

              // Xử lý chống trùng lặp ID: Nếu ID đã tồn tại thì tự cấp phát ID mới
              let validId = item.id;
              if (!validId || existingIds.has(validId)) {
                validId = generateId();
              }
              existingIds.add(validId);

              validTasks.push({
                id: validId,
                title: item.title.trim(),
                description: typeof item.description === 'string' ? item.description.trim() : '',
                status: ['pending', 'in-progress', 'completed'].includes(item.status) ? item.status : 'pending',
                priority: ['low', 'medium', 'high'].includes(item.priority) ? item.priority : 'medium',
                category: typeof item.category === 'string' && item.category.trim() ? item.category.trim() : 'Chung',
                createdAt: item.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
            }

            if (validTasks.length === 0) {
              return reject(new Error('Tệp JSON không chứa công việc hợp lệ nào để nhập!'));
            }

            // Ghi đè an toàn dữ liệu hợp lệ và phát sự kiện cập nhật
            const success = this.saveTasks(validTasks);
            if (success) {
              emitChange('import', validTasks);
              return resolve({ success: true, count: validTasks.length });
            } else {
              return reject(new Error('Không thể lưu dữ liệu vào LocalStorage (có thể do quá dung lượng).'));
            }
          } catch (err) {
            console.error('[TaskService] Lỗi xử lý Import JSON:', err);
            return reject(new Error('Lỗi cú pháp JSON! Tệp được chọn bị lỗi định dạng.'));
          }
        };

        reader.onerror = () => {
          reject(new Error('Lỗi khi đọc tệp từ máy tính!'));
        };

        reader.readAsText(file);
      });
    }
  };

  // Khởi chạy kiểm tra dữ liệu ban đầu
  TaskService.init();

  // Đăng ký TaskService vào phạm vi toàn cục window
  window.TaskService = TaskService;

})(window);
