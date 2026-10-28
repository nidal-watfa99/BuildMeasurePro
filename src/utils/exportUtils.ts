import { buildRoomDXF, downloadBlob, safeFileName } from './reportExport';
import type { RoomData, Object3DData } from '../types';

export { exportToCSV, exportToXLSX, generateEngineeringPDF } from './reportExport';

/**
 * تصدير المخطط ثنائي الأبعاد للغرفة إلى صيغة AutoCAD DXF القياسية
 * يمكن فتح هذا الملف مباشرة في أي برنامج CAD مثل AutoCAD وLibreCAD
 */
export function exportRoomToDXF(room: RoomData, projectName: string) {
  const blob = new Blob([buildRoomDXF(room)], { type: 'application/dxf' });
  downloadBlob(blob, `${safeFileName(room.name)}_${safeFileName(projectName)}_Plan.dxf`);
}

/**
 * تصدير النموذج ثلاثي الأبعاد للغرفة أو الجسم إلى ملف Wavefront OBJ القياسي
 * يمكن فتحه في Blender, SketchUp, 3ds Max
 */
export function exportRoomToOBJ(room: RoomData) {
  let obj = `# BuildMeasure Pro 3D Room Export\n`;
  obj += `# Room: ${room.name}, Floor Area: ${room.floorArea.toFixed(2)} m2, Height: ${room.height} m\n\n`;

  const h = room.height;
  const n = room.points.length;
  if (n < 3) return;

  // رؤوس الأرضية (Floor Vertices: 1 to n)
  obj += `# Floor Vertices (z = 0)\n`;
  room.points.forEach((p) => {
    obj += `v ${p.x.toFixed(4)} 0.0 ${p.y.toFixed(4)}\n`;
  });

  // رؤوس السقف (Ceiling Vertices: n+1 to 2n)
  obj += `\n# Ceiling Vertices (z = ${h})\n`;
  room.points.forEach((p) => {
    obj += `v ${p.x.toFixed(4)} ${h.toFixed(4)} ${p.y.toFixed(4)}\n`;
  });

  // وجه الأرضية (Floor Face)
  obj += `\n# Floor Face\n`;
  obj += `f ` + Array.from({ length: n }, (_, i) => i + 1).join(' ') + `\n`;

  // وجه السقف (Ceiling Face)
  obj += `\n# Ceiling Face\n`;
  obj += `f ` + Array.from({ length: n }, (_, i) => 2 * n - i).join(' ') + `\n`;

  // أوجه الجدران (Wall Quad Faces)
  obj += `\n# Wall Faces\n`;
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    const v1 = i + 1;
    const v2 = next + 1;
    const v3 = next + 1 + n;
    const v4 = i + 1 + n;
    obj += `f ${v1} ${v2} ${v3} ${v4}\n`;
  }

  const blob = new Blob([obj], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${room.name}_3D_Model.obj`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * تصدير كائن ثلاثي الأبعاد إلى ملف OBJ
 */
export function exportObjectToOBJ(objData: Object3DData) {
  const { length: l, width: w, height: h, name } = objData;
  const hl = l / 2;
  const hw = w / 2;

  let obj = `# BuildMeasure Pro 3D Object Box Export\n`;
  obj += `# Object: ${name}, Dimensions: ${l}m x ${w}m x ${h}m, Volume: ${objData.grossVolume}m3\n\n`;

  // 8 رؤوس للصندوق
  obj += `v ${-hl} 0 ${-hw}\n`;
  obj += `v ${hl} 0 ${-hw}\n`;
  obj += `v ${hl} 0 ${hw}\n`;
  obj += `v ${-hl} 0 ${hw}\n`;
  obj += `v ${-hl} ${h} ${-hw}\n`;
  obj += `v ${hl} ${h} ${-hw}\n`;
  obj += `v ${hl} ${h} ${hw}\n`;
  obj += `v ${-hl} ${h} ${hw}\n`;

  // 6 أوجه
  obj += `f 1 2 3 4\n`; // Bottom
  obj += `f 5 8 7 6\n`; // Top
  obj += `f 1 5 6 2\n`; // Front
  obj += `f 2 6 7 3\n`; // Right
  obj += `f 3 7 8 4\n`; // Back
  obj += `f 4 8 5 1\n`; // Left

  const blob = new Blob([obj], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${name}_3D_Box.obj`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
