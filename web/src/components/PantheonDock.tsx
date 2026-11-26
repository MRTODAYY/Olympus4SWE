import type { PantheonGod, PantheonSeatSummary } from "../api/types";
import { useT } from "../i18n";
import { tr } from "../i18n/translate";
import { GOD_META, shortOracleCode } from "../lib/labels";
import type { Workbench, WorkbenchState } from "../state/workbench";
import { GodAvatar, type GodAvatarManifestOverride } from "./GodAvatar";

export const PANTHEON_ORDER: readonly PantheonGod[] = [
  "prometheus",
  "athena",
  "hephaestus",
  "momus",
  "argus",
];

export interface PantheonDockProps {
  workbench: Workbench;
  state: WorkbenchState;
  manifestOverride?: GodAvatarManifestOverride;
}

const MAX_VISIBLE_CHIPS = 2;

function normalizeSeats(seats: PantheonSeatSummary[]): PantheonSeatSummary[] {
  const byGod = new Map<PantheonGod, PantheonSeatSummary>();
  for (const seat of seats) {
    byGod.set(seat.god, seat);
  }
  return PANTHEON_ORDER.map((god) => {
    const existing = byGod.get(god);
    if (existing) return existing;
    return {
      god,
      role_label: GOD_META[god].role,
      state: "idle",
      active_count: 0,
      waiting_count: 0,
      oracle_ids: [],
    };
  });
}

export function PantheonDock({
  workbench,
  state,
  manifestOverride,
}: PantheonDockProps) {
  const t = useT();
  const seats = normalizeSeats(state.pantheon);
  const activeFilterMeta = state.selectedGodFilter
    ? GOD_META[state.selectedGodFilter]
    : null;

  return (
    <footer
      id="pantheon-dock"
      className="pantheon-dock"
      aria-label={t("Pantheon Live Pipeline")}
    >
      <div className="pantheon-dock-head">
        <span className="pantheon-dock-label">{t("PANTHEON · LIVE PIPELINE")}</span>
        <span className="pantheon-dock-rule" aria-hidden="true" />
        {activeFilterMeta ? (
          <div className="pantheon-filter-status" role="status">
            <span className="pantheon-filter-copy">
              {t("Filtered:")} <strong>{activeFilterMeta.name}</strong> ({activeFilterMeta.role})
            </span>
            <button
              type="button"
              id="btn-pantheon-clear-filter"
              className="btn btn-quiet pantheon-clear-btn"
              onClick={() => workbench.setGodFilter(null)}
            >
              {t("Clear filter")}
            </button>
          </div>
        ) : null}
      </div>

      <div
        className="pantheon-seats"
        role="group"
        aria-label={t("Pantheon pipeline seats")}
      >
        {seats.map((seat) => {
          const meta = GOD_META[seat.god];
          const isSelected = state.selectedGodFilter === seat.god;
          const isHovered = state.hoveredGod === seat.god;
          const visibleIds = seat.oracle_ids.slice(0, MAX_VISIBLE_CHIPS);
          const overflowCount = Math.max(0, seat.oracle_ids.length - visibleIds.length);
          const roleText = tr(seat.role_label || meta.role);

          return (
            <button
              key={seat.god}
              type="button"
              className="pantheon-seat"
              data-god={seat.god}
              data-state={seat.state}
              data-selected={isSelected ? "true" : undefined}
              data-hovered={isHovered ? "true" : undefined}
              aria-pressed={isSelected ? "true" : "false"}
              aria-label={`${meta.name}, ${roleText}, ${seat.waiting_count} ${t("项待裁决")}, ${seat.active_count} ${t("个进行中")}`}
              onClick={() => workbench.setGodFilter(seat.god)}
              onMouseEnter={() => workbench.setHoveredGod(seat.god)}
              onMouseLeave={() => workbench.setHoveredGod(null)}
              onFocus={() => workbench.setHoveredGod(seat.god)}
              onBlur={() => workbench.setHoveredGod(null)}
            >
              <div className="pantheon-seat-visual">
                <GodAvatar
                  god={seat.god}
                  state={seat.state}
                  size="lg"
                  manifestOverride={manifestOverride}
                />
                {seat.waiting_count > 0 ? (
                  <span
                    className="pantheon-count-badge"
                    data-tone="warn"
                    data-count-kind="waiting"
                    title={t("{count} 项待你裁决", { count: seat.waiting_count })}
                  >
                    {seat.waiting_count}
                  </span>
                ) : null}
                {seat.active_count > 0 ? (
                  <span
                    className={
                      seat.waiting_count > 0
                        ? "pantheon-count-badge pantheon-count-badge-secondary"
                        : "pantheon-count-badge"
                    }
                    data-tone="live"
                    data-count-kind="active"
                    title={t("{count} 个进行中任务", { count: seat.active_count })}
                  >
                    {seat.active_count}
                  </span>
                ) : null}
              </div>

              <div className="pantheon-seat-body">
                <div className="pantheon-seat-meta">
                  <span className="pantheon-seat-name">{meta.name}</span>
                  <span className="pantheon-seat-role">{roleText}</span>
                </div>

                <div className="pantheon-seat-chips">
                  {visibleIds.length ? (
                    <>
                      {visibleIds.map((oracleId) => (
                        <span
                          key={oracleId}
                          className="pantheon-oracle-chip"
                          data-oracle-id={oracleId}
                          title={oracleId}
                        >
                          #{shortOracleCode(oracleId)}
                        </span>
                      ))}
                      {overflowCount > 0 ? (
                        <span
                          className="pantheon-oracle-chip pantheon-oracle-chip-more"
                          title={seat.oracle_ids.join(", ")}
                        >
                          +{overflowCount}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span className="pantheon-idle-caption">{t("Idle")}</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </footer>
  );
}
