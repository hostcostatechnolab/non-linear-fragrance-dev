import { useState } from "react";

export type ClickBarChartRow = { key: string; label: string; clicks: number };

const BAR_COLOR = "#2a78d6";
const BAR_COLOR_HOVER = "#1c5cab";
const TEXT_PRIMARY = "#0b0b0b";
const TEXT_SECONDARY = "#52514e";
const BASELINE_COLOR = "#c3c2b7";

export function ClickBarChart({ rows }: { rows: ClickBarChartRow[] }) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const maxClicks = Math.max(...rows.map((row) => row.clicks), 1);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        padding: "16px 4px",
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        borderBottom: `1px solid ${BASELINE_COLOR}`,
        marginBottom: 4,
      }}
    >
      {rows.map((row) => {
        const pct = Math.max((row.clicks / maxClicks) * 100, 3);
        const isHovered = hoveredKey === row.key;
        return (
          <div
            key={row.key}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(72px, 120px) 1fr",
              gap: 12,
              alignItems: "center",
            }}
          >
            <span
              title={row.label}
              style={{
                color: TEXT_SECONDARY,
                fontSize: 13,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {row.label}
            </span>
            <div
              style={{ position: "relative", height: 16, minWidth: 0 }}
              tabIndex={0}
              role="img"
              aria-label={`${row.label}: ${row.clicks} click${row.clicks === 1 ? "" : "s"}`}
              onMouseEnter={() => setHoveredKey(row.key)}
              onMouseLeave={() => setHoveredKey(null)}
              onFocus={() => setHoveredKey(row.key)}
              onBlur={() => setHoveredKey(null)}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: 0,
                  width: `${pct}%`,
                  minWidth: 3,
                  background: isHovered ? BAR_COLOR_HOVER : BAR_COLOR,
                  borderRadius: "0 4px 4px 0",
                  transition: "background 0.1s ease",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  top: "50%",
                  left: `calc(${pct}% + 8px)`,
                  transform: "translateY(-50%)",
                  color: TEXT_PRIMARY,
                  fontWeight: 600,
                  fontSize: 13,
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                }}
              >
                {row.clicks}
              </span>
              {isHovered && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "calc(100% + 8px)",
                    left: 0,
                    background: TEXT_PRIMARY,
                    color: "#fff",
                    padding: "4px 8px",
                    borderRadius: 4,
                    fontSize: 12,
                    whiteSpace: "nowrap",
                    pointerEvents: "none",
                    zIndex: 1,
                  }}
                >
                  <strong>{row.clicks}</strong> click
                  {row.clicks === 1 ? "" : "s"} · {row.label}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
