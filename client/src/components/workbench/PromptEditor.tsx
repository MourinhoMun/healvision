import { useTranslation } from 'react-i18next';
import { Sparkles, Loader2 } from 'lucide-react';
import { useWorkbenchStore } from '../../stores/workbenchStore';
import { useUiStore } from '../../stores/uiStore';

export function PromptEditor() {
  const { t } = useTranslation();
  const addToast = useUiStore((s) => s.addToast);
  const {
    currentCase, selectedDay, currentPrompt, setPrompt,
    isAnalyzing, analyzeCurrentImage,
  } = useWorkbenchStore();

  const sourceImage = currentCase?.source_images?.find((i) => i.day_number === selectedDay);

  const handleAnalyze = async () => {
    try {
      await analyzeCurrentImage();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
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

      <div className="flex-1 p-4">
        <textarea
          value={currentPrompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t('workbench.promptPlaceholder')}
          className="w-full h-full resize-none border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-700"
        />
      </div>
    </div>
  );
}
