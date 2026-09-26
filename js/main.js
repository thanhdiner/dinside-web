/* ==========================================================================
   DinSide Website - Interactive JavaScript
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initMobileMenu();
  initMockupTabs();
  initInstallTabs();
  initDonateTabs();
  initFaqAccordion();
  initCopyButtons();
});

/* --------------------------------------------------------------------------
   Theme Switcher (Dark / Light)
   -------------------------------------------------------------------------- */
function initTheme() {
  const themeToggle = document.getElementById('themeToggle');
  const sunIcon = document.getElementById('sunIcon');
  const moonIcon = document.getElementById('moonIcon');

  const savedTheme = localStorage.getItem('dinside-theme') ||
    (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

  applyTheme(savedTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
      localStorage.setItem('dinside-theme', nextTheme);
    });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'light') {
      if (sunIcon) sunIcon.style.display = 'none';
      if (moonIcon) moonIcon.style.display = 'block';
    } else {
      if (sunIcon) sunIcon.style.display = 'block';
      if (moonIcon) moonIcon.style.display = 'none';
    }
  }
}

/* --------------------------------------------------------------------------
   Mobile Navigation Toggle
   -------------------------------------------------------------------------- */
function initMobileMenu() {
  const mobileToggle = document.getElementById('mobileToggle');
  const navMenu = document.getElementById('navMenu');

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
    });

    // Close when clicking nav links
    navMenu.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
      });
    });
  }
}

/* --------------------------------------------------------------------------
   Mockup Tab Switcher (ChatGPT / Gemini / Claude Demo)
   -------------------------------------------------------------------------- */
function initMockupTabs() {
  const tabs = document.querySelectorAll('.panel-tab');
  const chatBubble = document.getElementById('mockupChatBubble');

  const providerResponses = {
    chatgpt: "Chào bạn! Tôi đã nhận được ngữ cảnh trang web và vùng xem của bạn. DinSide đã đính kèm nội dung bài viết và phần bạn vừa bôi đen. Bạn muốn tôi tóm tắt hay giải thích chi tiết mục này?",
    gemini: "Tôi đã phân tích toàn bộ cấu trúc bài viết và vùng hiển thị. Dựa trên thông tin đính kèm từ DinSide, đoạn bạn chọn có 3 ý chính cần lưu ý...",
    claude: "Tôi đã nhận được nội dung trang và văn bản được trích xuất từ DinSide. Đây là phân tích logic và giải thích chuyên sâu cho câu hỏi của bạn:"
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const provider = tab.getAttribute('data-provider');
      if (chatBubble && providerResponses[provider]) {
        chatBubble.style.opacity = '0';
        setTimeout(() => {
          chatBubble.textContent = providerResponses[provider];
          chatBubble.style.opacity = '1';
        }, 150);
      }
    });
  });
}

/* --------------------------------------------------------------------------
   Installation Tabs (ZIP vs Git)
   -------------------------------------------------------------------------- */
function initInstallTabs() {
  const installTabs = document.querySelectorAll('.install-tab');
  const panels = document.querySelectorAll('.install-panel');

  installTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-tab');

      installTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      panels.forEach(panel => {
        if (panel.id === target) {
          panel.classList.remove('hidden');
        } else {
          panel.classList.add('hidden');
        }
      });
    });
  });
}

/* --------------------------------------------------------------------------
   Donation Tabs (Vietnam QR vs International)
   -------------------------------------------------------------------------- */
function initDonateTabs() {
  const donateTabs = document.querySelectorAll('.donate-tab-btn');
  const vnPanel = document.getElementById('donateVnPanel');
  const intlPanel = document.getElementById('donateIntlPanel');

  donateTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      donateTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const type = btn.getAttribute('data-type');
      if (type === 'vn') {
        if (vnPanel) vnPanel.classList.remove('hidden');
        if (intlPanel) intlPanel.classList.add('hidden');
      } else {
        if (vnPanel) vnPanel.classList.add('hidden');
        if (intlPanel) intlPanel.classList.remove('hidden');
      }
    });
  });
}

/* --------------------------------------------------------------------------
   FAQ Accordion
   -------------------------------------------------------------------------- */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (question) {
      question.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        // Optional: close other open items
        faqItems.forEach(i => i.classList.remove('open'));
        if (!isOpen) {
          item.classList.add('open');
        }
      });
    }
  });
}

/* --------------------------------------------------------------------------
   Clipboard Copy Utilities
   -------------------------------------------------------------------------- */
function initCopyButtons() {
  const copyButtons = document.querySelectorAll('[data-copy]');

  copyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const textToCopy = btn.getAttribute('data-copy');
      if (!textToCopy) return;

      navigator.clipboard.writeText(textToCopy).then(() => {
        showToast('Đã sao chép vào bộ nhớ tạm!');
      }).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Đã sao chép vào bộ nhớ tạm!');
      });
    });
  });
}

/* --------------------------------------------------------------------------
   Toast Notification Message
   -------------------------------------------------------------------------- */
let toastTimeout;
function showToast(message) {
  let toast = document.getElementById('toastMsg');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastMsg';
    toast.className = 'toast-msg';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
    <span>${message}</span>
  `;

  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}
