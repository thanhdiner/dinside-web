const t = (source, ...values) => {
  if (globalThis.DinSideI18n?.t) return globalThis.DinSideI18n.t(source, ...values);
  const key = Array.isArray(source)
    ? source.reduce((result, part, index) => result + (index ? `{${index - 1}}` : '') + part, '')
    : String(source ?? '');
  return key.replace(/\{(\d+)\}/g, (match, index) => index < values.length ? String(values[index]) : match);
};
function readCachedTheme(key) {
  try {
    const theme = localStorage.getItem(key);
    return theme === 'light' || theme === 'dark' ? theme : '';
  } catch (_) {
    return '';
  }
}

function providerThemeKey(providerId) {
  // Discard Z.ai values saved by the old background-color theme detector.
  if (providerId === 'zai') return 'dinsideProviderTheme:zai:root-class';
  return `dinsideProviderTheme:${providerId}`;
}

function cachedProviderTheme(providerId) {
  return readCachedTheme(providerThemeKey(providerId)) || (['gemini', 'zai'].includes(providerId) ? 'light' : 'dark');
}

const state = {
  pageContext: null,
  screenshot: null,
  activeTabId: null,
  cache: new Map(),
  latestViewport: new Map(),
  latestPageState: null,
  contextWarmTimer: null,
  contextWarmIdleId: null,
  contextWarmInFlight: false,
  contextMode: 'smart',
  contextDisplayMode: 'compact',
  compressionMode: 'balanced',
  pageUpdateMode: 'smart',
  smartPageKey: '',
  nextPromptExclusions: { page: false, viewport: false },
  contextInspectorRefreshTimer: null,
  contextInspectorExpanded: new Set(),
  contextInspectorPane: '',
  expandedSavedViewports: new Set(),
  viewportWarmTimer: null,
  viewportWarmInFlight: false,
  pageRefreshInFlight: new Map(),
  pageRefreshAt: new Map(),
  contextReadError: '',
  pdfManualUpload: null,
  pdfDetectionCache: new Map(),
  sent: new Map(),
  sentPageSnapshots: new Map(),
  sentViewport: new Map(),
  sentAttached: new Map(),
  pendingDeliveries: new Map(),
  deliveryEpoch: 0,
  lastForwardedSelection: '',
  lastForwardedSelectionFrame: '',
  lastKnownDocumentSelection: null,
  lastKnownDocumentSelectionTabId: null,
  selectedTextContextEnabled: true,
  quickAskEnabled: true,
  quickAskCustomActions: [],
  quickAskCustomEditorOpen: false,
  quickAskCustomEditingId: '',
  quickAskCustomIcon: 'sparkles',
  quickAskCustomPanelOpen: false,
  quickAskConsumeInFlight: false,
  donationMethod: '',
  donationMethodManuallyChosen: false,
  attachedPages: new Map(),
  pinnedMenuCollapsed: { pinned: false, tabs: false },
  openTabsSnapshot: null,
  openTabsSnapshotAt: 0,
  openTabsRefreshPromise: null,
  openTabsRevision: 0,
  openTabsRefreshTimer: null,
  // Page context is the extension's primary behavior. A persisted explicit
  // `false` still disables it, but a fresh install/reload must not silently
  // start with context disabled while storage is loading.
  pageFollowEnabled: true,
  skills: [],
  editingSkillId: null,
  appendNextSelection: false,
  appendBaselineSelection: '',
  appendPendingSelection: false,
  toolbarPosition: 'top',
  themeMode: 'chatgpt',
  chatgptTheme: readCachedTheme('dinsideStartupTheme') || 'dark',
  keepLastChat: false,
  activeChatUrl: '',
  lastChatUrls: {},
  googleAccountSlots: { gemini: '', googleaimode: '', googleaistudio: '', notebooklm: '' },
  drawModePages: new Map(),
  captureActive: false,
  captureTabId: null,
  bridgeReady: false,
  geminiUiReady: false,
  mimoUiReady: false,
  googleAiStudioUiReady: false,
  deepseekUiReady: false,
  bridgeVersion: '',
  bridgeCheckTimer: null,
  bridgeReloadAttempted: false
};

const $ = (id) => document.getElementById(id);
let pageFollowSettingPromise = null;
const SEND_CONTEXT_BUDGET_MS = 100;
const CONTEXT_CACHE_LIMIT = 6;
const PRELOAD_IDLE_DELAY_MS = 500;
const PRELOAD_REFRESH_THROTTLE_MS = 5000;
const SMART_CACHE_FRESH_MS = 15000;
const SMART_SMALL_PAGE_SCREENS = 2;
const SMART_CHEAP_PAGE_CHARS = 7000;
const SMART_MODERATE_ARTICLE_CHARS = 18000;
const SMART_EXPENSIVE_PAGE_CHARS = 26000;
const SMART_HUGE_PAGE_SCREENS = 10;
const DOCUMENT_TEXT_CHAR_LIMIT = 50000;
const MAX_PDF_BYTES = 50 * 1024 * 1024;
const PDF_TEXT_BATCH_SIZE = 6;
const COMPRESSION_MODES = ['off', 'balanced', 'aggressive'];
const CONTEXT_DISPLAY_MODES = ['visible', 'compact'];
const PAGE_UPDATE_MODES = ['smart', 'diff', 'full'];
const SKILL_LIFETIMES = ['once', 'chat', 'always'];
const SKILL_LIFETIME_LABELS = {
  once: 'Once',
  chat: 'Chat',
  always: 'Always'
};
const SKILL_LIFETIME_MENU_LABELS = {
  once: 'This message',
  chat: 'This chat',
  always: 'Always'
};
const PAGE_DIFF_SMART_RATIO = 0.4;
const PAGE_DIFF_FORCE_RATIO = 0.85;
const PAGE_DIFF_MAX_BLOCKS = 700;
const PINNED_CONTEXT_STORAGE_KEY = 'dinsidePinnedPagesV1';
const PINNED_MENU_UI_STORAGE_KEY = 'dinsidePinnedMenuUiV1';
const CONTEXT_INSPECTOR_PANE_STORAGE_KEY = 'dinsideContextInspectorPane';
const QUICK_ASK_PENDING_STORAGE_KEY = 'dinsideQuickAskPending';
const QUICK_ASK_CUSTOM_ACTIONS_STORAGE_KEY = 'dinsideQuickAskCustomActionsV1';
const GOOGLE_ACCOUNT_SLOTS_STORAGE_KEY = 'dinsideGoogleAccountSlotsV1';
const QUICK_ASK_CUSTOM_ACTION_LIMIT = 8;
const SUPPORT_EMAIL = 'huynhvanthanh.dev@gmail.com';
const DONATION_ACCOUNT_NUMBER = '1061960104';
const BUY_ME_A_COFFEE_URL = 'https://www.buymeacoffee.com/thanhdiner';
const QUICK_ASK_ICON_KEYS = ['sparkles','wand','bot','brain','lightbulb','pencil','pen','languages','spellcheck','check','listchecks','alignleft','code','terminal','braces','bug','search','scansearch','book','filetext','clipboard','message','messages','quote','hash','link','globe','zap','star','heart','bookmark','tag'];
const QUICK_ASK_ICON_SVGS = {
  sparkles: '<svg viewBox="0 0 24 24"><path d="m12 3 1.35 3.65L17 8l-3.65 1.35L12 13l-1.35-3.65L7 8l3.65-1.35Z"/><path d="m18 13 .8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8Z"/></svg>',
  pencil: '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  wand: '<svg viewBox="0 0 24 24"><path d="m15 4 5 5L7 22l-5-5Z"/><path d="m14 5 5 5"/><path d="M6 3v4M4 5h4M19 14v4M17 16h4"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m20 6-11 11-5-5"/></svg>',
  code: '<svg viewBox="0 0 24 24"><path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2Z"/><path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7Z"/></svg>',
  message: '<svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/></svg>',
  bot:'<svg viewBox="0 0 24 24"><rect x="4" y="7" width="16" height="13" rx="2"/><path d="M9 3h6M12 3v4M8 12h.01M16 12h.01M8 16h8"/></svg>', brain:'<svg viewBox="0 0 24 24"><path d="M9.5 4A3.5 3.5 0 0 0 6 7.5v.2A3.5 3.5 0 0 0 4 11a3.5 3.5 0 0 0 2 3.2v.3A3.5 3.5 0 0 0 9.5 18H12V6.5A2.5 2.5 0 0 0 9.5 4ZM14.5 4A3.5 3.5 0 0 1 18 7.5v.2a3.5 3.5 0 0 1 2 3.3 3.5 3.5 0 0 1-2 3.2v.3a3.5 3.5 0 0 1-3.5 3.5H12"/></svg>', lightbulb:'<svg viewBox="0 0 24 24"><path d="M9 18h6M10 22h4M8.5 15.5A7 7 0 1 1 15.5 15.5c-.9.7-1.5 1.5-1.5 2.5h-4c0-1-.6-1.8-1.5-2.5Z"/></svg>', pen:'<svg viewBox="0 0 24 24"><path d="m12 19 7-7 3 3-7 7-4 1 1-4ZM18 13l3 3M3 21l6-6"/></svg>', languages:'<svg viewBox="0 0 24 24"><path d="M4 5h7M7.5 3v2M5 9c2.5 0 5-2 5-4M5 5c0 2 2 4 5 5M13 19l4-10 4 10M14.5 15h5"/></svg>', spellcheck:'<svg viewBox="0 0 24 24"><path d="m6 16 4-12 4 12M7.5 12h5M15 19l2 2 4-5"/></svg>', listchecks:'<svg viewBox="0 0 24 24"><path d="m3 6 1.5 1.5L7 5M10 6h11M3 12l1.5 1.5L7 11M10 12h11M3 18l1.5 1.5L7 17M10 18h11"/></svg>', alignleft:'<svg viewBox="0 0 24 24"><path d="M4 6h16M4 10h10M4 14h16M4 18h10"/></svg>', terminal:'<svg viewBox="0 0 24 24"><path d="m4 6 5 5-5 5M11 18h9"/></svg>', braces:'<svg viewBox="0 0 24 24"><path d="M8 3H6a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h2M16 3h2a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-2"/></svg>', bug:'<svg viewBox="0 0 24 24"><rect x="7" y="6" width="10" height="14" rx="5"/><path d="M9 6V4M15 6V4M4 10h3M17 10h3M4 16h3M17 16h3M12 10v10"/></svg>', scansearch:'<svg viewBox="0 0 24 24"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><circle cx="11" cy="11" r="3"/><path d="m13.5 13.5 2 2"/></svg>', filetext:'<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></svg>', clipboard:'<svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6"/></svg>', messages:'<svg viewBox="0 0 24 24"><path d="M17 15h2l3 2V7a3 3 0 0 0-3-3H9a3 3 0 0 0-3 3v1"/><path d="M15 11a3 3 0 0 0-3-3H5a3 3 0 0 0-3 3v8l3-2h7a3 3 0 0 0 3-3Z"/></svg>', quote:'<svg viewBox="0 0 24 24"><path d="M9 11H5a4 4 0 0 1 4-4v8a4 4 0 0 1-4 4M19 11h-4a4 4 0 0 1 4-4v8a4 4 0 0 1-4 4"/></svg>', hash:'<svg viewBox="0 0 24 24"><path d="M5 9h14M4 15h14M10 3 8 21M16 3l-2 18"/></svg>', link:'<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1"/></svg>', globe:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>', zap:'<svg viewBox="0 0 24 24"><path d="M13 2 3 14h9l-1 8 10-12h-9Z"/></svg>', star:'<svg viewBox="0 0 24 24"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2L5.8 21 7 14.2 2 9.3l6.9-1Z"/></svg>', heart:'<svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>', bookmark:'<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4Z"/></svg>', tag:'<svg viewBox="0 0 24 24"><path d="M20 13 11 22l-9-9V4h9Z"/><circle cx="7" cy="9" r="1"/></svg>'
};
function quickAskIconSvg(key) { return QUICK_ASK_ICON_SVGS[key] || QUICK_ASK_ICON_SVGS.sparkles; }
const PINNED_CONTEXT_LIMIT = 10;
const COMPRESSION_CONFIG = {
  balanced: {
    pageChars: 26000,
    attachedChars: 16000,
    viewportChars: 6500,
    links: 24,
    images: 12,
    buttons: 18,
    semanticItems: 40,
    viewportImages: 12,
    viewportHeadings: 18,
    dedupeMinChars: 24
  },
  aggressive: {
    pageChars: 11000,
    attachedChars: 7000,
    viewportChars: 3600,
    links: 12,
    images: 6,
    buttons: 10,
    semanticItems: 20,
    viewportImages: 6,
    viewportHeadings: 10,
    dedupeMinChars: 10
  }
};

function getCompressionConfig(mode = state.compressionMode) {
  return COMPRESSION_CONFIG[mode] || null;
}

function normalizeCompressionLine(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function dedupeContextText(value = '', mode = state.compressionMode) {
  const config = getCompressionConfig(mode);
  const input = String(value || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!config || !input) return input;

  const seen = new Set();
  const output = [];
  let lastKey = '';
  let previousBlank = false;

  for (const rawLine of input.split('\n')) {
    const line = rawLine.replace(/[ \t]+$/g, '');
    const key = normalizeCompressionLine(line);
    if (!key) {
      if (!previousBlank && output.length) output.push('');
      previousBlank = true;
      continue;
    }
    previousBlank = false;
    if (key === lastKey) continue;
    lastKey = key;

    const looksCodeLike = /[{};]|^\s*[\[\]()<>]/.test(line) || /^[-+*]\s/.test(key);
    const globalKey = key.toLowerCase();
    if (!looksCodeLike && key.length >= config.dedupeMinChars) {
      if (seen.has(globalKey)) continue;
      seen.add(globalKey);
    }
    output.push(line);
  }

  return output.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function distributedTextSlice(value = '', budget = 0) {
  const text = String(value || '');
  if (!budget || text.length <= budget) return text;

  const marker = '\n\n[… compressed …]\n\n';
  const usable = Math.max(1000, budget - marker.length * 4);
  const headSize = Math.floor(usable * 0.46);
  const tailSize = Math.floor(usable * 0.20);
  const middleBudget = Math.max(0, usable - headSize - tailSize);
  const chunkSize = Math.max(250, Math.floor(middleBudget / 3));
  const middleStart = headSize;
  const middleEnd = Math.max(middleStart, text.length - tailSize);
  const middle = text.slice(middleStart, middleEnd);
  const chunks = [];

  if (middle && middleBudget > 0) {
    for (const ratio of [0.2, 0.5, 0.8]) {
      const center = Math.floor(middle.length * ratio);
      const start = Math.max(0, Math.min(middle.length - chunkSize, center - Math.floor(chunkSize / 2)));
      const chunk = middle.slice(start, start + chunkSize).trim();
      if (chunk) chunks.push(chunk);
    }
  }

  return [
    text.slice(0, headSize).trimEnd(),
    ...chunks.map((chunk) => `${marker}${chunk}`),
    `${marker}${text.slice(-tailSize).trimStart()}`
  ].filter(Boolean).join('').slice(0, budget);
}

function compressContextText(value = '', mode = state.compressionMode, budget = 0) {
  if (mode === 'off') return String(value || '');
  return distributedTextSlice(dedupeContextText(value, mode), budget);
}

function uniqueContextItems(items = [], limit = Infinity, keyFn = (item) => JSON.stringify(item)) {
  const seen = new Set();
  const output = [];
  for (const item of items || []) {
    const key = String(keyFn(item) || '').trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(item);
    if (output.length >= limit) break;
  }
  return output;
}

function selectViewportBlocks(blocks = [], budget = 0) {
  const unique = uniqueContextItems(blocks, Infinity, (item) => `${item?.tag || ''}|${normalizeCompressionLine(item?.text || '')}`);
  const totalChars = unique.reduce((sum, item) => sum + String(item?.text || '').length, 0);
  if (!budget || totalChars <= budget) return unique;

  const selected = [];
  const selectedIndexes = new Set();
  const takeFromStart = Math.floor(budget * 0.64);
  let used = 0;
  for (let i = 0; i < unique.length && used < takeFromStart; i += 1) {
    const size = String(unique[i]?.text || '').length;
    if (used + size > takeFromStart && selected.length) break;
    selected.push({ index: i, item: unique[i] });
    selectedIndexes.add(i);
    used += size;
  }

  for (let i = unique.length - 1; i >= 0 && used < budget; i -= 1) {
    if (selectedIndexes.has(i)) continue;
    const size = String(unique[i]?.text || '').length;
    if (used + size > budget && selected.length) continue;
    selected.push({ index: i, item: unique[i] });
    selectedIndexes.add(i);
    used += size;
  }

  return selected.sort((a, b) => a.index - b.index).map((entry) => entry.item);
}

function compressPageContextForEnvelope(context, mode = state.compressionMode, kind = 'page') {
  if (!context || mode === 'off') return context;
  const config = getCompressionConfig(mode);
  if (!config) return context;
  const budget = kind === 'attached' ? config.attachedChars : config.pageChars;
  const originalTextChars = String(context.text || '').length;
  const originalItems =
    (context.links || []).length +
    (context.images || []).length +
    (context.buttons || []).length +
    (context.semanticItems || []).length;

  const compressed = {
    ...context,
    text: compressContextText(context.text || '', mode, budget),
    links: uniqueContextItems(context.links || [], config.links, (item) => `${item?.href || ''}|${item?.text || item?.title || ''}`),
    images: uniqueContextItems(context.images || [], config.images, (item) => item?.src || item?.alt || ''),
    buttons: uniqueContextItems(context.buttons || [], config.buttons, (item) => item?.label || ''),
    semanticItems: uniqueContextItems(context.semanticItems || [], config.semanticItems, (item) => `${item?.role || ''}|${item?.text || ''}`)
  };
  const compressedItems =
    compressed.links.length + compressed.images.length + compressed.buttons.length + compressed.semanticItems.length;
  compressed.compression = {
    mode,
    originalTextChars,
    compressedTextChars: compressed.text.length,
    removedItems: Math.max(0, originalItems - compressedItems)
  };
  return compressed;
}

function compressViewportForEnvelope(viewport, mode = state.compressionMode) {
  if (!viewport || mode === 'off') return viewport;
  const config = getCompressionConfig(mode);
  if (!config) return viewport;
  const originalTextChars = (viewport.blocks || []).reduce((sum, item) => sum + String(item?.text || '').length, 0);
  const blocks = selectViewportBlocks(viewport.blocks || [], config.viewportChars);
  const compressedTextChars = blocks.reduce((sum, item) => sum + String(item?.text || '').length, 0);
  return {
    ...viewport,
    blocks,
    headings: uniqueContextItems(viewport.headings || [], config.viewportHeadings, (item) => item),
    images: uniqueContextItems(viewport.images || [], config.viewportImages, (item) => item?.src || item?.alt || ''),
    videos: uniqueContextItems(viewport.videos || [], mode === 'aggressive' ? 4 : 8, (item) => item?.id || item?.src || JSON.stringify(item)),
    compression: {
      mode,
      originalTextChars,
      compressedTextChars,
      removedItems: Math.max(0, (viewport.blocks || []).length - blocks.length)
    }
  };
}

function compressContextPayload(payload) {
  if (!payload || state.compressionMode === 'off') return payload;
  return {
    ...payload,
    context: compressPageContextForEnvelope(payload.context, state.compressionMode, 'page'),
    viewport: compressViewportForEnvelope(payload.viewport, state.compressionMode),
    attachedPages: (payload.attachedPages || []).map((item) =>
      compressPageContextForEnvelope(item, state.compressionMode, 'attached')
    )
  };
}

function formatCompressionSummary(compression) {
  if (!compression?.mode) return '';
  const original = Number(compression.originalTextChars || 0);
  const compressed = Number(compression.compressedTextChars || 0);
  const removedItems = Number(compression.removedItems || 0);
  if (!original && !removedItems) return '';
  const saved = original > 0 ? Math.max(0, Math.round((1 - compressed / original) * 100)) : 0;
  const label = compression.mode === 'aggressive' ? 'Aggressive' : 'Balanced';
  const textPart = original ? `text ${original.toLocaleString()} → ${compressed.toLocaleString()} chars${saved ? ` (${saved}% smaller)` : ''}` : '';
  const itemPart = removedItems ? `metadata -${removedItems} items` : '';
  return `Compression: ${label} · ${[textPart, itemPart].filter(Boolean).join(' · ')}`;
}

function formatExtractorSummary(context) {
  if (context?.extractor === 'google-docs-export') {
    return 'Extractor: Google Docs text export';
  }
  if (context?.extractor === 'pdfjs') {
    const pageCount = Number(context.pageCount || 0);
    const elapsed = Number(context.extractorMs);
    return [
      'Extractor: PDF.js',
      pageCount ? `${pageCount} page${pageCount === 1 ? '' : 's'}` : '',
      Number.isFinite(elapsed) ? `${elapsed.toFixed(1)} ms` : ''
    ].filter(Boolean).join(' · ');
  }
  if (!context?.extractor || !String(context.extractor).startsWith('readability')) return '';
  const elapsed = Number(context.extractorMs);
  return Number.isFinite(elapsed)
    ? `Extractor: Readability · ${elapsed.toFixed(1)} ms`
    : 'Extractor: Readability';
}

function normalizeContextPrompt(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function promptScopeScores(prompt = '', liveState = null) {
  const text = normalizeContextPrompt(prompt);
  let localScore = state.selectedTextContextEnabled && liveState?.selectedText ? 6 : 0;
  let globalScore = 0;

  const localStrong = [
    'doan nay', 'cho nay', 'phan nay', 'o day', 'ngay day', 'dang xem', 'dang nhin',
    'tren man hinh', 'current viewport', 'current view', 'this section', 'this part',
    'this bit', 'right here', 'visible here', 'on screen'
  ];
  const localWeak = ['cai nay', 'this one', 'this'];
  const globalStrong = [
    'toan bo', 'ca bai', 'doc het', 'whole page', 'entire page', 'whole article',
    'entire article', 'read the whole', 'full page', 'full article'
  ];
  const globalTasks = [
    'tom tat', 'summarize', 'summary', 'phan tich', 'analyze', 'analyse', 'danh gia',
    'y chinh', 'noi dung chinh', 'overview', 'what is this about', 'what do you think',
    'giai thich', 'doc thu', 'read this', 'review this'
  ];
  const pageRefs = [
    'bai nay', 'trang nay', 'repo nay', 'repository nay', 'tai lieu nay', 'readme',
    'this article', 'this page', 'this repo', 'this repository', 'this document'
  ];

  for (const cue of localStrong) if (text.includes(cue)) localScore += 4;
  for (const cue of localWeak) if (text.includes(cue)) localScore += 1;
  for (const cue of globalStrong) if (text.includes(cue)) globalScore += 5;
  for (const cue of globalTasks) if (text.includes(cue)) globalScore += 2;
  for (const cue of pageRefs) if (text.includes(cue)) globalScore += 3;

  return { localScore, globalScore };
}

function pageScreenCount(liveState, viewport) {
  const documentHeight = Number(viewport?.documentHeight || liveState?.documentHeight || 0);
  const viewportHeight = Number(viewport?.viewportHeight || liveState?.viewportHeight || 0);
  if (!documentHeight || !viewportHeight) return Infinity;
  return Math.max(1, documentHeight / viewportHeight);
}

function getSmartPageSignals(liveState, viewport, context = null) {
  const screens = pageScreenCount(liveState, viewport);
  const textLength = Number(liveState?.textLength || context?.text?.length || 0);
  const articleCount = Number(liveState?.articleCount || 0);
  const headingCount = Number(liveState?.headingCount || 0);
  const linkCount = Number(liveState?.linkCount || 0);
  const feedLike = Boolean(liveState?.feedLike || (articleCount >= 3 && linkCount >= 12));
  const articleLike = !feedLike && articleCount === 1 && textLength >= 1200;
  const specialDocumentKind = getSpecialDocumentKind(
    liveState?.url || context?.url || viewport?.url || '',
    liveState?.title || context?.title || viewport?.title || ''
  );
  const documentLike = Boolean(specialDocumentKind) ||
    (!feedLike && !articleLike && headingCount >= 3 && textLength >= 1800);
  const smallPage = Number.isFinite(screens) && screens <= SMART_SMALL_PAGE_SCREENS;
  const cheapFull = !feedLike && textLength > 0 && textLength <= SMART_CHEAP_PAGE_CHARS;
  const moderateArticle = articleLike && textLength <= SMART_MODERATE_ARTICLE_CHARS;
  const expensive = feedLike || textLength >= SMART_EXPENSIVE_PAGE_CHARS || screens >= SMART_HUGE_PAGE_SCREENS;
  const pageKind = feedLike ? 'feed' : articleLike ? 'article' : documentLike ? 'document' : 'generic';

  return {
    screens, textLength, articleCount, headingCount, linkCount, feedLike, articleLike,
    documentLike, specialDocumentKind, smallPage, cheapFull, moderateArticle, expensive, pageKind
  };
}

function chooseSmartContextStrategy({ promptText = '', liveState, viewport, context, key, pageChanged = false }) {
  const signals = getSmartPageSignals(liveState, viewport, context);
  const scope = promptScopeScores(promptText, liveState);
  const refreshedAt = state.pageRefreshAt.get(key) || 0;
  const cacheFresh = Boolean(
    context && refreshedAt && Date.now() - refreshedAt <= SMART_CACHE_FRESH_MS && !liveState?.dirty
  );
  const fullStrategy = cacheFresh ? 'cache-full' : 'refresh-full';
  const base = { ...signals, ...scope, cacheFresh };

  // Google Docs and Chrome's PDF viewer do not expose reliable viewport DOM.
  // Their dedicated extractors are the only useful source of document content.
  if (signals.specialDocumentKind) {
    return { ...base, strategy: fullStrategy, reason: cacheFresh ? 'special-document-fresh-cache' : 'special-document' };
  }

  // Intent is scored rather than treated as an exact keyword switch. Strong
  // local/global phrasing can override the page heuristic, but ambiguous prompts
  // fall back to content cost and page type.
  if (scope.localScore >= scope.globalScore + 2) {
    return { ...base, strategy: 'viewport', reason: 'local-scope-score' };
  }
  if (scope.globalScore >= scope.localScore + 2) {
    return { ...base, strategy: fullStrategy, reason: cacheFresh ? 'global-scope-fresh-cache' : 'global-scope-score' };
  }

  // Cheap pages are cheaper to send whole than to guess what the user meant.
  if (signals.cheapFull || signals.moderateArticle || (signals.smallPage && !signals.feedLike)) {
    return { ...base, strategy: fullStrategy, reason: cacheFresh ? 'cheap-page-fresh-cache' : 'cheap-page' };
  }

  // Feeds/infinite or genuinely expensive pages stay viewport-first. Add tiny
  // page metadata so an ambiguous prompt still has page-level orientation.
  if (signals.expensive || signals.feedLike) {
    return { ...base, strategy: 'viewport-meta', reason: pageChanged ? 'expensive-page-changed' : 'expensive-page' };
  }

  // Moderate structured documents can still be worth reading as a whole even
  // when the user's wording contains no known cue.
  if (signals.documentLike && signals.textLength <= SMART_MODERATE_ARTICLE_CHARS) {
    return { ...base, strategy: fullStrategy, reason: cacheFresh ? 'moderate-document-fresh-cache' : 'moderate-document' };
  }

  return { ...base, strategy: 'viewport-meta', reason: 'ambiguous-scope' };
}

function waitForBudget(promise, ms = SEND_CONTEXT_BUDGET_MS, fallback = null) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => finish(fallback), ms);
    Promise.resolve(promise).then(finish, () => finish(fallback));
  });
}

function makeMinimalPageContext(tab, liveState, viewport) {
  return {
    title: liveState?.title || viewport?.title || tab?.title || '',
    url: liveState?.url || viewport?.url || tab?.url || '',
    text: '',
    links: [],
    images: [],
    buttons: [],
    semanticItems: [],
    partial: true,
    capturedAt: Date.now()
  };
}

function makeSmartPageMetaContext(tab, liveState, viewport, decision) {
  const screens = Number.isFinite(decision?.screens) ? decision.screens.toFixed(1) : 'unknown';
  return {
    title: liveState?.title || viewport?.title || tab?.title || '',
    url: liveState?.url || viewport?.url || tab?.url || '',
    text: [
      `Page type: ${decision?.pageKind || 'generic'}`,
      `Approx page text: ${decision?.textLength || 0} characters`,
      `Approx page length: ${screens} viewports`,
      `Articles: ${decision?.articleCount || 0} · Headings: ${decision?.headingCount || 0} · Links: ${decision?.linkCount || 0}`
    ].join('\n'),
    links: [],
    images: [],
    buttons: [],
    semanticItems: [],
    partial: true,
    capturedAt: Date.now()
  };
}

const providerManager = window.DinSideProviders;
function getActiveProvider() {
  return providerManager?.getActive?.() || null;
}
function isActiveProviderUiReady() {
  const providerId = getActiveProvider()?.id;
  // Gemini needs an extra layout-stability signal before revealing the frame.
  // DeepSeek does not: its bridge runs at document_idle and is enough to prove
  // the provider document is alive. Waiting on DeepSeek UI geometry can hang
  // forever on the sign-in/CAPTCHA layout and leave the loading overlay stuck.
  if (providerId === 'gemini') return state.geminiUiReady;
  if (providerId === 'mimo') return state.mimoUiReady;
  if (providerId === 'googleaistudio') return state.googleAiStudioUiReady;
  return true;
}
function getProviderName() {
  return getActiveProvider()?.name || 'AI';
}
function getProviderFrame() {
  return providerManager?.getFrame?.() || $('providerFrame');
}

function postToEmbeddedProvider(message, { handshake = false } = {}) {
  if (!handshake && !state.bridgeReady) return false;
  try {
    return providerManager?.post?.(message, { handshake }) === true;
  } catch (error) {
    // During iframe navigation the old recipient can briefly still be the
    // extension document. Do not spam SecurityError or mark data as delivered.
    if (error?.name === 'SecurityError') {
      state.bridgeReady = false;
      return false;
    }
    console.warn(`[DinSide] could not message embedded ${getProviderName()}`, error);
    return false;
  }
}
function ensurePageFollowSettingLoaded() {
  if (pageFollowSettingPromise) return pageFollowSettingPromise;

  pageFollowSettingPromise = chrome.storage.local.get('dinsidePageFollowEnabled')
    .then(async (saved) => {
      const hasSetting = Object.prototype.hasOwnProperty.call(
        saved,
        'dinsidePageFollowEnabled'
      );
      state.pageFollowEnabled = hasSetting
        ? saved.dinsidePageFollowEnabled !== false
        : true;
      if (!hasSetting) {
        await chrome.storage.local.set({ dinsidePageFollowEnabled: true });
      }
      return state.pageFollowEnabled;
    })
    .catch((error) => {
      console.warn('[DinSide] could not load page context setting; using on', error);
      state.pageFollowEnabled = true;
      return true;
    });

  return pageFollowSettingPromise;
}

let statusText = () => t('No page context');
function setStatus(text, mode = 'idle') {
  statusText = typeof text === 'function' ? text : () => text;
  $('contextStatus').textContent = t(statusText());
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

function isRestrictedUrl(url = '') {
  if (/^(chrome|edge|opera|about|devtools|chrome-extension):/i.test(url)) return true;

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();
    return hostname === 'chromewebstore.google.com' ||
      (hostname === 'chrome.google.com' && pathname.startsWith('/webstore')) ||
      (hostname === 'microsoftedge.microsoft.com' && pathname.startsWith('/addons')) ||
      hostname === 'addons.opera.com';
  } catch (_) {
    return false;
  }
}

function makePageKey(tabId, url) {
  return `${tabId}:${url || ''}`;
}

function createPinnedContextId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function makePinnedPageKey(url, scope = 'page', pinId = '') {
  if (scope === 'viewport') return `viewport:${url || ''}:${pinId || 'legacy'}`;
  return `page:${url || ''}`;
}

function pinnedScopeLabel(context) {
  return context?.pinScope === 'viewport' ? t('Viewport') : t('Full page');
}

function restorePinnedPages(raw = []) {
  state.attachedPages.clear();
  const entries = Array.isArray(raw) ? raw : [];
  for (const [index, item] of entries.slice(0, PINNED_CONTEXT_LIMIT).entries()) {
    const context = item?.context && typeof item.context === 'object' ? item.context : item;
    if (!context?.url || !context?.text) continue;
    const scope = context.pinScope === 'viewport' ? 'viewport' : 'page';
    const pinId = scope === 'viewport'
      ? String(context.pinId || `legacy-${Number(context.pinnedAt) || Date.now()}-${index}`)
      : '';
    const key = makePinnedPageKey(scope === 'page' ? (context.pinSourceUrl || context.url) : context.url, scope, pinId);
    state.attachedPages.set(key, {
      ...context,
      pinScope: scope,
      pinId,
      pinnedAt: Number(context.pinnedAt) || Date.now()
    });
  }
}

let pinnedSaveQueue = Promise.resolve();
async function savePinnedPages() {
  const serialized = [...state.attachedPages.values()]
    .slice(0, PINNED_CONTEXT_LIMIT)
    .map((context) => ({ context }));
  const save = pinnedSaveQueue
    .catch(() => {})
    .then(() => chrome.storage.local.set({ [PINNED_CONTEXT_STORAGE_KEY]: serialized }));
  pinnedSaveQueue = save;
  await save;
}

async function removePinnedContext(key) {
  if (!state.attachedPages.delete(key)) return false;
  state.sentAttached.delete(key);
  await savePinnedPages();
  renderContextChips();
  syncPinnedMenuState();
  scheduleContextInspectorRefresh(0);
  return true;
}

async function clearAllPinnedContexts() {
  if (!state.attachedPages.size) return false;
  state.attachedPages.clear();
  state.sentAttached.clear();
  await savePinnedPages();
  renderContextChips();
  syncPinnedMenuState();
  scheduleContextInspectorRefresh(0);
  return true;
}

function ensurePinnedCapacity(key) {
  if (state.attachedPages.has(key)) return;
  if (state.attachedPages.size >= PINNED_CONTEXT_LIMIT) {
    throw new Error(t`Pinned context is limited to ${PINNED_CONTEXT_LIMIT} items.`);
  }
}

function viewportToPinnedContext(tab, viewport) {
  if (!viewport) return null;
  const url = viewport.url || tab?.url || '';
  const title = viewport.title || tab?.title || url || 'Untitled page';
  const headingLines = (viewport.headings || []).map((item) => `- ${item}`);
  const blockLines = (viewport.blocks || []).map((item) => {
    const tag = String(item?.tag || 'p').toLowerCase();
    const text = String(item?.text || '').trim();
    if (!text) return '';
    if (tag === 'code' || tag === 'terminal') {
      return `\`\`\`${tag}\n${text}\n\`\`\``;
    }
    return `[${tag}] ${text}`;
  }).filter(Boolean);
  const text = [
    headingLines.length ? `Visible headings:\n${headingLines.join('\n')}` : '',
    blockLines.length ? `Visible text:\n${blockLines.join('\n')}` : ''
  ].filter(Boolean).join('\n\n').trim();
  if (!url || !text) return null;

  return {
    title,
    url,
    text,
    links: [],
    images: Array.isArray(viewport.images) ? viewport.images : [],
    buttons: [],
    semanticItems: [],
    extractor: 'viewport',
    extractorMs: 0,
    pinScope: 'viewport',
    pinId: createPinnedContextId(),
    pinnedAt: Date.now(),
    favicon: tab?.favIconUrl || '',
    pinnedViewport: {
      scrollY: Number(viewport.scrollY) || 0,
      viewportWidth: Number(viewport.viewportWidth) || 0,
      viewportHeight: Number(viewport.viewportHeight) || 0
    }
  };
}

async function captureTabContextForPin(tab, scope = 'page') {
  if (!tab?.id || isRestrictedUrl(tab.url || '')) throw new Error(t('This page cannot be pinned.'));
  if (await shouldUseManualPdfUpload(tab)) {
    throw new Error(t('Upload the PDF directly to chat. Text selection and Ctrl+C still work.'));
  }

  let context = null;
  if (scope === 'viewport') {
    const viewport = await readViewportContext(tab.id);
    context = viewportToPinnedContext(tab, viewport);
  } else {
    const extracted = await extractPageContext(tab);
    if (extracted) {
      context = {
        ...extracted,
        pinScope: 'page',
        pinnedAt: Date.now(),
        favicon: tab.favIconUrl || ''
      };
    }
  }

  if (!context?.url || !context?.text) throw new Error(t('Could not capture context from this page.'));
  if (scope === 'page') context.pinSourceUrl = tab.url || context.url;
  const key = makePinnedPageKey(
    scope === 'page' ? context.pinSourceUrl : context.url,
    scope === 'viewport' ? 'viewport' : 'page',
    scope === 'viewport' ? context.pinId : ''
  );
  return { key, context };
}

async function pinTabContext(tab, scope = 'page') {
  const { key, context } = await captureTabContextForPin(tab, scope);
  ensurePinnedCapacity(key);
  state.attachedPages.set(key, context);
  state.sentAttached.delete(key);
  await savePinnedPages();
  renderContextChips();
  syncPinnedMenuState();
  scheduleContextInspectorRefresh(0);
  setStatus(() => t`${state.attachedPages.size} pinned context item${state.attachedPages.size === 1 ? '' : 's'}`, 'ready');
  return { key, context };
}

async function pinActiveContext(scope = 'page') {
  const tab = await getActiveTab();
  if (!tab?.id || isRestrictedUrl(tab.url || '')) throw new Error(t('This page cannot be pinned.'));
  setStatus(() => scope === 'viewport' ? t('Pinning viewport…') : t('Pinning page…'), 'busy');
  return pinTabContext(tab, scope);
}

function getCachedPage(key) {
  const context = state.cache.get(key);
  if (!context) return null;
  state.cache.delete(key);
  state.cache.set(key, context);
  return context;
}

function setCachedPage(key, context) {
  if (!key || !context) return;
  state.cache.delete(key);
  state.cache.set(key, context);
  while (state.cache.size > CONTEXT_CACHE_LIMIT) {
    const oldestKey = state.cache.keys().next().value;
    if (!oldestKey) break;
    state.cache.delete(oldestKey);
    state.pageRefreshAt.delete(oldestKey);
  }
}

