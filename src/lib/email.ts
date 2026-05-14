const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM ?? "Team Voc <onboarding@resend.dev>";
const APP_NAME = process.env.APP_NAME ?? "Team Vocational Services";

export async function sendWelcomeEmail(
  to: string,
  temporaryPassword: string,
  appUrl: string
): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }
  const { Resend } = await import("resend");
  const resend = new Resend(RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [to],
    subject: `Your ${APP_NAME} account`,
    html: `
      <p>An account has been created for you at ${APP_NAME}.</p>
      <p><strong>Sign-in URL:</strong> <a href="${appUrl}/login">${appUrl}/login</a></p>
      <p><strong>Email:</strong> ${to}</p>
      <p><strong>Temporary password:</strong> <code>${temporaryPassword}</code></p>
      <p>Please sign in with the temporary password above. You can change it later if the app supports it.</p>
    `,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export function canSendEmail(): boolean {
  return !!RESEND_API_KEY;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function applyReminderTemplate(
  template: string,
  vars: {
    firstName: string;
    name: string;
    email: string;
    inactiveDays: number;
    dashboardUrl: string;
  }
): string {
  return template
    .replaceAll("{{firstName}}", vars.firstName)
    .replaceAll("{{name}}", vars.name)
    .replaceAll("{{email}}", vars.email)
    .replaceAll("{{inactiveDays}}", String(vars.inactiveDays))
    .replaceAll("{{dashboardUrl}}", vars.dashboardUrl);
}

export async function sendReminderEmail(
  to: string,
  subject: string,
  textBody: string
): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }
  const { Resend } = await import("resend");
  const resend = new Resend(RESEND_API_KEY);
  const html = escapeHtml(textBody)
    .split("\n")
    .map((line) => (line.length ? `<p>${line}</p>` : "<br/>"))
    .join("");
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [to],
    subject,
    html,
    text: textBody,
  });
  if (error) {
    const name = "name" in error && typeof (error as { name?: string }).name === "string" ? (error as { name: string }).name : "";
    const suffix = name ? ` (${name})` : "";
    return { ok: false, error: `${error.message}${suffix}` };
  }
  return { ok: true };
}
