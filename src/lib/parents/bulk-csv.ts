export const BULK_PARENT_TEMPLATE_HEADERS = [
  "S.No",
  "Student Name",
  "Father's Name",
  "Mother's Name",
  "Email ID",
  "Phone Number",
] as const;

export type BulkParentField =
  | "serialNo"
  | "studentName"
  | "fatherName"
  | "motherName"
  | "email"
  | "phone";

export interface BulkParentRow {
  rowNumber: number;
  serialNo: string;
  studentName: string;
  fatherName: string;
  motherName: string;
  email: string;
  phone: string;
}

export interface BulkParentFailure {
  rowNumber: number;
  serialNo: string;
  studentName: string;
  email: string;
  reason: string;
}

export interface BulkParentValidationResult {
  valid: BulkParentRow[];
  failed: BulkParentFailure[];
}

const HEADER_ALIASES: Record<string, BulkParentField> = {
  "s.no": "serialNo",
  "s no": "serialNo",
  sno: "serialNo",
  "sl no": "serialNo",
  "sl.no": "serialNo",
  "serial no": "serialNo",
  "serial number": "serialNo",
  "student name": "studentName",
  student: "studentName",
  "father's name": "fatherName",
  "fathers name": "fatherName",
  "father name": "fatherName",
  father: "fatherName",
  "mother's name": "motherName",
  "mothers name": "motherName",
  "mother name": "motherName",
  mother: "motherName",
  "email id": "email",
  email: "email",
  "phone number": "phone",
  phone: "phone",
  mobile: "phone",
  "mobile number": "phone",
  "mobile no": "phone",
};

export function generateBulkParentTemplateCsv(): string {
  return BULK_PARENT_TEMPLATE_HEADERS.join(",") + "\n";
}

export function parseCsv(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!input.trim()) return [];

  const delimiter = inferDelimiter(input);
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;

    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === delimiter) {
      current.push(field);
      field = "";
      continue;
    }

    if (ch === "\n") {
      current.push(field);
      field = "";
      if (current.some((cell) => cell.trim() !== "")) {
        rows.push(current);
      }
      current = [];
      continue;
    }

    field += ch;
  }

  current.push(field);
  if (current.some((cell) => cell.trim() !== "")) {
    rows.push(current);
  }

  return rows;
}

