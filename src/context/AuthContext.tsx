import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signInWithCredential,
  GoogleAuthProvider,
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

  // Build instant client-side UserProfile directly from Firebase Auth user
  const buildUserProfileFromAuth = (fbUser: FirebaseUser): UserProfile => {
    const isSuperAdmin = fbUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
    const now = Date.now();
    return {
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
  };

  // Background non-blocking profile enrichment from Firestore
  const enrichProfileFromFirestore = async (fbUser: FirebaseUser): Promise<void> => {
    if (isRecentQuotaExceeded()) {
      return;
    }

    const isSuperAdmin = fbUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
    const userRef = doc(db, 'users', fbUser.uid);

    try {
      // 4-second safety timeout so background sync never hangs
      const userDocPromise = getDoc(userRef);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore profile fetch timeout')), 4000)
      );

      const userDoc = await Promise.race([userDocPromise, timeoutPromise]);

      if (userDoc && userDoc.exists()) {
        const cloudData = userDoc.data() as UserProfile;
        const role = isSuperAdmin ? 'admin' : (cloudData.role || 'player');

        setUser(prev => {
          if (!prev || prev.uid !== fbUser.uid) return prev;
          return {
            ...prev,
            ...cloudData,
            displayName: fbUser.displayName || cloudData.displayName || prev.displayName,
            photoURL: fbUser.photoURL || cloudData.photoURL || prev.photoURL,
            role,
          };
        });
      } else {
        // First-time cloud registration (non-blocking)
        const initialProfile = buildUserProfileFromAuth(fbUser);
        setDoc(userRef, initialProfile).catch((err) => {
          if (isQuotaExceededError(err)) markQuotaExceeded();
        });
      }

      // Non-blocking presence update
      updateDoc(userRef, {
        isOnline: true,
        lastLoginAt: Date.now(),
        lastSeenAt: Date.now(),
      }).catch((err) => {
        if (isQuotaExceededError(err)) markQuotaExceeded();
      });
    } catch (err: any) {
      if (isQuotaExceededError(err)) {
        markQuotaExceeded();
      }
      console.warn('[AuthContext] Background Firestore enrichment notice (non-fatal):', err?.message || err);
    }
  };

  // Listen to Auth State - completely independent from Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        // Authenticate immediately via Firebase Auth without waiting for Firestore
        const immediateProfile = buildUserProfileFromAuth(fbUser);
        setUser(prev => {
          if (prev && prev.uid === fbUser.uid) {
            return {
              ...immediateProfile,
              ...prev,
              displayName: fbUser.displayName || prev.displayName,
              photoURL: fbUser.photoURL || prev.photoURL,
            };
          }
          return immediateProfile;
        });
        setIsGuest(false);
        try {
          localStorage.removeItem(GUEST_FLAG_KEY);
        } catch {}
        setLoading(false);

        // Enrich in background without blocking Auth state or UI
        enrichProfileFromFirestore(fbUser).catch(() => {});
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Eco-mode: No periodic interval heartbeat to conserve Firestore Spark tier writes.

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      setError(null);
      setLoading(true);
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      
      // Immediately set user from Auth credentials
      const immediateProfile = buildUserProfileFromAuth(cred.user);
      setUser(immediateProfile);
      setIsGuest(false);
      try {
        localStorage.removeItem(GUEST_FLAG_KEY);
      } catch {}
      setLoading(false);

      // Trigger background sync without awaiting
      enrichProfileFromFirestore(cred.user).catch(() => {});
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
      setLoading(false);
      throw err;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, displayName: string) => {
    try {
      setError(null);
      setLoading(true);
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const trimmedName = displayName.trim();
      if (trimmedName) {
        try {
          await updateProfile(cred.user, { displayName: trimmedName });
        } catch {
          // Non-fatal
        }
      }

      // Immediately set user from Auth credentials
      const immediateProfile = buildUserProfileFromAuth(cred.user);
      if (trimmedName) {
        immediateProfile.displayName = trimmedName;
      }
      setUser(immediateProfile);
      setIsGuest(false);
      try {
        localStorage.removeItem(GUEST_FLAG_KEY);
      } catch {}
      setLoading(false);

      // Trigger background sync without awaiting
      enrichProfileFromFirestore(cred.user).catch(() => {});
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
      setLoading(false);
      throw err;
    }
  };

  const signInWithGoogle = async () => {
    try {
      setError(null);
      setLoading(true);

      let targetUser: FirebaseUser | null = null;

      // Web or standard Firebase pop-up
      const cred = await signInWithPopup(auth, googleProvider);
      targetUser = cred.user;

      if (targetUser) {
        // Immediately set user from Auth credentials
        const immediateProfile = buildUserProfileFromAuth(targetUser);
        setUser(immediateProfile);
        setIsGuest(false);
        try {
          localStorage.removeItem(GUEST_FLAG_KEY);
        } catch {}
        setLoading(false);

        // Trigger background sync without awaiting
        enrichProfileFromFirestore(targetUser).catch(() => {});
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Google sign in error:', err);
      let msg = err?.message || 'تعذر تسجيل الدخول بواسطة Google.';
      if (err.code === 'auth/popup-closed-by-user') {
        msg = 'تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.';
      } else if (err.code === 'auth/operation-not-allowed') {
        msg = 'طريقة الدخول عبر Google غير مفعّلة في لوحة Firebase Console. يرجى تفعيل موفر Google في مشروع Firebase.';
      } else if (err.code === 'auth/network-request-failed') {
        msg = 'تعذر الاتصال بالشبكة. يرجى التحقق من اتصال الإنترنت والمحاولة مجدداً.';
      }
      setError(msg);
      setLoading(false);
      throw err;
    }
  };

  const continueAsGuest = () => {
    setIsGuest(true);
    localStorage.setItem(GUEST_FLAG_KEY, 'true');
  };

  const logout = async () => {
    // Pure Auth logout - zero dependency or awaiting on Cloud Firestore
    try {
      setLoading(true);
      setUser(null);
      setIsGuest(false);
      try {
        localStorage.removeItem(GUEST_FLAG_KEY);
      } catch {}

      await firebaseSignOut(auth);
    } catch (err: any) {
      console.error('Logout notice:', err);
      setError(err.message || 'فشل في تسجيل الخروج.');
    } finally {
      setUser(null);
      setIsGuest(false);
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
