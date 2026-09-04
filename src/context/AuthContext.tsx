import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  User as FirebaseUser,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';
import { UserProfile, AuthState } from '../types/auth';
import { isUserSuperAdmin, SUPER_ADMIN_EMAIL } from '../services/adminService';
import { isQuotaExceededError, markQuotaExceeded, isRecentQuotaExceeded } from '../utils/firestoreErrorHelper';

const LOCAL_STORAGE_CAREER_KEY = 'anta_elmodareb_save_v1';
const GUEST_FLAG_KEY = 'anta_elmodareb_guest_mode';

interface AuthContextType extends AuthState {
  isAdmin: boolean;
  hasExistingLocalCareer: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  continueAsGuest: () => void;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    return localStorage.getItem(GUEST_FLAG_KEY) === 'true';
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hasExistingLocalCareer, setHasExistingLocalCareer] = useState<boolean>(false);

  // Check local career presence
  useEffect(() => {
    try {
      const localData = localStorage.getItem(LOCAL_STORAGE_CAREER_KEY);
      if (localData) {
        setHasExistingLocalCareer(true);
      }
    } catch {
      // ignore
    }
  }, []);

  // Sync or create user profile in Firestore
  const fetchOrCreateUserProfile = async (fbUser: FirebaseUser): Promise<UserProfile> => {
    const isSuperAdmin = fbUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
    const now = Date.now();

    const fallbackProfile: UserProfile = {
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: fbUser.displayName || 'مدرب الفريق',
      role: isSuperAdmin ? 'admin' : 'player',
      createdAt: now,
      lastLoginAt: now,
      status: 'active',
      isPremium: false,
      premiumExpiresAt: null,
      photoURL: fbUser.photoURL || null,
      hasCloudSave: false
    };

    if (isRecentQuotaExceeded()) {
      return fallbackProfile;
    }

    const userRef = doc(db, 'users', fbUser.uid);

    try {
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const data = userDoc.data() as UserProfile;
        const role = isSuperAdmin ? 'admin' : (data.role || 'player');

        return {
          ...data,
          displayName: fbUser.displayName || data.displayName || 'مدرب الفريق',
          photoURL: fbUser.photoURL || data.photoURL || null,
          role
        };
      } else {
        // First-time user profile creation
        try {
          await setDoc(userRef, fallbackProfile);
        } catch (setErr) {
          if (isQuotaExceededError(setErr)) {
            markQuotaExceeded();
          }
        }
        return fallbackProfile;
      }
    } catch (firestoreErr: any) {
      if (isQuotaExceededError(firestoreErr)) {
        markQuotaExceeded();
      }
      return fallbackProfile;
    }
  };

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      if (fbUser) {
        try {
          const profile = await fetchOrCreateUserProfile(fbUser);
          setUser(profile);
          setIsGuest(false);
          localStorage.removeItem(GUEST_FLAG_KEY);
          
          // Update online status in Firestore
          try {
            const userDocRef = doc(db, 'users', fbUser.uid);
            await updateDoc(userDocRef, {
              isOnline: true,
              lastLoginAt: Date.now(),
              lastSeenAt: Date.now()
            });
          } catch {}
        } catch (err: any) {
          console.error('Error in auth state change:', err);
          const isSuperAdmin = fbUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
          setUser({
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName || 'مدرب الفريق',
            role: isSuperAdmin ? 'admin' : 'player',
            createdAt: Date.now(),
            lastLoginAt: Date.now(),
            status: 'active',
            isPremium: false,
            premiumExpiresAt: null,
            photoURL: fbUser.photoURL || null,
            hasCloudSave: false
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Eco-mode: No periodic interval heartbeat to conserve Firestore Spark tier writes.
  // Last seen timestamp is updated once on login or milestone sync.

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      setError(null);
      setLoading(true);
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const profile = await fetchOrCreateUserProfile(cred.user);
      setUser(profile);
      setIsGuest(false);
      localStorage.removeItem(GUEST_FLAG_KEY);
    } catch (err: any) {
      console.error('Sign in error:', err);
      let msg = 'حدث خطأ أثناء تسجيل الدخول.';
      if (err.code === 'auth/operation-not-allowed') {
        msg = 'تسجيل الدخول بالبريد الإلكتروني غير مفعّل في لوحة Firebase Console. يرجى تفعيله من قسم Authentication -> Sign-in method أو استخدام Google أو وضع الضيف.';
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'صيغة البريد الإلكتروني غير صحيحة.';
      }
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, pass: string, displayName: string) => {
    try {
      setError(null);
      setLoading(true);
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      if (displayName.trim()) {
        try {
          await updateProfile(cred.user, { displayName: displayName.trim() });
        } catch {
          // ignore
        }
      }
      const profile = await fetchOrCreateUserProfile(cred.user);
      setUser(profile);
      setIsGuest(false);
      localStorage.removeItem(GUEST_FLAG_KEY);
    } catch (err: any) {
      console.error('Sign up error:', err);
      let msg = 'حدث خطأ أثناء إنشاء الحساب.';
      if (err.code === 'auth/operation-not-allowed') {
        msg = 'طريقة التسجيل بالبريد وكلمة المرور غير مفعّلة في لوحة Firebase Console. يرجى تفعيل (Email/Password) من لوحة التحكم، أو المتابعة باستخدام Google أو وضع الضيف.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'كلمة المرور ضعيفة جداً. يجب أن تحتوي على 6 أحرف على الأقل.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'صيغة البريد الإلكتروني غير صحيحة.';
      }
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setError(null);
      setLoading(true);
      const cred = await signInWithPopup(auth, googleProvider);
      const profile = await fetchOrCreateUserProfile(cred.user);
      setUser(profile);
      setIsGuest(false);
      localStorage.removeItem(GUEST_FLAG_KEY);
    } catch (err: any) {
      console.error('Google sign in error:', err);
      let msg = 'تعذر تسجيل الدخول بواسطة Google.';
      if (err.code === 'auth/popup-closed-by-user') {
        msg = 'تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.';
      } else if (err.code === 'auth/operation-not-allowed') {
        msg = 'طريقة الدخول عبر Google غير مفعّلة في لوحة Firebase Console. يرجى تفعيل موفر Google في مشروع Firebase.';
      }
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const continueAsGuest = () => {
    setIsGuest(true);
    localStorage.setItem(GUEST_FLAG_KEY, 'true');
  };

  const logout = async () => {
    try {
      setLoading(true);
      await firebaseSignOut(auth);
      setUser(null);
      setIsGuest(false);
      localStorage.removeItem(GUEST_FLAG_KEY);
    } catch (err: any) {
      console.error('Logout error:', err);
      setError(err.message || 'فشل في تسجيل الخروج.');
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  const isAdmin = isUserSuperAdmin(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        isGuest,
        loading,
        error,
        hasExistingLocalCareer,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        continueAsGuest,
        logout,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
