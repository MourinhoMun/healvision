import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useUiStore } from '../../stores/uiStore';
import { cn } from '../../lib/utils';

export function AppShell() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className={cn('flex flex-col flex-1 min-w-0 transition-all ml-0', collapsed ? 'lg:ml-16' : 'lg:ml-56')}>
        <Header />
        <main className="flex-1 overflow-auto p-6 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
