# Putting MOVA live on Cloudflare

Everything runs on Cloudflare: the **mova** Worker serves the website and the API, the **mova-db** D1 database holds the data,
and the **mova-driver-photos** R2 bucket holds driver photos. The database and the bucket already exist in the account and the
database tables are already created, so there is nothing to create by hand.

## 0. Before you merge: keep the old waitlist

The old sign-ups are still in Supabase. Save them first, so you can import them into the new console (step 5).

1. Open [supabase.com/dashboard](https://supabase.com/dashboard) and open the **Mova** project.
2. Click **Table Editor** in the left menu, then the **mova_signups** table.
3. Click **Export** (top right), then **Export as CSV**. Keep the file.

Accounts made in the pilot app (passengers and drivers) cannot be moved, because passwords can't be copied. Testers create their
account again in the app, and drivers are checked again in the console.

## 1. Merge the pull request

On GitHub, open the pull request and click **Merge pull request**, then **Confirm merge**.

## 2. Check the Cloudflare build settings

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Compute** → **Workers & Pages** → click **mova**.
2. Open **Settings** → **Build**. Check that:
   - **Git repository** is `skynovaagency1-web/Mova`, branch `main`.
   - **Build command** is `npm run build`.
   - **Deploy command** is `npx wrangler deploy`.
   If the repository is not connected, click **Connect**, choose **GitHub**, pick **Mova**, then fill in the two commands above.

## 3. Add the setup code

This one-time code protects the creation of the first admin account.

1. Still in **mova** → **Settings** → **Variables and Secrets**, click **+ Add**.
2. **Type**: Secret. **Variable name**: `SETUP_CODE`. **Value**: a long phrase only you know (for example 5 random words).
3. Click **Deploy**.

## 4. Check that the site is live

1. Open the **Deployments** tab and wait until the latest one shows **Success** (2 to 3 minutes after the merge).
2. Click the link at the top of the **mova** page (`https://mova.<your-subdomain>.workers.dev`). The MOVA website opens.
3. Add `/api/health` to the address. You should see `{"ok":true}`.

## 5. Create your admin account

1. Open `https://mova.<your-subdomain>.workers.dev/ops/`.
2. Enter the setup code, your e-mail and a password (12 characters or more), then **Créer le compte**.
3. Scan the QR code with Google Authenticator, Microsoft Authenticator or 1Password, then type the 6-digit code.
4. You are in the console. Click **Importer** (next to **CSV**) and choose the file from step 0. The old sign-ups appear.
5. Optional: delete the `SETUP_CODE` secret. It stops working anyway once the team has a member.

Add teammates in **Équipe et accès** → **Ajouter un membre**. You get a link to send them; they choose a password and set up
their own 6-digit codes.

## 6. Point the app to the new address

The app uses `https://mova.skynovaagency1.workers.dev` (in `mobile/src/config.ts`). If the address from step 4 is different, or
once you add your own domain, change that line (or tell Claude the address and it will update it).

## Optional

- **Your own domain** (for example `mova-besancon.fr`): **mova** → **Settings** → **Domains & Routes** → **+ Add** → **Custom domain**.
  The domain has to be on Cloudflare first (**Add a domain** on the account home).
- **Password-reset e-mails**: these need the Workers Paid plan ($5/month) and your own domain. Until then, people who forget their
  password ask the team, and you make a link in **Équipe et accès** → **Mot de passe oublié**. To turn e-mails on: onboard the domain
  in **Compute** → **Email Service** → **Email Sending**, then uncomment the `send_email` and `MAIL_FROM` lines in `wrangler.jsonc`.
- **Free plan limits**: the free plan gives each request 10 ms of processing. Password checks are heavy, so if a login ever shows
  **Error 1102**, switch to Workers Paid (**Workers & Pages** → **Plans**). Everything else stays well within the free plan.

## Updating the database later

The table definitions are in `worker/schema.sql`. Every statement is safe to run again:

```bash
npx wrangler d1 execute mova-db --remote --file worker/schema.sql
```
