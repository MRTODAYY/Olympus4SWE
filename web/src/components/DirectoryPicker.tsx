import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { browseFilesystem } from "../api/client";
import type { FilesystemBrowseResponse } from "../api/types";
import { tr, useT } from "../i18n";
import { buildBreadcrumbs } from "../lib/paths";

export interface DirectoryPickerProps {
  idPrefix: string;
  value: string;
  onChange: (nextPath: string) => void;
  inputId?: string;
  placeholder?: string;
  disabled?: boolean;
  mode?: "select_folder" | "select_parent";
  refreshKey?: string | number;
  onDefaultRoot?: (rootPath: string) => void;
}

const TYPING_DEBOUNCE_MS = 140;

export function DirectoryPicker({
  idPrefix,
  value,
  onChange,
  inputId,
  placeholder,
  disabled = false,
  mode = "select_folder",
  refreshKey = 0,
  onDefaultRoot,
}: DirectoryPickerProps) {
  const t = useT();
  const [data, setData] = useState<FilesystemBrowseResponse | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [manualRefreshSeq, setManualRefreshSeq] = useState(0);
  const [syncedKey, setSyncedKey] = useState<string | null>(null);

  const requestSeqRef = useRef(0);
  const changeSourceRef = useRef<"immediate" | "typing">("immediate");
  const onDefaultRootRef = useRef(onDefaultRoot);
  onDefaultRootRef.current = onDefaultRoot;
  const listRef = useRef<HTMLUListElement>(null);
  const queryKey = `${value}\0${showHidden ? "1" : "0"}`;

  useEffect(() => {
    const delay = changeSourceRef.current === "typing" ? TYPING_DEBOUNCE_MS : 0;
    changeSourceRef.current = "immediate";

    let cancelled = false;
    const timer = window.setTimeout(() => {
      const seq = ++requestSeqRef.current;
      setLoading(true);
      void browseFilesystem(value || undefined, showHidden)
        .then((response) => {
          if (cancelled || seq !== requestSeqRef.current) return;
          setData(response);
          setSyncedKey(queryKey);
          setFetchError(null);
          setActiveIndex((prev) =>
            response.entries.length === 0 ? -1 : Math.min(prev, response.entries.length - 1),
          );
          if (!value.trim() && response.current_path) {
            onDefaultRootRef.current?.(response.current_path);
          }
        })
        .catch((err: unknown) => {
          if (cancelled || seq !== requestSeqRef.current) return;
          setFetchError((err as Error).message || tr("无法浏览目录"));
        })
        .finally(() => {
          if (!cancelled && seq === requestSeqRef.current) {
            setLoading(false);
          }
        });
    }, delay);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [value, showHidden, refreshKey, manualRefreshSeq, queryKey]);

  useEffect(() => {
    if (activeIndex < 0) return;
    const row = document.getElementById(`${idPrefix}-entry-${activeIndex}`);
    row?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, idPrefix]);

  const selectPath = (nextPath: string) => {
    changeSourceRef.current = "immediate";
    setActiveIndex(-1);
    if (nextPath === value) {
      setManualRefreshSeq((seq) => seq + 1);
    } else {
      onChange(nextPath);
    }
  };

  const handleInputChange = (nextValue: string) => {
    changeSourceRef.current = "typing";
    setActiveIndex(-1);
    onChange(nextValue);
  };

  const entries = data?.entries || [];
  const entriesSynced = syncedKey === queryKey && !loading;
  const breadcrumbs = data?.current_path ? buildBreadcrumbs(data.current_path) : [];
  const quickRoots = data?.quick_roots || [];
  const resolvedInputId = inputId || `${idPrefix}-input`;

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled || !entriesSynced || !entries.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev < entries.length - 1 ? prev + 1 : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : entries.length - 1));
    } else if (event.key === "Enter" && activeIndex >= 0 && activeIndex < entries.length) {
      event.preventDefault();
      selectPath(entries[activeIndex].path);
    } else if (event.key === "Escape" && activeIndex >= 0) {
      event.preventDefault();
      setActiveIndex(-1);
    }
  };

  return (
    <div className="dir-picker" id={`${idPrefix}-picker`} data-picker-mode={mode}>
      {quickRoots.length ? (
        <div className="picker-roots" role="group" aria-label={t("Quick roots")}>
          {quickRoots.map((root) => {
            const isCurrent = data?.current_path === root.path && !data.prefix;
            return (
              <button
                key={root.path}
                type="button"
                className="picker-chip"
                data-quick-root={root.label}
                data-quick-root-path={root.path}
                aria-pressed={isCurrent ? "true" : "false"}
                disabled={disabled}
                onClick={() => selectPath(root.path)}
              >
                {root.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="picker-controls">
        <input
          id={resolvedInputId}
          className="field picker-input mono"
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded="true"
          aria-controls={`${idPrefix}-list`}
          aria-activedescendant={activeIndex >= 0 ? `${idPrefix}-entry-${activeIndex}` : undefined}
          placeholder={placeholder || data?.current_path || "/path/to/directory"}
          value={value}
          disabled={disabled}
          onChange={(event) => handleInputChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="btn btn-quiet picker-up-btn"
          id={`${idPrefix}-up`}
          disabled={disabled || !data?.parent_path}
          title={t("Up to parent folder")}
          onClick={() => {
            if (data?.parent_path) selectPath(data.parent_path);
          }}
        >
          {t("↑ Up")}
        </button>
        <label className="picker-hidden-toggle">
          <input
            id={`${idPrefix}-show-hidden`}
            type="checkbox"
            checked={showHidden}
            disabled={disabled}
            onChange={(event) => {
              changeSourceRef.current = "immediate";
              setShowHidden(event.target.checked);
            }}
          />
          <span>{t("Show hidden")}</span>
        </label>
      </div>

      {breadcrumbs.length ? (
        <nav className="picker-breadcrumbs" aria-label={t("Directory breadcrumbs")}>
          {breadcrumbs.map((segment, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <span className="picker-crumb-wrap" key={segment.path}>
                {index > 0 ? (
                  <span className="picker-crumb-sep" aria-hidden="true">
                    /
                  </span>
                ) : null}
                <button
                  type="button"
                  className="picker-crumb mono"
                  data-crumb-path={segment.path}
                  aria-current={isLast && !data?.prefix ? "location" : undefined}
                  disabled={disabled}
                  onClick={() => selectPath(segment.path)}
                >
                  {segment.label}
                </button>
              </span>
            );
          })}
          {data?.prefix ? (
            <span className="picker-filter-pill mono" data-picker-prefix={data.prefix}>
              {t("filter: {prefix}", { prefix: data.prefix })}
            </span>
          ) : null}
          {loading ? <span className="picker-loading">{t("Loading…")}</span> : null}
        </nav>
      ) : null}

      <ul
        ref={listRef}
        className="picker-list scroller"
        id={`${idPrefix}-list`}
        role="listbox"
        aria-label={t("Subdirectories")}
      >
        {data?.path_missing ? (
          <li className="picker-empty" data-picker-state="missing">
            {t("Directory does not exist yet — select an ancestor or create it under New Project.")}
          </li>
        ) : fetchError ? (
          <li className="picker-empty" data-picker-state="error">
            {fetchError}
          </li>
        ) : entries.length ? (
          entries.map((entry, idx) => (
            <li
              key={entry.path}
              id={`${idPrefix}-entry-${idx}`}
              role="option"
              aria-selected={idx === activeIndex}
              className="picker-row-item"
            >
              <button
                type="button"
                className="picker-entry"
                data-entry-name={entry.name}
                data-entry-path={entry.path}
                data-active={idx === activeIndex ? "true" : "false"}
                disabled={disabled}
                onClick={() => selectPath(entry.path)}
              >
                <span className="picker-entry-name mono">{`${entry.name}/`}</span>
                <span className="picker-entry-badges">
                  {entry.is_git_repo ? (
                    <span className="badge" data-variant="live" data-badge-kind="git">
                      {entry.default_branch ? `git · ${entry.default_branch}` : "git"}
                    </span>
                  ) : null}
                  {entry.already_registered ? (
                    <span className="badge" data-variant="ok" data-badge-kind="registered">
                      {t("Registered")}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))
        ) : (
          <li className="picker-empty" data-picker-state="empty">
            {loading
              ? t("Loading folders…")
              : data?.prefix
                ? t('No folders matching "{prefix}"', { prefix: data.prefix })
                : t("No subdirectories in this folder")}
          </li>
        )}
      </ul>
    </div>
  );
}
