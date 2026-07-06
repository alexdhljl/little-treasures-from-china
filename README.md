# Little Treasures From China

Independent catalog and admin dashboard for curated Chinese museum gifts and cultural objects.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase database, auth, and image storage
- Vercel deployment

## Environment Variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
RESEND_API_KEY=your-resend-api-key
INQUIRY_NOTIFICATION_EMAIL=hello@auctuslab.com
INQUIRY_FROM_EMAIL=Little Treasures <onboarding@resend.dev>
```

The service role key is included for trusted server/setup use. Do not expose it in browser code.

## Supabase Setup

1. Create a Supabase project.
2. Open the SQL editor.
3. Run `supabase/schema.sql`.

For an existing database, also run `supabase/migrations/20260704_ltps_v1.sql` once. This upgrades products, museums, and collections to the bilingual Little Treasures Product Standard without deleting existing records, slugs, or images. See `docs/LTPS-v1.md` for field rules, image structure, and the review-first import workflow.

Run `supabase/migrations/20260706_inquiry_workflow.sql` to enable inquiry storage and the admin inquiry dashboard. It creates `inquiries` and `inquiry_items` without changing product data.
4. Create an Auth user for yourself in Supabase Authentication.
5. Register that user as an admin:

```sql
insert into public.admin_users (user_id, email)
values ('YOUR_AUTH_USER_UUID', 'you@example.com');
```

The schema creates:

- `products`
- `admin_users`
- `inventory_status` enum
- Row Level Security policies
- public `product-images` storage bucket
- admin-only storage upload/update/delete policies

If you already ran an earlier schema, run `supabase/schema.sql` again after updates.
It uses `add column if not exists` for new product fields such as occasion tags,
recipient tags, gift recommendations, and official collection.

### Phase 2 CMS migration

Run the latest `supabase/schema.sql` once more in the Supabase SQL Editor before
opening the upgraded admin. It adds the production CMS tables and policies:

- `categories`
- `museums`
- `collections`
- `stories`
- `media`
- `site_settings`
- product publishing, SEO, alt text, and relational ID fields

The migration is additive and preserves existing products. After it succeeds,
refresh `/admin`; Categories, Museums, Collections, Stories, Media Library, and
Settings will become available. Product and CMS changes are read directly from
Supabase by the storefront without a code deployment.

## Local Development

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Admin dashboard:

```text
http://localhost:3000/admin
```

Admin inquiries:

```text
http://localhost:3000/admin/inquiries
```

## Inquiry Workflow

- Product pages support an image carousel, fullscreen preview, and Add to Inquiry.
- Inquiry cart data stays in the visitor's browser until submission.
- `/en/inquiry` and `/zh/inquiry` save customer and product details to Supabase.
- Contact and catalog requests use the same tracked inquiry workflow.
- Email notifications are sent through Resend when `RESEND_API_KEY` is configured.
- If Resend is not configured, the inquiry is still saved successfully in Supabase.

Product catalog:

```text
http://localhost:3000/catalog
```

Product detail route:

```text
http://localhost:3000/products/product-slug
```

## Admin Features

- Admin login through Supabase Auth
- Product list
- Add product
- Edit product
- Delete product
- Upload product images to Supabase Storage
- Set price and currency
- Set inventory status
- Set category, collection, museum, region, province, and city
- Mark featured products
- Write product story
- Set materials, dimensions, and weight
- Set tags
- Set related products
- Preview public product pages

## Product Photo Import Workflow

Local source folder:

```text
C:\Users\alexd\Documents\博物馆文创\product photos
```

Dry-run organizer:

```bash
cd frontend
npm run organize:photos
```

This scans `.jpg`, `.jpeg`, `.png`, `.webp`, and `.heic` files, then writes:

```text
organized-products/products-import.json
organized-products/review-products.csv
organized-products/manual-review.json
```

The first run is dry-run only. It does not copy, optimize, upload, overwrite,
or delete photos.

After reviewing and editing `review-products.csv` / `products-import.json`, create
organized folders and optimized WebP files:

```bash
cd frontend
npm run organize:photos -- --write
```

Write mode creates folders such as:

```text
organized-products/product-review-001/
  01-main.jpg
  web/01-main.webp
  thumbs/01-main-thumb.webp
```

Upload images to Supabase Storage is also dry-run by default:

```bash
cd frontend
npm run upload:product-images
```

Actual upload requires:

```bash
npm run upload:product-images -- --write
```

Product import is dry-run by default:

```bash
npm run import:products
```

Actual import:

```bash
npm run import:products -- --write
```

To update an existing product with the same slug:

```bash
npm run import:products -- --write --confirm-upsert
```

Safety rules:

- Original files in `product photos` are never deleted.
- Supabase upload/import defaults to dry-run.
- Existing Supabase products are not updated unless the slug matches and
  `--confirm-upsert` is provided.
- Every run logs planned actions.

## Public Commerce Model

There is no checkout yet. Product pages keep these inquiry-first actions:

- Request Price
- Ask About This Product
- Request Catalog

## Deployment

For Vercel, set the project root to `frontend`, or keep the root `vercel.json` build commands as configured.

Add the same Supabase environment variables in Vercel Project Settings.

## Build Check

```bash
cd frontend
npm run build
```
