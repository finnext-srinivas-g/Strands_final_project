"use client";
import {
  useCoAgent,
  useDefaultTool,
  useRenderToolCall,
} from "@copilotkit/react-core";
import { useMemo, useState } from "react";
import CsvCharts from "../components/CsvCharts";
import DataTable from "../components/DataTable";
import KpiCards from "../components/KpiCards";

function WeatherCard({
  themeColor,
  location,
}: {
  themeColor: string;
  location: string;
}) {
  return (
    <div style={{ background: themeColor, padding: 16, borderRadius: 8, color: "#fff" }}>
      <h2>Weather for {location}</h2>
      <p>Weather info will be shown here.</p>
    </div>
  );
}

function DefaultToolComponent(props: any) {
  return (
    <div style={{ background: "#fff", padding: 16, borderRadius: 8, color: "#333" }}>
      <h2>Tool Call</h2>
      <pre>{JSON.stringify(props, null, 2)}</pre>
    </div>
  );
}

function buildDepartmentChartRows(departmentCounts: Record<string, number> | undefined) {
  if (!departmentCounts || typeof departmentCounts !== "object") return [];
  return Object.entries(departmentCounts).map(([label, value]) => ({
    label,
    value: Number(value) || 0,
  }));
}

function buildAvgSalaryChartRows(avgSalaryByDepartment: Record<string, number> | undefined) {
  if (!avgSalaryByDepartment || typeof avgSalaryByDepartment !== "object") return [];
  return Object.entries(avgSalaryByDepartment).map(([label, value]) => ({
    label,
    value: Number(value) || 0,
  }));
}

function toNumber(value: unknown): number | null {
  if (value === null || typeof value === "undefined") return null;
  const numeric = Number(String(value).replace(/[$,]/g, "").trim());
  return Number.isFinite(numeric) ? numeric : null;
}

function findColumn(columns: string[], candidates: string[]): string | null {
  const normalized = columns.map((c) => ({ raw: c, normalized: c.toLowerCase().trim() }));
  for (const candidate of candidates) {
    const exact = normalized.find((c) => c.normalized === candidate);
    if (exact) return exact.raw;
  }
  for (const candidate of candidates) {
    const partial = normalized.find((c) => c.normalized.includes(candidate));
    if (partial) return partial.raw;
  }
  return null;
}

function CsvResultsCard({ themeColor, data }: { themeColor: string; data: any }) {
  const [viewMode, setViewMode] = useState<"table" | "charts" | "dashboard">("table");
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const columns = Array.isArray(data?.columns)
    ? data.columns
    : rows.length > 0
      ? Object.keys(rows[0])
      : [];
  const rowCount = Number(data?.row_count) || rows.length;

  const computed = useMemo(() => {
    const departmentColumn = findColumn(columns, ["department", "dept", "team"]);
    const salaryColumn = findColumn(columns, ["salary", "income", "pay", "wage"]);

    const departmentCounts: Record<string, number> = {};
    const departmentSalary: Record<string, { sum: number; count: number }> = {};
    const salaries: number[] = [];

    for (const row of rows) {
      const departmentValue = departmentColumn ? String(row[departmentColumn] ?? "").trim() || "Unknown" : "Unknown";
      departmentCounts[departmentValue] = (departmentCounts[departmentValue] ?? 0) + 1;

      if (salaryColumn) {
        const value = toNumber(row[salaryColumn]);
        if (value !== null) {
          salaries.push(value);
          if (!departmentSalary[departmentValue]) {
            departmentSalary[departmentValue] = { sum: 0, count: 0 };
          }
          departmentSalary[departmentValue].sum += value;
          departmentSalary[departmentValue].count += 1;
        }
      }
    }

    const avgSalaryByDepartment: Record<string, number> = {};
    for (const [dept, stats] of Object.entries(departmentSalary)) {
      if (stats.count > 0) {
        avgSalaryByDepartment[dept] = Number((stats.sum / stats.count).toFixed(2));
      }
    }

    const highestSalary = salaries.length ? Math.max(...salaries) : null;
    const lowestSalary = salaries.length ? Math.min(...salaries) : null;
    const averageSalary = salaries.length
      ? Number((salaries.reduce((sum, n) => sum + n, 0) / salaries.length).toFixed(2))
      : null;

    return {
      departmentCounts,
      avgSalaryByDepartment,
      departmentCount: Object.keys(departmentCounts).length,
      highestSalary,
      lowestSalary,
      averageSalary,
    };
  }, [columns, rows]);

  const employeesByDepartment = buildDepartmentChartRows(computed.departmentCounts);
  const avgSalaryByDepartment = buildAvgSalaryChartRows(computed.avgSalaryByDepartment);

  return (
    <div className="rounded-xl p-4 bg-white text-slate-900 shadow space-y-4" style={{ borderTop: `4px solid ${themeColor}` }}>
      <h2 className="text-lg font-semibold mb-2">CSV Results</h2>
      <p className="text-sm text-slate-600 mb-3">
        File: {data?.file || "sample.csv"} | Rows shown: {rows.length}
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setViewMode("table")}
          className={`px-3 py-1.5 rounded-md text-sm border ${viewMode === "table" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300"}`}
        >
          Table
        </button>
        <button
          onClick={() => setViewMode("charts")}
          className={`px-3 py-1.5 rounded-md text-sm border ${viewMode === "charts" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300"}`}
        >
          Charts
        </button>
        <button
          onClick={() => setViewMode("dashboard")}
          className={`px-3 py-1.5 rounded-md text-sm border ${viewMode === "dashboard" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300"}`}
        >
          Dashboard
        </button>
      </div>

      {viewMode === "table" ? (
        <DataTable title="CSV Data" columns={columns} rows={rows} pageSize={10} />
      ) : null}

      {viewMode === "charts" ? (
        <CsvCharts
          employeesByDepartment={employeesByDepartment}
          avgSalaryByDepartment={avgSalaryByDepartment}
        />
      ) : null}

      {viewMode === "dashboard" ? (
        <div className="space-y-4">
          <KpiCards
            totalEmployees={rowCount}
            totalDepartments={computed.departmentCount}
            highestSalary={computed.highestSalary}
            lowestSalary={computed.lowestSalary}
            averageSalary={computed.averageSalary}
          />
          <CsvCharts
            employeesByDepartment={employeesByDepartment}
            avgSalaryByDepartment={avgSalaryByDepartment}
          />
          <DataTable title="CSV Data" columns={columns} rows={rows} pageSize={8} />
        </div>
      ) : null}
    </div>
  );
}

