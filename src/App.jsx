import { lazy, Suspense } from 'react';
import { useAuth } from './context/auth';
import Login from './pages/Login';
import SetNewPasswordModal from './components/SetNewPasswordModal';

const Dashboard = lazy(() => import('./pages/Dashboard'));

function App() {
  const { user, loading, isPasswordRecovery, setIsPasswordRecovery } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen" aria-label="Loading Bill Tracker">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <>
      {user ? (
        <Suspense
          fallback={
            <div className="loading-screen" aria-label="Loading Dashboard">
              <div className="loading-spinner" />
            </div>
          }
        >
          <Dashboard />
        </Suspense>
      ) : (
        <Login />
      )}
      {isPasswordRecovery && (
        <SetNewPasswordModal onClose={() => setIsPasswordRecovery(false)} />
      )}
    </>
  );
}

export default App;

