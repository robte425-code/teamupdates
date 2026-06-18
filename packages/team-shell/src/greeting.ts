export function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning,";
  if (hour < 17) return "Good afternoon,";
  return "Good evening,";
}

export function firstDisplayName(
  name: string | null | undefined,
  email: string | null | undefined
): string {
  if (name?.trim()) return name.trim().split(/\s+/)[0] ?? name;
  if (email?.trim()) return email.trim().split("@")[0];
  return "";
}
