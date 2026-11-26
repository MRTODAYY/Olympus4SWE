import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import {
  LOCALE_META,
  DEFAULT_LOCALE,
  applyDocumentLocale,
  nextLocale,
  readStoredLocale,
  setActiveLocale,
  storeLocale,
  type Locale,
} from "./locale";
import { translate, type Vars } from "./translate";

export interface I18nValue {
  locale: Locale;
  isEnglish: boolean;
  localeLabel: string;
  htmlLang: string;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: string, vars?: Vars) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const initial = typeof window === "undefined" ? DEFAULT_LOCALE : readStoredLocale();
    setActiveLocale(initial);
    applyDocumentLocale(initial);
    return initial;
  });

  const setLocale = useCallback((next: Locale) => {
    setActiveLocale(next);
    applyDocumentLocale(next);
    storeLocale(next);
    setLocaleState(next);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocaleState((current) => {
      const next = nextLocale(current);
      setActiveLocale(next);
      applyDocumentLocale(next);
      storeLocale(next);
      return next;
    });
  }, []);

  const value = useMemo<I18nValue>(() => {
    const meta = LOCALE_META[locale];
    return {
      locale,
      isEnglish: locale === "en",
      localeLabel: meta.label,
      htmlLang: meta.htmlLang,
      setLocale,
      toggleLocale,
      t: (key: string, vars?: Vars) => translate(locale, key, vars),
    };
  }, [locale, setLocale, toggleLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useI18n must be used inside <I18nProvider>");
  }
  return value;
}

/** Convenience hook for components that only need the `t()` function. */
export function useT(): (key: string, vars?: Vars) => string {
  return useI18n().t;
}

export function LocaleToggle({ className = "" }: { className?: string }) {
  const { locale, toggleLocale, t } = useI18n();
  const target = nextLocale(locale);
  const title = target === "zh" ? t("切换为简体中文") : t("切换为英文界面");
  return (
    <button
      type="button"
      id="locale-toggle"
      className={`btn btn-quiet locale-toggle ${className}`.trim()}
      data-locale={locale}
      aria-label={title}
      title={title}
      onClick={toggleLocale}
    >
      <span className="locale-toggle-label">{LOCALE_META[locale].label}</span>
    </button>
  );
}

export { LOCALES, LOCALE_META, DEFAULT_LOCALE } from "./locale";
export type { Locale } from "./locale";
export { tr, translate, interpolate } from "./translate";
export { localized } from "./localized";
