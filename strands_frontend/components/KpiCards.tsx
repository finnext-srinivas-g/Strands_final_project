"use client";

type KpiValue = string | number | null | undefined;

function KpiCard({ label, value }: { label: string; value: KpiValue }) {
  return (
    <div className="rounded-lg border bg-white p-3 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-xl font-semibold text-slate-900 mt-1">{value ?? "-"}</div>
    </div>
  );
}

export default function KpiCards({
  totalEmployees,
  totalDepartments,
  highestSalary,
  lowestSalary,
  averageSalary,
}: {
  totalEmployees?: KpiValue;
  totalDepartments?: KpiValue;
  highestSalary?: KpiValue;
  lowestSalary?: KpiValue;
  averageSalary?: KpiValue;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      <KpiCard label="Total Employees" value={totalEmployees} />
      <KpiCard label="Total Departments" value={totalDepartments} />
      <KpiCard label="Highest Salary" value={highestSalary} />
      <KpiCard label="Lowest Salary" value={lowestSalary} />
      <KpiCard label="Average Salary" value={averageSalary} />
    </div>
  );
}