function resetSentContextState() {
  state.sent.clear();
  state.sentPageSnapshots.clear();
  state.sentViewport.clear();
  state.sentAttached.clear();
  state.pendingDeliveries.clear();
  state.deliveryEpoch += 1;
}

function getChatIdentity(rawUrl = '') {
  return getActiveProvider()?.getChatIdentity?.(rawUrl) || rawUrl;
}
function isDraftPromotion(previousIdentity, nextIdentity) {
  return getActiveProvider()?.isDraftPromotion?.(previousIdentity, nextIdentity) === true;
}
function chatChangeNeedsContextReset(previousUrl, nextUrl) {
  const previousIdentity = getChatIdentity(previousUrl);
  const nextIdentity = getChatIdentity(nextUrl);
  return Boolean(
    previousIdentity &&
    nextIdentity &&
    previousIdentity !== nextIdentity &&
    !isDraftPromotion(previousIdentity, nextIdentity)
  );
}

function fingerprintString(source = '') {
  source = String(source).replace(/\s+/g, ' ').trim();

  let hash = 2166136261;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return `${source.length}:${(hash >>> 0).toString(16)}`;
}

function fingerprintPageContext(context) {
  if (!context) return '';

  // Fingerprint only meaningful page content. DOM revisions can change because of
  // analytics, lazy UI, counters, or tab visibility without changing what the page says.
  return fingerprintString([
    context.title || '',
    context.url || '',
    context.text || ''
  ].join('\n'));
}

function makePageDiffSnapshot(context) {
  if (!context) return null;
  const prepared = compressPageContextForEnvelope(context, state.compressionMode, 'page') || context;
  return {
    title: prepared.title || '',
    url: prepared.url || '',
    text: prepared.text || '',
    extractor: prepared.extractor || '',
    compressionMode: state.compressionMode
  };
}

function splitPageDiffBlocks(text = '') {
  return String(text || '')
    .replace(/\r\n?/g, '\n')
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function computePageBlockDiff(previousText = '', currentText = '') {
  const before = splitPageDiffBlocks(previousText);
  const after = splitPageDiffBlocks(currentText);
  if (before.length > PAGE_DIFF_MAX_BLOCKS || after.length > PAGE_DIFF_MAX_BLOCKS) {
    return { safe: false, reason: 'too-many-blocks' };
  }

  const rows = Array.from({ length: before.length + 1 }, () => new Uint16Array(after.length + 1));
  for (let i = before.length - 1; i >= 0; i -= 1) {
    for (let j = after.length - 1; j >= 0; j -= 1) {
      rows[i][j] = before[i] === after[j]
        ? rows[i + 1][j + 1] + 1
        : Math.max(rows[i + 1][j], rows[i][j + 1]);
    }
  }

  const ops = [];
  let i = 0;
  let j = 0;
  while (i < before.length && j < after.length) {
    if (before[i] === after[j]) {
      ops.push({ type: 'equal', text: before[i] });
      i += 1;
      j += 1;
    } else if (rows[i + 1][j] >= rows[i][j + 1]) {
      ops.push({ type: 'removed', text: before[i] });
      i += 1;
    } else {
      ops.push({ type: 'added', text: after[j] });
      j += 1;
    }
  }
  while (i < before.length) ops.push({ type: 'removed', text: before[i++] });
  while (j < after.length) ops.push({ type: 'added', text: after[j++] });

  const changed = [];
  const added = [];
  const removed = [];
  let cursor = 0;
  while (cursor < ops.length) {
    if (ops[cursor].type === 'equal') {
      cursor += 1;
      continue;
    }
    const removedRun = [];
    const addedRun = [];
    while (cursor < ops.length && ops[cursor].type !== 'equal') {
      const op = ops[cursor++];
      if (op.type === 'removed') removedRun.push(op.text);
      else if (op.type === 'added') addedRun.push(op.text);
    }
    const paired = Math.min(removedRun.length, addedRun.length);
    for (let index = 0; index < paired; index += 1) {
      changed.push({ before: removedRun[index], after: addedRun[index] });
    }
    removed.push(...removedRun.slice(paired));
    added.push(...addedRun.slice(paired));
  }

  return { safe: true, changed, added, removed };
}

function buildPageDiffContext(previous, current) {
  if (!previous || !current) return null;
  if (previous.url !== current.url) return null;
  if ((previous.extractor || '') !== (current.extractor || '')) return null;
  if ((previous.compressionMode || '') !== (current.compressionMode || '')) return null;

  const diff = computePageBlockDiff(previous.text, current.text);
  if (!diff.safe) return null;

  const sections = [];
  let changeCount = 0;
  if (previous.title !== current.title) {
    sections.push(`Changed title:\n- Before: ${previous.title || '(empty)'}\n- After: ${current.title || '(empty)'}`);
    changeCount += 1;
  }
  if (diff.changed.length) {
    sections.push([
      'Changed blocks:',
      ...diff.changed.map((item, index) => `- Change ${index + 1}:\n  Before: ${item.before}\n  After: ${item.after}`)
    ].join('\n'));
    changeCount += diff.changed.length;
  }
  if (diff.added.length) {
    sections.push(['Added blocks:', ...diff.added.map((text) => `- ${text}`)].join('\n'));
    changeCount += diff.added.length;
  }
  if (diff.removed.length) {
    sections.push(['Removed blocks:', ...diff.removed.map((text) => `- ${text}`)].join('\n'));
    changeCount += diff.removed.length;
  }
  if (!changeCount) return null;

  const text = sections.join('\n\n');
  return {
    title: current.title,
    url: current.url,
    text,
    links: [],
    images: [],
    buttons: [],
    semanticItems: [],
    extractor: current.extractor,
    diffStats: {
      changed: diff.changed.length + (previous.title !== current.title ? 1 : 0),
      added: diff.added.length,
      removed: diff.removed.length,
      ratio: text.length / Math.max(1, current.text.length)
    }
  };
}

function choosePageUpdatePayload({ context, key, lastSentFingerprint, currentFingerprint }) {
  if (!context || !currentFingerprint || lastSentFingerprint === currentFingerprint) return null;
  const snapshot = makePageDiffSnapshot(context);
  if (!snapshot) return null;

  if (!lastSentFingerprint) {
    return { type: 'PAGE_CONTEXT', context, snapshot };
  }
  if (state.pageUpdateMode === 'full') {
    return { type: 'PAGE_CONTEXT_UPDATE', context, snapshot };
  }

  const previous = state.sentPageSnapshots.get(key) || null;
  const diffContext = buildPageDiffContext(previous, snapshot);
  if (!diffContext) {
    return { type: 'PAGE_CONTEXT_UPDATE', context, snapshot };
  }

  const ratio = Number(diffContext.diffStats?.ratio || 1);
  const maxRatio = state.pageUpdateMode === 'diff' ? PAGE_DIFF_FORCE_RATIO : PAGE_DIFF_SMART_RATIO;
  if (ratio > maxRatio) {
    return { type: 'PAGE_CONTEXT_UPDATE', context, snapshot };
  }
  return { type: 'PAGE_CONTEXT_DIFF', context: diffContext, snapshot };
}

function normalizeViewportItems(viewport) {
  if (!viewport) return [];

  const items = [
    ...(viewport.headings || []).map((text) => `h:${text}`),
    ...(viewport.blocks || []).map((item) => `b:${item.tag || ''}:${item.text || ''}`),
    ...(viewport.images || []).map((item) => `i:${item.src || ''}|${item.alt || ''}|${item.nearbyText || ''}`)
  ];

  return [...new Set(items.map((item) => item.replace(/\s+/g, ' ').trim()).filter(Boolean))];
}

function viewportContentSimilarity(a, b) {
  const left = new Set(normalizeViewportItems(a));
  const right = new Set(normalizeViewportItems(b));
  if (!left.size && !right.size) return 1;

  let overlap = 0;
  for (const item of left) if (right.has(item)) overlap += 1;
  return overlap / Math.max(left.size, right.size, 1);
}

function videoSignature(viewport) {
  return (viewport?.videos || [])
    .map((item) => `${item.id || ''}|${Math.floor((Number(item.currentTime) || 0) / 5)}|${item.paused}|${item.playbackRate}`)
    .join('\n');
}

function viewportMeaningfullyChanged(previous, current) {
  if (!current) return false;
  if (!previous || typeof previous === 'string') return true;
  if ((previous.url || '') !== (current.url || '')) return true;

  const previousSelection = (previous.selectedText || '').trim();
  const currentSelection = (current.selectedText || '').trim();
  if (previousSelection !== currentSelection && (previousSelection || currentSelection)) return true;

  if (videoSignature(previous) !== videoSignature(current)) return true;

  const scrollDelta = Math.abs((Number(current.scrollY) || 0) - (Number(previous.scrollY) || 0));
  const widthDelta = Math.abs((Number(current.viewportWidth) || 0) - (Number(previous.viewportWidth) || 0));
  const heightDelta = Math.abs((Number(current.viewportHeight) || 0) - (Number(previous.viewportHeight) || 0));
  const similarity = viewportContentSimilarity(previous, current);

  // Ignore tiny wheel/trackpad movement and small layout jitter when the user is
  // effectively looking at the same content. A larger scroll still counts even
  // when a sticky/virtualized UI keeps many of the same DOM nodes mounted.
  if (scrollDelta < 180 && widthDelta < 80 && heightDelta < 80 && similarity >= 0.85) {
    return false;
  }

  // If visible content changed substantially, update even after a small scroll.
  if (similarity < 0.85) return true;

  return scrollDelta >= 180 || widthDelta >= 80 || heightDelta >= 80;
}

function applyPinnedMenuCollapseState() {
  const hasPinned = [...state.attachedPages.values()]
    .some((context) => context?.pinScope === 'viewport');
  const pinnedToggle = $('pinnedSectionLabel');
  const pinnedList = $('pinnedList');
  const savedViewportsGroup = $('savedViewportsGroup');
  const tabsList = $('tabsList');

  savedViewportsGroup?.classList.toggle('hidden', !hasPinned);
  if (pinnedToggle) {
    pinnedToggle.classList.toggle('hidden', !hasPinned);
    pinnedToggle.setAttribute('aria-expanded', String(!state.pinnedMenuCollapsed.pinned));
  }
  if (pinnedList) {
    pinnedList.classList.toggle('hidden', !hasPinned || state.pinnedMenuCollapsed.pinned);
  }
  // The page picker already lives inside its own disclosure. A second nested
  // disclosure for the tab rows adds visual noise and can strand a saved
  // collapsed state with no visible way to reopen it.
  tabsList?.classList.remove('hidden');
}

function setPinnedMenuSectionCollapsed(section, collapsed) {
  if (!['pinned', 'tabs'].includes(section)) return;
  state.pinnedMenuCollapsed[section] = Boolean(collapsed);
  applyPinnedMenuCollapseState();
  chrome.storage.local.set({
    [PINNED_MENU_UI_STORAGE_KEY]: { ...state.pinnedMenuCollapsed }
  }).catch(() => {});
  requestAnimationFrame(positionContextInspectorPopover);
}

function renderPinnedMenuList() {
  const list = $('pinnedList');
  const label = $('pinnedSectionLabel');
  const count = $('pinnedSectionCount');
  if (!list || !label) return;

  const entries = [...state.attachedPages.entries()]
    .filter(([, context]) => context?.pinScope === 'viewport');
  const hasPinned = entries.length > 0;
  if (count) count.textContent = String(entries.length);
  label.classList.toggle('hidden', !hasPinned);
  list.replaceChildren();
  applyPinnedMenuCollapseState();
  if (!hasPinned) return;

  const viewportOrdinals = new Map();

  for (const [key, context] of entries) {
    const entry = document.createElement('div');
    entry.className = 'pinned-menu-entry';

    const row = document.createElement('div');
    row.className = 'pinned-menu-item';
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.dataset.tooltip = t('View saved viewport details');

    const favicon = document.createElement('img');
    favicon.className = 'pinned-menu-favicon';
    favicon.alt = '';
    favicon.setAttribute('aria-hidden', 'true');
    const fallbackFavicon = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(context.url || '')}&size=32`;
    favicon.src = context.favicon || fallbackFavicon;
    favicon.addEventListener('error', () => {
      favicon.src = fallbackFavicon;
    }, { once: true });

    const copy = document.createElement('div');
    copy.className = 'pinned-menu-copy';

    const title = document.createElement('div');
    title.className = 'pinned-menu-title';
    title.textContent = context.title || t('Untitled page');

    const meta = document.createElement('div');
    meta.className = 'pinned-menu-meta';
    let scope = t('Full page');
    if (context.pinScope === 'viewport') {
      const ordinal = (viewportOrdinals.get(context.url) || 0) + 1;
      viewportOrdinals.set(context.url, ordinal);
      scope = t`Viewport ${ordinal}`;
    }
    let host = '';
    try { host = new URL(context.url).hostname; } catch (_) {}
    meta.textContent = [scope, host].filter(Boolean).join(' · ');

    copy.append(title, meta);

    const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    chevron.classList.add('pinned-menu-chevron');
    chevron.setAttribute('viewBox', '0 0 16 16');
    chevron.setAttribute('aria-hidden', 'true');
    chevron.innerHTML = '<path d="m6 4 4 4-4 4" />';

    const preview = document.createElement('div');
    preview.className = 'pinned-menu-preview';
    const viewport = context.pinnedViewport || {};
    const dimensions = viewport.viewportWidth && viewport.viewportHeight
      ? `${viewport.viewportWidth}×${viewport.viewportHeight}`
      : '';
    const position = Number.isFinite(Number(viewport.scrollY)) ? `Y ${Math.round(Number(viewport.scrollY))}` : '';
    const capturedAt = context.pinnedAt
      ? new Date(context.pinnedAt).toLocaleString(DinSideI18n.language === 'vi' ? 'vi-VN' : 'en-US')
      : '';
    const details = [dimensions, position, `${String(context.text || '').length.toLocaleString()} chars`, capturedAt]
      .filter(Boolean)
      .join(' · ');
    preview.textContent = [details, inspectorPreviewText(context.text, 12000)].filter(Boolean).join('\n\n');

    const setExpanded = (expanded) => {
      entry.classList.toggle('expanded', expanded);
      row.setAttribute('aria-expanded', String(expanded));
      if (expanded) delete row.dataset.tooltip;
      else row.dataset.tooltip = t('View saved viewport details');
      if (expanded) state.expandedSavedViewports.add(key);
      else state.expandedSavedViewports.delete(key);
    };
    setExpanded(state.expandedSavedViewports.has(key));
    row.addEventListener('click', () => setExpanded(!entry.classList.contains('expanded')));
    row.addEventListener('keydown', (event) => {
      if (!['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      setExpanded(!entry.classList.contains('expanded'));
    });

    const remove = document.createElement('button');
    remove.className = 'pinned-menu-remove';
    remove.type = 'button';
    remove.textContent = '×';
    remove.title = t('Unpin context');
    remove.setAttribute('aria-label', t`Unpin ${context.title || t('context')}`);
    remove.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      remove.disabled = true;
      try {
        state.expandedSavedViewports.delete(key);
        await removePinnedContext(key);
        setStatus(() => t`${state.attachedPages.size} pinned context item${state.attachedPages.size === 1 ? '' : 's'}`, 'ready');
      } catch (error) {
        remove.disabled = false;
        setStatus(() => error.message || t('Could not unpin context'), 'error');
      }
    });

    row.append(favicon, copy, chevron, remove);
    entry.append(row, preview);
    list.appendChild(entry);
  }
}

function getOpenTabCheckboxes() {
  return [...document.querySelectorAll('#tabsList input[type="checkbox"][data-pinned-key]')];
}

function updateContextLimitCount() {
  const count = $('contextLimitCount');
  if (!count) return;
  const pinnedPageCount = [...state.attachedPages.values()]
    .filter((context) => context?.pinScope !== 'viewport').length;
  count.textContent = t`${pinnedPageCount} pinned`;
}

function applyOpenTabsFilter() {
  const query = String($('openTabsSearch')?.value || '').trim().toLocaleLowerCase();
  for (const row of document.querySelectorAll('#tabsList .tab-option')) {
    row.classList.toggle('filtered-out', Boolean(query) && !String(row.dataset.searchText || '').includes(query));
  }
}

function organizeOpenTabRows() {
  const checkboxes = getOpenTabCheckboxes();
  const selectedCount = checkboxes.reduce((count, checkbox) => count + (checkbox.checked ? 1 : 0), 0);
  $('clearSelectedTabsBtn')?.classList.toggle('hidden', selectedCount === 0);
  const count = $('openTabsSectionCount');
  if (count) count.textContent = String(checkboxes.length);
  updateContextLimitCount();
  applyOpenTabsFilter();
}

function updateOpenTabsSelectionUI() {
  const checkboxes = getOpenTabCheckboxes();

  for (const checkbox of checkboxes) {
    const row = checkbox.closest('.tab-option');
    if (!row) continue;
    const pending = checkbox.dataset.optimisticPending === 'true';
    row.classList.toggle('selected', checkbox.checked);
    row.classList.toggle('pending', pending);
    row.setAttribute('aria-busy', String(pending));
  }
  organizeOpenTabRows();
}

function syncPinnedMenuState() {
  const menu = $('tabsMenu');
  const inspector = $('contextInspector');
  if (!menu || inspector?.classList.contains('hidden')) return;
  const activeUrl = menu.dataset.activeUrl || '';
  const pageKey = makePinnedPageKey(activeUrl, 'page');
  const pinPageButton = $('pinCurrentPageBtn');
  const pinViewportButton = $('pinCurrentViewportBtn');
  if (pinPageButton) {
    const pinned = state.attachedPages.has(pageKey);
    const label = pinPageButton.querySelector('.pin-action-text');
    if (label) label.textContent = pinned ? t('Page pinned ✓') : t('Pin this page');
    pinPageButton.disabled = pinned || !activeUrl;
  }
  if (pinViewportButton) {
    const label = pinViewportButton.querySelector('.pin-action-text');
    if (label) label.textContent = t('Pin viewport');
    pinViewportButton.disabled = !activeUrl || state.attachedPages.size >= PINNED_CONTEXT_LIMIT;
  }
  renderPinnedMenuList();
  for (const checkbox of getOpenTabCheckboxes()) {
    if (checkbox.dataset.optimisticPending === 'true') continue;
    checkbox.checked = state.attachedPages.has(checkbox.dataset.pinnedKey || '');
  }
  updateOpenTabsSelectionUI();
}

function renderContextChips() {
  const host = $('contextChips');
  if (!host) return;
  host.replaceChildren();

  const entries = [...state.attachedPages.entries()];
  // Keep the compact bar predictable at narrow side-panel widths. The first
  // pinned context stays visible; everything else is grouped behind +N.
  const visibleEntries = entries.slice(0, 1);

  for (const [key, context] of visibleEntries) {
    const chip = document.createElement('div');
    chip.className = 'context-chip';
    chip.dataset.tooltip = `${pinnedScopeLabel(context)} · ${context.url || context.title || ''}`;

    const favicon = document.createElement('img');
    favicon.className = 'context-chip-favicon';
    favicon.alt = '';
    favicon.setAttribute('aria-hidden', 'true');
    const fallbackFavicon = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(context.url || '')}&size=32`;
    favicon.src = context.favicon || fallbackFavicon;
    favicon.addEventListener('error', () => {
      if (favicon.dataset.fallbackApplied === 'true') {
        favicon.hidden = true;
        return;
      }
      favicon.dataset.fallbackApplied = 'true';
      favicon.src = fallbackFavicon;
    });

    const title = document.createElement('span');
    title.className = 'context-chip-title';
    title.textContent = `${context.pinScope === 'viewport' ? t('Viewport · ') : ''}${context.title || t('Untitled page')}`;

    const remove = document.createElement('button');
    remove.className = 'context-chip-remove';
    remove.type = 'button';
    remove.textContent = '×';
    remove.dataset.tooltip = t('Unpin context');
    remove.addEventListener('click', () => {
      removePinnedContext(key).catch((error) => setStatus(() => error.message || t('Could not unpin context'), 'error'));
    });

    chip.append(favicon, title, remove);
    host.appendChild(chip);
  }

  if (entries.length > visibleEntries.length) {
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'context-chip-more';
    more.textContent = `+${entries.length - visibleEntries.length}`;
    more.dataset.tooltip = t('Manage pinned context');
    more.setAttribute('aria-label', t('Manage pinned context'));
    more.addEventListener('click', () => openTabsMenu());
    host.appendChild(more);
  }

  $('contextBar').classList.toggle('hidden', state.attachedPages.size === 0);
  updateContextButtonUI();
  updateContextLimitCount();
  syncPinnedMenuState();
}

function updateContextUI(context, meta = {}) {
  state.pageContext = context;
  const suffix = meta.cached ? ' · cached' : '';
  const refreshing = Boolean(meta.changed);
  // A dirty page still has a usable cached context. Background refreshes should
  // not look like a blocking operation, especially on highly dynamic sites (X,
  // YouTube, etc.) whose DOM mutates almost continuously.
  setStatus(() => refreshing ? t`Context ready${t(suffix)} · refreshing` : t`Context ready${t(suffix)}`, 'ready');
  renderContextChips();
  if (!meta.cached && !$('contextInspector')?.classList.contains('hidden')) {
    scheduleContextInspectorRefresh(0);
  }
}

function showChangedState(pageState) {
  if (!state.pageContext) return;
  setStatus(() => t('Context ready · refreshing'), 'ready');
}

async function askPageState(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: 'DINSIDE_PAGE_STATE' });
    if (response?.ok && response.state) return response.state;
  } catch (_) {
    // Existing tabs can keep a stale content-script world after extension reload.
  }

  // Read the same lightweight Smart signals directly so intent/cost decisions
  // still work before the user refreshes the tab.
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const textLength = (document.body?.innerText || '').trim().length;
        const articleCount = document.querySelectorAll('article').length;
        const headingCount = document.querySelectorAll('h1,h2,h3').length;
        const linkCount = document.querySelectorAll('a[href]').length;
        return {
          title: document.title,
          url: location.href,
          selectedText: window.getSelection()?.toString()?.trim() || '',
          selectionDragging: false,
          documentHeight: document.documentElement.scrollHeight,
          viewportHeight: innerHeight,
          textLength,
          articleCount,
          headingCount,
          linkCount,
          feedLike: articleCount >= 3 && linkCount >= 12,
          revision: 0,
          dirty: false
        };
      }
    });
    const fallbackState = results?.[0]?.result || null;
    if (fallbackState && !state.selectedTextContextEnabled) fallbackState.selectedText = '';
    return fallbackState;
  } catch (_) {
    return null;
  }
}

async function readViewportContext(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: 'DINSIDE_READ_VIEWPORT' });
    if (response?.ok && response.viewport) return response.viewport;
  } catch (_) {
    // The tab may still be running an older content script after an extension reload.
  }

  // Fallback: collect viewport state directly so VIEWPORT_CONTEXT still works
  // without requiring the user to manually refresh the page first.
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const clean = (value = '') => String(value).replace(/\s+/g, ' ').trim();
        const visible = (el) => {
          if (!el) return false;
          const style = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 &&
            rect.width > 0 && rect.height > 0 && rect.bottom >= 0 && rect.right >= 0 &&
            rect.top <= innerHeight && rect.left <= innerWidth;
        };

        const root = document.querySelector('main, article, [role="main"]') || document.body;
        const doc = document.documentElement;
        const maxScroll = Math.max(0, doc.scrollHeight - innerHeight);
        const scrollPercent = maxScroll > 0 ? Math.round((scrollY / maxScroll) * 100) : 0;

        const candidates = [...root.querySelectorAll(
          'h1, h2, h3, h4, h5, h6, p, li, blockquote, pre, code, figcaption, td, th, [role="heading"]'
        )]
          .filter(visible)
          .map((el) => {
            const rect = el.getBoundingClientRect();
            return {
              tag: el.tagName.toLowerCase(),
              text: clean(el.innerText || el.textContent || ''),
              top: Math.round(rect.top)
            };
          })
          .filter((item) => item.text);

        const semantic = [...document.querySelectorAll(
          '[data-eventid][role="button"], [role="button"][aria-label], [role="link"][aria-label], [role="gridcell"][aria-label]'
        )]
          .filter(visible)
          .map((el) => {
            const rect = el.getBoundingClientRect();
            return {
              tag: el.hasAttribute('data-eventid') ? 'event' : (el.getAttribute('role') || el.tagName.toLowerCase()),
              text: clean(el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || ''),
              top: Math.round(rect.top),
              event: el.hasAttribute('data-eventid')
            };
          })
          .filter((item) => item.text)
          .sort((a, b) => Number(Boolean(b.event)) - Number(Boolean(a.event)) || a.top - b.top)
          .slice(0, 80);

        candidates.push(...semantic);
        candidates.sort((a, b) => a.top - b.top);

        const blocks = [];
        const seen = new Set();
        let usedChars = 0;
        for (const item of candidates) {
          if (seen.has(item.text) || usedChars >= 8000 || blocks.length >= 80) continue;
          const text = item.text.slice(0, 8000 - usedChars);
          if (!text) break;
          seen.add(item.text);
          blocks.push({ tag: item.tag, text, top: item.top });
          usedChars += text.length;
        }

        const headings = [...root.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]')]
          .filter(visible)
          .map((el) => clean(el.innerText || el.textContent || ''))
          .filter(Boolean)
          .slice(0, 20);

        const images = [...root.querySelectorAll('img')]
          .filter(visible)
          .map((img) => ({
            alt: clean(img.alt || ''),
            src: img.currentSrc || img.src || '',
            title: clean(img.title || ''),
            nearbyText: clean(img.closest('figure, picture, a, p, li, article, section, div')?.innerText || '').slice(0, 240)
          }))
          .filter((item) => item.src)
          .slice(0, 20);

        const videos = [...document.querySelectorAll('video')]
          .filter(visible)
          .map((video, index) => ({
            id: `video${index + 1}`,
            currentTime: Number.isFinite(video.currentTime) ? Math.round(video.currentTime * 10) / 10 : null,
            duration: Number.isFinite(video.duration) ? Math.round(video.duration * 10) / 10 : null,
            paused: video.paused,
            muted: video.muted,
            playbackRate: video.playbackRate,
            src: video.currentSrc || video.src || '',
            poster: video.poster || ''
          }))
          .slice(0, 5);

        const active = document.activeElement;
        const activeElement = active && active !== document.body && active !== document.documentElement
          ? {
              tag: active.tagName?.toLowerCase() || '',
              role: active.getAttribute?.('role') || '',
              type: active.getAttribute?.('type') || '',
              name: clean(active.getAttribute?.('name') || ''),
              label: clean(
                active.getAttribute?.('aria-label') ||
                active.getAttribute?.('title') ||
                active.closest?.('label')?.innerText ||
                ''
              ),
              value: ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)
                ? String(active.value || '').slice(0, 500)
                : '',
              text: clean(active.innerText || active.textContent || '').slice(0, 500)
            }
          : null;

        return {
          title: document.title,
          url: location.href,
          scrollY: Math.round(scrollY),
          scrollPercent,
          viewportWidth: innerWidth,
          viewportHeight: innerHeight,
          documentHeight: document.documentElement.scrollHeight,
          selectedText: window.getSelection()?.toString()?.trim() || '',
          blocks,
          headings,
          images,
          videos,
          activeElement,
          capturedAt: Date.now()
        };
      }
    });
    const fallbackViewport = results?.[0]?.result || null;
    if (fallbackViewport && !state.selectedTextContextEnabled) fallbackViewport.selectedText = '';
    return fallbackViewport;
  } catch (_) {
    return null;
  }
}

function getGoogleDocsDocumentInfo(url = '') {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'docs.google.com') return null;
    const match = parsed.pathname.match(/^\/document(\/u\/\d+)?\/d\/(?!e\/)([^/]+)/i);
    if (!match) return null;
    return {
      id: match[2],
      accountPath: match[1] || '',
      origin: parsed.origin
    };
  } catch (_) {
    return null;
  }
}

function isLikelyPdfDocument(url = '', title = '') {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:', 'file:'].includes(parsed.protocol)) return false;
    if (/^(?:drive|docs)\.google\.com$/i.test(parsed.hostname)) return false;
    if (/\.pdf$/i.test(parsed.pathname)) return true;
    const format = parsed.searchParams.get('format') || parsed.searchParams.get('output') || '';
    if (String(format).toLowerCase() === 'pdf') return true;
  } catch (_) {}

  return /\.pdf(?:\s*(?:[-—|]\s*.*)?)?$/i.test(String(title).trim());
}

function getSpecialDocumentKind(url = '', title = '') {
  if (getGoogleDocsDocumentInfo(url)) return 'google-docs';
  if (isLikelyPdfDocument(url, title)) return 'pdf';
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'classroom.google.com') return 'google-classroom';
    if (parsed.hostname === 'drive.google.com' && /\/file\/d\/[^/]+/i.test(parsed.pathname) && /\.pdf\b/i.test(title)) {
      return 'google-drive-pdf';
    }
  } catch (_) {}
  return '';
}

function documentTitleFromTab(tab, suffixPattern) {
  return String(tab?.title || '')
    .replace(suffixPattern, '')
    .trim() || String(tab?.url || 'Untitled document');
}

function documentContainerIdentity(title = '') {
  return String(title)
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();
}

function embeddedDocumentContextMatchesTab(context, tab) {
  if (!context?.embeddedDocument) return true;
  const cachedIdentity = documentContainerIdentity(context.containerTitle);
  const currentIdentity = documentContainerIdentity(tab?.title);
  // Older cache entries did not identify the actual file shown inside the
  // Classroom/Drive container and therefore cannot be trusted.
  return Boolean(cachedIdentity && currentIdentity && cachedIdentity === currentIdentity);
}

async function fetchDocumentResource(url, accept, { cache = 'no-store' } = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    cache,
    redirect: 'follow',
    headers: { Accept: accept }
  });
  if (!response.ok) throw new Error(t`Document download failed (${response.status}).`);
  if (/accounts\.google\.com/i.test(response.url || '')) {
    throw new Error(t('Google sign-in is required to read this document.'));
  }
  return response;
}

async function extractGoogleDocsContext(tab) {
  const info = getGoogleDocsDocumentInfo(tab?.url || '');
  if (!info) return null;

  const exportUrl = `${info.origin}/document${info.accountPath}/d/${encodeURIComponent(info.id)}/export?format=txt`;
  const startedAt = performance.now();
  const response = await fetchDocumentResource(exportUrl, 'text/plain');
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('text/html')) {
    throw new Error(t('Google Docs did not return an accessible text export.'));
  }

  const text = (await response.text())
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!text) throw new Error(t('This Google Doc is empty or cannot be exported as text.'));

  return {
    title: documentTitleFromTab(tab, /\s*[-—]\s*Google Docs\s*$/i),
    url: tab.url || '',
    selectedText: '',
    text: text.slice(0, DOCUMENT_TEXT_CHAR_LIMIT),
    links: [],
    images: [],
    buttons: [],
    semanticItems: [],
    revision: Date.now(),
    extractor: 'google-docs-export',
    extractorMs: Math.round((performance.now() - startedAt) * 10) / 10,
    documentType: 'google-docs'
  };
}

let pdfJsModulePromise = null;
async function getPdfJsModule() {
  if (!pdfJsModulePromise) {
    const moduleUrl = chrome.runtime.getURL('vendor/pdfjs/pdf.min.mjs');
    pdfJsModulePromise = import(moduleUrl).then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('vendor/pdfjs/pdf.worker.min.mjs');
      return pdfjs;
    });
  }
  return pdfJsModulePromise;
}

function appendPdfText(current, value) {
  const next = String(value || '').replace(/\s+/g, ' ').trim();
  if (!next) return current;
  if (!current || /[\s\-–—/(]$/.test(current) || /^[,.;:!?%)\]}]/.test(next)) return current + next;
  return `${current} ${next}`;
}

function pdfTextContentToString(content) {
  const lines = [];
  let line = '';
  let lastY = null;

  const flush = () => {
    const value = line.trim();
    if (value) lines.push(value);
    line = '';
  };

  for (const item of content?.items || []) {
    if (typeof item?.str !== 'string') continue;
    const y = Number(item.transform?.[5]);
    const height = Math.max(2, Math.abs(Number(item.height) || 0) * 0.55);
    if (lastY != null && Number.isFinite(y) && Math.abs(y - lastY) > height) flush();
    line = appendPdfText(line, item.str);
    if (item.hasEOL) flush();
    if (Number.isFinite(y)) lastY = y;
  }
  flush();
  return lines.join('\n');
}

function getGoogleDriveFileInfo(url = '') {
  try {
    const parsed = new URL(url);
    if (!/^(?:drive|docs)\.google\.com$/i.test(parsed.hostname)) return null;
    const pathMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/i);
    const id = pathMatch?.[1] || parsed.searchParams.get('id') || '';
    if (!id) return null;
    const accountPath = parsed.pathname.match(/\/u\/(\d+)(?:\/|$)/i);
    return {
      id,
      authuser: parsed.searchParams.get('authuser') || accountPath?.[1] || '',
      resourceKey: parsed.searchParams.get('resourcekey') || ''
    };
  } catch (_) {
    return null;
  }
}

function googleDriveDownloadUrls(info, fallbackAuthuser = '') {
  if (!info?.id) return [];
  const authuser = info.authuser || fallbackAuthuser || '';
  const variants = authuser ? [authuser, ''] : [''];
  return variants.flatMap((account) => {
    const params = new URLSearchParams({ id: info.id, export: 'download', confirm: 't' });
    if (account) params.set('authuser', account);
    if (info.resourceKey) params.set('resourcekey', info.resourceKey);
    return [
      `https://drive.usercontent.google.com/download?${params}`,
      `https://drive.google.com/uc?${params}`
    ];
  });
}

