# DinSide Web — Trang Giới Thiệu & Tải Tiện Ích DinSide

Trang landing page chính thức giới thiệu tiện ích mở rộng **DinSide** (Chrome Manifest V3 Side Panel) — kết nối ngữ cảnh trình duyệt trực tiếp vào hơn 15 mô hình AI hàng đầu mà không cần copy-paste thủ công.

---

## 🌟 Tính năng của trang web

- **Giao diện hiện đại & Siêu mượt**: Thiết kế chuẩn Dark Mode / Light Mode với hiệu ứng chuyển đổi mượt mà, lưu tuỳ chọn vào `localStorage`.
- **Mô phỏng trực quan (Interactive Mockup)**: Trực tiếp minh hoạ trải nghiệm chia đôi màn hình giữa việc duyệt web và thanh bên DinSide với khả năng đổi qua lại giữa ChatGPT, Claude, Gemini.
- **Hệ sinh thái 15+ AI Provider**: Danh mục các mô hình AI được hỗ trợ kèm logo SVG sắc nét.
- **Hướng dẫn cài đặt 2 chế độ**: Cho phép người dùng tải file ZIP trực tiếp hoặc copy lệnh `git clone` chỉ với 1 click.
- **Khu vực ủng hộ & Đồ cho DinSide**:
  - Hỗ trợ chuyển khoản nhanh qua mã **VietQR / Vietcombank** (Chủ TK: HUYNH VAN THANH, STK: 1061960104).
  - Nút copy số tài khoản và nút tải ảnh QR tiện lợi.
- **Tối ưu SEO & Responsive**: Tương thích tốt trên máy tính, máy tính bảng và điện thoại di động.

---

## 📂 Cấu trúc thư mục

```text
dinside-web/
├── index.html              # Trang chủ chính
├── css/
│   └── style.css           # Toàn bộ CSS (Variables, Theme, Responsive)
├── js/
│   └── main.js             # Logic xử lý giao diện, theme, tab, copy toast
├── assets/                 # Icons và logo các nhà cung cấp AI, QR donate
├── downloads/              # Chứa gói cài đặt DinSide-0.6.9.zip
├── .gitignore
└── README.md
```

---

## 🚀 Cách chạy thử cục bộ (Local Preview)

Vì trang được xây dựng hoàn toàn bằng **HTML, CSS và JavaScript thuần**, bạn có thể:

1. **Cách 1 (Nhanh nhất)**: Nhấp đúp chuột trực tiếp vào file `index.html` để mở trên bất kỳ trình duyệt nào.
2. **Cách 2 (Sử dụng Python)**:
   ```bash
   python -m http.server 3000
   ```
   Sau đó mở trình duyệt tại: `http://localhost:3000`
3. **Cách 3 (Sử dụng Node.js npx)**:
   ```bash
   npx serve .
   ```
4. **Cách 4**: Dùng extension **Live Server** trong VS Code / Cursor / WebStorm.

---

## 🌐 Triển khai lên mạng (Deployment)

### 1. GitHub Pages (Miễn phí)
1. Đẩy mã nguồn repo lên GitHub (ví dụ: `https://github.com/thanhdiner/dinside-web`).
2. Vào tab **Settings** -> **Pages**.
3. Tại phần **Source**, chọn nhánh `main` (hoặc `master`) và thư mục `/(root)`.
4. Bấm **Save**. Trang web sẽ chạy sau khoảng 1 phút tại `https://thanhdiner.github.io/dinside-web/`.

### 2. Vercel hoặc Netlify
Kéo thả thư mục `dinside-web` vào bảng điều khiển của Vercel hoặc Netlify là trang web sẽ online ngay lập tức mà không cần cấu hình build step.

---

## 👤 Tác giả

- Tác giả: **HUYNH VAN THANH** ([@thanhdiner](https://github.com/thanhdiner))
- Email: `huynhvanthanh.dev@gmail.com`
- Dự án DinSide: [https://github.com/thanhdiner/DinSide](https://github.com/thanhdiner/DinSide)
