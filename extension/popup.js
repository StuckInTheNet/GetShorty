const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const app = document.getElementById('app');

let currentLength = 3;
let summaries = null;
let currentUrl = '';

const PROVIDERS = {
  anthropic: {
    name: 'Anthropic',
    placeholder: 'sk-ant-...',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    model: 'claude-haiku-4-5-20251001'
  },
  openai: {
    name: 'OpenAI',
    placeholder: 'sk-...',
    keyUrl: 'https://platform.openai.com/api-keys',
    model: 'gpt-4o-mini'
  }
};

const ACCENT_COLORS = [
  { name: 'green', value: '#22c55e' },
  { name: 'blue', value: '#3b82f6' },
  { name: 'purple', value: '#a855f7' },
  { name: 'orange', value: '#f97316' },
  { name: 'pink', value: '#ec4899' },
  { name: 'cyan', value: '#06b6d4' },
  { name: 'yellow', value: '#eab308' },
  { name: 'red', value: '#ef4444' }
];

const FONTS = [
  { name: 'mono', value: "'SF Mono', 'Cascadia Code', 'JetBrains Mono', monospace", label: 'mono' },
  { name: 'sans', value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif", label: 'sans' },
  { name: 'serif', value: "Georgia, 'Times New Roman', serif", label: 'serif' }
];

const SIZES = [
  { name: 'compact', base: 11, width: 340 },
  { name: 'default', base: 13, width: 380 },
  { name: 'large', base: 15, width: 420 }
];

const THEMES = {
  dark: { bg: '#0a0a0a', surface: '#1e1e1e', border: '#2a2a2a', text: '#ededed', muted: '#888', dim: '#555' },
  light: { bg: '#ffffff', surface: '#f3f4f6', border: '#e5e7eb', text: '#111827', muted: '#6b7280', dim: '#9ca3af' }
};

const LENGTH_MODES = [
  { key: 'one-liner', label: 'one-liner', sentences: 1 },
  { key: 'brief', label: 'brief', sentences: 3 },
  { key: 'detailed', label: 'detailed', sentences: 5 },
  { key: 'thorough', label: 'thorough', sentences: 8 }
];

// --- Storage ---

function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get([
      'shorty_api_key', 'shorty_provider',
      'shorty_accent', 'shorty_font', 'shorty_size', 'shorty_theme', 'shorty_length'
    ], (data) => {
      resolve({
        apiKey: data.shorty_api_key || '',
        provider: data.shorty_provider || 'anthropic',
        accent: data.shorty_accent || '#22c55e',
        font: data.shorty_font || 'mono',
        size: data.shorty_size || 'default',
        theme: data.shorty_theme || 'dark',
        length: data.shorty_length || 'brief'
      });
    });
  });
}

function saveSettings(updates) {
  const mapped = {};
  for (const [k, v] of Object.entries(updates)) {
    mapped[`shorty_${k}`] = v;
  }
  return new Promise((resolve) => {
    chrome.storage.local.set(mapped, resolve);
  });
}

// --- Theme application ---

async function applyTheme() {
  const settings = await getSettings();
  const root = document.documentElement;
  const t = THEMES[settings.theme] || THEMES.dark;
  const f = FONTS.find(f => f.name === settings.font) || FONTS[0];
  const s = SIZES.find(s => s.name === settings.size) || SIZES[1];

  root.style.setProperty('--bg', t.bg);
  root.style.setProperty('--bg-surface', t.surface);
  root.style.setProperty('--bg-border', t.border);
  root.style.setProperty('--text', t.text);
  root.style.setProperty('--text-muted', t.muted);
  root.style.setProperty('--text-dim', t.dim);
  root.style.setProperty('--accent', settings.accent);
  root.style.setProperty('--font', f.value);
  root.style.setProperty('--base-size', s.base + 'px');
  root.style.setProperty('--width', s.width + 'px');
}

function maskKey(key) {
  if (!key) return '';
  if (key.length <= 12) return '****';
  return key.slice(0, 7) + '...' + key.slice(-4);
}

// --- Settings panel HTML (shared between setup and ready) ---

