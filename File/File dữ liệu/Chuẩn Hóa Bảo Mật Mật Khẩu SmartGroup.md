# Kế Hoạch Triển Khai: Xóa Sạch Tài Khoản Demo & Chuẩn Hóa Bảo Mật Mật Khẩu NOVIARA

Tài liệu này đặc tả quy trình kỹ thuật nhằm:
1. **Xóa bỏ hoàn toàn các tài khoản demo lộ mật khẩu** (`admin123`, `gv123456`) trong toàn bộ mã nguồn Frontend, Backend và CSDL.
2. **Xây dựng module mã hóa mật khẩu (Password Hashing)** bằng thuật toán chuẩn công nghiệp `PBKDF2-HMAC-SHA256` kết hợp Salt ngẫu nhiên.
3. **Cung cấp Script CLI độc lập (`manage_accounts.py`)** để người dùng tự chạy trong terminal, tự đặt mật khẩu riêng, tự sinh chuỗi hash và kích hoạt tài khoản Admin / Giảng viên.
4. **Cập nhật màn hình đăng nhập (`AdminLogin.tsx`)**: Loại bỏ các nút quick-fill lộ mật khẩu demo, kết nối trực tiếp với API xác thực backend CSDL.
5. **Xuất bản Kế hoạch hoàn chỉnh dưới dạng file DOCX** vào thư mục `File/File kế hoạch/`.

---

## 1. Yêu Cầu Đánh Giá Từ Người Dùng (User Review Required)

> [!IMPORTANT]
> **Xóa bỏ các tài khoản mặc định cũ**:
> Sau khi triển khai, các tài khoản `admin123` và `gv123456` sẽ bị vô hiệu hóa và xóa sạch khỏi CSDL `NOVIARA.db` cũng như `localStorage`. Bạn sẽ sử dụng script `manage_accounts.py` để tạo tài khoản Quản trị viên và Giảng viên chính thức với mật khẩu do chính bạn tự đặt.

> [!TIP]
> **Cơ chế Mã Hóa Mật Khẩu (Security Architecture)**:
> Mật khẩu sẽ được băm bằng `hashlib.pbkdf2_hmac` với 100,000 vòng lặp (iterations) và Salt 16 bytes ngẫu nhiên. Định dạng lưu trữ: `pbkdf2:sha256:100000$<salt_hex>$<hash_hex>`. Chuỗi này không thể giải mã ngược lại ngay cả khi có toàn quyền truy cập file CSDL.

---

## 2. Các Thay Đổi Đề Xuất Chi Tiết (Proposed Changes)

### Tầng Backend (`backend/`)
#### [NEW] [backend/auth_utils.py](file:///c:/Users/Dai%20Thang/Downloads/NOVIARA/backend/auth_utils.py)
* Cung cấp hàm `hash_password(plain_text: str) -> str`.
* Cung cấp hàm `verify_password(plain_text: str, hashed_str: str) -> bool`.

#### [NEW] [backend/routers/auth_router.py](file:///c:/Users/Dai%20Thang/Downloads/NOVIARA/backend/routers/auth_router.py)
* `POST /api/auth/login`: Nhận `{ usernameOrEmail, password, role }`, truy vấn CSDL SQLite, xác minh mật khẩu băm, cập nhật `last_login`, trả về thông tin tài khoản an toàn (không lộ password).
* `POST /api/auth/change-password`: Đổi mật khẩu tài khoản và tắt cờ `must_change_password`.

#### [MODIFY] [backend/models.py](file:///c:/Users/Dai%20Thang/Downloads/NOVIARA/backend/models.py)
* Xóa bỏ các bản ghi tài khoản demo hardcoded trong hàm `seed_initial_data()`.
* Đảm bảo CSDL ban đầu không chứa tài khoản demo lộ liễu.

#### [MODIFY] [backend/main.py](file:///c:/Users/Dai%20Thang/Downloads/NOVIARA/backend/main.py)
* Đăng ký `auth_router` vào `/api`.

#### [NEW] [manage_accounts.py](file:///c:/Users/Dai%20Thang/Downloads/NOVIARA/manage_accounts.py)
* Script CLI độc lập chạy bằng lệnh `python manage_accounts.py`.
* Cung cấp menu tương tác:
  1. Tạo tài khoản Admin mới (nhập tên, email, username, password -> tự động hash và lưu vào CSDL).
  2. Tạo tài khoản Giảng viên mới.
  3. Đổi mật khẩu tài khoản hiện có.
  4. Liệt kê danh sách tài khoản trong CSDL.
  5. Xóa sạch dữ liệu tài khoản demo cũ.

---

### Tầng Frontend (`src/`)
#### [MODIFY] [src/data/lecturerData.ts](file:///c:/Users/Dai%20Thang/Downloads/NOVIARA/src/data/lecturerData.ts)
* Xóa bỏ `INITIAL_LECTURER_ACCOUNTS` và `DEFAULT_ADMIN_ACCOUNT` chứa mật khẩu plaintext demo.
* Làm sạch `localStorage` khởi tạo.

#### [MODIFY] [src/components/admin/AdminLogin.tsx](file:///c:/Users/Dai%20Thang/Downloads/NOVIARA/src/components/admin/AdminLogin.tsx)
* Xóa bỏ 2 nút quick-fill demo và các thông báo lộ pass demo.
* Chuyển logic đăng nhập sang gọi API `POST /api/auth/login`. Nếu backend offline, hỗ trợ fallback an toàn.

---

### Tài Liệu Bàn Giao (`File/File kế hoạch/`)
#### [NEW] `File/File kế hoạch/Ke_hoach_Bao_mat_CSDL_va_Usecase_NOVIARA.docx`
* Tạo bản Word chính thức ghi lại toàn bộ:
  1. Phân tích kiến trúc bảo mật & cơ chế băm mật khẩu.
  2. Sơ đồ 11 bảng CSDL quan hệ chuẩn 3NF.
  3. Sơ đồ Use Case phân tầng 3 tác nhân.
  4. Hướng dẫn sử dụng công cụ `manage_accounts.py` để khởi tạo tài khoản an toàn.

---

## 3. Kế Hoạch Kiểm Thử & Xác Minh (Verification Plan)

### Kiểm thử Tự động (Pytest)
* Tạo test case trong `tests/test_auth.py` kiểm tra:
  - Băm và kiểm tra tính hợp lệ của mật khẩu.
  - Đăng nhập đúng mật khẩu -> thành công (200).
  - Đăng nhập sai mật khẩu -> từ chối (401).
* Chạy `python -m pytest tests/ -v` đảm bảo 100% tests pass.

### Kiểm thử Frontend
* Chạy `npm run lint` (`tsc --noEmit`) bảo đảm 0 lỗi biên dịch.
