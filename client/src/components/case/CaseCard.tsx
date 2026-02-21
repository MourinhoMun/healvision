import { useTranslation } from 'react-i18next';
import { Image, Presentation, Calendar, Pencil, Trash2 } from 'lucide-react';
import type { Case } from '@healvision/shared';
import { formatDate } from '../../lib/utils';

interface Props {
  caseData: Case;
  onClick: () => void;
  onPresent: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  readOnly?: boolean;
}

export function CaseCard({ caseData, onClick, onPresent, onEdit, onDelete, readOnly = false }: Props) {
  const { t } = useTranslation();

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all cursor-pointer overflow-hidden group select-none"
      onClick={onClick}
    >
      <div className="h-36 bg-gray-50 flex items-center justify-center relative">
        <Image className="w-10 h-10 text-gray-300" />
        {/* Mobile: Always visible edit button on top right? Or just keep it at bottom? 
            Let's keep it at bottom for consistency, but maybe add a quick edit on top for mobile? 
            No, bottom is better for reachability.
        */}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 truncate flex-1">{caseData.name}</h3>
          <div className="flex items-center gap-1 -mr-2 -mt-1">
            {!readOnly && onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="text-gray-400 hover:text-primary-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                title={t('case.edit', 'Edit')}
              >
                <Pencil size={14} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="text-gray-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-colors"
                title={t('case.delete', 'Delete')}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {caseData.surgery_type && (
          <p className="text-xs text-primary-600 mt-0.5">
            {t(`surgery.${caseData.surgery_type}`, caseData.surgery_type_custom || caseData.surgery_type)}
          </p>
        )}

        <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
          <span>{caseData.source_image_count || 0} {t('home.sourceImages')}</span>
          <span>{caseData.generated_image_count || 0} {t('home.generatedImages')}</span>
        </div>

        {caseData.tags && caseData.tags.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap h-5 overflow-hidden">
            {caseData.tags.map((tag) => (
              <span
                key={tag.id}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Calendar size={12} />
            {formatDate(caseData.updated_at)}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onPresent(); }}
            className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium px-2 py-1 rounded hover:bg-primary-50 transition-colors"
          >
            <Presentation size={12} />
            {t('home.presentation')}
          </button>
        </div>
      </div>
    </div>
  );
}
