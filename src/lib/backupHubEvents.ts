/** Dispatched after a full protection run so NeonBackupPanel can refresh live status. */
export const BACKUP_HUB_REFRESH_NEON_EVENT = "backup-hub:refresh-neon";

export function dispatchBackupHubRefreshNeon(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(BACKUP_HUB_REFRESH_NEON_EVENT));
  }
}
