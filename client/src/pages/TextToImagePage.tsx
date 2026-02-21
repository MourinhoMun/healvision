import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Loader2, Image as ImageIcon, Info } from 'lucide-react';
import { generateTextToImage } from '../api/generate';
import { buildTextToImagePromptClient } from '../lib/promptUtils';
import { SURGERY_TYPES, BODY_TYPES, GENDERS, AGE_RANGES, ETHNICITIES } from '../lib/constants';
import { useUiStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';

export function TextToImagePage() {
  const { t, i18n } = useTranslation();
  const addToast = useUiStore((s) => s.addToast);
  const isZh = i18n.language === 'zh';

  const [surgeryType, setSurgeryType] = useState('double_eyelid');
  const [dayNumber, setDayNumber] = useState(7);
  const [gender, setGender] = useState('female');
  const [ageRange, setAgeRange] = useState('30s');
  const [ethnicity, setEthnicity] = useState('asian');
  const [bodyType, setBodyType] = useState('normal');
  const [complications, setComplications] = useState('');
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ image_url: string } | null>(null);

  const handleGeneratePrompt = () => {
    const p = `Photorealistic clinical photograph of a ${gender} ${ethnicity} patient in their ${ageRange}, ${bodyType} body type, who underwent ${surgeryType} surgery, showing recovery status at Day ${dayNumber} post-operation. Shot with a DSLR camera in clinical setting, soft diffused lighting. Natural unretouched skin with visible pores, fine hair, subtle color variations, no beauty filters, no skin smoothing. 1024x1024 resolution.${complications ? ` Complications: ${complications}.` : ''}`;
    setPrompt(p);
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setGenerating(true);
    try {
      const res = await generateTextToImage({
        surgery_type: surgeryType,
        day_number: dayNumber,
        gender,
        age_range: ageRange,
        ethnicity,
        body_type: bodyType,
        complications: complications || undefined,
        custom_prompt: prompt,
      });
      setResult(res);
      addToast(t('common.success'), 'success');
      useAuthStore.getState().checkBalance();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const selectClass = 'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('textToImage.title')}</h1>

      <div className="flex items-start gap-2 p-3 mb-4 bg-blue-50 text-blue-700 rounded-lg text-xs">
        <Info size={14} className="mt-0.5 shrink-0" />
        <span>{t('textToImage.hint')}</span>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left: Config */}
        <div className="space-y-5">
          <div className="bg-white rounded-lg border p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('textToImage.surgeryType')}</label>
                <select value={surgeryType} onChange={(e) => setSurgeryType(e.target.value)} className={selectClass}>
                  {SURGERY_TYPES.map((s) => (
                    <option key={s.value} value={s.value}>{isZh ? s.label_zh : s.label_en}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('textToImage.dayNumber')}</label>
                <input type="number" value={dayNumber} onChange={(e) => setDayNumber(parseInt(e.target.value) || 0)} className={selectClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('textToImage.gender')}</label>
                <select value={gender} onChange={(e) => setGender(e.target.value)} className={selectClass}>
                  {GENDERS.map((g) => <option key={g.value} value={g.value}>{isZh ? g.label_zh : g.label_en}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('textToImage.ageRange')}</label>
                <select value={ageRange} onChange={(e) => setAgeRange(e.target.value)} className={selectClass}>
                  {AGE_RANGES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('textToImage.ethnicity')}</label>
                <select value={ethnicity} onChange={(e) => setEthnicity(e.target.value)} className={selectClass}>
                  {ETHNICITIES.map((e) => <option key={e.value} value={e.value}>{isZh ? e.label_zh : e.label_en}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('textToImage.bodyType')}</label>
                <select value={bodyType} onChange={(e) => setBodyType(e.target.value)} className={selectClass}>
                  {BODY_TYPES.map((b) => <option key={b.value} value={b.value}>{isZh ? b.label_zh : b.label_en}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('textToImage.complications')}</label>
              <input value={complications} onChange={(e) => setComplications(e.target.value)}
                placeholder={t('textToImage.complicationsPlaceholder')} className={selectClass} />
            </div>
          </div>

          <div className="bg-white rounded-lg border p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">{t('workbench.promptEditor')}</label>
              <button onClick={handleGeneratePrompt}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                {t('textToImage.generatePrompt')}
              </button>
            </div>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-32 resize-none border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder={t('workbench.promptPlaceholder')} />
            <button onClick={handleGenerate} disabled={generating || !prompt}
              className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50">
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {t('textToImage.generate')}
            </button>
          </div>
        </div>

        {/* Right: Result */}
        <div className="bg-white rounded-lg border p-5 flex items-center justify-center min-h-[500px] relative">
          {generating && (
            <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10 rounded-lg">
              <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
              <p className="mt-3 text-sm text-gray-600">{t('workbench.generating')}</p>
            </div>
          )}
          {result ? (
            <img src={result.image_url} alt="Generated" className="max-w-full max-h-full object-contain rounded" />
          ) : (
            <div className="text-center text-gray-400">
              <ImageIcon className="w-16 h-16 mx-auto mb-3" />
              <p className="text-sm">{t('workbench.noResult')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
