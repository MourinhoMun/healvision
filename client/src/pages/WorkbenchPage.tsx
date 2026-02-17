import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWorkbenchStore } from '../stores/workbenchStore';
import { Timeline } from '../components/workbench/Timeline';
import { SourcePanel } from '../components/workbench/SourcePanel';
import { PromptEditor } from '../components/workbench/PromptEditor';
import { ResultPanel } from '../components/workbench/ResultPanel';
import { ImageUploader } from '../components/shared/ImageUploader';
import { uploadImages } from '../api/images';
import { useUiStore } from '../stores/uiStore';

export function WorkbenchPage() {
  const { t } = useTranslation();
  const { caseId } = useParams<{ caseId: string }>();
  const addToast = useUiStore((s) => s.addToast);
  const { currentCase, loadCase, selectedDay } = useWorkbenchStore();
  const [uploadDay, setUploadDay] = useState(0);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    if (caseId) loadCase(caseId);
  }, [caseId, loadCase]);

  const handleUpload = async (files: File[]) => {
    if (!caseId) return;
    try {
      await uploadImages(caseId, files, uploadDay);
      addToast(t('common.success'), 'success');
      loadCase(caseId);
      setShowUpload(false);
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  if (!currentCase) {
    return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{currentCase.name}</h1>
          {currentCase.surgery_type && (
            <span className="text-sm text-primary-600">
              {t(`surgery.${currentCase.surgery_type}`, currentCase.surgery_type)}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
        >
          {t('workbench.uploadSource')}
        </button>
      </div>

      {showUpload && (
        <div className="mb-4 p-4 bg-white rounded-lg border">
          <div className="flex items-center gap-4 mb-3">
            <label className="text-sm font-medium text-gray-700">{t('workbench.day')}:</label>
            <input
              type="number"
              value={uploadDay}
              onChange={(e) => setUploadDay(parseInt(e.target.value) || 0)}
              className="w-24 px-3 py-1.5 border rounded-lg text-sm"
            />
          </div>
          <ImageUploader onUpload={handleUpload} multiple />
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 overflow-y-auto lg:overflow-visible pb-20 lg:pb-0">
        {/* Timeline - Mobile: Horizontal on top (if possible) or just vertical list? 
            For now, let's keep it simple. If we stack, timeline at top might be weird if it's long.
            Let's put Timeline at the bottom for mobile? Or stick to vertical?
            Actually, let's just make everything stack.
            Important: The "min-h-0" implies fitting in screen. On mobile we usually want scroll.
        */}

        {/* Timeline */}
        <div className="lg:col-span-1 bg-white rounded-lg border overflow-auto min-h-[100px] lg:min-h-0">
          <Timeline
            sourceImages={currentCase.source_images || []}
            generatedImages={currentCase.generated_images || []}
            selectedDay={selectedDay}
          />
        </div>

        {/* Source Image */}
        <div className="lg:col-span-3 bg-white rounded-lg border overflow-hidden min-h-[300px] lg:min-h-0">
          <SourcePanel />
        </div>

        {/* Prompt Editor */}
        <div className="lg:col-span-4 bg-white rounded-lg border overflow-hidden min-h-[200px] lg:min-h-0">
          <PromptEditor />
        </div>

        {/* Result */}
        <div className="lg:col-span-4 bg-white rounded-lg border overflow-hidden min-h-[300px] lg:min-h-0">
          <ResultPanel />
        </div>
      </div>
    </div>
  );
}
