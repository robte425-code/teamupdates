import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  applyReminderTemplate,
  canSendEmail,
  sendReminderEmail,
} from "@/lib/email";
import { pageVisitWhereNotRobert } from "@/lib/pageVisitRobertExclusions";
import { pacificCalendarDaysBetween } from "@/lib/reminderPacificDays";

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
    return NextResponse.json(
      { ok: false, error: "RESEND_API_KEY not configured; no emails sent." },
      { status: 200 }
    );
  }

  const settings = await prisma.reminderSettings.findUnique({
    where: { id: SETTINGS_ID },
  });
  if (!settings) {
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

  const results: {
    email: string;
    status: "sent" | "skipped" | "error";
    detail?: string;
  }[] = [];

  const visitWhereBase = pageVisitWhereNotRobert();

  for (const r of recipients) {
    const lastVisit = await prisma.pageVisit.findFirst({
      where: {
        path: "/",
        userEmail: { equals: r.email, mode: "insensitive" },
        ...visitWhereBase,
      },
      orderBy: { visitedAt: "desc" },
      select: { visitedAt: true },
    });

    if (!lastVisit) {
      results.push({
        email: r.email,
        status: "skipped",
        detail: "no_home_visit_recorded",
      });
      continue;
    }

    const inactiveDays = pacificCalendarDaysBetween(lastVisit.visitedAt, now);
    if (inactiveDays < threshold) {
      results.push({
        email: r.email,
        status: "skipped",
        detail: "active_within_threshold",
      });
      continue;
    }

    if (r.lastReminderSentAt) {
      const sinceLast = pacificCalendarDaysBetween(r.lastReminderSentAt, now);
      if (sinceLast < threshold) {
        results.push({
          email: r.email,
          status: "skipped",
          detail: "repeat_interval",
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

    const send = await sendReminderEmail(r.email, subject, textBody);
    if (!send.ok) {
      results.push({
        email: r.email,
        status: "error",
        detail: send.error,
      });
      continue;
    }

    await prisma.reminderRecipient.update({
      where: { id: r.id },
      data: { lastReminderSentAt: now },
    });
    results.push({ email: r.email, status: "sent" });
  }

  const sent = results.filter((x) => x.status === "sent").length;
  const skipped = results.filter((x) => x.status === "skipped").length;
  const errors = results.filter((x) => x.status === "error").length;

  return NextResponse.json({
    ok: true,
    threshold,
    sent,
    skipped,
    errors,
    results,
  });
}

export async function GET(req: Request) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runCron();
}

export async function POST(req: Request) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runCron();
}
