'use client'

import Link from 'next/link'

type NavbarProps = {
  email?: string
}

export default function Navbar({ email }: NavbarProps) {
  return (
    <nav className="border-b p-4">
      <div className="max-w-5xl mx-auto flex justify-between items-center">
        <div className="font-bold text-xl">
          ⚽ World Cup Predictor
        </div>

        <div className="flex gap-4 items-center">
          <Link
            href="/"
            className="hover:underline"
          >
            Home
          </Link>

          <Link
            href="/matches"
            className="hover:underline"
          >
            Matches
          </Link>

          {email && (
            <span className="text-sm text-gray-500">
              {email}
            </span>
          )}
        </div>
      </div>
    </nav>
  )
}