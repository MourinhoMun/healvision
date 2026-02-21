import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Menu, Coins, Plus } from 'lucide-react';
import { useDevMode } from '../../hooks/useDevMode';
import { DevPasswordDialog } from '../settings/DevPasswordDialog';
import { useUiStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { RechargeDialog } from '../shared/RechargeDialog';

export function Header() {
  const { t, i18n } = useTranslation();
  const { showPasswordDialog, handleLogoClick, closePasswordDialog } = useDevMode();
  const toggleMobileSidebar = useUiStore((s) => s.toggleMobileSidebar);
  const balance = useAuthStore((s) => s.balance);
  const [showRecharge, setShowRecharge] = useState(false);

  const toggleLang = () => {
    const next = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(next);
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleMobileSidebar}
          className="lg:hidden text-gray-500 hover:text-gray-700 p-1"
        >
          <Menu size={24} />
        </button>

        <div
          className="flex items-center gap-2 cursor-default select-none"
          onClick={handleLogoClick}
        >
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
            100
          </div>
          <span className="text-sm text-gray-500 hidden sm:block">{t('app.subtitle')}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Balance display */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 rounded-lg">
          <Coins size={14} className="text-primary-600" />
          <span className="text-sm font-medium text-primary-700">{balance}</span>
          <button
            onClick={() => setShowRecharge(true)}
            className="ml-1 p-0.5 text-primary-500 hover:text-primary-700 rounded"
            title="充值"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-50"
        >
          <Globe size={16} />
          {i18n.language === 'zh' ? 'EN' : '中文'}
        </button>
      </div>

      {showPasswordDialog && <DevPasswordDialog onClose={closePasswordDialog} />}
      {showRecharge && <RechargeDialog onClose={() => setShowRecharge(false)} />}
    </header>
  );
}
