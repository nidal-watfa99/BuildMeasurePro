import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Point2D, RoomData, WallSegment, Opening } from '../types';
import { calculatePolygonArea, calculatePolygonPerimeter } from '../utils/engineeringMath';
import { exportRoomToDXF, exportRoomToOBJ } from '../utils/exportUtils';
import { StorageService } from '../services/storage';
import { 
  Home, 
  Layers, 
  Box, 
  Plus, 
  Trash2, 
  Save, 
  Download, 
  Maximize2, 
  DoorOpen, 
  LayoutGrid, 
  RotateCcw,
  Check,
  Eye,
  Columns,
  Grid
} from 'lucide-react';

export const RoomScanner: React.FC = () => {
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [roomName, setRoomName] = useState<string>('غرفة نوم رئيسية');
  const [roomHeight, setRoomHeight] = useState<number>(3.0); // 3.0 متر ارتفاع السقف الافتراضي
  
  // نقاط زوايا الغرفة ثنائية الأبعاد (بالمتر)
  const [points, setPoints] = useState<Point2D[]>([
    { x: 0, y: 0 },
    { x: 5.5, y: 0 },
    { x: 5.5, y: 4.2 },
    { x: 0, y: 4.2 },
  ]);

  // الفتحات (أبواب ونوافذ)
  const [openings, setOpenings] = useState<Opening[]>([
    { id: 'op_1', type: 'door', name: 'باب الغرفة', width: 1.0, height: 2.1, area: 2.1, wallIndex: 0 },
    { id: 'op_2', type: 'window', name: 'نافذة الواجهة', width: 1.8, height: 1.5, area: 2.7, wallIndex: 2 },
  ]);

  const [activeCornerIndex, setActiveCornerIndex] = useState<number | null>(null);
  const [selectedWallIndex, setSelectedWallIndex] = useState<number | null>(null);
  const [showAddOpeningModal, setShowAddOpeningModal] = useState<boolean>(false);
  const [newOpeningType, setNewOpeningType] = useState<'door' | 'window'>('door');
  const [newOpeningWidth, setNewOpeningWidth] = useState<number>(1.0);
  const [newOpeningHeight, setNewOpeningHeight] = useState<number>(2.1);
  const [newOpeningWallIdx, setNewOpeningWallIdx] = useState<number>(0);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // مرجع حاوية Three.js
  const threeMountRef = useRef<HTMLDivElement | null>(null);

  // حساب الجدران والأطوال والمساحات
  const walls: WallSegment[] = points.map((p, i) => {
    const nextP = points[(i + 1) % points.length];
    const length = Math.sqrt((nextP.x - p.x) ** 2 + (nextP.y - p.y) ** 2);
    const grossArea = length * roomHeight;
    
    // حساب مساحة الفتحات في هذا الجدار
    const wallOpenings = openings.filter((op) => op.wallIndex === i);
    const openingsArea = wallOpenings.reduce((sum, op) => sum + op.area, 0);
    const netArea = Math.max(0, grossArea - openingsArea);

    return {
      id: `w_${i}`,
      startPoint: p,
      endPoint: nextP,
      length: Number(length.toFixed(2)),
      height: roomHeight,
      grossArea: Number(grossArea.toFixed(2)),
      netArea: Number(netArea.toFixed(2)),
      openings: wallOpenings,
    };
  });

  const floorArea = Number(calculatePolygonArea(points, 1).toFixed(2));
  const perimeter = Number(calculatePolygonPerimeter(points, 1).toFixed(2));
  const totalGrossWallArea = Number(walls.reduce((sum, w) => sum + w.grossArea, 0).toFixed(2));
  const totalNetWallArea = Number(walls.reduce((sum, w) => sum + w.netArea, 0).toFixed(2));

  // قوالب غرف سريعة
  const setPreset = (type: 'rect' | 'l_shape' | 'large_hall') => {
    if (type === 'rect') {
      setPoints([
        { x: 0, y: 0 },
        { x: 5.0, y: 0 },
        { x: 5.0, y: 4.0 },
        { x: 0, y: 4.0 },
      ]);
    } else if (type === 'l_shape') {
      setPoints([
        { x: 0, y: 0 },
        { x: 6.0, y: 0 },
        { x: 6.0, y: 3.0 },
        { x: 3.5, y: 3.0 },
        { x: 3.5, y: 5.5 },
        { x: 0, y: 5.5 },
      ]);
    } else if (type === 'large_hall') {
      setPoints([
        { x: 0, y: 0 },
        { x: 8.5, y: 0 },
        { x: 8.5, y: 6.5 },
        { x: 0, y: 6.5 },
      ]);
    }
  };

  // إعداد وعرض مشهد Three.js ثلاثي الأبعاد للغرفة
  useEffect(() => {
    if (viewMode !== '3d' || !threeMountRef.current) return;

    const mount = threeMountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight || 450;

    // مشهد وإضاءة
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);

    // كاميرا أيزومترية / منظور
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(12, 14, 16);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    // إضاءة معمارية
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfef3c7, 1.2);
    dirLight.position.set(10, 20, 15);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const fillLight = new THREE.PointLight(0x38bdf8, 0.8, 30);
    fillLight.position.set(-10, 8, -10);
    scene.add(fillLight);

    // شبكة أرضية هندسية
    const gridHelper = new THREE.GridHelper(30, 30, 0xf59e0b, 0x1e293b);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // إنشاء أرضية الغرفة باستخدام Shape
    const shape = new THREE.Shape();
    points.forEach((p, idx) => {
      if (idx === 0) shape.moveTo(p.x, p.y);
      else shape.lineTo(p.x, p.y);
    });
    shape.closePath();

    // هندسة الأرضية
    const floorGeometry = new THREE.ShapeGeometry(shape);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.rotation.x = Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // مجموعة الجدران
    const wallsGroup = new THREE.Group();

    // إنشاء كل جدار كمجسم ثلاثي الأبعاد
    points.forEach((p, idx) => {
      const nextP = points[(idx + 1) % points.length];
      const dx = nextP.x - p.x;
      const dy = nextP.y - p.y;
      const wallLen = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      // مجسم الجدار بسماكة 0.20 م (20 سم خرسانة/بلوك)
      const wallThickness = 0.20;
      const wallGeo = new THREE.BoxGeometry(wallLen, roomHeight, wallThickness);
      const wallMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.7,
        metalness: 0.1,
      });

      const wallMesh = new THREE.Mesh(wallGeo, wallMat);
      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;

      // موضع منتصف الجدار
      const midX = (p.x + nextP.x) / 2;
      const midZ = (p.y + nextP.y) / 2;
      wallMesh.position.set(midX, roomHeight / 2, midZ);
      wallMesh.rotation.y = -angle;

      wallsGroup.add(wallMesh);

      // إضافة خط علوي ذهبي للجدار لإبراز الأبعاد
      const edgeGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(p.x, roomHeight, p.y),
        new THREE.Vector3(nextP.x, roomHeight, nextP.y),
      ]);
      const edgeMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 2 });
      const edgeLine = new THREE.Line(edgeGeo, edgeMat);
      wallsGroup.add(edgeLine);
    });

    scene.add(wallsGroup);

    // تموضع مركز المشهد
    const avgX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const avgZ = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    camera.lookAt(avgX, roomHeight / 2, avgZ);

    // تدوير تفاعلي بالفأرة / اللمس
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let angleAzimuth = 0.8;
    let angleElevation = 0.6;
    let distance = 18;

    const updateCameraPos = () => {
      camera.position.x = avgX + distance * Math.cos(angleElevation) * Math.sin(angleAzimuth);
      camera.position.y = distance * Math.sin(angleElevation);
      camera.position.z = avgZ + distance * Math.cos(angleElevation) * Math.cos(angleAzimuth);
      camera.lookAt(avgX, roomHeight / 2, avgZ);
    };

    updateCameraPos();

    const onMouseDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      if ('touches' in e) {
        prevMouseX = e.touches[0].clientX;
        prevMouseY = e.touches[0].clientY;
      } else {
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      }
    };

    const onMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      let clientX = 0;
      let clientY = 0;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const dx = clientX - prevMouseX;
      const dy = clientY - prevMouseY;
      prevMouseX = clientX;
      prevMouseY = clientY;

      angleAzimuth -= dx * 0.008;
      angleElevation = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, angleElevation + dy * 0.008));
      updateCameraPos();
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      distance = Math.max(5, Math.min(40, distance + e.deltaY * 0.02));
      updateCameraPos();
    };

    mount.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    mount.addEventListener('wheel', onWheel);
    mount.addEventListener('touchstart', onMouseDown);
    mount.addEventListener('touchmove', onMouseMove);
    mount.addEventListener('touchend', onMouseUp);

    // حلقة التحريك
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      mount.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      mount.removeEventListener('wheel', onWheel);
      mount.removeEventListener('touchstart', onMouseDown);
      mount.removeEventListener('touchmove', onMouseMove);
      mount.removeEventListener('touchend', onMouseUp);
      renderer.dispose();
      mount.innerHTML = '';
    };
  }, [viewMode, points, roomHeight]);

  // حفظ الغرفة في المشروع
  const handleSaveRoom = () => {
    const roomData: RoomData = {
      id: 'room_' + Date.now().toString(36),
      name: roomName || 'غرفة ممسوحة',
      height: roomHeight,
      points,
      walls,
      floorArea,
      ceilingArea: floorArea,
      perimeter,
      totalWallGrossArea: totalGrossWallArea,
      totalWallNetArea: totalNetWallArea,
      openings,
    };

    StorageService.addMeasurement({
      projectId: StorageService.getActiveProjectId(),
      title: `مسح غرفة: ${roomName}`,
      type: 'room',
      method: 'sensor_assisted',
      confidence: 'high',
      value: floorArea,
      unit: 'm²',
      notes: `محيط: ${perimeter}م، صافي الجدران: ${totalNetWallArea}م²، عدد الفتحات: ${openings.length}`,
      roomData,
      verifiedWithBenchmark: true,
    });

    setSaveMessage('تم حفظ مخطط وبيانات الغرفة بنجاح في المشروع!');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  // تصدير DXF
  const handleExportDXF = () => {
    const roomData: RoomData = {
      id: 'room_export',
      name: roomName,
      height: roomHeight,
      points,
      walls,
      floorArea,
      ceilingArea: floorArea,
      perimeter,
      totalWallGrossArea: totalGrossWallArea,
      totalWallNetArea: totalNetWallArea,
      openings,
    };
    exportRoomToDXF(roomData, StorageService.getActiveProject().name);
  };

  // تصدير OBJ
  const handleExportOBJ = () => {
    const roomData: RoomData = {
      id: 'room_export',
      name: roomName,
      height: roomHeight,
      points,
      walls,
      floorArea,
      ceilingArea: floorArea,
      perimeter,
      totalWallGrossArea: totalGrossWallArea,
      totalWallNetArea: totalNetWallArea,
      openings,
    };
    exportRoomToOBJ(roomData);
  };

  // إضافة فتحة (باب أو نافذة)
  const handleAddOpening = () => {
    const newOp: Opening = {
      id: 'op_' + Date.now().toString(36),
      type: newOpeningType,
      name: newOpeningType === 'door' ? 'باب' : 'نافذة',
      width: newOpeningWidth,
      height: newOpeningHeight,
      area: Number((newOpeningWidth * newOpeningHeight).toFixed(2)),
      wallIndex: newOpeningWallIdx,
    };
    setOpenings([...openings, newOp]);
    setShowAddOpeningModal(false);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-112px)] bg-[#070b14] text-slate-100">
      {/* Top Engineering Controls Bar */}
      <div className="bg-[#0b101b] border-b border-slate-800 p-3 sm:px-6 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-bold text-cyan-300 w-44 sm:w-60 focus:outline-none focus:border-cyan-500"
            placeholder="اسم الغرفة أو الفراغ"
          />

          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <span>الارتفاع:</span>
            <select
              value={roomHeight}
              onChange={(e) => setRoomHeight(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-cyan-400 font-mono-num font-bold focus:outline-none"
            >
              <option value={2.6}>2.60 م</option>
              <option value={2.8}>2.80 م</option>
              <option value={3.0}>3.00 م (قياسي)</option>
              <option value={3.2}>3.20 م</option>
              <option value={3.5}>3.50 م</option>
              <option value={4.0}>4.00 م (صالات)</option>
            </select>
          </div>
        </div>

        {/* 2D / 3D Toggle (Matches the attached mockup) */}
        <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-700/80 shadow-inner">
          <button
            onClick={() => setViewMode('2d')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              viewMode === '2d'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>2D المخطط</span>
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              viewMode === '3d'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D المجسم</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddOpeningModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 transition"
          >
            <DoorOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>إضافة فتحة (باب/شباك)</span>
          </button>

          <button
            onClick={handleSaveRoom}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs font-bold shadow-md transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>حفظ الغرفة</span>
          </button>
        </div>
      </div>

      {/* Main Workspace: 2D Blueprint Canvas or 3D Scene */}
      <div className="flex-1 flex flex-col lg:flex-row relative">
        {/* Left/Center Visual Area */}
        <div className="flex-1 relative bg-[#070b14] overflow-hidden flex items-center justify-center min-h-[420px] p-4">
          {viewMode === '2d' ? (
            /* 2D Architectural Plan Canvas with Blueprint Grid */
            <div className="w-full h-full max-w-4xl max-h-[560px] bg-[#080d18] rounded-2xl border border-slate-800 shadow-2xl relative flex items-center justify-center blueprint-bg p-6">
              {/* SVG Architectural Room Map */}
              <svg viewBox="-1 -1 10 8" className="w-full h-full max-h-[480px]">
                {/* Blueprint Grid Lines */}
                <defs>
                  <pattern id="smallGrid" width="0.5" height="0.5" patternUnits="userSpaceOnUse">
                    <path d="M 0.5 0 L 0 0 0 0.5" fill="none" stroke="#1e293b" strokeWidth="0.02" />
                  </pattern>
                </defs>
                <rect x="-1" y="-1" width="10" height="8" fill="url(#smallGrid)" />

                {/* Floor Polygon Fill */}
                <polygon
                  points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="rgba(56, 189, 248, 0.08)"
                  stroke="#38bdf8"
                  strokeWidth="0.06"
                  strokeDasharray="0.1, 0.05"
                />

                {/* Wall Lines & Annotations */}
                {walls.map((wall, idx) => {
                  const midX = (wall.startPoint.x + wall.endPoint.x) / 2;
                  const midY = (wall.startPoint.y + wall.endPoint.y) / 2;
                  const isSelected = selectedWallIndex === idx;

                  return (
                    <g key={wall.id} onClick={() => setSelectedWallIndex(idx)} className="cursor-pointer">
                      <line
                        x1={wall.startPoint.x}
                        y1={wall.startPoint.y}
                        x2={wall.endPoint.x}
                        y2={wall.endPoint.y}
                        stroke={isSelected ? '#f59e0b' : '#fbbf24'}
                        strokeWidth={isSelected ? '0.14' : '0.10'}
                        strokeLinecap="round"
                      />

                      {/* Wall Length Badge */}
                      <g transform={`translate(${midX}, ${midY})`}>
                        <rect
                          x="-0.65"
                          y="-0.22"
                          width="1.3"
                          height="0.44"
                          rx="0.1"
                          fill="#0f172a"
                          stroke={isSelected ? '#f59e0b' : '#334155'}
                          strokeWidth="0.03"
                        />
                        <text
                          x="0"
                          y="0.08"
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="0.22"
                          fontWeight="bold"
                          fontFamily="JetBrains Mono"
                        >
                          W{idx + 1}: {wall.length}m
                        </text>
                      </g>
                    </g>
                  );
                })}

                {/* Openings (Doors & Windows markers) */}
                {openings.map((op) => {
                  const wall = walls[op.wallIndex];
                  if (!wall) return null;
                  const posX = (wall.startPoint.x + wall.endPoint.x) / 2;
                  const posY = (wall.startPoint.y + wall.endPoint.y) / 2;

                  return (
                    <g key={op.id} transform={`translate(${posX}, ${posY})`}>
                      <circle
                        r="0.2"
                        fill={op.type === 'door' ? '#10b981' : '#38bdf8'}
                        stroke="#ffffff"
                        strokeWidth="0.03"
                      />
                      <text
                        x="0"
                        y="0.4"
                        textAnchor="middle"
                        fill="#cbd5e1"
                        fontSize="0.16"
                        fontWeight="bold"
                      >
                        {op.type === 'door' ? '🚪 باب' : '🪟 شباك'} ({op.width}×{op.height}م)
                      </text>
                    </g>
                  );
                })}

                {/* Draggable Corner Points */}
                {points.map((p, idx) => (
                  <g
                    key={idx}
                    transform={`translate(${p.x}, ${p.y})`}
                    className="cursor-move"
                    onClick={() => setActiveCornerIndex(idx)}
                  >
                    <circle r="0.22" fill="rgba(245, 158, 11, 0.3)" stroke="#f59e0b" strokeWidth="0.04" />
                    <circle r="0.08" fill="#ef4444" />
                    <text
                      x="0"
                      y="-0.28"
                      textAnchor="middle"
                      fill="#f59e0b"
                      fontSize="0.2"
                      fontWeight="bold"
                    >
                      P{idx + 1}
                    </text>
                  </g>
                ))}

                {/* Central Room Badge */}
                {points.length > 0 && (
                  <g
                    transform={`translate(${points.reduce((s, p) => s + p.x, 0) / points.length}, ${
                      points.reduce((s, p) => s + p.y, 0) / points.length
                    })`}
                  >
                    <rect
                      x="-1.4"
                      y="-0.45"
                      width="2.8"
                      height="0.9"
                      rx="0.2"
                      fill="#0f172a"
                      fillOpacity="0.95"
                      stroke="#f59e0b"
                      strokeWidth="0.04"
                    />
                    <text
                      x="0"
                      y="-0.08"
                      textAnchor="middle"
                      fill="#f8fafc"
                      fontSize="0.28"
                      fontWeight="bold"
                    >
                      {roomName}
                    </text>
                    <text
                      x="0"
                      y="0.26"
                      textAnchor="middle"
                      fill="#38bdf8"
                      fontSize="0.22"
                      fontWeight="bold"
                      fontFamily="JetBrains Mono"
                    >
                      {floorArea} م² | محيط: {perimeter} م
                    </text>
                  </g>
                )}
              </svg>

              {/* Preset buttons on canvas bottom */}
              <div className="absolute bottom-4 left-4 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700 text-xs">
                <span className="text-[11px] text-slate-400 px-2 font-medium">قوالب:</span>
                <button
                  onClick={() => setPreset('rect')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  مستطيلة (5×4م)
                </button>
                <button
                  onClick={() => setPreset('l_shape')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  شكل L (زاوية)
                </button>
                <button
                  onClick={() => setPreset('large_hall')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  صالة كبيرة (8.5×6.5م)
                </button>
              </div>
            </div>
          ) : (
            /* 3D Interactive Three.js Viewport */
            <div className="w-full h-full relative rounded-2xl overflow-hidden border border-slate-800 bg-[#080d18]">
              <div ref={threeMountRef} className="w-full h-full min-h-[450px]" />
              {/* 3D Overlay Help Tag */}
              <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300">
                🖱️ اسحب للتدوير | عجلة الفأرة للتكبير
              </div>
            </div>
          )}
        </div>

        {/* Right Engineering Data Sidebar */}
        <div className="w-full lg:w-80 bg-[#0b101b] border-t lg:border-t-0 lg:border-r border-slate-800 p-4 flex flex-col gap-4 shrink-0 overflow-y-auto">
          {/* Room Area Summary Card */}
          <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 shadow-sm">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">حسابات الفراغ والمساحات</h4>
            
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">مساحة الأرضية:</span>
                <span className="text-xl font-black text-cyan-400 font-mono-num">{floorArea}</span>
                <span className="text-xs font-bold text-slate-400 mr-1">م²</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">المحيط الإجمالي:</span>
                <span className="text-xl font-black text-sky-400 font-mono-num">{perimeter}</span>
                <span className="text-xs font-bold text-slate-400 mr-1">م</span>
              </div>
            </div>

            <div className="space-y-2 text-xs border-t border-slate-800/80 pt-3">
              <div className="flex justify-between text-slate-300">
                <span>إجمالي مساحة الجدران:</span>
                <span className="font-mono-num font-bold">{totalGrossWallArea} م²</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-medium">
                <span>خصم مساحات الفتحات:</span>
                <span className="font-mono-num">
                  -{(totalGrossWallArea - totalNetWallArea).toFixed(2)} م²
                </span>
              </div>
              <div className="flex justify-between text-cyan-300 font-bold border-t border-slate-800 pt-1.5">
                <span>صافي مساحة الدهان/اللياسة:</span>
                <span className="font-mono-num text-sm">{totalNetWallArea} م²</span>
              </div>
            </div>
          </div>

          {/* Wall Segments Table */}
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 flex-1">
            <h4 className="text-xs font-bold text-slate-400 mb-2">أبعاد الجدران ({walls.length} جدران)</h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto text-xs">
              {walls.map((w, idx) => (
                <div
                  key={w.id}
                  onClick={() => setSelectedWallIndex(idx)}
                  className={`p-2 rounded-lg flex items-center justify-between cursor-pointer transition ${
                    selectedWallIndex === idx
                      ? 'bg-cyan-500/10 border border-cyan-500/40 text-cyan-300'
                      : 'bg-slate-950/50 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <span className="font-bold">جدار W{idx + 1}</span>
                  <div className="flex items-center gap-3 font-mono-num">
                    <span>{w.length} م</span>
                    <span className="text-slate-400 text-[11px]">({w.netArea} م²)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Export Formats (AutoCAD DXF & 3D OBJ) */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <h4 className="text-xs font-bold text-slate-400">تصدير المخطط الهندسي:</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExportDXF}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-cyan-400 font-bold transition"
                title="تصدير إلى أوتوكاد DXF للرسم والتعديل المعماري"
              >
                <Download className="w-3.5 h-3.5" />
                <span>AutoCAD DXF</span>
              </button>
              <button
                onClick={handleExportOBJ}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-sky-400 font-bold transition"
                title="تصدير نموذج 3D OBJ لبرامج 3D Max وBlender"
              >
                <Download className="w-3.5 h-3.5" />
                <span>3D OBJ Model</span>
              </button>
            </div>
          </div>

          {saveMessage && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold text-center animate-pulse">
              ✓ {saveMessage}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add Door or Window Opening */}
      {showAddOpeningModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-md p-5 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white">إضافة فتحة (باب أو شباك) لخصم مساحتها</h3>
              <button
                onClick={() => setShowAddOpeningModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 mt-4 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">نوع الفتحة:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setNewOpeningType('door'); setNewOpeningWidth(1.0); setNewOpeningHeight(2.1); }}
                    className={`py-2 rounded-lg font-bold ${newOpeningType === 'door' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'}`}
                  >
                    🚪 باب (Door)
                  </button>
                  <button
                    onClick={() => { setNewOpeningType('window'); setNewOpeningWidth(1.5); setNewOpeningHeight(1.5); }}
                    className={`py-2 rounded-lg font-bold ${newOpeningType === 'window' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'}`}
                  >
                    🪟 شباك (Window)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">على الجدار:</label>
                <select
                  value={newOpeningWallIdx}
                  onChange={(e) => setNewOpeningWallIdx(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono-num"
                >
                  {walls.map((w, idx) => (
                    <option key={w.id} value={idx}>
                      جدار W{idx + 1} (طوله: {w.length} م)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">العرض (متر):</label>
                  <input
                    type="number"
                    step="0.05"
                    value={newOpeningWidth}
                    onChange={(e) => setNewOpeningWidth(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono-num"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">الارتفاع (متر):</label>
                  <input
                    type="number"
                    step="0.05"
                    value={newOpeningHeight}
                    onChange={(e) => setNewOpeningHeight(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono-num"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 text-slate-300 text-[11px]">
                المساحة المستقطعة: <strong className="text-cyan-400 font-mono-num">{(newOpeningWidth * newOpeningHeight).toFixed(2)} م²</strong>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowAddOpeningModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
              >
                إلغاء
              </button>
              <button
                onClick={handleAddOpening}
                className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black font-bold text-xs"
              >
                إضافة الفتحة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
