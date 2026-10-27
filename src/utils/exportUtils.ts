import { jsPDF } from 'jspdf';
import { Project, RoomData, Object3DData, Measurement, QuantityItem } from '../types';

/**
 * تصدير البيانات إلى ملف CSV متوافق مع Excel (مع UTF-8 BOM لدعم اللغة العربية بشكل مثالي)
 */
export function exportToCSV(project: Project) {
  const BOM = '\uFEFF';
  let csvContent = BOM;

  // رأس المشروع
  csvContent += `تقرير هندسي مفصل: ${project.name}\n`;
  csvContent += `الكود: ${project.code}, العميل: ${project.client}, الموقع: ${project.location}, التاريخ: ${project.createdAt}\n\n`;

  // جدول القياسات
  csvContent += `--- جدول القياسات المسجلة ---\n`;
  csvContent += `المعرف,العنصر,النوع,طريقة القياس,القيمة,الوحدة,مستوى الثقة,التاريخ,ملاحظات\n`;

  project.measurements.forEach((m) => {
    const methodArabic = 
      m.method === 'calibrated_camera' ? 'كاميرا بمعايرة' :
      m.method === 'sensor_assisted' ? 'مستشعرات وهاتف' :
      m.method === 'depth_lidar' ? 'LiDAR / عمق' :
      m.method === 'reference_verified' ? 'محقق بشريط قياس' : 'يدوي';
      
    const row = [
      `"${m.id}"`,
      `"${m.title}"`,
      `"${m.type}"`,
      `"${methodArabic}"`,
      `"${m.value}"`,
      `"${m.unit}"`,
      `"${m.confidence === 'high' ? 'مرتفع' : m.confidence === 'medium' ? 'متوسط' : 'تقديري'}"`,
      `"${new Date(m.timestamp).toLocaleDateString('ar-EG')}"`,
      `"${(m.notes || '').replace(/"/g, '""')}"`
    ];
    csvContent += row.join(',') + '\n';
  });

  csvContent += `\n--- جدول حصر الكميات والمواد (BOQ) ---\n`;
  csvContent += `البند,التصنيف,الكمية,الوحدة,سعر الوحدة,نسبة الهدر %,إجمالي الكمية,إجمالي التكلفة,المعادلة\n`;

  project.quantityItems.forEach((q) => {
    const row = [
      `"${q.name}"`,
      `"${q.category}"`,
      `"${q.quantity}"`,
      `"${q.unit}"`,
      `"${q.unitPrice}"`,
      `"${q.wastePercentage}%"`,
      `"${q.totalQuantity}"`,
      `"${q.totalCost}"`,
      `"${q.formula}"`
    ];
    csvContent += row.join(',') + '\n';
  });

  // تنزيل الملف
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${project.name.replace(/\s+/g, '_')}_Measurements_BOQ.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * تصدير المخطط ثنائي الأبعاد للغرفة إلى صيغة AutoCAD DXF القياسية
 * يمكن فتح هذا الملف مباشرة في أي برنامج CAD مثل AutoCAD وLibreCAD
 */
export function exportRoomToDXF(room: RoomData, projectName: string) {
  let dxf = `0
SECTION
2
HEADER
9
$ACADVER
1
AC1009
0
ENDSEC
0
SECTION
2
TABLES
0
TABLE
2
LAYER
70
2
0
LAYER
2
WALLS
70
0
62
7
6
CONTINUOUS
0
LAYER
2
DIMENSIONS
70
0
62
1
6
CONTINUOUS
0
ENDTAB
0
ENDSEC
0
SECTION
2
ENTITIES
`;

  // إضافة خطوط الجدران والأبعاد
  room.walls.forEach((wall, idx) => {
    // خط الجدار
    dxf += `0
LINE
8
WALLS
10
${wall.startPoint.x.toFixed(4)}
20
${wall.startPoint.y.toFixed(4)}
30
0.0
11
${wall.endPoint.x.toFixed(4)}
21
${wall.endPoint.y.toFixed(4)}
31
0.0
`;

    // نص طول الجدار في المنتصف
    const midX = (wall.startPoint.x + wall.endPoint.x) / 2;
    const midY = (wall.startPoint.y + wall.endPoint.y) / 2;
    dxf += `0
TEXT
8
DIMENSIONS
10
${midX.toFixed(4)}
20
${midY.toFixed(4)}
30
0.0
40
0.15
1
W${idx + 1}: ${wall.length.toFixed(2)}m
`;
  });

  // إضافة نص اسم الغرفة والمساحة بالمنتصف
  if (room.points.length > 0) {
    const avgX = room.points.reduce((sum, p) => sum + p.x, 0) / room.points.length;
    const avgY = room.points.reduce((sum, p) => sum + p.y, 0) / room.points.length;

    dxf += `0
TEXT
8
DIMENSIONS
10
${avgX.toFixed(4)}
20
${avgY.toFixed(4)}
30
0.0
40
0.25
1
${room.name} Area=${room.floorArea.toFixed(2)}m2
`;
  }

  // إنهاء ملف DXF
  dxf += `0
ENDSEC
0
EOF
`;

  const blob = new Blob([dxf], { type: 'application/dxf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${room.name}_${projectName}_Plan.dxf`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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

/**
 * توليد تقرير PDF هندسي احترافي محلياً بالكامل باستخدام jsPDF
 */
export function generateEngineeringPDF(project: Project) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Header Banner
  doc.setFillColor(10, 15, 29); // Dark navy
  doc.rect(0, 0, pageWidth, 32, 'F');

  // Title
  doc.setTextColor(245, 158, 11); // Engineering amber
  doc.setFontSize(18);
  doc.text('BuildMeasure Pro - Engineering Report', 14, 15);

  doc.setFontSize(10);
  doc.setTextColor(220, 225, 235);
  doc.text(`Project: ${project.name} | Code: ${project.code}`, 14, 23);
  doc.text(`Date: ${new Date().toISOString().split('T')[0]} | Client: ${project.client || 'N/A'}`, 14, 28);

  yPos = 42;

  // Project Summary Box
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(14, yPos, pageWidth - 28, 22, 3, 3, 'F');
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.text(`Location: ${project.location || 'Site Location Not Specified'}`, 18, yPos + 7);
  doc.text(`Total Recorded Measurements: ${project.measurements.length} items`, 18, yPos + 13);
  doc.text(`Total BOQ Items: ${project.quantityItems.length} items`, 18, yPos + 19);

  yPos += 30;

  // Section 1: Measurements Table
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Measurements & Dimensions Registry', 14, yPos);
  yPos += 6;

  // Table Header
  doc.setFillColor(30, 41, 59);
  doc.rect(14, yPos, pageWidth - 28, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('#', 16, yPos + 5);
  doc.text('Item Description', 25, yPos + 5);
  doc.text('Type', 85, yPos + 5);
  doc.text('Value & Unit', 115, yPos + 5);
  doc.text('Method', 145, yPos + 5);
  doc.text('Confidence', 175, yPos + 5);
  yPos += 8;

  // Rows
  project.measurements.slice(0, 15).forEach((m, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, 249, 250);
    doc.rect(14, yPos - 1, pageWidth - 28, 7, 'F');
    doc.setTextColor(30, 41, 59);
    doc.text(`${idx + 1}`, 16, yPos + 4);
    doc.text(m.title.substring(0, 28), 25, yPos + 4);
    doc.text(m.type, 85, yPos + 4);
    doc.text(`${m.value} ${m.unit}`, 115, yPos + 4);
    doc.text(m.method, 145, yPos + 4);
    doc.text(m.confidence, 175, yPos + 4);
    yPos += 7;
  });

  if (project.measurements.length > 15) {
    doc.setTextColor(100, 116, 139);
    doc.text(`... and ${project.measurements.length - 15} more measurements recorded in full digital export.`, 16, yPos + 4);
    yPos += 8;
  }

  yPos += 6;

  // Section 2: BOQ Table
  if (project.quantityItems.length > 0 && yPos < 220) {
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('2. Bill of Quantities (BOQ) Summary', 14, yPos);
    yPos += 6;

    doc.setFillColor(30, 41, 59);
    doc.rect(14, yPos, pageWidth - 28, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('Item', 16, yPos + 5);
    doc.text('Category', 65, yPos + 5);
    doc.text('Quantity', 105, yPos + 5);
    doc.text('Unit Price', 135, yPos + 5);
    doc.text('Total Cost', 165, yPos + 5);
    yPos += 8;

    let grandTotalCost = 0;
    project.quantityItems.slice(0, 10).forEach((q, idx) => {
      doc.setFillColor(idx % 2 === 0 ? 255 : 248, 249, 250);
      doc.rect(14, yPos - 1, pageWidth - 28, 7, 'F');
      doc.setTextColor(30, 41, 59);
      doc.text(q.name.substring(0, 22), 16, yPos + 4);
      doc.text(q.category, 65, yPos + 4);
      doc.text(`${q.totalQuantity} ${q.unit}`, 105, yPos + 4);
      doc.text(`${q.unitPrice.toLocaleString()}`, 135, yPos + 4);
      doc.text(`${q.totalCost.toLocaleString()}`, 165, yPos + 4);
      grandTotalCost += q.totalCost;
      yPos += 7;
    });

    // Total Row
    doc.setFillColor(241, 245, 249);
    doc.rect(14, yPos, pageWidth - 28, 7, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.text('Total Estimated Project Cost:', 105, yPos + 5);
    doc.text(`${grandTotalCost.toLocaleString()} SAR/USD`, 165, yPos + 5);
    yPos += 14;
  }

  // Engineering Disclaimer / Verification Notice (Mandatory Requirement)
  const footerY = 270;
  doc.setFillColor(254, 242, 242);
  doc.rect(14, footerY - 5, pageWidth - 28, 22, 'F');
  doc.setTextColor(185, 28, 28);
  doc.setFontSize(8);
  doc.text('ENGINEERING VERIFICATION & ACCURACY NOTICE:', 18, footerY);
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7);
  doc.text(
    'Measurements in this document were acquired using BuildMeasure Pro assistive tools (sensor/camera estimation and calibrated benchmarks).',
    18,
    footerY + 5
  );
  doc.text(
    'For structural, seismic, and sensitive construction milestones, always confirm critical dimensions using calibrated optical surveying or physical tape.',
    18,
    footerY + 9
  );
  doc.text(
    `Generated locally via BuildMeasure Pro. No cloud transmission. Date: ${new Date().toLocaleString()}`,
    18,
    footerY + 13
  );

  doc.save(`${project.name.replace(/\s+/g, '_')}_Engineering_Report.pdf`);
}
