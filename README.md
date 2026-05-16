# Zalo-elec

**Zalo-elec** là một ứng dụng wrapper (bọc web) không chính thức dành cho Zalo Web (`https://chat.zalo.me`), được xây dựng bằng Electron và TypeScript, mang lại trải nghiệm như một ứng dụng desktop trên Linux.

## Tính Năng Chính

- **Tích Hợp Hệ Thống:**
  - Hỗ trợ System Tray (khay hệ thống) để chạy ngầm và dễ dàng mở lại.
  - Ngăn chặn mở nhiều cửa sổ cùng lúc (Single Instance Lock).
  - Hỗ trợ thông báo (Notifications) của hệ điều hành.
  - Cấp quyền truy cập phương tiện (Micro, Camera) đầy đủ.
- **Tích Hợp ZaDark Emoji:** Tự động tiêm (inject) mã CSS và JavaScript để sử dụng các biểu tượng cảm xúc tùy chỉnh từ dự án ZaDark.
- **Quản Lý Liên Kết:** Các liên kết bên ngoài (không thuộc nội bộ Zalo) sẽ tự động được mở bằng trình duyệt mặc định của hệ điều hành, thay vì mở bên trong cửa sổ ứng dụng.

## Yêu Cầu Hệ Thống

- [Node.js](https://nodejs.org/) (Phiên bản tương thích với Electron).
- `pnpm` (dự án sử dụng file `pnpm-workspace.yaml` / `pnpm-lock.yaml`).

## Cài Đặt và Khởi Chạy

1. **Cài đặt các gói phụ thuộc:**
   ```bash
   pnpm install
   ```

2. **Chạy ứng dụng trong môi trường phát triển:**
   Lệnh này sẽ biên dịch TypeScript và mở ứng dụng:
   ```bash
   pnpm run start
   ```

3. **Đóng gói ứng dụng (Build):**
   Để tạo ra bản cài đặt (AppImage, deb cho Linux):
   ```bash
   pnpm run dist
   ```
   Kết quả sẽ được lưu trong thư mục `dist/`.

## Cấu Trúc Dự Án

- `src/main/`: Chứa mã nguồn TypeScript của tiến trình chính (Main Process).
  - `index.ts`: Tệp khởi chạy chính, thiết lập cửa sổ và xử lý các sự kiện.
  - `tray.ts`: Cấu hình icon ở khay hệ thống.
- `resources/`: Chứa các tài nguyên tĩnh như icon ứng dụng (`icon.png`) và các mã nguồn hỗ trợ emoji của ZaDark.
- `dist/`: Thư mục chứa mã JavaScript đã được biên dịch và các file build của ứng dụng.

## Lời Cảm Ơn (Credits)

- **ZaDark:** Đặc biệt gửi lời cảm ơn đến dự án [ZaDark](https://github.com/ncdai/zadark) vì đã cung cấp các tệp CSS và script hỗ trợ biểu tượng cảm xúc tùy chỉnh được sử dụng trong ứng dụng này.

## Giấy Phép (License)

Dự án này được phân phối dưới giấy phép MIT. Chi tiết vui lòng xem tệp `LICENSE`.
