import React, { useState } from 'react';
import { Project } from '../types';
import { StorageService } from '../services/storage';
import { FolderPlus, Building, MapPin, Hash, User } from 'lucide-react';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (project: Project) => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onProjectCreated,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState(`PRJ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [client, setClient] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('يرجى إدخال اسم المشروع');
      return;
    }

    const newProject: Project = {
      id: 'proj_' + Date.now().toString(36),
      name: name.trim(),
      code: code.trim(),
      client: client.trim(),
      location: location.trim(),
      description: description.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      measurements: [],
      quantityItems: [],
    };

    StorageService.saveProject(newProject);
    StorageService.setActiveProjectId(newProject.id);
    onProjectCreated(newProject);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-lg p-6 text-slate-100 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <FolderPlus className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base text-white">إنشاء مشروع هندسي جديد</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl font-bold px-2"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
          <div>
            <label className="text-slate-300 font-bold block mb-1.5">اسم المشروع *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: مشروع برج الأعمال — تشطيبات الطابق الأول"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-bold block mb-1.5">كود المشروع</label>
              <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-cyan-400 font-mono font-bold">
                <Hash className="w-3.5 h-3.5 text-slate-500 ml-1.5 shrink-0" />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="bg-transparent w-full focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1.5">اسم العميل / المالك</label>
              <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white">
                <User className="w-3.5 h-3.5 text-slate-500 ml-1.5 shrink-0" />
                <input
                  type="text"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  placeholder="شركة التطوير / المالك"
                  className="bg-transparent w-full focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-bold block mb-1.5">الموقع الجغرافي / عنوان الموقع</label>
            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white">
              <MapPin className="w-3.5 h-3.5 text-slate-500 ml-1.5 shrink-0" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="المدينة، الحي، رقم القطعة"
                className="bg-transparent w-full focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-bold block mb-1.5">وصف وملاحظات المشروع</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="نطاق الأعمال، اشتراطات التشطيب، تفاصيل الموقع..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs font-black shadow-lg shadow-cyan-500/20 transition active:scale-95"
            >
              إنشاء وحفظ المشروع
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
