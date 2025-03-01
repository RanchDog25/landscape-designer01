import { Suspense, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Home from "./components/home";
import LoginPage from "./components/auth/LoginPage";
import RegisterPage from "./components/auth/RegisterPage";
import AdminPage from "./components/admin/AdminPage";
import { getCurrentUser } from "./lib/auth";

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    const user = getCurrentUser();
    if (!user && window.location.pathname !== "/register") {
      navigate("/login");
    }
  }, [navigate]);

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          Loading...
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </Suspense>
  );
}

export default App;
