import { X, AlertTriangle, Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getRejectionTitle } from '../../lib/aiRejection';

interface Props {
  reason: string;
  onClose: () => void;
}

export function AiRejectionGuide({ reason, onClose }: Props) {
  const { i18n } = useTranslation();
  const isZh = i18n.language === 'zh';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} className="text-amber-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                {getRejectionTitle(reason, isZh)}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {isZh ? 'AI 模型内置安全策略拦截了本次请求' : 'AI safety policy blocked this request'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Why rejected */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              {isZh ? '为什么被拒绝' : 'Why was it rejected'}
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              {isZh
                ? 'AI 图像生成模型内置了医学伦理安全过滤器。当提示词中出现过于具体的外科伤口描述、血液、组织损伤等内容时，模型会认为存在伦理风险而拒绝生成。这是平台层面的合规保护机制，与你的账号无关。'
                : 'AI image models include medical ethics safety filters. When prompts contain overly specific descriptions of surgical wounds, blood, or tissue damage, the model considers it an ethical risk and refuses. This is a platform-level compliance mechanism unrelated to your account.'}
            </p>
          </section>

          {/* Prompt writing guide */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={15} className="text-primary-500 shrink-0" />
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {isZh ? '提示词写作原则' : 'Prompt Writing Principles'}
              </h3>
            </div>
            <ul className="space-y-3">
              {(isZh ? ZH_TIPS : EN_TIPS).map((tip, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-0.5 flex-none w-5 h-5 rounded-full bg-primary-50 text-primary-600 text-[11px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{tip.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{tip.desc}</p>
                    {tip.example && (
                      <div className="mt-1.5 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                        <p className="text-[11px] text-gray-400 mb-0.5">{isZh ? '示例' : 'Example'}</p>
                        <p className="text-xs text-gray-600 leading-relaxed">{tip.example}</p>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Footer note */}
          <p className="text-[11px] text-gray-400 leading-relaxed border-t border-gray-100 pt-4">
            {isZh
              ? '本工具仅供医疗专业人员进行术后康复记录与教育用途。所有生成内容须符合所在地区医学伦理法规。'
              : 'This tool is intended for medical professionals for post-operative recovery documentation and education. All generated content must comply with local medical ethics regulations.'}
          </p>
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors"
          >
            {isZh ? '知道了，我来修改提示词' : 'Got it, I\'ll revise the prompt'}
          </button>
        </div>
      </div>
    </div>
  );
}

const ZH_TIPS = [
  {
    title: '用"愈合状态"替代"伤口描述"',
    desc: '聚焦于愈合阶段和外观变化，而非伤口的物理细节。避免使用"出血"、"切口"、"缝合线外露"等词。',
    example: '✓ "术后第7天，肿胀明显消退，皮肤颜色逐渐恢复正常，愈合状态良好"\n✗ "手术切口处有缝合线，周围皮肤有淤青和渗液"',
  },
  {
    title: '强调专业医学背景',
    desc: '在提示词中明确说明这是医学教育用途，使用规范的临床术语，帮助模型判断内容的专业合规性。',
    example: '✓ "临床医学记录图像，展示双眼皮手术术后第3天的正常愈合过程，供医患沟通参考"',
  },
  {
    title: '描述整体恢复，而非局部细节',
    desc: '从整体愈合进程的角度描述，如"肿胀逐渐消退"、"皮肤颜色趋于正常"，而非放大局部创伤特征。',
    example: '✓ "早期术后阶段，面部轻度肿胀，眼周皮肤有正常愈合反应，整体恢复顺利"',
  },
  {
    title: '去掉感官化、图像化的词汇',
    desc: '去除容易触发安全过滤的词汇，如"血"、"脓"、"渗出"、"坏死"、"感染"等，改用中性临床描述。',
    example: '✓ "术区有轻度炎症反应（正常愈合表现）"\n✗ "伤口旁边有渗血，皮下出现淤血"',
  },
  {
    title: '补充患者信息和康复天数',
    desc: '提供清晰的背景信息（性别、年龄段、手术类型、第几天）可帮助模型准确生成，也提高了内容的合规辨识度。',
    example: '✓ "35岁女性，双眼皮手术（切开法），术后第14天，亚洲肤色，正常恢复进度"',
  },
];

const EN_TIPS = [
  {
    title: 'Use "healing status" instead of "wound description"',
    desc: 'Focus on healing stage and appearance changes, not the physical details of wounds. Avoid words like "bleeding", "incision", "exposed sutures".',
    example: '✓ "Day 7 post-op, swelling significantly reduced, skin color gradually normalizing, healing progressing well"\n✗ "Sutures visible at incision site with surrounding bruising and exudate"',
  },
  {
    title: 'Emphasize professional medical context',
    desc: 'Explicitly state the medical education purpose in your prompt and use standard clinical terminology to help the model assess compliance.',
    example: '✓ "Clinical medical record image showing normal healing process of double eyelid surgery at day 3 post-op, for patient-doctor communication"',
  },
  {
    title: 'Describe overall recovery, not local details',
    desc: 'Describe the overall healing trajectory — "swelling gradually reducing", "skin color normalizing" — rather than zooming into traumatic local features.',
    example: '✓ "Early post-operative stage, mild facial swelling, normal periorbital healing response, overall recovery progressing smoothly"',
  },
  {
    title: 'Remove sensory and graphic vocabulary',
    desc: 'Remove words that trigger safety filters — "blood", "pus", "exudate", "necrosis", "infection" — replace with neutral clinical descriptions.',
    example: '✓ "Surgical area shows mild inflammatory response (normal healing sign)"\n✗ "Wound with bloody discharge and subcutaneous bruising"',
  },
  {
    title: 'Add patient context and recovery day',
    desc: 'Providing clear background (gender, age group, surgery type, day number) helps the model generate accurately and improves compliance recognition.',
    example: '✓ "35-year-old Asian female, double eyelid incision surgery, day 14 post-op, normal recovery progress"',
  },
];
