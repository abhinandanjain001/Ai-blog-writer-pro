import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ currentUser: null, loading: true });

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (!auth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Firebase Configuration Missing</h2>
          <p className="text-gray-600 mb-6">
            Please add your Firebase configuration to the environment variables in the AI Studio settings to continue.
          </p>
          <div className="text-left bg-gray-50 p-4 rounded-lg text-sm text-gray-700 font-mono overflow-x-auto">
            VITE_FIREBASE_API_KEY<br/>
            VITE_FIREBASE_AUTH_DOMAIN<br/>
            VITE_FIREBASE_PROJECT_ID<br/>
            VITE_FIREBASE_STORAGE_BUCKET<br/>
            VITE_FIREBASE_MESSAGING_SENDER_ID<br/>
            VITE_FIREBASE_APP_ID<br/>
            VITE_FIREBASE_MEASUREMENT_ID
          </div>
        </div>
      </div>
    );
  }

  const value = {
    currentUser,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
