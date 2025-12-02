"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";
import { getUserRole, isVendor, isUser, canAccessVendorRoutes, canAccessUserRoutes } from "../utils/authorization";
import { ROLES } from "../utils/roles";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          const userRole = getUserRole(session.user);
          setRole(userRole);
        } else {
          setUser(null);
          setRole(null);
        }
      } catch (error) {
        console.error("Error getting session:", error);
        setUser(null);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        const userRole = getUserRole(session.user);
        setRole(userRole);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

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
    
    // Authorization helpers
    hasRole,
    hasAnyRole,
    canAccessVendor,
    canAccessUser,
    
    // Actions
    signOut,
    
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

