import { describe, expect, it } from "vitest";
import {
  generateBulkParentTemplateCsv,
  normalizePhone,
  parseBulkParentCsv,
  parentDisplayName,
  parentRelation,
  validateBulkParentRows,
} from "@/lib/parents/bulk-csv";
import { classifyParentUserCase } from "@/lib/parents/cases";
import { generateTemporaryPassword } from "@/lib/parents/password";
import { buildCredentialsMessage } from "@/lib/parents/types";

function csvWithRows(...rows: string[]) {
  return `${generateBulkParentTemplateCsv()}${rows.join("\n")}\n`;
}

describe("bulk parent CSV template", () => {
  it("includes the required columns", () => {
    const csv = generateBulkParentTemplateCsv();
    expect(csv).toContain("S.No");
    expect(csv).toContain("Student Name");
    expect(csv).toContain("Father's Name");
    expect(csv).toContain("Mother's Name");
    expect(csv).toContain("Email ID");
    expect(csv).toContain("Phone Number");
  });

  it("parses filled rows including quoted parent names", () => {
    const rows = parseBulkParentCsv(
      csvWithRows(`1,Aarav Sharma,"Rajesh Sharma","Meela Sharma",parent1@school.com,9876543210`),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      serialNo: "1",
      studentName: "Aarav Sharma",
      fatherName: "Rajesh Sharma",
      motherName: "Meela Sharma",
      email: "parent1@school.com",
      phone: "9876543210",
    });
  });

  it("rejects Excel workbooks instead of silently parsing garbage", () => {
    expect(() => parseBulkParentCsv("PK\u0003\u0004xlsx")).toThrow(/CSV template/);
  });
});

describe("bulk parent validation", () => {
  it("requires student name, a parent name, email, and phone", () => {
    const parsed = parseBulkParentCsv(csvWithRows("1,,,,,"));
    const { valid, failed } = validateBulkParentRows(parsed);
    expect(valid).toHaveLength(0);
    expect(failed[0]?.reason).toMatch(/Student Name is required/);
    expect(failed[0]?.reason).toMatch(/Father's Name or Mother's Name is required/);
    expect(failed[0]?.reason).toMatch(/Email ID is required/);
    expect(failed[0]?.reason).toMatch(/Phone Number is required/);
  });

  it("accepts a row with only a parent name and a valid Indian mobile number", () => {
    const parsed = parseBulkParentCsv(
      csvWithRows("1,Diya,,Anita Reddy,anita@school.com,+91 9123456789"),
    );
    const { valid, failed } = validateBulkParentRows(parsed);
    expect(failed).toHaveLength(0);
    expect(valid[0]?.phone).toBe("9123456789");
    expect(parentDisplayName(valid[0]!)).toBe("Anita Reddy");
    expect(parentRelation(valid[0]!)).toBe("mother");
  });

  it("detects duplicate student-parent mappings in the file", () => {
    const parsed = parseBulkParentCsv(
      csvWithRows(
        "1,Aarav,Rajesh,Meela,family@school.com,9876543210",
        "2,Aarav,Rajesh,Meela,family@school.com,9876543210",
      ),
    );
    const { valid, failed } = validateBulkParentRows(parsed);
    expect(valid).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(failed[0]?.reason).toMatch(/Duplicate student-parent mapping/);
  });

  it("allows the same parent email for two different children", () => {
    const parsed = parseBulkParentCsv(
      csvWithRows(
        "1,Aarav,Rajesh,Meela,family@school.com,9876543210",
        "2,Ananya,Rajesh,Meela,family@school.com,9876543210",
      ),
    );
    const { valid, failed } = validateBulkParentRows(parsed);
    expect(failed).toHaveLength(0);
    expect(valid).toHaveLength(2);
  });

  it("rejects the same email with conflicting phone numbers", () => {
    const parsed = parseBulkParentCsv(
      csvWithRows(
        "1,Aarav,Rajesh,Meela,family@school.com,9876543210",
        "2,Ananya,Rajesh,Meela,family@school.com,9123456789",
      ),
    );
    const { failed } = validateBulkParentRows(parsed);
    expect(failed[0]?.reason).toMatch(/different phone/);
  });

  it("detects duplicate serial numbers", () => {
    const parsed = parseBulkParentCsv(
      csvWithRows(
        "1,Aarav,Rajesh,,a@school.com,9876543210",
        "1,Ananya,Rajesh,,b@school.com,9123456789",
      ),
    );
    const { failed } = validateBulkParentRows(parsed);
    expect(failed.some((row) => row.reason.includes("Duplicate S.No"))).toBe(true);
  });
});

describe("phone normalization", () => {
  it("accepts 10-digit, +91, and leading-zero Indian numbers", () => {
    expect(normalizePhone("9876543210")).toBe("9876543210");
    expect(normalizePhone("+91 98765 43210")).toBe("9876543210");
    expect(normalizePhone("09876543210")).toBe("9876543210");
  });

  it("rejects landline-like and too-short numbers", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("0876543210")).toBeNull();
  });
});

describe("parent user cases", () => {
  it("creates a user when none exists", () => {
    expect(classifyParentUserCase(null)).toBe("create");
  });

  it("adds the Parent role when the user exists with another role", () => {
    expect(classifyParentUserCase({ memberships: [{ role: "TEACHER", isActive: true }] })).toBe(
      "add_role",
    );
  });

  it("links a new child when the user already has the Parent role", () => {
    expect(
      classifyParentUserCase({
        memberships: [
          { role: "TEACHER", isActive: true },
          { role: "PARENT", isActive: true },
        ],
      }),
    ).toBe("existing_parent");
  });
});

describe("temporary passwords and credential copy", () => {
  it("generates a unique temporary password for new users only", () => {
    const first = generateTemporaryPassword();
    const second = generateTemporaryPassword();
    expect(first).toHaveLength(12);
    expect(second).toHaveLength(12);
    expect(first).not.toBe(second);
  });

  it("formats login credentials for the admin report", () => {
    const message = buildCredentialsMessage({
      schoolName: "Demo School",
      email: "parent@school.com",
      temporaryPassword: "TempPass!23",
      loginUrl: "http://localhost:3000/login",
    });
    expect(message).toContain("parent@school.com");
    expect(message).toContain("TempPass!23");
    expect(message).toContain("change this password");
  });
});
