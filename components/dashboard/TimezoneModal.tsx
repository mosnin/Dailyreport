"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export function TimezoneModal({
  userId,
  open,
  onClose,
}: {
  userId: Id<"users">;
  open: boolean;
  onClose: () => void;
}) {
  const [tz, setTz] = useState("");
  const updateTimezone = useMutation(api.users.updateTimezone);

  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTz(detected || "America/New_York");
  }, []);

  async function handleSave() {
    if (!tz) return;
    await updateTimezone({ userId, timezone: tz });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Set your timezone</DialogTitle>
          <DialogDescription>
            We&apos;ll send your daily report reminder at 8pm in your local timezone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <Select value={tz} onValueChange={(v) => { if (v) setTz(v); }}>
            <SelectTrigger>
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {COMMON_TIMEZONES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="w-full" onClick={handleSave}>
            Save timezone
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
