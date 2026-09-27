/* ==========================================================================
   DinSide Website - Interactive JavaScript (MultiFlex Theme)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initHeroDemoVideo();
  initMockupTabs();
  initInstallTabs();
  initFaqAccordion();
  initCopyButtons();
});

/* --------------------------------------------------------------------------
   Mobile Navigation Toggle
   -------------------------------------------------------------------------- */
function initMobileMenu() {
  const mobileBtn = document.getElementById('mobileMenuBtn');
  const navLinks = document.getElementById('navLinks');

  if (mobileBtn && navLinks) {
    mobileBtn.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
      });
    });
  }
}

/* --------------------------------------------------------------------------
   Hero Demo Video Interaction
   -------------------------------------------------------------------------- */
function initHeroDemoVideo() {
  const watchDemoBtn = document.getElementById('btnWatchDemo');
  const videoWindow = document.getElementById('heroVideoWindow');

  if (watchDemoBtn && videoWindow) {
    watchDemoBtn.addEventListener('click', (e) => {
      e.preventDefault();
      videoWindow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      videoWindow.classList.add('video-highlight-pulse');
      setTimeout(() => {
        videoWindow.classList.remove('video-highlight-pulse');
      }, 2000);
    });
  }
}

/* --------------------------------------------------------------------------
   Mockup Tab Switcher (ChatGPT / Gemini / Claude Demo)
   -------------------------------------------------------------------------- */
function initMockupTabs() {
  const pills = document.querySelectorAll('.mockup-pill');
  const chatMsg = document.getElementById('mockupChatMsg');

  const providerResponses = {
    chatgpt: "Chào bạn! Tôi đã nhận được ngữ cảnh trang web và vùng xem của bạn từ DinSide. Bạn muốn tôi tóm tắt hay giải thích chi tiết đoạn văn bản vừa bôi đen?",
    gemini: "Tôi đã phân tích toàn bộ cấu trúc bài viết và vùng hiển thị. Dựa trên thông tin đính kèm từ DinSide, đoạn Service Worker này có 3 điểm cốt lõi sau...",
    claude: "Tôi đã trích xuất ngữ cảnh kỹ thuật từ trang web qua DinSide. Đây là phân tích chi tiết về cơ chế truyền tải an toàn giữa các tiến trình:"
  };

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const provider = pill.getAttribute('data-provider');
      if (chatMsg && providerResponses[provider]) {
        chatMsg.style.opacity = '0';
        setTimeout(() => {
          chatMsg.textContent = providerResponses[provider];
          chatMsg.style.opacity = '1';
        }, 150);
      }
    });
  });
}

/* --------------------------------------------------------------------------
   Installation Tabs (ZIP vs Git)
   -------------------------------------------------------------------------- */
function initInstallTabs() {
  const installTabs = document.querySelectorAll('.install-tab-btn');
  const panels = document.querySelectorAll('.install-tab-content');

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
   FAQ Accordion
   -------------------------------------------------------------------------- */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item-mf');

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-q-btn');
    if (question) {
      question.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
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

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          showToast('Đã sao chép vào bộ nhớ tạm!');
        }).catch(() => fallbackCopy(textToCopy));
      } else {
        fallbackCopy(textToCopy);
      }
    });
  });

  function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('Đã sao chép vào bộ nhớ tạm!');
  }
}

/* --------------------------------------------------------------------------
   Toast Notification Message
   -------------------------------------------------------------------------- */
let toastTimeout;
function showToast(message) {
  let toast = document.getElementById('toastNotice');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastNotice';
    toast.className = 'toast-notice';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
    <span>${message}</span>
  `;

  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2400);
}
