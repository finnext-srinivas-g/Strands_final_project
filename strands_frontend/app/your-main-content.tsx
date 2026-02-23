"use client";
import {
  useCopilotChat,
  useDefaultTool,
  useRenderToolCall,
} from "@copilotkit/react-core";
import { useCallback, useMemo, useState } from "react";
import { MessageRole, TextMessage } from "@copilotkit/runtime-client-gql";
import CsvCharts from "../components/CsvCharts";
import DataTable from "../components/DataTable";
import KpiCards from "../components/KpiCards";

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

function GithubRepoNamesCard({
  themeColor,
  data,
  onUseSelectedRepos,
  onShowFileTypes,
  onShowReadmeContent,
}: {
  themeColor: string;
  data: any;
  onUseSelectedRepos: (repos: string[]) => void;
  onShowFileTypes: (repos: string[]) => void;
  onShowReadmeContent: (repos: string[]) => void;
}) {
  const repoNames = Array.isArray(data?.repo_names) ? data.repo_names : [];
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);

  const allSelected = repoNames.length > 0 && selectedRepos.length === repoNames.length;

  function updateSelection(next: string[]) {
    setSelectedRepos(next);
  }

  function toggleRepo(repoName: string) {
    const next = selectedRepos.includes(repoName)
      ? selectedRepos.filter((name) => name !== repoName)
      : [...selectedRepos, repoName];
    updateSelection(next);
  }

  function toggleAll() {
    const next = selectedRepos.length === repoNames.length ? [] : [...repoNames];
    updateSelection(next);
  }

  function resetSelection() {
    updateSelection([]);
  }

  function removeSelectedRepo(repoName: string) {
    const next = selectedRepos.filter((repo) => repo !== repoName);
    updateSelection(next);
  }

  return (
    <div className="rounded-xl p-4 bg-white text-slate-900 shadow space-y-3" style={{ borderTop: `4px solid ${themeColor}` }}>
      <h2 className="text-lg font-semibold">My GitHub Repositories</h2>
      <p className="text-sm text-slate-600">
        User: {data?.username || "not-set"} | Total Repositories: {data?.repo_count ?? repoNames.length}
      </p>
      <p className="text-sm text-slate-600">
        Selected repositories: {selectedRepos.length}
      </p>
      {selectedRepos.length > 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-700">
              Selected GitHub Repositories ({selectedRepos.length})
            </p>
            <button
              onClick={resetSelection}
              className="px-2 py-1 rounded text-xs border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            >
              Reset Selection
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedRepos.map((repo) => (
              <button
                key={repo}
                onClick={() => removeSelectedRepo(repo)}
                className="px-2 py-1 rounded-full text-xs border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                title={`Remove ${repo}`}
              >
                {repo} x
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onUseSelectedRepos(selectedRepos)}
          disabled={selectedRepos.length === 0}
          className="px-3 py-1.5 rounded-md text-sm border bg-slate-900 text-white border-slate-900 disabled:opacity-40"
        >
          Use Selected Repos in Chat
        </button>
        <button
          onClick={() => onShowFileTypes(selectedRepos)}
          disabled={selectedRepos.length === 0}
          className="px-3 py-1.5 rounded-md text-sm border bg-white text-slate-700 border-slate-300 disabled:opacity-40"
        >
          Show File Types for Selected
        </button>
        <button
          onClick={() => onShowReadmeContent(selectedRepos)}
          disabled={selectedRepos.length === 0}
          className="px-3 py-1.5 rounded-md text-sm border bg-white text-slate-700 border-slate-300 disabled:opacity-40"
        >
          Show README Content
        </button>
      </div>
      {data?.error ? <p className="text-sm text-red-600">{String(data.error)}</p> : null}
      {repoNames.length > 0 ? (
        <div className="rounded-xl bg-white text-slate-900 shadow p-4">
          <h3 className="text-base font-semibold mb-3">Repository Names</h3>
          <div className="overflow-auto max-h-96 border rounded-md">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-3 py-2 border-b font-semibold text-slate-700 whitespace-nowrap w-14">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all repositories"
                    />
                  </th>
                  <th className="text-left px-3 py-2 border-b font-semibold text-slate-700 whitespace-nowrap">
                    Repository
                  </th>
                </tr>
              </thead>
              <tbody>
                {repoNames.map((name: string) => (
                  <tr key={name} className="odd:bg-white even:bg-slate-50">
                    <td className="px-3 py-2 border-b align-top whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedRepos.includes(name)}
                        onChange={() => toggleRepo(name)}
                        aria-label={`Select ${name}`}
                      />
                    </td>
                    <td className="px-3 py-2 border-b align-top whitespace-nowrap">{name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function GithubRepoFileTypesCard({ themeColor, data }: { themeColor: string; data: any }) {
  const repos = Array.isArray(data?.repos) ? data.repos : [];
  const rows = repos.map((repo: any) => ({
    Repository: String(repo?.repo_name || ""),
    "Total Files": Number(repo?.total_files || 0),
    "File Type Count": Number(repo?.file_type_count || 0),
    "Top File Types": Array.isArray(repo?.file_types)
      ? repo.file_types.map((f: any) => `${String(f.extension)} (${Number(f.count || 0)})`).join(", ")
      : String(repo?.error || ""),
  }));

  return (
    <div className="rounded-xl p-4 bg-white text-slate-900 shadow space-y-3" style={{ borderTop: `4px solid ${themeColor}` }}>
      <h2 className="text-lg font-semibold">GitHub File Types by Repository</h2>
      <p className="text-sm text-slate-600">
        User: {data?.username || "not-set"} | Repositories scanned: {data?.repo_count ?? rows.length}
      </p>
      {data?.error ? <p className="text-sm text-red-600">{String(data.error)}</p> : null}
      {rows.length > 0 ? (
        <DataTable
          title="Repository File Type Summary"
          columns={["Repository", "Total Files", "File Type Count", "Top File Types"]}
          rows={rows}
          pageSize={10}
        />
      ) : null}
    </div>
  );
}

function GithubFileContentCard({ themeColor, data }: { themeColor: string; data: any }) {
  const repos = Array.isArray(data?.repos) ? data.repos : [];
  const raw = typeof data?.raw === "string" ? data.raw : "";
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 3;

  const filteredRepos = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return repos;

    return repos.filter((repo: any) => {
      const repoName = String(repo?.repo_name || "").toLowerCase();
      const matchedPath = String(repo?.matched_path || data?.file_name || "").toLowerCase();
      const content = String(repo?.content || "").toLowerCase();
      const error = String(repo?.error || "").toLowerCase();
      return (
        repoName.includes(query) ||
        matchedPath.includes(query) ||
        content.includes(query) ||
        error.includes(query)
      );
    });
  }, [repos, data?.file_name, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRepos.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pagedRepos = filteredRepos.slice(start, start + pageSize);

  return (
    <div className="rounded-xl p-4 bg-white text-slate-900 shadow space-y-3" style={{ borderTop: `4px solid ${themeColor}` }}>
      <h2 className="text-lg font-semibold">GitHub File Content</h2>
      <p className="text-sm text-slate-600">
        File: {String(data?.file_name || "README.md")} | User: {data?.username || "not-set"} | Repositories: {data?.repo_count ?? repos.length}
      </p>
      {data?.error ? <p className="text-sm text-red-600">{String(data.error)}</p> : null}
      {repos.length === 0 && raw ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-800 mb-2">
            Tool returned non-structured output. Showing raw response:
          </p>
          <pre className="text-xs whitespace-pre-wrap break-words bg-white border rounded p-3 max-h-80 overflow-auto">
            {raw}
          </pre>
        </div>
      ) : null}
      <input
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setPage(1);
        }}
        placeholder="Search by repo, path, content..."
        className="border rounded-md px-3 py-2 text-sm w-full"
      />

      <div className="space-y-3">
        {pagedRepos.map((repo: any) => {
          const repoName = String(repo?.repo_name || "");
          const matchedPath = String(repo?.matched_path || data?.file_name || "");
          const hasError = !!repo?.error;
          const content = String(repo?.content || "");
          return (
            <div key={`${repoName}-${matchedPath}`} className="rounded-lg border border-slate-200 p-3 bg-slate-50">
              <p className="text-sm font-semibold text-slate-800">{repoName || "Unknown Repository"}</p>
              <p className="text-xs text-slate-600 mb-2">Path: {matchedPath || "N/A"}</p>
              {hasError ? (
                <p className="text-sm text-red-600">{String(repo.error)}</p>
              ) : (
                <>
                  <pre className="text-xs whitespace-pre-wrap break-words bg-white border rounded p-3 max-h-80 overflow-auto">
                    {content}
                  </pre>
                  {repo?.truncated ? (
                    <p className="text-xs text-slate-500 mt-2">Content truncated for UI display.</p>
                  ) : null}
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
        <span>
          Showing {pagedRepos.length} of {filteredRepos.length} filtered repos ({repos.length} total)
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="px-2 py-1 border rounded disabled:opacity-40"
          >
            Prev
          </button>
          <span>
            Page {safePage} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="px-2 py-1 border rounded disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
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
  const { appendMessage } = useCopilotChat();

  const handleUseSelectedRepos = useCallback(async (selectedRepos: string[]) => {
    if (!selectedRepos.length) return;
    await appendMessage(
      new TextMessage({
        role: MessageRole.User,
        content: `Use only these selected repositories for my next GitHub questions: ${selectedRepos.join(", ")}.`,
      })
    );
  }, [appendMessage]);

  const handleShowFileTypesForSelected = useCallback(async (selectedRepos: string[]) => {
    if (!selectedRepos.length) return;
    await appendMessage(
      new TextMessage({
        role: MessageRole.User,
        content:
          `Show file types in these selected repositories only: ${selectedRepos.join(", ")}. ` +
          "Use get_github_repo_file_types with those repo names and return a table.",
      })
    );
  }, [appendMessage]);

  const handleShowReadmeContentForSelected = useCallback(async (selectedRepos: string[]) => {
    if (!selectedRepos.length) return;
    const selectedCount = selectedRepos.length;
    await appendMessage(
      new TextMessage({
        role: MessageRole.User,
        content:
          `Show README.md content for these selected repositories only: ${selectedRepos.join(", ")}. ` +
          `Use get_github_file_content with repo_names exactly as listed and limit_repos=${selectedCount}. ` +
          "Return one result per selected repository in UI.",
      })
    );
  }, [appendMessage]);

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
      name: "get_my_github_repos",
      parameters: [
        {
          name: "limit",
          description: "Maximum repository names to return.",
          required: false,
        },
      ],
      render: (props) => {
        const parsed = parseToolResult(props.result);
        return (
          <GithubRepoNamesCard
            themeColor={themeColor}
            data={parsed}
            onUseSelectedRepos={handleUseSelectedRepos}
            onShowFileTypes={handleShowFileTypesForSelected}
            onShowReadmeContent={handleShowReadmeContentForSelected}
          />
        );
      },
    },
    [themeColor, handleUseSelectedRepos, handleShowFileTypesForSelected, handleShowReadmeContentForSelected]
  );

  useRenderToolCall(
    {
      name: "get_github_repo_file_types",
      parameters: [
        {
          name: "repo_names",
          description: "Comma-separated repository names.",
          required: false,
        },
        {
          name: "limit_repos",
          description: "Maximum repositories to scan.",
          required: false,
        },
        {
          name: "max_extensions_per_repo",
          description: "Maximum file extensions to show per repository.",
          required: false,
        },
      ],
      render: (props) => {
        const parsed = parseToolResult(props.result);
        return <GithubRepoFileTypesCard themeColor={themeColor} data={parsed} />;
      },
    },
    [themeColor]
  );

  useRenderToolCall(
    {
      name: "get_github_file_content",
      parameters: [
        {
          name: "repo_names",
          description: "Comma-separated repository names.",
          required: false,
        },
        {
          name: "file_name",
          description: "File path or file name to fetch (example: README.md).",
          required: false,
        },
        {
          name: "max_chars",
          description: "Maximum characters per file content.",
          required: false,
        },
        {
          name: "limit_repos",
          description: "Maximum repositories to scan.",
          required: false,
        },
      ],
      render: (props) => {
        const parsed = parseToolResult(props.result);
        return <GithubFileContentCard themeColor={themeColor} data={parsed} />;
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
          Ask for CSV tables, KPI summaries, grouped analytics, and GitHub repository analysis.
        </p>

        <hr className="border-white/20 my-6" />
      </div>
    </div>
  );
}
