"use client";

import { useMemo, useState } from "react";

type Row = Record<string, unknown>;

function isNumericLike(value: unknown): boolean {
  if (value === null || typeof value === "undefined") return false;
  const num = Number(String(value).replace(/[$,]/g, ""));
  return Number.isFinite(num);
}

function compareValues(a: unknown, b: unknown): number {
  const aNumeric = isNumericLike(a);
  const bNumeric = isNumericLike(b);

  if (aNumeric && bNumeric) {
    const aNum = Number(String(a).replace(/[$,]/g, ""));
    const bNum = Number(String(b).replace(/[$,]/g, ""));
    return aNum - bNum;
  }

  return String(a ?? "").localeCompare(String(b ?? ""), undefined, {
    sensitivity: "base",
    numeric: true,
  });
}

export default function DataTable({
  title,
  columns,
  rows,
  pageSize = 10,
}: {
  title?: string;
  columns: string[];
  rows: Row[];
  pageSize?: number;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(columns[0] ?? null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((row) =>
      columns.some((col) => String(row[col] ?? "").toLowerCase().includes(query))
    );
  }, [rows, columns, searchTerm]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    const copy = [...filteredRows];
    copy.sort((a, b) => {
      const base = compareValues(a[sortKey], b[sortKey]);
      return sortDir === "asc" ? base : -base;
    });
    return copy;
  }, [filteredRows, sortKey, sortDir]);

  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / safePageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * safePageSize;
  const pagedRows = sortedRows.slice(start, start + safePageSize);

  function onSort(col: string) {
    if (sortKey === col) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(col);
    setSortDir("asc");
  }

  return (
    <div className="rounded-xl bg-white text-slate-900 shadow p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
        <h3 className="text-base font-semibold">{title || "Data Table"}</h3>
        <input
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
          placeholder="Search rows..."
          className="border rounded-md px-3 py-2 text-sm w-full md:w-72"
        />
      </div>

      <div className="overflow-auto max-h-96 border rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 sticky top-0 z-10">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  onClick={() => onSort(column)}
                  className="text-left px-3 py-2 border-b font-semibold text-slate-700 whitespace-nowrap cursor-pointer"
                >
                  {column}
                  {sortKey === column ? (sortDir === "asc" ? "  ?" : "  ?") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="odd:bg-white even:bg-slate-50">
                {columns.map((column) => (
                  <td key={`${rowIndex}-${column}`} className="px-3 py-2 border-b align-top whitespace-nowrap">
                    {String(row[column] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
            {pagedRows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-slate-500" colSpan={Math.max(columns.length, 1)}>
                  No rows found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3 text-xs text-slate-600">
        <span>
          Showing {pagedRows.length} of {sortedRows.length} filtered rows ({rows.length} total)
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
