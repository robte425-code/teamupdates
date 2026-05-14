"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardVisitHistory } from "@/components/DashboardVisitHistory";

type ReminderSettings = {
  inactiveDaysThreshold: number;
  emailSubject: string;
  emailBody: string;
  templatePlaceholders: string[];
};

type Recipient = {
  id: string;
  email: string;
  name: string | null;
  enabled: boolean;
  lastReminderSentAt: string | null;
};

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function RemindersContent() {
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [settingsDraft, setSettingsDraft] = useState({
    inactiveDaysThreshold: 7,
    emailSubject: "",
    emailBody: "",
  });
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(true);
  const [recipientsError, setRecipientsError] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  const loadSettings = useCallback(() => {
    setSettingsError(null);
    return fetch("/api/reminders/settings", { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) {
          throw new Error(typeof data?.error === "string" ? data.error : `Failed (${r.status})`);
        }
        return data as ReminderSettings;
      })
      .then((data) => {
        setSettings(data);
        setSettingsDraft({
          inactiveDaysThreshold: data.inactiveDaysThreshold,
          emailSubject: data.emailSubject,
          emailBody: data.emailBody,
        });
      })
      .catch((e: unknown) => {
        setSettingsError(e instanceof Error ? e.message : "Could not load settings.");
        setSettings(null);
      });
  }, []);

  const loadRecipients = useCallback(() => {
    setRecipientsError(null);
    return fetch("/api/reminders/recipients", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) {
          const t = await r.text();
          throw new Error(t || `Failed (${r.status})`);
        }
        return r.json() as Promise<Recipient[]>;
      })
      .then((rows) => setRecipients(Array.isArray(rows) ? rows : []))
      .catch((e: unknown) => {
        setRecipientsError(e instanceof Error ? e.message : "Could not load recipients.");
        setRecipients([]);
      });
  }, []);

  useEffect(() => {
    setSettingsLoading(true);
    loadSettings().finally(() => setSettingsLoading(false));
  }, [loadSettings]);

  useEffect(() => {
    setRecipientsLoading(true);
    loadRecipients().finally(() => setRecipientsLoading(false));
  }, [loadRecipients]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsError(null);
    try {
      const r = await fetch("/api/reminders/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inactiveDaysThreshold: settingsDraft.inactiveDaysThreshold,
          emailSubject: settingsDraft.emailSubject,
          emailBody: settingsDraft.emailBody,
        }),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : `Save failed (${r.status})`);
      }
      const s = data as ReminderSettings;
      setSettings(s);
      setSettingsDraft({
        inactiveDaysThreshold: s.inactiveDaysThreshold,
        emailSubject: s.emailSubject,
        emailBody: s.emailBody,
      });
    } catch (err: unknown) {
      setSettingsError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSettingsSaving(false);
    }
  }

  async function addRecipient(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setAdding(true);
    setRecipientsError(null);
    try {
      const r = await fetch("/api/reminders/recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail.trim(),
          name: newName.trim() || undefined,
        }),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : `Add failed (${r.status})`);
      }
      setNewEmail("");
      setNewName("");
      await loadRecipients();
    } catch (err: unknown) {
      setRecipientsError(err instanceof Error ? err.message : "Add failed.");
    } finally {
      setAdding(false);
    }
  }

  async function seedFromVisits() {
    setSeeding(true);
    setSeedMessage(null);
    setRecipientsError(null);
    try {
      const r = await fetch("/api/reminders/recipients/seed-from-visits", { method: "POST" });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : `Seed failed (${r.status})`);
      }
      const added = typeof data?.added === "number" ? data.added : 0;
      const distinct =
        typeof data?.distinctEmailsFromVisits === "number" ? data.distinctEmailsFromVisits : 0;
      const had =
        typeof data?.alreadyHadRecipient === "number" ? data.alreadyHadRecipient : 0;
      setSeedMessage(
        `Seeded ${added} new recipient(s). Distinct dashboard emails in last 60 days: ${distinct}; already in list: ${had}.`
      );
      await loadRecipients();
    } catch (err: unknown) {
      setRecipientsError(err instanceof Error ? err.message : "Seed failed.");
    } finally {
      setSeeding(false);
    }
  }

  async function patchRecipient(id: string, body: Record<string, unknown>) {
    setRecipientsError(null);
    const r = await fetch(`/api/reminders/recipients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => null);
    if (!r.ok) {
      throw new Error(typeof data?.error === "string" ? data.error : `Update failed (${r.status})`);
    }
    await loadRecipients();
  }

  async function safePatchRecipient(id: string, body: Record<string, unknown>) {
    try {
      await patchRecipient(id, body);
    } catch (e: unknown) {
      setRecipientsError(e instanceof Error ? e.message : "Update failed.");
      await loadRecipients();
    }
  }

  async function deleteRecipient(id: string, email: string) {
    if (!window.confirm(`Remove reminder recipient ${email}?`)) return;
    setRecipientsError(null);
    try {
      const r = await fetch(`/api/reminders/recipients/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const data = await r.json().catch(() => null);
        throw new Error(typeof data?.error === "string" ? data.error : `Delete failed (${r.status})`);
      }
      await loadRecipients();
    } catch (err: unknown) {
      setRecipientsError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  const placeholders =
    settings?.templatePlaceholders?.join(", ") ??
    "{{firstName}}, {{name}}, {{email}}, {{inactiveDays}}, {{dashboardUrl}}";

  return (
    <div className="space-y-12">
      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">How reminders work</h2>
        <p className="mt-2 text-sm text-stone-600">
          Inactivity is based only on visits to the home dashboard (<code className="rounded bg-stone-100 px-1">/</code>
          ). When someone has not loaded that page for at least the threshold below (Pacific calendar days), they may
          receive an email on the next cron run. While they stay that inactive, they can get another reminder on each
          later day the cron runs (at most <strong className="font-medium text-stone-800">one per Pacific calendar day</strong>
          ). Visiting <code className="rounded bg-stone-100 px-1">/</code> resets the clock. Cron must be configured on
          the host (see <code className="rounded bg-stone-100 px-1">CRON_SECRET</code> in environment variables).
        </p>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">Email template & threshold</h2>
        {settingsLoading ? (
          <p className="mt-3 text-sm text-stone-500">Loading settings…</p>
        ) : (
          <form onSubmit={saveSettings} className="mt-4 space-y-4">
            {settingsError && <p className="text-sm text-red-600">{settingsError}</p>}
            <div>
              <label htmlFor="rem-inactive-days" className="block text-sm font-medium text-stone-700">
                Inactive days before first reminder
              </label>
              <input
                id="rem-inactive-days"
                type="number"
                min={1}
                max={365}
                required
                value={settingsDraft.inactiveDaysThreshold}
                onChange={(e) =>
                  setSettingsDraft((d) => ({
                    ...d,
                    inactiveDaysThreshold: Number(e.target.value) || 1,
                  }))
                }
                className="mt-1 w-32 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <p className="mt-1 text-xs text-stone-500">
                Pacific calendar days since the last <code className="rounded bg-stone-50 px-0.5">/</code> visit.
              </p>
            </div>
            <div>
              <label htmlFor="rem-subject" className="block text-sm font-medium text-stone-700">
                Email subject
              </label>
              <input
                id="rem-subject"
                type="text"
                required
                value={settingsDraft.emailSubject}
                onChange={(e) => setSettingsDraft((d) => ({ ...d, emailSubject: e.target.value }))}
                className="mt-1 w-full max-w-xl rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="rem-body" className="block text-sm font-medium text-stone-700">
                Email body (plain text)
              </label>
              <textarea
                id="rem-body"
                required
                rows={8}
                value={settingsDraft.emailBody}
                onChange={(e) => setSettingsDraft((d) => ({ ...d, emailBody: e.target.value }))}
                className="mt-1 w-full max-w-2xl rounded-lg border border-stone-300 px-3 py-2 font-mono text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <p className="mt-1 text-xs text-stone-500">Placeholders: {placeholders}</p>
            </div>
            <button
              type="submit"
              disabled={settingsSaving}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {settingsSaving ? "Saving…" : "Save settings"}
            </button>
          </form>
        )}
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">Recipients</h2>
        <p className="mt-2 text-sm text-stone-600">
          Only listed, enabled recipients are considered. Seed adds distinct emails from dashboard visits in the last
          60 days (same exclusions as visit history below).
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void seedFromVisits()}
            disabled={seeding}
            className="rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-100 disabled:opacity-50"
          >
            {seeding ? "Seeding…" : "Seed from visit history"}
          </button>
          {seedMessage && <span className="text-sm text-stone-600">{seedMessage}</span>}
        </div>

        <form onSubmit={addRecipient} className="mt-6 flex flex-wrap items-end gap-3 border-t border-stone-100 pt-6">
          <div>
            <label htmlFor="rem-new-email" className="block text-xs font-medium text-stone-600">
              Email
            </label>
            <input
              id="rem-new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="mt-0.5 w-64 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="name@company.com"
            />
          </div>
          <div>
            <label htmlFor="rem-new-name" className="block text-xs font-medium text-stone-600">
              Display name (optional)
            </label>
            <input
              id="rem-new-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="mt-0.5 w-56 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="First Last"
            />
          </div>
          <button
            type="submit"
            disabled={adding || !newEmail.trim()}
            className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-900 disabled:opacity-50"
          >
            {adding ? "Adding…" : "Add recipient"}
          </button>
        </form>

        {recipientsLoading ? (
          <p className="mt-6 text-sm text-stone-500">Loading recipients…</p>
        ) : (
          <>
            {recipientsError && <p className="mt-4 text-sm text-red-600">{recipientsError}</p>}
            {recipients.length === 0 ? (
              <p className="mt-4 text-sm text-stone-500">No recipients yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-lg border border-stone-200">
                <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className="px-3 py-2 font-semibold text-stone-700">Enabled</th>
                      <th className="px-3 py-2 font-semibold text-stone-700">Email</th>
                      <th className="px-3 py-2 font-semibold text-stone-700">Name</th>
                      <th className="px-3 py-2 font-semibold text-stone-700">Last sent</th>
                      <th className="px-3 py-2 font-semibold text-stone-700" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {recipients.map((r) => (
                      <RecipientRow
                        key={r.id}
                        recipient={r}
                        onToggleEnabled={(enabled) => safePatchRecipient(r.id, { enabled })}
                        onSaveName={(name) => safePatchRecipient(r.id, { name: name || null })}
                        onDelete={() => void deleteRecipient(r.id, r.email)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-stone-900">Visit history</h2>
        <DashboardVisitHistory />
      </section>
    </div>
  );
}

function RecipientRow({
  recipient,
  onToggleEnabled,
  onSaveName,
  onDelete,
}: {
  recipient: Recipient;
  onToggleEnabled: (enabled: boolean) => Promise<void>;
  onSaveName: (name: string) => Promise<void>;
  onDelete: () => void;
}) {
  const [nameDraft, setNameDraft] = useState(recipient.name ?? "");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    setNameDraft(recipient.name ?? "");
  }, [recipient.name, recipient.id]);

  async function blurName() {
    const trimmed = nameDraft.trim();
    const current = recipient.name?.trim() ?? "";
    if (trimmed === current) return;
    setSavingName(true);
    try {
      await onSaveName(trimmed);
    } finally {
      setSavingName(false);
    }
  }

  return (
    <tr className="hover:bg-stone-50/60">
      <td className="px-3 py-2">
        <input
          type="checkbox"
          checked={recipient.enabled}
          onChange={(e) => void onToggleEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
        />
      </td>
      <td className="px-3 py-2 font-mono text-xs text-stone-800">{recipient.email}</td>
      <td className="px-3 py-2">
        <input
          type="text"
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={() => void blurName()}
          disabled={savingName}
          className="w-48 max-w-full rounded border border-stone-200 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          placeholder="Display name"
        />
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-stone-600">
        {formatDateTime(recipient.lastReminderSentAt)}
      </td>
      <td className="px-3 py-2 text-right">
        <button
          type="button"
          onClick={onDelete}
          className="text-sm text-red-600 hover:text-red-800"
        >
          Remove
        </button>
      </td>
    </tr>
  );
}
