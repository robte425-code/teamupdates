export function requireInternalAccess(req: Request, appLabel = "Updates"): string | null {
  const secret = process.env.TEAM_INTERNAL_ACCESS_SECRET?.trim();
  if (!secret) {
    return `TEAM_INTERNAL_ACCESS_SECRET is not configured on ${appLabel}`;
  }

  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return "Forbidden";
  }

  return null;
}
