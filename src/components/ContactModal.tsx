import React, { useState } from 'react';
import { Mail, Send, CheckCircle2, AlertCircle, MessageSquare, Bug, Sparkles, HelpCircle, Copy, Check } from 'lucide-react';
import { Language, translations } from '../i18n';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose, lang }) => {
  const t = translations[lang];
  const [type, setType] = useState<'bug' | 'feature' | 'accuracy' | 'general'>('bug');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  if (!isOpen) return null;

  const developerEmail = 'nidalwatfa99@gmail.com';

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(developerEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const typeLabel = 
      type === 'bug' ? 'تقرير خطأ تقني (Bug)' :
      type === 'feature' ? 'اقتراح ميزة هندسية (Feature Request)' :
      type === 'accuracy' ? 'ملاحظة حول دقة القياس (Accuracy Feedback)' : 'استفسار عام (General)';

    const emailSubject = encodeURIComponent(`[BuildMeasure Pro] ${typeLabel}: ${subject || 'ملاحظة جديدة'}`);
    const emailBody = encodeURIComponent(
      `نوع البلاغ: ${typeLabel}\n` +
      `الموضوع: ${subject}\n\n` +
      `نص الرسالة والملاحظات:\n${message}\n\n` +
      `--------------------------------\n` +
      `معلومات الجهاز والنظام:\n` +
      `User Agent: ${navigator.userAgent}\n` +
      `Language: ${navigator.language}\n` +
      `Screen: ${window.screen.width}x${window.screen.height}\n` +
      `التاريخ: ${new Date().toLocaleString()}\n`
    );

    window.location.href = `mailto:${developerEmail}?subject=${emailSubject}&body=${emailBody}`;
    setSentSuccess(true);
    setTimeout(() => {
      setSentSuccess(false);
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-[#0b101b] border border-cyan-500/30 rounded-3xl w-full max-w-lg p-5 sm:p-6 text-slate-100 shadow-2xl shadow-cyan-950/40 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">{t.contactDev}</h3>
              <p className="text-[11px] text-slate-400">{t.feedbackAndReport}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl font-bold px-2 py-1"
          >
            ×
          </button>
        </div>

        {/* Developer Email Pill */}
        <div className="mt-4 p-3 rounded-2xl bg-[#070b14] border border-slate-800/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-xs font-mono text-cyan-300 font-semibold truncate select-all">{developerEmail}</span>
          </div>
          <button
            onClick={handleCopyEmail}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 flex items-center gap-1 shrink-0 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'تم النسخ' : 'نسخ'}</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSendEmail} className="space-y-4 mt-4 text-xs">
          <div>
            <label className="text-slate-300 font-bold block mb-1.5">{t.feedbackType}</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('bug')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition text-xs ${
                  type === 'bug'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                <Bug className="w-3.5 h-3.5" />
                <span>بلاغ عن خطأ</span>
              </button>

              <button
                type="button"
                onClick={() => setType('accuracy')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition text-xs ${
                  type === 'accuracy'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>دقة القياس</span>
              </button>

              <button
                type="button"
                onClick={() => setType('feature')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition text-xs ${
                  type === 'feature'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>اقتراح ميزة</span>
              </button>

              <button
                type="button"
                onClick={() => setType('general')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition text-xs ${
                  type === 'general'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>استفسار عام</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-bold block mb-1">عنوان الملاحظة</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="مثال: قياس الزاوية في الإضاءة الخافتة / مقترح ميزة جديدة"
              className="w-full bg-[#070b14] border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="text-slate-300 font-bold block mb-1">{t.messageText}</label>
            <textarea
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="اكتب تفاصيل الملاحظة أو المشكلة أو الاقتراح هنا..."
              className="w-full bg-[#070b14] border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-400 leading-relaxed"
            />
          </div>

          {sentSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center">
              ✓ تم فتح تطبيق البريد لإرسال رسالتك إلى المطور مباشرة!
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold"
            >
              {t.close}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-black shadow-lg shadow-cyan-500/25 flex items-center gap-1.5 transition active:scale-95"
            >
              <Send className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{t.sendViaEmail}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
