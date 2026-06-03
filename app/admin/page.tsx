'use client'

import { useState } from 'react'
import Navbar from '@/app/components/Navbar'
import MatchResultsTab from './_components/MatchResultsTab'
import UsersTab from './_components/UsersTab'

type Tab = 'matches' | 'users'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('matches')

  return (
    <>
      <Navbar />
      <main className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-3xl md:text-4xl font-bold">Admin</h1>
          <span className="text-xs bg-purple-100 text-purple-700 font-semibold px-2.5 py-1 rounded-full">
            Admin
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-50 border rounded-xl p-1 mb-6 w-fit">
          <button
            onClick={() => setActiveTab('matches')}
            className={`px-5 py-2 text-sm font-medium rounded-lg transition ${
              activeTab === 'matches'
                ? 'bg-black text-white'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Match Results
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-5 py-2 text-sm font-medium rounded-lg transition ${
              activeTab === 'users'
                ? 'bg-black text-white'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Users
          </button>
        </div>

        {activeTab === 'matches' ? <MatchResultsTab /> : <UsersTab />}
      </main>
    </>
  )
}
