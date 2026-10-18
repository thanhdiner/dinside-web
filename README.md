# DinSide Web

Website giới thiệu và hướng dẫn cài đặt DinSide, viết bằng HTML, CSS và JavaScript thuần. Nội dung tiếng Việt và tiếng Anh được đối chiếu với **DinSide 0.6.20** ngày **18/10/2026**. Phiên bản trên Chrome Web Store có thể chậm hơn do thời gian xét duyệt.

## Nội dung sản phẩm

- 19 nhà cung cấp AI, dùng tài khoản web chat hiện có; không cần API key để kết nối.
- Ngữ cảnh trang, vùng xem, nhiều tab, ghim tham chiếu và Quick Ask khi bôi đen.
- Chuyển hội thoại với Loaded / Full history / Recent, xem lại ngữ cảnh, Auto-send hoặc Manual để chọn model trước khi gửi.
- Select on page nhận diện văn bản, ảnh và file; Capture region và Draw on page là công cụ riêng.
- Ảnh vùng xem tùy chọn, mặc định tắt; tối ưu PNG cục bộ giữ nguyên điểm ảnh.
- Tab chat, tìm kiếm trong Settings, tài liệu Google Workspace và file đính kèm theo khả năng của nhà cung cấp.

DinSide hiện không yêu cầu tài khoản hay gói trả phí. Đăng nhập DinSide, thanh toán và đồng bộ đám mây đang tạm tắt. Giới hạn model, tài khoản và tải file của từng nhà cung cấp vẫn áp dụng. Tham chiếu file trong lịch sử không đồng nghĩa file gốc đã được chuyển sang AI đích.

Các bản xem thử trên landing page chỉ mô phỏng giao diện, **không gửi hội thoại hoặc tải file thật**.

## Chạy cục bộ

Không cần cài dependency hoặc build. Từ thư mục dự án:

```powershell
python -m http.server 3000 --bind 127.0.0.1
```

Mở `http://127.0.0.1:3000`. Dùng HTTP để kiểm tra đầy đủ tài nguyên và tương tác.

## Cấu trúc

```text
index.html                 Trang chủ, nội dung tiếng Việt dự phòng
css/style.css              Giao diện sáng/tối và responsive
js/translations.js         Nội dung VI/EN, nạp một lần trong head
js/main.js                 Ngôn ngữ, theme, bản xem thử, FAQ, hướng dẫn cài đặt
js/hero-color-panels.js    Hiệu ứng minh họa WebGL
js/metal-pill.js           Hiệu ứng giao diện
assets/                    Logo, ảnh cài đặt và QR ủng hộ
publish.ps1                Đồng bộ sang repo công khai, commit và push
```

`components/` và `lib/` là các mẫu TSX tham khảo, không tham gia trang HTML đang chạy. Các bản sao extension `sidepanel.html`, `sidepanel.js` và ZIP cũ trong `downloads/` không được trang hiện tại sử dụng hoặc phát hành bởi `publish.ps1`. Cài đặt qua Chrome Web Store; không dùng các ZIP cũ này làm bản phát hành mới.

## Kiểm tra trước khi cập nhật

```powershell
node --check js/main.js
node --check js/translations.js
git diff --check
```

Trong Chrome, kiểm tra hai ngôn ngữ và hai theme ở desktop và mobile: bản xem thử Auto-send/Manual, chọn file mô phỏng, danh sách 19 nhà cung cấp, FAQ, menu mobile và các bước cài đặt. Kiểm tra console, tài nguyên nội bộ và tràn ngang. Đối chiếu nội dung `data-i18n` với cả hai bộ bản dịch và nội dung HTML dự phòng.

Khi thay đổi sản phẩm, đối chiếu `manifest.json`, provider catalog và tài liệu release trong repo extension. Không tự coi bản local là bản đã được Chrome Web Store duyệt.

## Phát hành website

- Website: https://thanhdiner.github.io/dinside-web/
- Repo công khai: https://github.com/thanhdiner/dinside-web
- Mirror cục bộ: `D:\Dev\dinside-web-publish`

Chỉ chạy khi muốn phát hành thay đổi lên mạng:

```powershell
pwsh -File "D:\Dev\dinside-web\publish.ps1" -Message "feat: align website with DinSide 0.6.20"
```

Script đồng bộ `index.html`, `README.md`, `.gitignore`, `publish.ps1` và các thư mục `assets/`, `css/`, `js/` sang mirror; cập nhật hash cache cho CSS, bản dịch và script chính; rồi commit và push `origin main`. GitHub Pages phục vụ từ nhánh `main`, thư mục gốc. Đây là thao tác phát hành công khai, không phải lệnh preview hoặc kiểm tra.

## Liên kết

- [Chrome Web Store](https://chromewebstore.google.com/detail/dinside/gpmnoijpldnibaffgbnddfidgofbdbgo)
- [Tác giả @thanhdiner](https://github.com/thanhdiner)
- Hỗ trợ: huynhvanthanh.dev@gmail.com
