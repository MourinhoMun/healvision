import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { useCaseStore } from '../stores/caseStore';
import { CaseCard } from '../components/case/CaseCard';
import { CaseEditDialog } from '../components/case/CaseEditDialog';
import type { Case } from '@healvision/shared';

export function CaseLibraryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { cases, loading, fetchCases, searchQuery, setSearchQuery } = useCaseStore();
  const [editingCase, setEditingCase] = useState<Case | null>(null);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const filtered = searchQuery
    ? cases.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.surgery_type?.includes(searchQuery) ||
        c.tags?.some((t) => t.name.includes(searchQuery)),
    )
    : cases;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('nav.caseLibrary')}</h1>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search cases..."
          className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">{t('common.noData')}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((c) => (
            <CaseCard
              key={c.id}
              caseData={c}
              onClick={() => navigate(`/workbench/${c.id}`)}
              onPresent={() => navigate(`/viewer/${c.id}`)}
              onEdit={() => setEditingCase(c)}
            />
          ))}
        </div>
      )}

      {editingCase && (
        <CaseEditDialog
          caseData={editingCase}
          onClose={() => setEditingCase(null)}
          onUpdated={() => {
            fetchCases();
            setEditingCase(null);
          }}
        />
      )}
    </div>
  );
}
