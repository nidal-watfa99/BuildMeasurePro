import type { Project, Measurement, QuantityItem, RoomData } from '../types';

// ───────────────────────── أدوات مشتركة ─────────────────────────

/** اسم ملف آمن (يحذف المحارف الممنوعة ويحافظ على العربية) */
export function safeFileName(name: string, fallback = 'BuildMeasurePro'): string {
  const cleaned = (name || '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 80);
  return cleaned || fallback;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

const METHOD_AR: Record<string, string> = {
  calibrated_camera: 'كاميرا بمعايرة مرجعية',
  sensor_assisted: 'بمساعدة المستشعرات',
  depth_lidar: 'عمق / LiDAR',
  reference_verified: 'محقق بشريط قياس',
  manual: 'إدخال يدوي',
};
const TYPE_AR: Record<string, string> = {
  distance: 'مسافة', surface: 'سطح / مساحة', room: 'غرفة', object3d: 'جسم ثلاثي الأبعاد', boq: 'حصر',
};
const CONF_AR: Record<string, string> = { high: 'مرتفع', medium: 'متوسط', estimated: 'تقديري' };
const CAT_AR: Record<string, string> = {
  concrete: 'خرسانة', earthwork: 'حفر وردم', finishes: 'تشطيبات', materials: 'مواد',
};

export const methodLabel = (m: string) => METHOD_AR[m] ?? m;
export const typeLabel = (t: string) => TYPE_AR[t] ?? t;
export const confidenceLabel = (c: string) => CONF_AR[c] ?? c;
export const categoryLabel = (c: string) => CAT_AR[c] ?? c;

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().replace('T', ' ').slice(0, 16);
};

// ───────────────────────── CSV ─────────────────────────

/** تهريب حقل CSV: يضاعف علامات الاقتباس ويحيط بالنص، ويمنع حقن الصيغ (= + - @) */
export function csvCell(value: unknown): string {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  let s = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

export function buildCSV(project: Project): string {
  const rows: string[] = [];
  rows.push([csvCell('تقرير هندسي'), csvCell(project.name)].join(','));
  rows.push([csvCell('الكود'), csvCell(project.code), csvCell('العميل'), csvCell(project.client), csvCell('الموقع'), csvCell(project.location)].join(','));
  rows.push('');
  rows.push(csvCell('جدول القياسات'));
  rows.push(['المعرف', 'العنصر', 'النوع', 'طريقة القياس', 'القيمة', 'الوحدة', 'مستوى الثقة', 'التاريخ', 'ملاحظات'].map(csvCell).join(','));
  for (const m of project.measurements) {
    rows.push([
      csvCell(m.id), csvCell(m.title), csvCell(typeLabel(m.type)), csvCell(methodLabel(m.method)),
      csvCell(m.value), csvCell(m.unit), csvCell(confidenceLabel(m.confidence)), csvCell(fmtDate(m.timestamp)), csvCell(m.notes ?? ''),
    ].join(','));
  }
  rows.push('');
  rows.push(csvCell('جدول حصر الكميات (BOQ)'));
  rows.push(['البند', 'التصنيف', 'الكمية', 'الوحدة', 'سعر الوحدة', 'نسبة الهدر %', 'إجمالي الكمية', 'إجمالي التكلفة', 'المعادلة'].map(csvCell).join(','));
  for (const q of project.quantityItems) {
    rows.push([
      csvCell(q.name), csvCell(categoryLabel(q.category)), csvCell(q.quantity), csvCell(q.unit), csvCell(q.unitPrice),
      csvCell(q.wastePercentage), csvCell(q.totalQuantity), csvCell(q.totalCost), csvCell(q.formula),
    ].join(','));
  }
  // UTF-8 BOM لعرض العربية صحيحاً في Excel
  return '\uFEFF' + rows.join('\r\n') + '\r\n';
}

export function exportToCSV(project: Project): void {
  const blob = new Blob([buildCSV(project)], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${safeFileName(project.name)}_Measurements_BOQ.csv`);
}

// ───────────────────────── XLSX حقيقي (OOXML) ─────────────────────────

const xmlEsc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
   // إزالة المحارف غير المسموحة في XML 1.0
   // eslint-disable-next-line no-control-regex
   .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

const colName = (i: number) => {
  let n = i + 1, s = '';
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
};

type Cell = string | number | null;

function sheetXml(rows: Cell[][], widths: number[], headerRow = 0): string {
  const cols = widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
  const body = rows.map((row, r) => {
    const cells = row.map((v, c) => {
      const ref = `${colName(c)}${r + 1}`;
      const style = r === headerRow ? ' s="1"' : '';
      if (v === null || v === '') return `<c r="${ref}"${style}/>`;
      if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${ref}"${style} s="${r === headerRow ? 1 : 2}"><v>${v}</v></c>`;
      return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${xmlEsc(String(v))}</t></is></c>`;
    }).join('');
    return `<row r="${r + 1}">${cells}</row>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView rightToLeft="1" workbookViewId="0"><pane ySplit="${headerRow + 1}" topLeftCell="A${headerRow + 2}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData>${body}</sheetData></worksheet>`;
}

export function measurementRows(ms: Measurement[]): Cell[][] {
  return [
    ['المعرف', 'العنصر', 'النوع', 'طريقة القياس', 'القيمة', 'الوحدة', 'مستوى الثقة', 'التاريخ', 'ملاحظات'],
    ...ms.map((m) => [m.id, m.title, typeLabel(m.type), methodLabel(m.method), m.value, m.unit, confidenceLabel(m.confidence), fmtDate(m.timestamp), m.notes ?? '']),
  ];
}

export function boqRows(qs: QuantityItem[]): Cell[][] {
  const rows: Cell[][] = [
    ['البند', 'التصنيف', 'الكمية', 'الوحدة', 'سعر الوحدة', 'نسبة الهدر %', 'إجمالي الكمية', 'إجمالي التكلفة', 'المعادلة'],
    ...qs.map((q) => [q.name, categoryLabel(q.category), q.quantity, q.unit, q.unitPrice, q.wastePercentage, q.totalQuantity, q.totalCost, q.formula]),
  ];
  rows.push(['الإجمالي', null, null, null, null, null, null, qs.reduce((s, q) => s + q.totalCost, 0), null]);
  return rows;
}

export async function buildXLSXBlob(project: Project): Promise<Blob> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="القياسات" sheetId="1" r:id="rId1"/><sheet name="حصر الكميات" sheetId="2" r:id="rId2"/></sheets></workbook>`);
  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  zip.file('xl/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.000"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0E7490"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>`);
  zip.file('xl/worksheets/sheet1.xml', sheetXml(measurementRows(project.measurements), [16, 34, 16, 24, 12, 8, 14, 18, 46]));
  zip.file('xl/worksheets/sheet2.xml', sheetXml(boqRows(project.quantityItems), [34, 14, 12, 8, 12, 12, 14, 16, 40]));
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    compression: 'DEFLATE',
  });
}

