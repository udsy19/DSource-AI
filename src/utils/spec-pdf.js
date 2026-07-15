import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

/**
 * Spec-sheet PDF generation, set in the atelier design system (design.md):
 * warm paper ground, token palette (no pure black/white), Libre Caslon Text
 * for the promise voice (title/deck/section heads), mono as the spec-sheet
 * voice (labels, values, prices), hairline title-block cells, registration
 * crop marks, and the halftone field dissolving off the masthead rule.
 * Indigo appears exactly where design.md allows it: the counts.
 *
 * buildSpecPdf is pure layout (products in, bytes out; images arrive as
 * pre-fetched JPEG buffers) so it is unit-testable without network.
 */

// A4 portrait
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 52;

// Exact design.md tokens.
const INK = rgb(0x26 / 255, 0x22 / 255, 0x1a / 255); // --viz-ink
const MUTED = rgb(0x77 / 255, 0x70 / 255, 0x5f / 255); // --viz-muted
const LINE = rgb(0xd9 / 255, 0xd2 / 255, 0xc2 / 255); // --viz-line
const PAPER = rgb(0xfb / 255, 0xf9 / 255, 0xf4 / 255); // --viz-paper
const GROUND = rgb(0xee / 255, 0xeb / 255, 0xe2 / 255); // --viz-ground
const INDIGO = rgb(0x35 / 255, 0x41 / 255, 0x8c / 255); // --viz-blue

const FONT_DIR = path.join(process.cwd(), "src", "assets", "fonts");

