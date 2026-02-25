import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Loader2, UserSquare2, X } from 'lucide-react';
import { useWorkbenchStore } from '../../stores/workbenchStore';
import { useUiStore } from '../../stores/uiStore';

export function PromptEditor() {
  const { t } = useTranslation();
  const addToast = useUiStore((s) => s.addToast);
  const {
    currentCase, selectedDay, currentPrompt, setPrompt,
    isAnalyzing, analyzeCurrentImage,
    referenceImageBase64, setReferenceImage,
  } = useWorkbenchStore();

  const refInputRef = useRef<HTMLInputElement>(null);

  const sourceImage = currentCase?.source_images?.find((i) => i.day_number === selectedDay);

  const handleAnalyze = async () => {
    try {
      await analyzeCurrentImage();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleReferenceSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      setReferenceImage(base64, file.type);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">{t('workbench.promptEditor')}</h3>
          {sourceImage && (
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-600 rounded-lg text-xs font-medium hover:bg-primary-100 disabled:opacity-50"
            >
              {isAnalyzing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              {isAnalyzing ? t('workbench.analyzing') : t('workbench.analyze')}
            </button>
          )}
        </div>
        <p className="text-[10px] text-gray-400 mt-1 leading-tight">{t('workbench.promptHint')}</p>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-3 min-h-0">
        <textarea
          value={currentPrompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t('workbench.promptPlaceholder')}
          className="flex-1 resize-none border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-700 min-h-0"
        />

        {/* 垫图区域 */}
        <div className="shrink-0">
          <div className="flex items-center gap-2 mb-1.5">
            <UserSquare2 size={13} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-600">垫图（人像参考，可选）</span>
            {referenceImageBase64 && (
              <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">已设置</span>
            )}
          </div>

          {referenceImageBase64 ? (
            <div className="flex items-center gap-2">
              <img
                src={`data:image/jpeg;base64,${referenceImageBase64}`}
                alt="垫图"
                className="w-14 h-14 object-cover rounded-lg border border-gray-200"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-500 leading-tight">生成时将严格参考此人的五官特征</p>
              </div>
              <button
                onClick={() => setReferenceImage(null, null)}
                className="p-1 text-gray-400 hover:text-red-500 rounded"
                title="移除垫图"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => refInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            >
              <UserSquare2 size={13} />
              上传人像垫图
            </button>
          )}
          <input
            ref={refInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleReferenceSelect}
          />
        </div>
      </div>
    </div>
  );
}