async function discoverEmbeddedDocumentFrames(tabId) {
  const collect = () => {
    const embedded = [...document.querySelectorAll('iframe[src], embed[src], object[data]')]
      .map((element) => element.src || element.data || element.getAttribute('src') || element.getAttribute('data') || '')
      .filter(Boolean);
    const driveAttachments = [...document.querySelectorAll('a[href]')]
      .map((link) => ({
        url: link.href,
        title: String(link.innerText || link.getAttribute('aria-label') || link.title || '').trim()
      }))
      .filter(({ url, title }) =>
        /(?:drive\.google\.com\/(?:file\/d\/|open\?|uc\?)|\.pdf(?:[?#]|$))/i.test(url) ||
        /\.pdf\b/i.test(title)
      );
    const loaded = performance.getEntriesByType?.('resource')
      ?.map((entry) => entry.name || '')
      .filter((url) => /\.pdf(?:[?#]|$)|drive\.usercontent\.google\.com\/download|googleusercontent\.com\/docs\//i.test(url))
      .slice(-30) || [];
    return {
      url: location.href,
      title: document.title,
      embedded,
      driveAttachments,
      loaded
    };
  };

  const entries = [];
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: collect
    });
    for (const item of results || []) {
      if (item?.result) entries.push(item.result);
    }
  } catch (_) {
    try {
      const results = await chrome.scripting.executeScript({ target: { tabId }, func: collect });
      if (results?.[0]?.result) entries.push(results[0].result);
    } catch (_) {}
  }

  const candidatesByUrl = new Map();
  for (const entry of entries) {
    const candidates = [
      { url: entry.url, title: entry.title || '', priority: 0 },
      ...(entry.embedded || []).map((url) => ({ url, title: entry.title || '', priority: 1 })),
      ...(entry.driveAttachments || []).map((item) => ({
        url: item?.url || '',
        title: item?.title || entry.title || '',
        priority: 2
      })),
      ...[...(entry.loaded || [])].reverse().map((url) => ({
        url,
        title: entry.title || '',
        priority: 3
      }))
    ];
    for (const candidate of candidates) {
      const value = String(typeof candidate === 'string' ? candidate : candidate?.url || '').trim();
      if (!value) continue;
      const next = {
        url: value,
        title: String(candidate?.title || entry.title || ''),
        priority: Number(candidate?.priority) || 0
      };
      const previous = candidatesByUrl.get(value);
      if (!previous || next.priority < previous.priority) candidatesByUrl.set(value, next);
    }
  }
  return [...candidatesByUrl.values()].sort((a, b) =>
    a.priority - b.priority || Number(/\.pdf\b/i.test(b.title)) - Number(/\.pdf\b/i.test(a.title))
  );
}

function googleDriveConfirmationUrl(html = '', responseUrl = '') {
  if (!html || !/(?:drive\.google\.com|drive\.usercontent\.google\.com)/i.test(responseUrl)) return '';
  const document = new DOMParser().parseFromString(html, 'text/html');
  const form = document.querySelector('form#download-form, form[action*="drive.usercontent.google.com/download"], form[action*="/uc"]');
  const formAction = form?.getAttribute('action') || '';
  if (formAction) {
    const url = new URL(formAction, responseUrl);
    for (const input of form.querySelectorAll('input[name]')) {
      url.searchParams.set(input.name, input.value || '');
    }
    return url.href;
  }

  const link = document.querySelector(
    'a#uc-download-link[href], a[href*="drive.usercontent.google.com/download"], a[href*="confirm="]'
  );
  return link?.getAttribute('href') ? new URL(link.getAttribute('href'), responseUrl).href : '';
}

async function fetchPdfResource(url) {
  let nextUrl = url;
  const visited = new Set();

  for (let attempt = 0; attempt < 3 && nextUrl && !visited.has(nextUrl); attempt += 1) {
    visited.add(nextUrl);
    const response = await fetchDocumentResource(nextUrl, 'application/pdf', { cache: 'force-cache' });
    const announcedBytes = Number(response.headers.get('content-length') || 0);
    if (announcedBytes > MAX_PDF_BYTES) throw new Error(t('PDF is larger than the 50 MB reading limit.'));

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_PDF_BYTES) throw new Error(t('PDF is larger than the 50 MB reading limit.'));
    const data = new Uint8Array(buffer);
    const signature = new TextDecoder('ascii').decode(data.subarray(0, 5));
    if (signature === '%PDF-') return { data, responseUrl: response.url || nextUrl };

    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('text/html') && buffer.byteLength <= 2 * 1024 * 1024) {
      const confirmationUrl = googleDriveConfirmationUrl(new TextDecoder().decode(data), response.url || nextUrl);
      if (confirmationUrl) {
        nextUrl = confirmationUrl;
        continue;
      }
    }
    break;
  }

  throw new Error(t('The page did not return a valid PDF file.'));
}

function embeddedPdfResourceUrls(candidateUrl, fallbackAuthuser = '', candidateTitle = '') {
  const urls = [];
  const driveInfo = getGoogleDriveFileInfo(candidateUrl);
  if (driveInfo) urls.push(...googleDriveDownloadUrls(driveInfo, fallbackAuthuser));

  try {
    const parsed = new URL(candidateUrl);
    for (const key of ['url', 'file', 'pdf']) {
      const nested = parsed.searchParams.get(key);
      if (nested && /^https?:/i.test(nested)) urls.push(nested);
    }
    if ((/googleusercontent\.com$/i.test(parsed.hostname) && /\/docs\//i.test(parsed.pathname)) ||
        (parsed.hostname === 'drive.usercontent.google.com' && parsed.pathname === '/download')) {
      urls.push(candidateUrl);
    }
  } catch (_) {}

  if (isLikelyPdfDocument(candidateUrl, candidateTitle) || /\.pdf\b/i.test(candidateTitle)) {
    urls.push(candidateUrl);
  }
  return [...new Set(urls)];
}

function activeEmbeddedPdfCandidate(candidate) {
  if (!candidate || Number(candidate.priority) > 1) return false;
  return Boolean(
    embeddedPdfResourceUrls(candidate.url, '', candidate.title).length ||
    /\.pdf(?:\s*(?:[-—|]\s*.*)?)?$/i.test(String(candidate.title || '').trim()) ||
    /^blob:https:\/\/(?:classroom|drive)\.google\.com\//i.test(candidate.url || '')
  );
}

function applyPdfManualUploadState(tab, active) {
  if (!tab?.id) return;
  if (!active) {
    if (state.pdfManualUpload?.tabId === tab.id) state.pdfManualUpload = null;
    return;
  }

  state.pdfManualUpload = {
    tabId: tab.id,
    url: tab.url || '',
    title: tab.title || ''
  };
  const key = makePageKey(tab.id, tab.url || '');
  state.pageContext = null;
  state.cache.delete(key);
  state.pageRefreshAt.delete(key);
  state.sent.delete(key);
  state.sentPageSnapshots.delete(key);
  state.sentViewport.delete(key);
  state.latestViewport.delete(tab.id);
}

async function shouldUseManualPdfUpload(tab, { force = false } = {}) {
  if (!tab?.id) return false;
  const kind = getSpecialDocumentKind(tab.url || '', tab.title || '');
  if (kind === 'pdf' || kind === 'google-drive-pdf') {
    applyPdfManualUploadState(tab, true);
    return true;
  }
  if (kind !== 'google-classroom') {
    applyPdfManualUploadState(tab, false);
    return false;
  }

  const key = `${tab.id}\n${tab.url || ''}\n${tab.title || ''}`;
  const cached = state.pdfDetectionCache.get(key);
  if (!force && cached && Date.now() - cached.checkedAt < 1500) {
    applyPdfManualUploadState(tab, cached.active);
    return cached.active;
  }

  const candidates = await discoverEmbeddedDocumentFrames(tab.id).catch(() => []);
  const active = candidates.some(activeEmbeddedPdfCandidate);
  state.pdfDetectionCache.set(key, { active, checkedAt: Date.now() });
  if (state.pdfDetectionCache.size > 8) {
    state.pdfDetectionCache.delete(state.pdfDetectionCache.keys().next().value);
  }
  applyPdfManualUploadState(tab, active);
  return active;
}

async function extractPdfContext(tab, { probe = false, resourceUrl = '' } = {}) {
  if (!resourceUrl && !probe && !isLikelyPdfDocument(tab?.url || '', tab?.title || '')) return null;
  const startedAt = performance.now();
  const sourceUrl = new URL(resourceUrl || tab.url);
  sourceUrl.hash = '';
  // Drive may return an HTML confirmation form before the actual file. Follow
  // that form and only hand verified PDF bytes to PDF.js.
  const { data, responseUrl } = await fetchPdfResource(sourceUrl.href);

  const pdfjs = await getPdfJsModule();
  const loadingTask = pdfjs.getDocument({
    data,
    cMapUrl: chrome.runtime.getURL('vendor/pdfjs/cmaps/'),
    cMapPacked: true,
    standardFontDataUrl: chrome.runtime.getURL('vendor/pdfjs/standard_fonts/'),
    isEvalSupported: false
  });

  let pdf = null;
  try {
    pdf = await loadingTask.promise;
    const pages = [];
    let extractedChars = 0;
    const metadataPromise = pdf.getMetadata().catch(() => null);

    // PDF.js supports multiple outstanding page requests. Reading a small batch
    // in parallel removes the per-page round-trip that made long PDFs crawl,
    // while preserving document order and keeping memory bounded.
    for (let batchStart = 1; batchStart <= pdf.numPages && extractedChars < DOCUMENT_TEXT_CHAR_LIMIT; batchStart += PDF_TEXT_BATCH_SIZE) {
      const batchEnd = Math.min(pdf.numPages, batchStart + PDF_TEXT_BATCH_SIZE - 1);
      const pageNumbers = Array.from(
        { length: batchEnd - batchStart + 1 },
        (_, index) => batchStart + index
      );
      const batch = await Promise.all(pageNumbers.map(async (pageNumber) => {
        const page = await pdf.getPage(pageNumber);
        try {
          return {
            pageNumber,
            text: pdfTextContentToString(await page.getTextContent())
          };
        } finally {
          page.cleanup();
        }
      }));

      for (const item of batch) {
        if (!item.text) continue;
        const block = `[Page ${item.pageNumber}]\n${item.text}`;
        pages.push(block);
        extractedChars += block.length + 2;
        if (extractedChars >= DOCUMENT_TEXT_CHAR_LIMIT) break;
      }
    }

    const text = pages.join('\n\n').slice(0, DOCUMENT_TEXT_CHAR_LIMIT).trim();
    if (!text) throw new Error(t('This PDF has no extractable text. It may be a scanned document.'));

    const metadata = await metadataPromise;
    const metadataTitle = String(metadata?.info?.Title || '').trim();

    return {
      title: metadataTitle || documentTitleFromTab(tab, /\s*[-—]\s*PDF\s*$/i),
      url: tab.url || '',
      containerTitle: tab.title || '',
      documentSourceUrl: responseUrl || sourceUrl.href,
      selectedText: '',
      text,
      links: [],
      images: [],
      buttons: [],
      semanticItems: [],
      revision: Date.now(),
      extractor: 'pdfjs',
      extractorMs: Math.round((performance.now() - startedAt) * 10) / 10,
      documentType: 'pdf',
      pageCount: pdf.numPages,
      embeddedDocument: Boolean(resourceUrl)
    };
  } finally {
    await loadingTask.destroy().catch(() => {});
  }
}

async function extractEmbeddedPdfContext(tab) {
  if (!tab?.id) return null;
  const frames = await discoverEmbeddedDocumentFrames(tab.id);
  let fallbackAuthuser = '';
  try {
    const pageUrl = new URL(tab.url || '');
    fallbackAuthuser = pageUrl.searchParams.get('authuser') || pageUrl.searchParams.get('email') || '';
  } catch (_) {}

  let lastError = null;
  let activeViewerDetected = false;
  for (const frame of frames) {
    const resources = embeddedPdfResourceUrls(frame.url, fallbackAuthuser, frame.title);
    if (frame.priority <= 1 && (
      resources.length ||
      /\.pdf(?:\s*(?:[-—|]\s*.*)?)?$/i.test(String(frame.title || '').trim()) ||
      /^blob:https:\/\/(?:classroom|drive)\.google\.com\//i.test(frame.url || '')
    )) activeViewerDetected = true;
    for (const resourceUrl of resources) {
      try {
        return await extractPdfContext({
          ...tab,
          title: /\.pdf\b/i.test(frame.title) ? frame.title : tab.title
        }, { probe: true, resourceUrl });
      } catch (error) {
        lastError = error;
      }
    }
  }

  if (lastError) {
    lastError.dinsideEmbeddedDocumentDetected = activeViewerDetected;
    throw lastError;
  }
  if (activeViewerDetected) {
    const error = new Error(t('Could not extract page context.'));
    error.dinsideEmbeddedDocumentDetected = true;
    throw error;
  }
  return null;
}

async function extractSpecialDocumentContext(tab) {
  const kind = getSpecialDocumentKind(tab?.url || '', tab?.title || '');
  if (kind === 'google-docs') return extractGoogleDocsContext(tab);
  if (kind === 'pdf') return extractPdfContext(tab);
  if (kind === 'google-classroom' || kind === 'google-drive-pdf') {
    return extractEmbeddedPdfContext(tab);
  }
  return null;
}

async function extractPageContext(tab) {
  const specialDocumentKind = getSpecialDocumentKind(tab?.url || '', tab?.title || '');
  let specialDocumentError = null;
  let specialContext = null;
  try {
    specialContext = await extractSpecialDocumentContext(tab);
  } catch (error) {
    // An embedded PDF may resolve to an authenticated HTML preview instead of
    // the file itself. Keep the parent page pinnable through the DOM fallback.
    specialDocumentError = error;
  }
  if (specialContext) return specialContext;

  let context = null;

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'DINSIDE_READ_PAGE' });
    if (response?.ok) context = response.context;
  } catch (_) {
    // Existing tabs may not have the content script after an extension reload.
  }

  if (context) {
    // Never disguise a failed active PDF read as ordinary Classroom metadata.
    // That silently gives the model the wrong source while the UI says Full page.
    if (specialDocumentError?.dinsideEmbeddedDocumentDetected) throw specialDocumentError;
    return context;
  }

  // A tab that was already open when the unpacked extension reloaded can lose
  // its content-script receiver. Vendor Readability into the isolated world so
  // the direct fallback below still gets the same article extraction behavior.
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['vendor/Readability.js']
    });
  } catch (_) {}

  let results = null;
  try {
    results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const selectedText = window.getSelection()?.toString().trim() || '';
        const root = document.querySelector('main, article, [role="main"]') || document.body;
        const readableText = (el) => (el?.innerText || el?.textContent || '').trim();
        let text = (readableText(root) || readableText(document.body))
          .replace(/\n{3,}/g, '\n\n')
          .trim()
          .slice(0, 50000);

      const clean = (value = '') => String(value).replace(/\s+/g, ' ').trim();
      let extractor = 'dom';
      let extractorMs = 0;

      if (typeof Readability === 'function') {
        const bodyTextLength = (document.body?.innerText || document.body?.textContent || '').trim().length;
        const articleCount = document.querySelectorAll('article').length;
        const linkCount = document.querySelectorAll('a[href]').length;
        const mainH1Count = document.querySelectorAll('main h1, article h1, [role="main"] h1').length;
        const ogType = clean(document.querySelector('meta[property="og:type"]')?.content || '').toLowerCase();
        const hasArticleSchema = [...document.querySelectorAll('script[type="application/ld+json"]')]
          .some((script) => /Article|BlogPosting|NewsArticle|TechArticle/i.test(script.textContent || ''));
        const articleLike = bodyTextLength >= 700 && (
          ogType === 'article' ||
          hasArticleSchema ||
          articleCount === 1 ||
          (mainH1Count === 1 && articleCount <= 2 && linkCount < 180)
        );

        if (articleLike) {
          const startedAt = performance.now();
          try {
            const article = new Readability(document.cloneNode(true), { charThreshold: 400 }).parse();
            if (article?.content) {
              const holder = document.createElement('div');
              holder.innerHTML = article.content;
              const nestedBlockSelector = 'p,li,blockquote,pre,figcaption,th,td';
              const blocks = [...holder.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,blockquote,pre,figcaption,th,td')]
                .filter((el) => /^H[1-6]$/.test(el.tagName) || !el.parentElement?.closest(nestedBlockSelector))
                .map((el) => el.tagName === 'PRE'
                  ? String(el.textContent || '').replace(/\r\n?/g, '\n').replace(/^\n+|\n+$/g, '')
                  : clean(el.textContent || ''))
                .filter(Boolean);
              const articleText = (blocks.length ? blocks.join('\n\n') : String(article.textContent || ''))
                .replace(/\n{3,}/g, '\n\n')
                .trim();
              if (articleText.length >= 400) {
                text = articleText.slice(0, 50000);
                extractor = 'readability-fallback';
                extractorMs = Math.round((performance.now() - startedAt) * 10) / 10;
              }
            }
          } catch (_) {}
        }
      }
      const visible = (el) => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 &&
          rect.width > 0 && rect.height > 0 && rect.bottom >= 0 && rect.right >= 0 && rect.top <= innerHeight && rect.left <= innerWidth;
      };

      const links = [...root.querySelectorAll('a[href]')]
        .filter(visible)
        .map((el) => ({ text: clean(el.innerText || el.getAttribute('aria-label') || el.title || ''), href: el.href }))
        .filter((item) => item.href && item.text)
        .slice(0, 40);

      const images = [...root.querySelectorAll('img')]
        .filter(visible)
        .map((img) => ({
          alt: clean(img.alt || ''),
          src: img.currentSrc || img.src || '',
          title: clean(img.title || ''),
          caption: clean(img.closest('figure')?.querySelector('figcaption')?.innerText || '')
        }))
        .filter((item) => item.src)
        .slice(0, 20);

      const buttons = [...root.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]')]
        .filter(visible)
        .map((el) => ({ label: clean(el.innerText || el.getAttribute('aria-label') || el.value || el.title || '') }))
        .filter((item) => item.label)
        .slice(0, 30);

      return {
        title: document.title,
        url: location.href,
        selectedText,
        text,
        links,
        images,
        buttons,
        revision: Date.now(),
        extractor,
        extractorMs
      };
      }
    });
  } catch (domError) {
    // A document viewer can block DOM injection while exposing the real PDF in
    // an iframe, object, link, or loaded resource. Prefer those candidates.
    try {
      const embeddedContext = await extractEmbeddedPdfContext(tab);
      if (embeddedContext) return embeddedContext;
    } catch (embeddedError) {
      specialDocumentError ||= embeddedError;
    }

    // Some PDF endpoints do not end in .pdf. Chrome still opens them in its
    // privileged viewer, so a failed DOM injection is the safe point to probe
    // the response signature without downloading every ordinary webpage.
    let directPdfError = null;
    try {
      const pdfContext = await extractPdfContext(tab, { probe: true });
      if (pdfContext) return pdfContext;
    } catch (pdfError) {
      // A probe receiving HTML is expected for authenticated preview pages and
      // must not become a persistent chrome://extensions error entry.
      directPdfError = pdfError;
    }
    if (specialDocumentKind === 'pdf' || specialDocumentKind === 'google-drive-pdf') {
      throw specialDocumentError || directPdfError || domError;
    }
    throw domError;
  }

  const fallbackContext = results?.[0]?.result || null;
  if (fallbackContext && !state.selectedTextContextEnabled) fallbackContext.selectedText = '';
  return fallbackContext;
}

async function readPage({ force = false, attach = false } = {}) {
  state.contextReadError = '';

  try {
    const tab = await getActiveTab();
    if (!tab?.id) throw new Error(t('No active tab found.'));
    if (isRestrictedUrl(tab.url)) throw new Error(t('Chrome internal pages cannot be read.'));

    state.activeTabId = tab.id;
    if (await shouldUseManualPdfUpload(tab, { force })) {
      setStatus(() => t('PDF detected · upload the file to chat'), 'ready');
      renderContextChips();
      return null;
    }
    setStatus(() => t('Reading page…'), 'busy');
    const liveState = await askPageState(tab.id);
    const currentUrl = liveState?.url || tab.url || '';
    const key = makePageKey(tab.id, currentUrl);
    const cached = getCachedPage(key);
    const cachedMatchesDocument = embeddedDocumentContextMatchesTab(cached, tab);

    if (!force && cached && cachedMatchesDocument && !liveState?.dirty) {
      if (attach) {
        state.sentAttached.delete(key);
        state.attachedPages.set(key, cached);
      }
      updateContextUI(cached, { cached: true });
      return cached;
    }

    const context = await refreshPageContext(tab, currentUrl, { force });
    if (!context) throw new Error(state.contextReadError || t('Could not extract page context.'));

    const contextKey = makePageKey(tab.id, context.url);
    if (attach) {
      state.sentAttached.delete(contextKey);
      state.attachedPages.set(contextKey, context);
    }
    return context;
  } catch (error) {
    state.pageContext = null;
    setStatus(() => error.message, 'error');
    if (!state.attachedPages.size) $('contextBar').classList.add('hidden');
    return null;
  }
}

// Pinned context is intentionally different from ordinary page/viewport dedupe:
// once the user pins a snapshot it stays in every prompt until explicitly unpinned.
// A full-page pin is skipped only while that exact URL is already being sent as the
// current page; viewport pins remain included because they represent a frozen slice.
function getAttachedPagesForNextPrompt(excludeUrl = '') {
  const contexts = [];

  for (const context of state.attachedPages.values()) {
    if (!context?.url) continue;
    if (context.url === excludeUrl && context.pinScope !== 'viewport') continue;
    contexts.push(context);
  }

  return { contexts, commits: [] };
}

function buildNonPageContextSnapshot() {
  const attached = getAttachedPagesForNextPrompt();
  return {
    payload: attached.contexts.length ? {
      type: 'ATTACHED_PAGES',
      context: null,
      viewport: null,
      attachedPages: attached.contexts
    } : null,
    commit: { page: null, viewport: null, attached: attached.commits }
  };
}

function createDeliveryToken() {
  if (globalThis.crypto?.randomUUID) return `dinside-delivery-${crypto.randomUUID()}`;
  return `dinside-delivery-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function prunePendingDeliveries() {
  const cutoff = Date.now() - 60000;
  for (const [token, delivery] of state.pendingDeliveries.entries()) {
    if ((delivery?.createdAt || 0) < cutoff) state.pendingDeliveries.delete(token);
  }
}

function registerPendingDelivery(commit, requestId = '') {
  const hasChanges = Boolean(
    commit?.page || commit?.viewport || commit?.attached?.length
  );
  if (!hasChanges) return '';

  prunePendingDeliveries();
  const token = createDeliveryToken();
  state.pendingDeliveries.set(token, {
    commit,
    requestId,
    epoch: state.deliveryEpoch,
    createdAt: Date.now()
  });
  return token;
}

function commitContextDelivery(deliveryToken) {
  if (!deliveryToken) return false;
  const delivery = state.pendingDeliveries.get(deliveryToken);
  state.pendingDeliveries.delete(deliveryToken);
  if (!delivery || delivery.epoch !== state.deliveryEpoch) return false;

  const { page, viewport, attached = [] } = delivery.commit || {};
  if (page?.key && page.fingerprint) {
    state.sent.set(page.key, page.fingerprint);
    if (page.snapshot) state.sentPageSnapshots.set(page.key, page.snapshot);
  }
  if (viewport?.key && viewport.value) {
    state.sentViewport.set(viewport.key, viewport.value);
  }
  for (const item of attached) {
    if (item?.key && item.fingerprint) {
      state.sentAttached.set(item.key, item.fingerprint);
    }
  }
  return true;
}

function discardContextDelivery(deliveryToken = '', requestId = '') {
  if (deliveryToken) state.pendingDeliveries.delete(deliveryToken);
  if (!requestId) return;
  for (const [token, delivery] of state.pendingDeliveries.entries()) {
    if (delivery?.requestId === requestId) state.pendingDeliveries.delete(token);
  }
}

function cancelContextWarmup() {
  clearTimeout(state.contextWarmTimer);
  state.contextWarmTimer = null;
  if (state.contextWarmIdleId != null && typeof cancelIdleCallback === 'function') {
    cancelIdleCallback(state.contextWarmIdleId);
  }
  state.contextWarmIdleId = null;
}

function scheduleContextWarmup(delay = PRELOAD_IDLE_DELAY_MS, { reset = true } = {}) {
  if (!['preload', 'smart'].includes(state.contextMode) || !state.pageFollowEnabled) {
    cancelContextWarmup();
    return;
  }
  if (!reset && (state.contextWarmTimer || state.contextWarmIdleId != null)) return;

  cancelContextWarmup();
  state.contextWarmTimer = setTimeout(() => {
    state.contextWarmTimer = null;
    const run = () => {
      state.contextWarmIdleId = null;
      warmActiveContext();
    };
    if (typeof requestIdleCallback === 'function') {
      state.contextWarmIdleId = requestIdleCallback(run, { timeout: 1500 });
    } else {
      run();
    }
  }, Math.max(0, delay));
}

function scheduleViewportWarmup(delay = 60) {
  clearTimeout(state.viewportWarmTimer);
  state.viewportWarmTimer = setTimeout(() => warmActiveViewport(), delay);
}

async function warmActiveViewport() {
  if (state.viewportWarmInFlight || !state.activeTabId) return;
  state.viewportWarmInFlight = true;
  const tabId = state.activeTabId;
  try {
    const viewport = await readViewportContext(tabId);
    if (viewport && state.activeTabId === tabId) state.latestViewport.set(tabId, viewport);
  } catch (_) {
    // Keep the last viewport snapshot; Send has its own short fresh-read budget.
  } finally {
    state.viewportWarmInFlight = false;
  }
}

async function validateCachedPageContext(tab, expectedUrl, cached) {
  if (!tab?.id || !expectedUrl || !cached) return null;

  // A PDF URL is an immutable-enough cache key for normal browsing and avoids
  // reparsing the same file on every prompt. Force refresh still bypasses this.
  if (cached.extractor === 'pdfjs' && !cached.embeddedDocument) {
    const key = makePageKey(tab.id, expectedUrl);
    state.pageRefreshAt.set(key, Date.now());
    return { same: true, url: expectedUrl, reason: 'pdf-url-cache' };
  }

  if (cached.extractor === 'pdfjs' && cached.embeddedDocument) {
    const same = embeddedDocumentContextMatchesTab(cached, tab);
    if (same) {
      const key = makePageKey(tab.id, expectedUrl);
      state.pageRefreshAt.set(key, Date.now());
    }
    return {
      same,
      url: expectedUrl,
      reason: same ? 'embedded-pdf-title-match' : 'embedded-pdf-changed'
    };
  }

  // Google Docs can change without a meaningful DOM fingerprint because the
  // editor is canvas-backed. Re-export it when the full context is refreshed.
  if (cached.extractor === 'google-docs-export') return null;

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'DINSIDE_VALIDATE_PAGE_CONTEXT',
      expectedUrl
    });
    const validation = response?.ok ? response.validation : null;
    if (!validation) return null;

    // Navigation is a hard boundary. Never validate/reuse a cached route against
    // a document that has already moved somewhere else.
    if (validation.url && validation.url !== expectedUrl) return validation;
    if (!validation.same) {
      console.log('[DinSide] cached page validation', {
        url: expectedUrl,
        same: false,
        reason: validation.reason || 'changed',
        validationMs: validation.validationMs ?? null
      });
      return validation;
    }

    const key = makePageKey(tab.id, expectedUrl);
    // A successful cheap validation is a freshness check: extend the cache TTL
    // without paying for a second Readability/full-DOM extraction.
    state.pageRefreshAt.set(key, Date.now());
    if (state.activeTabId === tab.id) {
      const activeUrl = state.latestPageState?.url || expectedUrl;
      if (!activeUrl || activeUrl === expectedUrl) {
        state.pageContext = cached;
        state.latestPageState = {
          ...(state.latestPageState || {}),
          title: state.latestPageState?.title || cached.title || tab.title || '',
          url: expectedUrl,
          revision: validation.revision ?? state.latestPageState?.revision,
          dirty: false
        };
        updateContextUI(cached, { cached: true });
        scheduleContextInspectorRefresh(40);
      }
    }
    console.log('[DinSide] cached page validation', {
      url: expectedUrl,
      same: true,
      reason: validation.reason || 'fingerprint-match',
      textLength: validation.textLength ?? null,
      blockCount: validation.blockCount ?? null,
      validationMs: validation.validationMs ?? null
    });
    return validation;
  } catch (_) {
    // Older/stale content scripts do not know the validation message. Fall back
    // to the existing full extraction path rather than risking stale context.
    return null;
  }
}

function refreshPageContext(tab, expectedUrl = '', { force = false } = {}) {
  if (!tab?.id) return Promise.resolve(null);
  const targetUrl = expectedUrl || tab.url || '';
  const pageKey = makePageKey(tab.id, targetUrl);
  const containerIdentity = ['google-classroom', 'google-drive-pdf'].includes(
    getSpecialDocumentKind(targetUrl, tab.title || '')
  ) ? documentContainerIdentity(tab.title) : '';
  // A Classroom/Drive modal can replace the embedded file without changing the
  // parent URL. Keep those reads separate so a new file never joins an in-flight
  // extraction that belongs to the previous viewer title.
  const requestKey = containerIdentity ? `${pageKey}\ndocument:${containerIdentity}` : pageKey;
  const existing = state.pageRefreshInFlight.get(requestKey);
  if (existing) return existing;
  state.contextReadError = '';

  const refresh = (async () => {
    if (await shouldUseManualPdfUpload(tab)) return null;
    const cached = getCachedPage(pageKey);
    if (!force && cached && targetUrl) {
      const validation = await validateCachedPageContext(tab, targetUrl, cached);
      if (validation?.url && validation.url !== targetUrl) return null;
      if (validation?.same) return cached;
    }

    const context = await extractPageContext(tab);
    if (!context) return null;
    if (context.embeddedDocument) {
      const currentTab = await chrome.tabs.get(tab.id).catch(() => null);
      if (!currentTab || !embeddedDocumentContextMatchesTab(context, currentTab)) {
        // The user switched the open Classroom/Drive file while this PDF was
        // still parsing. Discard the late result instead of poisoning the cache.
        return null;
      }
    }
    state.contextReadError = '';

    const contextUrl = context.url || targetUrl || tab.url || '';
    const contextKey = makePageKey(tab.id, contextUrl);
    setCachedPage(contextKey, context);
    state.pageRefreshAt.set(contextKey, Date.now());

    const activeUrl = state.latestPageState?.url || '';
    if (state.activeTabId === tab.id && (!activeUrl || activeUrl === contextUrl)) {
      state.pageContext = context;
      state.latestPageState = {
        ...(state.latestPageState || {}),
        title: context.title || state.latestPageState?.title || tab.title || '',
        url: contextUrl,
        dirty: false
      };
      updateContextUI(context, { cached: false });
    }
    return context;
  })()
    .catch((error) => {
      state.contextReadError = error?.message || String(error || '');
      console.warn('[DinSide] page context extraction failed', error);
      return null;
    })
    .finally(() => state.pageRefreshInFlight.delete(requestKey));

  state.pageRefreshInFlight.set(requestKey, refresh);
  return refresh;
}

async function warmActiveContext() {
  if (
    !['preload', 'smart'].includes(state.contextMode) ||
    !state.pageFollowEnabled ||
    state.contextWarmInFlight ||
    document.visibilityState === 'hidden'
  ) return;
  state.contextWarmInFlight = true;

  try {
    const tab = await getActiveTab();
    if (!tab?.id || isRestrictedUrl(tab.url)) return;

    state.activeTabId = tab.id;
    if (await shouldUseManualPdfUpload(tab)) {
      setStatus(() => t('PDF detected · upload the file to chat'), 'ready');
      return;
    }
    const [liveState, viewport] = await Promise.all([
      askPageState(tab.id),
      readViewportContext(tab.id)
    ]);

    state.latestPageState = liveState || {
      title: tab.title || '',
      url: tab.url || '',
      dirty: false
    };
    if (viewport) state.latestViewport.set(tab.id, viewport);

    const url = liveState?.url || viewport?.url || tab.url || '';
    const key = makePageKey(tab.id, url);
    const cached = getCachedPage(key);
    const lastRefreshAt = state.pageRefreshAt.get(key) || 0;
    const elapsed = Date.now() - lastRefreshAt;

    // Smart only warms a full snapshot when page signals say the whole page is
    // cheap/useful by default. Feeds and expensive pages keep viewport state only.
    if (state.contextMode === 'smart') {
      const signals = getSmartPageSignals(liveState, viewport, cached);
      const worthWarmingFull = signals.cheapFull || signals.moderateArticle ||
        (signals.smallPage && !signals.feedLike) ||
        Boolean(signals.specialDocumentKind) ||
        (signals.documentLike && signals.textLength <= SMART_MODERATE_ARTICLE_CHARS);
      if (!worthWarmingFull) return;
    }

    if (!cached) {
      await refreshPageContext(tab, url);
      return;
    }

    if (!liveState?.dirty) return;
    if (elapsed >= PRELOAD_REFRESH_THROTTLE_MS) {
      await refreshPageContext(tab, url);
      return;
    }

    // Dynamic pages may mutate continuously. Keep one eventual refresh queued,
    // but never full-scan more than once per throttle window.
    scheduleContextWarmup(
      Math.max(250, PRELOAD_REFRESH_THROTTLE_MS - elapsed + 100),
      { reset: false }
    );
  } catch (_) {
    // Keep the previous warm snapshot; Send can still use the last known context.
  } finally {
    state.contextWarmInFlight = false;
  }
}

async function buildSmartContextSnapshotForNextPrompt({
  ignoreExclusions = false,
  promptText = '',
  waitForSlowContext = true
} = {}) {
  if (!state.pageFollowEnabled) {
    const attached = getAttachedPagesForNextPrompt();
    return {
      payload: attached.contexts.length ? {
        type: 'ATTACHED_PAGES', context: null, viewport: null,
        attachedPages: attached.contexts
      } : null,
      commit: { page: null, viewport: null, attached: attached.commits }
    };
  }

  let tab = null;
  try {
    tab = await getActiveTab();
  } catch (_) {}

  if (!tab?.id || isRestrictedUrl(tab.url || '')) {
    const attached = getAttachedPagesForNextPrompt();
    return {
      payload: attached.contexts.length ? {
        type: 'ATTACHED_PAGES', context: null, viewport: null,
        attachedPages: attached.contexts
      } : null,
      commit: { page: null, viewport: null, attached: attached.commits }
    };
  }

  if (await shouldUseManualPdfUpload(tab)) {
    setStatus(() => t('PDF detected · upload the file to chat'), 'ready');
    return buildNonPageContextSnapshot();
  }

  const previousTabId = state.activeTabId;
  const previousSmartPageKey = state.smartPageKey;
  const tabId = tab.id;
  let liveState = previousTabId === tabId ? state.latestPageState : null;
  const tabUrl = tab.url || '';

  if (!liveState || (tabUrl && liveState.url && tabUrl !== liveState.url)) {
    liveState = {
      title: tab.title || liveState?.title || '',
      url: tabUrl || liveState?.url || '',
      dirty: true
    };
  }
  state.activeTabId = tabId;

  let url = liveState?.url || tabUrl || '';
  let key = makePageKey(tabId, url);
  let viewport = state.latestViewport.get(tabId) || null;
  // latestViewport is keyed by tab id because scroll updates are frequent. A
  // navigation can reuse the same tab, so never carry a viewport across URLs.
  if (viewport?.url && url && viewport.url !== url) viewport = null;
  let context = getCachedPage(key) || (state.pageContext?.url === url ? state.pageContext : null);
  if (context && !embeddedDocumentContextMatchesTab(context, tab)) {
    context = null;
    if (state.pageContext?.url === url) state.pageContext = null;
    state.pageRefreshAt.delete(key);
  }

  const [freshState, freshViewport] = await Promise.all([
    waitForBudget(askPageState(tabId)),
    waitForBudget(readViewportContext(tabId))
  ]);

  // Prefer the tab/page-state URL over a viewport read: during navigation the
  // latter can briefly resolve with the previous document's snapshot.
  const observedUrl = freshState?.url || tabUrl || freshViewport?.url || url;
  const routeChanged = Boolean(observedUrl && observedUrl !== url);
  if (routeChanged) {
    url = observedUrl;
    key = makePageKey(tabId, url);
    context = getCachedPage(key) || null;
    viewport = freshViewport?.url === url ? freshViewport : null;
    liveState = {
      ...(freshState || liveState || {}),
      title: freshState?.title || freshViewport?.title || tab.title || '',
      url,
      dirty: true
    };
  } else {
    if (freshViewport && (!freshViewport.url || !url || freshViewport.url === url)) {
      viewport = freshViewport;
    }
    liveState = {
      ...(liveState || {}),
      ...(freshState || {}),
      title: freshState?.title || liveState?.title || tab.title || '',
      url,
      dirty: freshState?.dirty ?? liveState?.dirty ?? false
    };
  }

  state.latestPageState = liveState;
  if (viewport) state.latestViewport.set(tabId, viewport);

  // Track the last page Smart actually prepared for a prompt. This survives
  // same-tab navigations even when syncActivePage() already replaced live state.
  const pageChanged = !previousSmartPageKey || previousSmartPageKey !== key;
  const decision = chooseSmartContextStrategy({
    promptText,
    liveState,
    viewport,
    context,
    key,
    pageChanged
  });
  state.smartPageKey = key;
  console.log('[DinSide] smart context strategy', decision);

  if (decision.strategy === 'refresh-full') {
    const refresh = refreshPageContext(tab, url);
    const refreshed = waitForSlowContext ? await refresh : await waitForBudget(refresh);
    if (refreshed?.url === url) {
      context = refreshed;
      if (state.latestPageState?.url === url && state.latestPageState?.dirty === false) {
        liveState = { ...liveState, dirty: false };
      }
    }
    if (waitForSlowContext && !refreshed && decision.specialDocumentKind && state.contextReadError) {
      throw new Error(state.contextReadError);
    }
  } else if (decision.strategy === 'viewport-preload') {
    scheduleContextWarmup(0, { reset: false });
  }

  const useFullPage = decision.strategy === 'cache-full' || decision.strategy === 'refresh-full';
  const usePageMeta = decision.strategy === 'viewport-meta';
  if (useFullPage && !context) context = makeMinimalPageContext(tab, liveState, viewport);

  const lastSentFingerprint = state.sent.get(key) || '';
  const lastSentViewport = state.sentViewport.get(key) || null;
  const pageExcluded = !ignoreExclusions && state.nextPromptExclusions.page;
  const viewportExcluded = !ignoreExclusions && state.nextPromptExclusions.viewport;
  const currentFingerprint = useFullPage && context ? fingerprintPageContext(context) : '';
  let pagePayload = null;
  let pageSnapshot = null;

  if (useFullPage && !pageExcluded && currentFingerprint && lastSentFingerprint !== currentFingerprint) {
    const update = choosePageUpdatePayload({ context, key, lastSentFingerprint, currentFingerprint });
    if (update) {
      pagePayload = { type: update.type, context: update.context };
      pageSnapshot = update.snapshot;
    }
  } else if (usePageMeta && !pageExcluded) {
    pagePayload = {
      type: 'PAGE_META',
      context: makeSmartPageMetaContext(tab, liveState, viewport, decision)
    };
  }

  const viewportChangedRaw = viewportMeaningfullyChanged(lastSentViewport, viewport);
  const viewportChanged = !viewportExcluded && viewportChangedRaw;
  const viewportType = viewportChanged
    ? (lastSentViewport ? 'VIEWPORT_CONTEXT_UPDATE' : 'VIEWPORT_CONTEXT')
    : '';

  const attached = getAttachedPagesForNextPrompt(context?.url || url);
  const hasPayload = Boolean(pagePayload || viewportChanged || attached.contexts.length);

  return {
    payload: hasPayload ? {
      type: pagePayload?.type || viewportType,
      context: pagePayload?.context || null,
      viewport: viewportChanged ? viewport : null,
      viewportType,
      attachedPages: attached.contexts
    } : null,
    commit: {
      page: useFullPage && pagePayload ? { key, fingerprint: currentFingerprint, snapshot: pageSnapshot } : null,
      viewport: viewportChanged ? { key, value: viewport } : null,
      attached: attached.commits
    }
  };
}

// Send is deliberately bounded: viewport/page-state reads get a small budget,
// while full-page extraction uses stale-while-revalidate. URL changes are a hard
// boundary, so cached context from another route is never reused.
async function buildContextSnapshotForNextPrompt({
  ignoreExclusions = false,
  waitForSlowContext = true
} = {}) {
  if (!state.pageFollowEnabled) {
    const attached = getAttachedPagesForNextPrompt();
    return {
      payload: attached.contexts.length ? {
        type: 'ATTACHED_PAGES', context: null, viewport: null,
        attachedPages: attached.contexts
      } : null,
      commit: { page: null, viewport: null, attached: attached.commits }
    };
  }

  let tab = null;
  try {
    tab = await getActiveTab();
  } catch (_) {}

  if (!tab?.id || isRestrictedUrl(tab.url || '')) {
    const attached = getAttachedPagesForNextPrompt();
    return {
      payload: attached.contexts.length ? {
        type: 'ATTACHED_PAGES', context: null, viewport: null,
        attachedPages: attached.contexts
      } : null,
      commit: { page: null, viewport: null, attached: attached.commits }
    };
  }

  if (await shouldUseManualPdfUpload(tab)) {
    setStatus(() => t('PDF detected · upload the file to chat'), 'ready');
    return buildNonPageContextSnapshot();
  }

  const previousTabId = state.activeTabId;
  let tabId = tab.id;
  let liveState = previousTabId === tabId ? state.latestPageState : null;
  const tabUrl = tab.url || '';

  // Chrome's tab URL is cheap and catches real navigation before any cached
  // page-state message arrives. A new URL is a hard cache boundary.
  if (!liveState || (tabUrl && liveState.url && tabUrl !== liveState.url)) {
    liveState = {
      title: tab.title || liveState?.title || '',
      url: tabUrl || liveState?.url || '',
      dirty: true
    };
  }
  state.activeTabId = tabId;

  let url = liveState?.url || tabUrl || '';
  let key = makePageKey(tabId, url);
  let viewport = state.latestViewport.get(tabId) || null;
  let context = getCachedPage(key) || (state.pageContext?.url === url ? state.pageContext : null);
  if (context && !embeddedDocumentContextMatchesTab(context, tab)) {
    context = null;
    if (state.pageContext?.url === url) state.pageContext = null;
    state.pageRefreshAt.delete(key);
  }
  const specialDocumentKind = getSpecialDocumentKind(url, liveState?.title || tab.title || '');
  const needsInitialDocumentRead = Boolean(specialDocumentKind) && (
    !context ||
    (['google-classroom', 'google-drive-pdf'].includes(specialDocumentKind) && context.extractor !== 'pdfjs')
  );

  // Only start heavy extraction inside the Send budget when there is no usable
  // full-page snapshot yet. A dirty cached page is stale-while-revalidate: Send first,
  // then refresh on a later task so source-page DOM work cannot contend with Enter.
  // Document viewers are the exception: their ordinary DOM is only viewer chrome,
  // so the first prompt must wait for actual document extraction instead of sending
  // misleading Classroom/Drive metadata.
  let refreshPromise = (!context || needsInitialDocumentRead)
    ? refreshPageContext(tab, url, { force: needsInitialDocumentRead })
    : null;
  const [freshState, freshViewport, fastContext] = await Promise.all([
    waitForBudget(askPageState(tabId)),
    waitForBudget(readViewportContext(tabId)),
    refreshPromise
      ? (needsInitialDocumentRead && waitForSlowContext ? refreshPromise : waitForBudget(refreshPromise))
      : Promise.resolve(null)
  ]);
  if (waitForSlowContext && needsInitialDocumentRead && !fastContext && state.contextReadError) {
    throw new Error(state.contextReadError);
  }

  const observedUrl = freshState?.url || freshViewport?.url || tabUrl || url;
  const routeChanged = Boolean(observedUrl && observedUrl !== url);
  if (routeChanged) {
    url = observedUrl;
    key = makePageKey(tabId, url);
    context = getCachedPage(key) || null;
    viewport = freshViewport?.url === url ? freshViewport : null;
    liveState = {
      ...(freshState || liveState || {}),
      title: freshState?.title || freshViewport?.title || tab.title || '',
      url,
      dirty: true
    };
    // Do not await a second full extraction after discovering an SPA route change.
    refreshPromise = refreshPageContext(tab, url);
  } else {
    if (fastContext?.url === url) context = fastContext;
    if (freshViewport) viewport = freshViewport;
    liveState = {
      ...(liveState || {}),
      ...(freshState || {}),
      title: freshState?.title || liveState?.title || tab.title || '',
      url,
      dirty: freshState?.dirty ?? liveState?.dirty ?? false
    };
  }

  const refreshedContext = getCachedPage(key);
  if (refreshedContext && refreshedContext !== context) {
    context = refreshedContext;
    liveState = { ...liveState, dirty: false };
  }

  state.latestPageState = liveState;
  if (viewport) state.latestViewport.set(tabId, viewport);

  // Same-URL DOM changes are soft-stale: use the last complete snapshot now and
  // let refresh finish in the background. This is the key to instant Send on long pages.
  if (!context) context = makeMinimalPageContext(tab, liveState, viewport);
  if (liveState?.dirty && !refreshPromise) {
    setTimeout(() => refreshPageContext(tab, url), 0);
  }

  const lastSentFingerprint = state.sent.get(key) || '';
  const lastSentViewport = state.sentViewport.get(key) || null;

  const currentFingerprint = fingerprintPageContext(context);
  const pageExcluded = !ignoreExclusions && state.nextPromptExclusions.page;
  const viewportExcluded = !ignoreExclusions && state.nextPromptExclusions.viewport;
  let pagePayload = null;
  let pageSnapshot = null;

  if (!pageExcluded && context && currentFingerprint && lastSentFingerprint !== currentFingerprint) {
    const update = choosePageUpdatePayload({ context, key, lastSentFingerprint, currentFingerprint });
    if (update) {
      pagePayload = { type: update.type, context: update.context };
      pageSnapshot = update.snapshot;
    }
  }

  const viewportChangedRaw = viewportMeaningfullyChanged(lastSentViewport, viewport);
  const viewportChanged = !viewportExcluded && viewportChangedRaw;
  const viewportType = viewportChanged
    ? (lastSentViewport ? 'VIEWPORT_CONTEXT_UPDATE' : 'VIEWPORT_CONTEXT')
    : '';

  const attached = getAttachedPagesForNextPrompt(context?.url || url);
  const hasPayload = Boolean(pagePayload || viewportChanged || attached.contexts.length);

  return {
    payload: hasPayload ? {
      type: pagePayload?.type || viewportType,
      context: pagePayload?.context || null,
      viewport: viewportChanged ? viewport : null,
      viewportType,
      attachedPages: attached.contexts
    } : null,
    commit: {
      page: pagePayload ? { key, fingerprint: currentFingerprint, snapshot: pageSnapshot } : null,
      viewport: viewportChanged ? { key, value: viewport } : null,
      attached: attached.commits
    }
  };
}

async function getContextSnapshotForNextPrompt(options = {}) {
  const startedAt = performance.now();
  const snapshot = state.contextMode === 'smart'
    ? await buildSmartContextSnapshotForNextPrompt(options)
    : await buildContextSnapshotForNextPrompt(options);
  console.log('[DinSide] context prepare ms', Math.round((performance.now() - startedAt) * 10) / 10);
  console.log('[DinSide] context state', {
    pageFollowEnabled: state.pageFollowEnabled,
    activeTabId: state.activeTabId,
    latestPageState: state.latestPageState,
    pageContext: state.pageContext,
    cacheSize: state.cache.size
  });
  console.log('[DinSide] prompt payload', snapshot.payload);
  return snapshot;
}

async function getContextForNextPrompt() {
  return (await getContextSnapshotForNextPrompt()).payload;
}

async function prepareContextForPrompt(requestId = '', { promptText = '' } = {}) {
  await ensurePageFollowSettingLoaded();
  const snapshot = await getContextSnapshotForNextPrompt({ promptText });
  return {
    payload: snapshot.payload,
    deliveryToken: registerPendingDelivery(snapshot.commit, requestId)
  };
}

function buildSkillsEnvelope() {
  const attached = state.skills.filter((skill) => skill.enabled && skill.prompt?.trim());
  if (!attached.length) return '';

  return [
    '[DINSIDE_SKILLS]',
    'Apply the following attached skills as additional instructions for this prompt only:',
    ...attached.map((skill, index) => `\n[SKILL_${index + 1}: ${skill.name || 'Untitled'}]\n${skill.prompt.trim()}\n[/SKILL_${index + 1}]`),
    '[/DINSIDE_SKILLS]'
  ].join('\n');
}

function buildContextEnvelope(payload) {
  const skillsSection = buildSkillsEnvelope();
  if (!payload) {
    console.log('[DinSide] envelope length', skillsSection.length);
    return skillsSection;
  }
  const effectivePayload = compressContextPayload(payload);
  const {
    type,
    context,
    viewport,
    viewportType = 'VIEWPORT_CONTEXT',
    attachedPages = []
  } = effectivePayload;
  // Selected text is owned exclusively by the active provider bridge. Keeping it out of
  // PAGE/VIEWPORT envelopes prevents duplicate SELECTED_TEXT blocks.

  const links = (context?.links || []).length
    ? ['Links:', ...(context?.links || []).map((item, index) =>
        `- [link${index + 1}] "${item.text || item.title || 'Untitled link'}" -> ${item.href}`
      )].join('\n')
    : '';

  const images = (context?.images || []).length
    ? [
        'Images:',
        ...(context?.images || []).map((item, index) => {
          const id = `img${index + 1}`;
          const src = item.src || '';
          const embedded = /^data:image\//i.test(src) || /^blob:/i.test(src);
          return [
            `- id: ${id}`,
            embedded ? '  source: embedded' : `  url: ${src}`,
            `  alt: "${item.alt || ''}"`,
            item.title ? `  title: "${item.title}"` : '',
            item.caption ? `  caption: "${item.caption}"` : '',
            item.nearbyText ? `  nearby_text: "${item.nearbyText}"` : ''
          ].filter(Boolean).join('\n');
        })
      ].join('\n')
    : '';

  const buttons = (context?.buttons || []).length
    ? ['Buttons:', ...(context?.buttons || []).map((item, index) =>
        `- [button${index + 1}] "${item.label}"${item.disabled ? ' (disabled)' : ''}`
      )].join('\n')
    : '';

  const semanticItems = (context?.semanticItems || []).length
    ? ['Interactive / semantic content:', ...(context.semanticItems || []).map((item, index) =>
        `- [semantic${index + 1}]${item.eventId ? ' [event]' : ''}${item.role ? ` [role=${item.role}]` : ''} ${item.text}`
      )].join('\n')
    : '';

  const pageSection = context ? (() => {
    if (type === 'PAGE_CONTEXT_DIFF') {
      const stats = context.diffStats || {};
      const summary = [
        Number(stats.changed || 0) ? `${stats.changed} changed` : '',
        Number(stats.added || 0) ? `${stats.added} added` : '',
        Number(stats.removed || 0) ? `${stats.removed} removed` : ''
      ].filter(Boolean).join(' · ');
      return [
        '[PAGE_CONTEXT_DIFF]',
        `Title: ${context.title || ''}`,
        `URL: ${context.url || ''}`,
        summary ? `Diff summary: ${summary}` : '',
                'Changed since last message:',
        context.text || '',
        'Apply this diff to the previously supplied page context; unchanged page content remains the same.',
        '[/PAGE_CONTEXT_DIFF]'
      ].filter(Boolean).join('\n\n');
    }
    return [
      `[${type}]`,
      `Title: ${context.title || ''}`,
      `URL: ${context.url || ''}`,
                  'Page content:',
      context.text || '',
      links,
      images,
      buttons,
      semanticItems,
      `[/${type}]`
    ].filter(Boolean).join('\n\n');
  })() : '';

  const viewportSection = viewport ? (() => {
    const visibleText = (viewport.blocks || []).length
      ? ['Visible text in the current viewport:', ...(viewport.blocks || []).map((item) => {
          const tag = String(item?.tag || 'p').toLowerCase();
          if (tag === 'code' || tag === 'terminal') {
            return `\`\`\`${tag}\n${item.text}\n\`\`\``;
          }
          return `- [${tag}] ${item.text}`;
        })].join('\n')
      : '';

    const visibleHeadings = (viewport.headings || []).length
      ? ['Visible headings:', ...(viewport.headings || []).map((heading) => `- ${heading}`)].join('\n')
      : '';

    const visibleImages = (viewport.images || []).length
      ? ['Visible images in viewport:', ...(viewport.images || []).map((item, index) => {
          const src = item.src || '';
          const embedded = /^data:image\//i.test(src) || /^blob:/i.test(src);
          return `- [viewport-img${index + 1}]${embedded ? ' embedded-image' : ` url=${src}`}${item.alt ? ` · alt="${item.alt}"` : ''}${item.nearbyText ? ` · nearby="${item.nearbyText}"` : ''}`;
        })].join('\n')
      : '';

    const visibleVideos = (viewport.videos || []).length
      ? ['Visible videos:', ...(viewport.videos || []).map((video) => {
          const time = video.currentTime == null ? 'unknown' : `${video.currentTime}s`;
          const duration = video.duration == null ? 'unknown' : `${video.duration}s`;
          return `- [${video.id}] time=${time}/${duration} · ${video.paused ? 'paused' : 'playing'} · rate=${video.playbackRate}`;
        })].join('\n')
      : '';

    const activeElement = viewport.activeElement
      ? [
          'Active element:',
          `- tag=${viewport.activeElement.tag || 'unknown'}`,
          viewport.activeElement.role ? `  role=${viewport.activeElement.role}` : '',
          viewport.activeElement.type ? `  type=${viewport.activeElement.type}` : '',
          viewport.activeElement.name ? `  name="${viewport.activeElement.name}"` : '',
          viewport.activeElement.label ? `  label="${viewport.activeElement.label}"` : '',
          viewport.activeElement.value ? `  value="${viewport.activeElement.value}"` : '',
          viewport.activeElement.text ? `  text="${viewport.activeElement.text}"` : ''
        ].filter(Boolean).join('\n')
      : '';

    return [
      `[${viewportType}]`,
      'Current viewport context. Use it to resolve references such as "this", "here", "đoạn này", "chỗ này", or "cái này".',
      `Scroll position: ${viewport.scrollPercent ?? 0}% (${viewport.scrollY ?? 0}px)`,
      `Viewport: ${viewport.viewportWidth || 0}x${viewport.viewportHeight || 0}`,
            visibleHeadings,
      visibleText,
      visibleImages,
      visibleVideos,
      activeElement,
      `[/${viewportType}]`
    ].filter(Boolean).join('\n\n');
  })() : '';

  const attachedSections = attachedPages
    .filter((item) => item?.url && (item.url !== context?.url || item.pinScope === 'viewport'))
    .map((item, index) => [
      `[PINNED_PAGE_${index + 1}]`,
      `Title: ${item.title || ''}`,
      `URL: ${item.url || ''}`,
      `Pinned scope: ${pinnedScopeLabel(item)}`,
      item.pinnedAt ? `Pinned at: ${new Date(item.pinnedAt).toISOString()}` : '',
                  'Pinned content:',
      item.text || '',
      `[/PINNED_PAGE_${index + 1}]`
    ].filter(Boolean).join('\n'));

  const envelope = [skillsSection, pageSection, viewportSection, ...attachedSections]
    .filter(Boolean)
    .join('\n\n');
  console.log('[DinSide] envelope length', envelope.length);
  return envelope;
}

