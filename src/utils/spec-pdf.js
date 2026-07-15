import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

/**
 * Spec-sheet PDF generation — replaces the old canned public/specsheet.pdf.
 *
 * buildSpecPdf is pure layout (products in, bytes out; images arrive as
 * pre-fetched JPEG buffers) so it is unit-testable without network. The API
 * route owns fetching/sanitizing.
 *
 * Aesthetic mirrors the app's drawing-set identity: serif headings
 * (Times Roman ~ Caslon), mono labels (Courier), warm ink, a title-block
 * strip under the header.
 */

// A4 portrait
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;

const INK = rgb(0.16, 0.15, 0.13); // warm ink
const MUTED = rgb(0.45, 0.43, 0.4);
const LINE = rgb(0.8, 0.78, 0.74);
const PAPER_WELL = rgb(0.95, 0.94, 0.92);

const money = (n) =>
  `$${Number(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const truncate = (font, text, size, maxWidth) => {
  let value = String(text ?? "");
  if (font.widthOfTextAtSize(value, size) <= maxWidth) return value;
  while (value.length > 1 && font.widthOfTextAtSize(`${value}…`, size) > maxWidth) {
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
  const serif = await doc.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const body = await doc.embedFont(StandardFonts.Helvetica);
  const bodyBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.Courier);

  doc.setTitle(`${projectName} — Specification Sheet`);
  doc.setProducer("DSource.AI");

  // Group by category, preserving insertion order.
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

  const label = (pg, text, x, yy) =>
    pg.drawText(text.toUpperCase(), {
      x,
      y: yy,
      size: 6.5,
      font: mono,
      color: MUTED,
      characterSpacing: 1.2,
    });

  const newPage = () => {
    page = doc.addPage([PAGE_W, PAGE_H]);
    pages.push(page);
    y = PAGE_H - MARGIN;

    if (pages.length === 1) {
      // --- Header: project title + wordmark ---
      label(page, "Specification sheet", MARGIN, y - 8);
      page.drawText("DSource.AI", {
        x: PAGE_W - MARGIN - serif.widthOfTextAtSize("DSource.AI", 12),
        y: y - 10,
        size: 12,
        font: serif,
        color: INK,
      });
      y -= 30;
      page.drawText(truncate(serif, projectName, 24, PAGE_W - MARGIN * 2), {
        x: MARGIN,
        y,
        size: 24,
        font: serif,
        color: INK,
      });
      y -= 18;

      // --- Title-block strip ---
      const cells = [
        ["Sheet", "S-01"],
        ["Date", date],
        ["Items", String(products.length)],
        ["Sections", String(categories.size)],
        ["Subtotal", money(subtotal)],
      ];
      const stripH = 30;
      const cellW = (PAGE_W - MARGIN * 2) / cells.length;
      y -= stripH;
      page.drawRectangle({
        x: MARGIN,
        y,
        width: PAGE_W - MARGIN * 2,
        height: stripH,
        borderColor: LINE,
        borderWidth: 0.75,
      });
      cells.forEach(([k, v], i) => {
        const x = MARGIN + i * cellW;
        if (i > 0) {
          page.drawLine({
            start: { x, y },
            end: { x, y: y + stripH },
            color: LINE,
            thickness: 0.75,
          });
        }
        label(page, k, x + 6, y + stripH - 10);
        page.drawText(truncate(mono, v, 8.5, cellW - 12), {
          x: x + 6,
          y: y + 6,
          size: 8.5,
          font: mono,
          color: INK,
        });
      });
      y -= 24;
    } else {
      // Continuation header
      page.drawText(truncate(serifItalic, projectName, 11, 300), {
        x: MARGIN,
        y: y - 4,
        size: 11,
        font: serifItalic,
        color: MUTED,
      });
      label(page, "Specification sheet · continued", PAGE_W - MARGIN - 160, y - 2);
      y -= 24;
    }
  };

  const ensureRoom = (needed) => {
    if (y - needed < MARGIN + 30) newPage();
  };

  newPage();

  // --- Categories & rows ---
  const ROW_H = 52;
  for (const [categoryName, items] of categories) {
    ensureRoom(34 + ROW_H);
    page.drawText(truncate(serif, categoryName, 14, 380), {
      x: MARGIN,
      y: y - 12,
      size: 14,
      font: serif,
      color: INK,
    });
    const countText = `${items.length} item${items.length === 1 ? "" : "s"}`;
    page.drawText(countText, {
      x: PAGE_W - MARGIN - mono.widthOfTextAtSize(countText, 8),
      y: y - 11,
      size: 8,
      font: mono,
      color: MUTED,
    });
    y -= 18;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_W - MARGIN, y },
      color: INK,
      thickness: 1,
    });
    y -= 8;

    for (const item of items) {
      ensureRoom(ROW_H);
      const rowTop = y;

      // Thumbnail (or placeholder well)
      const thumbW = 56;
      const thumbH = 42;
      if (item.imageJpeg) {
        try {
          const jpg = await doc.embedJpg(item.imageJpeg);
          // Cover-fit into the thumb box
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
          color: PAPER_WELL,
          borderColor: LINE,
          borderWidth: 0.5,
        });
      }

      const textX = MARGIN + thumbW + 12;
      const priceColW = 110;
      const nameW = PAGE_W - MARGIN - textX - priceColW;

      page.drawText(truncate(bodyBold, item.name || "Untitled product", 10, nameW), {
        x: textX,
        y: rowTop - 12,
        size: 10,
        font: bodyBold,
        color: INK,
      });
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

      // Price column (right-aligned)
      const lineTotal = money((item.price || 0) * (item.quantity || 1));
      page.drawText(lineTotal, {
        x: PAGE_W - MARGIN - bodyBold.widthOfTextAtSize(lineTotal, 10),
        y: rowTop - 12,
        size: 10,
        font: bodyBold,
        color: INK,
      });
      if ((item.quantity || 1) > 1) {
        const unit = `${money(item.price || 0)} each`;
        page.drawText(unit, {
          x: PAGE_W - MARGIN - body.widthOfTextAtSize(unit, 7.5),
          y: rowTop - 24,
          size: 7.5,
          font: body,
          color: MUTED,
        });
      }

      y -= ROW_H;
      page.drawLine({
        start: { x: MARGIN, y: y + 6 },
        end: { x: PAGE_W - MARGIN, y: y + 6 },
        color: LINE,
        thickness: 0.5,
      });
    }
    y -= 10;
  }

  // --- Totals ---
  ensureRoom(56);
  y -= 8;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_W - MARGIN, y },
    color: INK,
    thickness: 1.5,
  });
  y -= 22;
  label(page, "Subtotal", PAGE_W - MARGIN - 180, y + 2);
  const totalText = money(subtotal);
  page.drawText(totalText, {
    x: PAGE_W - MARGIN - serif.widthOfTextAtSize(totalText, 16),
    y: y - 4,
    size: 16,
    font: serif,
    color: INK,
  });

  // --- Footer on every page ---
  pages.forEach((pg, i) => {
    label(pg, `Generated by DSource.AI · ${date}`, MARGIN, MARGIN - 18);
    const pageText = `${i + 1} / ${pages.length}`;
    pg.drawText(pageText, {
      x: PAGE_W - MARGIN - mono.widthOfTextAtSize(pageText, 7),
      y: MARGIN - 18,
      size: 7,
      font: mono,
      color: MUTED,
    });
  });

  return doc.save();
};
