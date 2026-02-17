import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Loader2 } from 'lucide-react';
import { getSettings, updateSettings, getDevConfig, updateDevConfig } from '../api/settings';
import { useSettingsStore } from '../stores/settingsStore';
import { useUiStore } from '../stores/uiStore';

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const addToast = useUiStore((s) => s.addToast);
  const { devModeUnlocked, devToken } = useSettingsStore();

  const [watermark, setWatermark] = useState(true);
  const [loading, setLoading] = useState(false);

  // Dev config
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiKeySet, setApiKeySet] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [savingDev, setSavingDev] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      setWatermark(s.watermark_enabled === '1');
    });
  }, []);

  useEffect(() => {
    if (devModeUnlocked && devToken) {
      getDevConfig(devToken).then((c) => {
        setApiEndpoint(c.api_endpoint);
        setApiKeySet(c.api_key_set);
      });
    }
  }, [devModeUnlocked, devToken]);

  const handleSaveGeneral = async () => {
    setLoading(true);
    try {
      await updateSettings({ watermark_enabled: watermark });
      addToast(t('common.success'), 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDev = async () => {
    if (!devToken) return;
    setSavingDev(true);
    try {
      await updateDevConfig(devToken, {
        api_endpoint: apiEndpoint || undefined,
        api_key: apiKey || undefined,
        new_password: newPassword || undefined,
      });
      addToast(t('settings.developer.saved'), 'success');
      setApiKey('');
      setNewPassword('');
      if (apiKey) setApiKeySet(true);
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setSavingDev(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('settings.title')}</h1>

      {/* General Settings */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('settings.title')}</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700">{t('settings.language')}</label>
            <select
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-sm"
            >
              <option value="zh">中文</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700">{t('settings.watermark')}</label>
            <button
              onClick={() => setWatermark(!watermark)}
              className={`w-10 h-6 rounded-full transition-colors ${watermark ? 'bg-primary-600' : 'bg-gray-300'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${watermark ? 'translate-x-4' : ''}`} />
            </button>
          </div>
        </div>

        <button onClick={handleSaveGeneral} disabled={loading}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {t('common.save')}
        </button>
      </div>

      {/* Developer Settings */}
      {devModeUnlocked && (
        <div className="bg-white rounded-lg border border-amber-200 p-6">
          <h2 className="text-lg font-semibold text-amber-800 mb-4">{t('settings.developer.title')}</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.developer.apiEndpoint')}</label>
              <input value={apiEndpoint} onChange={(e) => setApiEndpoint(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings.developer.apiKey')} {apiKeySet && <span className="text-green-600">(set)</span>}
              </label>
              <input value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                type="password" placeholder="Enter new API key..."
                className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.developer.newPassword')}</label>
              <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                type="password" placeholder="Leave blank to keep current..."
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>

          <button onClick={handleSaveDev} disabled={savingDev}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50">
            {savingDev ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {t('settings.developer.save')}
          </button>
        </div>
      )}
    </div>
  );
}