// This is the bridge point for the active provider composer integration.
// The first prompt gets the best context available inside the Send budget; a full
// page snapshot can arrive as a later update after background refresh completes.
window.DinSideContext = {
  getContextForNextPrompt,
  prepareContextForPrompt,
  buildContextEnvelope,
  commitContextDelivery,
  discardContextDelivery,
  resetSentContext() {
    resetSentContextState();
    setStatus(() => t('Context will attach on next prompt'), 'busy');
  }
};

function selectedTextIdentityKey(selection = {}) {
  if (!selection?.text) return '';
  return [
    selection.url || '',
    selection.text,
    selection.domContext?.section || '',
    selection.domContext?.element || '',
    selection.domContext?.block || '',
    selection.domContext?.blockId || '',
    selection.sourceChunk || ''
  ].join('\n');
}

async function syncSelectedText({ force = false } = {}) {
  if (!state.selectedTextContextEnabled) return;
  try {
    const tab = await getActiveTab();
    if (!tab?.id || isRestrictedUrl(tab.url)) return;

    let liveState = await askPageState(tab.id);

    // The 250ms fallback poll must not mirror the Selection API while the user
    // is still dragging, otherwise it bypasses content.js's pointerup gate and
    // makes the transient card change before the mouse is released.
    if (liveState?.selectionDragging) return;

    let selectionPayload = liveState?.selection?.text ? liveState.selection : null;
    let text = String(selectionPayload?.text ?? liveState?.selectedText ?? '');
    const specialDocumentKind = getSpecialDocumentKind(
      liveState?.url || tab.url || '',
      liveState?.title || tab.title || ''
    );
    const rememberedDocumentSelection = Boolean(specialDocumentKind) &&
      state.lastKnownDocumentSelectionTabId === tab.id &&
      state.lastKnownDocumentSelection?.text
        ? state.lastKnownDocumentSelection
        : null;
    if ((!selectionPayload || !text.trim()) && rememberedDocumentSelection) {
      selectionPayload = rememberedDocumentSelection;
      text = rememberedDocumentSelection.text;
    }

    // Do not rely on the content script being fresh. After an extension reload,
    // already-open tabs may still run the previous content.js. If the live state
    // does not contain DOM-aware metadata, capture the current selection directly.
    if (!selectionPayload || (!selectionPayload.domContext?.blockId && !rememberedDocumentSelection)) {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        func: () => {
          const selection = window.getSelection();
          const exactText = selection?.toString() || '';
          if (!selection?.rangeCount || !exactText.trim()) {
            return { selection: null, title: document.title, url: location.href };
          }

          const clean = (value = '') => String(value || '')
            .replace(/\r/g, '')
            .split('\n')
            .map((line) => line.replace(/\s+/g, ' ').trim())
            .filter(Boolean)
            .join('\n')
            .trim();
          const elementFor = (node) => node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
          const range = selection.getRangeAt(0);
          const start = elementFor(range.startContainer);
          const blockSelector = 'pre,blockquote,li,td,th,tr,p,figcaption,dt,dd,h1,h2,h3,h4,h5,h6,[role="heading"],[role="listitem"],[role="row"],[role="cell"],[role="gridcell"]';
          const block = start?.closest?.(blockSelector) || elementFor(range.commonAncestorContainer) || start;
          const typeCandidates = [
            ['td,th,[role="cell"],[role="gridcell"]', 'table cell'],
            ['tr,[role="row"]', 'table row'],
            ['a[href],[role="link"]', 'link'],
            ['pre', 'code block'],
            ['code', 'code'],
            ['li,[role="listitem"]', 'list item'],
            ['blockquote', 'blockquote'],
            ['h1,h2,h3,h4,h5,h6,[role="heading"]', 'heading'],
            ['p', 'paragraph'],
            ['figcaption', 'figure caption']
          ];
          let elementType = String(start?.tagName || 'text').toLowerCase();
          let semantic = start;
          for (const [selector, label] of typeCandidates) {
            const match = start?.closest?.(selector);
            if (!match) continue;
            elementType = label;
            semantic = match;
            break;
          }

          const headingSelector = 'h1,h2,h3,h4,h5,h6,[role="heading"]';
          let section = '';
          if (block?.matches?.(headingSelector)) {
            section = clean(block.innerText || block.textContent || '');
          } else {
            const root = block?.closest?.('section,article,main,[role="region"]') || document.querySelector('main,article,[role="main"]') || document.body;
            for (const heading of root?.querySelectorAll?.(headingSelector) || []) {
              const position = heading.compareDocumentPosition(block);
              if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
                section = clean(heading.innerText || heading.textContent || '');
                continue;
              }
              if (position & Node.DOCUMENT_POSITION_PRECEDING) break;
            }
          }

          const blockId = (() => {
            if (!block?.tagName) return '';
            const parts = [];
            let current = block;
            let depth = 0;
            while (current?.tagName && current !== document.documentElement && depth < 8) {
              const tag = current.tagName.toLowerCase();
              const stableId = String(current.id || '').trim();
              if (stableId && stableId.length <= 80) {
                parts.unshift(`${tag}#${stableId}`);
                break;
              }
              let sameTagIndex = 1;
              let sibling = current.previousElementSibling;
              while (sibling) {
                if (sibling.tagName === current.tagName) sameTagIndex += 1;
                sibling = sibling.previousElementSibling;
              }
              parts.unshift(`${tag}:nth-of-type(${sameTagIndex})`);
              current = current.parentElement;
              depth += 1;
            }
            return parts.join('>');
          })();

          const full = clean(block?.innerText || block?.textContent || '');
          const selected = clean(exactText);
          let sourceChunk = '';
          const selectionCoversMostOfBlock = Boolean(selected && full.length && selected.length / full.length >= 0.7);
          if (full && full !== selected && !selectionCoversMostOfBlock) {
            if (full.length <= 1800) {
              sourceChunk = full;
            } else {
              const probe = selected.slice(0, 320);
              let index = probe ? full.indexOf(probe) : -1;
              if (index < 0) index = 0;
              let chunkStart = Math.max(0, index - 520);
              let chunkEnd = Math.min(full.length, chunkStart + 1800);
              if (chunkEnd === full.length) chunkStart = Math.max(0, chunkEnd - 1800);
              sourceChunk = `${chunkStart > 0 ? '…' : ''}${full.slice(chunkStart, chunkEnd)}${chunkEnd < full.length ? '…' : ''}`;
            }
          }

          return {
            title: document.title,
            url: location.href,
            selection: {
              text: exactText.slice(0, 12000),
              title: document.title,
              url: location.href,
              domContext: {
                section: section.slice(0, 240),
                element: elementType,
                tag: String(semantic?.tagName || '').toLowerCase(),
                block: String(block?.tagName || '').toLowerCase(),
                blockId
              },
              sourceChunk
            }
          };
        }
      });
      const direct = results?.map((item) => item?.result).find((item) => item?.selection?.text) || results?.[0]?.result;
      if (direct?.selection?.text) {
        selectionPayload = direct.selection;
        text = direct.selection.text;
        if (specialDocumentKind) {
          state.lastKnownDocumentSelection = direct.selection;
          state.lastKnownDocumentSelectionTabId = tab.id;
        }
        liveState = {
          ...(liveState || {}),
          selectedText: direct.selection.text,
          selection: direct.selection,
          title: direct.title,
          url: direct.url
        };
      }
    }

    if (!text.trim() || !selectionPayload) {
      if (state.lastForwardedSelection && !state.appendNextSelection) {
        state.lastForwardedSelection = '';
        state.lastForwardedSelectionFrame = '';
        state.lastKnownDocumentSelection = null;
        state.lastKnownDocumentSelectionTabId = null;
        clearSelectedTextInEmbeddedProvider();
        setStatus(() => t('Selection cleared'), 'ready');
      }
      return;
    }

    selectionPayload = {
      ...selectionPayload,
      text: text.slice(0, 12000),
      title: selectionPayload.title || liveState?.title || tab.title || '',
      url: selectionPayload.url || liveState?.url || tab.url || ''
    };
    const key = selectedTextIdentityKey(selectionPayload);
    if (state.appendNextSelection && key === state.appendBaselineSelection) return;
    if (key === state.lastForwardedSelection && !state.appendNextSelection && !force) return;

    const append = state.appendNextSelection && !state.appendPendingSelection;
    const replacePending = state.appendNextSelection && state.appendPendingSelection;
    const delivered = sendSelectedTextToEmbeddedProvider(selectionPayload, append, replacePending);
    if (!delivered) return;

    if (state.appendNextSelection) state.appendPendingSelection = true;
    state.lastForwardedSelection = key;
    setStatus(() => state.appendNextSelection ? t('Selection pending · select again to replace') : t`${getProviderName()} · selected text attached`, state.appendNextSelection ? 'busy' : 'ready');
  } catch (error) {
    console.warn('[DinSide] Could not sync selected text:', error);
  }
}

async function syncActivePage() {
  try {
    const tab = await getActiveTab();
    if (!tab?.id || isRestrictedUrl(tab.url)) return;

    state.activeTabId = tab.id;
    if (!state.pageFollowEnabled) {
      state.pageContext = null;
      setStatus(() => state.attachedPages.size ? t`${state.attachedPages.size} pinned context item${state.attachedPages.size === 1 ? '' : 's'}` : t('Page context off'), state.attachedPages.size ? 'ready' : 'idle');
      renderContextChips();
      return;
    }

    if (await shouldUseManualPdfUpload(tab)) {
      state.latestPageState = {
        title: tab.title || '',
        url: tab.url || '',
        dirty: false
      };
      setStatus(() => t('PDF detected · upload the file to chat'), 'ready');
      renderContextChips();
      scheduleContextInspectorRefresh(0);
      return;
    }

    const liveState = await askPageState(tab.id);
    state.latestPageState = liveState || { title: tab.title || '', url: tab.url || '', dirty: false };
    const url = liveState?.url || tab.url || '';
    const key = makePageKey(tab.id, url);
    const cached = getCachedPage(key);
    const cachedMatchesDocument = embeddedDocumentContextMatchesTab(cached, tab);

    if (cached && cachedMatchesDocument) {
      updateContextUI(cached, { cached: true, changed: Boolean(liveState?.dirty) });
      if (liveState?.dirty) {
        showChangedState(liveState);
        scheduleContextWarmup(900, { reset: false });
      }
      scheduleViewportWarmup(45);
      return;
    }

    if (cached && !cachedMatchesDocument) {
      state.cache.delete(key);
      state.pageRefreshAt.delete(key);
      state.sent.delete(key);
      state.sentPageSnapshots.delete(key);
      state.sentViewport.delete(key);
      state.latestViewport.delete(tab.id);
    }

    state.pageContext = null;
    setStatus(
      () => state.contextMode === 'preload'
        ? t('Context preload queued')
        : state.contextMode === 'smart'
          ? t('Smart context warming')
          : t('Context ready on send'),
      'idle'
    );
    scheduleViewportWarmup(45);
    scheduleContextWarmup(PRELOAD_IDLE_DELAY_MS);
  } catch (_) {}
}

async function selectCaptureRegion(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    args: [t('Drag to capture · Esc to cancel')],
    func: (captureHint) => new Promise((resolve) => {
      const old = document.getElementById('__dinside_capture_overlay__');
      if (old) old.remove();

      const overlay = document.createElement('div');
      overlay.id = '__dinside_capture_overlay__';
      Object.assign(overlay.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '2147483647',
        cursor: 'crosshair',
        userSelect: 'none',
        touchAction: 'none',
        background: 'rgba(0,0,0,.16)'
      });

      const selection = document.createElement('div');
      Object.assign(selection.style, {
        position: 'fixed',
        display: 'none',
        border: '2px solid #fff',
        borderRadius: '4px',
        boxShadow: '0 0 0 9999px rgba(0,0,0,.42)',
        pointerEvents: 'none'
      });

      const sizeLabel = document.createElement('div');
      Object.assign(sizeLabel.style, {
        position: 'absolute',
        left: '0',
        top: '-30px',
        padding: '4px 7px',
        borderRadius: '6px',
        background: 'rgba(15,17,21,.92)',
        color: '#fff',
        font: '12px/1.3 system-ui, sans-serif',
        whiteSpace: 'nowrap',
        pointerEvents: 'none'
      });
      selection.appendChild(sizeLabel);

      const hint = document.createElement('div');
      hint.textContent = captureHint;
      Object.assign(hint.style, {
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '7px 10px',
        borderRadius: '8px',
        background: 'rgba(15,17,21,.92)',
        color: '#fff',
        font: '12px/1.3 system-ui, sans-serif',
        boxShadow: '0 4px 18px rgba(0,0,0,.25)',
        pointerEvents: 'none'
      });

      overlay.append(selection, hint);
      document.documentElement.appendChild(overlay);

      let startX = 0;
      let startY = 0;
      let dragging = false;

      const cleanup = () => {
        window.removeEventListener('keydown', onKeyDown, true);
        window.removeEventListener('__DINSIDE_CANCEL_CAPTURE__', onCancelCapture, true);
        overlay.remove();
      };

      const finish = (value) => {
        cleanup();
        requestAnimationFrame(() => requestAnimationFrame(() => resolve(value)));
      };

      const updateSelection = (x, y) => {
        const left = Math.max(0, Math.min(startX, x));
        const top = Math.max(0, Math.min(startY, y));
        const right = Math.min(innerWidth, Math.max(startX, x));
        const bottom = Math.min(innerHeight, Math.max(startY, y));
        const width = Math.max(0, right - left);
        const height = Math.max(0, bottom - top);

        selection.style.display = 'block';
        selection.style.left = `${left}px`;
        selection.style.top = `${top}px`;
        selection.style.width = `${width}px`;
        selection.style.height = `${height}px`;
        sizeLabel.textContent = `${Math.round(width)} × ${Math.round(height)}`;
        return { left, top, width, height };
      };

      const onCancelCapture = () => finish(null);
      const onKeyDown = (event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        finish(null);
      };
      window.addEventListener('keydown', onKeyDown, true);
      window.addEventListener('__DINSIDE_CANCEL_CAPTURE__', onCancelCapture, true);

      overlay.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        dragging = true;
        startX = Math.max(0, Math.min(innerWidth, event.clientX));
        startY = Math.max(0, Math.min(innerHeight, event.clientY));
        overlay.setPointerCapture?.(event.pointerId);
        overlay.style.background = 'transparent';
        updateSelection(startX, startY);
        event.preventDefault();
      }, true);

      overlay.addEventListener('pointermove', (event) => {
        if (!dragging) return;
        updateSelection(event.clientX, event.clientY);
        event.preventDefault();
      }, true);

      overlay.addEventListener('pointerup', (event) => {
        if (!dragging) return;
        dragging = false;
        const rect = updateSelection(event.clientX, event.clientY);
        if (rect.width < 8 || rect.height < 8) {
          finish(null);
          return;
        }
        finish({
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          viewportWidth: innerWidth,
          viewportHeight: innerHeight,
          devicePixelRatio: window.devicePixelRatio || 1
        });
      }, true);
    })
  });

  return results?.[0]?.result || null;
}

async function mergeAnnotationDataUrl(baseDataUrl, annotationDataUrl) {
  const [base, annotation] = await Promise.all([new Image(), new Image()]);
  base.src = baseDataUrl;
  annotation.src = annotationDataUrl;
  await Promise.all([base.decode(), annotation.decode()]);

  const canvas = document.createElement('canvas');
  canvas.width = base.naturalWidth;
  canvas.height = base.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(base, 0, 0);
  ctx.drawImage(annotation, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

async function startDrawMode(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    args: [Object.fromEntries(['Rect', 'Arrow', 'Text', 'Undo (Ctrl+Z)', 'Redo (Ctrl+Y / Ctrl+Shift+Z)', 'Clear', 'Cancel', 'Done', 'Type…'].map((key) => [key, t(key)]))],
    func: (labels) => new Promise((resolve) => {
      document.getElementById('__dinside_draw_overlay__')?.remove();

      const dpr = window.devicePixelRatio || 1;
      const overlay = document.createElement('div');
      overlay.id = '__dinside_draw_overlay__';
      Object.assign(overlay.style, {
        position: 'fixed', inset: '0', zIndex: '2147483647',
        cursor: 'crosshair', userSelect: 'none', touchAction: 'none'
      });

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(innerWidth * dpr);
      canvas.height = Math.round(innerHeight * dpr);
      Object.assign(canvas.style, { width: '100vw', height: '100vh', display: 'block' });
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#ff4d4f';

      const bar = document.createElement('div');
      Object.assign(bar.style, {
        position: 'fixed', top: '14px', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: '4px', padding: '5px',
        borderRadius: '12px', background: 'rgba(24,24,24,.96)',
        boxShadow: '0 8px 28px rgba(0,0,0,.35)', color: '#fff',
        font: '12px/1 system-ui,sans-serif', pointerEvents: 'auto'
      });

      let tool = 'pen';
      let drawing = false;
      let startX = 0;
      let startY = 0;
      let snapshot = null;
      const undoStack = [];
      const redoStack = [];
      const HISTORY_LIMIT = 50;

      const captureState = () => ctx.getImageData(0, 0, canvas.width, canvas.height);
      const restoreState = (imageData) => {
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        if (imageData) ctx.putImageData(imageData, 0, 0);
      };
      const pushUndo = (imageData = captureState()) => {
        undoStack.push(imageData);
        if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
        redoStack.length = 0;
        updateHistoryButtons();
      };
      const undo = () => {
        if (!undoStack.length || drawing) return;
        redoStack.push(captureState());
        restoreState(undoStack.pop());
        updateHistoryButtons();
      };
      const redo = () => {
        if (!redoStack.length || drawing) return;
        undoStack.push(captureState());
        restoreState(redoStack.pop());
        updateHistoryButtons();
      };

      let activeTextEditor = null;
      const cancelTextEditor = () => {
        if (!activeTextEditor) return;
        activeTextEditor.remove();
        activeTextEditor = null;
        if (tool === 'text') setTool('pen');
      };
      const commitTextEditor = () => {
        if (!activeTextEditor) return false;
        const editor = activeTextEditor;
        const value = editor.value.replace(/\r/g, '');
        const x = Number(editor.dataset.x) || 0;
        const y = Number(editor.dataset.y) || 0;
        editor.remove();
        activeTextEditor = null;

        if (!value.trim()) {
          if (tool === 'text') setTool('pen');
          return false;
        }

        pushUndo();
        ctx.save();
        ctx.fillStyle = '#ff4d4f';
        ctx.font = '18px system-ui, sans-serif';
        ctx.textBaseline = 'top';
        const lineHeight = 23;
        value.split('\n').forEach((line, index) => {
          ctx.fillText(line || ' ', x, y + index * lineHeight);
        });
        ctx.restore();
        setTool('pen');
        return true;
      };
      const openTextEditor = (x, y) => {
        if (activeTextEditor) commitTextEditor();

        const editor = document.createElement('textarea');
        editor.dataset.x = String(x);
        editor.dataset.y = String(y);
        editor.rows = 1;
        editor.placeholder = labels['Type…'] || 'Type…';
        Object.assign(editor.style, {
          position: 'fixed',
          left: `${Math.max(4, x)}px`,
          top: `${Math.max(4, y)}px`,
          zIndex: '2147483647',
          minWidth: '140px',
          minHeight: '28px',
          maxWidth: '360px',
          padding: '4px 6px',
          border: '1px solid rgba(255,77,79,.75)',
          borderRadius: '6px',
          outline: 'none',
          resize: 'both',
          overflow: 'hidden',
          background: 'rgba(24,24,24,.92)',
          color: '#ff4d4f',
          caretColor: '#ff4d4f',
          font: '18px/23px system-ui,sans-serif',
          boxShadow: '0 4px 16px rgba(0,0,0,.28)',
          pointerEvents: 'auto'
        });
        editor.addEventListener('pointerdown', (event) => event.stopPropagation());
        editor.addEventListener('keydown', (event) => {
          event.stopPropagation();
          if (event.key === 'Escape') {
            event.preventDefault();
            cancelTextEditor();
            return;
          }
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            commitTextEditor();
          }
        });
        editor.addEventListener('input', () => {
          editor.style.height = 'auto';
          editor.style.height = `${Math.min(180, Math.max(28, editor.scrollHeight))}px`;
        });
        overlay.appendChild(editor);
        activeTextEditor = editor;
        requestAnimationFrame(() => editor.focus());
      };

      const mkBtn = (label, title, onClick) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = labels[label] || label;
        btn.title = labels[title] || title;
        btn._restBackground = 'transparent';
        btn._hoverBackground = 'rgba(255,255,255,.09)';
        Object.assign(btn.style, {
          height: '30px', minWidth: '30px', padding: '0 8px', border: '0',
          borderRadius: '8px', background: btn._restBackground, color: '#eee',
          font: '12px system-ui,sans-serif', cursor: 'pointer'
        });
        btn.addEventListener('mouseenter', () => {
          if (!btn.disabled) btn.style.background = btn._hoverBackground;
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.background = btn._restBackground;
        });
        btn.addEventListener('click', (e) => { e.stopPropagation(); onClick(btn); });
        return btn;
      };

      const toolButtons = {};
      const refreshToolButtons = () => {
        const activeBg = 'rgba(255,255,255,.14)';
        toolButtons.rect._restBackground = tool === 'rect' ? activeBg : 'transparent';
        toolButtons.arrow._restBackground = tool === 'arrow' ? activeBg : 'transparent';
        toolButtons.text._restBackground = tool === 'text' ? activeBg : 'transparent';
        for (const btn of Object.values(toolButtons)) btn.style.background = btn._restBackground;
      };

      const setTool = (next) => {
        tool = next;
        refreshToolButtons();
        canvas.style.cursor = 'crosshair';
      };

      toolButtons.rect = mkBtn('', 'Rect', () => setTool(tool === 'rect' ? 'pen' : 'rect'));
      toolButtons.rect.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" style="width:18px;height:18px;display:block;margin:auto;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><rect x="5" y="5" width="14" height="14" rx="1.5"/></svg>';
      toolButtons.arrow = mkBtn('↗', 'Arrow', () => setTool(tool === 'arrow' ? 'pen' : 'arrow'));
      toolButtons.text = mkBtn('T', 'Text', () => setTool(tool === 'text' ? 'pen' : 'text'));
      const undoBtn = mkBtn('↶', 'Undo (Ctrl+Z)', undo);
      const redoBtn = mkBtn('↷', 'Redo (Ctrl+Y / Ctrl+Shift+Z)', redo);

      // Symbol glyphs render noticeably smaller than text in system fonts.
      // Give drawing/history controls a larger visual size without bloating text buttons.
      for (const btn of [toolButtons.rect, toolButtons.arrow, toolButtons.text, undoBtn, redoBtn]) {
        Object.assign(btn.style, {
          width: '34px',
          minWidth: '34px',
          height: '34px',
          padding: '0',
          fontSize: '18px',
          lineHeight: '1',
          fontWeight: '500'
        });
      }
      function updateHistoryButtons() {
        for (const [btn, enabled] of [[undoBtn, undoStack.length > 0], [redoBtn, redoStack.length > 0]]) {
          btn.disabled = !enabled;
          btn.style.opacity = enabled ? '1' : '.35';
          btn.style.cursor = enabled ? 'pointer' : 'default';
        }
      }
      const clearBtn = mkBtn('Clear', 'Clear', () => {
        pushUndo();
        ctx.clearRect(0, 0, innerWidth, innerHeight);
      });
      const cancelBtn = mkBtn('Cancel', 'Cancel', () => finish(null));
      const doneBtn = mkBtn('Done', 'Done', () => {
        commitTextEditor();
        finish(canvas.toDataURL('image/png'));
      });
      doneBtn._restBackground = '#fff';
      doneBtn._hoverBackground = '#ececec';
      Object.assign(doneBtn.style, { background: doneBtn._restBackground, color: '#111', fontWeight: '600' });

      bar.append(toolButtons.rect, toolButtons.arrow, toolButtons.text, undoBtn, redoBtn, clearBtn, cancelBtn, doneBtn);
      updateHistoryButtons();

      overlay.style.pointerEvents = 'none';
      canvas.style.pointerEvents = 'auto';
      bar.style.pointerEvents = 'auto';
      overlay.append(canvas, bar);
      document.documentElement.appendChild(overlay);
      setTool('pen');

      const point = (event) => ({ x: event.clientX, y: event.clientY });
      const restoreSnapshot = () => {
        if (!snapshot) return;
        ctx.putImageData(snapshot, 0, 0);
      };

      const drawArrow = (x1, y1, x2, y2) => {
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const head = 12;
        ctx.beginPath();
        ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      };

      canvas.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        const p = point(event);

        if (tool === 'text') {
          event.preventDefault();
          event.stopPropagation();
          openTextEditor(p.x, p.y);
          return;
        }

        drawing = true;
        startX = p.x; startY = p.y;
        snapshot = captureState();
        pushUndo(snapshot);
        if (tool === 'pen') { ctx.beginPath(); ctx.moveTo(p.x, p.y); }
        canvas.setPointerCapture?.(event.pointerId);
        event.preventDefault();
      });

      canvas.addEventListener('pointermove', (event) => {
        if (!drawing) return;
        const p = point(event);
        if (tool === 'pen') {
          ctx.lineTo(p.x, p.y); ctx.stroke();
        } else {
          restoreSnapshot();
          if (tool === 'rect') {
            ctx.strokeRect(startX, startY, p.x - startX, p.y - startY);
          } else if (tool === 'arrow') {
            drawArrow(startX, startY, p.x, p.y);
          }
        }
        event.preventDefault();
      });

      canvas.addEventListener('pointerup', (event) => {
        if (!drawing) return;
        drawing = false;
        const p = point(event);
        const completedTool = tool;
        if (tool === 'pen') { ctx.lineTo(p.x, p.y); ctx.stroke(); }
        snapshot = null;
        if (completedTool === 'rect' || completedTool === 'arrow') setTool('pen');
        event.preventDefault();
      });

      const onKey = (event) => {
        const mod = event.ctrlKey || event.metaKey;
        if (mod && event.key.toLowerCase() === 'z') {
          event.preventDefault();
          event.stopPropagation();
          if (event.shiftKey) redo();
          else undo();
          return;
        }
        if (mod && event.key.toLowerCase() === 'y') {
          event.preventDefault();
          event.stopPropagation();
          redo();
          return;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          if (activeTextEditor) {
            cancelTextEditor();
            return;
          }
          finish(null);
        }
      };
      const onExternalCancel = () => finish(null);
      overlay.addEventListener('DINSIDE_CANCEL_DRAW', onExternalCancel, { once: true });
      window.addEventListener('keydown', onKey, true);

      function finish(value) {
        window.removeEventListener('keydown', onKey, true);
        overlay.removeEventListener('DINSIDE_CANCEL_DRAW', onExternalCancel);
        overlay.remove();
        requestAnimationFrame(() => requestAnimationFrame(() => resolve(value)));
      }
    })
  });
  return results?.[0]?.result || null;
}

