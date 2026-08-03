"use client";

import { useEffect, useSyncExternalStore } from "react";

const PAYMENT_SUCCESS_KEY = "classsync:payment-success";

export function setPaymentSuccessFlag() {
  sessionStorage.setItem(PAYMENT_SUCCESS_KEY, "1");
}

function subscribe() {
  return () => {};
}

function getSnapshot() {
  return sessionStorage.getItem(PAYMENT_SUCCESS_KEY) === "1";
}

function getServerSnapshot() {
  return false;
}

export function PaymentBanner() {
  const visible = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (visible) sessionStorage.removeItem(PAYMENT_SUCCESS_KEY);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="mb-4 rounded-[var(--radius-md)] border border-emerald-400/35 bg-success-light px-4 py-3 text-sm font-medium text-success backdrop-blur-sm">
      Payment successful. Your invoice has been updated.
    </div>
  );
}
