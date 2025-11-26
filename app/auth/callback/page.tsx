'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const error = searchParams.get('error')

      if (error) {
        console.error('OAuth error from Supabase:', error)
        console.error('Full URL:', window.location.href)
        router.push(`/?error=${error}`)
        return
      }

      if (code) {
        console.log('OAuth code received, exchanging for session...')
        try {
          // Exchange code for session
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          
          if (exchangeError) {
            console.error('Error exchanging code:', exchangeError)
            console.error('Error details:', JSON.stringify(exchangeError, null, 2))
            router.push(`/?error=exchange_failed&details=${encodeURIComponent(exchangeError.message)}`)
            return
          }

          if (data.session) {
            console.log('Session created successfully:', data.session.user.email)
            // Redirect to home - session is now saved
            router.push('/?auth=success')
          } else {
            console.error('No session after exchange')
            router.push('/?error=no_session')
          }
        } catch (err) {
          console.error('Unexpected error:', err)
          router.push('/?error=unexpected')
        }
      } else {
        console.error('No code in URL')
        router.push('/?error=no_code')
      }
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-500">Processando autenticação...</div>
    </div>
  )
}

