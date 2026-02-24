import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/HomePage';
import { WorkbenchPage } from './pages/WorkbenchPage';
import { TextToImagePage } from './pages/TextToImagePage';
import { ViewerPage } from './pages/ViewerPage';
import { CaseLibraryPage } from './pages/CaseLibraryPage';
import { SettingsPage } from './pages/SettingsPage';
import { ActivationPage } from './pages/ActivationPage';
import { ToastContainer } from './components/shared/ToastContainer';
import { useAuthStore } from './stores/authStore';

export default function App() {
  const isActivated = useAuthStore((s) => s.isActivated);
  const loading = useAuthStore((s) => s.loading);
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f0f4ff' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #4f46e5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isActivated) {
    return (
      <>
        <ActivationPage />
        <ToastContainer />
      </>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/viewer/:caseId" element={<ViewerPage />} />
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/workbench/:caseId" element={<WorkbenchPage />} />
          <Route path="/text-to-image" element={<TextToImagePage />} />
          <Route path="/cases" element={<CaseLibraryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
      <ToastContainer />
    </>
  );
}
