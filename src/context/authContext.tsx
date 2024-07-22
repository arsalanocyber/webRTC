import React, { createContext, useState, ReactNode, useContext } from "react";
import { User } from "../types";

interface AuthProviderProps {
  children: ReactNode;
}

interface AuthContextType {
  user: User | null;
  login: (
    email: string,
    password: string
  ) => Promise<{ user: User; token: string }>;
  logout: () => void;
  getUsers: () => Promise<User[]>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async (email: string, password: string) => {
    throw new Error("login function not implemented");
  },
  logout: () => {},
  getUsers: async () => {
    throw new Error("getUsers function not implemented");
  },
});

export const useAuth = () => useContext(AuthContext);
export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
}: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (
    email: string,
    password: string
  ): Promise<{ user: User; token: string }> => {
    try {
      const response = await fetch("http://localhost:5000/api/users/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const { user, token } = await response.json();
      localStorage.setItem("token", token);
      setUser(user);
      return { user, token };
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("token");
  };

  const getUsers = async (): Promise<User[]> => {
    try {
      const response = await fetch("http://localhost:5000/api/users");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const users: User[] = await response.json();
      return users;
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, getUsers }}>
      {children}
    </AuthContext.Provider>
  );
};
