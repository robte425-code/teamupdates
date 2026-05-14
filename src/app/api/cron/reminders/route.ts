import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  applyReminderTemplate,
  canSendEmail,
  sendReminderEmail,
} from "@/lib/email";
import { pacificCalendarDaysBetween } from "@/lib/reminderPacificDays";

const LOG_TAG = "reminders-cron";

/** Resend limits free/sandbox tiers to ~5 requests/sec; space each send. */
const RESEND_SPACING_MS = 260;

/** While still inactive, send at most once per Pacific calendar day (cron runs ~daily). */
const MIN_PACIFIC_DAYS_BETWEEN_REMINDERS = 1;

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resendFailureHint(error: string | undefined): string {
  const e = error ?? "";
  if (e.includes("rate_limit") || e.includes("Too many requests")) {
    return "Resend rate limit (5 req/s). Cron spaces sends; retry later or contact Resend to raise limits.";
  }
  if (e.includes("domain is not verified") || /\bis not verified\b/i.test(e)) {
    return "The domain on EMAIL_FROM is not Verified in this Resend account: open resend.com/domains, add that exact domain (or parent if using a subdomain), publish SPF+DKIM DNS, wait for Verified status. FROM must match a verified domain on the same Resend API key.";
  }
  if (e.includes("only send testing emails") || e.includes("your own email address")) {
    return "Resend sandbox From: verify a domain and set EMAIL_FROM to an address on it (onboarding sender only allows mail to your Resend login email).";
  }
  if (e.includes("verify a domain") || e.includes("validation_error")) {
    return "Resend validation: ensure Domains in Resend match the domain in EMAIL_FROM, DNS has propagated, and RESEND_API_KEY belongs to the same Resend team that verified the domain.";
  }
  return "Check Resend dashboard, EMAIL_FROM, domain DNS, and recipient policy.";
}

function cronDebug(message: string, data?: Record<string, unknown>): void {
  const line = JSON.stringify({
    tag: LOG_TAG,
    message,
    at: new Date().toISOString(),
    ...data,
  });
  console.log(line);
}

function cronWarn(message: string, data?: Record<string, unknown>): void {
  const line = JSON.stringify({
    tag: LOG_TAG,
    level: "warn",
    message,
    at: new Date().toISOString(),
    ...data,
  });
  console.warn(line);
}

export const dynamic = "force-dynamic";

const SETTINGS_ID = "default";

function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

