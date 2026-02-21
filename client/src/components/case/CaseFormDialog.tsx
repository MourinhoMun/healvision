import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { createCase } from '../../api/cases';
import { SURGERY_TYPES } from '../../lib/constants';
import { useUiStore } from '../../stores/uiStore';

interface Props {
  onClose: () => void;
  onCreated: (id: string) => void;
}

export function CaseFormDialog({ onClose, onCreated }: Props) {
  const { t, i18n } = useTranslation();
  const addToast = useUiStore((s) => s.addToast);
  const [name, setName] = useState('');
  const [surgeryType, setSurgeryType] = useState('');
  const [customSurgery, setCustomSurgery] = useState('');
  const [loading, setLoading] = useState(false);

  const isZh = i18n.language === 'zh';

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const result = await createCase({
        name: name.trim(),
        surgery_type: surgeryType || undefined,
        surgery_type_custom: surgeryType === 'custom' ? customSurgery : undefined,
      });
      addToast(t('common.success'), 'success');
      onCreated(result.id);
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-gray-900">{t('home.newCase')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-gray-400 mb-4">{t('case.createHint')}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('case.name')}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('case.namePlaceholder')}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('case.surgeryType')}</label>
            <select
              value={surgeryType}
              onChange={(e) => setSurgeryType(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">--</option>
              {SURGERY_TYPES.map((s) => (
                <option key={s.value} value={s.value}>
                  {isZh ? s.label_zh : s.label_en}
                </option>
              ))}
            </select>
          </div>

          {surgeryType === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('case.customSurgery')}</label>
              <input
                value={customSurgery}
                onChange={(e) => setCustomSurgery(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? '...' : t('case.create')}
          </button>
        </div>
      </div>
    </div>
  );
}
