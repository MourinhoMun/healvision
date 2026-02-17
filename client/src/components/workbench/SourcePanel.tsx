import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Image as ImageIcon, CopyPlus, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useWorkbenchStore } from '../../stores/workbenchStore';
import { getImageUrl } from '../../api/images';
import { cloneCaseFromImage } from '../../api/cases';
import { useUiStore } from '../../stores/uiStore';
import { dayLabel } from '../../lib/utils';

export function SourcePanel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentCase, selectedDay } = useWorkbenchStore();
  const addToast = useUiStore((s) => s.addToast);
  const [isCloning, setIsCloning] = useState(false);

  const sourceImage = currentCase?.source_images?.find((i) => i.day_number === selectedDay);

  const handleClone = async () => {
    if (!sourceImage) return;

    if (!confirm(t('workbench.confirmClone', 'Create a new case using this image as a base?'))) {
      return;
    }

    setIsCloning(true);
    try {
      const newCase = await cloneCaseFromImage(sourceImage.id);
      addToast(t('common.success'), 'success');
      // Navigate to the new case
      navigate(`/workbench/${newCase.id}`);
      // Reload window to ensure fresh state if needed, or rely on route change
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          {t('workbench.sourceImage')} - {dayLabel(selectedDay)}
        </h3>
        {sourceImage && (
          <button
            onClick={handleClone}
            disabled={isCloning}
            className="flex items-center gap-1.5 px-3 py-1.5 text-primary-600 hover:bg-primary-50 rounded-lg text-xs font-medium transition-colors"
            title={t('workbench.cloneFromImage', 'New Case from Image')}
          >
            {isCloning ? <Loader2 size={14} className="animate-spin" /> : <CopyPlus size={14} />}
            <span className="hidden sm:inline">{t('workbench.cloneFromImage', 'New Case from Image')}</span>
          </button>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        {sourceImage ? (
          <img
            src={getImageUrl(sourceImage.id)}
            alt={`Source Day ${selectedDay}`}
            className="max-w-full max-h-full object-contain rounded"
          />
        ) : (
          <div className="text-center text-gray-400">
            <ImageIcon className="w-12 h-12 mx-auto mb-2" />
            <p className="text-sm">{t('workbench.noSource')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
