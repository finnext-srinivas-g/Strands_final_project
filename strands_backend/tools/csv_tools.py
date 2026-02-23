import csv
import os
from collections import Counter
from typing import Any

from strands import tool


BASE_DIR = os.path.dirname(os.path.dirname(__file__))


def _load_csv_rows(file_name: str = "sample.csv") -> tuple[list[str], list[dict[str, Any]], str]:
    if os.path.isabs(file_name):
        csv_path = file_name
    else:
        root_path = os.path.join(BASE_DIR, file_name)
        data_path = os.path.join(BASE_DIR, "data", file_name)
        csv_path = root_path if os.path.exists(root_path) else data_path
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"CSV file not found: {file_name}")

    with open(csv_path, "r", encoding="utf-8", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        rows = list(reader)
        fieldnames = reader.fieldnames or []

    return fieldnames, rows, csv_path


def _slice_rows(rows: list[dict[str, Any]], limit: int) -> list[dict[str, Any]]:
    if limit <= 0:
        return rows
    return rows[:limit]


def _to_number(value: Any) -> float | None:
    if value is None:
        return None
    text = str(value).strip().replace(",", "").replace("$", "")
    if text == "":
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _find_column(headers: list[str], candidates: list[str]) -> str | None:
    normalized_to_original = {h.strip().lower(): h for h in headers}
    normalized_headers = list(normalized_to_original.keys())

    for candidate in candidates:
        candidate_norm = candidate.strip().lower()
        if candidate_norm in normalized_to_original:
            return normalized_to_original[candidate_norm]

    for candidate in candidates:
        candidate_norm = candidate.strip().lower()
        for header_norm in normalized_headers:
            if candidate_norm in header_norm:
                return normalized_to_original[header_norm]

    return None


def _canonical_operation(operation: str) -> str:
    op = (operation or "").strip().lower()
    aliases = {
        "count": "count",
        "cnt": "count",
        "sum": "sum",
        "total": "sum",
        "avg": "avg",
        "average": "avg",
        "mean": "avg",
        "min": "min",
        "minimum": "min",
        "max": "max",
        "maximum": "max",
    }
    return aliases.get(op, op)


@tool
def get_csv_preview(file_name: str = "sample.csv", limit: int = 0) -> dict[str, Any]:
    """Return CSV rows for UI rendering. Use limit=0 to return all rows."""
    headers, rows, csv_path = _load_csv_rows(file_name)
    shown_rows = _slice_rows(rows, limit)

    return {
        "file": os.path.basename(csv_path),
        "columns": headers,
        "row_count": len(rows),
        "rows": shown_rows,
        "shown_row_count": len(shown_rows),
    }


@tool
def query_csv_data(query: str, file_name: str = "sample.csv", limit: int = 0) -> dict[str, Any]:
    """Search CSV rows by keyword across all columns. Use limit=0 for all matches."""
    headers, rows, csv_path = _load_csv_rows(file_name)
    normalized_query = (query or "").strip().lower()

    if not normalized_query:
        matches = _slice_rows(rows, limit)
    else:
        matches = []
        for row in rows:
            row_text = " ".join(str(value) for value in row.values()).lower()
            if normalized_query in row_text:
                matches.append(row)
                if limit > 0 and len(matches) >= limit:
                    break

    return {
        "file": os.path.basename(csv_path),
        "query": query,
        "columns": headers,
        "row_count": len(rows),
        "matched_row_count": len(matches),
        "rows": matches,
    }


@tool
def group_by_csv(
    group_by_column: str,
    operation: str = "count",
    target_column: str = "",
    file_name: str = "sample.csv",
    limit: int = 0,
    descending: bool = True,
) -> dict[str, Any]:
    """Group CSV by a column and run aggregate operation: count/sum/avg/min/max."""
    headers, rows, csv_path = _load_csv_rows(file_name)
    op = _canonical_operation(operation)
    allowed_ops = {"count", "sum", "avg", "min", "max"}

    if op not in allowed_ops:
        return {
            "file": os.path.basename(csv_path),
            "error": f"Unsupported operation '{operation}'. Use one of: count, sum, avg, min, max.",
            "columns": [],
            "rows": [],
        }

    group_col = _find_column(headers, [group_by_column])
    if not group_col:
        return {
            "file": os.path.basename(csv_path),
            "error": f"Group-by column '{group_by_column}' not found.",
            "available_columns": headers,
            "columns": [],
            "rows": [],
        }

    value_col = _find_column(headers, [target_column]) if target_column else None
    if op != "count" and not value_col:
        return {
            "file": os.path.basename(csv_path),
            "error": f"Target column '{target_column}' not found for operation '{op}'.",
            "available_columns": headers,
            "columns": [],
            "rows": [],
        }

    grouped: dict[str, list[float]] = {}
    for row in rows:
        key = str(row.get(group_col, "")).strip() or "Unknown"
        grouped.setdefault(key, [])
        if op == "count":
            grouped[key].append(1.0)
        else:
            numeric_value = _to_number(row.get(value_col)) if value_col else None
            if numeric_value is not None:
                grouped[key].append(numeric_value)

    result_rows: list[dict[str, Any]] = []
    result_key = f"{op}_{value_col}" if op != "count" else "count"
    for group_value, values in grouped.items():
        if op == "count":
            agg_value = len(values)
        elif not values:
            agg_value = None
        elif op == "sum":
            agg_value = sum(values)
        elif op == "avg":
            agg_value = sum(values) / len(values)
        elif op == "min":
            agg_value = min(values)
        else:
            agg_value = max(values)
        result_rows.append(
            {
                group_col: group_value,
                result_key: agg_value,
                "records": len(values),
            }
        )

    result_rows.sort(
        key=lambda item: (
            item.get(result_key) is None,
            item.get(result_key) if item.get(result_key) is not None else 0,
        ),
        reverse=descending,
    )
    if limit > 0:
        result_rows = result_rows[:limit]

    return {
        "file": os.path.basename(csv_path),
        "operation": op,
        "group_by_column": group_col,
        "target_column": value_col,
        "row_count": len(rows),
        "grouped_row_count": len(result_rows),
        "columns": [group_col, result_key, "records"],
        "rows": result_rows,
    }


@tool
def answer_csv_question(question: str, file_name: str = "sample.csv") -> dict[str, Any]:
    """Answer analytical questions about CSV data (salary, employees, departments, counts)."""
    headers, rows, csv_path = _load_csv_rows(file_name)
    question_norm = (question or "").strip().lower()
    row_count = len(rows)

    salary_col = _find_column(headers, ["salary", "pay", "income", "wage", "compensation"])
    department_col = _find_column(headers, ["department", "dept", "team", "division"])
    employee_col = _find_column(headers, ["employee", "name", "employee_name", "staff"])

    if salary_col:
        numeric_rows = []
        for row in rows:
            numeric_value = _to_number(row.get(salary_col))
            if numeric_value is not None:
                numeric_rows.append((row, numeric_value))
    else:
        numeric_rows = []

    if salary_col and numeric_rows and (
        ("highest" in question_norm or "max" in question_norm) and "salary" in question_norm
    ):
        top_row, top_salary = max(numeric_rows, key=lambda item: item[1])
        employee_name = top_row.get(employee_col) if employee_col else None
        answer = f"Highest salary is {top_salary:g}."
        if employee_name:
            answer = f"Highest salary is {top_salary:g} ({employee_name})."
        return {
            "file": os.path.basename(csv_path),
            "question": question,
            "answer": answer,
            "metric": "highest_salary",
            "salary_column": salary_col,
            "value": top_salary,
            "row": top_row,
            "row_count": row_count,
        }

    if salary_col and numeric_rows and (
        ("lowest" in question_norm or "min" in question_norm) and "salary" in question_norm
    ):
        low_row, low_salary = min(numeric_rows, key=lambda item: item[1])
        employee_name = low_row.get(employee_col) if employee_col else None
        answer = f"Lowest salary is {low_salary:g}."
        if employee_name:
            answer = f"Lowest salary is {low_salary:g} ({employee_name})."
        return {
            "file": os.path.basename(csv_path),
            "question": question,
            "answer": answer,
            "metric": "lowest_salary",
            "salary_column": salary_col,
            "value": low_salary,
            "row": low_row,
            "row_count": row_count,
        }

    if salary_col and numeric_rows and ("average" in question_norm or "avg" in question_norm) and "salary" in question_norm:
        avg_salary = sum(value for _, value in numeric_rows) / len(numeric_rows)
        return {
            "file": os.path.basename(csv_path),
            "question": question,
            "answer": f"Average salary is {avg_salary:.2f}.",
            "metric": "average_salary",
            "salary_column": salary_col,
            "value": avg_salary,
            "row_count": row_count,
        }

    if ("how many employees" in question_norm) or ("number of employees" in question_norm):
        return {
            "file": os.path.basename(csv_path),
            "question": question,
            "answer": f"There are {row_count} employees in the CSV data.",
            "metric": "employee_count",
            "value": row_count,
            "row_count": row_count,
        }

    if department_col and (
        ("how many departments" in question_norm)
        or ("number of departments" in question_norm)
        or ("unique departments" in question_norm)
    ):
        unique_departments = sorted({str(row.get(department_col, "")).strip() for row in rows if str(row.get(department_col, "")).strip()})
        return {
            "file": os.path.basename(csv_path),
            "question": question,
            "answer": f"There are {len(unique_departments)} departments in the CSV data.",
            "metric": "department_count",
            "department_column": department_col,
            "value": len(unique_departments),
            "departments": unique_departments,
            "row_count": row_count,
        }

    if department_col and ("department" in question_norm) and (
        ("each" in question_norm and "how many" in question_norm)
        or ("per department" in question_norm)
        or ("department wise" in question_norm)
        or ("department-wise" in question_norm)
    ):
        grouped_result = group_by_csv(
            group_by_column=department_col,
            operation="count",
            file_name=file_name,
            limit=0,
            descending=True,
        )
        department_counts = {
            row[department_col]: int(row["count"])
            for row in grouped_result.get("rows", [])
            if department_col in row and "count" in row
        }
        return {
            "file": os.path.basename(csv_path),
            "question": question,
            "answer": "Employee count by department computed successfully.",
            "metric": "employees_per_department",
            "department_column": department_col,
            "department_counts": department_counts,
            "row_count": row_count,
        }

    summary: dict[str, Any] = {
        "file": os.path.basename(csv_path),
        "question": question,
        "answer": "I could not map that to a specific metric, so here is a dataset summary.",
        "metric": "summary",
        "row_count": row_count,
        "columns": headers,
    }

    if salary_col and numeric_rows:
        values = [value for _, value in numeric_rows]
        summary["salary_summary"] = {
            "column": salary_col,
            "min": min(values),
            "max": max(values),
            "avg": sum(values) / len(values),
        }

    if department_col:
        counts = Counter()
        for row in rows:
            key = str(row.get(department_col, "")).strip() or "Unknown"
            counts[key] += 1
        summary["department_counts"] = dict(sorted(counts.items(), key=lambda item: item[0].lower()))

    return summary


@tool
def get_csv_summary(file_name: str = "sample.csv") -> dict[str, Any]:
    """Return deterministic KPI summary for CSV dashboard cards/charts."""
    headers, rows, csv_path = _load_csv_rows(file_name)
    row_count = len(rows)

    salary_col = _find_column(headers, ["salary", "pay", "income", "wage", "compensation"])
    department_col = _find_column(headers, ["department", "dept", "team", "division"])
    employee_col = _find_column(headers, ["employee", "name", "employee_name", "staff"])

    result: dict[str, Any] = {
        "file": os.path.basename(csv_path),
        "row_count": row_count,
        "columns": headers,
    }

    if department_col:
        counts = Counter()
        for row in rows:
            key = str(row.get(department_col, "")).strip() or "Unknown"
            counts[key] += 1
        result["department_column"] = department_col
        result["department_count"] = len(counts)
        result["department_counts"] = dict(sorted(counts.items(), key=lambda item: item[0].lower()))
    else:
        result["department_count"] = None
        result["department_counts"] = {}

    numeric_rows: list[tuple[dict[str, Any], float]] = []
    if salary_col:
        for row in rows:
            numeric_value = _to_number(row.get(salary_col))
            if numeric_value is not None:
                numeric_rows.append((row, numeric_value))

    if salary_col and numeric_rows:
        high_row, high_value = max(numeric_rows, key=lambda item: item[1])
        low_row, low_value = min(numeric_rows, key=lambda item: item[1])
        avg_value = sum(value for _, value in numeric_rows) / len(numeric_rows)
        result["salary_column"] = salary_col
        result["highest_salary"] = high_value
        result["lowest_salary"] = low_value
        result["average_salary"] = round(avg_value, 2)
        result["highest_salary_employee"] = high_row.get(employee_col) if employee_col else None
        result["lowest_salary_employee"] = low_row.get(employee_col) if employee_col else None
    else:
        result["salary_column"] = salary_col
        result["highest_salary"] = None
        result["lowest_salary"] = None
        result["average_salary"] = None
        result["highest_salary_employee"] = None
        result["lowest_salary_employee"] = None

    if department_col and salary_col:
        by_department: dict[str, list[float]] = {}
        for row in rows:
            dept = str(row.get(department_col, "")).strip() or "Unknown"
            value = _to_number(row.get(salary_col))
            if value is None:
                continue
            by_department.setdefault(dept, []).append(value)
        result["avg_salary_by_department"] = {
            dept: round(sum(values) / len(values), 2)
            for dept, values in sorted(by_department.items(), key=lambda item: item[0].lower())
            if values
        }
    else:
        result["avg_salary_by_department"] = {}

    return result
