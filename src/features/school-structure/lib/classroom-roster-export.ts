export type RosterExportFormat = "pdf" | "xlsx" | "csv";

export interface RosterExportColumn {
  key: string;
  label: string;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function safeSpreadsheetText(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string): string {
  return `"${safeSpreadsheetText(value).replaceAll('"', '""')}"`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function uint16(value: number): Uint8Array {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function uint32(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value >>> 0, true);
  return bytes;
}

function joinBytes(parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createStoredZip(files: Array<{ name: string; content: string }>): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const content = encoder.encode(file.content);
    const checksum = crc32(content);
    const local = joinBytes([
      uint32(0x04034b50), uint16(20), uint16(0), uint16(0), uint16(0), uint16(0),
      uint32(checksum), uint32(content.byteLength), uint32(content.byteLength),
      uint16(name.byteLength), uint16(0), name, content,
    ]);
    localParts.push(local);
    centralParts.push(joinBytes([
      uint32(0x02014b50), uint16(20), uint16(20), uint16(0), uint16(0), uint16(0), uint16(0),
      uint32(checksum), uint32(content.byteLength), uint32(content.byteLength),
      uint16(name.byteLength), uint16(0), uint16(0), uint16(0), uint16(0), uint32(0),
      uint32(offset), name,
    ]));
    offset += local.byteLength;
  }

  const central = joinBytes(centralParts);
  return joinBytes([
    ...localParts,
    central,
    uint32(0x06054b50), uint16(0), uint16(0), uint16(files.length), uint16(files.length),
    uint32(central.byteLength), uint32(offset), uint16(0),
  ]);
}

function columnName(index: number): string {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

function createXlsx(columns: RosterExportColumn[], rows: string[][]): Uint8Array<ArrayBuffer> {
  const values = [columns.map((column) => column.label), ...rows];
  const sheetRows = values.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => {
      const reference = `${columnName(columnIndex)}${rowIndex + 1}`;
      return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(safeSpreadsheetText(value))}</t></is></c>`;
    }).join("");
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join("");
  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`;
  return createStoredZip([
    { name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>` },
    { name: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="รายชื่อนักเรียน" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>` },
    { name: "xl/worksheets/sheet1.xml", content: worksheet },
  ]);
}

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
  if (format === "xlsx") {
    const bytes = createXlsx(columns, rows);
    downloadBlob(
      new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      `${filenameBase}.xlsx`,
    );
    return;
  }
  const csv = `\uFEFF${[columns.map((column) => column.label), ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n")}`;
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${filenameBase}.csv`);
}
