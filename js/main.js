/* ==========================================================================
   DinSide Website - Interactive JavaScript (MultiFlex Theme)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initLanguage();
  initMobileMenu();
  initHeroDemoVideo();
  initMockupTabs();
  initInstallTabs();
  initFeatureCarousel();
  initFaqAccordion();
  initFileAttachDemo();
  initCopyButtons();
  initSmoothAnchors();
  initScrollTracking();
  initScrollReveal();
});

/* --------------------------------------------------------------------------
   Scroll Position Tracking (Giữ nguyên vị trí khi reload)
   -------------------------------------------------------------------------- */
/* File selection demo is a local visual simulation only. */
function initFileAttachDemo() {
  const demo = document.querySelector('[data-file-demo]');
  const button = demo?.querySelector('[data-file-demo-button]');
  const action = demo?.querySelector('[data-file-demo-action]');
  const status = demo?.querySelector('[data-file-demo-status]');
  if (!button || !action || !status) return;

  function showState(state, actionKey, statusKey) {
    demo.dataset.state = state;
    button.disabled = state === 'loading';
    const lang = document.documentElement.lang === 'en' ? 'en' : 'vi';
    for (const [element, key] of [[action, actionKey], [status, statusKey]]) {
      element.setAttribute('data-i18n', key);
      element.textContent = translations[lang]?.[key] || '';
    }
  }

  button.addEventListener('click', () => {
    if (demo.dataset.state === 'loading') return;
    showState('loading', 'release.files.demo.select', 'release.files.demo.loading');
    window.setTimeout(() => {
      showState('ready', 'release.files.demo.retry', 'release.files.demo.ready');
    }, 900);
  });
}

function initScrollTracking() {
  const KEY = 'dinside_scroll_pos';

  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  // Khôi phục vị trí chuẩn xác
  const saved = parseInt(sessionStorage.getItem(KEY), 10) || (history.state && history.state.scrollPos) || 0;

  const restoreToSaved = () => {
    if (saved > 30 && !window.__userHasScrolled) {
      window.scrollTo(0, saved);
    }
  };

  if (saved > 30) {
    restoreToSaved();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(restoreToSaved);
    }
    window.addEventListener('load', restoreToSaved);
    setTimeout(restoreToSaved, 300);
    setTimeout(restoreToSaved, 800);
  }

  // Chỉ cho phép ghi đè toạ độ khi người dùng THỰC SỰ chủ động cuộn
  // Ngăn chặn layout co giãn (font load, lang translate) làm tụt lùi vị trí khi reload liên tục
  let isTrackingActive = false;
  setTimeout(() => {
    isTrackingActive = true;
  }, 1000);

  window.__userHasScrolled = false;
  let ticking = false;

  const save = () => {
    if (!isTrackingActive && !window.__userHasScrolled) return;
    const y = Math.round(window.scrollY);
    try {
      sessionStorage.setItem(KEY, y.toString());
      if (history.replaceState) {
        history.replaceState(Object.assign({}, history.state, { scrollPos: y }), '');
      }
    } catch (_) {}
    ticking = false;
  };

  const onUserInteraction = () => {
    window.__userHasScrolled = true;
    isTrackingActive = true;
  };

  ['wheel', 'touchstart', 'touchmove', 'keydown', 'mousedown'].forEach(evt => {
    window.addEventListener(evt, onUserInteraction, { passive: true });
  });

  window.addEventListener('scroll', () => {
    if (!window.__userHasScrolled && !isTrackingActive) return;
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(save);
    }
  }, { passive: true });

  window.addEventListener('pagehide', () => {
    if (window.__userHasScrolled && isTrackingActive) save();
  });
  window.addEventListener('beforeunload', () => {
    if (window.__userHasScrolled && isTrackingActive) save();
  });
}

/* --------------------------------------------------------------------------
   Theme Switcher (Dark / Light Mode)
   -------------------------------------------------------------------------- */
