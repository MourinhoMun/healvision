import { useTranslation } from 'react-i18next';
import { Image as ImageIcon, Download, RefreshCw, Loader2, Sparkles } from 'lucide-react';
import { useWorkbenchStore } from '../../stores/workbenchStore';
import { useUiStore } from '../../stores/uiStore';
import { dayLabel } from '../../lib/utils';
import { FILES_BASE } from '../../api/client';

export function ResultPanel() {
  const { t } = useTranslation();
  const addToast = useUiStore((s) => s.addToast);
  const {
    currentCase, selectedDay, currentPrompt,
    isGenerating, generateImage, latestResult,
  } = useWorkbenchStore();

  const generatedForDay = currentCase?.generated_images?.filter((i) => i.day_number === selectedDay) || [];

  const handleGenerate = async () => {
    try {
      await generateImage();
      addToast(t('common.success'), 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleDownload = () => {
    if (!latestResult) return;
    const a = document.createElement('a');
    a.href = latestResult.image_url;
    a.download = `healvision_day${selectedDay}.jpg`;
    a.click();
  };

  const displayImage = latestResult?.image_url
    || (generatedForDay.length > 0 ? `${FILES_BASE}/generated/${(generatedForDay[0] as any).id}.jpg` : null);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">
            {t('workbench.result')} - {dayLabel(selectedDay)}
          </h3>
          <div className="flex gap-2">
            {displayImage && (
              <button
                onClick={handleDownload}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                title={t('workbench.download')}
              >
                <Download size={16} />
              </button>
            )}
          </div>
        </div>
        <p className="text-[10px] text-gray-400 mt-1 leading-tight">{t('workbench.resultHint')}</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 relative">
        {isGenerating && (
          <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
            <p className="mt-3 text-sm text-gray-600">{t('workbench.generating')}</p>
          </div>
        )}

        {displayImage ? (
          <img
            src={displayImage}
            alt={`Generated Day ${selectedDay}`}
            className="max-w-full max-h-full object-contain rounded"
          />
        ) : (
          <div className="text-center text-gray-400">
            <ImageIcon className="w-12 h-12 mx-auto mb-2" />
            <p className="text-sm">{t('workbench.noResult')}</p>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !currentPrompt}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
        >
          {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {t('workbench.generate')}
        </button>
        {displayImage && (
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !currentPrompt}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={14} />
            {t('workbench.reroll')}
          </button>
        )}
      </div>

      {/* History strip */}
      {generatedForDay.length > 1 && (
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          {generatedForDay.map((img: any) => (
            <img
              key={img.id}
              src={`${FILES_BASE}/generated/${img.id}_thumb.jpg`}
              className="w-12 h-12 rounded border border-gray-200 object-cover cursor-pointer hover:border-primary-400"
              onClick={() => useWorkbenchStore.setState({ latestResult: { id: img.id, image_url: `${FILES_BASE}/generated/${img.id}.jpg`, thumbnail_url: `${FILES_BASE}/generated/${img.id}_thumb.jpg` } })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
