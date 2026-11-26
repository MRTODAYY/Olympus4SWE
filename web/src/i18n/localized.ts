import { tr } from "./translate";

const proxyCache = new WeakMap<object, object>();

/**
 * Wrap a lookup table (or a table of objects / tuples) so every string read is
 * passed through `tr()` at access time.
 *
 * Label tables in `lib/labels.ts` are module-level constants: their values would
 * otherwise be frozen at import time, which makes them impossible to switch at
 * runtime. Proxying the read keeps every call site (`NODE_LABELS[node]`,
 * `GOD_META[god].role`, `DELIVERY_STATUS[status][0]`, …) untouched while staying
 * locale-correct.
 */
function wrapValue(value: unknown): unknown {
  if (typeof value === "string") return tr(value);
  if (Array.isArray(value)) return wrapper(value);
  if (value && typeof value === "object") {
    return wrapper(value as Record<string, unknown>);
  }
  return value;
}

function wrapper<T extends object>(table: T): T {
  const cached = proxyCache.get(table);
  if (cached) return cached as T;

  const proxy = new Proxy(table, {
    get(target, prop, receiver) {
      return wrapValue(Reflect.get(target, prop, receiver));
    },
  });

  proxyCache.set(table, proxy);
  return proxy;
}

export function localized<T extends object>(table: T): T {
  return wrapper(table);
}

/** Shallow alias kept for readability when the table maps to plain strings. */
export const localizedTable = localized;
