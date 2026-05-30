# advnce labs — Wholesale Pricing Sheets

Reference copies of the wholesale pricing sheets. The working HTML templates live at
the repo root (`wholesale-kit-pricing-template.html`, `wholesale-pricing-template.html`);
these are dated snapshots kept for reference.

## Files

| File | What it is |
|------|------------|
| `advncelabs-wholesale-kit-2026-05-29.{html,pdf,png}` | **Kit pricing** — prices per 10-vial kit. Tiers A–F in kits (A 1–9 … F 50+). Current sheet to send. |
| `advncelabs-wholesale-pervial-2026-05-19.{html,pdf}` | **Per-vial pricing** — original sheet, prices per single vial. Tiers A–F in vials (10–90 … 500+). |

## Kit vs per-vial

Same products and tier structure; the kit sheet is the per-vial sheet with every price
×10 (1 kit = 10 vials, min 1 kit / 10 vials per SKU). The kit sheet drops Dermorphin and
sorts multi-size SKUs by ascending dose. Both sheets list Dihexa as `20mg / 3ml` (it is a
vial, not a tablet pack).

## Regenerating the PDF / PNG

From an HTML template, via headless Chrome:

```sh
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SRC="wholesale-kit-pricing-template.html"

# PDF (Letter, paginated)
"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer \
  --virtual-time-budget=8000 --print-to-pdf="out.pdf" "file://$PWD/$SRC"

# PNG (single continuous image, 2x). Height = document scrollHeight at 1100px width (~5700).
"$CHROME" --headless=new --disable-gpu --hide-scrollbars \
  --window-size=1100,5700 --force-device-scale-factor=2 \
  --virtual-time-budget=6000 --screenshot="out.png" "file://$PWD/$SRC"
```

Contact on both sheets: wholesale@advncelabs.com
