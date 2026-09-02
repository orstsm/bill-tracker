import { useAuth } from './context/auth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen" aria-label="Loading Bill Tracker">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    user ? <Dashboard /> : <Login />
  );
}

export default App;