function setDrawButtonActive(active) {
  const button = $('drawBtn');
  button?.classList.toggle('active', Boolean(active));
  applyCaptureToolsTriggerActive();
}

function applyCaptureToolsTriggerActive() {
  const active = Boolean(state.captureActive || $('drawBtn')?.classList.contains('active'));
  $('captureBtn')?.classList.toggle('active', active);
}

async function syncDrawModeUI() {
  try {
    const tab = await getActiveTab();
    if (!tab?.id || isRestrictedUrl(tab.url)) {
      setDrawButtonActive(false);
      return false;
    }

    const pageUrl = tab.url || '';
    let active = state.drawModePages.get(tab.id) === pageUrl;

    if (active) {
      try {
        const result = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => Boolean(document.getElementById('__dinside_draw_overlay__'))
        });
        active = Boolean(result?.[0]?.result);
      } catch (_) {
        active = false;
      }

      if (!active && state.drawModePages.get(tab.id) === pageUrl) {
        state.drawModePages.delete(tab.id);
      }
    }

    setDrawButtonActive(active);
    return active;
  } catch (_) {
    setDrawButtonActive(false);
    return false;
  }
}

async function drawOnPage() {
  let tab = null;
  let pageUrl = '';

  try {
    tab = await getActiveTab();
    if (!tab?.id) throw new Error(t('No active tab found.'));
    if (isRestrictedUrl(tab.url)) throw new Error(t('Chrome internal pages cannot be drawn on.'));
    pageUrl = tab.url || '';

    if (state.drawModePages.get(tab.id) === pageUrl) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => document.getElementById('__dinside_draw_overlay__')
            ?.dispatchEvent(new CustomEvent('DINSIDE_CANCEL_DRAW'))
        });
      } catch (_) {}

      if (state.drawModePages.get(tab.id) === pageUrl) state.drawModePages.delete(tab.id);
      await syncDrawModeUI();
      setStatus(() => t('Draw cancelled'), 'idle');
      return null;
    }

    // Draw mode belongs to a specific tab + page URL, not the whole side panel.
    // A tab that navigated away from an older draw session starts fresh here.
    state.drawModePages.set(tab.id, pageUrl);
    setDrawButtonActive(true);
    setStatus(() => t('Draw on the page · Esc to cancel'), 'busy');

    const annotation = await startDrawMode(tab.id);
    if (!annotation) {
      setStatus(() => t('Draw cancelled'), 'idle');
      return null;
    }

    const response = await chrome.runtime.sendMessage({ type: 'DINSIDE_CAPTURE_VISIBLE_TAB' });
    if (!response?.ok || !response.dataUrl) throw new Error(response?.error || t('Capture failed.'));

    const finalDataUrl = await mergeAnnotationDataUrl(response.dataUrl, annotation);
    const attachResponse = await attachScreenshotToEmbeddedProvider(finalDataUrl);
    if (!attachResponse?.ok) throw new Error(attachResponse?.error || t('Could not attach annotated screenshot.'));

    setStatus(() => t('Annotated screenshot attached'), 'ready');
    return finalDataUrl;
  } catch (error) {
    setStatus(() => error.message || t('Draw failed'), 'error');
    return null;
  } finally {
    if (tab?.id && state.drawModePages.get(tab.id) === pageUrl) {
      state.drawModePages.delete(tab.id);
    }
    await syncDrawModeUI();
  }
}

async function cropCapturedDataUrl(dataUrl, region) {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();

  const scaleX = image.naturalWidth / Math.max(1, region.viewportWidth);
  const scaleY = image.naturalHeight / Math.max(1, region.viewportHeight);

  const sx = Math.max(0, Math.round(region.x * scaleX));
  const sy = Math.max(0, Math.round(region.y * scaleY));
  const sw = Math.min(image.naturalWidth - sx, Math.max(1, Math.round(region.width * scaleX)));
  const sh = Math.min(image.naturalHeight - sy, Math.max(1, Math.round(region.height * scaleY)));

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas.toDataURL('image/png');
}

async function attachScreenshotToEmbeddedProvider(dataUrl) {
  const frame = $('providerFrame');
  if (!frame?.contentWindow || !state.bridgeReady) {
    return { ok: false, error: `${getProviderName()} frame is still loading.` };
  }

  const requestId = `dinside-attach-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return new Promise((resolve) => {
    let settled = false;

    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      clearTimeout(timer);
    };

    const finish = (result) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const onMessage = (event) => {
      if (!providerManager?.isTrustedMessage?.(event)) return;
      const data = event.data;
      if (!data || data.type !== 'DINSIDE_ATTACH_SCREENSHOT_RESULT' || data.requestId !== requestId) return;
      finish({ ok: Boolean(data.ok), error: data.error || '' });
    };

    window.addEventListener('message', onMessage);

    const attachTimeoutMs = ['kimi', 'googleaimode'].includes(getActiveProvider()?.id) ? 15000 : 5000;
    const timer = setTimeout(() => {
      finish({ ok: false, error: `${getProviderName()} did not attach the screenshot in time.` });
    }, attachTimeoutMs);

    const posted = postToEmbeddedProvider({
      type: 'DINSIDE_ATTACH_SCREENSHOT_NOW',
      requestId,
      screenshot: dataUrl
    });
    if (!posted) {
      finish({ ok: false, error: `${getProviderName()} frame is still loading.` });
    }
  });
}

async function captureVisibleViewport({ showPreview = true, updateStatus = true, region = null } = {}) {
  if (updateStatus) setStatus(() => t('Capturing…'), 'busy');

  try {
    const tab = await getActiveTab();
    if (!tab?.id) throw new Error(t('No active tab found.'));
    if (isRestrictedUrl(tab.url)) throw new Error(t('Chrome internal pages cannot be captured.'));

    const response = await chrome.runtime.sendMessage({ type: 'DINSIDE_CAPTURE_VISIBLE_TAB' });
    if (!response?.ok || !response.dataUrl) throw new Error(response?.error || t('Capture failed.'));

    const finalDataUrl = region ? await cropCapturedDataUrl(response.dataUrl, region) : response.dataUrl;
    state.screenshot = finalDataUrl;

    if (showPreview) {
      $('screenshotPreview').src = finalDataUrl;
      $('screenshotWrap').classList.remove('hidden');
    }

    // Attach immediately into the embedded provider composer. Do not wait for Send.
    const attachResponse = await attachScreenshotToEmbeddedProvider(finalDataUrl);

    if (!attachResponse?.ok) {
      throw new Error(attachResponse?.error || t`${getProviderName()} could not attach the screenshot.`);
    }

    // Once the active provider owns the attachment, remove DinSide's temporary preview.
    state.screenshot = null;
    $('screenshotPreview').removeAttribute('src');
    $('screenshotWrap').classList.add('hidden');

    if (updateStatus) setStatus(() => region ? t('Region attached') : t('Screenshot attached'), 'ready');
    return finalDataUrl;
  } catch (error) {
    if (updateStatus) setStatus(() => error.message, 'error');
    return null;
  }
}

async function cancelCaptureRegion() {
  const tabId = state.captureTabId;
  if (!tabId) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.dispatchEvent(new Event('__DINSIDE_CANCEL_CAPTURE__'))
    });
  } catch (_) {}
}

function applyCaptureUI() {
  const button = $('captureRegionBtn');
  button?.classList.toggle('active', state.captureActive);
  applyCaptureToolsTriggerActive();
}

async function captureScreen() {
  if (state.captureActive) {
    await cancelCaptureRegion();
    return null;
  }

  state.captureActive = true;
  applyCaptureUI();
  setStatus(() => t('Select a region…'), 'busy');

  try {
    const tab = await getActiveTab();
    if (!tab?.id) throw new Error(t('No active tab found.'));
    if (isRestrictedUrl(tab.url)) throw new Error(t('Chrome internal pages cannot be captured.'));

    state.captureTabId = tab.id;
    const region = await selectCaptureRegion(tab.id);
    if (!region) {
      setStatus(() => t('Capture cancelled'), 'idle');
      return null;
    }

    return captureVisibleViewport({ showPreview: false, updateStatus: true, region });
  } catch (error) {
    setStatus(() => error.message, 'error');
    return null;
  } finally {
    state.captureActive = false;
    state.captureTabId = null;
    applyCaptureUI();
  }
}

function normalizeGoogleAccountSlot(slot = '') {
  return /^\d$/.test(String(slot)) ? String(slot) : '';
}

function supportsGoogleAccountSwitch(provider = getActiveProvider()) {
  return Boolean(provider && typeof provider.getAccountUrl === 'function');
}

function configuredGoogleAccountSlot(provider = getActiveProvider()) {
  if (!supportsGoogleAccountSwitch(provider)) return '';
  return normalizeGoogleAccountSlot(state.googleAccountSlots?.[provider.id]);
}

function providerHomeUrl(provider = getActiveProvider()) {
  if (!provider) return '';
  return supportsGoogleAccountSwitch(provider)
    ? provider.getAccountUrl(configuredGoogleAccountSlot(provider))
    : provider.homeUrl;
}

function restorableUrlMatchesGoogleAccount(provider, rawUrl = '') {
  const configured = configuredGoogleAccountSlot(provider);
  if (!configured || typeof provider?.getAccountSlot !== 'function') return true;
  return provider.getAccountSlot(rawUrl) === configured;
}

let mimoLoadingActionsTimer = null;
function syncMimoLoadingActions() {
  const loading = $('frameLoading');
  const actions = $('mimoLoadingActions');
  if (!loading || !actions) return;
  const active = getActiveProvider()?.id === 'mimo' && !loading.classList.contains('hidden');
  if (!active) {
    clearTimeout(mimoLoadingActionsTimer);
    mimoLoadingActionsTimer = null;
    actions.classList.add('hidden');
    return;
  }
  if (mimoLoadingActionsTimer || !actions.classList.contains('hidden')) return;
  mimoLoadingActionsTimer = setTimeout(() => {
    mimoLoadingActionsTimer = null;
    if (getActiveProvider()?.id === 'mimo' && !loading.classList.contains('hidden')) {
      actions.classList.remove('hidden');
    }
  }, 8000);
}

function updateProviderUI() {
  const provider = getActiveProvider();
  if (!provider) return;
  const button = $('providerBtn');
  const icon = $('providerIcon');
  if (icon) icon.dataset.provider = provider.id;
  if (button) {
    button.dataset.tooltip = provider.name;
    button.setAttribute('aria-label', t`AI provider: ${provider.name}`);
  }
  document.querySelectorAll('.provider-option[data-provider-id]').forEach((option) => {
    const active = option.dataset.providerId === provider.id;
    option.classList.toggle('active', active);
    option.setAttribute('aria-checked', String(active));
  });
  const loadingText = $('frameLoadingText');
  if (loadingText) loadingText.textContent = t`Loading ${provider.name}…`;
  const reload = $('reloadChatBtn');
  if (reload) {
    const reloadLabel = t`Reload ${provider.name}`;
    reload.setAttribute('aria-label', reloadLabel);
    if ($('reloadChatLabel')) $('reloadChatLabel').textContent = reloadLabel;
  }
  syncMimoLoadingActions();
}
async function persistProviderChatUrl(provider = getActiveProvider(), url = state.activeChatUrl) {
  if (!state.keepLastChat || !provider?.isRestorableChatUrl?.(url)) return;
  state.lastChatUrls = { ...state.lastChatUrls, [provider.id]: url };
  await chrome.storage.local.set({ dinsideLastChatUrls: state.lastChatUrls });
}
async function prepareProviderFrame(provider) {
  const startedAt = performance.now();
  const frame = $('providerFrame');
  if (frame) {
    frame.name = provider?.id === 'claude' ? 'dinside-provider-frame' : '';
    frame.referrerPolicy = provider?.id === 'claude' ? 'no-referrer' : '';
  }
  if (!provider || !['gemini', 'googleaimode', 'googleaistudio', 'notebooklm', 'claude', 'perplexity', 'metaai', 'mimo'].includes(provider.id)) return true;
  try {
    const result = await chrome.runtime.sendMessage({
      type: 'DINSIDE_PREPARE_PROVIDER_FRAME',
      providerId: provider.id
    });
    if (result?.ok) {
      if (provider.id === 'mimo' && result.accountChanged && getActiveProvider()?.id === 'mimo') {
        state.activeChatUrl = provider.homeUrl;
        if (state.lastChatUrls?.mimo) {
          state.lastChatUrls = { ...state.lastChatUrls };
          delete state.lastChatUrls.mimo;
          await chrome.storage.local.set({ dinsideLastChatUrls: state.lastChatUrls });
        }
      }
      if (provider.id === 'claude') {
        console.info('[DinSide] Claude iframe network rules ready', {
          durationMs: Math.round(performance.now() - startedAt)
        });
      }
      return true;
    }
    console.warn('[DinSide] provider frame preparation failed', result?.error || result);
  } catch (error) {
    console.warn('[DinSide] provider frame preparation failed', error);
  }
  return false;
}

const pendingGoogleAccountTabs = new Map();
let pendingChatgptAuthTabId = null;
const pendingProviderAuthTabs = new Map();
let lastDeepSeekAuthReloadAt = 0;

function refreshChatgptAfterAuth(tabId) {
  if (tabId !== pendingChatgptAuthTabId) return;
  pendingChatgptAuthTabId = null;
  const provider = getActiveProvider();
  if (provider?.id !== 'chatgpt') return;
  const frame = getProviderFrame();
  if (!frame) return;
  state.bridgeReady = false;
  state.geminiUiReady = false;
  state.mimoUiReady = false;
  state.googleAiStudioUiReady = false;
  state.deepseekUiReady = false;
  state.bridgeVersion = '';
  $('frameLoading')?.classList.remove('hidden');
  frame.src = state.activeChatUrl || provider.homeUrl;
}

async function openChatgptAuth(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch (_) {
    return false;
  }
  if (url.origin !== 'https://chatgpt.com' ||
      !['/auth/login', '/auth/login_with', '/auth/signup'].includes(url.pathname)) return false;

  if (Number.isInteger(pendingChatgptAuthTabId)) {
    try {
      await chrome.tabs.update(pendingChatgptAuthTabId, { active: true });
      return true;
    } catch (_) {
      pendingChatgptAuthTabId = null;
    }
  }
  const tab = await chrome.tabs.create({ url: url.href, active: true });
  pendingChatgptAuthTabId = tab?.id ?? null;
  return true;
}

function refreshProviderAfterAuth(tabId) {
  const providerId = pendingProviderAuthTabs.get(tabId);
  if (!providerId) return;
  pendingProviderAuthTabs.delete(tabId);
  reloadProviderAfterAuth(providerId);
}

async function reloadProviderAfterAuth(providerId) {
  const provider = getActiveProvider();
  if (provider?.id !== providerId) return;
  const frame = getProviderFrame();
  if (!frame) return;
  if (providerId === 'deepseek') {
    if (Date.now() - lastDeepSeekAuthReloadAt < 300) return;
    lastDeepSeekAuthReloadAt = Date.now();
  }
  const targetUrl = (
    providerId === 'deepseek' &&
    /^https:\/\/chat\.deepseek\.com\/(?:sign_in|sign_up|forgot_password)(?:[/?#]|$)/.test(state.activeChatUrl || '')
  ) || (
    providerId === 'zai' &&
    /^https:\/\/chat\.z\.ai\/(?:auth|login|sign[-_]?in|sign[-_]?up)(?:[/?#]|$)/.test(state.activeChatUrl || '')
  )
    ? provider.homeUrl
    : state.activeChatUrl || provider.homeUrl;
  state.activeChatUrl = targetUrl;
  state.bridgeReady = false;
  state.geminiUiReady = false;
  state.mimoUiReady = false;
  state.googleAiStudioUiReady = false;
  state.deepseekUiReady = false;
  state.bridgeVersion = '';
  $('frameLoading')?.classList.remove('hidden');
  await prepareProviderFrame(provider);
  if (getActiveProvider()?.id !== providerId) return;
  frame.src = targetUrl;
}

async function openProviderAuth(rawUrl, providerHost = '') {
  const provider = getActiveProvider();
  if (!provider || provider.id === 'chatgpt') return false;

  let url;
  try {
    url = new URL(String(rawUrl || ''));
  } catch (_) {
    return false;
  }
  if (url.protocol !== 'https:') return false;

  let homeHost = '';
  try {
    homeHost = new URL(provider.homeUrl).hostname;
  } catch (_) {}
  if (providerHost && homeHost && String(providerHost) !== homeHost) return false;

  const tab = await chrome.tabs.create({ url: url.href, active: true });
  if (!Number.isInteger(tab?.id)) return false;
  pendingProviderAuthTabs.set(tab.id, provider.id);
  return true;
}

function refreshGoogleAccountProvider(tabId, { reloadFrame = true, returnedUrl = '' } = {}) {
  const providerId = pendingGoogleAccountTabs.get(tabId);
  if (!providerId) return;
  if (providerId === 'googleaistudio' && reloadFrame) {
    const provider = getActiveProvider();
    const slot = provider?.id === providerId ? provider.getAccountSlot(returnedUrl) : null;
    if (slot === null) return;
    pendingGoogleAccountTabs.delete(tabId);
    setGoogleAccountSlot(slot).catch((error) => {
      console.warn('[DinSide] Could not switch AI Studio account', error);
    });
    return;
  }
  pendingGoogleAccountTabs.delete(tabId);
  if (!reloadFrame) return;
  const provider = getActiveProvider();
  if (provider?.id !== providerId) return;
  const frame = getProviderFrame();
  const targetUrl = state.activeChatUrl || providerHomeUrl(provider);
  if (!frame || !targetUrl) return;
  state.bridgeReady = false;
  state.geminiUiReady = false;
  state.mimoUiReady = false;
  state.googleAiStudioUiReady = false;
  state.deepseekUiReady = false;
  state.bridgeVersion = '';
  $('frameLoading')?.classList.remove('hidden');
  frame.src = targetUrl;
}

async function openGoogleAccountAction(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch (_) {
    return false;
  }
  if (url.protocol !== 'https:' ||
      !['accounts.google.com', 'myaccount.google.com', 'myactivity.google.com'].includes(url.hostname)) {
    return false;
  }
  const providerId = getActiveProvider()?.id;
  const tab = await chrome.tabs.create({ url: url.href, active: true });
  if (url.hostname === 'accounts.google.com' && Number.isInteger(tab?.id)) {
    pendingGoogleAccountTabs.set(tab.id, providerId);
  }
  return true;
}

let providerSwitchSequence = 0;
async function switchProvider(providerId, { persist = true } = {}) {
  const previous = getActiveProvider();
  if (previous?.id === providerId) {
    updateProviderUI();
    return previous;
  }
  if (globalThis.DinSideStartupNavigation) {
    globalThis.DinSideStartupNavigation.pending = false;
  }
  const switchSequence = ++providerSwitchSequence;
  const pendingWrites = [];
  if (previous) {
    pendingWrites.push(persistProviderChatUrl(previous, state.activeChatUrl).catch(() => {}));
  }
  if (clearChatLifetimeSkills()) {
    pendingWrites.push(saveSkills());
    renderSkills();
  }
  const provider = providerManager?.setActive?.(providerId);
  if (!provider) return null;
  state.chatgptTheme = cachedProviderTheme(provider.id);
  applyTheme();
  state.bridgeReady = false;
  state.geminiUiReady = false;
  state.mimoUiReady = false;
  state.googleAiStudioUiReady = false;
  state.deepseekUiReady = false;
  state.bridgeVersion = '';
  state.bridgeReloadAttempted = false;
  state.activeChatUrl = '';
  resetSentContextState();
  updateProviderUI();
  $('frameLoading')?.classList.remove('hidden');
  const savedUrl = state.lastChatUrls?.[provider.id] || '';
  const targetUrl = state.keepLastChat &&
    provider.isRestorableChatUrl?.(savedUrl) &&
    restorableUrlMatchesGoogleAccount(provider, savedUrl)
    ? savedUrl
    : providerHomeUrl(provider);
  state.activeChatUrl = targetUrl;

  await prepareProviderFrame(provider);
  if (switchSequence !== providerSwitchSequence) {
    await Promise.allSettled(pendingWrites);
    return getActiveProvider();
  }
  providerManager.navigate(state.activeChatUrl);
  setStatus(() => t`${provider.name} selected`, 'ready');
  if (persist) pendingWrites.push(chrome.storage.local.set({ dinsideProviderId: provider.id }));
  await Promise.all(pendingWrites);
  return provider;
}

async function reloadProvider() {
  const frame = getProviderFrame();
  const provider = getActiveProvider();
  if (clearChatLifetimeSkills()) {
    await saveSkills();
    renderSkills();
  }
  state.bridgeReady = false;
  state.geminiUiReady = false;
  state.mimoUiReady = false;
  state.googleAiStudioUiReady = false;
  state.deepseekUiReady = false;
  state.bridgeVersion = '';
  state.bridgeReloadAttempted = false;
  $('frameLoading').classList.remove('hidden');
  if (frame && provider) {
    const targetUrl = providerHomeUrl(provider);
    state.activeChatUrl = targetUrl;
    await prepareProviderFrame(provider);
    frame.src = targetUrl;
    updateProviderUI();
  }
}

async function setGoogleAccountSlot(rawSlot = '') {
  const provider = getActiveProvider();
  if (!supportsGoogleAccountSwitch(provider)) return false;
  const slot = normalizeGoogleAccountSlot(rawSlot);

  state.googleAccountSlots = { ...state.googleAccountSlots, [provider.id]: slot };
  await chrome.storage.local.set({ [GOOGLE_ACCOUNT_SLOTS_STORAGE_KEY]: state.googleAccountSlots });

  // A conversation URL belongs to one Google account. Do not restore the last
  // account's conversation after the user deliberately changes URL slots.
  if (state.lastChatUrls?.[provider.id]) {
    const nextLastChatUrls = { ...state.lastChatUrls };
    delete nextLastChatUrls[provider.id];
    state.lastChatUrls = nextLastChatUrls;
    await chrome.storage.local.set({ dinsideLastChatUrls: state.lastChatUrls });
  }
  if (clearChatLifetimeSkills()) {
    await saveSkills();
    renderSkills();
  }

  $('providerMenu')?.classList.add('hidden');
  $('providerBtn')?.setAttribute('aria-expanded', 'false');
  state.bridgeReady = false;
  state.geminiUiReady = false;
  state.mimoUiReady = false;
  state.googleAiStudioUiReady = false;
  state.deepseekUiReady = false;
  state.bridgeVersion = '';
  state.bridgeReloadAttempted = false;
  resetSentContextState();
  $('frameLoading')?.classList.remove('hidden');

  const targetUrl = provider.getAccountUrl(slot);
  state.activeChatUrl = targetUrl;
  await prepareProviderFrame(provider);
  providerManager.navigate(targetUrl);
  updateProviderUI();
  setStatus(() => t`Google account ${slot ? `u/${slot}` : t('Auto')} selected`, 'ready');
  return true;
}

function requestBridgeStatus() {
  // The handshake carries no user data. `*` is intentional here because while
  // an iframe is navigating its current recipient can still be extension://.
  postToEmbeddedProvider({ type: 'DINSIDE_REQUEST_BRIDGE_STATUS' }, { handshake: true });
}

function verifyEmbeddedBridge() {
  clearTimeout(state.bridgeCheckTimer);
  requestBridgeStatus();
  const providerId = getActiveProvider()?.id;
  const targetUrl = state.activeChatUrl;
  state.bridgeCheckTimer = setTimeout(() => {
    if (state.bridgeReady || getActiveProvider()?.id !== providerId || state.activeChatUrl !== targetUrl) return;

    // Chat pages can still be hydrating after the iframe load event. A delayed
    // bridge reply must not trigger a second full navigation of that page.
    requestBridgeStatus();
    state.bridgeCheckTimer = setTimeout(() => {
      if (state.bridgeReady || getActiveProvider()?.id !== providerId || state.activeChatUrl !== targetUrl) return;
      setStatus(() => t`${getProviderName()} bridge unavailable · reload DinSide`, 'error');
    }, 3200);
  }, 1800);
}

function sendSelectedTextToEmbeddedProvider(selection, append = false, replacePending = false) {
  if (!selection?.text) return false;
  return postToEmbeddedProvider({
    type: 'DINSIDE_SELECTED_TEXT',
    selection,
    append,
    replacePending
  });
}

function clearSelectedTextInEmbeddedProvider() {
  return postToEmbeddedProvider({ type: 'DINSIDE_CLEAR_SELECTED_TEXT' });
}

function clearAllSelectedTextInEmbeddedProvider() {
  return postToEmbeddedProvider({ type: 'DINSIDE_CLEAR_ALL_SELECTED_TEXT' });
}

async function createPromptContextResponse(requestId = '', contextMode = 'full', promptText = '') {
  setStatus(() => t('Preparing context…'), 'busy');
  // Re-read and resend the live selection at the exact Send boundary. Provider
  // frames can replace their composer subtree after an earlier selection event,
  // and postMessage itself cannot prove that the old bridge received it.
  if (state.selectedTextContextEnabled) {
    await syncSelectedText({ force: true }).catch(() => {});
  }
  const { payload, deliveryToken } = await prepareContextForPrompt(requestId, { promptText });
  const compact = contextMode === 'compact';
  const compactPayload = compact && payload ? {
    ...payload,
    context: payload.context ? {
      title: payload.context.title || '',
      url: payload.context.url || ''
    } : null,
    attachedPages: []
  } : payload;

  // Compact responses intentionally do not commit the full-page delivery state,
  // so a later explicit "summarize/analyze the whole page" prompt can still
  // receive the complete page context.
  if (compact && deliveryToken) discardContextDelivery(deliveryToken, requestId);

  return {
    ok: true,
    requestId,
    envelope: buildContextEnvelope(compactPayload),
    payload: compactPayload,
    deliveryToken: compact ? '' : deliveryToken,
    // Screenshots are attached at capture time, never deferred until Send.
    screenshot: ''
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'DINSIDE_MIMO_SESSION_CHANGED') {
    if (state.lastChatUrls?.mimo) {
      state.lastChatUrls = { ...state.lastChatUrls };
      delete state.lastChatUrls.mimo;
      chrome.storage.local.set({ dinsideLastChatUrls: state.lastChatUrls }).catch(() => {});
    }
    if (getActiveProvider()?.id === 'mimo') {
      const provider = getActiveProvider();
      state.activeChatUrl = provider.homeUrl;
      reloadProviderAfterAuth('mimo');
    }
    return;
  }
  if (message?.type === 'DINSIDE_PROVIDER_AUTH_TAB_CREATED' &&
      Number.isInteger(message.tabId)) {
    const provider = providerManager?.list?.().find((candidate) => {
      try {
        return new URL(candidate.homeUrl).hostname === String(message.providerHost || '');
      } catch (_) {
        return false;
      }
    });
    if (provider) {
      // Keep the embedded provider untouched while OAuth/CAPTCHA runs in the
      // external tab. Reload it only after auth finishes or the tab closes.
      pendingProviderAuthTabs.set(message.tabId, provider.id);
    }
    return;
  }

  if (message?.type === 'DINSIDE_QUICK_ASK_PENDING') {
    consumeQuickAskPending();
    return;
  }

  if (message?.type === 'DINSIDE_PDF_SELECTION_STARTED') {
    if (!state.selectedTextContextEnabled || !sender.tab?.id || sender.tab.id !== state.activeTabId) return;
    state.lastForwardedSelection = '';
    state.lastForwardedSelectionFrame = '';
    state.lastKnownDocumentSelection = null;
    state.lastKnownDocumentSelectionTabId = null;
    clearSelectedTextInEmbeddedProvider();
    scheduleContextInspectorRefresh(40);
    return;
  }

  if (message?.type === 'DINSIDE_PDF_SELECTION_COPY_REQUIRED') {
    if (!state.selectedTextContextEnabled || !sender.tab?.id || sender.tab.id !== state.activeTabId) return;
    setStatus(() => t('PDF viewer requires Ctrl+C to attach this selection'), 'busy');
    return;
  }

  if (message?.type === 'DINSIDE_TEXT_SELECTION_CLEARED') {
    if (!state.selectedTextContextEnabled) return;
    if (sender.tab?.id && sender.tab.id === state.activeTabId && !state.appendNextSelection) {
      const sourceFrame = `${sender.tab.id}:${Number.isInteger(sender.frameId) ? sender.frameId : 0}`;
      if (state.lastForwardedSelectionFrame && state.lastForwardedSelectionFrame !== sourceFrame) return;
      state.lastForwardedSelection = '';
      state.lastForwardedSelectionFrame = '';
      state.lastKnownDocumentSelection = null;
      state.lastKnownDocumentSelectionTabId = null;
      clearSelectedTextInEmbeddedProvider();
      setStatus(() => t('Selection cleared'), 'ready');
      scheduleContextInspectorRefresh(40);
    }
    return;
  }

  if (message?.type === 'DINSIDE_TEXT_SELECTED') {
    if (!state.selectedTextContextEnabled) return;
    if (sender.tab?.id && sender.tab.id === state.activeTabId) {
      const selection = {
        ...(message.selection || {}),
        title: message.selection?.title || sender.tab.title || '',
        url: /^about:(?:blank|srcdoc)$/i.test(message.selection?.url || '')
          ? (sender.tab.url || '')
          : (message.selection?.url || sender.tab.url || '')
      };
      const key = selectedTextIdentityKey(selection);
      if (state.appendNextSelection && key === state.appendBaselineSelection) return;
      state.lastKnownDocumentSelection = selection;
      state.lastKnownDocumentSelectionTabId = sender.tab.id;
      state.lastForwardedSelectionFrame = `${sender.tab.id}:${Number.isInteger(sender.frameId) ? sender.frameId : 0}`;
      const append = state.appendNextSelection && !state.appendPendingSelection;
      const replacePending = state.appendNextSelection && state.appendPendingSelection;
      const delivered = sendSelectedTextToEmbeddedProvider(selection, append, replacePending);
      if (!delivered) return;
      if (state.appendNextSelection) state.appendPendingSelection = true;
      state.lastForwardedSelection = key;
      setStatus(() => state.appendNextSelection ? t('Selection pending · select again to replace') : t`${getProviderName()} · selected text attached`, state.appendNextSelection ? 'busy' : 'ready');
      scheduleContextInspectorRefresh(40);
    }
    return;
  }

  if (message?.type === 'DINSIDE_ATTACH_SCREENSHOT_RESULT') {
    if (message.ok) {
      state.screenshot = null;
      $('screenshotPreview').removeAttribute('src');
      $('screenshotWrap').classList.add('hidden');
      setStatus(() => t('Screenshot attached'), 'ready');
    } else {
      setStatus(() => message.error || t('Could not attach screenshot'), 'error');
    }
    return;
  }

  if (message?.type === 'DINSIDE_GET_CONTEXT_FOR_PROMPT') {
    createPromptContextResponse(message.requestId || '', message.contextMode || 'full', message.promptText || '')
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === 'DINSIDE_PROMPT_SENT') {
    clearNextPromptExclusions();
    scheduleContextInspectorRefresh(80);
    return;
  }

  if (message?.type === 'DINSIDE_CONTEXT_DELIVERED') {
    const committed = commitContextDelivery(message.deliveryToken || '');
    if (committed) setStatus(() => t('Context delivered'), 'ready');
    return;
  }

  if (message?.type === 'DINSIDE_CONTEXT_INJECT_FAILED') {
    discardContextDelivery(
      message.deliveryToken || '',
      message.requestId || ''
    );
    setStatus(() => message.error || t('Context injection failed · will retry'), 'error');
    return;
  }

  if (message?.type === 'DINSIDE_SCREENSHOT_ATTACHED') {
    state.screenshot = null;
    $('screenshotPreview').removeAttribute('src');
    $('screenshotWrap').classList.add('hidden');
    setStatus(() => t('Screenshot attached'), 'ready');
    return;
  }

  if (message?.type === 'DINSIDE_VIEWPORT_DIRTY') {
    if (!sender.tab?.id || sender.tab.id !== state.activeTabId) return;
    if (message.state) state.latestPageState = message.state;
    // Scroll/resize only refreshes the lightweight viewport snapshot. It must not
    // accidentally trigger a 50k-character full-page read on long/dynamic pages.
    scheduleViewportWarmup(45);
    scheduleContextInspectorRefresh(90);
    return;
  }

  if (message?.type !== 'DINSIDE_PAGE_DIRTY') return;
  if (!sender.tab?.id || sender.tab.id !== state.activeTabId) return;

  if (message.state) state.latestPageState = message.state;
  const currentUrl = state.pageContext?.url;
  if (currentUrl && message.state?.url === currentUrl) {
    showChangedState(message.state);
  }
  scheduleContextWarmup(
    message.reason === 'navigation' ? PRELOAD_IDLE_DELAY_MS : 1200,
    { reset: message.reason === 'navigation' }
  );
  scheduleContextInspectorRefresh(message.reason === 'navigation' ? 120 : 180);
});

chrome.tabs.onActivated.addListener(() => {
  invalidateOpenTabsSnapshot();
  syncActivePage();
  syncDrawModeUI();
  scheduleContextWarmup(PRELOAD_IDLE_DELAY_MS);
  scheduleContextInspectorRefresh(80);
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === pendingChatgptAuthTabId && changeInfo.url) {
    try {
      const url = new URL(changeInfo.url);
      if (url.origin === 'https://chatgpt.com' && !/^\/auth(?:\/|$)/.test(url.pathname)) {
        refreshChatgptAfterAuth(tabId);
      }
    } catch (_) {}
  }
  if (changeInfo.url) {
    const providerId = pendingProviderAuthTabs.get(tabId);
    if (providerId) {
      const provider = providerManager?.get?.(providerId);
      try {
        const url = new URL(changeInfo.url);
        const isAuthPath = new RegExp(
          '^/(?:auth|oauth|login|log[-_]?in|signin|sign[-_]?in|signup|sign[-_]?up)(?:/|$)',
          'i'
        ).test(url.pathname);
        if (provider?.origins?.includes(url.origin) && !isAuthPath) {
          if (providerId === 'zai') {
            // Its sign-in tab can start on `/` before authentication. Wait for
            // the token update, a real conversation URL, or tab closure.
            if (/^\/c\/[^/]+\/?$/.test(url.pathname)) refreshProviderAfterAuth(tabId);
          } else if (providerId === 'deepseek') {
            // The URL can change before DeepSeek writes its login state.
            setTimeout(() => {
              if (pendingProviderAuthTabs.get(tabId) === providerId) {
                refreshProviderAfterAuth(tabId);
              }
            }, 1000);
          } else {
            refreshProviderAfterAuth(tabId);
          }
        }
      } catch (_) {}
    }
  }
  if (pendingGoogleAccountTabs.has(tabId) && changeInfo.url) {
    try {
      const host = new URL(changeInfo.url).hostname;
      const providerId = pendingGoogleAccountTabs.get(tabId);
      if ((providerId === 'googleaistudio' && host === 'aistudio.google.com') ||
          (providerId !== 'googleaistudio' &&
            ['www.google.com', 'gemini.google.com', 'myaccount.google.com'].includes(host))) {
        refreshGoogleAccountProvider(tabId, { returnedUrl: changeInfo.url });
      }
    } catch (_) {}
  }
  if (changeInfo.url || changeInfo.title || changeInfo.favIconUrl || changeInfo.status === 'complete') {
    invalidateOpenTabsSnapshot();
  }
  if (changeInfo.url && state.drawModePages.has(tabId) && state.drawModePages.get(tabId) !== changeInfo.url) {
    state.drawModePages.delete(tabId);
  }

  if (tabId === state.activeTabId && (changeInfo.url || changeInfo.title || changeInfo.status === 'complete')) {
    syncActivePage();
    syncDrawModeUI();
    scheduleContextWarmup(
      changeInfo.title ? 0 : (changeInfo.status === 'complete' ? PRELOAD_IDLE_DELAY_MS : 450)
    );
    scheduleContextInspectorRefresh(changeInfo.status === 'complete' ? 120 : 60);
  }
});
chrome.tabs.onCreated.addListener(invalidateOpenTabsSnapshot);
chrome.tabs.onRemoved.addListener(invalidateOpenTabsSnapshot);
chrome.tabs.onRemoved.addListener(refreshChatgptAfterAuth);
chrome.tabs.onRemoved.addListener(refreshProviderAfterAuth);
chrome.tabs.onRemoved.addListener((tabId) => refreshGoogleAccountProvider(tabId, { reloadFrame: false }));
chrome.tabs.onMoved.addListener(invalidateOpenTabsSnapshot);

function clearNextPromptExclusions() {
  state.nextPromptExclusions.page = false;
  state.nextPromptExclusions.viewport = false;
}

function scheduleContextInspectorRefresh(delay = 100) {
  clearTimeout(state.contextInspectorRefreshTimer);
  state.contextInspectorRefreshTimer = null;
  const menu = $('contextInspector');
  if (!menu || menu.classList.contains('hidden')) return;
  state.contextInspectorRefreshTimer = setTimeout(() => {
    state.contextInspectorRefreshTimer = null;
    if (!$('contextInspector')?.classList.contains('hidden')) renderContextInspector();
  }, Math.max(0, delay));
}

function requestPendingBridgeContext() {
  const requestId = `dinside-inspector-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      resolve(value);
    };
    const onMessage = (event) => {
      if (!providerManager?.isTrustedMessage?.(event)) return;
      const data = event.data;
      if (!data || data.type !== 'DINSIDE_PENDING_CONTEXT_STATE' || data.requestId !== requestId) return;
      finish({
        selections: Array.isArray(data.selections) ? data.selections : [],
        selectionSources: Array.isArray(data.selectionSources) ? data.selectionSources : [],
        committedSelectionCount: Number(data.committedSelectionCount) || 0
      });
    };
    const timer = setTimeout(() => finish({ selections: [], selectionSources: [], committedSelectionCount: 0 }), 700);
    window.addEventListener('message', onMessage);
    if (!postToEmbeddedProvider({ type: 'DINSIDE_GET_PENDING_CONTEXT_STATE', requestId })) {
      finish({ selections: [], selectionSources: [], committedSelectionCount: 0 });
    }
  });
}

