# Cafe Task Manager - Hệ Thống Quản Lý Công Việc Quán Cafe (MVP)

Ứng dụng web quản lý quy trình công việc và vận hành quán Cafe xây dựng bằng HTML5, CSS3 và Vanilla JavaScript thuần.

---

## 1. Cấu Trúc Dự Án

```text
QuanLyQuanCoffe/
├── index.html                  # Trang 1: Quản lý công việc chính & Bảng điều khiển
├── pages/
│   ├── page-2.html             # Trang 2: Báo cáo & Thống kê tiến độ (Người 2 phụ trách)
│   └── page-3.html             # Trang 3: Phân công ca trực & Điều phối (Người 3 phụ trách)
├── assets/
│   ├── css/
│   │   └── style.css           # Hệ thống CSS Reset, Theme, Navbar & UI Components
│   ├── js/
│   │   ├── main.js             # Logic Navbar, Dark/Light Mode, Actions dùng chung
│   │   └── taskService.js      # Tầng dữ liệu LocalStorage, CRUD, Export/Import JSON
│   └── images/                 # Tài nguyên hình ảnh (nếu cần)
├── .gitignore
├── README.md                   # Tài liệu hướng dẫn sử dụng và phân công
```

---

## 2. Phân Công Trách Nhiệm Thành Viên

### Người 1 – Leader (Phụ trách Hệ thống & Core Data):
* **Files:** `assets/css/style.css`, `assets/js/main.js`, `assets/js/taskService.js`
* Xây dựng khung hệ thống dùng chung, CSS Reset, CSS variables.
* Xây dựng Navbar responsive (Mobile Drawer) và Footer dùng chung.
* Xây dựng chức năng chuyển đổi Dark Mode / Light Mode đồng bộ trên cả 3 trang.
* Xây dựng tầng dữ liệu LocalStorage (`TaskService`), tự động nạp 5 công việc mẫu ban đầu.
* Xây dựng chức năng Clear All (an toàn, không mất theme), Export JSON và Import JSON.
* Quản lý Git repository và hỗ trợ tích hợp các trang của nhóm.

### Người 2 (Trang 2 - Báo cáo & Thống kê):
* **File:** `pages/page-2.html`
* Phát triển các tính năng phân tích biểu đồ, tỷ lệ hoàn thành theo thời gian, đo lường năng suất các bộ phận.

### Người 3 (Trang 3 - Phân công ca trực & Điều phối):
* **File:** `pages/page-3.html`
* Phát triển phân công nhân sự chi tiết cho từng ca (Ca Sáng, Ca Tối, Đóng quán), theo dõi phân chia nhiệm vụ.

---

## 3. 5 Công Việc Mẫu Ban Đầu Của Quán Cafe

Khi ứng dụng chạy lần đầu tiên trên trình duyệt, `TaskService` tự động khởi tạo 5 công việc mẫu:
1. **Kiểm tra nguyên liệu cà phê và sữa** (Kho & Nguyên liệu | Ưu tiên cao | Hoàn thành)
2. **Vệ sinh máy pha cà phê** (Kỹ thuật & Máy móc | Ưu tiên cao | Đang làm)
3. **Chuẩn bị trà và topping** (Pha chế | Ưu tiên trung bình | Chờ làm)
4. **Kiểm tra vệ sinh khu vực phục vụ** (Phục vụ | Ưu tiên trung bình | Hoàn thành)
5. **Kiểm kê ly và dụng cụ pha chế** (Quầy bar | Ưu tiên thấp | Chờ làm)

*Ghi chú:* Khi người dùng chủ động bấm **Clear All**, hệ thống sẽ xóa toàn bộ công việc và **KHÔNG** tự ý tạo lại 5 công việc mẫu khi F5/tải lại trang. Nếu muốn nạp lại, người dùng có thể bấm nút *"Nạp lại 5 việc mẫu"*.

---

## 4. Hướng Dẫn Sử Dụng Module TaskService (Dành Cho Cả Nhóm)

Thành viên các trang có thể truy cập module dữ liệu toàn cục qua `window.TaskService`:

```javascript
// 1. Lấy danh sách công việc
const tasks = window.TaskService.getTasks();

// 2. Thêm công việc mới
const newTask = window.TaskService.addTask({
  title: 'Nhập hạt cà phê Arabica Cầu Đất',
  description: 'Nhận lô hạt mới từ nhà cung cấp, kiểm tra độ ẩm.',
  status: 'pending',   // 'pending' | 'in-progress' | 'completed'
  priority: 'high',     // 'low' | 'medium' | 'high'
  category: 'Kho & Nguyên liệu'
});

// 3. Cập nhật công việc
window.TaskService.updateTask('task_id', { status: 'completed' });

// 4. Xóa công việc
window.TaskService.deleteTask('task_id');

// 5. Lắng nghe dữ liệu thay đổi để cập nhật giao diện
window.addEventListener('tasks:changed', function (event) {
  console.log('Hành động:', event.detail.action); // 'add' | 'update' | 'delete' | 'clear' | 'import'
  console.log('Dữ liệu mới:', event.detail.tasks);
});
```

---

## 5. Chạy Thử Ứng Dụng

Mở trực tiếp tệp `index.html` trong trình duyệt web (Google Chrome, Microsoft Edge, Firefox) hoặc dùng extension **Live Server** trong VS Code.