function dashboardBaseUrl(): string {
  const fromAuth = process.env.NEXTAUTH_URL?.replace(/\/$/, "");
  if (fromAuth) return fromAuth;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

function firstNameFrom(name: string | null, email: string): string {
  const n = name?.trim();
  if (n) {
    const first = n.split(/\s+/)[0];
    if (first) return first;
  }
  const local = email.split("@")[0]?.replace(/[._]+/g, " ").trim() ?? "";
  if (local) {
    const first = local.split(/\s+/)[0];
    if (first) return first;
  }
  return "there";
}

async function runCron(): Promise<NextResponse> {
  if (!canSendEmail()) {
    cronWarn("abort_no_resend", {
      reason: "RESEND_API_KEY missing or empty; cannot send email",
    });
    return NextResponse.json(
      { ok: false, error: "RESEND_API_KEY not configured; no emails sent." },
      { status: 200 }
    );
  }

  const settings = await prisma.reminderSettings.findUnique({
    where: { id: SETTINGS_ID },
  });
  if (!settings) {
    cronWarn("abort_no_settings", { settingsId: SETTINGS_ID });
    return NextResponse.json(
      { ok: false, error: "ReminderSettings row missing" },
      { status: 500 }
    );
  }

  const threshold = settings.inactiveDaysThreshold;
  const now = new Date();
  const recipients = await prisma.reminderRecipient.findMany({
    where: { enabled: true },
  });

  cronDebug("run_start", {
    threshold,
    enabledRecipientCount: recipients.length,
    dashboardBaseUrl: dashboardBaseUrl(),
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    emailFromSet: Boolean(process.env.EMAIL_FROM),
  });
  if (!process.env.EMAIL_FROM) {
    cronWarn("config_email_from_missing", {
      hint: "Default Resend onboarding From address only allows sending to your Resend account email until you verify a domain and set EMAIL_FROM.",
    });
  }

  type CronResultRow = {
    email: string;
    status: "sent" | "skipped" | "error";
    detail?: string;
    /** Latest `/` visit used for inactivity (ISO). */
    lastVisitAt?: string;
    /** Pacific calendar days since lastVisitAt until now. */
    inactiveDays?: number;
    /** ReminderSettings.inactiveDaysThreshold (min days since last / before eligible). */
    threshold?: number;
    /** Days since last reminder email (Pacific calendar), if any. */
    sinceLastReminderDays?: number;
  };

  const results: CronResultRow[] = [];

  for (const r of recipients) {
    cronDebug("recipient_start", {
      recipientId: r.id,
      email: r.email,
      name: r.name,
      lastReminderSentAt: r.lastReminderSentAt?.toISOString() ?? null,
    });

    const lastVisit = await prisma.pageVisit.findFirst({
      where: {
        path: "/",
        userEmail: { equals: r.email, mode: "insensitive" },
      },
      orderBy: { visitedAt: "desc" },
      select: { visitedAt: true },
    });

    if (!lastVisit) {
      cronDebug("recipient_skip", {
        email: r.email,
        detail: "no_home_visit_recorded",
        threshold,
        hint: "No PageVisit row for this email with path=/ in this deployment's database",
      });
      results.push({
        email: r.email,
        status: "skipped",
        detail: "no_home_visit_recorded",
        threshold,
      });
      continue;
    }

    const inactiveDays = pacificCalendarDaysBetween(lastVisit.visitedAt, now);
    const lastVisitAt = lastVisit.visitedAt.toISOString();
    if (inactiveDays < threshold) {
      cronDebug("recipient_skip", {
        email: r.email,
        detail: "active_within_threshold",
        lastVisitAt,
        inactiveDays,
        threshold,
        hint: "Last / visit is too recent for inactive-day threshold",
      });
      results.push({
        email: r.email,
        status: "skipped",
        detail: "active_within_threshold",
        lastVisitAt,
        inactiveDays,
        threshold,
      });
      continue;
    }

    if (r.lastReminderSentAt) {
      const sinceLast = pacificCalendarDaysBetween(r.lastReminderSentAt, now);
      if (sinceLast < MIN_PACIFIC_DAYS_BETWEEN_REMINDERS) {
        cronDebug("recipient_skip", {
          email: r.email,
          detail: "already_reminded_today",
          lastVisitAt,
          inactiveDays,
          threshold,
          sinceLastReminderDays: sinceLast,
          lastReminderSentAt: r.lastReminderSentAt.toISOString(),
          hint: "At most one reminder per Pacific calendar day; try again tomorrow or after manual cron",
        });
        results.push({
          email: r.email,
          status: "skipped",
          detail: "already_reminded_today",
          lastVisitAt,
          inactiveDays,
          threshold,
          sinceLastReminderDays: sinceLast,
        });
        continue;
      }
    }

    const base = dashboardBaseUrl();
    const dashboardUrl = `${base}/`;
    const firstName = firstNameFrom(r.name, r.email);
    const displayName = r.name?.trim() || r.email;
    const vars = {
      firstName,
      name: displayName,
      email: r.email,
      inactiveDays,
      dashboardUrl,
    };
    const subject = applyReminderTemplate(settings.emailSubject, vars);
    const textBody = applyReminderTemplate(settings.emailBody, vars);

    cronDebug("recipient_send_attempt", {
      email: r.email,
      inactiveDays,
      subjectLength: subject.length,
      bodyLength: textBody.length,
    });

    const send = await sendReminderEmail(r.email, subject, textBody);
    await sleepMs(RESEND_SPACING_MS);

    if (!send.ok) {
      const failHint = resendFailureHint(send.error);
      cronWarn("recipient_send_failed", {
        email: r.email,
        error: send.error,
        lastVisitAt,
        inactiveDays,
        threshold,
        hint: failHint,
      });
      results.push({
        email: r.email,
        status: "error",
        detail: send.error,
        lastVisitAt,
        inactiveDays,
        threshold,
      });
      continue;
    }

    await prisma.reminderRecipient.update({
      where: { id: r.id },
      data: { lastReminderSentAt: now },
    });
    cronDebug("recipient_sent", {
      email: r.email,
      inactiveDays,
      lastVisitAt,
    });
    results.push({
      email: r.email,
      status: "sent",
      lastVisitAt,
      inactiveDays,
      threshold,
    });
  }

  const sent = results.filter((x) => x.status === "sent").length;
  const skipped = results.filter((x) => x.status === "skipped").length;
  const errors = results.filter((x) => x.status === "error").length;

  cronDebug("run_complete", {
    threshold,
    sent,
    skipped,
    errors,
    ranAt: now.toISOString(),
  });

  return NextResponse.json({
    ok: true,
    threshold,
    sent,
    skipped,
    errors,
    /** Use this to confirm cron and seed share the same DB as this deployment. */
    ranAt: now.toISOString(),
    results,
  });
}

export async function GET(req: Request) {
  if (!cronAuthorized(req)) {
    cronWarn("auth_failed", {
      hasCronSecretEnv: Boolean(process.env.CRON_SECRET),
      hasAuthHeader: Boolean(req.headers.get("authorization")),
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runCron();
}

export async function POST(req: Request) {
  if (!cronAuthorized(req)) {
    cronWarn("auth_failed", {
      hasCronSecretEnv: Boolean(process.env.CRON_SECRET),
      hasAuthHeader: Boolean(req.headers.get("authorization")),
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runCron();
}