function removeSelectedContextFromEmbeddedProvider(index) {
  return postToEmbeddedProvider({ type: 'DINSIDE_REMOVE_SELECTED_CONTEXT', index });
}

function inspectorPreviewText(value = '', limit = 50000) {
  return String(value || '').trim().slice(0, limit);
}

function formatSelectionForInspector(selection = {}) {
  const lines = [selection.text || ''];
  const contextLines = [
    selection.domContext?.section ? t`Section: ${selection.domContext.section}` : '',
    selection.domContext?.element ? t`Element: ${selection.domContext.element}` : '',
    selection.domContext?.block ? t`Block: ${selection.domContext.block}` : '',
    selection.sourceRef ? t`Source: ${selection.sourceRef}` : ''
  ].filter(Boolean);
  if (contextLines.length) lines.push('', '[SELECTION_CONTEXT]', ...contextLines);
  return inspectorPreviewText(lines.join('\n'), 16000);
}

function selectionInspectorMeta(selection = {}) {
  const structural = [selection.domContext?.section, selection.domContext?.element].filter(Boolean).join(' · ');
  return structural || selection.title || selection.url || '';
}

function createInspectorRemoveButton({ restore = false, title = '', onClick } = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'context-inspector-remove';
  button.textContent = restore ? '↺' : '×';
  button.title = title || (restore ? t('Restore for next prompt') : t('Remove from context'));
  button.setAttribute('aria-label', button.title);
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick?.();
  });
  return button;
}

function createInspectorSection({ key = '', title, status, statusClass = '', meta = '', preview = '', muted = '', action = null, collapsibleEntries = false } = {}) {
  const section = document.createElement('section');
  const detailKey = key || `section:${title}`;
  const expandable = Boolean(preview || collapsibleEntries);
  section.className = 'context-inspector-section';
  section.dataset.inspectorKey = detailKey;
  if (collapsibleEntries) section.classList.add('collapsible-entries');
  if (expandable && state.contextInspectorExpanded.has(detailKey)) section.classList.add('expanded');
  const includedMarker = statusClass === 'will-send' && /^(?:\d+\s+)?included$/i.test(String(status || '').trim());
  if (includedMarker) section.classList.add('included');

  const head = document.createElement('div');
  head.className = 'context-inspector-section-head';
  const heading = document.createElement('div');
  heading.className = 'context-inspector-section-title';
  heading.textContent = title;
  head.appendChild(heading);
  if (status && !includedMarker) {
    const badge = document.createElement('span');
    badge.className = `context-inspector-badge ${statusClass}`.trim();
    badge.textContent = t(status);
    head.appendChild(badge);
  }

  if (action) head.appendChild(createInspectorRemoveButton(action));

  if (expandable) {
    const chevron = document.createElement('span');
    chevron.className = 'context-inspector-chevron';
    chevron.textContent = '›';
    chevron.setAttribute('aria-hidden', 'true');
    head.appendChild(chevron);
    head.classList.add('expandable');
    head.tabIndex = 0;
    head.setAttribute('role', 'button');
    head.setAttribute('aria-expanded', String(section.classList.contains('expanded')));
    const toggle = () => {
      const scrollHost = section.closest('.context-inspector-body');
      const previousScrollTop = scrollHost?.scrollTop || 0;
      const expanded = section.classList.toggle('expanded');
      head.setAttribute('aria-expanded', String(expanded));
      if (expanded) state.contextInspectorExpanded.add(detailKey);
      else state.contextInspectorExpanded.delete(detailKey);
      if (scrollHost) {
        scrollHost.scrollTop = previousScrollTop;
        requestAnimationFrame(() => {
          if (scrollHost.isConnected) scrollHost.scrollTop = previousScrollTop;
        });
      }
    };
    head.addEventListener('click', toggle);
    head.addEventListener('keydown', (event) => {
      if (event.target !== head) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggle();
    });
  }

  section.appendChild(head);

  if (meta) {
    const metaEl = document.createElement('div');
    metaEl.className = 'context-inspector-meta';
    metaEl.textContent = meta;
    section.appendChild(metaEl);
  }
  if (preview) {
    const previewEl = document.createElement('div');
    previewEl.className = 'context-inspector-preview';
    previewEl.textContent = preview;
    section.appendChild(previewEl);
  }
  if (muted) {
    const mutedEl = document.createElement('div');
    mutedEl.className = 'context-inspector-muted';
    mutedEl.textContent = muted;
    section.appendChild(mutedEl);
  }
  return section;
}

function appendInspectorEntry(section, { key = '', title, meta = '', preview = '', badge = '', badgeClass = '', onRemove } = {}) {
  const entry = document.createElement('div');
  const detailKey = key || `${section.dataset.inspectorKey || 'entry'}:${title}`;
  entry.className = 'context-inspector-entry';
  if (preview && state.contextInspectorExpanded.has(detailKey)) entry.classList.add('expanded');
  const includedMarker = badgeClass === 'will-send' && /^included$/i.test(String(badge || '').trim());
  if (includedMarker) entry.classList.add('included');
  const head = document.createElement('div');
  head.className = 'context-inspector-entry-head';
  const titleEl = document.createElement('div');
  titleEl.className = 'context-inspector-entry-title';
  titleEl.textContent = title;
  head.appendChild(titleEl);
  if (badge && !includedMarker) {
    const badgeEl = document.createElement('span');
    badgeEl.className = `context-inspector-badge ${badgeClass}`.trim();
    badgeEl.textContent = t(badge);
    head.appendChild(badgeEl);
  }
  if (onRemove) {
    head.appendChild(createInspectorRemoveButton({ title: t`Remove ${title}`, onClick: onRemove }));
  }
  if (preview) {
    const chevron = document.createElement('span');
    chevron.className = 'context-inspector-chevron';
    chevron.textContent = '›';
    chevron.setAttribute('aria-hidden', 'true');
    head.appendChild(chevron);
    head.classList.add('expandable');
    head.tabIndex = 0;
    head.setAttribute('role', 'button');
    head.setAttribute('aria-expanded', String(entry.classList.contains('expanded')));
    const toggle = () => {
      const scrollHost = entry.closest('.context-inspector-body');
      const previousScrollTop = scrollHost?.scrollTop || 0;
      const expanded = entry.classList.toggle('expanded');
      head.setAttribute('aria-expanded', String(expanded));
      if (expanded) state.contextInspectorExpanded.add(detailKey);
      else state.contextInspectorExpanded.delete(detailKey);
      if (scrollHost) {
        scrollHost.scrollTop = previousScrollTop;
        requestAnimationFrame(() => {
          if (scrollHost.isConnected) scrollHost.scrollTop = previousScrollTop;
        });
      }
    };
    head.addEventListener('click', toggle);
    head.addEventListener('keydown', (event) => {
      if (event.target !== head) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggle();
    });
  }
  entry.appendChild(head);
  if (meta) {
    const metaEl = document.createElement('div');
    metaEl.className = 'context-inspector-meta';
    metaEl.textContent = meta;
    entry.appendChild(metaEl);
  }
  if (preview) {
    const previewEl = document.createElement('div');
    previewEl.className = 'context-inspector-preview';
    previewEl.textContent = preview;
    entry.appendChild(previewEl);
  }
  section.appendChild(entry);
  return entry;
}

function formatPageForInspector(context) {
  if (!context) return '';
  const lines = [
    t`Title: ${context.title || ''}`,
    `URL: ${context.url || ''}`,
    '',
    t('Page content:'),
    context.text || ''
  ];
  if ((context.links || []).length) {
    lines.push('', t('Links:'), ...(context.links || []).map((item, index) =>
      `- [link${index + 1}] "${item.text || item.title || t('Untitled link')}" -> ${item.href}`
    ));
  }
  if ((context.images || []).length) {
    lines.push('', t('Visible images:'), ...(context.images || []).map((item, index) =>
      `- [img${index + 1}] ${item.src}${item.alt ? ` · alt="${item.alt}"` : ''}${item.caption ? ` · caption="${item.caption}"` : ''}`
    ));
  }
  if ((context.buttons || []).length) {
    lines.push('', t('Buttons:'), ...(context.buttons || []).map((item, index) =>
      `- [button${index + 1}] "${item.label}"${item.disabled ? t(' (disabled)') : ''}`
    ));
  }
  if ((context.semanticItems || []).length) {
    lines.push('', t('Interactive / semantic content:'), ...(context.semanticItems || []).map((item, index) =>
      `- [semantic${index + 1}]${item.eventId ? ' [event]' : ''}${item.role ? ` [role=${item.role}]` : ''} ${item.text}`
    ));
  }
  return inspectorPreviewText(lines.join('\n'));
}

function formatViewportForInspector(viewport) {
  if (!viewport) return '';
  const lines = [
    t`Scroll: ${viewport.scrollPercent ?? 0}% (${viewport.scrollY ?? 0}px)`,
    t`Viewport: ${viewport.viewportWidth || 0}×${viewport.viewportHeight || 0}`
  ];
  if ((viewport.headings || []).length) {
    lines.push('', t('Headings:'), ...(viewport.headings || []).map((item) => `- ${item}`));
  }
  if ((viewport.blocks || []).length) {
    lines.push('', t('Visible text:'), ...(viewport.blocks || []).map((item) => {
      const tag = String(item?.tag || 'p').toLowerCase();
      if (tag === 'code' || tag === 'terminal') {
        return `\`\`\`${tag}\n${item.text}\n\`\`\``;
      }
      return `- [${tag}] ${item.text}`;
    }));
  }
  return inspectorPreviewText(lines.join('\n'));
}

function positionContextInspectorPopover() {
  const menu = $('contextInspector');
  const trigger = $('contextBtn');
  if (!menu || !trigger) return;
  const menuRect = menu.getBoundingClientRect();
  const triggerRect = trigger.getBoundingClientRect();
  const arrowSize = 12;
  const arrowLeft = triggerRect.left + triggerRect.width / 2 - menuRect.left - arrowSize / 2;
  const clamped = Math.max(12, Math.min(menuRect.width - arrowSize - 12, arrowLeft));
  menu.style.setProperty('--context-inspector-arrow-left', `${clamped}px`);
}

function setContextAddExpanded(expanded) {
  const isExpanded = Boolean(expanded);
  const nextPane = isExpanded ? 'tabs' : 'current';
  if (state.contextInspectorPane !== nextPane) {
    state.contextInspectorPane = nextPane;
    chrome.storage.local.set({ [CONTEXT_INSPECTOR_PANE_STORAGE_KEY]: nextPane }).catch(() => {});
  }
  $('tabsMenu')?.classList.toggle('hidden', !isExpanded);
  $('contextCurrentPane')?.classList.toggle('hidden', isExpanded);
  const tabsButton = $('contextAddToggleBtn');
  const pageButton = $('contextPickerSummaryBtn');
  tabsButton?.setAttribute('aria-selected', String(isExpanded));
  pageButton?.setAttribute('aria-selected', String(!isExpanded));
  if (tabsButton) tabsButton.tabIndex = isExpanded ? 0 : -1;
  if (pageButton) pageButton.tabIndex = isExpanded ? -1 : 0;
}

function applyContextInspectorToggleUI() {
  const onBtn = $('contextInspectorFollowOnBtn');
  const offBtn = $('contextInspectorFollowOffBtn');
  if (!onBtn || !offBtn) return;
  onBtn.classList.toggle('active', state.pageFollowEnabled);
  offBtn.classList.toggle('active', !state.pageFollowEnabled);
  onBtn.setAttribute('aria-pressed', String(state.pageFollowEnabled));
  offBtn.setAttribute('aria-pressed', String(!state.pageFollowEnabled));
}

let refreshInspectorLanguage = null;
let contextInspectorRenderToken = 0;
async function renderContextInspector() {
  const body = $('contextInspectorBody');
  if (!body) return;
  const renderToken = ++contextInspectorRenderToken;
  applyContextInspectorToggleUI();
  body.setAttribute('aria-busy', 'true');
  if (body.dataset.contextReady !== 'true') {
    body.replaceChildren();
    const loading = document.createElement('div');
    loading.className = 'context-inspector-loading';
    loading.textContent = t('Preparing next-prompt preview…');
    body.appendChild(loading);
  }

  try {
    await ensurePageFollowSettingLoaded();
    let tab = null;
    let manualPdf = false;
    try { tab = await getActiveTab(); } catch (_) {}

    if (state.pageFollowEnabled && tab?.id && !isRestrictedUrl(tab.url || '')) {
      state.activeTabId = tab.id;
      manualPdf = await shouldUseManualPdfUpload(tab);
      if (manualPdf) {
        setStatus(() => t('PDF detected · upload the file to chat'), 'ready');
      } else {
        const pageRead = readPage({ force: false, attach: false }).catch(() => null);
        const [viewport] = await Promise.all([
          readViewportContext(tab.id).catch(() => null),
          // The inspector is only a preview. Render immediately from available
          // state while a slow page extraction continues in the background.
          waitForBudget(pageRead)
        ]);
        if (viewport) state.latestViewport.set(tab.id, viewport);
      }
    }

    // Make the inspector reflect the live page selection, not only whatever the
    // provider bridge happened to know about before the popover opened.
    await syncSelectedText();

    const [rawSnapshot, bridgeState] = await Promise.all([
      getContextSnapshotForNextPrompt({
        ignoreExclusions: true,
        waitForSlowContext: false
      }),
      requestPendingBridgeContext()
    ]);

    // Reuse this preview when only its language changes; no page reads or sends.
    const renderPreview = () => {
    if (renderToken !== contextInspectorRenderToken) return;
    const payload = rawSnapshot?.payload || null;
    const rawPageWillSend = Boolean(payload?.context);
    const rawViewportWillSend = Boolean(payload?.viewport);
    const pageExcluded = Boolean(state.nextPromptExclusions.page && rawPageWillSend);
    const viewportExcluded = Boolean(state.nextPromptExclusions.viewport && rawViewportWillSend);
    const enabledSkills = state.skills.filter((skill) => skill.enabled && skill.prompt?.trim());
    const selections = bridgeState.selections || [];
    const selectionSources = bridgeState.selectionSources || [];

    let currentContext = manualPdf ? null : (payload?.context || null);
    let currentViewport = manualPdf ? null : (payload?.viewport || null);
    if (tab?.id) {
      const currentUrl = state.latestPageState?.url || tab.url || '';
      const key = makePageKey(tab.id, currentUrl);
      const cachedCurrentContext = getCachedPage(key) || (state.pageContext?.url === currentUrl ? state.pageContext : null);
      if (!manualPdf) {
        currentContext = currentContext || (
          embeddedDocumentContextMatchesTab(cachedCurrentContext, tab) ? cachedCurrentContext : null
        );
        currentViewport = currentViewport || state.latestViewport.get(tab.id) || null;
      }
    }

    const willSendCount =
      (rawPageWillSend && !pageExcluded ? 1 : 0) +
      (rawViewportWillSend && !viewportExcluded ? 1 : 0) +
      selections.length +
      enabledSkills.length;

    const nextBody = document.createDocumentFragment();
    const countLabel = $('contextInspectorCount');
    if (countLabel) {
      countLabel.textContent = willSendCount > 0
        ? t`${willSendCount} item${willSendCount === 1 ? '' : 's'}`
        : '';
    }

    const pageStatus = !state.pageFollowEnabled
      ? [t('Disabled'), 'off']
      : manualPdf
        ? [t('Upload file'), 'off']
      : pageExcluded
        ? [t('Skipped'), 'excluded']
        : rawPageWillSend
          ? [currentContext?.partial ? t('Metadata') : t('Included'), 'will-send']
          : [currentContext ? t('Unchanged') : '', ''];
    nextBody.appendChild(createInspectorSection({
      key: 'full-page',
      title: manualPdf ? t('PDF document') : t('Full page'),
      status: pageStatus[0],
      statusClass: pageStatus[1],
      meta: !state.pageFollowEnabled
        ? ''
        : manualPdf
          ? t('Upload the PDF directly to chat. Text selection and Ctrl+C still work.')
        : currentContext
          ? t`${currentContext.title || t('Untitled')} · ${String(currentContext.text || '').length.toLocaleString()} chars`
          : t('No full-page snapshot yet'),
      preview: manualPdf ? '' : formatPageForInspector(currentContext),
      muted: '',
      action: !manualPdf && rawPageWillSend ? {
        restore: pageExcluded,
        title: pageExcluded ? t('Restore full page for next prompt') : t('Exclude full page from next prompt'),
        onClick: () => {
          state.nextPromptExclusions.page = !pageExcluded;
          renderContextInspector();
        }
      } : null
    }));

    if (!manualPdf) {
      const viewportStatus = !state.pageFollowEnabled
        ? [currentViewport ? t('Disabled') : t('No snapshot'), 'off']
        : viewportExcluded
          ? [t('Skipped'), 'excluded']
          : rawViewportWillSend
            ? [t('Included'), 'will-send']
            : [currentViewport ? t('Unchanged') : '', ''];
      nextBody.appendChild(createInspectorSection({
        key: 'viewport',
        title: t('Viewport'),
        status: viewportStatus[0],
        statusClass: viewportStatus[1],
        meta: !state.pageFollowEnabled
          ? ''
          : currentViewport
            ? `${currentViewport.scrollPercent ?? 0}% · ${currentViewport.viewportWidth || 0}×${currentViewport.viewportHeight || 0}`
            : t('No viewport snapshot'),
        preview: formatViewportForInspector(currentViewport),
        muted: '',
        action: rawViewportWillSend ? {
          restore: viewportExcluded,
          title: viewportExcluded ? t('Restore viewport for next prompt') : t('Exclude viewport from next prompt'),
          onClick: () => {
            state.nextPromptExclusions.viewport = !viewportExcluded;
            renderContextInspector();
          }
        } : null
      }));
    }

    if (selections.length) {
      const selectedSection = createInspectorSection({
        key: 'selected-text',
        title: t('Selected text'),
        status: t`${selections.length} included`,
        statusClass: 'will-send',
        muted: ''
      });
      selections.forEach((selection, index) => {
        appendInspectorEntry(selectedSection, {
          key: `selection:${index}`,
          title: t`Selection ${index + 1}`,
          meta: selectionInspectorMeta(selection),
          preview: formatSelectionForInspector(selection),
          badge: index < (bridgeState.committedSelectionCount || 0) ? t('Keep') : t('Live'),
          badgeClass: 'will-send',
          onRemove: () => {
            removeSelectedContextFromEmbeddedProvider(index);
            setTimeout(() => renderContextInspector(), 40);
          }
        });
      });
      selectionSources.forEach((source) => {
        appendInspectorEntry(selectedSection, {
          key: `selection-source:${source.ref || ''}`,
          title: t`Source ${source.ref || ''}`.trim(),
          meta: t('Shared DOM evidence'),
          preview: inspectorPreviewText(source.text, 4000),
          badge: t('Shared'),
          badgeClass: 'will-send'
        });
      });
      nextBody.appendChild(selectedSection);
    }

    if (enabledSkills.length) {
      const skillsSection = createInspectorSection({
        key: 'skills',
        title: t('Skills'),
        status: t`${enabledSkills.length} included`,
        statusClass: 'will-send',
        muted: ''
      });
      enabledSkills.forEach((skill) => {
        appendInspectorEntry(skillsSection, {
          key: `skill:${skill.id || skill.name || 'untitled'}`,
          title: skill.name || t('Untitled skill'),
          preview: inspectorPreviewText(skill.prompt, 8000),
          badge: t('Included'),
          badgeClass: 'will-send',
          onRemove: async () => {
            skill.enabled = false;
            await saveSkills();
            renderSkills();
            syncSkillsToEmbeddedProvider();
            renderContextInspector();
          }
        });
      });
      nextBody.appendChild(skillsSection);
    }
    const scrollHost = $('contextOverviewPane') || body;
    const previousScrollTop = scrollHost.scrollTop;
    body.replaceChildren(nextBody);
    scrollHost.scrollTop = Math.min(previousScrollTop, Math.max(0, scrollHost.scrollHeight - scrollHost.clientHeight));
    body.dataset.contextReady = 'true';
    body.setAttribute('aria-busy', 'false');
    };
    refreshInspectorLanguage = renderPreview;
    renderPreview();
  } catch (error) {
    if (renderToken !== contextInspectorRenderToken) return;
    refreshInspectorLanguage = null;
    body.setAttribute('aria-busy', 'false');
    if (body.dataset.contextReady !== 'true') {
      body.replaceChildren();
      const failed = document.createElement('div');
      failed.className = 'context-inspector-empty';
      failed.textContent = error?.message || t('Could not prepare context preview.');
      body.appendChild(failed);
    }
  }
}

function openContextInspector() {
  closeFloatingMenus('contextInspector');
  const menu = $('contextInspector');
  const button = $('contextBtn');
  if (!menu || !button) return;
  menu.classList.remove('hidden');
  button.setAttribute('aria-expanded', 'true');
  // Return to the source the user last worked with. On a fresh install, the
  // empty state opens the tab picker so the first action is immediately clear.
  const openTabs = state.contextInspectorPane
    ? state.contextInspectorPane === 'tabs'
    : state.attachedPages.size === 0;
  setContextAddExpanded(openTabs);
  applyContextInspectorToggleUI();
  requestAnimationFrame(positionContextInspectorPopover);
  renderContextInspector();
  refreshOpenTabsMenu().catch(() => {});
}

function closeContextInspector() {
  contextInspectorRenderToken += 1;
  clearTimeout(state.openTabsRefreshTimer);
  state.openTabsRefreshTimer = null;
  $('contextInspector')?.classList.add('hidden');
  $('contextBtn')?.setAttribute('aria-expanded', 'false');
}

function positionCaptureMenu() {
  const menu = $('captureMenu');
  const trigger = $('captureBtn');
  const app = document.querySelector('.app');
  if (!menu || !trigger || !app || menu.classList.contains('hidden')) return;

  const appRect = app.getBoundingClientRect();
  const triggerRect = trigger.getBoundingClientRect();
  const menuWidth = menu.offsetWidth;
  const margin = 8;
  const triggerCenter = triggerRect.left + triggerRect.width / 2 - appRect.left;
  const left = Math.max(margin, Math.min(appRect.width - menuWidth - margin, triggerCenter - menuWidth / 2));
  const arrowLeft = Math.max(10, Math.min(menuWidth - 20, triggerCenter - left - 5));
  menu.style.left = `${left}px`;
  menu.style.setProperty('--capture-arrow-left', `${arrowLeft}px`);
}

function closeCaptureMenu() {
  $('captureMenu')?.classList.add('hidden');
  $('captureBtn')?.setAttribute('aria-expanded', 'false');
}

function toggleCaptureMenu() {
  const menu = $('captureMenu');
  const trigger = $('captureBtn');
  if (!menu || !trigger) return;
  const opening = menu.classList.contains('hidden');
  if (!opening) {
    closeCaptureMenu();
    return;
  }
  closeFloatingMenus('captureMenu');
  menu.classList.remove('hidden');
  trigger.setAttribute('aria-expanded', 'true');
  requestAnimationFrame(positionCaptureMenu);
}

function updateContextButtonUI() {
  const button = $('contextBtn');
  if (!button) return;
  const pinnedCount = state.attachedPages.size;
  button.classList.toggle('active', state.pageFollowEnabled || pinnedCount > 0);
  const label = pinnedCount > 0
    ? `${t('Context')} · ${pinnedCount} ${t('Pinned').toLocaleLowerCase()}`
    : `${t('Context')} · ${t('Page context')} ${state.pageFollowEnabled ? t('On') : t('Off')}`;
  button.dataset.tooltip = label;
  button.setAttribute('aria-label', label);
}

async function applyPageFollowUI() {
  updateContextButtonUI();
  applyContextInspectorToggleUI();
}

async function setPageFollowEnabled(enabled) {
  await ensurePageFollowSettingLoaded();
  state.pageFollowEnabled = Boolean(enabled);
  await chrome.storage.local.set({ dinsidePageFollowEnabled: state.pageFollowEnabled });
  applyPageFollowUI();
  if (!state.pageFollowEnabled) {
    cancelContextWarmup();
    clearNextPromptExclusions();
    state.pageContext = null;
    state.sent.clear();
    state.sentPageSnapshots.clear();
    state.sentViewport.clear();
    state.pendingDeliveries.clear();
    state.deliveryEpoch += 1;
  }
  await syncActivePage();
  if (state.pageFollowEnabled) scheduleContextWarmup(PRELOAD_IDLE_DELAY_MS);
}

function syncSkillsButtonState() {
  const open = ['skillsMenu', 'skillEditor'].some((id) => !$(id)?.classList.contains('hidden'));
  $('skillsBtn')?.setAttribute('aria-expanded', String(open));
}

function closeFloatingMenus(except = '') {
  closeSkillLifetimeMenu();
  for (const id of ['providerMenu', 'contextInspector', 'captureMenu', 'skillsMenu', 'skillEditor', 'settingsMenu']) {
    if (id === except) continue;
    $(id)?.classList.add('hidden');
    if (id === 'providerMenu') {
      $('providerBtn')?.setAttribute('aria-expanded', 'false');
    }
    if (id === 'contextInspector') $('contextBtn')?.setAttribute('aria-expanded', 'false');
    if (id === 'captureMenu') $('captureBtn')?.setAttribute('aria-expanded', 'false');
    if (id === 'settingsMenu') {
      setQuickAskCustomPanel(false);
      setDonatePanel(false);
    }
  }
  syncSkillsButtonState();
}

function applyToolbarPosition() {
  const position = state.toolbarPosition === 'bottom' ? 'bottom' : 'top';
  state.toolbarPosition = position;
  document.querySelector('.app')?.setAttribute('data-toolbar-position', position);
  $('toolbarTopBtn')?.classList.toggle('active', position === 'top');
  $('toolbarBottomBtn')?.classList.toggle('active', position === 'bottom');
}

async function setToolbarPosition(position) {
  state.toolbarPosition = position === 'bottom' ? 'bottom' : 'top';
  await chrome.storage.local.set({ dinsideToolbarPosition: state.toolbarPosition });
  applyToolbarPosition();
  closeFloatingMenus();
}

function applyTheme() {
  const mode = ['light', 'dark', 'chatgpt'].includes(state.themeMode) ? state.themeMode : 'chatgpt';
  state.themeMode = mode;
  const effective = mode === 'chatgpt' ? state.chatgptTheme : mode;
  const resolvedTheme = effective === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', resolvedTheme);
  document.documentElement.setAttribute('data-theme-mode', mode);
  try { localStorage.setItem('dinsideStartupTheme', resolvedTheme); } catch (_) {}
  $('themeLightBtn')?.classList.toggle('active', mode === 'light');
  $('themeDarkBtn')?.classList.toggle('active', mode === 'dark');
  $('themeChatGPTBtn')?.classList.toggle('active', mode === 'chatgpt');
}

async function setThemeMode(mode) {
  state.themeMode = ['light', 'dark', 'chatgpt'].includes(mode) ? mode : 'chatgpt';
  await chrome.storage.local.set({ dinsideThemeMode: state.themeMode });
  applyTheme();
}

function requestProviderTheme() {
  postToEmbeddedProvider({ type: 'DINSIDE_REQUEST_THEME' });
}

function applyKeepLastChatUI() {
  $('keepChatOnBtn')?.classList.toggle('active', state.keepLastChat);
  $('keepChatOffBtn')?.classList.toggle('active', !state.keepLastChat);
}

function applySelectedTextContextUI() {
  $('selectedTextOnBtn')?.classList.toggle('active', state.selectedTextContextEnabled);
  $('selectedTextOffBtn')?.classList.toggle('active', !state.selectedTextContextEnabled);
}

function normalizeQuickAskCustomActions(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, QUICK_ASK_CUSTOM_ACTION_LIMIT).map((item, index) => ({
    id: String(item?.id || `custom-${index}`).slice(0, 80),
    label: String(item?.label || '').trim().slice(0, 32),
    instruction: String(item?.instruction || '').trim().slice(0, 2000),
    icon: QUICK_ASK_ICON_KEYS.includes(item?.icon) ? item.icon : 'sparkles'
  })).filter((item) => item.label && item.instruction);
}

function createQuickAskCustomActionId() {
  if (globalThis.crypto?.randomUUID) return `quick-custom-${crypto.randomUUID()}`;
  return `quick-custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function applyQuickAskCustomPanelUI() {
  $('quickAskCustomPanel')?.classList.toggle('hidden', !state.quickAskCustomPanelOpen);
}

function setQuickAskCustomPanel(open) {
  state.quickAskCustomPanelOpen = Boolean(open);
  if (!state.quickAskCustomPanelOpen) state.quickAskCustomEditorOpen = false;
  applyQuickAskCustomPanelUI();
  renderQuickAskCustomActions();
  requestAnimationFrame(positionSettingsPopover);
}

function renderQuickAskCustomActions() {
  const list = $('quickAskCustomList');
  const count = $('quickAskCustomCount');
  const addButton = $('quickAskAddCustomBtn');
  const form = $('quickAskCustomForm');
  if (!list || !count || !addButton || !form) return;

  list.replaceChildren();
  state.quickAskCustomActions.forEach((action) => {
    const row = document.createElement('div');
    row.className = 'quick-ask-custom-item';
    row.title = action.instruction;

    const icon = document.createElement('span');
    icon.className = 'quick-ask-custom-icon';
    icon.innerHTML = quickAskIconSvg(action.icon);

    const name = document.createElement('span');
    name.className = 'quick-ask-custom-name';
    name.textContent = action.label;

    const reorder = document.createElement('span');
    reorder.className = 'quick-ask-custom-reorder';
    reorder.setAttribute('aria-hidden', 'true');
    reorder.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 7h8M8 12h8M8 17h8"/></svg>';

    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'quick-ask-custom-edit';
    edit.dataset.editQuickAction = action.id;
    edit.textContent = t('Edit');

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'quick-ask-custom-remove';
    remove.dataset.removeQuickAction = action.id;
    remove.setAttribute('aria-label', t`Remove ${action.label}`);
    remove.title = t`Remove ${action.label}`;
    remove.textContent = '×';

    row.dataset.quickActionId = action.id;
    reorder.draggable = true;
    reorder.dataset.dragQuickAction = action.id;
    row.append(reorder, icon, name, edit, remove);
    list.appendChild(row);
  });

  if (!state.quickAskCustomActions.length && !state.quickAskCustomEditorOpen) {
    const empty = document.createElement('div');
    empty.className = 'quick-ask-custom-empty';
    empty.textContent = t('No custom actions yet');
    list.appendChild(empty);
  }

  count.textContent = `${state.quickAskCustomActions.length}/${QUICK_ASK_CUSTOM_ACTION_LIMIT}`;
  const atLimit = state.quickAskCustomActions.length >= QUICK_ASK_CUSTOM_ACTION_LIMIT;
  if (atLimit && !state.quickAskCustomEditingId) state.quickAskCustomEditorOpen = false;
  addButton.disabled = atLimit && !state.quickAskCustomEditingId;
  addButton.textContent = state.quickAskCustomEditorOpen ? t('Close') : t('+ Add');
  applyQuickAskCustomPanelUI();
  form.classList.toggle('hidden', !state.quickAskCustomEditorOpen);
  const picker = $('quickAskIconPicker');
  if ($('quickAskIconPreview')) $('quickAskIconPreview').innerHTML = quickAskIconSvg(state.quickAskCustomIcon);
  if (picker) {
    picker.replaceChildren(...QUICK_ASK_ICON_KEYS.map((key) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `quick-ask-icon-option${state.quickAskCustomIcon === key ? ' active' : ''}`;
      button.dataset.quickAskIcon = key;
      button.innerHTML = quickAskIconSvg(key);
      return button;
    }));
  }
  const save = $('quickAskCustomSaveBtn');
  if (save) save.textContent = state.quickAskCustomEditingId ? t('Save changes') : t('Add action');
}

function setQuickAskCustomEditor(open, action = null) {
  state.quickAskCustomEditorOpen = Boolean(open) && (Boolean(action) || state.quickAskCustomActions.length < QUICK_ASK_CUSTOM_ACTION_LIMIT);
  state.quickAskCustomEditingId = action?.id || '';
  state.quickAskCustomIcon = action?.icon || 'sparkles';
  if (state.quickAskCustomEditorOpen) {
    if ($('quickAskCustomLabel')) $('quickAskCustomLabel').value = action?.label || '';
    if ($('quickAskCustomInstruction')) $('quickAskCustomInstruction').value = action?.instruction || '';
  }
  renderQuickAskCustomActions();
  requestAnimationFrame(positionSettingsPopover);
  if (state.quickAskCustomEditorOpen) {
    requestAnimationFrame(() => $('quickAskCustomLabel')?.focus());
  }
}

async function saveQuickAskCustomAction() {
  const label = String($('quickAskCustomLabel')?.value || '').trim().slice(0, 32);
  const instruction = String($('quickAskCustomInstruction')?.value || '').trim().slice(0, 2000);
  if (!label || !instruction) {
    setStatus(() => t('Custom action needs a name and instruction'), 'error');
    return false;
  }
  const editingId = state.quickAskCustomEditingId;
  if (!editingId && state.quickAskCustomActions.length >= QUICK_ASK_CUSTOM_ACTION_LIMIT) {
    setStatus(() => t`Quick Ask supports up to ${QUICK_ASK_CUSTOM_ACTION_LIMIT} custom actions`, 'error');
    return false;
  }

  state.quickAskCustomActions = editingId
    ? state.quickAskCustomActions.map((action) => action.id === editingId ? { ...action, label, instruction, icon: state.quickAskCustomIcon } : action)
    : [...state.quickAskCustomActions, { id: createQuickAskCustomActionId(), label, instruction, icon: state.quickAskCustomIcon }];
  await chrome.storage.local.set({
    [QUICK_ASK_CUSTOM_ACTIONS_STORAGE_KEY]: state.quickAskCustomActions
  });
  if ($('quickAskCustomLabel')) $('quickAskCustomLabel').value = '';
  if ($('quickAskCustomInstruction')) $('quickAskCustomInstruction').value = '';
  state.quickAskCustomEditorOpen = false;
  state.quickAskCustomEditingId = '';
  state.quickAskCustomIcon = 'sparkles';
  renderQuickAskCustomActions();
  requestAnimationFrame(positionSettingsPopover);
  setStatus(() => t`Quick Ask action ${editingId ? t('updated') : t('added')} · ${label}`, 'ready');
  return true;
}

async function removeQuickAskCustomAction(id) {
  const existing = state.quickAskCustomActions.find((action) => action.id === id);
  if (!existing) return false;
  state.quickAskCustomActions = state.quickAskCustomActions.filter((action) => action.id !== id);
  await chrome.storage.local.set({
    [QUICK_ASK_CUSTOM_ACTIONS_STORAGE_KEY]: state.quickAskCustomActions
  });
  renderQuickAskCustomActions();
  requestAnimationFrame(positionSettingsPopover);
  setStatus(() => t`Quick Ask action removed · ${existing.label}`, 'ready');
  return true;
}

function applyQuickAskUI() {
  $('quickAskOnBtn')?.classList.toggle('active', state.quickAskEnabled);
  $('quickAskOffBtn')?.classList.toggle('active', !state.quickAskEnabled);
  renderQuickAskCustomActions();
}

async function setQuickAskEnabled(enabled) {
  state.quickAskEnabled = Boolean(enabled);
  await chrome.storage.local.set({ dinsideQuickAskEnabled: state.quickAskEnabled });
  applyQuickAskUI();
  if (!state.quickAskEnabled) {
    const store = chrome.storage.session || chrome.storage.local;
    await store.remove(QUICK_ASK_PENDING_STORAGE_KEY).catch(() => {});
  }
  setStatus(() => t`Quick Ask ${state.quickAskEnabled ? t('on') : t('off')}`, state.quickAskEnabled ? 'ready' : 'idle');
}

async function consumeQuickAskPending() {
  if (!state.quickAskEnabled || !state.bridgeReady || state.quickAskConsumeInFlight) return false;
  const store = chrome.storage.session || chrome.storage.local;
  state.quickAskConsumeInFlight = true;
  try {
    const saved = await store.get(QUICK_ASK_PENDING_STORAGE_KEY);
    const pending = saved?.[QUICK_ASK_PENDING_STORAGE_KEY];
    if (!pending?.selection?.text) return false;

    if (!pending.createdAt || Date.now() - pending.createdAt > 30000) {
      await store.remove(QUICK_ASK_PENDING_STORAGE_KEY).catch(() => {});
      return false;
    }

    const posted = postToEmbeddedProvider({
      type: 'DINSIDE_QUICK_ASK',
      action: pending.action,
      label: pending.label || '',
      instruction: pending.instruction || '',
      selection: pending.selection,
      quickAskId: pending.id || ''
    });
    if (!posted) return false;

    await store.remove(QUICK_ASK_PENDING_STORAGE_KEY).catch(() => {});
    setStatus(() => t`Quick Ask · ${pending.label || pending.action}`, 'ready');
    return true;
  } finally {
    state.quickAskConsumeInFlight = false;
  }
}

async function setSelectedTextContextEnabled(enabled) {
  state.selectedTextContextEnabled = Boolean(enabled);
  await chrome.storage.local.set({
    dinsideSelectedTextContextEnabled: state.selectedTextContextEnabled
  });
  applySelectedTextContextUI();

  if (!state.selectedTextContextEnabled) {
    state.lastForwardedSelection = '';
    state.lastForwardedSelectionFrame = '';
    state.lastKnownDocumentSelection = null;
    state.lastKnownDocumentSelectionTabId = null;
    state.appendNextSelection = false;
    state.appendBaselineSelection = '';
    state.appendPendingSelection = false;
    if (state.latestPageState) {
      state.latestPageState.selectedText = '';
      state.latestPageState.selection = null;
    }
    clearAllSelectedTextInEmbeddedProvider();
    scheduleContextInspectorRefresh(40);
    setStatus(() => t('Selected text context off'), 'idle');
    return;
  }

  setStatus(() => t('Selected text context on'), 'ready');
  syncSelectedText();
}

function applyContextModeUI() {
  $('contextOnDemandBtn')?.classList.toggle('active', state.contextMode === 'on-demand');
  $('contextSmartBtn')?.classList.toggle('active', state.contextMode === 'smart');
  $('contextPreloadBtn')?.classList.toggle('active', state.contextMode === 'preload');
}

function applyContextDisplayModeUI() {
  $('contextDisplayVisibleBtn')?.classList.toggle('active', state.contextDisplayMode === 'visible');
  $('contextDisplayCompactBtn')?.classList.toggle('active', state.contextDisplayMode === 'compact');
}

function applyPageUpdateModeUI() {
  $('pageUpdateSmartBtn')?.classList.toggle('active', state.pageUpdateMode === 'smart');
  $('pageUpdateDiffBtn')?.classList.toggle('active', state.pageUpdateMode === 'diff');
  $('pageUpdateFullBtn')?.classList.toggle('active', state.pageUpdateMode === 'full');
}

function applyCompressionModeUI() {
  $('compressionOffBtn')?.classList.toggle('active', state.compressionMode === 'off');
  $('compressionBalancedBtn')?.classList.toggle('active', state.compressionMode === 'balanced');
  $('compressionAggressiveBtn')?.classList.toggle('active', state.compressionMode === 'aggressive');
}

async function setContextDisplayMode(mode) {
  state.contextDisplayMode = CONTEXT_DISPLAY_MODES.includes(mode) ? mode : 'compact';
  await chrome.storage.local.set({ dinsideContextDisplayMode: state.contextDisplayMode });
  applyContextDisplayModeUI();
  setStatus(() => t`Context display: ${t(state.contextDisplayMode)}`, 'ready');
}

async function setPageUpdateMode(mode) {
  state.pageUpdateMode = PAGE_UPDATE_MODES.includes(mode) ? mode : 'smart';
  await chrome.storage.local.set({ dinsidePageUpdateMode: state.pageUpdateMode });
  resetSentContextState();
  applyPageUpdateModeUI();
  setStatus(() => t`Page updates: ${t(state.pageUpdateMode)}`, 'ready');
}

async function setCompressionMode(mode) {
  state.compressionMode = COMPRESSION_MODES.includes(mode) ? mode : 'balanced';
  await chrome.storage.local.set({ dinsideCompressionMode: state.compressionMode });
  resetSentContextState();
  applyCompressionModeUI();
  setStatus(() => t`Compression: ${t(state.compressionMode)}`, 'ready');
}

async function setContextMode(mode) {
  state.contextMode = ['on-demand', 'smart', 'preload'].includes(mode) ? mode : 'smart';
  await chrome.storage.local.set({ dinsideContextMode: state.contextMode });
  applyContextModeUI();

  if (['preload', 'smart'].includes(state.contextMode) && state.pageFollowEnabled) {
    scheduleContextWarmup(PRELOAD_IDLE_DELAY_MS);
  } else {
    cancelContextWarmup();
  }
}

async function setKeepLastChat(enabled) {
  state.keepLastChat = Boolean(enabled);
  await chrome.storage.local.set({ dinsideKeepLastChat: state.keepLastChat });
  if (!state.keepLastChat) {
    state.lastChatUrls = {};
    await chrome.storage.local.remove(['dinsideLastChatUrl', 'dinsideLastChatUrls']);
  } else {
    requestCurrentChatUrl();
  }
  applyKeepLastChatUI();
}

function requestCurrentChatUrl() {
  if (!state.keepLastChat) return;
  postToEmbeddedProvider({ type: 'DINSIDE_REQUEST_CHAT_URL' });
}

function formatShortcut(shortcut = '') {
  return shortcut ? shortcut.replace(/\+/g, ' + ') : t('Not set');
}

async function refreshShortcutSettings() {
  try {
    const commands = await chrome.commands.getAll();
    const toggle = commands.find((command) => command.name === '_execute_action');
    if ($('toggleShortcutKey')) $('toggleShortcutKey').textContent = formatShortcut(toggle?.shortcut);
  } catch (_) {}
}

function openShortcutSettings() {
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
}

async function openSupportEmail() {
  const version = chrome.runtime.getManifest().version;
  const provider = getActiveProvider()?.name || 'Unknown';
  const subject = t('[DinSide] Report or feedback');
  const body = [
    t('Hello DinSide team,'),
    '',
    t('Describe the problem or suggestion:'),
    '',
    '',
    t('If this is a problem, add steps to reproduce:'),
    '1. ',
    '2. ',
    '',
    t('Expected result (optional):'),
    '',
    '',
    t('Actual result (optional):'),
    '',
    '',
    t('Please attach a screenshot if possible.'),
    '',
    '---',
    t('Diagnostics generated by DinSide'),
    `${t('Version')}: ${version}`,
    `${t('Provider')}: ${provider}`,
    `${t('Browser')}: ${navigator.userAgent}`
  ].join('\n');
  const query = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: SUPPORT_EMAIL,
    su: subject,
    body
  });
  try {
    await chrome.tabs.create({ url: `https://mail.google.com/mail/?${query}` });
    setStatus(() => t('Opening email…'), 'ready');
  } catch (_) {
    setStatus(() => t('Could not open Gmail.'), 'error');
  }
}

