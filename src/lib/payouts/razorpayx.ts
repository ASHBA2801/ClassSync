import crypto from "crypto";
import { decrypt } from "@/lib/encryption";
import { decryptBankField } from "@/lib/employees/bank";
import { prisma } from "@/lib/db/prisma";

export interface PayoutConfig {
  accountNumber: string;
  apiKey: string;
  apiSecret: string;
  webhookSecret?: string;
}

export async function getPayoutConfig(schoolId: string): Promise<PayoutConfig | null> {
  const config = await prisma.schoolPayoutConfig.findUnique({ where: { schoolId } });
  if (!config || !config.isEnabled) return null;

  return {
    accountNumber: config.razorpayXAccountNumber,
    apiKey: decrypt(config.apiKeyEncrypted),
    apiSecret: decrypt(config.apiSecretEncrypted),
    webhookSecret: config.webhookSecretEncrypted ? decrypt(config.webhookSecretEncrypted) : undefined,
  };
}

export const RAZORPAY_MAX_REFERENCE_ID_LENGTH = 40;

export function toRazorpayReferenceId(referenceId: string): string {
  if (referenceId.length <= RAZORPAY_MAX_REFERENCE_ID_LENGTH) {
    return referenceId;
  }
  return crypto.createHash("sha256").update(referenceId).digest("hex").slice(0, RAZORPAY_MAX_REFERENCE_ID_LENGTH);
}

export const RAZORPAY_MAX_NARRATION_LENGTH = 30;

export function toRazorpayNarration(narration: string): string {
  const sanitized = narration
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!sanitized) return "Salary Payout";
  return sanitized.slice(0, RAZORPAY_MAX_NARRATION_LENGTH);
}

export function formatPayrollNarration(periodStart: Date): string {
  const year = periodStart.getUTCFullYear();
  const month = String(periodStart.getUTCMonth() + 1).padStart(2, "0");
  return toRazorpayNarration(`Salary ${year}${month}`);
}

export type MappedPayoutStatus = "SUCCESS" | "FAILED" | "REVERSED" | "PROCESSING";

export function mapRazorpayPayoutStatus(status: string): MappedPayoutStatus {
  switch (status) {
    case "processed":
      return "SUCCESS";
    case "failed":
    case "cancelled":
      return "FAILED";
    case "reversed":
      return "REVERSED";
    default:
      return "PROCESSING";
  }
}

function authHeader(config: PayoutConfig): string {
  return `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString("base64")}`;
}

async function razorpayXRequest<T>(
  config: PayoutConfig,
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: {
      Authorization: authHeader(config),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) {
    const message = (data as { error?: { description?: string } }).error?.description ?? "RazorpayX request failed";
    throw new Error(message);
  }
  return data as T;
}

export async function createOrUpdateContact(
  config: PayoutConfig,
  input: { name: string; email: string; contactId?: string | null; referenceId: string },
): Promise<string> {
  if (input.contactId) return input.contactId;

  const contact = await razorpayXRequest<{ id: string }>(config, "POST", "/contacts", {
    name: input.name,
    email: input.email,
    type: "employee",
    reference_id: input.referenceId,
  });
  return contact.id;
}

export async function createFundAccount(
  config: PayoutConfig,
  input: {
    contactId: string;
    accountHolder: string;
    accountNumber: string;
    ifsc: string;
  },
): Promise<string> {
  const fundAccount = await razorpayXRequest<{ id: string }>(config, "POST", "/fund_accounts", {
    contact_id: input.contactId,
    account_type: "bank_account",
    bank_account: {
      name: input.accountHolder,
      ifsc: input.ifsc,
      account_number: input.accountNumber,
    },
  });
  return fundAccount.id;
}

export async function createPayout(
  config: PayoutConfig,
  input: {
    fundAccountId: string;
    amountPaise: number;
    idempotencyKey: string;
    narration: string;
  },
): Promise<{ id: string; status: string }> {
  const payout = await razorpayXRequest<{ id: string; status: string }>(
    config,
    "POST",
    "/payouts",
    {
      account_number: config.accountNumber,
      fund_account_id: input.fundAccountId,
      amount: input.amountPaise,
      currency: "INR",
      mode: "IMPS",
      purpose: "salary",
      queue_if_low_balance: true,
      reference_id: toRazorpayReferenceId(input.idempotencyKey),
      narration: toRazorpayNarration(input.narration),
    },
  );
  return payout;
}

export async function fetchRazorpayPayout(
  config: PayoutConfig,
  payoutId: string,
): Promise<{ id: string; status: string; failure_reason?: string | null }> {
  return razorpayXRequest<{ id: string; status: string; failure_reason?: string | null }>(
    config,
    "GET",
    `/payouts/${payoutId}`,
  );
}

export function verifyPayoutWebhook(config: PayoutConfig, body: string, signature: string): boolean {
  if (!config.webhookSecret) return false;
  const expected = crypto.createHmac("sha256", config.webhookSecret).update(body).digest("hex");
  return expected === signature;
}

export async function ensureFundAccountForEmployee(
  schoolId: string,
  employeeId: string,
): Promise<string> {
  const config = await getPayoutConfig(schoolId);
  if (!config) throw new Error("RazorpayX payout is not configured");

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, schoolId },
    include: {
      user: true,
      bankAccounts: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!employee) throw new Error("Employee not found");

  const bank = employee.bankAccounts[0];
  if (!bank) throw new Error("Bank account not configured");
  if (!bank.isVerified) throw new Error("Bank account must be verified before payout");

  if (bank.razorpayFundAccountId) return bank.razorpayFundAccountId;

  const contactId = await createOrUpdateContact(config, {
    name: employee.user.name,
    email: employee.user.email,
    contactId: bank.razorpayContactId,
    referenceId: employee.id,
  });

  const accountNumber = decryptBankField(bank.accountNumberEncrypted);
  const ifsc = decryptBankField(bank.ifscEncrypted);

  const fundAccountId = await createFundAccount(config, {
    contactId,
    accountHolder: bank.accountHolder,
    accountNumber,
    ifsc,
  });

  await prisma.employeeBankAccount.update({
    where: { id: bank.id },
    data: { razorpayContactId: contactId, razorpayFundAccountId: fundAccountId },
  });

  return fundAccountId;
}

export async function initiateEmployeePayout(input: {
  schoolId: string;
  employeeId: string;
  amount: number;
  idempotencyKey: string;
  narration: string;
}): Promise<{ payoutId: string; status: string }> {
  const config = await getPayoutConfig(input.schoolId);
  if (!config) throw new Error("RazorpayX payout is not configured");

  const fundAccountId = await ensureFundAccountForEmployee(input.schoolId, input.employeeId);
  const amountPaise = Math.round(input.amount * 100);

  const payout = await createPayout(config, {
    fundAccountId,
    amountPaise,
    idempotencyKey: input.idempotencyKey,
    narration: input.narration,
  });

  return { payoutId: payout.id, status: payout.status };
}
