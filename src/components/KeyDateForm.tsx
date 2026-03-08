"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { dateTimeInPacificToISO, APP_TIMEZONE } from "@/lib/formatKeyDate";

export type KeyDateDeleteType = "auto" | "manual";
export type KeyDateDateType = "due" | "event";

type Initial = {
  id?: string;
  dateType?: KeyDateDateType;
  eventDate: string;
  eventEndDate?: string | null;
  title: string;
  body: string;
  deleteType?: KeyDateDeleteType;
};

export function KeyDateForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: Initial;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const isEdit = !!initial?.id;
  function getInitialDateAndTime(iso: string) {
    const d = new Date(iso);
    const dateParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: APP_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(d);
    const year = dateParts.find((p) => p.type === "year")?.value ?? "";
    const month = dateParts.find((p) => p.type === "month")?.value ?? "";
    const day = dateParts.find((p) => p.type === "day")?.value ?? "";
    const timeParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: APP_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const hour = timeParts.find((p) => p.type === "hour")?.value ?? "09";
    const minute = timeParts.find((p) => p.type === "minute")?.value ?? "00";
    return { datePart: `${year}-${month}-${day}`, timePart: `${hour}:${minute}` };
  }
  const [dateType, setDateType] = useState<KeyDateDateType>(
    initial?.dateType ?? (initial?.eventEndDate ? "event" : "due")
  );
  const [eventDate, setEventDate] = useState(
    initial?.eventDate ? getInitialDateAndTime(initial.eventDate).datePart : ""
  );
  const [eventTime, setEventTime] = useState(
    initial?.eventDate ? getInitialDateAndTime(initial.eventDate).timePart : "09:00"
  );
  const [endDate, setEndDate] = useState(
    initial?.eventEndDate ? getInitialDateAndTime(initial.eventEndDate).datePart : ""
  );
  const [endTime, setEndTime] = useState(
    initial?.eventEndDate ? getInitialDateAndTime(initial.eventEndDate).timePart : "17:00"
  );
  useEffect(() => {
    if (!initial?.eventDate) {
      setEventDate(format(new Date(), "yyyy-MM-dd"));
      setEventTime("09:00");
      setEndDate(format(new Date(), "yyyy-MM-dd"));
      setEndTime("17:00");
    }
  }, [initial?.eventDate]);
  const [deleteType, setDeleteType] = useState<KeyDateDeleteType>(
    initial?.deleteType ?? "manual"
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const eventDateTime = dateTimeInPacificToISO(eventDate, eventTime);
    const eventEndDateTime =
      dateType === "event" ? dateTimeInPacificToISO(endDate, endTime) : undefined;
    const payload = {
      dateType,
      eventDate: eventDateTime,
      ...(dateType === "event" && eventEndDateTime && { eventEndDate: eventEndDateTime }),
      title,
      text: body,
      deleteType,
    };
    try {
      if (isEdit && initial?.id) {
        const res = await fetch(`/api/key-dates/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
      } else {
        const res = await fetch("/api/key-dates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
      }
      setTitle("");
      setBody("");
      setEventDate(format(new Date(), "yyyy-MM-dd"));
      setEventTime("09:00");
      setEndDate(format(new Date(), "yyyy-MM-dd"));
      setEndTime("17:00");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4"
    >
      <h3 className="mb-3 text-sm font-medium text-stone-700">
        {isEdit ? "Edit key date" : "Add key date"}
      </h3>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500">
            Type
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="dateType"
                value="due"
                checked={dateType === "due"}
                onChange={() => setDateType("due")}
                className="rounded-full border-stone-300 text-emerald-600"
              />
              <span>Due date</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="dateType"
                value="event"
                checked={dateType === "event"}
                onChange={() => setDateType("event")}
                className="rounded-full border-stone-300 text-emerald-600"
              />
              <span>Event date</span>
            </label>
          </div>
        </div>
        {dateType === "due" ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-0.5 block text-xs font-medium text-stone-500">
                Due date
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-0.5 block text-xs font-medium text-stone-500">
                Time
              </label>
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                required
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-0.5 block text-xs font-medium text-stone-500">
                  Start date
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  required
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-0.5 block text-xs font-medium text-stone-500">
                  Start time
                </label>
                <input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  required
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-0.5 block text-xs font-medium text-stone-500">
                  End date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required={dateType === "event"}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-0.5 block text-xs font-medium text-stone-500">
                  End time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required={dateType === "event"}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
          </>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500">
            Delete behavior
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="deleteType"
                value="manual"
                checked={deleteType === "manual"}
                onChange={() => setDeleteType("manual")}
                className="rounded-full border-stone-300 text-emerald-600"
              />
              <span>Manual — hidden when expired; you delete it</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="deleteType"
                value="auto"
                checked={deleteType === "auto"}
                onChange={() => setDeleteType("auto")}
                className="rounded-full border-stone-300 text-emerald-600"
              />
              <span>Auto — removed 1 day after it expires</span>
            </label>
          </div>
        </div>
        <div>
          <label className="mb-0.5 block text-xs font-medium text-stone-500">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Title"
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-0.5 block text-xs font-medium text-stone-500">
            Body
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={3}
            placeholder="Main body text…"
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? "Saving…" : isEdit ? "Save" : "Add"}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
