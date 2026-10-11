/* ==========================================================================
   DinSide Website - Bilingual Translations (VI / EN)
   ========================================================================== */

const translations = {
  vi: {
    // Meta / Doc
    "page.title": "DinSide — Mang ngữ cảnh trang web vào AI Chat của bạn",
    "page.description": "Tiện ích mở rộng Chrome Side Panel kết nối ngữ cảnh trang web vào ChatGPT, Claude, Gemini, DeepSeek mà không cần copy-paste thủ công.",

    // Top Bar
    "topbar.email": "huynhvanthanh.dev@gmail.com",

    // Nav
    "nav.home": "Trang chủ",
    "nav.features": "Tính năng",
    "nav.about": "Giới thiệu",
    "nav.providers": "AI Providers",
    "nav.installation": "Cài đặt",
    "nav.donate": "Ủng hộ",
    "nav.faq": "FAQ",
    "nav.addToChrome": "Thêm vào Chrome",
    "theme.toggleLight": "Chuyển sang giao diện Sáng",
    "theme.toggleDark": "Chuyển sang giao diện Tối",

    // Hero
    "hero.tagDesc": "Tiện ích mở rộng Chrome Side Panel",
    "hero.headline": "Trang web bạn đang đọc,<br>cùng đọc với <em>ngữ cảnh AI.</em>",
    "hero.desc": "Đưa toàn bộ ngữ cảnh trang web, vùng xem màn hình, trích đoạn và Google Docs vào thẳng ChatGPT, Claude, Gemini... Trò chuyện trực tiếp ngay thanh bên, không cần copy-paste.",
    "hero.ctaPrimary": "Thêm vào Chrome — Miễn phí",
    "hero.ctaSecondary": "Xem tính năng",
    "hero.slogan": "AI của bạn. Ngữ cảnh của bạn. Trình duyệt của bạn.",

    // Features
    "features.label": "Tính năng",
    "features.title": "DinSide làm được gì",
    "features.lead": "Bốn việc bạn hay làm thủ công khi dùng AI cùng một trang web, gom lại ngay trong thanh bên.",
    "features.linkProviders": "Xem các nhà cung cấp hỗ trợ",
    "features.f1.title": "Side Panel đa nhà cung cấp",
    "features.f1.desc": "Trò chuyện với ChatGPT, Claude, Gemini, DeepSeek, Qwen... ngay trên thanh bên Chrome mà không cần rời trang web.",
    "features.f1.tag4": "15+ nhà cung cấp",
    "features.f2.title": "Ngữ cảnh tự chọn",
    "features.f2.desc": "Tự đánh giá nội dung trang và câu hỏi để chọn giữa vùng đang xem hoặc toàn bộ bài viết, giúp tiết kiệm token.",
    "features.f2.tag1": "Vùng nhìn",
    "features.f2.tag2": "Toàn trang",
    "features.f2.tag3": "Nhiều tab",
    "features.f3.title": "Hỏi nhanh khi bôi đen",
    "features.f3.desc": "Bôi đen văn bản bất kỳ để mở popup: giải thích, dịch, tóm tắt hoặc chạy action tuỳ chỉnh của riêng bạn.",
    "features.f3.tag1": "Giải thích",
    "features.f3.tag2": "Dịch",
    "features.f3.tag3": "Tóm tắt",
    "features.f4.title": "Google Docs và PDF",
    "features.f4.desc": "Trích xuất văn bản từ Google Docs và các file PDF nhúng trên Google Drive hay Google Classroom.",

    // Version 0.6.16 highlights
    "release.kicker": "CẬP NHẬT DINSIDE",
    "release.heading": "Nhiều cách làm việc hơn. Ít phải chuyển tab hơn.",
    "release.intro": "Quản lý các cuộc trò chuyện, gửi tài liệu và thao tác trên trang web, tất cả từ một Side Panel.",
    "release.cta": "Khám phá DinSide",
    "release.tabs.state": "Tùy chọn",
    "release.tabs.title": "Nhiều cuộc trò chuyện, một thanh bên",
    "release.tabs.desc": "Giữ chat đang mở khi chuyển qua lại giữa ChatGPT, Claude và các nhà cung cấp khác. Đổi tên, kéo sắp xếp và khôi phục danh sách tab khi mở lại.",
    "release.tabs.note": "Mặc định tắt · Bật trong Settings → General",
    "release.files.title": "Chọn và gửi file ngay trên trang web",
    "release.files.desc": "Đính kèm file từ website hoặc Drive. Google Docs, Sheets và Slides có thể xuất thành định dạng tài liệu phù hợp trước khi tải lên.",
    "release.upload.title": "Ba file tải lên cùng lúc",
    "release.upload.desc": "Tối đa 3 file được xử lý song song; file tiếp theo tự chờ lượt. Đính kèm xong không tự gửi tin nhắn.",
    "release.upload.tag1": "3 luồng đồng thời",
    "release.upload.tag2": "Có hàng chờ",
    "release.keys.title": "17 lệnh, phím tắt theo ý bạn",
    "release.keys.desc": "Mở menu, ghim ngữ cảnh, làm mới chat hoặc gọi công cụ bằng phím tắt. Tự gán phím trong Chrome và bật/tắt từng lệnh tùy chỉnh.",
    "release.tools.title": "Năm công cụ ngay trên trang đang xem",
    "release.tools.desc": "Chọn phần tử, chọn hình ảnh, chọn file, chụp một vùng hoặc vẽ trực tiếp lên trang để chia sẻ nội dung chính xác hơn.",
    "release.tools.tag1": "Chọn",
    "release.tools.tag2": "Chụp vùng",
    "release.tools.tag3": "Vẽ",
    "release.disclaimer": "Các tính năng trên thuộc gói v0.6.16. Phiên bản trên Chrome Web Store có thể được cập nhật theo lịch duyệt của cửa hàng.",


    // About
    "about.label": "Giới thiệu",
    "about.title": "Tối ưu hóa luồng làm việc giữa Web và Trí tuệ nhân tạo",
    "about.lead": "Thông thường khi dùng ChatGPT hay Claude, bạn phải liên tục bôi đen, copy và chuyển tab để dán vào khung chat. DinSide loại bỏ hoàn toàn rào cản này bằng cách mang chatbot vào ngay bên cạnh trang bạn đang đọc.",
    "about.c1.title": "Tự động đọc cấu trúc trang và vùng nhìn (Viewport)",
    "about.c1.desc": "Chỉ gửi những nội dung bạn đang quan tâm thay vì gửi tràn lan gây nghẽn context.",
    "about.c2.title": "Ghim ngữ cảnh (Pin Context) và gom nhiều Tab",
    "about.c2.desc": "Giữ lại tài liệu tham khảo cho nhiều câu hỏi liên tiếp mà không cần chọn lại.",
    "about.c3.title": "An toàn & Bảo mật — Xác minh bởi Chrome Web Store",
    "about.c3.desc": "Được kiểm duyệt bởi Google, toàn bộ xử lý diễn ra trực tiếp trên trình duyệt của bạn.",
    "about.cta": "Thêm vào Chrome ngay",

    // Providers
    "providers.label": "Hệ sinh thái AI",
    "providers.title": "Hỗ trợ 15+ Nhà cung cấp AI",
    "providers.note": "Không yêu cầu API Key trả phí",
    "providers.heroTitle": "Mọi mô hình AI bạn cần,<br>ngay trên thanh bên.",
    "providers.heroDesc": "Đưa toàn bộ ngữ cảnh duyệt web vào thẳng ChatGPT, Claude, Gemini, DeepSeek... Trò chuyện song song, không cần copy-paste hay API Key trả phí.",
    "providers.more": "+ Khác",
    "providers.moreSub": "Cập nhật liên tục",

    // Installation
    "install.badge": "Cài đặt",
    "install.title": "Hướng dẫn cài đặt trong 1 phút",
    "install.subtitle": "Chỉ với vài bước đơn giản, bạn có thể sử dụng DinSide ngay trên trình duyệt yêu thích.",
    "install.compatLabel": "Tương thích với",
    "install.storeTitle": "Cài đặt chính thức từ Chrome Web Store",
    "install.storeDesc": "Phiên bản mới nhất · Tự động cập nhật bảo mật · Được kiểm duyệt bởi Google",
    "install.storeBtn": "Thêm vào Chrome ngay",
    "install.s1.title": "Mở trang tiện ích trên Chrome Web Store",
    "install.s1.desc": "Bấm nút \"Thêm vào Chrome ngay\" ở trên hoặc truy cập trực tiếp <a href=\"https://chromewebstore.google.com/detail/dinside/gpmnoijpldnibaffgbnddfidgofbdbgo\" target=\"_blank\" rel=\"noopener noreferrer\">trang DinSide trên Chrome Web Store</a>.",
    "install.s2.title": "Bấm \"Thêm vào Chrome\"",
    "install.s2.desc": "Xác nhận hộp thoại popup của trình duyệt. Tiện ích sẽ được cài đặt và kích hoạt trong vòng vài giây.",
    "install.s3.title": "Mở Side Panel và trải nghiệm",
    "install.s3.desc": "Ghim biểu tượng DinSide vào thanh công cụ hoặc nhấn tổ hợp phím tắt để bắt đầu trò chuyện với AI cùng ngữ cảnh trang web.",
    "install.step1Pill": "Bước 1",
    "install.step2Pill": "Bước 2",
    "install.step3Pill": "Bước 3",
    "install.clickHint": "Bấm vào ảnh để chuyển bước · Tự động chuyển sau 4.8s",

    // Donate
    "donate.badge": "Ủng hộ DinSide",
    "donate.title": "Nếu DinSide giúp bạn làm việc hiệu quả hơn",
    "donate.desc": "DinSide là một dự án cá nhân được xây dựng với rất nhiều tâm huyết. Nếu tiện, bạn có thể mời mình một ly cà phê để tiếp tục duy trì và nâng cấp nhé!",
    "donate.qrCaption": "Quét mã bằng ứng dụng ngân hàng",
    "donate.bankLabel": "Ngân hàng",
    "donate.ownerLabel": "Chủ tài khoản",
    "donate.stkLabel": "Số tài khoản",
    "donate.btnCopyStk": "Sao chép STK",
    "donate.btnDownloadQr": "Tải ảnh QR",
    "donate.btnBmc": "Buy Me a Coffee (Quốc tế)",
    "donate.thanks": "Cảm ơn bạn đã đồng hành và ủng hộ DinSide!",

    // FAQ
    "faq.label": "Hỏi đáp",
    "faq.title": "Câu hỏi thường gặp",
    "faq.q1": "DinSide có hoàn toàn miễn phí không?",
    "faq.a1": "Đúng vậy! Tiện ích mở rộng DinSide hoàn toàn miễn phí cho tất cả mọi người sử dụng. Bạn có thể ủng hộ tác giả qua kênh donate để khuyến khích phát triển và duy trì các bản cập nhật tiếp theo.",
    "faq.q2": "Tôi có cần mua API key để sử dụng không?",
    "faq.a2": "Không cần! DinSide tương tác trực tiếp với giao diện web chat của các nhà cung cấp (ChatGPT, Claude, Gemini...) mà bạn đã đăng nhập sẵn trên trình duyệt. Bạn chỉ cần đăng nhập tài khoản bình thường là dùng được ngay.",
    "faq.q3": "Dữ liệu và nội dung trang web của tôi có an toàn không?",
    "faq.a3": "Tuyệt đối an toàn. DinSide không có máy chủ lưu trữ dữ liệu trung gian. Mọi xử lý ngữ cảnh diễn ra 100% cục bộ trong trình duyệt của bạn và chỉ được gửi tới đúng chatbot AI mà bạn bấm gửi.",
    "faq.q4": "Làm thế nào để đổi phím tắt mở DinSide?",
    "faq.a4": "Bạn có thể truy cập <code>chrome://extensions/shortcuts</code> trong trình duyệt, tìm đến mục DinSide và gán bất kỳ tổ hợp phím nào bạn thấy tiện lợi nhất (mặc định là Ctrl+Shift+Y).",

    // Footer
    "footer.desc": "Cầu nối thông minh giữa trang web đang đọc và các mô hình AI bạn yêu thích. Tiện ích mở rộng Chrome phát triển bởi <strong>thanhdiner</strong>.",
    "footer.colLinks": "Liên kết",
    "footer.colResources": "Tài nguyên",
    "footer.author": "Tác giả @thanhdiner",
    "footer.privacy": "Chính sách riêng tư",
    "footer.contact": "Liên hệ hỗ trợ",
    "footer.copyright": "© 2026 <strong>DinSide</strong>. Phát triển bởi <a href=\"https://github.com/thanhdiner\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"color: var(--accent-coral);\">thanhdiner</a>.",
    "footer.shortcut": "Phím tắt:",

    // Toast
    "toast.copied": "Đã sao chép vào bộ nhớ tạm!"
  },

  en: {
    // Meta / Doc
    "page.title": "DinSide — Bring Web Context Directly to Your AI Chat",
    "page.description": "Chrome Side Panel extension seamlessly bringing web page context to ChatGPT, Claude, Gemini, DeepSeek without tedious copy-pasting.",

    // Top Bar
    "topbar.email": "huynhvanthanh.dev@gmail.com",

    // Nav
    "nav.home": "Home",
    "nav.features": "Features",
    "nav.about": "About",
    "nav.providers": "AI Providers",
    "nav.installation": "Installation",
    "nav.donate": "Donate",
    "nav.faq": "FAQ",
    "nav.addToChrome": "Add to Chrome",
    "theme.toggleLight": "Switch to Light mode",
    "theme.toggleDark": "Switch to Dark mode",

    // Hero
    "hero.tagDesc": "Chrome Side Panel Extension",
    "hero.headline": "The page you're browsing,<br>read together with <em>AI Context.</em>",
    "hero.desc": "Seamlessly send entire web page context, viewport reading view, excerpts, and Google Docs directly into ChatGPT, Claude, Gemini, and more. Chat right in the side panel—no manual copy-paste required.",
    "hero.ctaPrimary": "Add to Chrome — Free",
    "hero.ctaSecondary": "Explore Features",
    "hero.slogan": "Your AI. Your Context. Your Browser.",

    // Features
    "features.label": "Features",
    "features.title": "What DinSide Can Do",
    "features.lead": "Four manual tasks you frequently perform when using AI with web pages, consolidated directly in your side panel.",
    "features.linkProviders": "View supported AI providers",
    "features.f1.title": "Multi-Provider Side Panel",
    "features.f1.desc": "Chat with ChatGPT, Claude, Gemini, DeepSeek, Qwen... right inside the Chrome side panel without switching tabs.",
    "features.f1.tag4": "15+ Providers",
    "features.f2.title": "Adaptive Context Selection",
    "features.f2.desc": "Intelligently chooses between your active reading viewport or the full article, keeping context precise and saving tokens.",
    "features.f2.tag1": "Viewport",
    "features.f2.tag2": "Full Page",
    "features.f2.tag3": "Multi-Tab",
    "features.f3.title": "Quick Ask on Selection",
    "features.f3.desc": "Highlight any text to trigger a fast popup: explain, translate, summarize, or run your own custom prompt actions.",
    "features.f3.tag1": "Explain",
    "features.f3.tag2": "Translate",
    "features.f3.tag3": "Summarize",
    "features.f4.title": "Google Docs & Embedded PDFs",
    "features.f4.desc": "Extract clean text directly from Google Docs and PDFs embedded in Google Drive or Google Classroom.",

    // Version 0.6.16 highlights
    "release.kicker": "WHAT'S NEW IN DINSIDE",
    "release.heading": "More ways to work. Less tab switching.",
    "release.intro": "Keep conversations organized, attach documents and interact with web pages, all from one side panel.",
    "release.cta": "Explore DinSide",
    "release.tabs.state": "Opt-in",
    "release.tabs.title": "Multiple conversations, one side panel",
    "release.tabs.desc": "Keep chats live as you move between ChatGPT, Claude and other providers. Rename and reorder tabs, then restore the saved tab list when you return.",
    "release.tabs.note": "Off by default · Enable in Settings → General",
    "release.files.title": "Pick and attach files right from the web",
    "release.files.desc": "Attach files from websites or Drive. Native Google Docs, Sheets and Slides can export into compatible document formats for upload.",
    "release.upload.title": "Three files at the same time",
    "release.upload.desc": "Process up to 3 file attachments concurrently while the rest wait their turn. Finishing an attachment never sends a chat message automatically.",
    "release.upload.tag1": "3 concurrent slots",
    "release.upload.tag2": "Queued uploads",
    "release.keys.title": "17 commands, your keyboard shortcuts",
    "release.keys.desc": "Toggle menus, pin context, reload chats or launch tools using shortcuts. Assign keys in Chrome and enable or disable custom commands individually.",
    "release.tools.title": "Five tools for the page you're viewing",
    "release.tools.desc": "Select an element, image or file, capture a region, or draw directly on the page to share exactly what matters.",
    "release.tools.tag1": "Select",
    "release.tools.tag2": "Capture region",
    "release.tools.tag3": "Draw",
    "release.disclaimer": "These features are included in the v0.6.16 package. The Chrome Web Store may show an earlier version while its update is under review.",


    // About
    "about.label": "About",
    "about.title": "Streamline Your Workflow Between Web and AI",
    "about.lead": "Normally when using ChatGPT or Claude, you have to highlight text, copy it, switch tabs, and paste it into the chatbox. DinSide completely removes this friction by placing your chatbot right alongside what you read.",
    "about.c1.title": "Automatic Page Structure & Viewport Reading",
    "about.c1.desc": "Sends only what you're actively reading instead of overwhelming the model with irrelevant noise.",
    "about.c2.title": "Pin Context & Multi-Tab Aggregation",
    "about.c2.desc": "Pin references across multiple consecutive questions without needing to re-select.",
    "about.c3.title": "Safe & Secure — Verified on Chrome Web Store",
    "about.c3.desc": "Reviewed by Google. All context extraction runs 100% locally within your own browser.",
    "about.cta": "Add to Chrome Now",

    // Providers
    "providers.label": "Ecosystem",
    "providers.title": "Supports 15+ AI Providers",
    "providers.note": "No paid API key required",
    "providers.heroTitle": "All your favorite AI models,<br>right in your side panel.",
    "providers.heroDesc": "Seamlessly connect live web browsing context directly into ChatGPT, Claude, Gemini, DeepSeek, and more. No manual copy-pasting, zero paid API keys required.",
    "providers.more": "+ More",
    "providers.moreSub": "Continuously updated",

    // Installation
    "install.badge": "Installation",
    "install.title": "1-Minute Setup Guide",
    "install.subtitle": "With just a few simple steps, you can start using DinSide immediately on your favorite browser.",
    "install.compatLabel": "Compatible with",
    "install.storeTitle": "Official Installation from Chrome Web Store",
    "install.storeDesc": "Latest release · Automatic security updates · Verified by Google",
    "install.storeBtn": "Add to Chrome Now",
    "install.s1.title": "Open the extension on Chrome Web Store",
    "install.s1.desc": "Click \"Add to Chrome Now\" above or visit the official <a href=\"https://chromewebstore.google.com/detail/dinside/gpmnoijpldnibaffgbnddfidgofbdbgo\" target=\"_blank\" rel=\"noopener noreferrer\">DinSide Chrome Web Store page</a>.",
    "install.s2.title": "Click \"Add to Chrome\"",
    "install.s2.desc": "Confirm the browser permission dialog. DinSide will be installed and active in seconds.",
    "install.s3.title": "Open Side Panel & Enjoy",
    "install.s3.desc": "Pin DinSide to your toolbar or use the keyboard shortcut to start chatting with AI alongside web context.",
    "install.step1Pill": "Step 1",
    "install.step2Pill": "Step 2",
    "install.step3Pill": "Step 3",
    "install.clickHint": "Click card to advance step · Auto-cycles every 4.8s",

    // Donate
    "donate.badge": "Support DinSide",
    "donate.title": "If DinSide helps boost your daily workflow",
    "donate.desc": "DinSide is an indie passion project built with great care. If you find it helpful, feel free to buy me a coffee to support maintenance and future features!",
    "donate.qrCaption": "Scan QR with your banking app",
    "donate.bankLabel": "Bank",
    "donate.ownerLabel": "Account Holder",
    "donate.stkLabel": "Account Number",
    "donate.btnCopyStk": "Copy Account No.",
    "donate.btnDownloadQr": "Download QR Code",
    "donate.btnBmc": "Buy Me a Coffee (International)",
    "donate.thanks": "Thank you for using and supporting DinSide!",

    // FAQ
    "faq.label": "FAQ",
    "faq.title": "Frequently Asked Questions",
    "faq.q1": "Is DinSide completely free?",
    "faq.a1": "Yes! DinSide is 100% free for everyone to use. You can support development via donation if you wish to help sustain future updates.",
    "faq.q2": "Do I need to purchase API keys?",
    "faq.a2": "No! DinSide integrates directly with the web chat interfaces of providers (ChatGPT, Claude, Gemini...) where you're already logged in on your browser. Just log in normally and start chatting.",
    "faq.q3": "Is my data and browsing content safe?",
    "faq.a3": "Absolutely safe. DinSide has no intermediary servers collecting your data. All context parsing runs 100% locally in your browser and is only sent to the AI chatbot you explicitly send it to.",
    "faq.q4": "How can I change the keyboard shortcut?",
    "faq.a4": "Navigate to <code>chrome://extensions/shortcuts</code> in your browser, find DinSide, and assign whichever shortcut you prefer (default is Ctrl+Shift+Y).",

    // Footer
    "footer.desc": "Smart bridge connecting your active web browsing with your favorite AI models. Chrome extension developed by <strong>thanhdiner</strong>.",
    "footer.colLinks": "Links",
    "footer.colResources": "Resources",
    "footer.author": "Author @thanhdiner",
    "footer.privacy": "Privacy Policy",
    "footer.contact": "Support & Contact",
    "footer.copyright": "© 2026 <strong>DinSide</strong>. Developed by <a href=\"https://github.com/thanhdiner\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"color: var(--accent-coral);\">thanhdiner</a>.",
    "footer.shortcut": "Shortcut:",

    // Toast
    "toast.copied": "Copied to clipboard!"
  }
};