function initTheme() {
  const THEME_KEY = 'dinside_theme';

  function getActiveTheme() {
    return document.documentElement.getAttribute('data-theme') ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }

  function updateTooltips(theme) {
    const isDark = theme === 'dark';
    const lang = document.documentElement.getAttribute('lang') || 'vi';
    let tooltip = '';
    if (typeof translations !== 'undefined' && translations[lang]) {
      tooltip = isDark ? translations[lang]['theme.toggleLight'] : translations[lang]['theme.toggleDark'];
    }
    if (!tooltip) {
      tooltip = isDark ? (lang === 'en' ? 'Switch to Light mode' : 'Chuyển sang giao diện Sáng') :
                         (lang === 'en' ? 'Switch to Dark mode' : 'Chuyển sang giao diện Tối');
    }
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      btn.setAttribute('title', tooltip);
      btn.setAttribute('aria-label', tooltip);
    });
  }

  function applyTheme(theme, persist = true) {
    document.documentElement.setAttribute('data-theme', theme);
    if (persist) {
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch (_) {}
    }
    updateTooltips(theme);
  }

  const buttons = document.querySelectorAll('.theme-toggle-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const current = getActiveTheme();
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next, true);
    });
  });

  if (window.matchMedia) {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', (e) => {
      try {
        const saved = localStorage.getItem(THEME_KEY);
        if (!saved) {
          applyTheme(e.matches ? 'dark' : 'light', false);
        }
      } catch (_) {}
    });
  }

  window.__updateThemeTooltips = () => updateTooltips(getActiveTheme());
  updateTooltips(getActiveTheme());
}

/* --------------------------------------------------------------------------
   Bilingual Language Switcher (VI / EN)
   -------------------------------------------------------------------------- */
let currentLanguage = 'vi';

function detectDefaultLanguage() {
  // 1. Nếu người dùng đã từng tự bấm chọn ngôn ngữ trước đó, ưu tiên lựa chọn đó
  try {
    const saved = localStorage.getItem('dinside_lang');
    if (saved && (saved === 'vi' || saved === 'en')) {
      return saved;
    }
  } catch (_) {}

  // 2. Kiểm tra Múi giờ của hệ điều hành máy tính (Timezone)
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timeZone) {
      // Múi giờ Việt Nam
      if (timeZone === 'Asia/Ho_Chi_Minh' || timeZone === 'Asia/Saigon') {
        return 'vi';
      }
      // Múi giờ các bang tại Mỹ hoặc châu Mỹ
      if (timeZone.startsWith('America/') || timeZone.startsWith('US/')) {
        return 'en';
      }
    }
  } catch (_) {}

  // 3. Kiểm tra danh sách ngôn ngữ ưu tiên trên máy (navigator.languages)
  try {
    const browserLangs = navigator.languages || [navigator.language || navigator.userLanguage || ''];
    for (const lang of browserLangs) {
      const l = lang.toLowerCase();
      if (l.startsWith('vi')) return 'vi';
      if (l.startsWith('en')) return 'en';
    }
  } catch (_) {}

  // Mặc định là Tiếng Việt nếu không xác định được
  return 'vi';
}

function initLanguage() {
  const initialLang = window.__initialLang || detectDefaultLanguage();
  setLanguage(initialLang, false);

  const langButtons = document.querySelectorAll('.lang-btn');
  langButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetLang = btn.getAttribute('data-lang');
      if (targetLang && targetLang !== currentLanguage) {
        setLanguage(targetLang, true);
      }
    });
  });
}