function appearanceSettingsHtml(settings) {
  return `
    <div class="settings-section">
      <div class="settings-section-title">appearance</div>

      <div class="provider-row">
        <label>theme</label>
        <div class="theme-row" style="flex:1">
          <button class="theme-btn ${settings.theme === 'dark' ? 'active' : ''}" data-theme="dark">dark</button>
          <button class="theme-btn ${settings.theme === 'light' ? 'active' : ''}" data-theme="light">light</button>
        </div>
      </div>

      <div class="provider-row">
        <label>accent</label>
        <div class="color-swatches" style="flex:1">
          ${ACCENT_COLORS.map(c =>
            `<div class="swatch ${settings.accent === c.value ? 'active' : ''}" data-color="${c.value}" style="background:${c.value}"></div>`
          ).join('')}
        </div>
      </div>

      <div class="provider-row">
        <label>font</label>
        <div class="theme-row" style="flex:1">
          ${FONTS.map(f =>
            `<button class="theme-btn ${settings.font === f.name ? 'active' : ''}" data-font="${f.name}">${f.label}</button>`
          ).join('')}
        </div>
      </div>

      <div class="provider-row">
        <label>size</label>
        <div class="theme-row" style="flex:1">
          ${SIZES.map(s =>
            `<button class="theme-btn ${settings.size === s.name ? 'active' : ''}" data-size="${s.name}">${s.name}</button>`
          ).join('')}
        </div>
      </div>
    </div>
  `;
}

function bindAppearanceListeners() {
  $$('[data-theme]').forEach(btn => {
    btn.addEventListener('click', async () => {
      $$('[data-theme]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      await saveSettings({ theme: btn.dataset.theme });
      await applyTheme();
    });
  });

  $$('[data-color]').forEach(el => {
    el.addEventListener('click', async () => {
      $$('[data-color]').forEach(s => s.classList.remove('active'));
      el.classList.add('active');
      await saveSettings({ accent: el.dataset.color });
      await applyTheme();
    });
  });

  $$('[data-font]').forEach(btn => {
    btn.addEventListener('click', async () => {
      $$('[data-font]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      await saveSettings({ font: btn.dataset.font });
      await applyTheme();
    });
  });

  $$('[data-size]').forEach(btn => {
    btn.addEventListener('click', async () => {
      $$('[data-size]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      await saveSettings({ size: btn.dataset.size });
      await applyTheme();
    });
  });
}

// --- Length selector HTML ---

function lengthSelectorHtml(settings) {
  return `
    <div class="length-row">
      ${LENGTH_MODES.map(m =>
        `<button class="length-btn ${settings.length === m.key ? 'active' : ''}" data-length="${m.key}">${m.label}</button>`
      ).join('')}
    </div>
  `;
}

function bindLengthListeners(settings, data) {
  $$('[data-length]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const mode = LENGTH_MODES.find(m => m.key === btn.dataset.length);
      currentLength = mode.sentences;
      await saveSettings({ length: btn.dataset.length });
      // If we have results, re-render them; otherwise just update the buttons
      if (data.summaries) {
        render('result', data);
      } else {
        render('ready', data);
      }
    });
  });
}

// --- Render ---

