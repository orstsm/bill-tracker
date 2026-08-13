import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <div className="app-bg"></div>
      <div className="app-bg-overlay"></div>
      {user ? <Dashboard /> : <Login />}
    </>
  );
}

export default App;
