"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import {
  canAccessUserRoutes,
  canAccessVendorRoutes,
  getUserRole,
  isAdmin,
  isUser,
  isVendor,
} from "@/utils/authorization";
import { ROLES } from "@/utils/roles";
import { createClient } from "@/utils/supabase/client";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let active = true;

    const applyUser = (nextUser) => {
      if (!active) return;
      if (nextUser) {
        setUser(nextUser);
        setRole(getUserRole(nextUser));
      } else {
        setUser(null);
        setRole(null);
      }
    };

    // Initial load uses getUser() — it revalidates the token against the Auth
    // server, unlike getSession() which trusts unverified local cookies.
    const loadUser = async () => {
      try {
        const {
          data: { user: verifiedUser },
        } = await supabase.auth.getUser();
        applyUser(verifiedUser ?? null);
      } catch (error) {
        console.error("Error loading user:", error);
        applyUser(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadUser();

    // Subsequent updates come from Supabase's own auth events (sign in/out,
    // token refresh, password recovery, MFA). The session here is Supabase-issued,
    // so deriving role from it is safe.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user ?? null);
      if (active) setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  // Force a re-read of the verified user (e.g. after a role change).
  const refreshUser = async () => {
    const {
      data: { user: verifiedUser },
    } = await supabase.auth.getUser();
    if (verifiedUser) {
      setUser(verifiedUser);
      setRole(getUserRole(verifiedUser));
    } else {
      setUser(null);
      setRole(null);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setRole(null);
      router.refresh();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Authorization helpers
  const hasRole = (requiredRole) => {
    return role === requiredRole;
  };

  const hasAnyRole = (requiredRoles) => {
    if (!Array.isArray(requiredRoles)) return false;
    return requiredRoles.includes(role);
  };

  const canAccessVendor = () => {
    return canAccessVendorRoutes(role);
  };

  const canAccessUser = () => {
    return canAccessUserRoutes(role);
  };

  const value = {
    // User data
    user,
    role,
    loading,

    // Authentication state
    isAuthenticated: !!user,

    // Role checks (for backward compatibility)
    isVendor: isVendor(role),
    isUser: isUser(role),
    isAdmin: isAdmin(role),

    // Authorization helpers
    hasRole,
    hasAnyRole,
    canAccessVendor,
    canAccessUser,

    // Actions
    signOut,
    refreshUser,

    // Constants
    ROLES,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
