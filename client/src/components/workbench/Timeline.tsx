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

export function Timeline({ sourceImages, generatedImages, selectedDay }: Props) {
  const { t } = useTranslation();
  const selectDay = useWorkbenchStore((s) => s.selectDay);

  // Collect unique days from images + presets
  const days = new Set<number>();
  DAY_PRESETS.forEach((d) => days.add(d));
  sourceImages.forEach((i) => days.add(i.day_number));
  generatedImages.forEach((i) => days.add(i.day_number));

  const sortedDays = Array.from(days).sort((a, b) => a - b);

  return (
    <div className="p-2 flex flex-row lg:flex-col gap-2 lg:gap-0 overflow-x-auto lg:overflow-x-hidden items-center lg:items-stretch">
      <h3 className="text-xs font-semibold text-gray-500 uppercase px-2 py-2 shrink-0 lg:w-full">
        {t('workbench.timeline')}
      </h3>
      <div className="flex flex-row lg:flex-col gap-1 lg:gap-0 lg:space-y-0.5 lg:w-full">
        {sortedDays.map((day) => {
          const hasSource = sourceImages.some((i) => i.day_number === day);
          const hasGenerated = generatedImages.some((i) => i.day_number === day);
          const isSelected = selectedDay === day;

          return (
            <button
              key={day}
              onClick={() => selectDay(day)}
              className={cn(
                'w-auto lg:w-full shrink-0 text-left px-3 lg:px-2 py-1.5 rounded text-xs transition-colors flex flex-col lg:block items-center lg:items-start min-w-[60px] lg:min-w-0',
                isSelected
                  ? 'bg-primary-100 text-primary-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              <span>{dayLabel(day)}</span>
              <div className="flex gap-1 mt-0.5 justify-center lg:justify-start">
                {hasSource && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                {hasGenerated && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
