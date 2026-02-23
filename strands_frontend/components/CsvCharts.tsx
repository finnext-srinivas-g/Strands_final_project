"use client";

type ChartRow = { label: string; value: number };

function HorizontalBars({
  title,
  rows,
  colorClass,
}: {
  title: string;
  rows: ChartRow[];
  colorClass: string;
}) {
  const max = rows.length > 0 ? Math.max(...rows.map((r) => r.value), 1) : 1;

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800 mb-3">{title}</h3>
      <div className="space-y-2">
        {rows.map((row) => {
          const width = `${Math.max(4, Math.round((row.value / max) * 100))}%`;
          return (
            <div key={row.label}>
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>{row.label}</span>
                <span>{row.value}</span>
              </div>
              <div className="h-2 rounded bg-slate-100 overflow-hidden">
                <div className={`h-full ${colorClass}`} style={{ width }} />
              </div>
            </div>
          );
        })}
        {rows.length === 0 ? <p className="text-xs text-slate-500">No chart data available.</p> : null}
      </div>
    </div>
  );
}

export default function CsvCharts({
  employeesByDepartment,
  avgSalaryByDepartment,
}: {
  employeesByDepartment: ChartRow[];
  avgSalaryByDepartment: ChartRow[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <HorizontalBars
        title="Employees by Department"
        rows={employeesByDepartment}
        colorClass="bg-emerald-500"
      />
      <HorizontalBars
        title="Average Salary by Department"
        rows={avgSalaryByDepartment}
        colorClass="bg-sky-500"
      />
    </div>
  );
}
