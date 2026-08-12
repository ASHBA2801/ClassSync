// Diagnostic: Prisma UserSchoolMembership unique key mismatch
const fs = require("fs");
const path = require("path");

const ENDPOINT = "http://127.0.0.1:7551/ingest/da337647-eb30-41e2-999b-6c664a0a398f";
const SESSION = "9aeaec";

async function log(hypothesisId, location, message, data) {
  const payload = {
    sessionId: SESSION,
    runId: "pre-fix",
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": SESSION },
    body: JSON.stringify(payload),
  }).catch(() => {});
  console.log(JSON.stringify(payload));
}

async function main() {
  const schema = fs.readFileSync(path.join(process.cwd(), "prisma/schema.prisma"), "utf8");
  const membershipBlock = schema.match(/model UserSchoolMembership \{[\s\S]*?\n\}/)?.[0] ?? "";
  const uniqueLines = [...membershipBlock.matchAll(/@@unique\(\[([^\]]+)\]\)/g)].map((m) => m[1]);

  // #region agent log
  await log("A", "debug-prisma-unique.mjs:schema", "UserSchoolMembership unique constraints in schema", {
    uniqueLines,
    hasUserIdSchoolId: uniqueLines.some((u) => u.replace(/\s/g, "") === "userId,schoolId"),
    hasUserIdSchoolIdRole: uniqueLines.some((u) => u.replace(/\s/g, "") === "userId,schoolId,role"),
  });
  // #endregion

  const clientPath = path.join(process.cwd(), "node_modules/.prisma/client/index.d.ts");
  const client = fs.readFileSync(clientPath, "utf8");
  const whereUnique = client.match(
    /export type UserSchoolMembershipWhereUniqueInput = Prisma\.AtLeast<\{[\s\S]*?\}, "[^"]+">/,
  )?.[0] ?? "";

  // #region agent log
  await log("B", "debug-prisma-unique.mjs:client", "Generated client WhereUniqueInput compound keys", {
    hasUserIdSchoolId: whereUnique.includes("userId_schoolId?:"),
    hasUserIdSchoolIdRole: whereUnique.includes("userId_schoolId_role?:"),
    uniqueUnion: whereUnique.match(/\}, "([^"]+)"/)?.[1] ?? null,
  });
  // #endregion

  const srcFiles = [
    "src/actions/employees.ts",
    "src/actions/school-admin.ts",
    "src/lib/rbac/guard.ts",
  ];
  const usages = [];
  for (const file of srcFiles) {
    const text = fs.readFileSync(path.join(process.cwd(), file), "utf8");
    const matches = [...text.matchAll(/userId_schoolId(?:_role)?/g)].map((m) => m[0]);
    usages.push({ file, matches });
  }

  // #region agent log
  await log("C", "debug-prisma-unique.mjs:usages", "Code usages of membership unique keys", { usages });
  // #endregion

  const mismatch =
    uniqueLines.some((u) => u.replace(/\s/g, "") === "userId,schoolId") &&
    whereUnique.includes("userId_schoolId_role?:") &&
    !whereUnique.includes("userId_schoolId?:");

  // #region agent log
  await log("D", "debug-prisma-unique.mjs:verdict", "Stale client vs schema mismatch verdict", {
    mismatch,
    recommendedFix: mismatch ? "npx prisma generate" : "inspect further",
  });
  // #endregion
}

main();
