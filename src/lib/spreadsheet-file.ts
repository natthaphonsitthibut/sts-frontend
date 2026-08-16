/**
 * Minimal spreadsheet writers shared by every download in the app. Kept
 * dependency-free on purpose: a stored (uncompressed) zip holding a single
 * inline-string worksheet is a valid .xlsx that Excel, Google Sheets and
 * LibreOffice all open, so no bundle cost is paid for exporting a flat table.
 */

export interface SpreadsheetColumn {
  key: string;
  label: string;
}

export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/**
 * Neutralizes a cell a spreadsheet would otherwise evaluate as a formula, so an
 * exported value can never execute in the recipient's spreadsheet app.
 */
export function safeSpreadsheetText(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string): string {
  return `"${safeSpreadsheetText(value).replaceAll('"', '""')}"`;
}

export function downloadBlob(blob: Blob, filename: string): void {
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

function createStoredZip(
  files: Array<{ name: string; content: string }>,
): Uint8Array<ArrayBuffer> {
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

/** Turns a column into a pick-list so a filler chooses instead of typing. */
export interface SpreadsheetListValidation {
  /** Zero-based column index the list applies to. */
  column: number;
  values: readonly string[];
  /** Extra empty rows below the data that also get the list. */
  spareRows?: number;
  errorTitle?: string;
  errorMessage?: string;
}

export interface SpreadsheetTable {
  columns: readonly SpreadsheetColumn[];
  rows: readonly string[][];
  /** Worksheet tab name; Excel caps it at 31 characters. */
  sheetName?: string;
  /** Per-column width in characters, in column order. */
  columnWidths?: readonly number[];
  listValidations?: readonly SpreadsheetListValidation[];
}

/**
 * Inline list validations are the widely-portable form (Excel, Google Sheets and
 * LibreOffice all honour them), but the formula is a single quoted string, so a
 * value containing a comma or a list over Excel's 255-character cap has to be
 * skipped rather than written as a file that opens broken.
 */
const MAX_INLINE_LIST_LENGTH = 255;

function buildDataValidations(
  validations: readonly SpreadsheetListValidation[],
  dataRowCount: number,
): string {
  const entries = validations
    .map((validation) => {
      const joined = validation.values.join(",");
      if (
        validation.values.length === 0 ||
        validation.values.some((value) => value.includes(",") || value.includes('"')) ||
        joined.length > MAX_INLINE_LIST_LENGTH
      ) {
        return null;
      }
      const letter = columnName(validation.column);
      const lastRow = dataRowCount + 1 + (validation.spareRows ?? 0);
      const error = validation.errorMessage
        ? ` errorTitle="${escapeXml(validation.errorTitle ?? "")}" error="${escapeXml(validation.errorMessage)}"`
        : "";
      return `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1"${error} sqref="${letter}2:${letter}${lastRow}"><formula1>"${escapeXml(joined)}"</formula1></dataValidation>`;
    })
    .filter((entry): entry is string => entry !== null);

  return entries.length > 0
    ? `<dataValidations count="${entries.length}">${entries.join("")}</dataValidations>`
    : "";
}

export function createXlsxBlob({
  columns,
  rows,
  sheetName = "Sheet1",
  columnWidths,
  listValidations,
}: SpreadsheetTable): Blob {
  const values = [columns.map((column) => column.label), ...rows];
  const sheetRows = values.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => {
      const reference = `${columnName(columnIndex)}${rowIndex + 1}`;
      return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(safeSpreadsheetText(value))}</t></is></c>`;
    }).join("");
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join("");
  // Element order follows the OOXML sheet schema: `cols` before `sheetData`,
  // `dataValidations` after it. Excel rejects the file outright if they swap.
  const cols = columnWidths?.length
    ? `<cols>${columnWidths
        .map(
          (width, index) =>
            `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`,
        )
        .join("")}</cols>`
    : "";
  const dataValidations = listValidations?.length
    ? buildDataValidations(listValidations, rows.length)
    : "";
  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${cols}<sheetData>${sheetRows}</sheetData>${dataValidations}</worksheet>`;
  const bytes = createStoredZip([
    { name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>` },
    { name: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escapeXml(sheetName.slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>` },
    { name: "xl/worksheets/sheet1.xml", content: worksheet },
  ]);
  return new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function createCsvBlob({ columns, rows }: SpreadsheetTable): Blob {
  // The BOM keeps Excel from reading Thai UTF-8 as the legacy code page.
  const csv = `\uFEFF${[columns.map((column) => column.label), ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n")}`;
  return new Blob([csv], { type: "text/csv;charset=utf-8" });
}

/** Writes the table as `<filenameBase>.xlsx` through the browser's download flow. */
export function downloadXlsx(filenameBase: string, table: SpreadsheetTable): void {
  downloadBlob(createXlsxBlob(table), `${filenameBase}.xlsx`);
}

export function downloadCsv(filenameBase: string, table: SpreadsheetTable): void {
  downloadBlob(createCsvBlob(table), `${filenameBase}.csv`);
}
