"use client";

import { useState } from "react";
import { updateGeofenceAction } from "@/actions/school-admin";
import { savePaymentConfigAction } from "@/actions/payments";
import { CampusLocationPicker } from "@/components/campus-location-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface School {
  campusLat: number | null;
  campusLng: number | null;
  campusRadiusM: number;
  timezone: string;
  name: string;
}

export function SettingsForms({ school }: { school: School | null }) {
  const [saved, setSaved] = useState("");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Campus Location</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-zinc-500">
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
            {saved === "geofence" && <p className="text-sm text-green-600">Campus location updated</p>}
            {saved === "geofence-error" && (
              <p className="text-sm text-red-600">Please select the campus location on the map.</p>
            )}
            <Button type="submit">Save Location</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Razorpay Configuration</CardTitle></CardHeader>
        <CardContent>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              await savePaymentConfigAction({
                razorpayKeyId: fd.get("razorpayKeyId") as string,
                razorpayKeySecret: fd.get("razorpayKeySecret") as string,
                webhookSecret: (fd.get("webhookSecret") as string) || undefined,
              });
              setSaved("payment");
            }}
            className="space-y-3"
          >
            <div><Label>Key ID</Label><Input name="razorpayKeyId" required /></div>
            <div><Label>Key Secret</Label><Input name="razorpayKeySecret" type="password" required /></div>
            <div><Label>Webhook Secret</Label><Input name="webhookSecret" type="password" /></div>
            {saved === "payment" && <p className="text-sm text-green-600">Payment config saved (encrypted)</p>}
            <Button type="submit">Save Payment Config</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
