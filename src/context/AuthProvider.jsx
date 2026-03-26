import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  clearSession,
  fetchCurrentUser,
  logout as logoutRequest,
} from "../services/apiClient";
import { trackEvent } from "../services/analytics";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const user = await fetchCurrentUser();
        setCurrentUser(user);
        setUserRole(user.role);
        setIsAuthenticated(true);
      } catch (error) {
        clearSession();
      } finally {
        setIsBootstrapping(false);
      }
    };

    restoreSession();
  }, []);

  const handleLogin = useCallback((session) => {
    trackEvent("Session", "Login", session?.user?.role || "unknown");
    setCurrentUser(session.user);
    setUserRole(session.user.role);
    setIsAuthenticated(true);
    queryClient.invalidateQueries({ queryKey: ["trip"] });
  }, [queryClient]);

  const handleLogout = useCallback(async () => {
    trackEvent("Session", "Logout", currentUser?.role || "unknown");
    try {
      await logoutRequest();
    } catch (error) {
      // Continue with local cleanup even when the server is unreachable.
    } finally {
      setIsAuthenticated(false);
      setUserRole(null);
      setCurrentUser(null);
      queryClient.removeQueries({ queryKey: ["trip"] });
    }
  }, [currentUser?.role, queryClient]);

  const value = React.useMemo(
    () => ({
      isAuthenticated,
      userRole,
      currentUser,
      isBootstrapping,
      handleLogin,
      handleLogout,
    }),
    [isAuthenticated, userRole, currentUser, isBootstrapping, handleLogin, handleLogout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export default AuthContext;