export async function exportToXLSX(project: Project): Promise<void> {
  downloadBlob(await buildXLSXBlob(project), `${safeFileName(project.name)}_Measurements_BOQ.xlsx`);
}

// ───────────────────────── DXF ─────────────────────────

/** نص DXF آمن: غير ASCII يُكتب بصيغة \U+XXXX التي يفهمها AutoCAD/LibreCAD */
export function dxfText(s: string): string {
  return s.replace(/[\r\n]+/g, ' ').replace(/[^\x20-\x7E]/g, (ch) => `\\U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`);
}

export function buildRoomDXF(room: RoomData): string {
  const L: (string | number)[] = [];
  const g = (code: number, val: string | number) => { L.push(code, val); };
  g(0, 'SECTION'); g(2, 'HEADER'); g(9, '$ACADVER'); g(1, 'AC1009'); g(9, '$INSUNITS'); g(70, 6); g(0, 'ENDSEC');
  g(0, 'SECTION'); g(2, 'TABLES');
  g(0, 'TABLE'); g(2, 'LTYPE'); g(70, 1); g(0, 'LTYPE'); g(2, 'CONTINUOUS'); g(70, 0); g(3, 'Solid line'); g(72, 65); g(73, 0); g(40, 0.0); g(0, 'ENDTAB');
  g(0, 'TABLE'); g(2, 'LAYER'); g(70, 3);
  for (const [name, color] of [['0', 7], ['WALLS', 7], ['DIMENSIONS', 1]] as const) {
    g(0, 'LAYER'); g(2, name); g(70, 0); g(62, color); g(6, 'CONTINUOUS');
  }
  g(0, 'ENDTAB'); g(0, 'ENDSEC');
  g(0, 'SECTION'); g(2, 'ENTITIES');
  room.walls.forEach((w, i) => {
    g(0, 'LINE'); g(8, 'WALLS');
    g(10, w.startPoint.x.toFixed(4)); g(20, w.startPoint.y.toFixed(4)); g(30, '0.0');
    g(11, w.endPoint.x.toFixed(4)); g(21, w.endPoint.y.toFixed(4)); g(31, '0.0');
    g(0, 'TEXT'); g(8, 'DIMENSIONS');
    g(10, ((w.startPoint.x + w.endPoint.x) / 2).toFixed(4)); g(20, ((w.startPoint.y + w.endPoint.y) / 2).toFixed(4)); g(30, '0.0');
    g(40, '0.15'); g(1, `W${i + 1}: ${w.length.toFixed(2)} m`);
  });
  if (room.points.length > 0) {
    const ax = room.points.reduce((s, p) => s + p.x, 0) / room.points.length;
    const ay = room.points.reduce((s, p) => s + p.y, 0) / room.points.length;
    g(0, 'TEXT'); g(8, 'DIMENSIONS'); g(10, ax.toFixed(4)); g(20, ay.toFixed(4)); g(30, '0.0'); g(40, '0.25');
    g(1, dxfText(`${room.name} Area=${room.floorArea.toFixed(2)} m2`));
  }
  g(0, 'ENDSEC'); g(0, 'EOF');
  let out = '';
  for (let i = 0; i < L.length; i += 2) out += `${String(L[i]).padStart(3, ' ')}\r\n${L[i + 1]}\r\n`;
  return out;
}

