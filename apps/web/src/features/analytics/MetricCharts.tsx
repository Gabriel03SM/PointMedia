import type { MetricDay } from '@pointmedia/shared';

export function MetricBars({
  items,
  label,
}: {
  items: { label: string; count: number }[];
  label: string;
}) {
  const max = Math.max(1, ...items.map((item) => item.count));
  return (
    <ul className="metric-bars" aria-label={label}>
      {items.map((item) => (
        <li key={item.label}>
          <span>{item.label}</span>
          <progress aria-label={item.label} value={item.count} max={max} />
          <strong>{item.count}</strong>
        </li>
      ))}
    </ul>
  );
}
export function MetricColumns({ days, label }: { days: MetricDay[]; label: string }) {
  const months = new Map<string, number>();
  if (days.length > 30)
    for (const day of days)
      months.set(day.date.slice(0, 7), (months.get(day.date.slice(0, 7)) ?? 0) + day.count);
  const values = days.length > 30 ? [...months].map(([date, count]) => ({ date, count })) : days;
  const max = Math.max(1, ...values.map((day) => day.count));
  return (
    <div className="metric-column-container" role="region" aria-label={label} tabIndex={0}>
      <ul className="metric-columns" aria-label={label}>
        {values.map((day) => (
          <li key={day.date} title={`${day.date}: ${day.count}`}>
            <strong>{day.count}</strong>
            <div aria-hidden="true">
              <span style={{ height: `${(day.count / max) * 100}%` }} />
            </div>
            <span>
              {day.date.length === 7
                ? `${day.date.slice(5)}/${day.date.slice(0, 4)}`
                : `${day.date.slice(8)}/${day.date.slice(5, 7)}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
