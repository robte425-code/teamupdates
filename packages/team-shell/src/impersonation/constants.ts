/** HttpOnly cookie name — shared convention; each app sets it on its own origin. */
export const IMPERSONATE_COOKIE = "team_impersonate";

/** 8 hours */
export const IMPERSONATE_MAX_AGE_SECONDS = 8 * 60 * 60;

export const ADMIN_VIEW_STORAGE_KEY = "teamvoc-admin-view";

export interface ViewAsUser {
  email: string;
  displayName: string;
}

export interface ImpersonationStatus {
  canImpersonate: boolean;
  impersonating: boolean;
  real: { email: string; name: string };
  effective: { email: string; name: string; role: string };
  target: { email: string; name: string } | null;
}
