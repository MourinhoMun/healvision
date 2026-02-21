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
  const { currentCase, loadCase, reloadCase, selectedDay, selectDay } = useWorkbenchStore();
  const [uploadDay, setUploadDay] = useState(0);
  const [showUpload, setShowUpload] = useState(false);

  // Batch folder import state
  const [showFolderImport, setShowFolderImport] = useState(false);
  const [folderPreview, setFolderPreview] = useState<Map<number, File[]> | null>(null);
  const [folderUploading, setFolderUploading] = useState(false);
  const [folderProgress, setFolderProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    if (caseId) loadCase(caseId);
  }, [caseId, loadCase]);

  const handleUpload = async (files: File[]) => {
    if (!caseId) return;
    try {
      await uploadImages(caseId, files, uploadDay);
      addToast(t('common.success'), 'success');
      await reloadCase();
      selectDay(uploadDay);
      setShowUpload(false);
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleFolderSelect = (grouped: Map<number, File[]>) => {
    if (grouped.size === 0) {
      addToast(t('workbench.folderNoImages'), 'error');
      return;
    }
    setFolderPreview(grouped);
  };

  const handleFolderConfirm = async () => {
    if (!caseId || !folderPreview) return;
    setFolderUploading(true);
    const days = Array.from(folderPreview.keys()).sort((a, b) => a - b);
    setFolderProgress({ current: 0, total: days.length });

    let totalImages = 0;
    try {
      for (let i = 0; i < days.length; i++) {
        const day = days[i];
        const files = folderPreview.get(day)!;
        setFolderProgress({ current: i + 1, total: days.length });
        await uploadImages(caseId, files, day);
        totalImages += files.length;
      }
      await reloadCase();
      addToast(
        t('workbench.folderDone', { days: days.length, images: totalImages }),
        'success',
      );
      setFolderPreview(null);
      setShowFolderImport(false);
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setFolderUploading(false);
      setFolderProgress({ current: 0, total: 0 });
    }
  };

  const handleFolderCancel = () => {
    setFolderPreview(null);
    setShowFolderImport(false);
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowFolderImport(!showFolderImport);
              setShowUpload(false);
              setFolderPreview(null);
            }}
            className="px-4 py-2 bg-white border border-primary-600 text-primary-600 rounded-lg text-sm hover:bg-primary-50"
          >
            {t('workbench.batchImport')}
          </button>
          <button
            onClick={() => {
              setUploadDay(selectedDay);
              setShowUpload(!showUpload);
              setShowFolderImport(false);
              setFolderPreview(null);
            }}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
          >
            {t('workbench.uploadSource')}
          </button>
        </div>
      </div>

      {showUpload && (
        <div className="mb-4 p-4 bg-white rounded-lg border">
          <p className="text-xs text-gray-400 mb-3">{t('workbench.uploadHint')}</p>
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

      {showFolderImport && (
        <div className="mb-4 p-4 bg-white rounded-lg border">
          <p className="text-xs text-gray-400 mb-3">{t('workbench.batchImportHint')}</p>
          {!folderPreview && !folderUploading && (
            <ImageUploader
              onUpload={() => {}}
              onFolderUpload={handleFolderSelect}
              folderMode
            />
          )}

          {folderPreview && !folderUploading && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                {t('workbench.folderDetected', { count: folderPreview.size })}
              </h3>
              <div className="space-y-1 mb-4 max-h-48 overflow-y-auto">
                {Array.from(folderPreview.entries())
                  .sort(([a], [b]) => a - b)
                  .map(([day, files]) => (
                    <div
                      key={day}
                      className="flex items-center justify-between px-3 py-1.5 bg-gray-50 rounded text-sm"
                    >
                      <span className="font-medium">Day {day}</span>
                      <span className="text-gray-500">
                        {t('workbench.folderImageCount', { count: files.length })}
                      </span>
                    </div>
                  ))}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleFolderConfirm}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
                >
                  {t('workbench.folderConfirm')}
                </button>
                <button
                  onClick={handleFolderCancel}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}

          {folderUploading && (
            <div className="text-center py-4">
              <div className="inline-block w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-sm text-gray-600">
                {t('workbench.folderProgress', {
                  current: folderProgress.current,
                  total: folderProgress.total,
                })}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 overflow-y-auto lg:overflow-visible pb-20 lg:pb-0">
        {/* Timeline */}
        <div className="lg:col-span-2 bg-white rounded-lg border overflow-auto min-h-[100px] lg:min-h-0">
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
        <div className="lg:col-span-3 bg-white rounded-lg border overflow-hidden min-h-[200px] lg:min-h-0">
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
