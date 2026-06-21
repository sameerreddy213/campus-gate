/**
 * Convert an array of row objects to CSV and trigger a browser download.
 *
 * @param filename Name of the downloaded file (".csv" appended if missing).
 * @param columns  Ordered column definitions mapping a header to a value getter.
 * @param rows     The data rows.
 */
export function exportToCsv<T>(
  filename: string,
  columns: { header: string; value: (row: T) => unknown }[],
  rows: T[]
): void {
  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    let str = String(val);
    // Neutralize spreadsheet formula injection: a cell starting with = + - @ (or a
    // leading tab/CR) is treated as a formula by Excel/Sheets. Prefix with a single
    // quote so it's rendered as literal text. (CWE-1236)
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    // Quote if the value contains comma, quote, or newline; double up quotes.
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = columns.map((c) => escape(c.header)).join(",");
  const dataLines = rows.map((row) =>
    columns.map((c) => escape(c.value(row))).join(",")
  );
  const csv = [headerLine, ...dataLines].join("\r\n");

  // Prepend BOM so Excel reads UTF-8 correctly.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Format a date value for CSV/exports; returns "" for empty/invalid dates. */
export function formatDate(value: unknown): string {
  if (!value) return "";
  const d = new Date(value as string);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
