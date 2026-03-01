import { createContext, useContext, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn, setAuthToken, clearAuthToken } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthUser = {
  id: number;
  username: string;
  role: string;
  email?: string | null;
  displayName?: string | null;
};

type PermissionsMap = Record<string, string[]>;

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  permissions: PermissionsMap;
  can: (resource: string, action: string) => boolean;
  loginMutation: any;
  registerMutation: any;
  logoutMutation: any;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(globalThis.window.location.search);
    const authToken = params.get("auth_token");
    if (authToken) {
      setAuthToken(authToken);
      params.delete("auth_token");
      const newUrl = globalThis.window.location.pathname + (params.toString() ? `?${params.toString()}` : "");
      globalThis.window.history.replaceState({}, "", newUrl);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    }
  }, []);

  const { data, isLoading } = useQuery<{ user: AuthUser } | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const user = data?.user ?? null;

  const { data: permData } = useQuery<{ role: string; permissions: PermissionsMap }>({
    queryKey: ["/api/permissions"],
    enabled: !!user,
  });

  const permissions = permData?.permissions ?? {};

  const can = useCallback((resource: string, action: string): boolean => {
    if (!user) return false;
    if (user.role === "admin") return true;
    const actions = permissions[resource];
    return !!actions && actions.includes(action);
  }, [user, permissions]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/permissions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message.includes("401") ? "Invalid username or password" : error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { username: string; password: string; email?: string; displayName?: string }) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/permissions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message.includes("409") ? "Username already exists" : error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      clearAuthToken();
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/permissions"] });
    },
  });

  const contextValue = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    permissions,
    can,
    loginMutation,
    registerMutation,
    logoutMutation,
  }), [user, isLoading, permissions, can, loginMutation, registerMutation, logoutMutation]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
