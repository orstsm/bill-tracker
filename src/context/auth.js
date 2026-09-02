import { createContext, useContext } from 'react';

export const AuthContext = createContext({ user: null, loading: true });

export function useAuth() {
  return useContext(AuthContext);
}