// ───────────────────────── PDF عربي حقيقي ─────────────────────────
// jsPDF لا يشكّل الحروف العربية، لذا تُرسم الصفحات على Canvas (يدعم تشكيل العربية والاتجاه RTL
// محلياً في المتصفح) ثم تُضمَّن كصور عالية الدقة في ملف PDF. لا يُرسل أي شيء إلى الشبكة.

const PW = 1240; // A4 عند 150dpi
const PH = 1754;
const MARGIN = 70;
const FONT = "'Cairo','Segoe UI','Tahoma','Arial',sans-serif";
const HAS_AR = /[\u0600-\u06FF]/;

interface PageCtx { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; }

function createPage(): PageCtx {
  const canvas = document.createElement('canvas');
  canvas.width = PW;
  canvas.height = PH;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PW, PH);
  return { canvas, ctx };
}

function drawText(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, o: { size?: number; weight?: number | string; color?: string; align?: 'right' | 'left' | 'center'; maxWidth?: number } = {}) {
  const size = o.size ?? 22;
  ctx.font = `${o.weight ?? 500} ${size}px ${FONT}`;
  ctx.fillStyle = o.color ?? '#0f172a';
  ctx.direction = HAS_AR.test(s) ? 'rtl' : 'ltr';
  ctx.textAlign = o.align ?? 'right';
  ctx.textBaseline = 'middle';
  let text = s;
  if (o.maxWidth && ctx.measureText(text).width > o.maxWidth) {
    while (text.length > 1 && ctx.measureText(text + '…').width > o.maxWidth) text = text.slice(0, -1);
    text += '…';
  }
  ctx.fillText(text, x, y);
}

