import { useTranslation } from 'react-i18next';
import { useWorkbenchStore } from '../../stores/workbenchStore';
import { cn, dayLabel } from '../../lib/utils';
import { DAY_PRESETS } from '../../lib/constants';
import type { SourceImage, GeneratedImage } from '@healvision/shared';

interface Props {
  sourceImages: SourceImage[];
  generatedImages: GeneratedImage[];
  selectedDay: number;
}

function getPhase(day: number): 'pre' | 'surgery' | 'post' {
  if (day < 0) return 'pre';
  if (day === 0) return 'surgery';
  return 'post';
}

const phaseConfig = {
  pre: { label_zh: '术前', label_en: 'Pre-Op', border: 'border-l-orange-400', bg: 'bg-orange-50', text: 'text-orange-600' },
  surgery: { label_zh: '手术日', label_en: 'Surgery', border: 'border-l-blue-400', bg: 'bg-blue-50', text: 'text-blue-600' },
  post: { label_zh: '术后', label_en: 'Post-Op', border: 'border-l-green-400', bg: 'bg-green-50', text: 'text-green-600' },
};

export function Timeline({ sourceImages, generatedImages, selectedDay }: Props) {
  const { t, i18n } = useTranslation();
  const selectDay = useWorkbenchStore((s) => s.selectDay);
  const isZh = i18n.language === 'zh';

  // Collect unique days from images + presets
  const days = new Set<number>();
  DAY_PRESETS.forEach((d) => days.add(d));
  sourceImages.forEach((i) => days.add(i.day_number));
  generatedImages.forEach((i) => days.add(i.day_number));

  const sortedDays = Array.from(days).sort((a, b) => a - b);

  // Group days by phase
  const groups: { phase: 'pre' | 'surgery' | 'post'; days: number[] }[] = [];
  let currentPhase: string | null = null;

  for (const day of sortedDays) {
    const phase = getPhase(day);
    if (phase !== currentPhase) {
      groups.push({ phase, days: [day] });
      currentPhase = phase;
    } else {
      groups[groups.length - 1].days.push(day);
    }
  }

  return (
    <div className="p-2 flex flex-row lg:flex-col gap-2 lg:gap-0 overflow-x-auto lg:overflow-x-hidden items-center lg:items-stretch">
      <h3 className="text-xs font-semibold text-gray-500 uppercase px-2 py-2 shrink-0 lg:w-full">
        {t('workbench.timeline')}
      </h3>
      <p className="hidden lg:block text-[10px] text-gray-400 px-2 pb-2 leading-tight">
        {t('workbench.timelineHint')}
      </p>
      <div className="flex flex-row lg:flex-col gap-1 lg:gap-0 lg:w-full">
        {groups.map((group) => {
          const config = phaseConfig[group.phase];
          return (
            <div key={group.phase} className="lg:mb-2">
              {/* Phase header */}
              <div className={cn('px-2 py-1 text-[10px] font-bold uppercase tracking-wide rounded-sm mb-0.5', config.bg, config.text)}>
                {isZh ? config.label_zh : config.label_en}
              </div>
              {/* Days in this phase */}
              <div className="flex flex-row lg:flex-col gap-0.5">
                {group.days.map((day) => {
                  const hasSource = sourceImages.some((i) => i.day_number === day);
                  const hasGenerated = generatedImages.some((i) => i.day_number === day);
                  const isSelected = selectedDay === day;

                  return (
                    <button
                      key={day}
                      onClick={() => selectDay(day)}
                      className={cn(
                        'w-auto lg:w-full shrink-0 text-left px-3 lg:px-2 py-1.5 rounded-r text-xs transition-colors flex flex-col lg:flex-row lg:items-center lg:justify-between min-w-[60px] lg:min-w-0 border-l-3',
                        config.border,
                        isSelected
                          ? 'bg-primary-100 text-primary-700 font-semibold'
                          : 'text-gray-600 hover:bg-gray-50',
                      )}
                    >
                      <span>{dayLabel(day)}</span>
                      <div className="flex gap-1 mt-0.5 lg:mt-0">
                        {hasSource && <span className="w-2 h-2 rounded-full bg-blue-500" title="底图" />}
                        {hasGenerated && <span className="w-2 h-2 rounded-full bg-green-500" title="生成图" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
