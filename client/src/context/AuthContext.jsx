import { createContext, useContext, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });
  const [businessId, setBusinessId] = useState(() =>
    localStorage.getItem("businessId"),
  );

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    saveSession(res.data);
  };

  const signup = async (businessName, name, email, password) => {
    const res = await api.post("/auth/signup", {
      businessName,
      name,
      email,
      password,
    });
    saveSession(res.data);
  };

  const saveSession = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("businessId", data.businessId);
    setUser(data.user);
    setBusinessId(data.businessId);
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setBusinessId(null);
  };

  return (
    <AuthContext.Provider value={{ user, businessId, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
