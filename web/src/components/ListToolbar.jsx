import { Search, X } from "lucide-react";

// Search, region, sort and status filters above a long list. Each control is
// optional; the parent owns the values.
export default function ListToolbar({
  query,
  onQuery,
  placeholder,
  regions,
  region,
  onRegion,
  sorts,
  sort,
  onSort,
  statuses,
  status,
  onStatus,
  count,
  noun,
  plural = `${noun}s`,
  note,
}) {
  return (
    <div className="toolbar">
      <div className="toolbar-row">
        <label className="toolbar-search">
          <Search aria-hidden="true" />
          <span className="visually-hidden">Search</span>
          <input type="search" value={query} placeholder={placeholder} onChange={(e) => onQuery(e.target.value)} />
          {query && (
            <button type="button" aria-label="Clear search" onClick={() => onQuery("")}>
              <X aria-hidden="true" />
            </button>
          )}
        </label>
        {regions && (
          <label className="toolbar-select">
            <span>Region</span>
            <select value={region} onChange={(e) => onRegion(e.target.value)}>
              <option value="">Everywhere</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        )}
        {sorts && (
          <label className="toolbar-select">
            <span>Sort</span>
            <select value={sort} onChange={(e) => onSort(e.target.value)}>
              {Object.entries(sorts).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="toolbar-row toolbar-meta">
        {statuses && (
          <div className="toolbar-chips" role="group" aria-label="Show">
            {Object.entries(statuses).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className="toolbar-chip"
                aria-pressed={status === value}
                onClick={() => onStatus(value)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <span className="toolbar-count" aria-live="polite">
          {count === undefined ? "" : `${count} ${count === 1 ? noun : plural}`}
          {note && <span className="toolbar-note"> · {note}</span>}
        </span>
      </div>
    </div>
  );
}
