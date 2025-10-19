import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  userRole: string | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // 🔸 Fetch role from user_roles table
  const fetchUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single()

    if (!error && data) {
      setUserRole(data.role)
    } else {
      console.warn('Role fetch error:', error?.message)
      setUserRole(null)
    }
  }

  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      const { data } = await supabase.auth.getSession()
      const session = data.session

      if (!mounted) return

      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) await fetchUserRole(session.user.id)
      setLoading(false)
    }

    initAuth()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchUserRole(session.user.id)
      else setUserRole(null)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  // ✅ Safe sign out that doesn’t break persistence in other tabs
  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setUserRole(null)
      setSession(null)
      window.location.href = '/'
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, userRole, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
