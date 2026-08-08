import { decrypt, encrypt } from "@/lib/encryption";

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_NUMBER_REGEX = /^\d{9,18}$/;

export function validateIfsc(ifsc: string): boolean {
  return IFSC_REGEX.test(ifsc.toUpperCase());
}

export function validateAccountNumber(accountNumber: string): boolean {
  return ACCOUNT_NUMBER_REGEX.test(accountNumber);
}

export function encryptBankField(value: string): string {
  return encrypt(value.trim());
}

export function decryptBankField(encrypted: string): string {
  return decrypt(encrypted);
}

export function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) return "****";
  return `****${accountNumber.slice(-4)}`;
}

export function maskIfsc(ifsc: string): string {
  if (ifsc.length <= 4) return "****";
  return `${ifsc.slice(0, 4)}****${ifsc.slice(-2)}`;
}

export function maskUpi(upi: string): string {
  const at = upi.indexOf("@");
  if (at <= 1) return "****@****";
  return `${upi.slice(0, 2)}****${upi.slice(at)}`;
}

export interface MaskedBankAccount {
  id: string;
  accountHolder: string;
  accountNumberMasked: string;
  ifscMasked: string;
  upiMasked: string | null;
  bankName: string | null;
  isVerified: boolean;
  verifiedAt: Date | null;
}

export function toMaskedBankAccount(account: {
  id: string;
  accountHolder: string;
  accountNumberEncrypted: string;
  ifscEncrypted: string;
  upiIdEncrypted: string | null;
  bankName: string | null;
  isVerified: boolean;
  verifiedAt: Date | null;
}): MaskedBankAccount {
  const accountNumber = decryptBankField(account.accountNumberEncrypted);
  const ifsc = decryptBankField(account.ifscEncrypted);
  const upi = account.upiIdEncrypted ? decryptBankField(account.upiIdEncrypted) : null;

  return {
    id: account.id,
    accountHolder: account.accountHolder,
    accountNumberMasked: maskAccountNumber(accountNumber),
    ifscMasked: maskIfsc(ifsc),
    upiMasked: upi ? maskUpi(upi) : null,
    bankName: account.bankName,
    isVerified: account.isVerified,
    verifiedAt: account.verifiedAt,
  };
}
