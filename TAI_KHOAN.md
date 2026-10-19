# DANH SÁCH TÀI KHOẢN HỆ THỐNG QUẢN LÝ QUÁN COFFEE (MVP)

Dưới đây là 3 tài khoản chính thức đại diện cho 3 nhóm người dùng trong MVP, kèm vai trò và quyền hạn để cả nhóm cùng sử dụng và tích hợp:

---

## 1. Bảng Thông Tin Đăng Nhập

| Nhóm người dùng | Tên đăng nhập (`username`) | Mật khẩu (`password`) | Họ và tên hiển thị | Quyền hạn trong hệ thống MVP |
| :--- | :--- | :--- | :--- | :--- |
| **Admin (Chủ quán)** | `admin` | `admin123` | **Lê Hoàng (Chủ quán)** | Quản lý danh mục món, giá bán, tồn kho, tài khoản nhân viên và xem doanh thu quán. |
| **Nhân viên (Staff / Pha chế)** | `nhanvien` | `staff123` | **Trần Thị Mai (Pha chế)** | Tiếp nhận đơn đặt món, cập nhật trạng thái pha chế: `PENDING` (Chờ làm) &rarr; `PREPARING` (Đang pha chế) &rarr; `COMPLETED` (Hoàn thành). |
| **Khách hàng (Customer)** | `khachhang` | `khach123` | **Nguyễn Văn A (Khách hàng)** | Xem thực đơn, thêm món vào giỏ hàng, đặt hàng, nhận hóa đơn và theo dõi trạng thái đơn hàng. |
| **Khách vãng lai (Guest)** | *(Không cần)* | *(Không cần)* | **Khách vãng lai** | Khách chưa đăng nhập: Xem trang chủ, xem thực đơn và giá bán. Khi bấm đặt hàng sẽ được chuyển đến đăng nhập. |

---

## 2. Cách Sử Dụng Trực Tiếp Trên Giao Diện

1. Trên góc phải thanh Header, bấm vào nút **"Đăng nhập"** (nếu chưa đăng nhập) hoặc **"Đổi tài khoản"** (nếu đã đăng nhập).
2. Modal **"Tài Khoản Hệ Thống (MVP)"** sẽ hiện ra danh sách 3 tài khoản trên kèm thông tin tài khoản và mật khẩu.
3. Bấm trực tiếp vào nút **"Chọn Admin"**, **"Chọn Nhân viên"**, hoặc **"Chọn Khách"** để chuyển đổi tức thì giao diện tương ứng mà không cần gõ lại mật khẩu.

---

## 3. Cách Tích Hợp JavaScript Dành Cho Các Thành Viên

Người 1 đã cung cấp sẵn module toàn cục `window.CoffeeAuth` trong [js/main.js](file:///c:/Users/tiend/Downloads/QuanLyQuanCoffe/js/main.js):

```javascript
// 1. Lấy thông tin người dùng hiện tại:
const currentUser = window.CoffeeAuth.getCurrentUser();
console.log(currentUser.role); // 'guest' | 'customer' | 'staff' | 'admin'
console.log(currentUser.name); // 'Lê Hoàng (Chủ quán)' | 'Trần Thị Mai (Pha chế)' | ...

// 2. Đăng nhập nhanh vào một vai trò bất kỳ:
window.CoffeeAuth.loginAs('admin');    // Đăng nhập Admin
window.CoffeeAuth.loginAs('staff');    // Đăng nhập Nhân viên
window.CoffeeAuth.loginAs('customer'); // Đăng nhập Khách hàng
window.CoffeeAuth.loginAs('guest');    // Đăng xuất về Khách vãng lai

// 3. Đăng xuất:
window.CoffeeAuth.logout();

// 4. Lắng nghe sự kiện khi người dùng đổi tài khoản:
window.addEventListener('coffee:auth-changed', function (e) {
  console.log('Tài khoản mới:', e.detail);
});
```
