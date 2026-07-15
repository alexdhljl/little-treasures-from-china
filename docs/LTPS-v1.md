# Auctus Heritage Product Standard v1.0

This is the canonical product data standard for Auctus Heritage and downstream channels such as Amazon, Etsy, Faire, Shopify, TikTok Shop, PDF catalogs, and AI content workflows.

## Canonical rules

- `sku`, `slug`, category, subcategory, tags, status, countries, currency, and brand use stable English values.
- Customer-facing copy has explicit English and Chinese fields.
- `status` uses `draft`, `review`, `active`, `hidden`, or `archived`. The legacy value `published` remains readable during migration.
- New AI-assisted records start with `needs_review=true` and `ai_generated=true`.
- A product is public only when its status is `active` or legacy `published`.
- Existing IDs, slugs, and image URLs are never replaced during migration.

## Product image structure

Supabase Storage bucket: `product-images`

```text
product-images/
  {product-slug}/
    cover.webp
    thumbnail.webp
    gallery-01.webp
    gallery-02.webp
    packaging-01.webp
    lifestyle-01.webp
    detail-01.webp
```

The database stores image roles separately in `cover_image`, `gallery_images`, `packaging_images`, and `lifestyle_images`. The legacy `images` array remains synchronized for backward compatibility.

## Import workflow

1. Scan source folders without modifying originals.
2. Group images by product and remove cross-folder duplicates.
3. Generate LTPS draft metadata and V3 Excel preview.
4. Human reviewer confirms names, grouping, prices, museum attribution, and image roles.
5. Optimize approved images to WebP, maximum width 1600px, plus 600px thumbnail.
6. Upload under the product slug folder.
7. Upsert only by confirmed slug or SKU. Never overwrite a nonmatching product.
8. Insert as `review`; switch to `active` only after content and photo checks.
9. Verify catalog, localized product page, and build.

## Migration

Run `supabase/migrations/20260704_ltps_v1.sql` once in the Supabase SQL Editor. It only adds columns, indexes, metadata, and backfills compatible values. It does not delete products, images, users, or URLs.

## Versioning

Every product carries `ltps_version`. Future optional trade fields should be introduced as a compatible minor version rather than replacing canonical identity fields.