async function render(state, data = {}) {
  const settings = await getSettings();
  const hasKey = settings.apiKey.length > 0;
  const info = PROVIDERS[settings.provider];

  // Sync currentLength from saved setting
  const mode = LENGTH_MODES.find(m => m.key === settings.length) || LENGTH_MODES[0];
  currentLength = mode.sentences;

  if (state === 'setup') {
    app.innerHTML = `
      <h1>shorty</h1>
      <p class="setup-intro">connect your AI provider to get started</p>
      <div class="provider-row">
        <label>provider</label>
        <select id="provider">
          <option value="anthropic" ${settings.provider === 'anthropic' ? 'selected' : ''}>Anthropic</option>
          <option value="openai" ${settings.provider === 'openai' ? 'selected' : ''}>OpenAI</option>
        </select>
      </div>
      <div class="settings-row">
        <input id="apikey" type="password" value="" placeholder="${info.placeholder}" autofocus>
      </div>
      <div class="key-help">get a key from <a href="${info.keyUrl}" target="_blank">${info.name}</a></div>
      <button class="go" id="save-key" style="margin-top: 14px">save & start</button>
      ${appearanceSettingsHtml(settings)}
    `;

    $('#provider').addEventListener('change', (e) => {
      const p = PROVIDERS[e.target.value];
      $('#apikey').placeholder = p.placeholder;
      $('.key-help a').href = p.keyUrl;
      $('.key-help a').textContent = p.name;
    });

    $('#save-key').addEventListener('click', async () => {
      const key = $('#apikey').value.trim();
      if (!key) return;
      const prov = $('#provider').value;
      await saveSettings({ api_key: key, provider: prov });
      render('ready', data);
    });

    bindAppearanceListeners();

  } else if (state === 'ready') {
    if (!hasKey) {
      render('setup', data);
      return;
    }

    app.innerHTML = `
      <h1>shorty</h1>
      <div class="url">${escapeHtml(data.url)}</div>
      ${lengthSelectorHtml(settings)}
      <button class="go" id="go">summarize this page</button>
      <div class="settings-toggle">
        <button id="toggle-settings">
          <svg class="gear-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          settings
        </button>
      </div>
      <div class="settings-panel" id="settings-panel" style="display:none">
        <div class="provider-row">
          <label>provider</label>
          <select id="provider">
            <option value="anthropic" ${settings.provider === 'anthropic' ? 'selected' : ''}>Anthropic</option>
            <option value="openai" ${settings.provider === 'openai' ? 'selected' : ''}>OpenAI</option>
          </select>
        </div>
        <div class="settings-row">
          <input id="apikey" type="password" value="${escapeHtml(settings.apiKey)}" placeholder="${info.placeholder}">
          <button id="save-key">save</button>
        </div>
        <div class="key-help">get a key from <a href="${info.keyUrl}" target="_blank">${info.name}</a></div>
        ${appearanceSettingsHtml(settings)}
      </div>
    `;

    $('#go').addEventListener('click', () => summarize(data.url));

    $('#toggle-settings').addEventListener('click', () => {
      const panel = $('#settings-panel');
      const btn = $('#toggle-settings');
      const isHidden = panel.style.display === 'none';
      panel.style.display = isHidden ? 'block' : 'none';
      btn.classList.toggle('open', isHidden);
    });

    $('#provider').addEventListener('change', (e) => {
      const p = PROVIDERS[e.target.value];
      $('#apikey').placeholder = p.placeholder;
      $('.key-help a').href = p.keyUrl;
      $('.key-help a').textContent = p.name;
    });

    $('#save-key').addEventListener('click', async () => {
      const key = $('#apikey').value.trim();
      if (!key) return;
      const prov = $('#provider').value;
      await saveSettings({ api_key: key, provider: prov });
      render('ready', data);
    });

    bindLengthListeners(settings, data);
    bindAppearanceListeners();

  } else if (state === 'loading') {
    app.innerHTML = `
      <h1>shorty</h1>
      <div class="url">${escapeHtml(data.url)}</div>
      <div class="loading">
        <div class="dot"></div>
        <span>working on it</span>
      </div>
    `;

  } else if (state === 'result') {
    const summary = data.summaries[currentLength] || data.summaries[1] || '';
    const bullets = parseBullets(summary);
    const wordCount = summary.split(/\s+/).length;

    app.innerHTML = `
      <h1>shorty</h1>
      <div class="url">${escapeHtml(data.url)}</div>
      ${lengthSelectorHtml(settings)}
      <hr class="divider">
      <div class="title">${escapeHtml(data.title)}</div>
      <div id="points">
        ${bullets.map((b, i) => `
          <div class="point">
            ${bullets.length > 1 ? `<span class="point-num">${String(i + 1).padStart(2, '0')}</span>` : ''}
            <span>${escapeHtml(b)}</span>
          </div>
        `).join('')}
      </div>
      <div class="footer">
        <span class="meta">${bullets.length} point${bullets.length !== 1 ? 's' : ''} &middot; ${wordCount} words</span>
        <button class="copy" id="copy">copy</button>
      </div>
    `;

    bindLengthListeners(settings, data);

    $('#copy').addEventListener('click', () => {
      const text = data.summaries[currentLength] || '';
      navigator.clipboard.writeText(text);
      $('#copy').textContent = 'copied';
      setTimeout(() => { if ($('#copy')) $('#copy').textContent = 'copy'; }, 1500);
    });

  } else if (state === 'error') {
    app.innerHTML = `
      <h1>shorty</h1>
      <div class="url">${escapeHtml(data.url)}</div>
      <div class="error">${escapeHtml(data.message)}</div>
      <div style="margin-top: 12px">
        <button class="go" id="retry">try again</button>
      </div>
    `;

    $('#retry').addEventListener('click', () => summarize(data.url));
  }
}

