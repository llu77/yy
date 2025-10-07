
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signInWithEmailAndPassword, 
  signOut, 
  setPersistence, 
  browserSessionPersistence, 
  type AuthError
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { initialUsers } from '@/app/(app)/layout';
import type { User as AppUser, Role, Branch } from '@/app/(app)/layout';
import { logger, SecurityEventType } from '@/lib/logger';
import { validateRequest, loginSchema, ValidationError } from '@/lib/validation';

// Demo mode flag
const DEMO_MODE = !auth || !db;

interface UserData extends AppUser {
  uid: string;
  createdAt?: Timestamp;
  lastLogin?: Timestamp;
  isActive?: boolean;
}

interface AuthContextType {
  user: User | null;
  userDetails: UserData | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const fetchUserDetails = useCallback(async (firebaseUser: User): Promise<UserData | null> => {
    try {
      // First try to fetch from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserData;
        logger.info('User details fetched from Firestore', { userId: firebaseUser.uid });
        
        // Update last login
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          lastLogin: serverTimestamp()
        }, { merge: true });
        
        return {
          ...userData,
          uid: firebaseUser.uid
        };
      }
      
      // Fallback to mock data if Firestore fails
      logger.warn('Falling back to mock user data', { email: firebaseUser.email });
      const mockUserData = initialUsers.find(u => u.email.toLowerCase() === firebaseUser.email?.toLowerCase());
      
      if (mockUserData) {
        // Create user document for first-time users
        const newUserData: UserData = {
          ...mockUserData,
          uid: firebaseUser.uid,
          isActive: true,
          createdAt: Timestamp.now(),
          lastLogin: Timestamp.now()
        };
        
        try {
          await setDoc(doc(db, 'users', firebaseUser.uid), newUserData);
          logger.info('Created new user document', { userId: firebaseUser.uid });
        } catch (createError) {
          logger.error('Failed to create user document', { 
            userId: firebaseUser.uid,
            error: (createError as Error).message 
          });
        }
        
        return newUserData;
      }
      
      logger.error('User not found in system', { email: firebaseUser.email });
      setError("فشل العثور على بيانات المستخدم.");
      return null;
    } catch (error) {
      logger.error('Error fetching user details', { 
        userId: firebaseUser.uid,
        error: (error as Error).message 
      });
      
      // Fallback to mock data
      const mockUserData = initialUsers.find(u => u.email.toLowerCase() === firebaseUser.email?.toLowerCase());
      if (mockUserData) {
        return {
          ...mockUserData,
          uid: firebaseUser.uid,
          isActive: true,
        } as UserData;
      }
      
      setError("فشل العثور على بيانات المستخدم.");
      return null;
    }
  }, []);


  useEffect(() => {
    if (DEMO_MODE) {
      // In demo mode, check localStorage for logged in user
      const storedUser = localStorage.getItem('demoUser');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser({ uid: userData.uid, email: userData.email } as any);
        setUserDetails(userData);
      }
      setLoading(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setError(null);
      if (firebaseUser) {
        const details = await fetchUserDetails(firebaseUser);
        setUser(firebaseUser);
        setUserDetails(details);
      } else {
        setUser(null);
        setUserDetails(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchUserDetails]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    clearError();
    
    // Rate limiting check (imported from encryption.ts)
    const { checkRateLimit } = await import('@/lib/encryption');
    const rateLimitResult = checkRateLimit(email, 5, 15 * 60 * 1000);
    
    if (!rateLimitResult.allowed) {
      setError(`تم تجاوز عدد المحاولات المسموحة. يرجى المحاولة بعد ${rateLimitResult.blockedUntil?.toLocaleTimeString('ar-SA')}`);
      setLoading(false);
      return false;
    }
    
    // Log login attempt
    logger.security(SecurityEventType.LOGIN_ATTEMPT, { email });
    
    try {
      // Validate input
      const validatedData = validateRequest(loginSchema, { email, password });
      
      // Demo mode login
      if (DEMO_MODE) {
        const demoUser = initialUsers.find(u => u.email.toLowerCase() === validatedData.email.toLowerCase());
        if (demoUser && validatedData.password === "demo123") {
          const mockUserData: UserData = {
            ...demoUser,
            uid: demoUser.id,
            isActive: true,
          };
          
          // Store in localStorage
          localStorage.setItem('demoUser', JSON.stringify(mockUserData));
          
          setUser({ uid: demoUser.id, email: demoUser.email } as any);
          setUserDetails(mockUserData);
          
          logger.security(SecurityEventType.LOGIN_SUCCESS, {
            email: validatedData.email,
            userId: demoUser.id
          });
          
          setLoading(false);
          return true;
        } else {
          throw new Error("بيانات الدخول غير صحيحة");
        }
      }
      
      await setPersistence(auth, browserSessionPersistence);
      const userCredential = await signInWithEmailAndPassword(auth, validatedData.email, validatedData.password);
      
      // Log successful login
      logger.security(SecurityEventType.LOGIN_SUCCESS, {
        email: validatedData.email,
        userId: userCredential.user.uid
      });
      
      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        setError(error.errors[0]?.message || 'بيانات غير صالحة');
        logger.security(SecurityEventType.INVALID_INPUT, { 
          email,
          errors: error.errors 
        });
      } else {
        const authError = error as AuthError;
        logger.security(SecurityEventType.LOGIN_FAILURE, {
          email,
          errorCode: authError.code,
          errorMessage: authError.message
        }, authError.code === 'auth/too-many-requests' ? 'high' : 'medium');
        
        if (authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-credential') {
          setError("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
        } else if (authError.code === 'auth/too-many-requests') {
          setError("تم تجاوز عدد المحاولات المسموحة. يرجى المحاولة لاحقاً.");
        } else {
          setError("حدث خطأ غير متوقع أثناء تسجيل الدخول.");
        }
      }
      setLoading(false);
      return false;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      const userId = user?.uid;
      
      if (DEMO_MODE) {
        // Clear demo user from localStorage
        localStorage.removeItem('demoUser');
      } else {
        await signOut(auth);
      }
      
      setUser(null);
      setUserDetails(null);
      
      // Log logout event
      logger.security(SecurityEventType.LOGOUT, { userId });
    } catch (e) {
      logger.error("Logout Error", { error: (e as Error).message });
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const value = { user, userDetails, loading, error, login, logout, clearError };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
