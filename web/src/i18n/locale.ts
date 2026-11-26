export const LOCALES = ["en", "zh"] as const;

export type Locale = (typeof LOCALES)[number];

/** Product default is English; the toggle in the rail head switches to Chinese. */
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_STORAGE_KEY = "olympus-locale";

export const LOCALE_META: Record<Locale, { label: string; nativeLabel: string; htmlLang: string }> = {
  en: { label: "EN", nativeLabel: "English", htmlLang: "en" },
  zh: { label: "中", nativeLabel: "简体中文", htmlLang: "zh-CN" },
};

export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" && (LOCALES as readonly string[]).includes(value);

/**
 * Module-level mirror of the active locale.
 *
 * Pure label modules (`lib/labels.ts`, `lib/workflowStages.ts`, graph helpers) are
 * not React components, so they read the locale through `activeLocale()` /
 * `tr()` at call time. That is safe because every translation is materialised
 * during render, and `I18nProvider` forces a remount of the subtree on change.
 */
let currentLocale: Locale = DEFAULT_LOCALE;

export function activeLocale(): Locale {
  return currentLocale;
}

export function setActiveLocale(locale: Locale): void {
  currentLocale = locale;
}

export function nextLocale(locale: Locale): Locale {
  return locale === "en" ? "zh" : "en";
}

/** `?lang=zh` wins over storage so a locale is shareable via URL (and testable headless). */
export function localeFromUrl(): Locale | null {
  if (typeof window === "undefined") return null;
  try {
    const param = new URLSearchParams(window.location.search).get("lang");
    return isLocale(param) ? param : null;
  } catch {
    return null;
  }
}

export function readStoredLocale(): Locale {
  const fromUrl = localeFromUrl();
  if (fromUrl) return fromUrl;
  try {
    const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(saved) ? saved : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function storeLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* storage blocked (private mode / hardened browser) — locale stays in memory only */
  }
}

export function applyDocumentLocale(locale: Locale): void {
  if (typeof document === "undefined") return;
  const meta = LOCALE_META[locale];
  document.documentElement.lang = meta.htmlLang;
  document.documentElement.dataset.locale = locale;
}

export function resolveInitialLocale(): Locale {
  const locale = readStoredLocale();
  setActiveLocale(locale);
  applyDocumentLocale(locale);
  return locale;
}
