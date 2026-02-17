import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Presentation } from 'lucide-react';
import { useCaseStore } from '../stores/caseStore';
import { CaseCard } from '../components/case/CaseCard';
import { CaseFormDialog } from '../components/case/CaseFormDialog';
import { CaseEditDialog } from '../components/case/CaseEditDialog';
import type { Case } from '@healvision/shared';

export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { cases, loading, fetchCases } = useCaseStore();
  const [showCreate, setShowCreate] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('home.title')}</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
          >
            <Plus size={16} />
            {t('home.newCase')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
      ) : cases.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 text-sm">{t('home.noCases')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cases.map((c) => (
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

      {showCreate && (
        <CaseFormDialog
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setShowCreate(false);
            fetchCases();
            navigate(`/workbench/${id}`);
          }}
        />
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
