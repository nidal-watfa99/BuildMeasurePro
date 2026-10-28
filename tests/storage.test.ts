import test from 'node:test';
import assert from 'node:assert/strict';

// localStorage وهمي قابل للإعداد (حصة/تلف)
class FakeStorage {
  data = new Map<string, string>();
  failWrites = false;
  get length() { return this.data.size; }
  key(i: number) { return [...this.data.keys()][i] ?? null; }
  getItem(k: string) { return this.data.has(k) ? this.data.get(k)! : null; }
  setItem(k: string, v: string) {
    if (this.failWrites) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; }
    this.data.set(k, String(v));
  }
  removeItem(k: string) { this.data.delete(k); }
  clear() { this.data.clear(); }
}
const ls = new FakeStorage();
(globalThis as any).localStorage = ls;

const mod = await import('../src/services/storage.ts');
const { StorageService, StorageError, validateBackup } = mod;

const fresh = () => { ls.clear(); ls.failWrites = false; StorageService.__resetForTests(); };

test('أول تشغيل: مشروع تجريبي موسوم ومصحّح الأرقام', () => {
  fresh();
  const ps = StorageService.getProjects();
  assert.equal(ps.length, 1);
  assert.equal(ps[0].isDemo, true);
  const room = ps[0].measurements.find((m: any) => m.roomData)!.roomData!;
  assert.equal(room.perimeter, 24.8);
  assert.equal(room.totalWallGrossArea, 76.88);
  assert.equal(room.totalWallNetArea, 69.08);
  const g = room.walls.reduce((s: number, w: any) => s + w.grossArea, 0);
  const n = room.walls.reduce((s: number, w: any) => s + w.netArea, 0);
  assert.ok(Math.abs(g - room.totalWallGrossArea) < 1e-9 && Math.abs(n - room.totalWallNetArea) < 1e-9);
});

test('اختبار السطح المائل يُعرض بالمتر المربع (0.65 م²)', () => {
  fresh();
  const t = StorageService.getVerificationTests().find((x: any) => x.id === 'test_05')!;
  assert.equal(t.quantityKind, 'area');
  assert.equal(t.absoluteError, 0.65);
  assert.equal(t.errorUnit, 'م²');
  assert.equal(t.absoluteErrorMm, undefined);
  assert.ok(Math.abs(t.measuredValueMeters - t.nominalValueMeters - 0.65) < 1e-9);
});

test('حفظ القياس يبقى بعد "إعادة فتح" التطبيق ويرتبط بالمشروع الصحيح', () => {
  fresh();
  StorageService.getProjects();
  const m = StorageService.addMeasurement({ projectId: 'x', title: 't', type: 'distance', method: 'manual', confidence: 'medium', value: 2.5, unit: 'm' } as any);
  const reread = JSON.parse(ls.getItem('buildmeasure_projects_v1')!);
  const proj = reread.find((p: any) => p.id === StorageService.getActiveProjectId());
  assert.ok(proj.measurements.some((x: any) => x.id === m.id && x.projectId === proj.id));
});

test('فشل التخزين (امتلاء) يرمي StorageError ولا يعطي نجاحاً كاذباً', () => {
  fresh();
  StorageService.getProjects();
  ls.failWrites = true;
  assert.throws(
    () => StorageService.addMeasurement({ projectId: 'x', title: 't', type: 'distance', method: 'manual', confidence: 'medium', value: 1, unit: 'm' } as any),
    (e: any) => e instanceof StorageError && e.code === 'quota'
  );
});

test('بيانات تالفة لا تُستبدل بصمت ببيانات تجريبية', () => {
  fresh();
  ls.setItem('buildmeasure_projects_v1', '{not json');
  const ps = StorageService.getProjects();
  assert.deepEqual(ps, []);
  assert.equal(ls.getItem('buildmeasure_projects_v1'), '{not json'); // لم تُمس
  assert.ok([...ls.data.keys()].some((k) => k.startsWith('buildmeasure_corrupt_')));
});

test('استيراد نسخة غير صالحة يُرفض ولا يغيّر البيانات', () => {
  fresh();
  StorageService.getProjects();
  const before = ls.getItem('buildmeasure_projects_v1');
  for (const bad of ['not json', '{}', '{"projects":[]}', '{"projects":[{"id":"a"}]}',
    '{"projects":[{"id":"a","name":"n","measurements":[{"id":"m","value":"x","unit":"m"}],"quantityItems":[]}]}',
    '{"projects":[{"id":"a","name":"n","measurements":[],"quantityItems":[]},{"id":"a","name":"n","measurements":[],"quantityItems":[]}]}']) {
    assert.equal(StorageService.importFullBackup(bad), false, bad);
  }
  assert.equal(ls.getItem('buildmeasure_projects_v1'), before);
});

test('استيراد نسخة صالحة يعمل ويُنشئ نسخة احتياطية قبل الاستبدال', () => {
  fresh();
  StorageService.getProjects();
  const good = JSON.stringify({ projects: [{ id: 'p1', name: 'مشروعي', measurements: [], quantityItems: [] }], activeProjectId: 'p1' });
  const r = StorageService.importFullBackupDetailed(good);
  assert.equal(r.ok, true);
  assert.equal(StorageService.getActiveProjectId(), 'p1');
  assert.ok(ls.getItem('buildmeasure_pre_import_backup_v1'));
});

test('إزالة البيانات التجريبية لا تمس مشاريع المستخدم', () => {
  fresh();
  StorageService.getProjects();
  const good = JSON.stringify({ projects: [
    { id: 'proj_demo_01', isDemo: true, name: 'demo', measurements: [], quantityItems: [] },
    { id: 'mine', name: 'مشروعي', measurements: [{ id: 'm1', title: 'x', value: 1, unit: 'm' }], quantityItems: [] }] });
  StorageService.importFullBackup(good);
  const r = StorageService.removeDemoData();
  assert.equal(r.projectsRemoved, 1);
  const left = StorageService.getProjects();
  assert.deepEqual(left.map((p: any) => p.id), ['mine']);
  assert.equal(left[0].measurements.length, 1);
});

test('ترحيل v1→v2 يصحح أرقام المشروع التجريبي القديم فقط', () => {
  fresh();
  const old = [{ id: 'proj_demo_01', name: 'd', measurements: [
    { id: 'meas_02', value: 38.4, unit: 'm²', roomData: { perimeter: 25.2, totalWallGrossArea: 78.12, totalWallNetArea: 70.32 } },
  ], quantityItems: [] }, { id: 'mine', name: 'مشروعي', measurements: [], quantityItems: [] }];
  ls.setItem('buildmeasure_projects_v1', JSON.stringify(old));
  // المخطط الأقدم لا يحمل رقم إصدار → يُرحَّل عند أول قراءة
  StorageService.getProjects();
  const ps = JSON.parse(ls.getItem('buildmeasure_projects_v1')!);
  assert.equal(ps[0].measurements[0].roomData.totalWallNetArea, 69.08);
  assert.equal(ps.length, 2);
});

test('validateBackup: رسائل أخطاء مفهومة', () => {
  const v = validateBackup({ projects: [{ id: 'a' }] });
  assert.equal(v.ok, false);
  assert.ok(v.errors.length >= 1);
});
