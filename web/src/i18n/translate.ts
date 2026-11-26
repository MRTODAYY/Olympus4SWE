import { MESSAGES } from "./messages";
import { activeLocale, type Locale } from "./locale";

export type Vars = Record<string, string | number | null | undefined>;

/**
 * Interpolate `{name}` placeholders. Unknown placeholders are kept verbatim so a
 * missing variable never blanks out the surrounding copy.
 */
export function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key] ?? "") : match,
  );
}

export function translate(locale: Locale, key: string, vars?: Vars): string {
  if (!key) return key;
  const table = MESSAGES[locale];
  const hit = table && Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;
  return interpolate(hit ?? key, vars);
}

/**
 * Locale-aware lookup for non-React modules. Reads the locale mirrored by
 * `I18nProvider`, so it must be called during render / event handling.
 */
export function tr(key: string, vars?: Vars): string {
  return translate(activeLocale(), key, vars);
}

/** Translate a `Record<key, sourceCopy>` lookup table, keeping an unknown key as-is. */
export function trRecord(
  table: Record<string, string>,
  key: string | null | undefined,
  vars?: Vars,
): string {
  if (key === null || key === undefined || key === "") return "";
  const raw = Object.prototype.hasOwnProperty.call(table, key) ? table[key] : key;
  return tr(raw, vars);
}
