import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Loader2, UserSquare2, X, Download, RotateCcw } from 'lucide-react';
import { generateTextToImage } from '../api/generate';
import { SURGERY_TYPES, BODY_TYPES, GENDERS, AGE_RANGES, ETHNICITIES } from '../lib/constants';
import { useUiStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import { isAiRejection, parseAiRejection } from '../lib/aiRejection';
import { AiRejectionGuide } from '../components/shared/AiRejectionGuide';

// 可选天数（覆盖整个 100 天康复周期关键节点）
const DAY_OPTIONS = [1, 2, 3, 5, 7, 10, 14, 21, 30, 45, 60, 90, 100];
const DEFAULT_DAYS = new Set([1, 3, 7, 14, 30, 60, 100]);

type ResultItem = {
  day: number;
  status: 'pending' | 'generating' | 'done' | 'error';
  image_url?: string;
  error?: string;
};

export function TextToImagePage() {
  const { t, i18n } = useTranslation();
  const addToast = useUiStore((s) => s.addToast);
  const isZh = i18n.language === 'zh';

  // 手术配置
  const [surgeryType, setSurgeryType] = useState('double_eyelid');
  const [gender, setGender] = useState('female');
  const [ageRange, setAgeRange] = useState('30s');
  const [ethnicity, setEthnicity] = useState('asian');
  const [bodyType, setBodyType] = useState('normal');
  const [complications, setComplications] = useState('');

  // 垫图
  const [refBase64, setRefBase64] = useState<string | null>(null);
  const [refMime, setRefMime] = useState<string | null>(null);
  const refInputRef = useRef<HTMLInputElement>(null);

  // 天数选择
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set(DEFAULT_DAYS));
  const [customDay, setCustomDay] = useState('');

  // 生成结果
  const [results, setResults] = useState<ResultItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  // ── 垫图处理 ──────────────────────────────────────────────────────

  const handleReferenceSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setRefBase64(dataUrl.split(',')[1]);
      setRefMime(file.type);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ── 天数选择 ──────────────────────────────────────────────────────

  const toggleDay = (day: number) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const addCustomDay = () => {
    const d = parseInt(customDay, 10);
    if (!isNaN(d) && d >= 0 && d <= 365) {
      setSelectedDays((prev) => new Set([...prev, d]));
      setCustomDay('');
    }
  };

  // ── 批量生成 ─────────────────────────────────────────────────────

  const handleBatchGenerate = async () => {
    if (selectedDays.size === 0) {
      addToast('请至少选择一个天数', 'error');
      return;
    }
    const days = Array.from(selectedDays).sort((a, b) => a - b);
    setResults(days.map((day) => ({ day, status: 'pending' })));
    setIsGenerating(true);
    setProgressCurrent(0);

    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      setResults((prev) =>
        prev.map((r) => (r.day === day ? { ...r, status: 'generating' } : r)),
      );
      try {
        const res = await generateTextToImage({
          surgery_type: surgeryType,
          day_number: day,
          gender,
          age_range: ageRange,
          ethnicity,
          body_type: bodyType,
          complications: complications || undefined,
          reference_image_base64: refBase64 ?? undefined,
          reference_mime_type: refMime ?? undefined,
        });
        setResults((prev) =>
          prev.map((r) => (r.day === day ? { ...r, status: 'done', image_url: res.image_url } : r)),
        );
        useAuthStore.getState().checkBalance();
      } catch (err: any) {
        const errorMsg = isAiRejection(err.message)
          ? 'AI_REJECTED'
          : (err.message ?? '生成失败');
        setResults((prev) =>
          prev.map((r) =>
            r.day === day ? { ...r, status: 'error', error: errorMsg } : r,
          ),
        );
      }
      setProgressCurrent(i + 1);
    }
    setIsGenerating(false);
  };

  const selectClass =
    'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
  const doneCount = results.filter((r) => r.status === 'done').length;

  return (
    <div className="max-w-4xl mx-auto pb-10">
      {rejectionReason && (
        <AiRejectionGuide reason={rejectionReason} onClose={() => setRejectionReason(null)} />
      )}
      <h1 className="text-2xl font-bold text-gray-900 mb-5">100 天康复全程生成</h1>

      {/* ────────── 垫图区（突出显示） ────────── */}
      <div
        className={`bg-white rounded-2xl mb-5 overflow-hidden transition-all ${
          refBase64
            ? 'border-2 border-primary-400 shadow-sm'
            : 'border-2 border-dashed border-primary-300 hover:border-primary-400'
        }`}
      >
        <div className="px-5 pt-4 pb-3 flex items-center gap-2 border-b border-gray-100">
          <UserSquare2 size={17} className="text-primary-600 shrink-0" />
          <span className="text-sm font-semibold text-gray-800">人像垫图</span>
          <span className="text-xs text-gray-400">· 生成时严格保留此人的五官特征</span>
          {refBase64 && (
            <span className="ml-auto text-[10px] font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
              ✓ 已设置
            </span>
          )}
        </div>

        {refBase64 ? (
          /* 已上传：展示大预览 */
          <div className="px-5 py-4 flex items-start gap-4">
            <div className="relative shrink-0">
              <img
                src={`data:${refMime};base64,${refBase64}`}
                alt="垫图预览"
                className="h-40 w-40 object-cover rounded-xl border border-gray-200 shadow-sm"
              />
              <button
                onClick={() => {
                  setRefBase64(null);
                  setRefMime(null);
                }}
                className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center bg-white rounded-full shadow border border-gray-200 text-gray-400 hover:text-red-500 transition-colors"
                title="移除垫图"
              >
                <X size={13} />
              </button>
            </div>
            <div className="flex-1 pt-1">
              <p className="text-sm font-medium text-gray-700 mb-1">已设置人像参考</p>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">
                AI 生成时将严格保留此人的面部轮廓、五官特征和肤色，
                <br />仅在此基础上叠加对应天数的康复状态。
              </p>
              <button
                onClick={() => refInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <RotateCcw size={12} />
                更换图片
              </button>
            </div>
          </div>
        ) : (
          /* 未上传：大点击区域 */
          <button
            onClick={() => refInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-3 py-12 px-5 text-center hover:bg-primary-50/40 transition-colors"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary-50 border-2 border-primary-100 flex items-center justify-center">
              <UserSquare2 size={30} className="text-primary-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-600">点击上传人像垫图</p>
              <p className="text-xs text-gray-400 mt-1">
                支持 JPG / PNG · 建议正脸清晰照片 · 不上传则随机生成人物
              </p>
            </div>
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

      {/* ────────── 手术与患者配置 ────────── */}
      <div className="bg-white rounded-xl border p-5 mb-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          手术与患者配置
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">{t('textToImage.surgeryType')}</label>
            <select value={surgeryType} onChange={(e) => setSurgeryType(e.target.value)} className={selectClass}>
              {SURGERY_TYPES.map((s) => (
                <option key={s.value} value={s.value}>
                  {isZh ? s.label_zh : s.label_en}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">{t('textToImage.gender')}</label>
            <select value={gender} onChange={(e) => setGender(e.target.value)} className={selectClass}>
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>
                  {isZh ? g.label_zh : g.label_en}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">{t('textToImage.ageRange')}</label>
            <select value={ageRange} onChange={(e) => setAgeRange(e.target.value)} className={selectClass}>
              {AGE_RANGES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">{t('textToImage.ethnicity')}</label>
            <select value={ethnicity} onChange={(e) => setEthnicity(e.target.value)} className={selectClass}>
              {ETHNICITIES.map((e) => (
                <option key={e.value} value={e.value}>
                  {isZh ? e.label_zh : e.label_en}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">{t('textToImage.bodyType')}</label>
            <select value={bodyType} onChange={(e) => setBodyType(e.target.value)} className={selectClass}>
              {BODY_TYPES.map((b) => (
                <option key={b.value} value={b.value}>
                  {isZh ? b.label_zh : b.label_en}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">{t('textToImage.complications')}</label>
            <input
              value={complications}
              onChange={(e) => setComplications(e.target.value)}
              placeholder={t('textToImage.complicationsPlaceholder')}
              className={selectClass}
            />
          </div>
        </div>
      </div>

      {/* ────────── 天数选择 ────────── */}
      <div className="bg-white rounded-xl border p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              选择生成天数
            </h3>
            <span className="text-xs text-primary-700 bg-primary-50 border border-primary-100 px-2 py-0.5 rounded-full">
              已选 {selectedDays.size} 天 · {selectedDays.size * 10} 积分
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={() => setSelectedDays(new Set(DAY_OPTIONS))}
              className="text-primary-600 hover:underline"
            >
              全选
            </button>
            <span className="text-gray-200">|</span>
            <button
              onClick={() => setSelectedDays(new Set(DEFAULT_DAYS))}
              className="text-gray-500 hover:underline"
            >
              默认
            </button>
            <span className="text-gray-200">|</span>
            <button
              onClick={() => setSelectedDays(new Set())}
              className="text-gray-500 hover:underline"
            >
              清空
            </button>
          </div>
        </div>

        {/* 天数芯片 */}
        <div className="flex flex-wrap gap-2 mb-3">
          {DAY_OPTIONS.map((day) => (
            <button
              key={day}
              onClick={() => toggleDay(day)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                selectedDays.has(day)
                  ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600'
              }`}
            >
              第 {day} 天
            </button>
          ))}
        </div>

        {/* 自定义天数输入 */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-400 shrink-0">自定义天数：</span>
          <input
            type="number"
            min={0}
            max={365}
            value={customDay}
            onChange={(e) => setCustomDay(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomDay()}
            placeholder="如 50"
            className="w-20 px-2 py-1 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
          <button
            onClick={addCustomDay}
            className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            添加
          </button>
          {/* 当前选中的非预设天数 */}
          {Array.from(selectedDays)
            .filter((d) => !DAY_OPTIONS.includes(d))
            .sort((a, b) => a - b)
            .map((d) => (
              <span
                key={d}
                className="flex items-center gap-1 px-2.5 py-1 bg-primary-600 text-white rounded-lg text-xs"
              >
                第 {d} 天
                <button onClick={() => toggleDay(d)} className="opacity-70 hover:opacity-100">
                  <X size={10} />
                </button>
              </span>
            ))}
        </div>
      </div>

      {/* ────────── 生成按钮 ────────── */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={handleBatchGenerate}
          disabled={isGenerating || selectedDays.size === 0}
          className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
        >
          {isGenerating ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          {isGenerating
            ? `生成中 ${progressCurrent} / ${selectedDays.size}`
            : `生成康复全程图（${selectedDays.size} 张 · ${selectedDays.size * 10} 积分）`}
        </button>

        {results.length > 0 && !isGenerating && (
          <span className="text-xs text-gray-500">
            完成 {doneCount} / {results.length} 张
            {doneCount < results.length && (
              <span className="text-red-400 ml-1">
                · {results.filter((r) => r.status === 'error').length} 张失败
              </span>
            )}
          </span>
        )}
      </div>

      {/* ────────── 生成结果网格 ────────── */}
      {results.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            康复全程图
            {isGenerating && (
              <span className="ml-2 text-xs font-normal text-primary-500">生成中，已完成的图片将实时显示…</span>
            )}
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {results.map(({ day, status, image_url, error }) => (
              <div key={day} className="bg-white rounded-xl border overflow-hidden shadow-sm">
                {/* 图片区 */}
                <div className="aspect-square bg-gray-50 flex items-center justify-center relative">
                  {status === 'done' && image_url ? (
                    <img
                      src={image_url}
                      alt={`第${day}天`}
                      className="w-full h-full object-cover"
                    />
                  ) : status === 'generating' ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={22} className="text-primary-500 animate-spin" />
                      <span className="text-[10px] text-gray-400">生成中…</span>
                    </div>
                  ) : status === 'error' ? (
                    <div className="flex flex-col items-center gap-1 px-2 text-center">
                      <span className="text-2xl">{error === 'AI_REJECTED' ? '🚫' : '✕'}</span>
                      {error === 'AI_REJECTED' ? (
                        <button
                          onClick={() => setRejectionReason('SAFETY')}
                          className="text-[10px] text-amber-500 underline underline-offset-2 leading-tight hover:text-amber-600"
                        >
                          模型拒绝，查看原因及写作指南
                        </button>
                      ) : (
                        <span className="text-[10px] text-red-400 leading-tight">
                          {error?.slice(0, 50) ?? '生成失败'}
                        </span>
                      )}
                    </div>
                  ) : (
                    /* pending */
                    <span className="text-xs text-gray-300">待生成</span>
                  )}
                </div>

                {/* 底部标签 */}
                <div className="px-2 py-1.5 flex items-center justify-between bg-white">
                  <span className="text-xs font-semibold text-gray-700">第 {day} 天</span>
                  {status === 'done' && image_url && (
                    <a
                      href={image_url}
                      download={`recovery_day${day}.jpg`}
                      className="text-gray-400 hover:text-primary-600 transition-colors"
                      title="下载"
                    >
                      <Download size={13} />
                    </a>
                  )}
                  {status === 'error' && (
                    <span className="text-[10px] text-red-400">失败</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
