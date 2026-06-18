# @team/shell

Shared TEAM internal app shell: navigation config, header dropdowns, **Member view / Admin view** toggle, and **View as…** impersonation UI.

## Usage (Next.js apps)

```json
"dependencies": {
  "@team/shell": "file:../packages/team-shell"
}
```

```js
// next.config.js
transpilePackages: ["@team/shell"],
```

Each app implements `GET/POST/DELETE /api/impersonate` and `GET /api/view-as-users` using the `team_impersonate` HttpOnly cookie (see Updates / Requests for reference).

## Exports

- `TeamHeader` building blocks: `UserNav`, `AdminNavDropdown`, `ViewAsDropdown`, `ImpersonationBanner`, `AdminViewToggle`
- `nav-config` — canonical user nav order and URL helpers
- `impersonation` — cookie name and shared types
- `styles/team-shell.css` — static HTML header/view-as styles (Payroll)

## Note

Impersonation is **per app** (per domain). It does not sync across apps when navigating via the header.
