# Where to get Azure AD credentials (Microsoft 365 sign-in)

You get **AZURE_AD_CLIENT_ID**, **AZURE_AD_CLIENT_SECRET**, and **AZURE_AD_TENANT_ID** from the **Azure Portal** by registering an app in **Azure Active Directory** (also called **Microsoft Entra ID**).

---

## 1. Open Azure Portal and sign in

- Go to **[https://portal.azure.com](https://portal.azure.com)** and sign in with a Microsoft 365 / work account that can manage apps (e.g. an admin).

---

## 2. Open App registrations

- In the search bar at the top, type **“App registrations”** and open it.
- Or: **Azure Active Directory** (or **Microsoft Entra ID**) → left menu → **App registrations**.

---

## 3. Create a new registration

- Click **+ New registration**.
- **Name:** e.g. `Teamvoc Updates` (any name you like).
- **Supported account types:** choose **“Single tenant only”** (e.g. *Single tenant only - TEAM Vocational Services*). That limits sign-in to your organization only. Do **not** choose “Any Entra ID Tenant + Personal Microsoft accounts” if you only want your org.
- **Redirect URI:** leave blank for now (you’ll add it in the next section).
- Click **Register**.

---

## 4. Copy Application (client) ID and Directory (tenant) ID

On the app’s **Overview** page you’ll see:

- **Application (client) ID** → use this as **AZURE_AD_CLIENT_ID**.
- **Directory (tenant) ID** → use this as **AZURE_AD_TENANT_ID**.

Copy both and keep them for your environment variables (e.g. in Vercel).

---

## 5. Create a client secret (for AZURE_AD_CLIENT_SECRET)

- In the left menu, click **Certificates & secrets**.
- Under **Client secrets**, click **+ New client secret**.
- **Description:** e.g. `Teamvoc Updates production`.
- **Expires:** choose a duration (e.g. 24 months).
- Click **Add**.
- **Important:** Copy the **Value** of the new secret immediately (it’s shown only once).  
  → Use this as **AZURE_AD_CLIENT_SECRET**.

If you don’t copy it, you’ll need to create a new secret and update your app’s env vars.

---

## 6. Add the redirect URI

- In the left menu, click **Authentication**.
- Under **Platform configurations**, click **+ Add a platform**.
- Choose **Web**.
- **Redirect URIs**, add:
  - For production: `https://teamvoc-updates.vercel.app/api/auth/callback/azure-ad`
  - For local: `http://localhost:3000/api/auth/callback/azure-ad`
- Under **Implicit grant and hybrid flows**, you can leave everything unchecked (we use the standard OAuth flow).
- Click **Configure**.

---

## 7. Put the values in your app (e.g. Vercel)

| Variable | Where you got it |
|----------|-------------------|
| **AZURE_AD_CLIENT_ID** | Overview → **Application (client) ID** |
| **AZURE_AD_TENANT_ID** | Overview → **Directory (tenant) ID** |
| **AZURE_AD_CLIENT_SECRET** | Certificates & secrets → **Value** of the client secret you created |

- **Vercel:** Project → **Settings** → **Environment Variables** → add each name and value, then redeploy.
- **Local:** Put them in a `.env` file in the project root (and keep `.env` out of git).

---

## Summary

- **AZURE_AD_CLIENT_ID** and **AZURE_AD_TENANT_ID** → Azure Portal → **App registrations** → your app → **Overview**.
- **AZURE_AD_CLIENT_SECRET** → same app → **Certificates & secrets** → new client secret → copy the **Value** once.
- Redirect URI must be set in the app’s **Authentication** and must match your site URL exactly (e.g. `https://teamvoc-updates.vercel.app/api/auth/callback/azure-ad`).
