"use client";

import { useState } from "react";
import { updateGeofenceAction } from "@/actions/school-admin";
import { savePaymentProviderConfigAction } from "@/actions/payments";
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

interface School {
  campusLat: number | null;
  campusLng: number | null;
  campusRadiusM: number;
  timezone: string;
  name: string;
}

function ProviderConfigForm({ config }: { config: AdminProviderInfo }) {
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
              <div><Label>Key ID</Label><Input name="publicKey" placeholder={config.publicKey ?? "rzp_test_..."} /></div>
              <div><Label>Key Secret</Label><PasswordInput name="secret" placeholder="Leave blank to keep existing" /></div>
              <div><Label>Webhook Secret</Label><PasswordInput name="webhookSecret" placeholder="Optional" /></div>
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
        Webhook URL: <code className="glass-panel rounded px-1">{config.webhookPath}</code>
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-success">Saved (secrets encrypted)</p>}
      <Button type="submit" size="sm">Save {config.label}</Button>
    </form>
  );
}

export function SettingsForms({
  school,
  paymentProviders,
}: {
  school: School | null;
  paymentProviders: AdminProviderInfo[];
}) {
  const [saved, setSaved] = useState("");

  const orderedProviders = [...paymentProviders].sort((a, b) => {
    const order: PaymentProvider[] = ["RAZORPAY", "PHONEPE", "PAYPAL", "STRIPE"];
    return order.indexOf(a.provider) - order.indexOf(b.provider);
  });

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
        <CardHeader><CardTitle>Payment Gateways</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-text-2">
            Enable one or more payment gateways. Parents can choose among enabled gateways when paying fees.
            Razorpay is always available for configuration.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {orderedProviders.map((config) => (
              <ProviderConfigForm key={config.provider} config={config} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