const money = (n) =>
  `$${Number(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const pad2 = (n) => String(n).padStart(2, "0");

const truncate = (font, text, size, maxWidth) => {
  let value = String(text ?? "");
  if (font.widthOfTextAtSize(value, size) <= maxWidth) return value;
  while (
    value.length > 1 &&
    font.widthOfTextAtSize(`${value}…`, size) > maxWidth
  ) {
    value = value.slice(0, -1);
  }
  return `${value}…`;
};

/**
 * @param {object} spec
 * @param {string} spec.projectName
 * @param {Array}  spec.products  [{ name, brand, category, color, dimensions,
 *                                   price, quantity, imageJpeg: Buffer|null }]
 * @returns {Promise<Uint8Array>} PDF bytes
 */
export const buildSpecPdf = async ({ projectName, products }) => {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  // The promise voice — real Libre Caslon Text (vendored, OFL).
  const [caslonBoldBytes, caslonItalicBytes] = await Promise.all([
    readFile(path.join(FONT_DIR, "LibreCaslonText-Bold.ttf")),
    readFile(path.join(FONT_DIR, "LibreCaslonText-Italic.ttf")),
  ]);
  const caslonBold = await doc.embedFont(caslonBoldBytes, { subset: true });
  const caslonItalic = await doc.embedFont(caslonItalicBytes, {
    subset: true,
  });
  // Interface + instrument stand-ins (Geist/Geist Mono have no static print
  // faces; grotesque + mono standard fonts carry the same roles).
  const body = await doc.embedFont(StandardFonts.Helvetica);
  const bodyBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.Courier);
  const monoBold = await doc.embedFont(StandardFonts.CourierBold);

  doc.setTitle(`${projectName} — Spec sheet`);
  doc.setProducer("DSource.AI");

  const categories = new Map();
  for (const product of products) {
    const key = product.category || "Uncategorized";
    if (!categories.has(key)) categories.set(key, []);
    categories.get(key).push(product);
  }
  const subtotal = products.reduce(
    (sum, p) => sum + (p.price || 0) * (p.quantity || 1),
    0,
  );
  const date = new Date().toISOString().slice(0, 10);

  let page = null;
  let y = 0;
  const pages = [];

  // .viz-label: mono, uppercase, tracked, muted.
  const label = (pg, text, x, yy, color = MUTED) =>
    pg.drawText(text.toUpperCase(), {
      x,
      y: yy,
      size: 6.5,
      font: mono,
      color,
      characterSpacing: 1.1,
    });

  // Registration corners (.viz-crop) — the sheet is the artwork.
  const cropMarks = (pg) => {
    const len = 12;
    const inset = 22;
    const corners = [
      [inset, PAGE_H - inset, 1, -1],
      [PAGE_W - inset, PAGE_H - inset, -1, -1],
      [inset, inset, 1, 1],
      [PAGE_W - inset, inset, -1, 1],
    ];
    for (const [cx, cy, dx, dy] of corners) {
      pg.drawLine({
        start: { x: cx, y: cy },
        end: { x: cx + len * dx, y: cy },
        color: INK,
        thickness: 1.2,
        opacity: 0.5,
      });
      pg.drawLine({
        start: { x: cx, y: cy },
        end: { x: cx, y: cy + len * dy },
        color: INK,
        thickness: 1.2,
        opacity: 0.5,
      });
    }
  };

  // Halftone field dissolving off the masthead rule's right end
  // (.viz-dots-rule): densest at the rule, dissolving down-left.
  const dotsField = (pg, ruleY) => {
    const cell = 6;
    const cols = 24;
    const rows = 5;
    const startX = PAGE_W - MARGIN - cols * cell;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const density = (c / cols) * (1 - r / rows);
        if (density < 0.18) continue;
        pg.drawCircle({
          x: startX + c * cell,
          y: ruleY - 4 - r * cell,
          size: 0.9,
          color: INK,
          opacity: Math.min(0.32, density * 0.45),
        });
      }
    }
  };

  const paperGround = (pg) =>
    pg.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_W,
      height: PAGE_H,
      color: PAPER,
    });

  const newPage = () => {
    page = doc.addPage([PAGE_W, PAGE_H]);
    pages.push(page);
    paperGround(page);
    cropMarks(page);
    y = PAGE_H - MARGIN;

    if (pages.length === 1) {
      // --- Masthead folio: label pair over the ink rule ---
      label(page, "DSource Studio", MARGIN, y);
      const right = "Specification sheet";
      label(
        page,
        right,
        PAGE_W -
          MARGIN -
          mono.widthOfTextAtSize(right.toUpperCase(), 6.5) -
          right.length * 1.1,
        y,
      );
      y -= 8;
      page.drawLine({
        start: { x: MARGIN, y },
        end: { x: PAGE_W - MARGIN, y },
        color: INK,
        thickness: 1.6,
      });
      dotsField(page, y);
      y -= 34;

      // --- Serif title + italic deck (the promise voice) ---
      page.drawText(
        truncate(caslonBold, projectName, 26, PAGE_W - MARGIN * 2),
        {
          x: MARGIN,
          y,
          size: 26,
          font: caslonBold,
          color: INK,
        },
      );
      y -= 18;
      page.drawText("Everything you've chosen, set down as one document.", {
        x: MARGIN,
        y,
        size: 10.5,
        font: caslonItalic,
        color: MUTED,
      });
      y -= 22;

      // --- Title-block strip (plate label) ---
      const cells = [
        ["Sheet", "SP-01", INK, mono],
        ["Date", date, INK, mono],
        ["Items", pad2(products.length), INDIGO, monoBold],
        ["Sections", pad2(categories.size), INK, mono],
        ["Subtotal", money(subtotal), INK, mono],
      ];
      const stripH = 30;
      const cellW = (PAGE_W - MARGIN * 2) / cells.length;
      y -= stripH;
      page.drawRectangle({
        x: MARGIN,
        y,
        width: PAGE_W - MARGIN * 2,
        height: stripH,
        color: PAPER,
        borderColor: LINE,
        borderWidth: 0.9,
      });
      cells.forEach(([k, v, color, font], i) => {
        const x = MARGIN + i * cellW;
        if (i > 0) {
          page.drawLine({
            start: { x, y },
            end: { x, y: y + stripH },
            color: LINE,
            thickness: 0.9,
          });
        }
        label(page, k, x + 6, y + stripH - 10);
        page.drawText(truncate(font, v, 8.5, cellW - 12), {
          x: x + 6,
          y: y + 6,
          size: 8.5,
          font,
          color,
        });
      });
      y -= 26;
    } else {
      page.drawText(truncate(caslonItalic, projectName, 11, 300), {
        x: MARGIN,
        y: y - 4,
        size: 11,
        font: caslonItalic,
        color: MUTED,
      });
      label(page, "Spec sheet · continued", PAGE_W - MARGIN - 150, y - 2);
      y -= 14;
      page.drawLine({
        start: { x: MARGIN, y },
        end: { x: PAGE_W - MARGIN, y },
        color: LINE,
        thickness: 0.9,
      });
      y -= 16;
    }
  };

  const ensureRoom = (needed) => {
    if (y - needed < MARGIN + 26) newPage();
  };

  newPage();

  // --- Category sections: serif head + indigo count, hairline rows ---
  const ROW_H = 52;
  for (const [categoryName, items] of categories) {
    ensureRoom(36 + ROW_H);
    const headSize = 15;
    const headText = truncate(caslonBold, categoryName, headSize, 380);
    page.drawText(headText, {
      x: MARGIN,
      y: y - 12,
      size: headSize,
      font: caslonBold,
      color: INK,
    });
    page.drawText(pad2(items.length), {
      x: MARGIN + caslonBold.widthOfTextAtSize(headText, headSize) + 8,
      y: y - 11,
      size: 8,
      font: monoBold,
      color: INDIGO,
    });
    y -= 19;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_W - MARGIN, y },
      color: LINE,
      thickness: 0.9,
    });
    y -= 8;

    for (const item of items) {
      ensureRoom(ROW_H);
      const rowTop = y;

      // Thumbnail, or a ground-toned well (never a gray void).
      const thumbW = 56;
      const thumbH = 42;
      if (item.imageJpeg) {
        try {
          const jpg = await doc.embedJpg(item.imageJpeg);
          const scale = Math.max(thumbW / jpg.width, thumbH / jpg.height);
          const w = jpg.width * scale;
          const h = jpg.height * scale;
          page.drawImage(jpg, {
            x: MARGIN + (thumbW - w) / 2,
            y: rowTop - thumbH + (thumbH - h) / 2,
            width: w,
            height: h,
          });
        } catch {
          item.imageJpeg = null;
        }
      }
      if (!item.imageJpeg) {
        page.drawRectangle({
          x: MARGIN,
          y: rowTop - thumbH,
          width: thumbW,
          height: thumbH,
          color: GROUND,
          borderColor: LINE,
          borderWidth: 0.6,
        });
      }

      const textX = MARGIN + thumbW + 12;
      const priceColW = 112;
      const nameW = PAGE_W - MARGIN - textX - priceColW;

      page.drawText(
        truncate(bodyBold, item.name || "Untitled product", 10, nameW),
        {
          x: textX,
          y: rowTop - 12,
          size: 10,
          font: bodyBold,
          color: INK,
        },
      );
      const metaLine = [item.brand, item.color, item.dimensions]
        .filter(Boolean)
        .join("  ·  ");
      if (metaLine) {
        page.drawText(truncate(body, metaLine, 8, nameW), {
          x: textX,
          y: rowTop - 25,
          size: 8,
          font: body,
          color: MUTED,
        });
      }
      label(page, `Qty ${item.quantity || 1}`, textX, rowTop - 38);

      // Prices are facts → mono voice, right-aligned.
      const lineTotal = money((item.price || 0) * (item.quantity || 1));
      page.drawText(lineTotal, {
        x: PAGE_W - MARGIN - monoBold.widthOfTextAtSize(lineTotal, 9.5),
        y: rowTop - 12,
        size: 9.5,
        font: monoBold,
        color: INK,
      });
      if ((item.quantity || 1) > 1) {
        const unit = `${money(item.price || 0)} each`;
        page.drawText(unit, {
          x: PAGE_W - MARGIN - mono.widthOfTextAtSize(unit, 7.5),
          y: rowTop - 24,
          size: 7.5,
          font: mono,
          color: MUTED,
        });
      }

      y -= ROW_H;
      page.drawLine({
        start: { x: MARGIN, y: y + 6 },
        end: { x: PAGE_W - MARGIN, y: y + 6 },
        color: LINE,
        thickness: 0.6,
      });
    }
    y -= 10;
  }

  // --- Tally line ---
  ensureRoom(54);
  y -= 8;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_W - MARGIN, y },
    color: INK,
    thickness: 1.6,
  });
  y -= 20;
  const totalText = money(subtotal);
  const totalW = monoBold.widthOfTextAtSize(totalText, 14);
  label(page, "Subtotal", PAGE_W - MARGIN - totalW - 74, y + 2);
  page.drawText(totalText, {
    x: PAGE_W - MARGIN - totalW,
    y: y - 2,
    size: 14,
    font: monoBold,
    color: INK,
  });

  // --- Footer on every page ---
  pages.forEach((pg, i) => {
    label(pg, `Generated by DSource.AI · ${date}`, MARGIN, MARGIN - 22);
    const pageText = `${i + 1} / ${pages.length}`;
    pg.drawText(pageText, {
      x: PAGE_W - MARGIN - mono.widthOfTextAtSize(pageText, 7),
      y: MARGIN - 22,
      size: 7,
      font: mono,
      color: MUTED,
    });
  });

  return doc.save();
};
