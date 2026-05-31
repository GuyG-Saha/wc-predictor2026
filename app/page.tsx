'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Navbar from '@/app/components/Navbar'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
      setLoading(false)
    }

    getUser()

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  const login = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google'
    })
  }

  const logout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </main>
    )
  }

  return (
    <>
    <Navbar email={user?.email} />
    <main className="min-h-screen flex items-center justify-center">
      {!user ? (
        <button
          onClick={login}
          className="border rounded px-6 py-3 text-lg hover:bg-gray-100"
        >
          Login with Google
        </button>
      ) : (
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">
            ⚽ World Cup Predictor
          </h1>

          <p className="text-gray-600">
            Welcome {user.email}
          </p>

          <Link
            href="/matches"
            className="inline-block border rounded px-6 py-3 hover:bg-gray-100"
          >
            View Matches
          </Link>

          <div>
            <button
              onClick={logout}
              className="border rounded px-4 py-2 hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </main>
    </>
  )
}