interface Col { title: string; w: number; align?: 'right' | 'left' | 'center'; }

function drawTable(
  pages: PageCtx[], startY: number, cols: Col[], rows: string[][], opts: { rowH?: number } = {}
): { y: number } {
  const rowH = opts.rowH ?? 40;
  const totalW = cols.reduce((s, c) => s + c.w, 0);
  const scale = (PW - 2 * MARGIN) / totalW;
  const widths = cols.map((c) => c.w * scale);
  let page = pages[pages.length - 1];
  let y = startY;

  const header = () => {
    const { ctx } = page;
    ctx.fillStyle = '#0e7490';
    ctx.fillRect(MARGIN, y, PW - 2 * MARGIN, rowH);
    let x = PW - MARGIN; // RTL: نبدأ من اليمين
    cols.forEach((c, i) => {
      drawText(ctx, c.title, x - 10, y + rowH / 2, { size: 19, weight: 700, color: '#ffffff', maxWidth: widths[i] - 16 });
      x -= widths[i];
    });
    y += rowH;
  };

  header();
  rows.forEach((row, r) => {
    if (y + rowH > PH - 200) {
      page = createPage();
      pages.push(page);
      y = MARGIN + 20;
      header();
    }
    const { ctx } = page;
    ctx.fillStyle = r % 2 === 0 ? '#f8fafc' : '#ffffff';
    ctx.fillRect(MARGIN, y, PW - 2 * MARGIN, rowH);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.strokeRect(MARGIN, y, PW - 2 * MARGIN, rowH);
    let x = PW - MARGIN;
    row.forEach((cell, i) => {
      drawText(ctx, cell, x - 10, y + rowH / 2, { size: 18, maxWidth: widths[i] - 16 });
      x -= widths[i];
    });
    y += rowH;
  });
  return { y };
}

function drawFooters(pages: PageCtx[]) {
  const n = pages.length;
  pages.forEach((p, i) => {
    const { ctx } = p;
    ctx.fillStyle = '#fef2f2';
    ctx.fillRect(MARGIN, PH - 190, PW - 2 * MARGIN, 120);
    drawText(ctx, 'تنبيه هندسي: القياسات في هذا التقرير مُنتَجة بأدوات BuildMeasure Pro المساعدة (كاميرا/مستشعرات/معايرة) وهي تقديرية ما لم يُذكر خلاف ذلك.', PW - MARGIN - 16, PH - 160, { size: 17, color: '#b91c1c', weight: 700, maxWidth: PW - 2 * MARGIN - 32 });
    drawText(ctx, 'للمراحل الإنشائية والحرجة تحقّق من الأبعاد بشريط قياس أو مساحة بجهاز معتمد قبل التنفيذ. أُنشئ هذا التقرير محلياً على جهازك دون إرسال بيانات.', PW - MARGIN - 16, PH - 125, { size: 16, color: '#475569', maxWidth: PW - 2 * MARGIN - 32 });
    drawText(ctx, `صفحة ${i + 1} / ${n}`, MARGIN + 10, PH - 40, { size: 16, color: '#64748b', align: 'left' });
    drawText(ctx, `${new Date().toISOString().slice(0, 16).replace('T', ' ')}`, PW - MARGIN - 10, PH - 40, { size: 16, color: '#64748b' });
  });
}

