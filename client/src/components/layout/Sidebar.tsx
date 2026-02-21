import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Wrench, Type, FolderOpen, Settings, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import { cn } from '../../lib/utils';

const navItems = [
  { path: '/', icon: Home, labelKey: 'nav.home' },
  { path: '/text-to-image', icon: Type, labelKey: 'nav.textToImage' },
  { path: '/cases', icon: FolderOpen, labelKey: 'nav.caseLibrary' },
  { path: '/settings', icon: Settings, labelKey: 'nav.settings' },
];

export function Sidebar() {
  const { t } = useTranslation();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);
  const mobileOpen = useUiStore((s) => s.mobileSidebarOpen);
  const setMobileOpen = useUiStore((s) => s.setMobileSidebarOpen);

  return (
    <>
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300 z-40',
          // Mobile: default hidden, slide in
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: always visible (reset transform), width based on collapsed state
          'lg:translate-x-0',
          collapsed ? 'lg:w-16' : 'lg:w-56',
          // Mobile width always fixed when open
          'w-64',
          mobileOpen ? 'shadow-2xl' : '',
        )}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-100">
          <div className={cn("flex items-center gap-2 overflow-hidden", collapsed ? "lg:hidden" : "")}>
            <span className="text-lg font-bold text-primary-700 truncate">{t('app.title')}</span>
          </div>
          {/* Mobile Close Button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 py-3 space-y-1 px-2">
          {navItems.map(({ path, icon: Icon, labelKey }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                )
              }
            >
              <Icon size={20} className="shrink-0" />
              <span className={cn("truncate", collapsed ? "lg:hidden" : "")}>{t(labelKey)}</span>
            </NavLink>
          ))}
        </nav>

        <button
          onClick={toggle}
          className="hidden lg:flex p-3 border-t border-gray-100 text-gray-400 hover:text-gray-600 justify-center"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
