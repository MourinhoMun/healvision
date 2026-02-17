import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save } from 'lucide-react';
import { updateCase } from '../../api/cases';
import { SURGERY_TYPES, GENDERS, AGE_RANGES, ETHNICITIES, BODY_TYPES } from '../../lib/constants';
import { useUiStore } from '../../stores/uiStore';
import type { Case } from '@healvision/shared';

interface Props {
    caseData: Case;
    onClose: () => void;
    onUpdated: () => void;
}

export function CaseEditDialog({ caseData, onClose, onUpdated }: Props) {
    const { t, i18n } = useTranslation();
    const addToast = useUiStore((s) => s.addToast);
    const isZh = i18n.language === 'zh';

    const [formData, setFormData] = useState({
        name: '',
        surgery_type: '',
        surgery_type_custom: '',
        patient_gender: '',
        patient_age_range: '',
        patient_ethnicity: '',
        patient_body_type: '',
        description: '',
    });

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (caseData) {
            setFormData({
                name: caseData.name || '',
                surgery_type: caseData.surgery_type || '',
                surgery_type_custom: caseData.surgery_type_custom || '',
                patient_gender: caseData.patient_gender || '',
                patient_age_range: caseData.patient_age_range || '',
                patient_ethnicity: caseData.patient_ethnicity || '',
                patient_body_type: caseData.patient_body_type || '',
                description: caseData.description || '',
            });
        }
    }, [caseData]);

    const handleSubmit = async () => {
        if (!formData.name.trim()) return;
        setLoading(true);
        try {
            await updateCase(caseData.id, {
                ...formData,
                surgery_type: formData.surgery_type || undefined,
            });
            addToast(t('common.success'), 'success');
            onUpdated();
            onClose();
        } catch (err: any) {
            addToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const selectClass = "w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500";
    const inputClass = "w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500";

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl w-full max-w-lg shadow-xl flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b">
                    <h3 className="font-semibold text-gray-900">{t('case.update', 'Edit Case')}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 overflow-y-auto space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('case.name')}</label>
                        <input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className={inputClass}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('case.surgeryType')}</label>
                            <select
                                value={formData.surgery_type}
                                onChange={(e) => setFormData({ ...formData, surgery_type: e.target.value })}
                                className={selectClass}
                            >
                                <option value="">{t('common.select', '-- Select --')}</option>
                                {SURGERY_TYPES.map((s) => (
                                    <option key={s.value} value={s.value}>
                                        {isZh ? s.label_zh : s.label_en}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {formData.surgery_type === 'custom' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('case.customSurgery')}</label>
                                <input
                                    value={formData.surgery_type_custom}
                                    onChange={(e) => setFormData({ ...formData, surgery_type_custom: e.target.value })}
                                    className={inputClass}
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('case.gender')}</label>
                            <select
                                value={formData.patient_gender}
                                onChange={(e) => setFormData({ ...formData, patient_gender: e.target.value })}
                                className={selectClass}
                            >
                                <option value="">--</option>
                                {GENDERS.map((g) => (
                                    <option key={g.value} value={g.value}>{isZh ? g.label_zh : g.label_en}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('case.ageRange')}</label>
                            <select
                                value={formData.patient_age_range}
                                onChange={(e) => setFormData({ ...formData, patient_age_range: e.target.value })}
                                className={selectClass}
                            >
                                <option value="">--</option>
                                {AGE_RANGES.map((a) => (
                                    <option key={a.value} value={a.value}>{a.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('case.ethnicity')}</label>
                            <select
                                value={formData.patient_ethnicity}
                                onChange={(e) => setFormData({ ...formData, patient_ethnicity: e.target.value })}
                                className={selectClass}
                            >
                                <option value="">--</option>
                                {ETHNICITIES.map((e) => (
                                    <option key={e.value} value={e.value}>{isZh ? e.label_zh : e.label_en}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('case.bodyType')}</label>
                            <select
                                value={formData.patient_body_type}
                                onChange={(e) => setFormData({ ...formData, patient_body_type: e.target.value })}
                                className={selectClass}
                            >
                                <option value="">--</option>
                                {BODY_TYPES.map((b) => (
                                    <option key={b.value} value={b.value}>{isZh ? b.label_zh : b.label_en}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('case.description')}</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full h-24 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                        />
                    </div>
                </div>

                <div className="p-5 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium">
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !formData.name.trim()}
                        className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
                    >
                        {loading ? t('common.loading') : (
                            <>
                                <Save size={16} />
                                {t('common.save')}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
