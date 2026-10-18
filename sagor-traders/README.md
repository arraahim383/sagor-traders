# M/S Sagor Traders website

Next.js 15 site for M/S Sagor Traders (Marico distributor, Ullapara, Sirajganj) with a Supabase backend and a built-in admin.

- **Public site**: home page built to the green design (hero with live brand bubbles, about, product carousel, team, contact), product catalogue with brand/type filters and search, a page per product with an order-request form, and a full About page.
- **Admin** at `/admin`: inquiries inbox, products, brands, product types, team, offers (auto-expire by date), site settings, staff accounts. Photos are resized in the browser and stored in Supabase Storage.
- **Data**: Supabase Postgres with row-level security. Visitors can read published content and send inquiries; only people on the `staff` list can change anything.

## Run locally

```bash
cp .env.example .env.local   # already points at the sagor-traders Supabase project
npm install
npm run dev                  # http://localhost:3000
```

Without the two `NEXT_PUBLIC_SUPABASE_*` variables the site runs on bundled demo content (same text and photos) and the admin is switched off.

## Deploy (Vercel, about 5 minutes)

1. Push this folder to a GitHub repository.
2. In Vercel: **Add New → Project → Import** that repository. Framework is detected as Next.js.
3. Add the environment variables from `.env.example` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL` once you know the domain).
4. Deploy. `vercel.json` runs the server code in Mumbai (`bom1`), next to the database.
5. Add your domain under **Settings → Domains** if you want to move off the Vercel address.

### Supabase settings after the first deploy

In the Supabase dashboard for **sagor-traders** → **Authentication → URL Configuration**:

- **Site URL**: your live address, e.g. `https://sagortraders.vercel.app`
- **Redirect URLs**: add `https://<your address>/auth/callback`

This makes sign-up confirmation and password-reset emails land on your site instead of `localhost`.

### First admin

1. Open `/admin/login`, choose **Create an account**, and confirm the email.
2. In Supabase → **Table editor → staff**, insert a row: `email` = that address (lower case), `role` = `admin`.
3. Reload `/admin`. From then on, add other staff under **Admin → Account → Staff**; they create their own account with the same email.

## Where things live

| Path | What |
| --- | --- |
| `src/app/(site)` | Public pages: home, products, product detail, about |
| `src/components/site` | Header, hero, brand bubbles, about, product cards and carousel, team grid, contact, footer |
| `src/app/admin` | Admin pages and server actions (`actions.ts`) |
| `src/lib/admin/schema.ts` | Field definitions for every admin form and list; add a field here and in the database |
| `src/lib/data.ts` | Public data loading (cached, falls back to demo content) |
| `src/lib/seed.ts` | Demo content, mirrors the database seed |
| `supabase/migrations` | Database schema, security rules, storage bucket and seed data |
| `public/media` | Bundled photos: hero, about, contact backgrounds, brand logos, products, team |

## Notes

- Public pages are cached and refresh within 5 minutes; any save in the admin refreshes them immediately.
- Headline line breaks: in **Settings → Hero → Headline**, press Enter where a new line should start.
- The contact form accepts a phone number or email (one is required) and has a hidden spam trap plus a per-visitor rate limit.