function inferDelimiter(input: string): string {
  const firstLine = input.split("\n").find((line) => line.trim()) ?? "";
  const counts: Array<[string, number]> = [
    [",", (firstLine.match(/,/g) ?? []).length],
    [";", (firstLine.match(/;/g) ?? []).length],
    ["\t", (firstLine.match(/\t/g) ?? []).length],
  ];
  const winner = counts.sort((a, b) => b[1] - a[1])[0];
  return winner && winner[1] > 0 ? winner[0] : ",";
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function parseRowsToRecords(grid: string[][]): BulkParentRow[] {
  if (grid.length === 0) return [];

  const headerCells = grid[0]!.map(normalizeHeader);
  const indexByField = new Map<BulkParentField, number>();

  headerCells.forEach((header, index) => {
    const field = HEADER_ALIASES[header];
    if (field && !indexByField.has(field)) {
      indexByField.set(field, index);
    }
  });

  const requiredHeaders: BulkParentField[] = [
    "studentName",
    "fatherName",
    "motherName",
    "email",
    "phone",
  ];
  const missing = requiredHeaders.filter((field) => !indexByField.has(field));
  if (missing.length > 0) {
    throw new Error(
      `Invalid template headers. Required columns: ${BULK_PARENT_TEMPLATE_HEADERS.join(", ")}`,
    );
  }

  return grid.slice(1).map((cells, i) => {
    const get = (field: BulkParentField) => {
      const idx = indexByField.get(field);
      return idx === undefined ? "" : (cells[idx] ?? "").trim();
    };

    return {
      rowNumber: i + 2,
      serialNo: get("serialNo"),
      studentName: get("studentName"),
      fatherName: get("fatherName"),
      motherName: get("motherName"),
      email: get("email"),
      phone: get("phone"),
    };
  });
}

export function parseBulkParentCsv(text: string): BulkParentRow[] {
  if (text.startsWith("PK") || text.includes("xl/workbook")) {
    throw new Error("Please upload the CSV template. Save your Excel file as CSV (UTF-8) before uploading.");
  }
  return parseRowsToRecords(parseCsv(text));
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePersonName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  let local = digits;
  if (digits.length === 12 && digits.startsWith("91")) local = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) local = digits.slice(1);

  if (local.length === 10 && /^[6-9]/.test(local)) return local;
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parentDisplayName(row: Pick<BulkParentRow, "fatherName" | "motherName">): string {
  return normalizePersonName(row.fatherName) || normalizePersonName(row.motherName);
}

export function parentRelation(row: Pick<BulkParentRow, "fatherName" | "motherName">): string {
  return normalizePersonName(row.fatherName) ? "father" : "mother";
}

export function validateBulkParentRows(rows: BulkParentRow[]): BulkParentValidationResult {
  const failed: BulkParentFailure[] = [];
  const valid: BulkParentRow[] = [];

  const seenSerial = new Map<string, number>();
  const seenPair = new Map<string, number>();
  const identityByEmail = new Map<string, { phone: string; name: string; rowNumber: number }>();

  for (const row of rows) {
    const reasons: string[] = [];
    const studentName = normalizePersonName(row.studentName);
    const fatherName = normalizePersonName(row.fatherName);
    const motherName = normalizePersonName(row.motherName);
    const email = normalizeEmail(row.email);
    const phone = normalizePhone(row.phone);

    if (!studentName) reasons.push("Student Name is required");
    if (!fatherName && !motherName) reasons.push("Father's Name or Mother's Name is required");
    if (!row.email.trim()) reasons.push("Email ID is required");
    else if (!EMAIL_RE.test(email)) reasons.push("Email ID is invalid");
    if (!row.phone.trim()) reasons.push("Phone Number is required");
    else if (!phone) reasons.push("Phone Number is invalid (use a 10-digit Indian mobile number)");

    const serialKey = row.serialNo.trim();
    if (serialKey) {
      const previous = seenSerial.get(serialKey);
      if (previous) reasons.push(`Duplicate S.No '${serialKey}' (also on row ${previous})`);
      else seenSerial.set(serialKey, row.rowNumber);
    }

    if (studentName && email && EMAIL_RE.test(email)) {
      const pairKey = `${email}::${studentName.toLowerCase()}`;
      const previous = seenPair.get(pairKey);
      if (previous) {
        reasons.push(`Duplicate student-parent mapping in this file (also on row ${previous})`);
      } else {
        seenPair.set(pairKey, row.rowNumber);
      }
    }

    if (email && EMAIL_RE.test(email) && phone) {
      const displayName = fatherName || motherName;
      const previous = identityByEmail.get(email);
      if (previous) {
        if (previous.phone !== phone) {
          reasons.push(`Email already used in this file with a different phone (row ${previous.rowNumber})`);
        }
        if (previous.name.toLowerCase() !== displayName.toLowerCase()) {
          reasons.push(
            `Email already used in this file with a different parent name (row ${previous.rowNumber})`,
          );
        }
      } else {
        identityByEmail.set(email, { phone, name: displayName, rowNumber: row.rowNumber });
      }
    }

    if (reasons.length > 0) {
      failed.push({
        rowNumber: row.rowNumber,
        serialNo: row.serialNo,
        studentName: row.studentName,
        email: row.email,
        reason: reasons.join("; "),
      });
      continue;
    }

    valid.push({
      ...row,
      studentName,
      fatherName,
      motherName,
      email,
      phone: phone!,
    });
  }

  return { valid, failed };
}
