import { createContext, useContext, useState, useEffect } from "react";
import { supabase, supabaseEnabled } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Skip Supabase entirely if not configured — load instantly
    if (!supabaseEnabled) {
      setLoading(false);
      return;
    }

    let settled = false; // prevent double-settle between timeout and getSession

    // Fallback: never hang the app if Supabase is unreachable
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        setLoading(false);
      }
    }, 3000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);
      if (!settled) {
        settled = true;
        setUser(session?.user ?? null);
        if (session?.access_token) {
          localStorage.setItem("token", session.access_token);
        } else {
          localStorage.removeItem("token");
        }
        setLoading(false);
      }
    }).catch(() => {
      clearTimeout(timeout);
      if (!settled) {
        settled = true;
        setLoading(false);
      }
    });

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.access_token) {
        localStorage.setItem("token", session.access_token);
      } else {
        localStorage.removeItem("token");
      }
      // Ensure loading is cleared on any auth event (e.g. OAuth redirect)
      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signup = async (name, email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name } }
    });
    if (error) throw error;
    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        name,
        email,
        xp: 0,
        streak: 1,
      });
    }
    return data;
  };

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const loginWithGoogle = async () => {
    if (!supabaseEnabled) throw new Error("Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  };

  const loginWithMicrosoft = async () => {
    if (!supabaseEnabled) throw new Error("Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, loginWithGoogle, loginWithMicrosoft, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