export async function generateEngineeringPDF(project: Project): Promise<void> {
  try { await (document as Document & { fonts?: FontFaceSet }).fonts?.load(`700 20px Cairo`); } catch { /* الخط اختياري */ }

  const pages: PageCtx[] = [createPage()];
  let { ctx } = pages[0];

  // رأس التقرير
  ctx.fillStyle = '#0b1730';
  ctx.fillRect(0, 0, PW, 170);
  drawText(ctx, 'تقرير هندسي — BuildMeasure Pro', PW - MARGIN, 70, { size: 40, weight: 800, color: '#ffffff' });
  drawText(ctx, project.name, PW - MARGIN, 125, { size: 24, color: '#67e8f9', maxWidth: PW - 2 * MARGIN });

  // بيانات المشروع
  let y = 215;
  const info: [string, string][] = [
    ['الكود', project.code || '—'], ['العميل', project.client || '—'], ['الموقع', project.location || '—'],
    ['عدد القياسات', String(project.measurements.length)], ['عدد بنود الحصر', String(project.quantityItems.length)],
  ];
  info.forEach(([k, v], i) => {
    const yy = y + i * 38;
    drawText(ctx, `${k}:`, PW - MARGIN, yy, { size: 20, weight: 700, color: '#475569' });
    drawText(ctx, v, PW - MARGIN - 190, yy, { size: 20, maxWidth: 700 });
  });
  y += info.length * 38 + 25;

  // جدول القياسات
  drawText(ctx, '١. سجل القياسات والأبعاد', PW - MARGIN, y, { size: 28, weight: 800, color: '#0e7490' });
  y += 30;
  if (project.measurements.length === 0) {
    drawText(ctx, 'لا توجد قياسات مسجلة.', PW - MARGIN, y + 30, { size: 20, color: '#64748b' });
    y += 60;
  } else {
    const res = drawTable(pages, y, [
      { title: '#', w: 40 }, { title: 'العنصر', w: 250 }, { title: 'النوع', w: 120 }, { title: 'القيمة', w: 130 },
      { title: 'الطريقة', w: 170 }, { title: 'الثقة', w: 80 }, { title: 'التاريخ', w: 150 },
    ], project.measurements.map((m, i) => [
      String(i + 1), m.title, typeLabel(m.type), `${m.value} ${m.unit}`, methodLabel(m.method), confidenceLabel(m.confidence), fmtDate(m.timestamp).slice(0, 10),
    ]));
    y = res.y + 40;
  }

  // جدول BOQ
  if (project.quantityItems.length > 0) {
    let page = pages[pages.length - 1];
    if (y > PH - 420) { page = createPage(); pages.push(page); y = MARGIN + 20; }
    ctx = page.ctx;
    drawText(ctx, '٢. ملخص حصر الكميات والتكاليف (BOQ)', PW - MARGIN, y, { size: 28, weight: 800, color: '#0e7490' });
    y += 30;
    const res = drawTable(pages, y, [
      { title: 'البند', w: 260 }, { title: 'التصنيف', w: 110 }, { title: 'الكمية الكلية', w: 150 },
      { title: 'سعر الوحدة', w: 120 }, { title: 'الهدر %', w: 80 }, { title: 'التكلفة', w: 140 },
    ], project.quantityItems.map((q) => [
      q.name, categoryLabel(q.category), `${q.totalQuantity} ${q.unit}`, q.unitPrice.toLocaleString('en-US'), String(q.wastePercentage), q.totalCost.toLocaleString('en-US'),
    ]));
    const last = pages[pages.length - 1];
    const total = project.quantityItems.reduce((s, q) => s + q.totalCost, 0);
    let yy = res.y + 12;
    if (yy > PH - 260) { const np = createPage(); pages.push(np); yy = MARGIN + 30; }
    const cur = pages[pages.length - 1];
    void last;
    cur.ctx.fillStyle = '#ecfeff';
    cur.ctx.fillRect(MARGIN, yy, PW - 2 * MARGIN, 48);
    drawText(cur.ctx, `الإجمالي التقديري: ${total.toLocaleString('en-US')} (بعملة التسعير المُدخلة)`, PW - MARGIN - 14, yy + 24, { size: 22, weight: 800, color: '#0e7490' });
  }

  drawFooters(pages);

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  pages.forEach((p, i) => {
    if (i > 0) doc.addPage('a4', 'portrait');
    doc.addImage(p.canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  });
  doc.save(`${safeFileName(project.name)}_Engineering_Report.pdf`);
}
