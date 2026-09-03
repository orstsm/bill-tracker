import { useAuth } from './context/auth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SetNewPasswordModal from './components/SetNewPasswordModal';

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
      {user ? <Dashboard /> : <Login />}
      {isPasswordRecovery && (
        <SetNewPasswordModal onClose={() => setIsPasswordRecovery(false)} />
      )}
    </>
  );
}

export default App;

