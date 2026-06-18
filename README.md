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
```

The service role key is included for trusted server/setup use. Do not expose it in browser code.

## Supabase Setup

1. Create a Supabase project.
2. Open the SQL editor.
3. Run `supabase/schema.sql`.
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
