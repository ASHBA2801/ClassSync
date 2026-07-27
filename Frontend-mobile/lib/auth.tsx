import { createContext, useContext, useState, ReactNode } from "react";

type Role = "teacher" | "parent";

type AuthContextType = {
  role: Role | null;
  schoolId: string;
  login: (role: Role) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  const [schoolId] = useState("school-a");

  return (
    <AuthContext.Provider
      value={{
        role,
        schoolId,
        login: setRole,
        logout: () => setRole(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