async function copyTextToClipboard(text) {
  let copied = false;
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch (_) {}
  }

  if (!copied) {
    const input = document.createElement('textarea');
    input.value = text;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    try {
      input.select();
      copied = document.execCommand('copy');
    } finally {
      input.remove();
    }
  }
  if (!copied) throw new Error('Copy command failed');
}

async function copySupportEmail() {
  try {
    await copyTextToClipboard(SUPPORT_EMAIL);
    setStatus(() => t('Support email copied'), 'ready');
  } catch (_) {
    setStatus(() => t('Could not copy support email.'), 'error');
  }
}

function preferredDonationMethod() {
  return globalThis.DinSideI18n?.language === 'vi' ? 'vietnam' : 'international';
}

function applyDonationPanelLayout() {
  const menu = $('settingsMenu');
  const panel = $('donatePanel');
  const panelOpen = Boolean(panel && !panel.classList.contains('hidden'));
  if (!menu) return;

  menu.classList.toggle('donate-content-fit', panelOpen);
  if (!panelOpen) {
    menu.style.removeProperty('--donate-panel-height');
    requestAnimationFrame(positionSettingsPopover);
    return;
  }

  requestAnimationFrame(() => {
    const head = panel.querySelector('.donate-panel-head');
    const body = panel.querySelector('.donate-panel-body');
    const tabs = $('donateMethodTabs');
    const activePanel = state.donationMethod === 'vietnam'
      ? $('donateVietnamPanel')
      : $('donateInternationalPanel');
    if (!head || !body || !tabs || !activePanel) return;

    const outerHeight = (element) => {
      const style = getComputedStyle(element);
      return element.getBoundingClientRect().height +
        (Number.parseFloat(style.marginTop) || 0) +
        (Number.parseFloat(style.marginBottom) || 0);
    };
    const bodyStyle = getComputedStyle(body);
    const bodyPadding =
      (Number.parseFloat(bodyStyle.paddingTop) || 0) +
      (Number.parseFloat(bodyStyle.paddingBottom) || 0);
    const targetHeight = Math.ceil(
      head.getBoundingClientRect().height +
      bodyPadding +
      outerHeight(tabs) +
      outerHeight(activePanel)
    );
    menu.style.setProperty('--donate-panel-height', `${Math.max(154, targetHeight)}px`);
    positionSettingsPopover();
  });
}

function setDonationMethod(method, { manual = false } = {}) {
  const next = method === 'vietnam' ? 'vietnam' : 'international';
  state.donationMethod = next;
  if (manual) state.donationMethodManuallyChosen = true;

  const international = next === 'international';
  $('donateMethodTabs')?.classList.toggle('vietnam-active', !international);
  const internationalTab = $('donateInternationalTab');
  const vietnamTab = $('donateVietnamTab');
  internationalTab?.classList.toggle('active', international);
  internationalTab?.setAttribute('aria-selected', String(international));
  internationalTab?.setAttribute('tabindex', international ? '0' : '-1');
  vietnamTab?.classList.toggle('active', !international);
  vietnamTab?.setAttribute('aria-selected', String(!international));
  vietnamTab?.setAttribute('tabindex', international ? '-1' : '0');
  $('donateInternationalPanel')?.classList.toggle('hidden', !international);
  $('donateVietnamPanel')?.classList.toggle('hidden', international);
  applyDonationPanelLayout();
}

function handleDonationTabKeydown(event) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const next = event.key === 'Home'
    ? 'international'
    : event.key === 'End'
      ? 'vietnam'
      : state.donationMethod === 'international' ? 'vietnam' : 'international';
  setDonationMethod(next, { manual: true });
  $(next === 'international' ? 'donateInternationalTab' : 'donateVietnamTab')?.focus();
}

async function openBuyMeACoffee() {
  try {
    await chrome.tabs.create({ url: BUY_ME_A_COFFEE_URL });
    setStatus(() => t('Opening Buy Me a Coffee…'), 'ready');
  } catch (_) {
    setStatus(() => t('Could not open Buy Me a Coffee.'), 'error');
  }
}

function setDonatePanel(open) {
  const panel = $('donatePanel');
  if (!panel) return;
  const wasOpen = !panel.classList.contains('hidden');
  if (open) setQuickAskCustomPanel(false);
  panel.classList.toggle('hidden', !open);
  panel.setAttribute('aria-hidden', String(!open));
  if (open) {
    if (!state.donationMethodManuallyChosen) {
      setDonationMethod(preferredDonationMethod());
    } else {
      setDonationMethod(state.donationMethod);
    }
    requestAnimationFrame(() => $('donateBackBtn')?.focus());
  }
  else if (wasOpen && !$('settingsMenu')?.classList.contains('hidden')) {
    requestAnimationFrame(() => $('openDonateBtn')?.focus());
  }
  applyDonationPanelLayout();
}

async function copyDonationAccountNumber() {
  const button = $('copyDonateAccountBtn');
  const label = button?.querySelector('span');

  try {
    await copyTextToClipboard(DONATION_ACCOUNT_NUMBER);

    if (label) label.textContent = t('Copied!');
    setStatus(() => t('Account number copied'), 'ready');
    setTimeout(() => {
      if (label?.isConnected) label.textContent = t('Copy account number');
    }, 1600);
  } catch (_) {
    setStatus(() => t('Could not copy account number.'), 'error');
  }
}

function positionSettingsPopover() {
  const menu = $('settingsMenu');
  const trigger = $('settingsBtn');
  if (!menu || !trigger) return;

  const menuRect = menu.getBoundingClientRect();
  const triggerRect = trigger.getBoundingClientRect();
  const arrowSize = 12;
  const arrowLeft = triggerRect.left + triggerRect.width / 2 - menuRect.left - arrowSize / 2;
  const clamped = Math.max(12, Math.min(menuRect.width - arrowSize - 12, arrowLeft));
  menu.style.setProperty('--settings-arrow-left', `${clamped}px`);
}

function openSettingsMenu() {
  closeFloatingMenus('settingsMenu');
  setQuickAskCustomPanel(false);
  setDonatePanel(false);
  applyToolbarPosition();
  applyTheme();
  applyKeepLastChatUI();
  applySelectedTextContextUI();
  applyQuickAskUI();
  applyContextModeUI();
  applyContextDisplayModeUI();
  applyPageUpdateModeUI();
  applyCompressionModeUI();
  requestProviderTheme();
  refreshShortcutSettings();
  const menu = $('settingsMenu');
  menu?.classList.remove('hidden');
  requestAnimationFrame(positionSettingsPopover);
}

function normalizeSkillLifetime(value) {
  return SKILL_LIFETIMES.includes(value) ? value : 'chat';
}

function skillLifetimeLabel(value) {
  return t(SKILL_LIFETIME_LABELS[normalizeSkillLifetime(value)]);
}

function clearSkillChatScope(skill) {
  if (!skill) return;
  delete skill.chatProviderId;
  delete skill.chatUrl;
}

function bindSkillToCurrentChat(skill) {
  if (!skill) return;
  const provider = getActiveProvider();
  skill.chatProviderId = provider?.id || '';
  skill.chatUrl = provider?.isRestorableChatUrl?.(state.activeChatUrl)
    ? state.activeChatUrl
    : '';
}

function clearChatLifetimeSkills() {
  let changed = false;
  for (const skill of state.skills) {
    if (!skill.enabled || normalizeSkillLifetime(skill.lifetime) !== 'chat') continue;
    skill.enabled = false;
    clearSkillChatScope(skill);
    changed = true;
  }
  return changed;
}

function reconcileChatLifetimeSkills(url) {
  const provider = getActiveProvider();
  if (!provider || !url) return false;
  const restorable = Boolean(provider.isRestorableChatUrl?.(url));
  let changed = false;

  for (const skill of state.skills) {
    if (!skill.enabled || normalizeSkillLifetime(skill.lifetime) !== 'chat') continue;

    if (skill.chatProviderId && skill.chatProviderId !== provider.id) {
      skill.enabled = false;
      clearSkillChatScope(skill);
      changed = true;
      continue;
    }

    if (!skill.chatProviderId) {
      skill.chatProviderId = provider.id;
      changed = true;
    }

    const scopedUrl = String(skill.chatUrl || '');
    if (scopedUrl) {
      if (!restorable || chatChangeNeedsContextReset(scopedUrl, url)) {
        skill.enabled = false;
        clearSkillChatScope(skill);
        changed = true;
      }
      continue;
    }

    // A new conversation has no stable URL until its first prompt is sent.
    // Bind the Chat lifetime when the provider assigns the real conversation URL.
    if (restorable) {
      skill.chatUrl = url;
      changed = true;
    }
  }

  return changed;
}

function closeSkillLifetimeMenu() {
  document.getElementById('skillLifetimeMenu')?.remove();
}

function openSkillLifetimeMenu(skill, trigger) {
  const existing = document.getElementById('skillLifetimeMenu');
  if (existing?.dataset.skillId === String(skill.id || '')) {
    closeSkillLifetimeMenu();
    return;
  }
  closeSkillLifetimeMenu();

  const menu = document.createElement('div');
  menu.id = 'skillLifetimeMenu';
  menu.className = 'skill-lifetime-menu';
  menu.dataset.skillId = String(skill.id || '');
  menu.setAttribute('role', 'menu');
  menu.addEventListener('pointerdown', (event) => event.stopPropagation());

  for (const lifetime of SKILL_LIFETIMES) {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'skill-lifetime-option';
    option.classList.toggle('active', normalizeSkillLifetime(skill.lifetime) === lifetime);
    option.dataset.lifetime = lifetime;

    const check = document.createElement('span');
    check.className = 'skill-lifetime-check';
    check.textContent = normalizeSkillLifetime(skill.lifetime) === lifetime ? '✓' : '';
    const label = document.createElement('span');
    label.textContent = t(SKILL_LIFETIME_MENU_LABELS[lifetime]);
    option.append(check, label);

    option.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      skill.lifetime = lifetime;
      if (skill.enabled && lifetime === 'chat') bindSkillToCurrentChat(skill);
      else clearSkillChatScope(skill);
      await saveSkills();
      renderSkills();
      scheduleContextInspectorRefresh(50);
    });
    menu.appendChild(option);
  }

  document.body.appendChild(menu);
  const triggerRect = trigger.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  const pad = 6;
  const gap = 5;
  let left = Math.round(triggerRect.right - menuRect.width);
  left = Math.max(pad, Math.min(left, innerWidth - menuRect.width - pad));
  let top = Math.round(triggerRect.bottom + gap);
  if (top + menuRect.height > innerHeight - pad) {
    top = Math.round(triggerRect.top - menuRect.height - gap);
  }
  menu.style.left = `${left}px`;
  menu.style.top = `${Math.max(pad, top)}px`;
}

async function loadSkills() {
  const saved = await chrome.storage.local.get('dinsideSkills');
  state.skills = Array.isArray(saved.dinsideSkills)
    ? saved.dinsideSkills.map((skill) => ({
      ...skill,
      enabled: Boolean(skill?.enabled),
      lifetime: normalizeSkillLifetime(skill?.lifetime)
    }))
    : [];
  const scopeChanged = reconcileChatLifetimeSkills(state.activeChatUrl);
  if (scopeChanged) await saveSkills();
  renderSkills();
}

async function saveSkills() {
  await chrome.storage.local.set({ dinsideSkills: state.skills });
}

window.addEventListener('message', async (event) => {
  const frame = $('providerFrame');
  if (event.origin === 'https://chatgpt.com' &&
      getActiveProvider()?.id === 'chatgpt' && event.source === frame?.contentWindow) {
    if (event.data?.type === 'DINSIDE_CHATGPT_AUTH_HELLO') {
      event.source.postMessage({ type: 'DINSIDE_CHATGPT_AUTH_ACK' }, event.origin);
      return;
    }
    if (event.data?.type === 'DINSIDE_CHATGPT_AUTH_OPEN') {
      try {
        if (!await openChatgptAuth(event.data.url)) {
          setStatus(() => t('Could not open ChatGPT sign-in'), 'error');
        }
      } catch (error) {
        console.warn('[DinSide] Could not open ChatGPT sign-in', error);
        setStatus(() => t('Could not open ChatGPT sign-in'), 'error');
      }
      return;
    }
  }
  const googleAccountFrame =
    (event.origin === 'https://ogs.google.com' &&
      ['googleaimode', 'googleaistudio', 'gemini', 'notebooklm'].includes(getActiveProvider()?.id) && event.source !== window) ||
    (event.origin === 'https://aistudio.google.com' &&
      getActiveProvider()?.id === 'googleaistudio' && event.source === frame?.contentWindow) ||
    (event.origin === 'https://gemini.google.com' &&
      getActiveProvider()?.id === 'gemini' && event.source === frame?.contentWindow) ||
    (['https://notebook.google.com', 'https://notebooklm.google.com'].includes(event.origin) &&
      getActiveProvider()?.id === 'notebooklm' && event.source === frame?.contentWindow);
  if (googleAccountFrame) {
    if (event.data?.type === 'DINSIDE_GOOGLE_ACCOUNT_BRIDGE_HELLO') {
      event.source?.postMessage({ type: 'DINSIDE_GOOGLE_ACCOUNT_BRIDGE_ACK' }, event.origin);
      return;
    }
    if (event.data?.type === 'DINSIDE_GOOGLE_ACCOUNT_SWITCH') {
      if (event.data.providerId !== getActiveProvider()?.id) return;
      const slot = String(event.data.slot || '');
      if (/^\d$/.test(slot)) await setGoogleAccountSlot(slot);
      return;
    }
    if (event.data?.type === 'DINSIDE_GOOGLE_ACCOUNT_OPEN') {
      try {
        if (!await openGoogleAccountAction(event.data.url)) {
          setStatus(() => t('Could not open Google account page'), 'error');
        }
      } catch (error) {
        console.warn('[DinSide] Could not open Google account page', error);
        setStatus(() => t('Could not open Google account page'), 'error');
      }
      return;
    }
  }
  if (event.data?.type === 'DINSIDE_PROVIDER_AUTH_OPEN' &&
      event.source === frame?.contentWindow &&
      providerManager?.isTrustedMessage?.(event)) {
    try {
      if (!await openProviderAuth(event.data.url, event.data.providerHost)) {
        setStatus(() => t('Could not open provider sign-in'), 'error');
      }
    } catch (error) {
      console.warn('[DinSide] Could not open provider sign-in', error);
      setStatus(() => t('Could not open provider sign-in'), 'error');
    }
    return;
  }
  if (!providerManager?.isTrustedMessage?.(event)) return;

  if (event.data?.type === 'DINSIDE_PROVIDER_AUTH_COMPLETE' &&
      event.source === frame?.contentWindow &&
      ['deepseek', 'zai'].includes(event.data.providerId) &&
      getActiveProvider()?.id === event.data.providerId) {
    const providerId = event.data.providerId;
    if (providerId === 'zai' && ![...pendingProviderAuthTabs.values()].includes(providerId)) return;
    for (const [tabId, pendingProviderId] of pendingProviderAuthTabs) {
      if (pendingProviderId === providerId) pendingProviderAuthTabs.delete(tabId);
    }
    reloadProviderAfterAuth(providerId);
    return;
  }

  if (event.data?.type === 'DINSIDE_BRIDGE_READY') {
    state.bridgeReady = true;
    state.bridgeVersion = String(event.data.version || '');
    clearTimeout(state.bridgeCheckTimer);
    const expectedVersion = chrome.runtime.getManifest().version;
    console.info('[DinSide] embedded bridge ready', {
      version: state.bridgeVersion,
      expectedVersion
    });
    if (state.bridgeVersion !== expectedVersion && !state.bridgeReloadAttempted) {
      state.bridgeReloadAttempted = true;
      state.geminiUiReady = false;
      state.mimoUiReady = false;
      state.googleAiStudioUiReady = false;
      state.deepseekUiReady = false;
      $('frameLoading')?.classList.remove('hidden');
      state.bridgeReady = false;
      setStatus( () => t`Updating ${getProviderName()} bridge…`, 'busy');
      frame.src = state.activeChatUrl || frame.src || getActiveProvider()?.homeUrl || '';
      return;
    }

    if (isActiveProviderUiReady()) {
      $('frameLoading')?.classList.add('hidden');
    }
    // Only sync user data after the active provider bridge has proved it is alive.
    syncSkillsToEmbeddedProvider();
    requestProviderTheme();
    requestCurrentChatUrl();
    if (state.selectedTextContextEnabled) syncSelectedText();
    else clearAllSelectedTextInEmbeddedProvider();
    consumeQuickAskPending();
    scheduleContextInspectorRefresh(80);
    return;
  }

  if (event.data?.type === 'DINSIDE_PROVIDER_UI_READY' &&
      event.data.providerId === getActiveProvider()?.id &&
      ['gemini', 'deepseek', 'mimo', 'googleaistudio'].includes(event.data.providerId)) {
    if (event.data.providerId === 'gemini') state.geminiUiReady = true;
    if (event.data.providerId === 'deepseek') state.deepseekUiReady = true;
    if (event.data.providerId === 'mimo') state.mimoUiReady = true;
    if (event.data.providerId === 'googleaistudio') state.googleAiStudioUiReady = true;
    if (state.bridgeReady) $('frameLoading')?.classList.add('hidden');
    return;
  }

  if (event.data?.type === 'DINSIDE_GET_CONTEXT_FOR_PROMPT' && event.data.requestId) {
    // Acknowledge immediately so the embedded bridge can distinguish a broken
    // message path from a legitimate slow context read.
    postToEmbeddedProvider({
      type: 'DINSIDE_CONTEXT_FOR_PROMPT_PENDING',
      requestId: event.data.requestId,
      timeoutMs: 120000
    });
    try {
      const response = await createPromptContextResponse(
        event.data.requestId,
        event.data.contextMode || 'full',
        event.data.promptText || ''
      );
      postToEmbeddedProvider({
        type: 'DINSIDE_CONTEXT_FOR_PROMPT_RESULT',
        ...response
      });
    } catch (error) {
      postToEmbeddedProvider({
        type: 'DINSIDE_CONTEXT_FOR_PROMPT_RESULT',
        requestId: event.data.requestId,
        ok: false,
        envelope: '',
        error: error?.message || t('Context lookup failed.')
      });
    }
    return;
  }

  if (event.data?.type === 'DINSIDE_PROMPT_SENT') {
    clearNextPromptExclusions();
    scheduleContextInspectorRefresh(80);
    return;
  }

  if (event.data?.type === 'DINSIDE_QUICK_ASK_RESULT') {
    if (event.data.ok) {
      setStatus(() => event.data.label ? t`Quick Ask sent · ${event.data.label}` : t('Quick Ask sent'), 'ready');
    } else {
      setStatus(() => event.data.error || t('Quick Ask could not run'), 'error');
    }
    return;
  }

  if (event.data?.type === 'DINSIDE_CONTEXT_DELIVERED') {
    const committed = commitContextDelivery(event.data.deliveryToken || '');
    if (committed) setStatus(() => t('Context delivered'), 'ready');
    return;
  }

  if (event.data?.type === 'DINSIDE_CONTEXT_INJECT_FAILED') {
    discardContextDelivery(
      event.data.deliveryToken || '',
      event.data.requestId || ''
    );
    setStatus(() => event.data.error || t('Context injection failed · will retry'), 'error');
    return;
  }

  if (event.data?.type === 'DINSIDE_COMMIT_SELECTION') {
    // Keep commits only the currently highlighted passage. The next highlight is
    // transient again until the user explicitly keeps it too.
    state.appendNextSelection = false;
    state.appendBaselineSelection = '';
    state.appendPendingSelection = false;
    setStatus(() => t('Selection kept · select another passage'), 'ready');
    return;
  }
  if (['DINSIDE_PROVIDER_THEME', 'DINSIDE_CHATGPT_THEME'].includes(event.data?.type)) {
    state.chatgptTheme = event.data.theme === 'light' ? 'light' : 'dark';
    try { localStorage.setItem(providerThemeKey(getActiveProvider()?.id), state.chatgptTheme); } catch (_) {}
    if (state.themeMode === 'chatgpt') applyTheme();
    return;
  }
  if (event.data?.type === 'DINSIDE_CHAT_URL') {
    const url = String(event.data.url || '');
    const provider = getActiveProvider();
    const detectedAccountSlot = typeof provider?.getAccountSlot === 'function'
      ? provider.getAccountSlot(url)
      : null;
    if (detectedAccountSlot !== null && detectedAccountSlot !== configuredGoogleAccountSlot(provider)) {
      state.googleAccountSlots = { ...state.googleAccountSlots, [provider.id]: detectedAccountSlot };
      chrome.storage.local.set({ [GOOGLE_ACCOUNT_SLOTS_STORAGE_KEY]: state.googleAccountSlots }).catch(() => {});
    }

    // Context delivery is scoped to the active provider conversation. When the embedded
    // chat changes (new chat, another conversation, GPT, share page, etc.), the
    // same webpage must be eligible to attach again on the first prompt.
    if (
      url &&
      state.activeChatUrl &&
      chatChangeNeedsContextReset(state.activeChatUrl, url)
    ) {
      resetSentContextState();
      setStatus(() => t('Context will attach in this chat'), 'busy');
    }
    const skillScopeChanged = reconcileChatLifetimeSkills(url);
    if (url) state.activeChatUrl = url;
    if (skillScopeChanged) {
      await saveSkills();
      renderSkills();
      scheduleContextInspectorRefresh(50);
    }

    if (state.keepLastChat && provider?.isRestorableChatUrl?.(url)) {
      if (provider) {
        state.lastChatUrls = { ...state.lastChatUrls, [provider.id]: url };
        chrome.storage.local.set({ dinsideLastChatUrls: state.lastChatUrls }).catch(() => {});
      }
    }
    return;
  }
  if (event.data?.type === 'DINSIDE_SELECTIONS_CLEARED') {
    state.appendNextSelection = false;
    state.appendBaselineSelection = '';
    state.appendPendingSelection = false;
    state.lastForwardedSelection = '';
    state.lastForwardedSelectionFrame = '';
    state.lastKnownDocumentSelection = null;
    state.lastKnownDocumentSelectionTabId = null;
    setStatus(() => t('Selected text cleared'), 'idle');
    scheduleContextInspectorRefresh(50);
    return;
  }
  if (event.data?.type === 'DINSIDE_SKILL_DETACHED') {
    const skillId = String(event.data.skillId || '');
    const skill = state.skills.find((item) => String(item.id || '') === skillId);
    if (skill?.enabled) {
      skill.enabled = false;
      clearSkillChatScope(skill);
      await saveSkills();
      renderSkills();
      syncSkillsToEmbeddedProvider();
      scheduleContextInspectorRefresh(50);
    }
    return;
  }
  if (event.data?.type === 'DINSIDE_SKILL_EDIT_REQUEST') {
    const skillId = String(event.data.skillId || '');
    if (skillId && state.skills.some((item) => String(item.id || '') === skillId)) openSkillEditor(skillId);
    else openSkillsMenu();
    return;
  }
  if (event.data?.type === 'DINSIDE_SKILL_LIFETIME_CHANGED') {
    const skillId = String(event.data.skillId || '');
    const skill = state.skills.find((item) => String(item.id || '') === skillId);
    if (skill) {
      skill.lifetime = normalizeSkillLifetime(event.data.lifetime);
      if (skill.enabled && skill.lifetime === 'chat') bindSkillToCurrentChat(skill);
      else clearSkillChatScope(skill);
      await saveSkills();
      renderSkills();
      scheduleContextInspectorRefresh(50);
    }
    return;
  }
  if (event.data?.type === 'DINSIDE_SKILLS_DETACH_ALL') {
    let changed = false;
    for (const skill of state.skills) {
      if (!skill.enabled) continue;
      skill.enabled = false;
      clearSkillChatScope(skill);
      changed = true;
    }
    if (changed) await saveSkills();
    renderSkills();
    scheduleContextInspectorRefresh(50);
    return;
  }
  if (event.data?.type === 'DINSIDE_OPEN_SKILLS') {
    openSkillsMenu();
    return;
  }
  if (event.data?.type !== 'DINSIDE_SKILLS_CONSUMED') return;
  let changed = false;
  for (const skill of state.skills) {
    if (!skill.enabled || normalizeSkillLifetime(skill.lifetime) !== 'once') continue;
    skill.enabled = false;
    clearSkillChatScope(skill);
    changed = true;
  }
  if (changed) await saveSkills();
  renderSkills();
  scheduleContextInspectorRefresh(50);
});

function syncSkillsToEmbeddedProvider() {
  return postToEmbeddedProvider({
    type: 'DINSIDE_SKILLS_UPDATED',
    skills: state.skills.map((skill) => ({
      id: skill.id,
      name: skill.name || 'Untitled skill',
      enabled: Boolean(skill.enabled),
      lifetime: normalizeSkillLifetime(skill.lifetime)
    }))
  });
}

function renderSkills() {
  closeSkillLifetimeMenu();
  const list = $('skillsList');
  if (!list) return;
  list.replaceChildren();

  const attachedCount = state.skills.filter((skill) => skill.enabled).length;
  const count = $('skillsCount');
  if (count) {
    count.textContent = state.skills.length ? t`${attachedCount} attached · ${state.skills.length} total` : '';
    count.classList.toggle('hidden', state.skills.length === 0);
  }

  for (const skill of state.skills) {
    const row = document.createElement('div');
    row.className = 'skill-row';

    const toggle = document.createElement('input');
    toggle.className = 'skill-switch';
    toggle.type = 'checkbox';
    toggle.checked = Boolean(skill.enabled);
    toggle.title = skill.enabled ? t('Detach skill') : t`Attach · ${skillLifetimeLabel(skill.lifetime)}`;
    toggle.addEventListener('change', async () => {
      skill.enabled = toggle.checked;
      if (skill.enabled && normalizeSkillLifetime(skill.lifetime) === 'chat') bindSkillToCurrentChat(skill);
      else if (!skill.enabled) clearSkillChatScope(skill);
      await saveSkills();
      renderSkills();
      syncSkillsToEmbeddedProvider();
    });

    row.addEventListener('click', async (event) => {
      if (event.target === toggle || event.target.closest('.skill-edit-btn') || event.target.closest('.skill-lifetime-btn')) return;
      skill.enabled = !skill.enabled;
      if (skill.enabled && normalizeSkillLifetime(skill.lifetime) === 'chat') bindSkillToCurrentChat(skill);
      else if (!skill.enabled) clearSkillChatScope(skill);
      await saveSkills();
      renderSkills();
      syncSkillsToEmbeddedProvider();
    });

    const main = document.createElement('div');
    main.className = 'skill-main';
    const nameRow = document.createElement('div');
    nameRow.className = 'skill-name-row';
    const name = document.createElement('div');
    name.className = 'skill-name';
    name.textContent = skill.name || t('Untitled skill');
    const lifetime = document.createElement('button');
    lifetime.type = 'button';
    lifetime.className = 'skill-lifetime-btn';
    lifetime.textContent = skillLifetimeLabel(skill.lifetime);
    lifetime.setAttribute('aria-haspopup', 'menu');
    lifetime.setAttribute('aria-label', t`Use for ${t(SKILL_LIFETIME_MENU_LABELS[normalizeSkillLifetime(skill.lifetime)])}`);
    lifetime.dataset.tooltip = t`Use for: ${t(SKILL_LIFETIME_MENU_LABELS[normalizeSkillLifetime(skill.lifetime)])}`;
    lifetime.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openSkillLifetimeMenu(skill, lifetime);
    });
    nameRow.append(name, lifetime);
    const preview = document.createElement('div');
    preview.className = 'skill-preview';
    preview.textContent = (skill.prompt || '').replace(/\s+/g, ' ').trim() || t('No instructions');
    main.append(nameRow, preview);

    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'skill-edit-btn';
    edit.textContent = '···';
    edit.title = t('Edit skill');
    edit.addEventListener('click', () => openSkillEditor(skill.id));

    row.append(toggle, main, edit);
    list.appendChild(row);
  }

  syncSkillsToEmbeddedProvider();

  if (!state.skills.length) {
    const empty = document.createElement('div');
    empty.className = 'skills-empty';
    empty.textContent = t('No skills yet');
    list.appendChild(empty);
  }
}

function positionSkillsPopover(menu = $('skillsMenu')) {
  const trigger = $('skillsBtn');
  if (!menu || !trigger) return;

  const menuRect = menu.getBoundingClientRect();
  const triggerRect = trigger.getBoundingClientRect();
  const arrowSize = 12;
  const arrowLeft = triggerRect.left + triggerRect.width / 2 - menuRect.left - arrowSize / 2;
  const clamped = Math.max(12, Math.min(menuRect.width - arrowSize - 12, arrowLeft));
  menu.style.setProperty('--skills-arrow-left', `${clamped}px`);
}

function openSkillsMenu() {
  closeFloatingMenus('skillsMenu');
  renderSkills();
  const menu = $('skillsMenu');
  menu?.classList.remove('hidden');
  syncSkillsButtonState();
  requestAnimationFrame(() => positionSkillsPopover(menu));
}

function openSkillEditor(skillId = null) {
  closeFloatingMenus('skillEditor');
  const skill = skillId ? state.skills.find((item) => item.id === skillId) : null;
  state.editingSkillId = skill?.id || null;
  $('skillEditorTitle').textContent = skill ? t('Edit skill') : t('Add skill');
  $('skillNameInput').value = skill?.name || '';
  $('skillPromptInput').value = skill?.prompt || '';
  $('deleteSkillBtn').classList.toggle('hidden', !skill);
  const editor = $('skillEditor');
  editor?.classList.remove('hidden');
  syncSkillsButtonState();
  requestAnimationFrame(() => positionSkillsPopover(editor));
  setTimeout(() => $('skillNameInput')?.focus(), 0);
}

