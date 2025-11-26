'use client'

import { useEffect, useState, useCallback } from 'react'
import { getUser, getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import LoginScreen from '@/components/auth/LoginScreen'
import Dashboard from '@/components/dashboard/Dashboard'
import type { User } from '@supabase/supabase-js'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const checkUser = useCallback(async () => {
    try {
      // Try to get session first (more reliable after OAuth callback)
      const session = await getSession()
      console.log('Session check:', session?.user?.email || 'No session')
      if (session?.user) {
        setUser(session.user)
        setIsLoading(false)
        return
      }
      
      // Fallback to getUser if session doesn't work
      const currentUser = await getUser()
      console.log('User check:', currentUser?.email || 'No user')
      setUser(currentUser)
    } catch (error) {
      console.error('Error checking user:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Check for auth success or error in URL
    const urlParams = new URLSearchParams(window.location.search)
    const authSuccess = urlParams.get('auth') === 'success'
    const error = urlParams.get('error')
    
    if (error) {
      console.error('Auth error:', error)
      let errorMessage = 'Erro na autenticação. '
      
      if (error === 'server_error' || error.includes('exchange')) {
        errorMessage += '\n\nO Supabase não conseguiu trocar o código OAuth pelo token.\n\n'
        errorMessage += 'Verifique no painel do Supabase:\n'
        errorMessage += '1. Authentication > Providers > Google\n'
        errorMessage += '2. Certifique-se de que o Client ID e Client Secret estão CORRETOS\n'
        errorMessage += '3. Verifique se o Google OAuth está ATIVADO\n'
        errorMessage += '4. A URL de callback no Supabase deve ser: ' + window.location.origin + '/auth/callback\n\n'
        errorMessage += 'No Google Console, certifique-se de que a URI de redirecionamento inclui:\n'
        errorMessage += 'https://nguggatugusoogcgjuop.supabase.co/auth/v1/callback'
      } else {
        errorMessage += error
      }
      
      alert(errorMessage)
      setIsLoading(false)
      window.history.replaceState({}, '', '/')
      return
    }
    
    if (authSuccess) {
      // Session was created on server, wait a bit then check
      console.log('Auth success, checking session...')
      setTimeout(() => {
        checkUser()
        window.history.replaceState({}, '', '/')
      }, 500)
    } else {
      checkUser()
    }
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email || 'No user')
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          console.log('User signed in:', session?.user?.email)
          setUser(session?.user ?? null)
          setIsLoading(false)
          // Clean URL if there's a code
          const urlParams = new URLSearchParams(window.location.search)
          if (urlParams.get('code')) {
            window.history.replaceState({}, '', '/')
          }
          router.refresh()
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setIsLoading(false)
        } else if (event === 'INITIAL_SESSION') {
          // Handle initial session check
          if (session?.user) {
            console.log('Initial session found:', session.user.email)
            setUser(session.user)
            setIsLoading(false)
          } else {
            console.log('No initial session, checking again...')
            // If no session on initial load, check again after a delay
            setTimeout(() => checkUser(), 1000)
          }
        } else {
          setUser(session?.user ?? null)
          setIsLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [checkUser, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Carregando...</div>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  return <Dashboard user={user} />
}