function setLanguage(lang, persist = true) {
  if (typeof translations === 'undefined' || !translations[lang]) {
    return;
  }
  currentLanguage = lang;
  if (persist) {
    try {
      localStorage.setItem('dinside_lang', lang);
    } catch (_) {}
  }

  // Update HTML lang attribute
  document.documentElement.setAttribute('lang', lang);

  // Update document title and meta description
  if (translations[lang]["page.title"]) {
    document.title = translations[lang]["page.title"];
  }
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && translations[lang]["page.description"]) {
    metaDesc.setAttribute('content', translations[lang]["page.description"]);
  }

  // Update text of elements with data-i18n
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang][key] !== undefined) {
      el.innerHTML = translations[lang][key];
    }
  });

  // Update active state on language buttons
  const langButtons = document.querySelectorAll('.lang-btn');
  langButtons.forEach(btn => {
    if (btn.getAttribute('data-lang') === lang) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Update theme toggle button tooltips to match language
  if (typeof window.__updateThemeTooltips === 'function') {
    window.__updateThemeTooltips();
  }
}

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
  const heroVideo = document.getElementById('heroDemoVideo');

  if (watchDemoBtn && videoWindow) {
    watchDemoBtn.addEventListener('click', (e) => {
      e.preventDefault();
      videoWindow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      videoWindow.classList.add('video-highlight-pulse');
      if (heroVideo) {
        heroVideo.currentTime = 0;
        heroVideo.play().catch(() => {});
      }
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
   Feature Carousel Component (Cult UI Pattern)
   -------------------------------------------------------------------------- */
function initFeatureCarousel() {
  const carouselCard = document.getElementById('installFeatureCarousel');
  if (!carouselCard) return;

  const pills = Array.from(carouselCard.querySelectorAll('.fc-step-pill'));
  const scenes = Array.from(carouselCard.querySelectorAll('.fc-scene'));
  const infoItems = Array.from(carouselCard.querySelectorAll('.fc-info-item'));
  const stage = document.getElementById('fcStage');

  if (pills.length === 0 || scenes.length === 0) return;

  let currentStep = 0;
  const totalSteps = pills.length;
  const CYCLE_INTERVAL = 4800; // ms per step
  let autoTimer = null;
  let isHovered = false;

  // 1. Mouse spotlight tracking (--x, --y coordinates)
  carouselCard.addEventListener('mousemove', (e) => {
    const rect = carouselCard.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    carouselCard.style.setProperty('--x', `${x}px`);
    carouselCard.style.setProperty('--y', `${y}px`);
  });

  // 2. Step Transition
  function goToStep(index) {
    currentStep = (index + totalSteps) % totalSteps;

    // Update Step Pills
    pills.forEach((pill, i) => {
      pill.classList.remove('is-active', 'is-completed');
      if (i === currentStep) {
        pill.classList.add('is-active');
      } else if (i < currentStep) {
        pill.classList.add('is-completed');
      }
    });

    // Update Scenes
    scenes.forEach((scene, i) => {
      scene.classList.toggle('is-active', i === currentStep);
    });

    // Update Text Layer
    infoItems.forEach((item, i) => {
      item.classList.toggle('is-active', i === currentStep);
    });

    // Reset cycle countdown
    startTimer();
  }

  // 3. Clean Auto-Cycle Timer (Cult UI Pattern)
  function startTimer() {
    clearInterval(autoTimer);
    if (!isHovered) {
      autoTimer = setInterval(() => {
        goToStep(currentStep + 1);
      }, CYCLE_INTERVAL);
    }
  }

  // 4. Hover Pause & Resume
  carouselCard.addEventListener('mouseenter', () => {
    isHovered = true;
    clearInterval(autoTimer);
  });

  carouselCard.addEventListener('mouseleave', () => {
    isHovered = false;
    startTimer();
  });

  // 5. Interactive Click Handlers
  pills.forEach((pill, idx) => {
    pill.addEventListener('click', (e) => {
      e.preventDefault();
      goToStep(idx);
    });
  });

  if (stage) {
    stage.addEventListener('click', () => {
      goToStep(currentStep + 1);
    });
  }

  // Initial trigger
  goToStep(0);
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

      const toastMsg = (typeof translations !== 'undefined' && translations[currentLanguage] && translations[currentLanguage]["toast.copied"])
        ? translations[currentLanguage]["toast.copied"]
        : 'Đã sao chép vào bộ nhớ tạm!';

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          showToast(toastMsg);
        }).catch(() => fallbackCopy(textToCopy, toastMsg));
      } else {
        fallbackCopy(textToCopy, toastMsg);
      }
    });
  });

  function fallbackCopy(text, toastMsg) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast(toastMsg);
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

/* --------------------------------------------------------------------------
   Smooth Anchor Navigation Links
   -------------------------------------------------------------------------- */
function initSmoothAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (!targetId || targetId === '#') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({ behavior: 'smooth' });
        if (history.pushState) {
          history.pushState(null, '', targetId);
        }
      }
    });
  });
}

/* --------------------------------------------------------------------------
   Scroll Reveal Motion (IntersectionObserver)
   -------------------------------------------------------------------------- */
function initScrollReveal() {
  const animatedElements = document.querySelectorAll('.reveal-on-scroll, .reveal-left, .reveal-right');

  // Immediately mark elements that are already above or inside viewport
  // (Prevents flicker/jump when reloading at 23% or any scroll offset)
  const windowTop = window.scrollY || window.pageYOffset || 0;
  const windowBottom = windowTop + window.innerHeight;

  animatedElements.forEach(el => {
    const rect = el.getBoundingClientRect();
    const elemTop = rect.top + windowTop;
    if (elemTop < windowBottom) {
      el.classList.add('is-revealed');
    }
  });

  if (!('IntersectionObserver' in window)) {
    animatedElements.forEach(el => el.classList.add('is-revealed'));
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        obs.unobserve(entry.target);
      }
    });
  }, {
    root: null,
    rootMargin: '0px 0px -40px 0px',
    threshold: 0.08
  });

  animatedElements.forEach(el => {
    if (!el.classList.contains('is-revealed')) {
      observer.observe(el);
    }
  });
}



