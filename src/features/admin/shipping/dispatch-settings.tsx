"use client";
import { useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/auth-provider";
import { adminShippingApi, type DispatchSettings } from "./shipping-api";
import {
  Button,
  Card,
  Check,
  Field,
  Heading,
  Notice,
  QueryState,
  TextArea,
} from "../../../components/ui";
function SettingsForm({
  initial,
  readOnly,
}: {
  initial: DispatchSettings;
  readOnly: boolean;
}) {
  const client = useQueryClient();
  const lock = useRef(false);
  const [cutoff, setCutoff] = useState(
    `${String(Math.floor(initial.cutoffMinutes / 60)).padStart(2, "0")}:${String(initial.cutoffMinutes % 60).padStart(2, "0")}`,
  );
  const [days, setDays] = useState(initial.weeklyOffDays);
  const [holidays, setHolidays] = useState(initial.holidays.join(", "));
  const [sameDay, setSameDay] = useState(initial.sameDayEnabled);
  const [eta, setEta] = useState(String(initial.defaultEtaDays));
  const [threshold, setThreshold] = useState(String(initial.lowStockThreshold));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (readOnly || lock.current) return;
    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(cutoff) ||
      !/^\d+$/.test(eta) ||
      !/^\d+$/.test(threshold)
    ) {
      setError(
        "Use HH:MM for cutoff and whole numbers for ETA and stock threshold.",
      );
      return;
    }
    const dates = holidays
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (
      dates.some(
        (value) =>
          !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
          Number.isNaN(Date.parse(value)) ||
          new Date(value).toISOString().slice(0, 10) !== value,
      )
    ) {
      setError("Enter valid holiday dates as YYYY-MM-DD.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const [hour, minute] = cutoff.split(":").map(Number);
      await adminShippingApi.updateSettings({
        cutoffMinutes: hour * 60 + minute,
        weeklyOffDays: days,
        holidays: dates,
        sameDayEnabled: sameDay,
        defaultEtaDays: Number(eta),
        lowStockThreshold: Number(threshold),
      });
      await client.invalidateQueries({ queryKey: ["dispatch-settings"] });
      setSaved(true);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save settings.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Card>
      <form className="space-y-5" onSubmit={submit}>
        {readOnly && (
          <Notice>Dispatch settings are read-only in reviewer sessions.</Notice>
        )}
        <Field
          label="Dispatch cutoff"
          value={cutoff}
          onChange={(event) => setCutoff(event.target.value)}
          disabled={busy || readOnly}
          placeholder="HH:MM"
        />
        <fieldset>
          <legend className="mb-3 text-sm font-semibold">
            Weekly off days
          </legend>
          <div className="grid gap-3 sm:grid-cols-4">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
              (name, index) => (
                <Check
                  key={name}
                  label={name}
                  checked={days.includes(index)}
                  onChange={(checked) =>
                    setDays((previous) =>
                      checked
                        ? [...previous, index]
                        : previous.filter((day) => day !== index),
                    )
                  }
                  disabled={busy || readOnly}
                />
              ),
            )}
          </div>
        </fieldset>
        <TextArea
          label="Dispatch holidays"
          value={holidays}
          onChange={setHolidays}
          disabled={busy || readOnly}
        />
        <Check
          label="Same-day dispatch"
          checked={sameDay}
          onChange={setSameDay}
          disabled={busy || readOnly}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Default ETA days"
            value={eta}
            onChange={(event) => setEta(event.target.value)}
            inputMode="numeric"
            disabled={busy || readOnly}
          />
          <Field
            label="Low stock threshold"
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
            inputMode="numeric"
            disabled={busy || readOnly}
          />
        </div>
        {error && <Notice error>{error}</Notice>}
        {saved && <Notice>Settings saved.</Notice>}
        {!readOnly && (
          <Button type="submit" disabled={busy}>
            Save settings
          </Button>
        )}
      </form>
    </Card>
  );
}
export function DispatchSettingsScreen() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["dispatch-settings"],
    queryFn: adminShippingApi.settings,
  });
  return (
    <>
      <Heading
        title="Dispatch settings"
        description="Times use Asia/Kolkata. ETA is calendar days after dispatch. Holidays use YYYY-MM-DD, separated by commas."
      />
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data && (
        <SettingsForm
          initial={query.data.settings}
          readOnly={!!user?.reviewer}
        />
      )}
    </>
  );
}
