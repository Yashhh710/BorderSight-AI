/**
 * Global Theme & Appearance Manager
 * Handles Light/Dark mode, global font selection (body + mono/data),
 * and primary/secondary accent color customization — all with
 * localStorage persistence so preferences follow the user across
 * every page of the app.
 */

const ThemeManager = {
  STORAGE_KEY: 'bordersight-theme',
  FONT_SANS_KEY: 'bordersight-font-sans',
  FONT_MONO_KEY: 'bordersight-font-mono',
  ACCENT_PRIMARY_KEY: 'bordersight-accent-primary',
  ACCENT_SECONDARY_KEY: 'bordersight-accent-secondary',

  THEME_ATTRIBUTE: 'data-theme',
  DEFAULT_THEME: 'dark',
  LIGHT_THEME: 'light',
  DARK_THEME: 'dark',

  // Baseline colors originally hardcoded into charts/widgets, used so we
  // can find-and-replace them at runtime when the user picks a custom
  // accent color (best-effort — see refreshChartsAppearance).
  BASELINE_ACCENT_HEX: ['#FFB000', '#D97706'],

  FONT_OPTIONS: {
    sans: [
      { id: 'inter', label: 'Inter (Default)', stack: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", google: 'Inter:wght@400;500;600;700' },
      { id: 'system', label: 'System UI', stack: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", google: null },
      { id: 'roboto', label: 'Roboto', stack: "'Roboto', sans-serif", google: 'Roboto:wght@400;500;700' },
      { id: 'poppins', label: 'Poppins', stack: "'Poppins', sans-serif", google: 'Poppins:wght@400;500;600;700' },
      { id: 'manrope', label: 'Manrope', stack: "'Manrope', sans-serif", google: 'Manrope:wght@400;500;600;700' },
      { id: 'sora', label: 'Sora', stack: "'Sora', sans-serif", google: 'Sora:wght@400;500;600;700' },
      { id: 'space-grotesk', label: 'Space Grotesk', stack: "'Space Grotesk', sans-serif", google: 'Space+Grotesk:wght@400;500;600;700' },
      { id: 'outfit', label: 'Outfit', stack: "'Outfit', sans-serif", google: 'Outfit:wght@400;500;600;700' },
      { id: 'ibm-plex-sans', label: 'IBM Plex Sans', stack: "'IBM Plex Sans', sans-serif", google: 'IBM+Plex+Sans:wght@400;500;600;700' },
    ],
    mono: [
      { id: 'jetbrains', label: 'JetBrains Mono (Default)', stack: "'JetBrains Mono', 'SFMono-Regular', Consolas, 'Courier New', monospace", google: 'JetBrains+Mono:wght@400;500;700' },
      { id: 'fira-code', label: 'Fira Code', stack: "'Fira Code', monospace", google: 'Fira+Code:wght@400;500;600' },
      { id: 'roboto-mono', label: 'Roboto Mono', stack: "'Roboto Mono', monospace", google: 'Roboto+Mono:wght@400;500;700' },
      { id: 'ibm-plex-mono', label: 'IBM Plex Mono', stack: "'IBM Plex Mono', monospace", google: 'IBM+Plex+Mono:wght@400;500;600' },
      { id: 'space-mono', label: 'Space Mono', stack: "'Space Mono', monospace", google: 'Space+Mono:wght@400;700' },
      { id: 'source-code-pro', label: 'Source Code Pro', stack: "'Source Code Pro', monospace", google: 'Source+Code+Pro:wght@400;500;600;700' },
      { id: 'system-mono', label: 'System Mono', stack: "ui-monospace, SFMono-Regular, Consolas, 'Courier New', monospace", google: null },
    ],
  },

  ACCENT_PRESETS: [
    { hex: '#FFB000', label: 'Amber' },
    { hex: '#3B82F6', label: 'Blue' },
    { hex: '#22C55E', label: 'Green' },
    { hex: '#FF3B30', label: 'Red' },
    { hex: '#A855F7', label: 'Purple' },
    { hex: '#06B6D4', label: 'Cyan' },
    { hex: '#EC4899', label: 'Pink' },
    { hex: '#84CC16', label: 'Lime' },
  ],

  _loadedGoogleFonts: new Set(),

  /**
   * Initialize theme + appearance on page load
   */
  init() {
    // ---- Theme (dark/light) ----
    const savedTheme = this.getSavedTheme();
    const themeToUse = savedTheme || this.DEFAULT_THEME;
    this.setTheme(themeToUse, false);

    // ---- Fonts ----
    this.applyFont('sans', this._safeGet(this.FONT_SANS_KEY), false);
    this.applyFont('mono', this._safeGet(this.FONT_MONO_KEY), false);

    // ---- Accents ----
    this.applyAccent('primary', this._safeGet(this.ACCENT_PRIMARY_KEY), false);
    this.applyAccent('secondary', this._safeGet(this.ACCENT_SECONDARY_KEY), false);

    // ---- Toggle buttons + panel ----
    this.setupToggleListeners();
    // The floating 🎨 appearance panel (font/accent customization) is only
    // relevant on the Settings page — every other page just gets the plain
    // dark/light toggle button already in its header.
    if (this.isSettingsPage()) {
      this.buildAppearancePanel();
    }

    // Give any inline chart-creation scripts (which run before this file
    // loads) a moment to finish constructing, then sync their fonts/colors
    // to whatever was restored from localStorage.
    setTimeout(() => this.refreshChartsAppearance(), 50);
  },

  isSettingsPage() {
    const path = (window.location.pathname.split('/').pop() || '').toLowerCase();
    return path === 'settings.html';
  },

  _safeGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },

  _safeSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('Failed to persist to localStorage:', e);
    }
  },

  _safeRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) { /* noop */ }
  },

  /* ============================================================
     THEME (dark / light)
     ============================================================ */

  getSavedTheme() {
    return this._safeGet(this.STORAGE_KEY);
  },

  getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return this.DARK_THEME;
    }
    return this.LIGHT_THEME;
  },

  setTheme(theme, animate = true) {
    if (![this.LIGHT_THEME, this.DARK_THEME].includes(theme)) {
      console.warn(`Invalid theme: ${theme}. Using default.`);
      theme = this.DEFAULT_THEME;
    }

    if (animate) {
      document.documentElement.classList.add('theme-transitioning');
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, 300);
    }

    document.documentElement.setAttribute(this.THEME_ATTRIBUTE, theme);
    this._safeSet(this.STORAGE_KEY, theme);

    this.updateToggleButtons(theme);
    this.updateRangeSliderStyles();
    this.updateAppearancePanelState();

    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
    this.refreshLeafletMaps();
  },

  refreshLeafletMaps() {
    try {
      if (window.map && window.map.invalidateSize) {
        setTimeout(() => {
          window.map.invalidateSize();
        }, 310);
      }
    } catch (e) { /* noop */ }
  },

  getCurrentTheme() {
    return document.documentElement.getAttribute(this.THEME_ATTRIBUTE) || this.DEFAULT_THEME;
  },

  toggleTheme() {
    const current = this.getCurrentTheme();
    const next = current === this.LIGHT_THEME ? this.DARK_THEME : this.LIGHT_THEME;
    this.setTheme(next, true);
  },

  /* ============================================================
     COLOR UTILITIES
     ============================================================ */

  _hexToRgb(hex) {
    hex = (hex || '').replace('#', '');
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const num = parseInt(hex, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  },

  _rgbToHex(r, g, b) {
    const clamp = (x) => Math.max(0, Math.min(255, Math.round(x)));
    return '#' + [r, g, b].map((x) => clamp(x).toString(16).padStart(2, '0')).join('');
  },

  _mix(hex, targetHex, amount) {
    const a = this._hexToRgb(hex);
    const b = this._hexToRgb(targetHex);
    return this._rgbToHex(
      a.r + (b.r - a.r) * amount,
      a.g + (b.g - a.g) * amount,
      a.b + (b.b - a.b) * amount
    );
  },

  _lighten(hex, amount) { return this._mix(hex, '#ffffff', amount); },

  _hexToRgba(hex, alpha) {
    const { r, g, b } = this._hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },

  _isValidHex(hex) {
    return typeof hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(hex);
  },

  /* ============================================================
     ACCENT COLORS (primary / secondary)
     ============================================================ */

  /**
   * Apply an accent color. If hex is null/invalid, any inline override is
   * removed so the theme's built-in default (from theme.css) takes over.
   */
  applyAccent(role, hex, persist = true) {
    const isPrimary = role === 'primary';
    const varBase = isPrimary ? '--accent' : '--accent-secondary';
    const key = isPrimary ? this.ACCENT_PRIMARY_KEY : this.ACCENT_SECONDARY_KEY;
    const root = document.documentElement.style;

    const oldHex = this.getEffectiveAccent(role);

    if (this._isValidHex(hex)) {
      root.setProperty(varBase, hex);
      root.setProperty(`${varBase}-hover`, this._lighten(hex, 0.18));
      root.setProperty(`${varBase}-glow`, this._hexToRgba(hex, 0.12));
      root.setProperty(`${varBase}-glow-soft`, this._hexToRgba(hex, 0.06));
      if (persist) this._safeSet(key, hex);
    } else {
      root.removeProperty(varBase);
      root.removeProperty(`${varBase}-hover`);
      root.removeProperty(`${varBase}-glow`);
      root.removeProperty(`${varBase}-glow-soft`);
      if (persist) this._safeRemove(key);
    }

    this.updateRangeSliderStyles();
    this.updateAppearancePanelState();

    if (persist) {
      const newHex = this.getEffectiveAccent(role);
      this.refreshChartsAppearance({ colorFrom: oldHex, colorTo: newHex });
      window.dispatchEvent(new CustomEvent('accentchange', { detail: { role, hex: newHex } }));
    }
  },

  /**
   * Resolve the accent color actually in effect right now (custom
   * override if set, otherwise whatever theme.css defines for the
   * current theme).
   */
  getEffectiveAccent(role) {
    const varName = role === 'primary' ? '--accent' : '--accent-secondary';
    const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return val || (role === 'primary' ? '#FFB000' : '#3B82F6');
  },

  /* ============================================================
     FONTS (body / mono)
     ============================================================ */

  loadGoogleFont(googleParam) {
    if (!googleParam || this._loadedGoogleFonts.has(googleParam)) return;
    this._loadedGoogleFonts.add(googleParam);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${googleParam}&display=swap`;
    document.head.appendChild(link);
  },

  applyFont(role, fontId, persist = true) {
    const isSans = role === 'sans';
    const varName = isSans ? '--font-family' : '--font-family-mono';
    const key = isSans ? this.FONT_SANS_KEY : this.FONT_MONO_KEY;
    const options = this.FONT_OPTIONS[role];
    const root = document.documentElement.style;

    const option = options.find((f) => f.id === fontId);

    if (option) {
      if (option.google) this.loadGoogleFont(option.google);
      root.setProperty(varName, option.stack);
      if (persist) this._safeSet(key, fontId);
    } else {
      root.removeProperty(varName);
      if (persist) this._safeRemove(key);
    }

    this.updateAppearancePanelState();

    if (persist) {
      const oldStack = null; // charts store the plain literal name, not the full stack
      this.refreshChartsAppearance({
        fontRole: role,
        fontStack: option ? option.stack : (isSans
          ? "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
          : "'JetBrains Mono', 'SFMono-Regular', Consolas, 'Courier New', monospace"),
      });
      window.dispatchEvent(new CustomEvent('fontchange', { detail: { role, fontId } }));
    }
  },

  /* ============================================================
     RESET TO DEFAULTS
     ============================================================ */

  resetAppearance() {
    this.applyFont('sans', null, true);
    this.applyFont('mono', null, true);
    this.applyAccent('primary', null, true);
    this.applyAccent('secondary', null, true);
  },

  /* ============================================================
     CHART.JS BEST-EFFORT SYNC
     Charts on several pages hardcode 'JetBrains Mono' / '#FFB000'
     directly in their config instead of reading CSS variables. This
     walks any live Chart.js instances and swaps matching values so
     custom fonts/colors are reflected without editing every chart.
     ============================================================ */

  refreshChartsAppearance({ fontRole, fontStack, colorFrom, colorTo } = {}) {
    try {
      if (typeof Chart === 'undefined' || !Chart.instances) return;

      const fontReplacements = [];
      if (fontRole === 'mono' && fontStack) {
        fontReplacements.push(['JetBrains Mono', fontStack]);
      }
      if (fontRole === 'sans' && fontStack) {
        fontReplacements.push(['Inter', fontStack]);
      }

      const colorReplacements = [];
      if (colorTo) {
        this.BASELINE_ACCENT_HEX.forEach((h) => colorReplacements.push([h, colorTo]));
        if (colorFrom && this._isValidHex(colorFrom)) colorReplacements.push([colorFrom, colorTo]);
      }

      const replacements = [...fontReplacements, ...colorReplacements];
      if (!replacements.length) return;

      Object.values(Chart.instances).forEach((chart) => {
        try {
          this._deepReplace(chart.config && chart.config.options, replacements, new Set());
          this._deepReplace(chart.config && chart.config.data, replacements, new Set());
          chart.update('none');
        } catch (e) { /* skip this chart */ }
      });
    } catch (e) { /* Chart.js not present or incompatible — safe to ignore */ }
  },

  _deepReplace(obj, replacements, seen) {
    if (!obj || typeof obj !== 'object' || seen.has(obj)) return;
    seen.add(obj);
    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      const val = obj[key];
      if (typeof val === 'string') {
        for (const [from, to] of replacements) {
          if (val.toLowerCase() === from.toLowerCase()) {
            obj[key] = to;
          }
        }
      } else if (val && typeof val === 'object' && !(val instanceof Node) && typeof val !== 'function') {
        this._deepReplace(val, replacements, seen);
      }
    }
  },

  /* ============================================================
     TOGGLE BUTTONS (existing data-theme-toggle buttons)
     ============================================================ */

  setupToggleListeners() {
    const toggles = document.querySelectorAll('[data-theme-toggle]');

    toggles.forEach((toggle) => {
      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleTheme();
      });
    });

    document.querySelectorAll('input[type="range"]').forEach((slider) => {
      if (slider.dataset.themeSliderBound === 'true') return;
      slider.dataset.themeSliderBound = 'true';
      slider.addEventListener('input', () => this.updateRangeSliderStyles());
    });

    this.updateRangeSliderStyles();

    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!this.getSavedTheme()) {
          const newTheme = e.matches ? this.DARK_THEME : this.LIGHT_THEME;
          this.setTheme(newTheme, true);
        }
      });
    }
  },

  updateToggleButtons(theme) {
    const toggles = document.querySelectorAll('[data-theme-toggle]');

    toggles.forEach((toggle) => {
      if (theme === this.LIGHT_THEME) {
        toggle.setAttribute('data-theme-mode', 'light');
        toggle.title = 'Switch to Dark Mode';
        toggle.innerHTML = '☀️ Light';
      } else {
        toggle.setAttribute('data-theme-mode', 'dark');
        toggle.title = 'Switch to Light Mode';
        toggle.innerHTML = '🌙 Dark';
      }
    });
  },

  updateRangeSliderStyles() {
    document.querySelectorAll('input[type="range"]').forEach((slider) => {
      const min = Number(slider.min) || 0;
      const max = Number(slider.max) || 100;
      const value = Number(slider.value) || 0;
      const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;
      slider.style.setProperty('--value', `${percent}%`);
    });
  },

  /* ============================================================
     APPEARANCE PANEL (floating "🎨" trigger + slide-in panel)
     Injected once per page — works globally without any page-by-page
     HTML changes.
     ============================================================ */

  buildAppearancePanel() {
    if (document.getElementById('appearance-panel')) return; // already built

    const trigger = document.createElement('button');
    trigger.className = 'appearance-trigger';
    trigger.type = 'button';
    trigger.title = 'Customize appearance';
    trigger.setAttribute('aria-label', 'Open appearance settings');
    trigger.textContent = '🎨';

    const overlay = document.createElement('div');
    overlay.className = 'appearance-overlay';
    overlay.setAttribute('data-appearance-overlay', '');

    const panel = document.createElement('div');
    panel.id = 'appearance-panel';
    panel.className = 'appearance-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Appearance settings');

    const sansOptionsHtml = this.FONT_OPTIONS.sans
      .map((f) => `<option value="${f.id}">${f.label}</option>`)
      .join('');
    const monoOptionsHtml = this.FONT_OPTIONS.mono
      .map((f) => `<option value="${f.id}">${f.label}</option>`)
      .join('');
    const primarySwatchesHtml = this.ACCENT_PRESETS
      .map((p) => `<button type="button" class="appearance-swatch" data-accent-preset="primary" data-hex="${p.hex}" style="background:${p.hex}; color:${p.hex};" title="${p.label}" aria-label="${p.label}"></button>`)
      .join('');
    const secondarySwatchesHtml = this.ACCENT_PRESETS
      .map((p) => `<button type="button" class="appearance-swatch" data-accent-preset="secondary" data-hex="${p.hex}" style="background:${p.hex}; color:${p.hex};" title="${p.label}" aria-label="${p.label}"></button>`)
      .join('');

    panel.innerHTML = `
      <div class="appearance-panel-header">
        <h3>Appearance</h3>
        <button type="button" class="appearance-close" data-appearance-close aria-label="Close">&times;</button>
      </div>
      <div class="appearance-panel-body">
        <section>
          <span class="appearance-section-label">Theme</span>
          <div class="appearance-segment" data-appearance-theme-segment>
            <button type="button" data-theme-option="dark">🌙 Dark</button>
            <button type="button" data-theme-option="light">☀️ Light</button>
          </div>
        </section>
        <section>
          <span class="appearance-section-label">Primary Accent Color</span>
          <div class="appearance-color-row">
            <input type="color" data-accent-input="primary" aria-label="Primary accent color" />
            <div class="appearance-swatches">${primarySwatchesHtml}</div>
          </div>
        </section>
        <section>
          <span class="appearance-section-label">Secondary Accent Color</span>
          <div class="appearance-color-row">
            <input type="color" data-accent-input="secondary" aria-label="Secondary accent color" />
            <div class="appearance-swatches">${secondarySwatchesHtml}</div>
          </div>
        </section>
        <section>
          <span class="appearance-section-label">Body Font</span>
          <select class="appearance-select" data-font-select="sans" aria-label="Body font">${sansOptionsHtml}</select>
        </section>
        <section>
          <span class="appearance-section-label">Data / Mono Font</span>
          <select class="appearance-select" data-font-select="mono" aria-label="Mono font">${monoOptionsHtml}</select>
        </section>
      </div>
      <div class="appearance-panel-footer">
        <button type="button" class="appearance-reset" data-appearance-reset>Reset to Defaults</button>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(panel);
    document.body.appendChild(trigger);

    const openPanel = () => {
      overlay.classList.add('is-open');
      panel.classList.add('is-open');
      this.updateAppearancePanelState();
    };
    const closePanel = () => {
      overlay.classList.remove('is-open');
      panel.classList.remove('is-open');
    };

    trigger.addEventListener('click', openPanel);
    overlay.addEventListener('click', closePanel);
    panel.querySelector('[data-appearance-close]').addEventListener('click', closePanel);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closePanel();
    });

    panel.querySelectorAll('[data-theme-option]').forEach((btn) => {
      btn.addEventListener('click', () => this.setTheme(btn.getAttribute('data-theme-option'), true));
    });

    panel.querySelectorAll('[data-accent-input]').forEach((input) => {
      input.addEventListener('input', () => this.applyAccent(input.getAttribute('data-accent-input'), input.value, true));
    });

    panel.querySelectorAll('[data-accent-preset]').forEach((btn) => {
      btn.addEventListener('click', () => this.applyAccent(btn.getAttribute('data-accent-preset'), btn.getAttribute('data-hex'), true));
    });

    panel.querySelectorAll('[data-font-select]').forEach((select) => {
      select.addEventListener('change', () => this.applyFont(select.getAttribute('data-font-select'), select.value, true));
    });

    panel.querySelector('[data-appearance-reset]').addEventListener('click', () => this.resetAppearance());

    this.updateAppearancePanelState();
  },

  updateAppearancePanelState() {
    const panel = document.getElementById('appearance-panel');
    if (!panel) return;

    const currentTheme = this.getCurrentTheme();
    panel.querySelectorAll('[data-theme-option]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.getAttribute('data-theme-option') === currentTheme);
    });

    ['primary', 'secondary'].forEach((role) => {
      const input = panel.querySelector(`[data-accent-input="${role}"]`);
      const effective = this.getEffectiveAccent(role);
      if (input && document.activeElement !== input) input.value = effective;
      panel.querySelectorAll(`[data-accent-preset="${role}"]`).forEach((btn) => {
        btn.classList.toggle('is-active', btn.getAttribute('data-hex').toLowerCase() === effective.toLowerCase());
      });
    });

    const sansSaved = this._safeGet(this.FONT_SANS_KEY) || 'inter';
    const monoSaved = this._safeGet(this.FONT_MONO_KEY) || 'jetbrains';
    const sansSelect = panel.querySelector('[data-font-select="sans"]');
    const monoSelect = panel.querySelector('[data-font-select="mono"]');
    if (sansSelect) sansSelect.value = sansSaved;
    if (monoSelect) monoSelect.value = monoSaved;
  },
};

// Initialize theme when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
  });
} else {
  ThemeManager.init();
}