async function saveSkillFromEditor() {
  const name = $('skillNameInput').value.trim();
  const prompt = $('skillPromptInput').value.trim();
  if (!name || !prompt) {
    setStatus(() => t('Skill needs a name and instructions'), 'error');
    return;
  }

  const existing = state.editingSkillId
    ? state.skills.find((item) => item.id === state.editingSkillId)
    : null;

  if (existing) {
    existing.name = name;
    existing.prompt = prompt;
  } else {
    const skill = {
      id: `skill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      prompt,
      enabled: true,
      lifetime: 'chat'
    };
    bindSkillToCurrentChat(skill);
    state.skills.push(skill);
  }

  await saveSkills();
  state.editingSkillId = null;
  $('skillEditor')?.classList.add('hidden');
  openSkillsMenu();
  setStatus(() => t('Skill saved'), 'ready');
}

async function deleteEditingSkill() {
  if (!state.editingSkillId) return;
  state.skills = state.skills.filter((item) => item.id !== state.editingSkillId);
  await saveSkills();
  state.editingSkillId = null;
  $('skillEditor')?.classList.add('hidden');
  openSkillsMenu();
  setStatus(() => t('Skill deleted'), 'ready');
}

function renderOpenTabsMenu(tabs = []) {
  const menu = $('tabsMenu');
  const list = $('tabsList');
  if (!menu || !list) return;
  const active = tabs.find((tab) => tab.active);
  const pinPageButton = $('pinCurrentPageBtn');
  const pinViewportButton = $('pinCurrentViewportBtn');
  const activeUrl = active?.url || '';
  menu.dataset.activeUrl = !isRestrictedUrl(activeUrl) ? activeUrl : '';
  const activePageKey = makePinnedPageKey(activeUrl, 'page');
  if (pinPageButton) {
    const label = pinPageButton.querySelector('.pin-action-text');
    if (label) label.textContent = state.attachedPages.has(activePageKey) ? t('Page pinned ✓') : t('Pin this page');
    pinPageButton.disabled = !active?.id || isRestrictedUrl(activeUrl) || state.attachedPages.has(activePageKey);
  }
  if (pinViewportButton) {
    const label = pinViewportButton.querySelector('.pin-action-text');
    if (label) label.textContent = t('Pin viewport');
    pinViewportButton.disabled = !active?.id || isRestrictedUrl(activeUrl) || state.attachedPages.size >= PINNED_CONTEXT_LIMIT;
  }
  renderPinnedMenuList();

  const readableTabs = tabs.filter((item) => item.id && !isRestrictedUrl(item.url));
  const search = $('openTabsSearch');
  const searchWrap = $('openTabsSearchWrap');
  if (search) {
    searchWrap?.classList.toggle('hidden', readableTabs.length <= 8);
    if (readableTabs.length <= 8) search.value = '';
  }
  applyPinnedMenuCollapseState();

  const snapshotSignature = `${DinSideI18n.language}|${readableTabs.map((tab) =>
    [tab.id, tab.url || '', tab.title || '', tab.favIconUrl || '', tab.active ? 1 : 0].join('\u0001')
  ).join('\u0002')}`;
  if (list.dataset.snapshotSignature === snapshotSignature && list.dataset.loaded === 'true') {
    for (const checkbox of getOpenTabCheckboxes()) {
      if (checkbox.dataset.optimisticPending === 'true') continue;
      checkbox.checked = state.attachedPages.has(checkbox.dataset.pinnedKey || '');
    }
    updateOpenTabsSelectionUI();
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const tab of readableTabs) {
    const row = document.createElement('label');
    row.className = 'tab-option';
    row.classList.toggle('active', list.dataset.activeSelectionTabId === String(tab.id));
    row.dataset.searchText = `${tab.title || ''} ${tab.url || ''}`.toLocaleLowerCase();

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    const key = makePinnedPageKey(tab.url || '', 'page');
    checkbox.dataset.pinnedKey = key;
    checkbox.dataset.tabId = String(tab.id);
    checkbox.checked = state.attachedPages.has(key);

    const favicon = document.createElement('img');
    favicon.className = 'tab-option-favicon';
    favicon.alt = '';
    favicon.setAttribute('aria-hidden', 'true');
    favicon.src = tab.favIconUrl || `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(tab.url || '')}&size=32`;
    favicon.addEventListener('error', () => {
      favicon.src = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(tab.url || '')}&size=32`;
    }, { once: true });

    const title = document.createElement('span');
    title.className = 'tab-option-title';
    title.textContent = tab.title || tab.url || t('Untitled');
    title.addEventListener('mouseover', () => {
      if (title.scrollWidth > title.clientWidth) title.dataset.tooltip = title.textContent || '';
      else delete title.dataset.tooltip;
    });

    const copy = document.createElement('span');
    copy.className = 'tab-option-copy';
    copy.appendChild(title);
    if (tab.id === active?.id) {
      const current = document.createElement('span');
      current.className = 'tab-option-current';
      current.textContent = t('Current tab');
      copy.appendChild(current);
    }

    const check = document.createElement('span');
    check.className = 'tab-option-check';
    check.setAttribute('aria-hidden', 'true');
    check.innerHTML = '<svg viewBox="0 0 18 18"><circle cx="9" cy="9" r="7.25"/><path d="m5.7 9.1 2.15 2.2 4.45-4.6"/></svg>';

    checkbox.addEventListener('change', async () => {
      const intendedChecked = checkbox.checked;
      list.dataset.activeSelectionTabId = String(tab.id);
      for (const option of list.querySelectorAll('.tab-option')) {
        option.classList.toggle('active', option === row);
      }
      row.classList.remove('error');
      delete row.dataset.tooltip;
      checkbox.dataset.optimisticPending = 'true';
      updateOpenTabsSelectionUI();
      checkbox.disabled = true;
      try {
        if (!intendedChecked) {
          await removePinnedContext(key);
        } else {
          await pinTabContext(tab, 'page');
        }
        syncPinnedMenuState();
      } catch (error) {
        checkbox.checked = !intendedChecked;
        const message = error.message || t('Could not update pinned context');
        row.classList.add('error');
        row.dataset.tooltip = message;
        setTimeout(() => {
          row.classList.remove('error');
          delete row.dataset.tooltip;
        }, 4000);
        setStatus(() => message, 'error');
      } finally {
        delete checkbox.dataset.optimisticPending;
        checkbox.checked = state.attachedPages.has(key);
        checkbox.disabled = false;
        updateOpenTabsSelectionUI();
      }
    });

    row.append(favicon, copy, checkbox, check);
    fragment.appendChild(row);
  }

  list.replaceChildren(fragment);
  list.dataset.loaded = 'true';
  list.dataset.snapshotSignature = snapshotSignature;
  if (!readableTabs.length) list.textContent = t('No readable tabs in this window.');
  applyPinnedMenuCollapseState();
  updateOpenTabsSelectionUI();
}

function invalidateOpenTabsSnapshot() {
  state.openTabsSnapshotAt = 0;
  state.openTabsRevision += 1;
  scheduleOpenTabsRefresh();
}

function scheduleOpenTabsRefresh(delay = 80) {
  clearTimeout(state.openTabsRefreshTimer);
  state.openTabsRefreshTimer = null;
  // The active-tab snapshot also drives the Current page pin actions. Keep it
  // fresh whenever the context inspector is open, even if Open tabs is not the
  // selected pane.
  if ($('contextInspector')?.classList.contains('hidden')) return;
  state.openTabsRefreshTimer = setTimeout(() => {
    state.openTabsRefreshTimer = null;
    if ($('contextInspector')?.classList.contains('hidden')) return;
    refreshOpenTabsMenu({ force: true }).catch(() => {});
  }, Math.max(0, delay));
}

async function refreshOpenTabsMenu({ showLoading = false, force = false } = {}) {
  const list = $('tabsList');
  if (!list) return [];

  const cachedTabs = Array.isArray(state.openTabsSnapshot) ? state.openTabsSnapshot : null;
  if (cachedTabs) renderOpenTabsMenu(cachedTabs);

  const cacheIsFresh = cachedTabs && Date.now() - state.openTabsSnapshotAt < 2000;
  if (!force && cacheIsFresh) return cachedTabs;
  if (state.openTabsRefreshPromise) return state.openTabsRefreshPromise;

  if (showLoading && !cachedTabs && list.dataset.loaded !== 'true') {
    list.textContent = t('Loading tabs…');
  }

  const refreshRevision = state.openTabsRevision;
  state.openTabsRefreshPromise = chrome.tabs.query({ currentWindow: true })
    .then((tabs) => {
      state.openTabsSnapshot = tabs;
      state.openTabsSnapshotAt = refreshRevision === state.openTabsRevision ? Date.now() : 0;
      renderOpenTabsMenu(tabs);
      return tabs;
    })
    .finally(() => {
      state.openTabsRefreshPromise = null;
      if (refreshRevision !== state.openTabsRevision) scheduleOpenTabsRefresh(0);
    });
  return state.openTabsRefreshPromise;
}

async function openTabsMenu() {
  closeFloatingMenus('contextInspector');
  const inspector = $('contextInspector');
  const trigger = $('contextBtn');
  if (!inspector || !trigger || !$('tabsMenu')) return;

  const needsContextRender = inspector.classList.contains('hidden') || $('contextInspectorBody')?.dataset.contextReady !== 'true';
  inspector.classList.remove('hidden');
  trigger.setAttribute('aria-expanded', 'true');
  setContextAddExpanded(true);
  applyContextInspectorToggleUI();
  requestAnimationFrame(positionContextInspectorPopover);
  if (needsContextRender) renderContextInspector();
  await refreshOpenTabsMenu({ showLoading: true });
}

$('contextBtn')?.addEventListener('click', () => {
  const menu = $('contextInspector');
  if (!menu) return;
  if (menu.classList.contains('hidden')) openContextInspector();
  else closeContextInspector();
});
$('closeContextInspectorBtn')?.addEventListener('click', closeContextInspector);
$('contextAddToggleBtn')?.addEventListener('click', () => {
  const pane = $('tabsMenu');
  if (!pane || !pane.classList.contains('hidden')) return;
  openTabsMenu().catch((error) => setStatus(() => error.message || t('Could not list tabs'), 'error'));
});
$('contextPickerSummaryBtn')?.addEventListener('click', () => {
  setContextAddExpanded(false);
});
$('contextSourceTabs')?.addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  const openTabs = event.key === 'ArrowLeft';
  setContextAddExpanded(openTabs);
  const target = $(openTabs ? 'contextAddToggleBtn' : 'contextPickerSummaryBtn');
  target?.focus();
  if (openTabs) refreshOpenTabsMenu({ showLoading: true }).catch(() => {});
});
$('contextInspectorFollowOnBtn')?.addEventListener('click', async () => {
  if (!state.pageFollowEnabled) await setPageFollowEnabled(true);
  if (!$('contextInspector')?.classList.contains('hidden')) renderContextInspector();
});
$('contextInspectorFollowOffBtn')?.addEventListener('click', async () => {
  if (state.pageFollowEnabled) await setPageFollowEnabled(false);
  if (!$('contextInspector')?.classList.contains('hidden')) renderContextInspector();
});

async function clearSelectedOpenTabs() {
  const targets = getOpenTabCheckboxes().filter((checkbox) => checkbox.checked);
  if (!targets.length) {
    updateOpenTabsSelectionUI();
    return;
  }

  // Reflect the clear immediately, then reconcile if persistence fails.
  for (const checkbox of targets) {
    checkbox.checked = false;
    checkbox.dataset.optimisticPending = 'true';
  }
  updateOpenTabsSelectionUI();

  let failed = 0;
  const removed = new Map();
  try {
    let changed = false;
    for (const checkbox of targets) {
      const key = checkbox.dataset.pinnedKey || '';
      if (state.attachedPages.has(key)) removed.set(key, state.attachedPages.get(key));
      changed = state.attachedPages.delete(key) || changed;
      state.sentAttached.delete(key);
      delete checkbox.dataset.optimisticPending;
    }
    if (changed) {
      await savePinnedPages();
      renderContextChips();
      syncPinnedMenuState();
      scheduleContextInspectorRefresh(0);
    }
  } catch (error) {
    failed = targets.length;
    for (const [key, context] of removed) state.attachedPages.set(key, context);
    for (const checkbox of targets) {
      delete checkbox.dataset.optimisticPending;
      checkbox.checked = state.attachedPages.has(checkbox.dataset.pinnedKey || '');
    }
  } finally {
    syncPinnedMenuState();
    updateOpenTabsSelectionUI();
  }

  if (failed) {
    setStatus(() => DinSideI18n.language === 'vi'
      ? `Không thể xóa ${failed} tab`
      : `${failed} tab${failed === 1 ? '' : 's'} could not be removed`, 'error');
  }
}

$('clearSelectedTabsBtn')?.addEventListener('click', async () => {
  await clearSelectedOpenTabs();
});
$('pinnedSectionLabel')?.addEventListener('click', () => {
  setPinnedMenuSectionCollapsed('pinned', !state.pinnedMenuCollapsed.pinned);
});
$('openTabsSearch')?.addEventListener('input', applyOpenTabsFilter);
$('pinCurrentPageBtn')?.addEventListener('click', async () => {
  const button = $('pinCurrentPageBtn');
  if (button) button.disabled = true;
  try {
    await pinActiveContext('page');
  } catch (error) {
    setStatus(() => error.message || t('Could not pin this page'), 'error');
  } finally {
    syncPinnedMenuState();
  }
});
$('pinCurrentViewportBtn')?.addEventListener('click', async () => {
  const button = $('pinCurrentViewportBtn');
  if (button) button.disabled = true;
  try {
    await pinActiveContext('viewport');
  } catch (error) {
    setStatus(() => error.message || t('Could not pin viewport'), 'error');
  } finally {
    syncPinnedMenuState();
  }
});
$('clearPinnedBtn')?.addEventListener('click', async () => {
  await clearAllPinnedContexts();
  setStatus(() => t('Pinned context cleared'), 'ready');
});

$('skillsBtn')?.addEventListener('click', () => {
  const menu = $('skillsMenu');
  if (!menu) return;
  if (!menu.classList.contains('hidden')) {
    menu.classList.add('hidden');
    syncSkillsButtonState();
  }
  else openSkillsMenu();
});
$('closeSkillsBtn')?.addEventListener('click', () => {
  $('skillsMenu')?.classList.add('hidden');
  syncSkillsButtonState();
});
$('addSkillBtn')?.addEventListener('click', () => openSkillEditor());
$('closeSkillEditorBtn')?.addEventListener('click', () => {
  $('skillEditor')?.classList.add('hidden');
  syncSkillsButtonState();
});
$('cancelSkillBtn')?.addEventListener('click', () => {
  $('skillEditor')?.classList.add('hidden');
  syncSkillsButtonState();
});
$('saveSkillBtn')?.addEventListener('click', saveSkillFromEditor);
$('deleteSkillBtn')?.addEventListener('click', deleteEditingSkill);

document.addEventListener('pointerdown', (event) => {
  const inSkillLifetimeMenu = event.target.closest?.('.skill-lifetime-menu');
  const inSkillLifetimeButton = event.target.closest?.('.skill-lifetime-btn');
  if (!inSkillLifetimeMenu && !inSkillLifetimeButton) closeSkillLifetimeMenu();

  const targets = [
    ['providerMenu', 'providerBtn'],
    ['contextInspector', 'contextBtn'],
    ['captureMenu', 'captureBtn'],
    ['skillsMenu', 'skillsBtn'],
    ['skillEditor', null],
    ['settingsMenu', 'settingsBtn']
  ];

  for (const [menuId, buttonId] of targets) {
    const menu = $(menuId);
    const button = buttonId ? $(buttonId) : null;
    if (!menu || menu.classList.contains('hidden')) continue;
    if (menuId === 'skillsMenu' && inSkillLifetimeMenu) continue;
    if (menu.contains(event.target) || button?.contains(event.target)) continue;
    menu.classList.add('hidden');
    if (menuId === 'providerMenu') {
      $('providerBtn')?.setAttribute('aria-expanded', 'false');
    }
    if (menuId === 'contextInspector') $('contextBtn')?.setAttribute('aria-expanded', 'false');
    if (menuId === 'captureMenu') $('captureBtn')?.setAttribute('aria-expanded', 'false');
    if (menuId === 'settingsMenu') {
      setQuickAskCustomPanel(false);
      setDonatePanel(false);
    }
  }
  syncSkillsButtonState();
});

// Pointer events inside the embedded provider iframe do not bubble to the
// side-panel document, so clicking the chat area will not hit the handler above.
// When focus moves into the iframe, treat that as an outside click and dismiss.
window.addEventListener('blur', () => {
  requestAnimationFrame(() => {
    if (document.activeElement !== $('providerFrame')) return;
    closeFloatingMenus();
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (!$('donatePanel')?.classList.contains('hidden')) {
    event.preventDefault();
    event.stopPropagation();
    setDonatePanel(false);
    return;
  }
  if (!$('captureMenu')?.classList.contains('hidden')) {
    event.preventDefault();
    event.stopPropagation();
    closeCaptureMenu();
    $('captureBtn')?.focus();
    return;
  }
  if (!state.captureActive) return;
  event.preventDefault();
  event.stopPropagation();
  cancelCaptureRegion();
}, true);

$('clearContextBarBtn')?.addEventListener('click', async () => {
  const cleared = await clearAllPinnedContexts();
  if (cleared) setStatus(() => t('Pinned context cleared'), 'ready');
});
$('refreshContextBtn').addEventListener('click', () => readPage({ force: true, attach: false }));
$('captureBtn')?.addEventListener('click', toggleCaptureMenu);
$('captureRegionBtn')?.addEventListener('click', () => {
  closeCaptureMenu();
  captureScreen();
});
$('drawBtn')?.addEventListener('click', () => {
  closeCaptureMenu();
  drawOnPage();
});
$('providerBtn')?.addEventListener('click', () => {
  const menu = $('providerMenu');
  const button = $('providerBtn');
  if (!menu || !button) return;
  const opening = menu.classList.contains('hidden');
  if (opening) {
    closeFloatingMenus('providerMenu');
    updateProviderUI();
    menu.classList.remove('hidden');
  } else {
    menu.classList.add('hidden');
  }
  button.setAttribute('aria-expanded', String(opening));
});
document.querySelectorAll('.provider-option[data-provider-id]').forEach((option) => {
  option.addEventListener('click', () => {
    const providerId = option.dataset.providerId;
    $('providerMenu')?.classList.add('hidden');
    $('providerBtn')?.setAttribute('aria-expanded', 'false');
    switchProvider(providerId).catch((error) => {
      console.error('[DinSide] provider switch failed', error);
      setStatus(() => t('Could not switch AI provider'), 'error');
    });
  });
});
function setupDinSideTooltips() {
  const tooltip = $('dinsideTooltip');
  const tooltipText = $('dinsideTooltipText');
  if (!tooltip || !tooltipText) return;

  let activeTarget = null;
  let showTimer = 0;

  const hide = () => {
    clearTimeout(showTimer);
    activeTarget = null;
    tooltip.classList.remove('visible');
    tooltip.setAttribute('aria-hidden', 'true');
  };

  const place = (target) => {
    const text = target?.dataset?.tooltip?.trim();
    if (!text || !target.isConnected) return hide();

    tooltipText.textContent = text;
    tooltip.classList.remove('above', 'below', 'visible');
    tooltip.style.left = '0px';
    tooltip.style.top = '0px';
    tooltip.style.visibility = 'hidden';
    tooltip.style.opacity = '0';

    const targetRect = target.getBoundingClientRect();
    const tipRect = tooltip.getBoundingClientRect();
    const targetCenter = Math.round(targetRect.left + targetRect.width / 2);
    const toolbarTarget = Boolean(target.closest('.topbar'));
    const toolbarBottom = document.querySelector('.app')?.dataset.toolbarPosition === 'bottom';
    const above = toolbarTarget ? toolbarBottom : true;
    const gap = 9;
    const viewportPad = 6;

    let left = Math.round(targetCenter - tipRect.width / 2);
    left = Math.max(viewportPad, Math.min(left, Math.round(innerWidth - tipRect.width - viewportPad)));
    const top = above
      ? Math.round(targetRect.top - tipRect.height - gap)
      : Math.round(targetRect.bottom + gap);
    const arrowLeft = Math.round(Math.max(10, Math.min(targetCenter - left - 4, tipRect.width - 18)));

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${Math.max(4, top)}px`;
    tooltip.style.setProperty('--arrow-left', `${arrowLeft}px`);
    tooltip.classList.add(above ? 'above' : 'below');
    tooltip.style.visibility = '';
    tooltip.style.opacity = '';
    tooltip.classList.add('visible');
    tooltip.setAttribute('aria-hidden', 'false');
  };

  const schedule = (target) => {
    clearTimeout(showTimer);
    activeTarget = target;
    showTimer = setTimeout(() => {
      if (activeTarget === target) place(target);
    }, 180);
  };

  const tooltipTargetFromEvent = (event) => event.target?.closest?.('[data-tooltip]') || null;

  document.addEventListener('mouseover', (event) => {
    const target = tooltipTargetFromEvent(event);
    if (!target) return;
    if (event.relatedTarget && target.contains(event.relatedTarget)) return;
    schedule(target);
  });
  document.addEventListener('mouseout', (event) => {
    const target = tooltipTargetFromEvent(event);
    if (!target) return;
    if (event.relatedTarget && target.contains(event.relatedTarget)) return;
    hide();
  });
  document.addEventListener('focusin', (event) => {
    const target = tooltipTargetFromEvent(event);
    if (target) schedule(target);
  });
  document.addEventListener('focusout', hide);
  document.addEventListener('click', hide);

  window.addEventListener('resize', hide, { passive: true });
  document.addEventListener('scroll', hide, true);
}

setupDinSideTooltips();
$('reloadChatBtn')?.addEventListener('click', () => {
  $('providerMenu')?.classList.add('hidden');
  $('providerBtn')?.setAttribute('aria-expanded', 'false');
  reloadProvider();
});
$('settingsBtn')?.addEventListener('click', () => {
  const menu = $('settingsMenu');
  if (!menu) return;
  if (!menu.classList.contains('hidden')) {
    menu.classList.add('hidden');
    setQuickAskCustomPanel(false);
    setDonatePanel(false);
  }
  else openSettingsMenu();
});
$('closeSettingsBtn')?.addEventListener('click', () => {
  $('settingsMenu')?.classList.add('hidden');
  setQuickAskCustomPanel(false);
  setDonatePanel(false);
});
$('contactSupportBtn')?.addEventListener('click', openSupportEmail);
$('copySupportEmailBtn')?.addEventListener('click', copySupportEmail);
$('openDonateBtn')?.addEventListener('click', () => setDonatePanel(true));
$('donateBackBtn')?.addEventListener('click', () => setDonatePanel(false));
$('closeDonateBtn')?.addEventListener('click', () => {
  $('settingsMenu')?.classList.add('hidden');
  setDonatePanel(false);
  $('settingsBtn')?.focus();
});
$('donateInternationalTab')?.addEventListener('click', () => setDonationMethod('international', { manual: true }));
$('donateVietnamTab')?.addEventListener('click', () => setDonationMethod('vietnam', { manual: true }));
$('donateInternationalTab')?.addEventListener('keydown', handleDonationTabKeydown);
$('donateVietnamTab')?.addEventListener('keydown', handleDonationTabKeydown);
window.addEventListener('resize', () => {
  if (!$('donatePanel')?.classList.contains('hidden')) applyDonationPanelLayout();
}, { passive: true });
$('openBuyMeCoffeeBtn')?.addEventListener('click', openBuyMeACoffee);
$('copyDonateAccountBtn')?.addEventListener('click', copyDonationAccountNumber);
$('toolbarTopBtn')?.addEventListener('click', () => setToolbarPosition('top'));
$('toolbarBottomBtn')?.addEventListener('click', () => setToolbarPosition('bottom'));
$('themeLightBtn')?.addEventListener('click', () => setThemeMode('light'));
$('themeDarkBtn')?.addEventListener('click', () => setThemeMode('dark'));
$('themeChatGPTBtn')?.addEventListener('click', () => {
  setThemeMode('chatgpt');
  requestProviderTheme();
});
$('keepChatOnBtn')?.addEventListener('click', () => setKeepLastChat(true));
$('keepChatOffBtn')?.addEventListener('click', () => setKeepLastChat(false));
$('selectedTextOnBtn')?.addEventListener('click', () => setSelectedTextContextEnabled(true));
$('selectedTextOffBtn')?.addEventListener('click', () => setSelectedTextContextEnabled(false));
$('quickAskOnBtn')?.addEventListener('click', () => setQuickAskEnabled(true));
$('quickAskOffBtn')?.addEventListener('click', () => setQuickAskEnabled(false));
$('quickAskManageBtn')?.addEventListener('click', () => setQuickAskCustomPanel(true));
$('quickAskCustomBackBtn')?.addEventListener('click', () => setQuickAskCustomPanel(false));
$('closeQuickAskCustomBtn')?.addEventListener('click', () => {
  setQuickAskCustomPanel(false);
  $('settingsMenu')?.classList.add('hidden');
});
$('quickAskAddCustomBtn')?.addEventListener('click', () => {
  setQuickAskCustomEditor(!state.quickAskCustomEditorOpen);
});
$('quickAskCustomCancelBtn')?.addEventListener('click', () => setQuickAskCustomEditor(false));
$('quickAskCustomForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  saveQuickAskCustomAction();
});
$('quickAskIconTrigger')?.addEventListener('click', (event) => {
  event.stopPropagation();
  const picker = $('quickAskIconPicker');
  if (!picker) return;
  const open = picker.classList.toggle('hidden') === false;
  $('quickAskIconTrigger')?.setAttribute('aria-expanded', String(open));
});
document.addEventListener('pointerdown', (event) => {
  const picker = $('quickAskIconPicker');
  const trigger = $('quickAskIconTrigger');
  if (!picker || picker.classList.contains('hidden')) return;
  if (picker.contains(event.target) || trigger?.contains(event.target)) return;
  picker.classList.add('hidden');
  trigger?.setAttribute('aria-expanded', 'false');
});
$('quickAskIconPicker')?.addEventListener('click', (event) => {
  const button = event.target.closest?.('[data-quick-ask-icon]');
  if (!button) return;
  state.quickAskCustomIcon = button.dataset.quickAskIcon || 'sparkles';
  $('quickAskIconPicker')?.classList.add('hidden');
  $('quickAskIconTrigger')?.setAttribute('aria-expanded', 'false');
  renderQuickAskCustomActions();
});
$('quickAskCustomList')?.addEventListener('click', (event) => {
  const remove = event.target.closest?.('[data-remove-quick-action]');
  if (remove) return removeQuickAskCustomAction(remove.dataset.removeQuickAction || '');
  const edit = event.target.closest?.('[data-edit-quick-action]');
  if (!edit) return;
  const action = state.quickAskCustomActions.find((item) => item.id === edit.dataset.editQuickAction);
  if (action) setQuickAskCustomEditor(true, action);
});
let quickAskDraggedId = '';
let quickAskDragOrderChanged = false;
async function persistQuickAskCustomOrder() {
  if (!quickAskDragOrderChanged) return;
  quickAskDragOrderChanged = false;
  await chrome.storage.local.set({ [QUICK_ASK_CUSTOM_ACTIONS_STORAGE_KEY]: state.quickAskCustomActions });
}
$('quickAskCustomList')?.addEventListener('dragstart', (event) => {
  const handle = event.target.closest?.('[data-drag-quick-action]');
  const row = handle?.closest?.('[data-quick-action-id]');
  if (!handle || !row) {
    event.preventDefault();
    return;
  }
  quickAskDraggedId = row.dataset.quickActionId || '';
  quickAskDragOrderChanged = false;
  row.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', quickAskDraggedId);
});
$('quickAskCustomList')?.addEventListener('dragover', (event) => {
  const target = event.target.closest?.('[data-quick-action-id]');
  if (!target || !quickAskDraggedId || target.dataset.quickActionId === quickAskDraggedId) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  const draggedIndex = state.quickAskCustomActions.findIndex((item) => item.id === quickAskDraggedId);
  const targetIndex = state.quickAskCustomActions.findIndex((item) => item.id === target.dataset.quickActionId);
  if (draggedIndex < 0 || targetIndex < 0) return;
  const [dragged] = state.quickAskCustomActions.splice(draggedIndex, 1);
  state.quickAskCustomActions.splice(targetIndex, 0, dragged);
  quickAskDragOrderChanged = true;
  const list = $('quickAskCustomList');
  const draggedRow = list?.querySelector(`[data-quick-action-id="${CSS.escape(quickAskDraggedId)}"]`);
  if (!list || !draggedRow) return;
  if (draggedIndex < targetIndex) target.after(draggedRow);
  else target.before(draggedRow);
});
$('quickAskCustomList')?.addEventListener('drop', async (event) => {
  event.preventDefault();
  document.querySelectorAll('.quick-ask-custom-item.dragging').forEach((row) => row.classList.remove('dragging'));
  await persistQuickAskCustomOrder();
  quickAskDraggedId = '';
});
$('quickAskCustomList')?.addEventListener('dragend', async () => {
  document.querySelectorAll('.quick-ask-custom-item.dragging').forEach((row) => row.classList.remove('dragging'));
  await persistQuickAskCustomOrder();
  quickAskDraggedId = '';
});
$('contextOnDemandBtn')?.addEventListener('click', () => setContextMode('on-demand')); 
$('contextSmartBtn')?.addEventListener('click', () => setContextMode('smart'));
$('contextPreloadBtn')?.addEventListener('click', () => setContextMode('preload'));
$('contextDisplayVisibleBtn')?.addEventListener('click', () => setContextDisplayMode('visible'));
$('contextDisplayCompactBtn')?.addEventListener('click', () => setContextDisplayMode('compact'));
$('pageUpdateSmartBtn')?.addEventListener('click', () => setPageUpdateMode('smart'));
$('pageUpdateDiffBtn')?.addEventListener('click', () => setPageUpdateMode('diff'));
$('pageUpdateFullBtn')?.addEventListener('click', () => setPageUpdateMode('full'));
$('compressionOffBtn')?.addEventListener('click', () => setCompressionMode('off'));
$('compressionBalancedBtn')?.addEventListener('click', () => setCompressionMode('balanced'));
$('compressionAggressiveBtn')?.addEventListener('click', () => setCompressionMode('aggressive'));
$('changeToggleShortcutBtn')?.addEventListener('click', openShortcutSettings);
$('closeScreenshotBtn').addEventListener('click', () => $('screenshotWrap').classList.add('hidden'));
new MutationObserver(syncMimoLoadingActions).observe($('frameLoading'), {
  attributes: true,
  attributeFilter: ['class']
});
$('mimoShowPageBtn')?.addEventListener('click', () => {
  if (getActiveProvider()?.id !== 'mimo') return;
  $('frameLoading').classList.add('hidden');
});
$('mimoOpenTabBtn')?.addEventListener('click', () => {
  if (getActiveProvider()?.id !== 'mimo') return;
  chrome.tabs.create({ url: getActiveProvider().homeUrl, active: true }).catch((error) => {
    console.warn('[DinSide] could not open MiMo tab', error);
  });
});
$('providerFrame').addEventListener('load', () => {
  const frame = $('providerFrame');
  if (!frame.getAttribute('src')) return;
  // An iframe without an initial src can emit a load event for about:blank.
  // Keep the loading state until the selected provider actually navigates.
  try {
    if (frame.contentWindow?.location.href === 'about:blank') return;
  } catch (_) {
    // The provider is cross-origin once its navigation has committed.
  }
  state.bridgeReady = false;
  state.bridgeVersion = '';
  if (isActiveProviderUiReady()) {
    $('frameLoading').classList.add('hidden');
  }
  // Do not send skills/selection/context until DINSIDE_BRIDGE_READY proves the
  // loaded document is actually the active provider. Only a data-free handshake is sent.
  setTimeout(verifyEmbeddedBridge, 150);
});

function applyLanguageUI() {
  document.documentElement.lang = DinSideI18n.language;
  DinSideI18n.translateStatic(document);
  if (!state.donationMethodManuallyChosen) setDonationMethod(preferredDonationMethod());
  for (const language of ['vi', 'en']) {
    const button = $(language === 'vi' ? 'languageViBtn' : 'languageEnBtn');
    const active = DinSideI18n.language === language;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  updateProviderUI();
  applyPageFollowUI();
  renderContextChips();
  syncPinnedMenuState();
  renderSkills();
  renderQuickAskCustomActions();
  refreshShortcutSettings();
  $('skillEditorTitle').textContent = state.editingSkillId ? t('Edit skill') : t('Add skill');
  $('contextStatus').textContent = t(statusText());
  if (!$('contextInspector').classList.contains('hidden')) refreshInspectorLanguage?.();
  // A tooltip is positioned using its text width; dismiss until the next hover.
  $('dinsideTooltip').classList.remove('visible');
  $('dinsideTooltip').setAttribute('aria-hidden', 'true');
  if (!$('settingsMenu').classList.contains('hidden')) requestAnimationFrame(positionSettingsPopover);
}

for (const language of ['vi', 'en']) {
  $(language === 'vi' ? 'languageViBtn' : 'languageEnBtn').addEventListener('click', async () => {
    try { await DinSideI18n.setLanguage(language); }
    catch (_) { setStatus(() => t('Could not save language setting.'), 'error'); }
  });
}
DinSideI18n.onChange(applyLanguageUI);
applyLanguageUI();

setTimeout(() => {
  const provider = getActiveProvider();
  const loading = $('frameLoading');
  if (!provider || !loading || loading.classList.contains('hidden')) return;
  $('frameLoadingText').textContent = provider.id === 'gemini'
    ? t('Gemini is taking longer to load…')
    : t`${provider.name} is taking longer to load…`;
  // Do not reveal an empty/black iframe just because a slow provider missed
  // the nominal timeout. The real iframe load or bridge-ready signal hides it.
  verifyEmbeddedBridge();
}, 8000);
(async () => {
  console.info('[DinSide] sidepanel loaded', {
    version: chrome.runtime.getManifest().version,
    extensionId: chrome.runtime.id,
    source: location.href
  });
  const initialSwitchSequence = providerSwitchSequence;
  const [saved] = await Promise.all([
    chrome.storage.local.get(['dinsideToolbarPosition', 'dinsideThemeMode', 'dinsideKeepLastChat', 'dinsideLastChatUrl', 'dinsideLastChatUrls', 'dinsideProviderId', 'dinsideContextMode', 'dinsideContextDisplayMode', 'dinsideCompressionMode', 'dinsidePageUpdateMode', 'dinsideSelectedTextContextEnabled', 'dinsideQuickAskEnabled', QUICK_ASK_CUSTOM_ACTIONS_STORAGE_KEY, PINNED_CONTEXT_STORAGE_KEY, PINNED_MENU_UI_STORAGE_KEY, CONTEXT_INSPECTOR_PANE_STORAGE_KEY, GOOGLE_ACCOUNT_SLOTS_STORAGE_KEY]),
    ensurePageFollowSettingLoaded(),
    DinSideI18n.ready
  ]);
  state.toolbarPosition = saved.dinsideToolbarPosition === 'bottom' ? 'bottom' : 'top';
  state.themeMode = ['light', 'dark', 'chatgpt'].includes(saved.dinsideThemeMode) ? saved.dinsideThemeMode : 'chatgpt';
  state.keepLastChat = saved.dinsideKeepLastChat === true;
  state.selectedTextContextEnabled = saved.dinsideSelectedTextContextEnabled !== false;
  state.quickAskEnabled = saved.dinsideQuickAskEnabled !== false;
  state.quickAskCustomActions = normalizeQuickAskCustomActions(saved[QUICK_ASK_CUSTOM_ACTIONS_STORAGE_KEY]);
  state.contextMode = ['on-demand', 'smart', 'preload'].includes(saved.dinsideContextMode)
    ? saved.dinsideContextMode
    : 'smart';
  state.contextDisplayMode = CONTEXT_DISPLAY_MODES.includes(saved.dinsideContextDisplayMode)
    ? saved.dinsideContextDisplayMode
    : 'compact';
  state.compressionMode = COMPRESSION_MODES.includes(saved.dinsideCompressionMode)
    ? saved.dinsideCompressionMode
    : 'balanced';
  state.pageUpdateMode = PAGE_UPDATE_MODES.includes(saved.dinsidePageUpdateMode)
    ? saved.dinsidePageUpdateMode
    : 'smart';
  const savedGoogleAccountSlots = saved[GOOGLE_ACCOUNT_SLOTS_STORAGE_KEY];
  state.googleAccountSlots = {
    gemini: normalizeGoogleAccountSlot(savedGoogleAccountSlots?.gemini),
    googleaimode: normalizeGoogleAccountSlot(savedGoogleAccountSlots?.googleaimode),
    googleaistudio: normalizeGoogleAccountSlot(savedGoogleAccountSlots?.googleaistudio),
    notebooklm: normalizeGoogleAccountSlot(savedGoogleAccountSlots?.notebooklm)
  };
  const savedPinnedMenuUi = saved[PINNED_MENU_UI_STORAGE_KEY];
  state.contextInspectorPane = ['tabs', 'current'].includes(saved[CONTEXT_INSPECTOR_PANE_STORAGE_KEY])
    ? saved[CONTEXT_INSPECTOR_PANE_STORAGE_KEY]
    : '';
  state.pinnedMenuCollapsed = {
    pinned: savedPinnedMenuUi?.pinned === true,
    tabs: savedPinnedMenuUi?.tabs === true
  };
  const savedPinnedPages = saved[PINNED_CONTEXT_STORAGE_KEY];
  restorePinnedPages(savedPinnedPages);
  if (Array.isArray(savedPinnedPages) && savedPinnedPages.length > PINNED_CONTEXT_LIMIT) {
    savePinnedPages().catch(() => {});
  }
  applyPinnedMenuCollapseState();
  state.lastChatUrls = saved.dinsideLastChatUrls && typeof saved.dinsideLastChatUrls === 'object'
    ? { ...saved.dinsideLastChatUrls }
    : {};
  // Migrate the pre-0.5.0 ChatGPT-only history key once.
  if (saved.dinsideLastChatUrl && !state.lastChatUrls.chatgpt) {
    state.lastChatUrls.chatgpt = saved.dinsideLastChatUrl;
  }
  const providerChangedDuringStartup = providerSwitchSequence !== initialSwitchSequence;
  const savedProviderId = providerManager?.get?.(saved.dinsideProviderId)
    ? saved.dinsideProviderId
    : 'chatgpt';
  const requestedProvider = providerChangedDuringStartup
    ? getActiveProvider()?.id
    : savedProviderId;
  if (globalThis.DinSideStartupNavigation) {
    globalThis.DinSideStartupNavigation.pending = false;
  }
  providerManager?.setActive?.(requestedProvider);
  state.chatgptTheme = cachedProviderTheme(requestedProvider);
  const activeProvider = getActiveProvider();
  updateProviderUI();
  applyTheme();
  const savedProviderUrl = state.lastChatUrls?.[activeProvider?.id] || '';
  let initialUrl = state.activeChatUrl;
  if (!providerChangedDuringStartup) {
    initialUrl = state.keepLastChat &&
      activeProvider?.isRestorableChatUrl?.(savedProviderUrl) &&
      restorableUrlMatchesGoogleAccount(activeProvider, savedProviderUrl)
      ? savedProviderUrl
      : providerHomeUrl(activeProvider);
  }
  state.activeChatUrl = initialUrl;
  applyKeepLastChatUI();
  applySelectedTextContextUI();
  applyQuickAskUI();
  applyContextModeUI();
  applyContextDisplayModeUI();
  applyPageUpdateModeUI();
  applyCompressionModeUI();
  applyToolbarPosition();
  globalThis.DinSideThinkingOrb?.unmount($('startupLoadingOrb'));
  $('startupLoading')?.remove();
  if (initialUrl && !providerChangedDuringStartup) {
    const startupSwitchSequence = providerSwitchSequence;
    await prepareProviderFrame(activeProvider);
    if (startupSwitchSequence === providerSwitchSequence &&
        getActiveProvider()?.id === activeProvider.id) {
      const frame = $('providerFrame');
      const preparedUrl = state.activeChatUrl;
      if (frame.getAttribute('src') !== preparedUrl) {
        frame.src = preparedUrl;
      } else if (!state.bridgeReady) {
        // An early iframe load may have beaten the main script's load listener.
        verifyEmbeddedBridge();
      }
    }
  }
  await loadSkills();
  if (state.bridgeReady) {
    syncSkillsToEmbeddedProvider();
    requestCurrentChatUrl();
  }
  requestProviderTheme();
  applyPageFollowUI();
  renderContextChips();
  await syncActivePage();
  if (state.pageFollowEnabled) scheduleContextWarmup(PRELOAD_IDLE_DELAY_MS);
  if (state.selectedTextContextEnabled) syncSelectedText();
  else clearAllSelectedTextInEmbeddedProvider();
})();
