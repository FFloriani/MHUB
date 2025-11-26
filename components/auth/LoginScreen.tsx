'use client'

import { useState } from 'react'
import { signInWithGoogle } from '@/lib/auth'
import Button from '@/components/ui/Button'

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('Error signing in:', error)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">MHUB</h1>
          <p className="text-gray-600">Seu organizador pessoal híbrido</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Bem-vindo
          </h2>
          
          <Button
            variant="primary"
            size="lg"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Entrando...' : 'Entrar com Google'}
          </Button>
        </div>
      </div>
    </div>
  )
}

