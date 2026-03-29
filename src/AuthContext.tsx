import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { auth, db } from './firebase'
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth'
import type { User as FirebaseUser } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import type { User, UserRole } from './types/auth'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  updateUserRole: (uid: string, role: UserRole) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData = await loadUserData(firebaseUser)
        setUser(userData)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  async function loadUserData(firebaseUser: FirebaseUser): Promise<User> {
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
    
    if (userDoc.exists()) {
      const data = userDoc.data()
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: data.displayName || firebaseUser.email || '',
        role: data.role || 'viewer',
        createdAt: data.createdAt || new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      }
    } else {
      const newUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.email || '',
        role: 'viewer',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      }
      
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        displayName: newUser.displayName,
        role: newUser.role,
        createdAt: newUser.createdAt,
        lastLogin: newUser.lastLogin,
      })
      
      return newUser
    }
  }

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password)
  }

  async function signOut() {
    await firebaseSignOut(auth)
  }

  async function updateUserRole(uid: string, role: UserRole) {
    await setDoc(doc(db, 'users', uid), { role }, { merge: true })
    if (user && user.uid === uid) {
      setUser({ ...user, role })
    }
  }

  const value = {
    user,
    loading,
    signIn,
    signOut,
    updateUserRole,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