function CsvSummaryCard({ themeColor, data }: { themeColor: string; data: any }) {
  const employeesByDepartment = buildDepartmentChartRows(data?.department_counts);
  const avgSalaryByDepartment = buildAvgSalaryChartRows(data?.avg_salary_by_department);

  return (
    <div className="rounded-xl p-4 bg-white text-slate-900 shadow space-y-4" style={{ borderTop: `4px solid ${themeColor}` }}>
      <h2 className="text-lg font-semibold">CSV Dashboard Summary</h2>
      <p className="text-sm text-slate-600">File: {data?.file || "sample.csv"}</p>

      <KpiCards
        totalEmployees={data?.row_count}
        totalDepartments={data?.department_count}
        highestSalary={data?.highest_salary}
        lowestSalary={data?.lowest_salary}
        averageSalary={data?.average_salary}
      />

      <CsvCharts
        employeesByDepartment={employeesByDepartment}
        avgSalaryByDepartment={avgSalaryByDepartment}
      />
    </div>
  );
}

function CsvAnalyticsCard({ themeColor, data }: { themeColor: string; data: any }) {
  const departmentCounts =
    data && typeof data === "object" && data.department_counts && typeof data.department_counts === "object"
      ? Object.entries(data.department_counts as Record<string, number>).map(([department, count]) => ({
          Department: department,
          Employees: count,
        }))
      : [];

  return (
    <div className="rounded-xl p-4 bg-white text-slate-900 shadow" style={{ borderTop: `4px solid ${themeColor}` }}>
      <h2 className="text-lg font-semibold mb-2">CSV Analysis</h2>
      <p className="text-sm text-slate-600 mb-2">File: {data?.file || "sample.csv"}</p>
      <p className="text-sm text-slate-800 mb-2">{String(data?.answer || "Analysis result generated.")}</p>

      {typeof data?.row_count !== "undefined" ? (
        <p className="text-xs text-slate-600 mb-3">Total rows: {String(data.row_count)}</p>
      ) : null}

      {departmentCounts.length > 0 ? (
        <DataTable
          title="Department Employee Counts"
          columns={["Department", "Employees"]}
          rows={departmentCounts}
          pageSize={8}
        />
      ) : null}
    </div>
  );
}

function parseToolResult(result: unknown): any {
  if (typeof result === "string") {
    try {
      return JSON.parse(result);
    } catch {
      return { rows: [], columns: [], raw: result };
    }
  }
  return result;
}

