# DinSide Web — Trang Giới Thiệu & Cài Đặt Tiện Ích DinSide

Trang landing page chính thức giới thiệu tiện ích mở rộng **DinSide** (Chrome Manifest V3 Side Panel) — kết nối ngữ cảnh trình duyệt trực tiếp vào hơn 15 mô hình AI hàng đầu (ChatGPT, Claude, Gemini, DeepSeek...) mà không cần copy-paste thủ công.

Tiện ích được phát hành chính thức trên **Chrome Web Store**.

---

## 🔗 Liên kết chính thức

- **Chrome Web Store**: [https://chromewebstore.google.com/detail/dinside/gpmnoijpldnibaffgbnddfidgofbdbgo](https://chromewebstore.google.com/detail/dinside/gpmnoijpldnibaffgbnddfidgofbdbgo)
- **Tác giả**: [HUYNH VAN THANH (@thanhdiner)](https://github.com/thanhdiner)

---

## 🌟 Tính năng của trang web

- **Giao diện hiện đại & Siêu mượt**: Thiết kế chuẩn MultiFlex Dark Theme, tối ưu tương phản và typography.
- **Mô phỏng trực quan (Interactive Mockup)**: Trực tiếp minh hoạ trải nghiệm chia đôi màn hình giữa việc duyệt web và thanh bên DinSide với khả năng đổi qua lại giữa ChatGPT, Claude, Gemini.
- **Hệ sinh thái 15+ AI Provider**: Danh mục các mô hình AI được hỗ trợ kèm logo SVG sắc nét.
- **Cài đặt 1 chạm nhanh chóng**: Hướng dẫn cài đặt trực tiếp từ Chrome Web Store an toàn và tiện lợi.
- **Khu vực ủng hộ & Mời cà phê**:
  - Hỗ trợ chuyển khoản nhanh qua mã **VietQR / Vietcombank** (Chủ TK: HUYNH VAN THANH, STK: 1061960104).
  - Nút copy số tài khoản và nút tải ảnh QR tiện lợi.
- **Tối ưu Responsive & Tương thích**: Tương thích tốt trên máy tính, máy tính bảng và điện thoại di động.

---

## 📂 Cấu trúc thư mục

```text
dinside-web/
├── index.html              # Trang chủ chính
├── css/
│   └── style.css           # Toàn bộ CSS (Variables, Theme, Responsive)
├── js/
│   └── main.js             # Logic xử lý giao diện, tab mockup, copy toast
├── assets/                 # Icons, logo AI, video demo, QR donate
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
4. **Cách 4**: Dùng extension **Live Server** trong VS Code / Cursor.

---

## 🌐 Triển khai lên mạng (Deployment)

**Đã deploy:** https://thanhdiner.github.io/dinside-web/ từ repo https://github.com/thanhdiner/dinside-web (nhánh `main`, thư mục `/(root)`).

**Cập nhật website:** Sau khi sửa `D:\Dev\dinside-web`, chạy:

```powershell
pwsh -File "D:\Dev\dinside-web\publish.ps1" -Message "feat: update website"
```

Script đồng bộ file website công khai sang `D:\Dev\dinside-web-publish`, commit và push. GitHub Pages sẽ tự deploy mỗi lần push. Git history cũ tại thư mục nguồn vẫn giữ nguyên, không cần Node.js server.



### 1. GitHub Pages (Miễn phí)
1. Đẩy mã nguồn repo lên GitHub (ví dụ: `https://github.com/thanhdiner/dinside-web`).
2. Vào tab **Settings** -> **Pages**.
3. Tại phần **Source**, chọn nhánh `main` (hoặc `master`) và thư mục `/(root)`.
4. Bấm **Save**. Trang web sẽ chạy sau khoảng 1 phút tại `https://thanhdiner.github.io/dinside-web/`.

### 2. Vercel hoặc Netlify
Kéo thả thư mục `dinside-web` vào bảng điều khiển của Vercel hoặc Netlify là trang web sẽ online ngay lập tức mà không cần cấu hình build step.

---

## 👤 Thông tin liên hệ

- Tác giả: **HUYNH VAN THANH** ([@thanhdiner](https://github.com/thanhdiner))
- Email: `huynhvanthanh.dev@gmail.com`
- Chrome Web Store: [DinSide Extension](https://chromewebstore.google.com/detail/dinside/gpmnoijpldnibaffgbnddfidgofbdbgo)
