import {
  downloadCsv,
  downloadXlsx,
  escapeXml,
  type SpreadsheetColumn,
} from "../../../lib/spreadsheet-file";

export type RosterExportFormat = "pdf" | "xlsx" | "csv";

export type RosterExportColumn = SpreadsheetColumn;

function printPdf(title: string, columns: RosterExportColumn[], rows: string[][]): void {
  const popup = window.open("", "_blank", "noopener,noreferrer");
  if (!popup) throw new Error("เบราว์เซอร์บล็อกหน้าต่างสำหรับสร้าง PDF");
  const primaryColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--color-primary")
    .trim();
  const header = columns.map((column) => `<th>${escapeXml(column.label)}</th>`).join("");
  const body = rows.map((row) => `<tr>${row.map((value) => `<td>${escapeXml(value)}</td>`).join("")}</tr>`).join("");
  popup.document.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${escapeXml(title)}</title><style>@font-face{font-family:'TH Sarabun PSK';font-style:normal;font-weight:400;src:url('${window.location.origin}/fonts/thsarabunpsk-regular.ttf') format('truetype')}@font-face{font-family:'TH Sarabun PSK';font-style:normal;font-weight:700;src:url('${window.location.origin}/fonts/thsarabunpsk-bold.ttf') format('truetype')}@page{size:A4 landscape;margin:14mm}body{font-family:'TH Sarabun PSK',sans-serif;color:rgb(15 23 42)}h1{font-size:20px}table{width:100%;border-collapse:collapse;font-size:12px}th{background:${escapeXml(primaryColor || "currentColor")};color:white}th,td{border:1px solid rgb(203 213 225);padding:8px;text-align:left}</style></head><body><h1>${escapeXml(title)}</h1><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table><script>window.onload=()=>{window.print();window.close()}<${"/"}script></body></html>`);
  popup.document.close();
}

export function exportRosterFile(
  format: RosterExportFormat,
  filenameBase: string,
  title: string,
  columns: RosterExportColumn[],
  rows: string[][],
): void {
  if (format === "pdf") {
    printPdf(title, columns, rows);
    return;
  }
  const table = { columns, rows, sheetName: "\u0E23\u0E32\u0E22\u0E0A\u0E37\u0E48\u0E2D\u0E19\u0E31\u0E01\u0E40\u0E23\u0E35\u0E22\u0E19" };
  if (format === "xlsx") {
    downloadXlsx(filenameBase, table);
    return;
  }
  downloadCsv(filenameBase, table);
}
