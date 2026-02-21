import { useState } from 'react';
import { KeyRound, Loader2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';

export function ActivationPage() {
  const { t, i18n } = useTranslation();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const activate = useAuthStore((s) => s.activate);

  const handleActivate = async () => {
    if (!code.trim()) return;
    setError('');
    setLoading(true);
    try {
      await activate(code.trim());
    } catch (err: any) {
      setError(err.message || t('activation.error'));
    } finally {
      setLoading(false);
    }
  };

  const isZh = i18n.language.startsWith('zh');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        {/* Lang switch */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => i18n.changeLanguage(isZh ? 'en' : 'zh')}
            className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-2 py-1"
          >
            {isZh ? 'English' : '中文'}
          </button>
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
            100
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('app.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('app.subtitle')}</p>
          <p className="text-xs text-amber-600 mt-2 px-4">{t('app.disclaimer')}</p>
        </div>

        {/* Activation Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('activation.label')}
            </label>
            <div className="relative">
              <KeyRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
                placeholder={t('activation.placeholder')}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                autoFocus
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleActivate}
            disabled={loading || !code.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
            {t('activation.submit')}
          </button>
        </div>

        {/* Contact info */}
        <div className="mt-6 p-4 bg-gray-50 rounded-xl">
          <p className="text-sm text-gray-600 text-center">
            {t('activation.contact')}
            <span className="font-semibold text-primary-600">peng_ip</span>
          </p>
        </div>
      </div>
    </div>
  );
}