export default function YourMainContent({ themeColor }: { themeColor: string }) {
  const { state, setState } = useCoAgent({
    name: "strands_agent",
    initialState: {
      proverbs: [
        "CopilotKit may be new, but it's the best thing since sliced bread.",
      ],
    },
  });

  useRenderToolCall(
    {
      name: "get_weather",
      parameters: [
        {
          name: "location",
          description: "The location to get the weather for.",
          required: true,
        },
      ],
      render: (props) => (
        <WeatherCard themeColor={themeColor} location={props.args.location} />
      ),
    },
    [themeColor]
  );

  useRenderToolCall(
    {
      name: "get_csv_preview",
      parameters: [
        {
          name: "file_name",
          description: "CSV file name in backend folder.",
          required: false,
        },
        {
          name: "limit",
          description: "Maximum rows to return. Use 0 for all rows.",
          required: false,
        },
      ],
      render: (props) => {
        const parsed = parseToolResult(props.result);
        return <CsvResultsCard themeColor={themeColor} data={parsed} />;
      },
    },
    [themeColor]
  );

  useRenderToolCall(
    {
      name: "query_csv_data",
      parameters: [
        {
          name: "query",
          description: "Keyword query for searching rows in CSV.",
          required: true,
        },
        {
          name: "file_name",
          description: "CSV file name in backend folder.",
          required: false,
        },
        {
          name: "limit",
          description: "Maximum rows to return. Use 0 for all rows.",
          required: false,
        },
      ],
      render: (props) => {
        const parsed = parseToolResult(props.result);
        return <CsvResultsCard themeColor={themeColor} data={parsed} />;
      },
    },
    [themeColor]
  );

  useRenderToolCall(
    {
      name: "get_csv_summary",
      parameters: [
        {
          name: "file_name",
          description: "CSV file name in backend folder.",
          required: false,
        },
      ],
      render: (props) => {
        const parsed = parseToolResult(props.result);
        return <CsvSummaryCard themeColor={themeColor} data={parsed} />;
      },
    },
    [themeColor]
  );

  useRenderToolCall(
    {
      name: "answer_csv_question",
      parameters: [
        {
          name: "question",
          description: "Analytical question about CSV data.",
          required: true,
        },
        {
          name: "file_name",
          description: "CSV file name in backend folder.",
          required: false,
        },
      ],
      render: (props) => {
        const parsed = parseToolResult(props.result);
        return <CsvAnalyticsCard themeColor={themeColor} data={parsed} />;
      },
    },
    [themeColor]
  );

  useRenderToolCall(
    {
      name: "group_by_csv",
      parameters: [
        {
          name: "group_by_column",
          description: "Column to group by.",
          required: true,
        },
        {
          name: "operation",
          description: "Aggregate operation: count, sum, avg, min, max.",
          required: false,
        },
        {
          name: "target_column",
          description: "Target numeric column for sum/avg/min/max.",
          required: false,
        },
        {
          name: "file_name",
          description: "CSV file name in backend folder.",
          required: false,
        },
        {
          name: "limit",
          description: "Maximum grouped rows to return. Use 0 for all rows.",
          required: false,
        },
        {
          name: "descending",
          description: "Sort order by aggregate value.",
          required: false,
        },
      ],
      render: (props) => {
        const parsed = parseToolResult(props.result);
        return <CsvResultsCard themeColor={themeColor} data={parsed} />;
      },
    },
    [themeColor]
  );

  useDefaultTool(
    {
      render: (props) => <DefaultToolComponent {...props} />,
    },
    []
  );

  return (
    <div
      style={{ backgroundColor: themeColor }}
      className="min-h-screen flex justify-center items-center flex-col transition-colors duration-300"
    >
      <div className="bg-white/20 backdrop-blur-md p-8 rounded-2xl shadow-xl max-w-6xl w-full">
        <h1 className="text-4xl font-bold text-white mb-2 text-center">
          Tools + Data Workspace
        </h1>

        <p className="text-gray-200 text-center italic mb-6">
          Ask for CSV tables, KPI summaries, and grouped analytics.
        </p>

        <hr className="border-white/20 my-6" />

        <div className="flex flex-col gap-3 mb-8">
          {state.proverbs?.map((proverb: string, index: number) => (
            <div
              key={index}
              className="bg-white/15 p-4 rounded-xl text-white relative group"
            >
              <p className="pr-8">{proverb}</p>
              <button
                onClick={() =>
                  setState({
                    ...state,
                    proverbs: state.proverbs?.filter((_: string, i: number) => i !== index),
                  })
                }
                className="absolute top-2 right-2 text-white"
              >
                x
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
