"use client";

import { useState } from "react";

export default function CsvQueryBuilder({
  onRunQuery,
  disabled,
}: {
  onRunQuery: (prompt: string) => Promise<void>;
  disabled?: boolean;
}) {
  const [groupByColumn, setGroupByColumn] = useState("Department");
  const [operation, setOperation] = useState("count");
  const [targetColumn, setTargetColumn] = useState("Salary");
  const [limit, setLimit] = useState(0);
  const [descending, setDescending] = useState(true);

  const needsTargetColumn = operation !== "count";

  async function submit() {
    const targetPart = needsTargetColumn
      ? `, target_column=\"${targetColumn}\"`
      : "";
    const prompt =
      `Run group_by_csv for file_name=\"sample.csv\" with ` +
      `group_by_column=\"${groupByColumn}\", operation=\"${operation}\"${targetPart}, ` +
      `limit=${limit}, descending=${descending}. ` +
      `Then explain the result in 1-2 lines.`;

    await onRunQuery(prompt);
  }

  return (
    <div className="rounded-xl bg-white text-slate-900 shadow p-4">
      <h3 className="text-base font-semibold mb-3">CSV Query Builder</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <label className="text-sm">
          <span className="block text-slate-600 mb-1">Group By</span>
          <select
            value={groupByColumn}
            onChange={(e) => setGroupByColumn(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="Department">Department</option>
            <option value="Name">Name</option>
            <option value="ID">ID</option>
          </select>
        </label>

        <label className="text-sm">
          <span className="block text-slate-600 mb-1">Operation</span>
          <select
            value={operation}
            onChange={(e) => setOperation(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="count">count</option>
            <option value="sum">sum</option>
            <option value="avg">avg</option>
            <option value="min">min</option>
            <option value="max">max</option>
          </select>
        </label>

        <label className="text-sm">
          <span className="block text-slate-600 mb-1">Target Column</span>
          <select
            value={targetColumn}
            onChange={(e) => setTargetColumn(e.target.value)}
            disabled={!needsTargetColumn}
            className="w-full border rounded-md px-3 py-2 disabled:bg-slate-100"
          >
            <option value="Salary">Salary</option>
            <option value="ID">ID</option>
          </select>
        </label>

        <label className="text-sm">
          <span className="block text-slate-600 mb-1">Limit (0 = all)</span>
          <input
            type="number"
            min={0}
            value={limit}
            onChange={(e) => setLimit(Math.max(0, Number(e.target.value) || 0))}
            className="w-full border rounded-md px-3 py-2"
          />
        </label>

        <label className="text-sm flex items-end">
          <span className="inline-flex items-center gap-2 border rounded-md px-3 py-2 w-full">
            <input
              type="checkbox"
              checked={descending}
              onChange={(e) => setDescending(e.target.checked)}
            />
            <span>Sort Descending</span>
          </span>
        </label>
      </div>

      <div className="mt-4 flex gap-2 flex-wrap">
        <button
          onClick={submit}
          disabled={disabled}
          className="px-4 py-2 rounded-md bg-slate-900 text-white disabled:opacity-50"
        >
          Run Group Query
        </button>
      </div>
    </div>
  );
}
