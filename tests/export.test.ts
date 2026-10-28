import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { buildCSV, buildXLSXBlob, buildRoomDXF, safeFileName, csvCell } from '../src/utils/reportExport.ts';

const project: any = {
  id: 'p', name: 'مشروع "اختبار" / x', code: 'C', client: 'عميل', location: 'الرياض', createdAt: '2026-10-27T00:00:00Z', updatedAt: '', description: '',
  measurements: [
    { id: 'm1', title: 'طول, "الصالة"', type: 'distance', method: 'sensor_assisted', confidence: 'high', value: 6.4, unit: 'm', timestamp: '2026-10-27T10:00:00Z', notes: '=HYPERLINK("x")' },
    { id: 'm2', title: 'مساحة', type: 'surface', method: 'manual', confidence: 'medium', value: 38.4, unit: 'm²', timestamp: '2026-10-27T10:05:00Z' },
  ],
  quantityItems: [{ id: 'q1', name: 'بلاط', category: 'finishes', quantity: 38.4, unit: 'م²', unitPrice: 85, wastePercentage: 10, totalQuantity: 42.24, totalCost: 3590.4, formula: 'a*b' }],
};

test('CSV: BOM، تهريب علامات الاقتباس، منع حقن الصيغ، أرقام غير مقتبسة', () => {
  const csv = buildCSV(project);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"طول, ""الصالة"""'));
  assert.ok(csv.includes(`"'=HYPERLINK(""x"")"`));
  assert.ok(/,6\.4,"m"/.test(csv));
  assert.equal(csvCell(NaN), '');
});

test('اسم الملف الآمن', () => {
  assert.ok(!/[\\/:*?"<>|]/.test(safeFileName('a/b:c*d?"e<f>g|h')));
  assert.equal(safeFileName(''), 'BuildMeasurePro');
});

test('XLSX أصلي: أجزاء OOXML كاملة وخلايا رقمية ونص عربي مُهرَّب', async () => {
  const blob = await buildXLSXBlob(project);
  const zip = await JSZip.loadAsync(Buffer.from(await blob.arrayBuffer()));
  const names = Object.keys(zip.files);
  for (const n of ['[Content_Types].xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml', 'xl/styles.xml', '_rels/.rels']) assert.ok(names.includes(n), n);
  const s1 = await zip.file('xl/worksheets/sheet1.xml')!.async('string');
  assert.ok(s1.includes('<v>6.4</v>') && s1.includes('<v>38.4</v>'));
  assert.ok(s1.includes('طول, &quot;الصالة&quot;'));
  assert.ok(s1.includes('rightToLeft="1"'));
  const s2 = await zip.file('xl/worksheets/sheet2.xml')!.async('string');
  assert.ok(s2.includes('<v>3590.4</v>'));
});

test('DXF: بنية صحيحة، ASCII فقط، العربية بصيغة \\U+', () => {
  const room: any = { id: 'r', name: 'الصالة', height: 3, floorArea: 38.4, ceilingArea: 38.4, perimeter: 24.8, totalWallGrossArea: 0, totalWallNetArea: 0,
    points: [{ x: 0, y: 0 }, { x: 6.4, y: 0 }, { x: 6.4, y: 6 }, { x: 0, y: 6 }],
    walls: [{ id: 'w1', startPoint: { x: 0, y: 0 }, endPoint: { x: 6.4, y: 0 }, length: 6.4, height: 3, grossArea: 0, netArea: 0, openings: [] }], openings: [] };
  const dxf = buildRoomDXF(room);
  assert.ok(dxf.endsWith('  0\r\nEOF\r\n'));
  assert.ok(/\\U\+0627/.test(dxf));
  assert.ok(!/[^\x00-\x7F]/.test(dxf));
  assert.equal(dxf.split('\r\n').length % 2, 1);
});
