# Tổng Kết Triển Khai: Cơ Sở Dữ Liệu & Use Case Hệ Thống NOVIARA

Hệ thống **NOVIARA** đã hoàn tất việc chuyển đổi từ kiến trúc lưu trữ tạm thời tại `localStorage` sang hệ thống **Cơ sở Dữ liệu quan hệ SQLite tập trung (Centralized Database - 11 Bảng chuẩn 3NF)**, đồng thời tái cấu trúc toàn diện **Sơ đồ Use Case** theo chuẩn phân quyền 3 tác nhân (Admin - Giảng viên - Sinh viên).

---

## 1. Các Thay Đổi Đã Thực Hiện

### 1.1. Tầng Cơ Sở Dữ Liệu & Backend Python (`backend/`)
* **[NEW] [backend/database.py](file:///c:/Users/Dai%20Thang/Downloads/NOVIARA/backend/database.py)**:
  - Quản lý kết nối SQLite thread-safe qua context manager `get_db_connection()`.
  - Tự động bật ràng buộc khóa ngoại (`PRAGMA foreign_keys = ON;`) và cấu hình `sqlite3.Row` dict factory.
  - Các hàm tiện ích: `query_all()`, `query_one()`, `execute_commit()`.
* **[NEW] [backend/models.py](file:///c:/Users/Dai%20Thang/Downloads/NOVIARA/backend/models.py)**:
  - Chứa câu lệnh DDL khởi tạo đầy đủ **11 bảng chuẩn 3NF** và các chỉ mục `CREATE INDEX`.
  - Hàm `init_db(seed=True)`: Tự động khởi tạo cấu trúc CSDL và nạp dữ liệu mẫu (2 tài khoản, 3 lớp học phần, 6 bài nộp khảo sát DISC mẫu).
* **[NEW] [backend/routers/classes_router.py](file:///c:/Users/Dai%20Thang/Downloads/NOVIARA/backend/routers/classes_router.py)**:
  - `GET /api/classes`: Lấy danh sách lớp kèm sĩ số sinh viên và số bài khảo sát nộp realtime.
  - `POST /api/classes`: Tạo lớp học phần mới.
  - `PATCH /api/classes/{id}/survey-status`: Bật/Tắt đợt khảo sát DISC cho sinh viên.
  - `DELETE /api/classes/{id}`: Xóa lớp học phần.
* **[NEW] [backend/routers/surveys_router.py](file:///c:/Users/Dai%20Thang/Downloads/NOVIARA/backend/routers/surveys_router.py)**:
  - `POST /api/surveys/submit`: Tiếp nhận bài nộp khảo sát của sinh viên, lưu trực tiếp vào CSDL SQLite.
  - `GET /api/surveys/classes/{class_id}/submissions`: Lấy danh sách tất cả bài nộp của 1 lớp.
  - `GET /api/surveys/lookup/{student_id}`: Sinh viên tra cứu nhóm cá nhân và bài nộp khảo sát theo MSSV.
* **[MODIFY] [backend/main.py](file:///c:/Users/Dai%20Thang/Downloads/NOVIARA/backend/main.py)**:
  - Tích hợp `classes_router` và `surveys_router` vào tiền tố `/api`.
  - Bổ sung sự kiện `@app.on_event("startup")` tự động gọi `init_db()`.

---

### 1.2. Tầng Giao Diện & Dịch Vụ Dữ Liệu Frontend (`src/`)
* **[MODIFY] [src/services/api.ts](file:///c:/Users/Dai%20Thang/Downloads/NOVIARA/src/services/api.ts)**:
  - Thêm các hàm giao tiếp REST API: `fetchClassesFromBackend()`, `createClassInBackend()`, `toggleSurveyStatusInBackend()`, `deleteClassInBackend()`, `submitSurveyToBackend()`, `fetchClassSubmissionsFromBackend()`, `lookupStudentFromBackend()`.
* **[MODIFY] [src/data/classData.ts](file:///c:/Users/Dai%20Thang/Downloads/NOVIARA/src/data/classData.ts)**:
  - Thêm hàm `syncClassesWithBackend()` đồng bộ tức thời số lượng sinh viên nộp bài từ CSDL.
  - Tích hợp cơ chế đồng bộ nền (Background Sync) trong `addClass()`, `toggleSurveyStatus()`, `deleteClass()`, và `addSurveySubmission()`.
* **[MODIFY] [src/components/student/StudentSurvey.tsx](file:///c:/Users/Dai%20Thang/Downloads/NOVIARA/src/components/student/StudentSurvey.tsx)**:
  - Tự động gọi `syncClassesWithBackend()` khi mở trang khảo sát để luôn tải danh sách lớp học và đợt khảo sát mới nhất từ CSDL.
* **[MODIFY] [src/components/admin/LecturerClasses.tsx](file:///c:/Users/Dai%20Thang/Downloads/NOVIARA/src/components/admin/LecturerClasses.tsx)**:
  - Tự động đồng bộ số lượng sinh viên đã nộp khảo sát từ CSDL SQLite Backend mỗi khi giảng viên truy cập trang quản lý lớp.

---

## 2. Kết Quả Kiểm Thử & Xác Minh

### 2.1. Kiểm Thử Backend (Pytest)
Đã tạo bộ kiểm thử mới [tests/test_database.py](file:///c:/Users/Dai%20Thang/Downloads/NOVIARA/tests/test_database.py) và chạy toàn bộ test suite:
```
python -m pytest tests/ -v
======================= 14 passed, 3 warnings in 3.22s ========================
```
* `test_database_init_and_tables`: **PASSED** (11/11 bảng CSDL tạo thành công)
* `test_get_all_classes`: **PASSED** (Truy vấn lớp và số bài nộp khảo sát chính xác)
* `test_create_and_toggle_class`: **PASSED** (Tạo lớp và bật/tắt đợt khảo sát)
* `test_submit_survey_and_lookup`: **PASSED** (Nộp khảo sát, lưu CSDL và tra cứu theo MSSV)
* `test_survey_closed_rejection`: **PASSED** (Chặn nộp bài khi khảo sát đóng)
* Toàn bộ 9 test cases cũ của GA Engine, Benchmark, Upload: **PASSED 100%**.

### 2.2. Kiểm Thử Frontend (TypeScript Compiler)
```
npm run lint (tsc --noEmit) -> Exit Code 0 (0 lỗi biên dịch)
```
Mọi Interface và kiểu dữ liệu giữa TypeScript và Python Backend đồng bộ 100%.
