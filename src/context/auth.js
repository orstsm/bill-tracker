import { createContext, useContext } from 'react';

export const AuthContext = createContext({
  user: null,
  loading: true,
  isPasswordRecovery: false,
  setIsPasswordRecovery: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

