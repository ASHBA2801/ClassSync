"use client";

import { useState } from "react";
import { updateGeofenceAction } from "@/actions/school-admin";
import { savePaymentProviderConfigAction } from "@/actions/payments";
import { savePayoutConfigAction } from "@/actions/payout-config";
import { CampusLocationPicker } from "@/components/campus-location-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { PasswordInput } from "@/components/ui/password-input";
import type { PaymentProvider } from "@prisma/client";
import type { AdminProviderInfo } from "@/lib/payments/types";
import { PAYMENT_PROVIDER_META } from "@/lib/payments/types";
import {
  getRazorpayFeeWebhookUrl,
  getRazorpayPayoutWebhookUrl,
  isRazorpayTestKey,
  RAZORPAY_TEST_CARD,
} from "@/lib/payments/razorpay-setup";

interface School {
  campusLat: number | null;
  campusLng: number | null;
  campusRadiusM: number;
  timezone: string;
  name: string;
}

function ProviderConfigForm({
  config,
  feeWebhookUrl,
}: {
  config: AdminProviderInfo;
  feeWebhookUrl: string;
}) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [enabled, setEnabled] = useState(config.isEnabled);
  const [mode, setMode] = useState((config.configJson?.mode as string) ?? "sandbox");
  const meta = PAYMENT_PROVIDER_META[config.provider];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaved(false);
    const fd = new FormData(e.currentTarget);

    try {
      await savePaymentProviderConfigAction({
        provider: config.provider,
        isEnabled: enabled,
        publicKey: (fd.get("publicKey") as string) || undefined,
        secret: (fd.get("secret") as string) || undefined,
        webhookSecret: (fd.get("webhookSecret") as string) || undefined,
        saltIndex: (fd.get("saltIndex") as string) || undefined,
        mode: mode as "sandbox" | "live",
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{config.label}</p>
          <p className="text-xs text-text-2">{meta.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {config.isConfigured && <Badge variant="success" hideIcon>Configured</Badge>}
          <label className="flex items-center gap-2.5 text-sm text-text-1">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            Enable
          </label>
        </div>
      </div>

      {enabled && (
        <>
          {config.provider === "RAZORPAY" && (
            <>
              <div className="rounded-[var(--radius-md)] border border-info/30 bg-info-light/40 p-3 text-xs text-text-2">
                <p className="font-medium text-text-1">Razorpay test mode</p>
                <p className="mt-1">
                  Generate <strong>Test</strong> API keys in the Razorpay Dashboard (Key ID starts with{" "}
                  <code className="glass-panel rounded px-1">rzp_test_</code>). No separate sandbox toggle is
                  needed — test keys never charge real money.
                </p>
                <p className="mt-2">
                  Test card: <code className="glass-panel rounded px-1">{RAZORPAY_TEST_CARD}</code>, any future
                  expiry, any CVV.
                </p>
              </div>
              <div><Label>Key ID</Label><Input name="publicKey" placeholder={config.publicKey ?? "rzp_test_..."} /></div>
              <div><Label>Key Secret</Label><PasswordInput name="secret" placeholder="Leave blank to keep existing" /></div>
              <div>
                <Label>Webhook Secret</Label>
                <PasswordInput name="webhookSecret" placeholder="From Razorpay webhook settings" />
                <p className="mt-1 text-xs text-text-2">
                  Required if you register the webhook below. Client-side capture works without it for local testing.
                </p>
              </div>
            </>
          )}
          {config.provider === "STRIPE" && (
            <>
              <div><Label>Publishable Key</Label><Input name="publicKey" placeholder={config.publicKey ?? "pk_test_..."} /></div>
              <div><Label>Secret Key</Label><PasswordInput name="secret" placeholder="Leave blank to keep existing" /></div>
              <div><Label>Webhook Secret</Label><PasswordInput name="webhookSecret" placeholder="whsec_..." /></div>
            </>
          )}
          {config.provider === "PAYPAL" && (
            <>
              <div><Label>Client ID</Label><Input name="publicKey" placeholder={config.publicKey ?? "Client ID"} /></div>
              <div><Label>Client Secret</Label><PasswordInput name="secret" placeholder="Leave blank to keep existing" /></div>
              <div><Label>Webhook ID</Label><PasswordInput name="webhookSecret" placeholder="Optional" /></div>
              <div>
                <Label>Mode</Label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          {config.provider === "PHONEPE" && (
            <>
              <div><Label>Merchant ID</Label><Input name="publicKey" placeholder={config.publicKey ?? "MERCHANTUAT"} /></div>
              <div><Label>Salt Key</Label><PasswordInput name="secret" placeholder="Leave blank to keep existing" /></div>
              <div><Label>Salt Index</Label><Input name="saltIndex" defaultValue={(config.configJson?.saltIndex as string) ?? "1"} /></div>
              <div><Label>Webhook Secret</Label><PasswordInput name="webhookSecret" placeholder="Optional" /></div>
              <div>
                <Label>Mode</Label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </>
      )}

      <p className="text-xs text-text-2">
        Webhook URL:{" "}
        <code className="glass-panel break-all rounded px-1">
          {config.provider === "RAZORPAY" ? feeWebhookUrl : config.webhookPath}
        </code>
      </p>
      {config.provider === "RAZORPAY" && config.publicKey && isRazorpayTestKey(config.publicKey) && (
        <Badge variant="info" hideIcon>
          Test mode key detected
        </Badge>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-success">Saved (secrets encrypted)</p>}
      <Button type="submit" size="sm">Save {config.label}</Button>
    </form>
  );
}

export function SettingsForms({
  schoolId,
  appUrl,
  school,
  paymentProviders,
  payoutConfig,
}: {
  schoolId: string;
  appUrl: string;
  school: School | null;
  paymentProviders: AdminProviderInfo[];
  payoutConfig: {
    isConfigured: boolean;
    isEnabled: boolean;
    accountNumber: string | null;
    autoPayoutEnabled: boolean;
    payrollRunDay: number;
  };
}) {
  const [saved, setSaved] = useState("");
  const [payoutEnabled, setPayoutEnabled] = useState(payoutConfig.isEnabled);
  const [autoPayoutEnabled, setAutoPayoutEnabled] = useState(payoutConfig.autoPayoutEnabled);
  const [payrollRunDay, setPayrollRunDay] = useState(String(payoutConfig.payrollRunDay));
  const [payoutSaved, setPayoutSaved] = useState(false);
  const [payoutError, setPayoutError] = useState("");

  const orderedProviders = [...paymentProviders].sort((a, b) => {
    const order: PaymentProvider[] = ["RAZORPAY", "PHONEPE", "PAYPAL", "STRIPE"];
    return order.indexOf(a.provider) - order.indexOf(b.provider);
  });

  const feeWebhookUrl = getRazorpayFeeWebhookUrl(schoolId);
  const payoutWebhookUrl = getRazorpayPayoutWebhookUrl(schoolId);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Campus Location</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-text-2">
            Set the institute location using the map. This latitude and longitude are saved and used
            to verify teacher attendance via device GPS — attendance does not use Google Maps.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const campusLat = Number(fd.get("campusLat"));
              const campusLng = Number(fd.get("campusLng"));
              if (!Number.isFinite(campusLat) || !Number.isFinite(campusLng)) {
                setSaved("geofence-error");
                return;
              }
              await updateGeofenceAction({
                campusLat,
                campusLng,
                campusRadiusM: Number(fd.get("campusRadiusM")),
              });
              setSaved("geofence");
            }}
            className="space-y-3"
          >
            <CampusLocationPicker defaultLat={school?.campusLat} defaultLng={school?.campusLng} />
            <div><Label>Radius (meters)</Label><Input name="campusRadiusM" type="number" defaultValue={school?.campusRadiusM ?? 200} required /></div>
            {saved === "geofence" && <p className="text-sm text-success">Campus location updated</p>}
            {saved === "geofence-error" && (
              <p className="text-sm text-red-600">Please select the campus location on the map.</p>
            )}
            <Button type="submit">Save Location</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>RazorpayX Salary Payouts</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-text-2">
            Configure RazorpayX for direct salary disbursement to employee bank accounts. Use{" "}
            <strong>test API keys</strong> (<code className="glass-panel rounded px-1">rzp_test_...</code>) during
            development — no real bank transfers occur in test mode.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setPayoutError("");
              setPayoutSaved(false);
              const fd = new FormData(e.currentTarget);
              try {
                await savePayoutConfigAction({
                  razorpayXAccountNumber: fd.get("accountNumber") as string,
                  apiKey: fd.get("apiKey") as string,
                  apiSecret: fd.get("apiSecret") as string,
                  webhookSecret: (fd.get("webhookSecret") as string) || undefined,
                  isEnabled: payoutEnabled,
                  autoPayoutEnabled,
                  payrollRunDay: Number(payrollRunDay),
                });
                setPayoutSaved(true);
              } catch (err) {
                setPayoutError(err instanceof Error ? err.message : "Failed to save");
              }
            }}
            className="glass-card max-w-lg space-y-3 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">Enable RazorpayX Payouts</span>
              <Switch
                checked={payoutEnabled}
                onCheckedChange={(v) => {
                  setPayoutEnabled(v);
                  if (!v) setAutoPayoutEnabled(false);
                }}
              />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <div>
                <span className="font-medium">Automatic month-end payroll</span>
                <p className="text-xs text-text-2">
                  When enabled, payroll is generated and sent via RazorpayX on the configured day.
                  When disabled, you are notified on the 1st of each month to run payroll manually.
                </p>
              </div>
              <Switch
                checked={autoPayoutEnabled}
                disabled={!payoutEnabled}
                onCheckedChange={setAutoPayoutEnabled}
              />
            </div>
            <div>
              <Label>Payroll run day</Label>
              <Select value={payrollRunDay} onValueChange={setPayrollRunDay}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Last day of month</SelectItem>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={String(day)}>Day {day} of month</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>RazorpayX Account Number</Label>
              <Input name="accountNumber" defaultValue={payoutConfig.accountNumber ?? ""} required />
            </div>
            <div><Label>API Key</Label><Input name="apiKey" placeholder={payoutConfig.isConfigured ? "Leave blank to keep existing" : "rzp_test_..."} /></div>
            <div><Label>API Secret</Label><PasswordInput name="apiSecret" placeholder="Leave blank to keep existing" /></div>
            <div>
              <Label>Webhook Secret</Label>
              <PasswordInput name="webhookSecret" placeholder="From RazorpayX webhook settings" />
            </div>
            <div className="rounded-[var(--radius-md)] border border-border/60 bg-surface-nested/40 p-3 text-xs text-text-2 space-y-2">
              <p>
                Register this webhook in Razorpay Dashboard → RazorpayX → Webhooks. Events:{" "}
                <code className="glass-panel rounded px-1">payout.processed</code>,{" "}
                <code className="glass-panel rounded px-1">payout.failed</code>,{" "}
                <code className="glass-panel rounded px-1">payout.reversed</code>.
              </p>
              <p>
                Webhook URL:{" "}
                <code className="glass-panel break-all rounded px-1">{payoutWebhookUrl}</code>
              </p>
              <p>
                For local dev, expose {appUrl} via ngrok and use that URL in the Razorpay dashboard.
              </p>
            </div>
            {payoutError && <p className="text-sm text-red-600">{payoutError}</p>}
            {payoutSaved && <p className="text-sm text-success">Payout config saved (encrypted)</p>}
            <Button type="submit" size="sm">Save Payout Config</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>Payment Gateways</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-text-2">
            Enable one or more payment gateways. Parents can choose among enabled gateways when paying fees.
            Razorpay is always available for configuration.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {orderedProviders.map((config) => (
              <ProviderConfigForm key={config.provider} config={config} feeWebhookUrl={feeWebhookUrl} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
