import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { verifyDevPassword } from '../../api/settings';
import { useSettingsStore } from '../../stores/settingsStore';
import { useUiStore } from '../../stores/uiStore';

export function DevPasswordDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setDevMode = useSettingsStore((s) => s.setDevMode);
  const addToast = useUiStore((s) => s.addToast);

  const handleVerify = async () => {
    setLoading(true);
    setError('');
    try {
      const token = await verifyDevPassword(password);
      setDevMode(true, token);
      addToast('Developer mode unlocked', 'success');
      onClose();
      navigate('/settings');
    } catch {
      setError('Invalid password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-80 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">{t('settings.developer.unlock')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
          placeholder={t('settings.developer.password')}
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          autoFocus
        />

        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}

        <button
          onClick={handleVerify}
          disabled={loading || !password}
          className="w-full mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? '...' : t('settings.developer.verify')}
        </button>
      </div>
    </div>
  );
}
