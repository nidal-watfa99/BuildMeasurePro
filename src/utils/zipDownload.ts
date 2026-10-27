import JSZip from 'jszip';
import { ALL_SOURCE_FILES } from '../data/sourceFiles';

/**
 * توليد وتحميل حزمة الكود المصدري كاملاً بصيغة ZIP محلياً في ذاكرة المتصفح
 * يتم استخدام تقنية In-Memory Blob لتفادي أي اعتراض من جدران حماية الكوكيز أو الخوادم
 */
export async function downloadSourceCodeZip(onProgress?: (percent: number) => void): Promise<boolean> {
  try {
    const zip = new JSZip();

    // إضافة كافة الملفات المصدرية إلى الأرشيف
    for (const [filePath, content] of Object.entries(ALL_SOURCE_FILES)) {
      zip.file(filePath, content);
    }

    // توليد ملف الـ ZIP المضغوط في ذاكرة المتصفح مباشرة
    const blob = await zip.generateAsync(
      {
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 },
      },
      (metadata) => {
        if (onProgress) {
          onProgress(Math.round(metadata.percent));
        }
      }
    );

    // تنزيل الملف عبر رابط كائن محلي (blob:...)
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = 'BuildMeasurePro_SourceCode_Complete.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // تحرير الذاكرة بعد ثوانٍ
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 15000);

    return true;
  } catch (error) {
    console.error('Failed to generate client-side ZIP archive', error);
    return false;
  }
}
