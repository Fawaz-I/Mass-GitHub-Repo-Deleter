import { useEffect, useState } from "react";
import LoginPage from "./components/LoginPage";
import Dashboard from "./components/Dashboard";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/session", {
          credentials: "include",
        });

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        // Only log errors in development
        if (import.meta.env.DEV) {
          console.error("Session check failed", error);
        }
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    void checkSession();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/auth/logout", { credentials: "include" });
    } catch (error) {
      // Only log errors in development
      if (import.meta.env.DEV) {
        console.error("Logout failed", error);
      }
    } finally {
      setIsAuthenticated(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return isAuthenticated ? (
    <Dashboard onLogout={handleLogout} />
  ) : (
    <LoginPage />
  );
}

export default App;