// --- Page content extraction ---

async function extractPageContent(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const clone = document.cloneNode(true);
        clone.querySelectorAll('script,style,nav,header,footer,aside,iframe,[role="navigation"],[role="banner"],[role="complementary"],form,button,.sidebar,.menu,.ad,.social,.share,.related,.comments,.cookie').forEach(el => el.remove());
        const main = clone.querySelector('article') || clone.querySelector('main') || clone.querySelector('[role="main"]') || clone.body;
        const text = (main?.innerText || '').replace(/\n{3,}/g, '\n\n');
        return {
          content: text.replace(/\s+/g, ' ').trim().slice(0, 3000),
          title: document.title
        };
      }
    });
    return results?.[0]?.result || null;
  } catch {
    return null;
  }
}

// --- API calls ---

const PROMPT = `Summarize the following article in exactly 8 sentences. Each sentence should be a complete, standalone point. Do NOT use markdown, headers, hashtags, bullet points, or numbering. Just write 8 plain sentences, each on its own line.`;

async function callAnthropic(apiKey, content, title) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: PROVIDERS.anthropic.model,
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `${PROMPT}\n\nTitle: ${title}\n\n${content.slice(0, 2000)}`
      }]
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('Invalid API key. Check your key in settings.');
    if (res.status === 429) throw new Error('Rate limited. Wait a moment and try again.');
    if (res.status === 529) throw new Error('API is overloaded. Try again in a moment.');
    throw new Error(err.error?.message || 'API request failed');
  }

  const data = await res.json();
  return data.content?.[0]?.text || '';
}

async function callOpenAI(apiKey, content, title) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: PROVIDERS.openai.model,
      max_tokens: 300,
      temperature: 0,
      messages: [{
        role: 'user',
        content: `${PROMPT}\n\nTitle: ${title}\n\n${content.slice(0, 2000)}`
      }]
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('Invalid API key. Check your key in settings.');
    if (res.status === 429) throw new Error('Rate limited. Wait a moment and try again.');
    throw new Error(err.error?.message || 'API request failed');
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// --- Summarize ---

async function summarize(url) {
  render('loading', { url });

  try {
    const { apiKey, provider } = await getSettings();
    if (!apiKey) {
      render('setup', { url });
      return;
    }

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId = tabs[0]?.id;
    const pageData = tabId ? await extractPageContent(tabId) : null;

    if (!pageData?.content || pageData.content.length < 50) {
      render('error', { url, message: 'Could not extract enough content from this page.' });
      return;
    }

    const content = pageData.content;
    const title = pageData.title || 'Article Summary';

    const rawText = provider === 'openai'
      ? await callOpenAI(apiKey, content, title)
      : await callAnthropic(apiKey, content, title);

    const cleaned = rawText
      .replace(/^#{1,6}\s+.*$/gm, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/^\s*[-*]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      .trim();

    const sentences = cleaned
      .split(/\n+/)
      .flatMap(line => line.match(/[^.!?]+[.!?]+/g) || [line])
      .map(s => s.trim())
      .filter(s => s.length > 10);

    const summaries = {};
    for (let i = 1; i <= 8; i++) {
      const s = sentences.slice(0, Math.min(i, sentences.length));
      summaries[i] = s.length > 0 ? s.join(' ') : 'Summary unavailable.';
    }

    render('result', { url, title, summaries });
  } catch (err) {
    render('error', { url, message: err.message || 'Something went wrong. Try again.' });
  }
}

// --- Utilities ---

function parseBullets(text) {
  if (!text) return [];
  return text.split(/(?<=\.)\s+/).filter(s => s.trim().length > 5);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- Init ---

applyTheme().then(() => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0]?.url || '';
    currentUrl = url;
    render('ready', { url });
  });
});
