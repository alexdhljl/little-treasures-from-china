# Auctus Image Pipeline v2.1

This workflow upgrades product photographs without generative reconstruction. It
preserves product structure, packaging text, materials, and color while applying
conservative catalog corrections: orientation, crop, centering, neutral white
balance, exposure, light noise reduction, and light sharpening.

## Run

From `frontend`:

```powershell
npm run images:upgrade
```

The default input is `product photos/2026.7.23 原来产品重拍`. To process another
folder:

```powershell
python scripts/auctus-image-pipeline.py --input "upload"
```

Each run creates:

- `outputs/auctus-image-pipeline-v2.1/<run>/report.html`
- one product folder with `hero.webp`, `hero.jpg`, gallery WebP/JPG files, and
  `thumbnail.webp`
- `manifest.json` with match confidence, hero scores, and source mapping
- a lossless copy of every input under
  `backup/auctus-image-pipeline-v2.1/<run>/input`

## Safety boundary

The pipeline never modifies website files, the database, titles, descriptions,
SEO, product IDs, or URLs. Low-confidence product matches and weak hero
candidates are marked `Needs Review`.

Step 7 (website replacement), GitHub commit, and deployment are deliberately not
implemented in this command. They require explicit approval after reviewing
`report.html`.
