'use client'

import { useState } from 'react'
import Navbar from '@/app/components/Navbar'
import MatchResultsTab from './_components/MatchResultsTab'
import UsersTab from './_components/UsersTab'
import GroupsTab from './_components/GroupsTab'
import ScoringRulesTab from './_components/ScoringRulesTab'
import GoldenBootTab from './_components/GoldenBootTab'

type Tab = 'matches' | 'users' | 'groups' | 'scoring' | 'golden_boot'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('matches')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'matches', label: 'Match Results' },
    { key: 'users', label: 'Users' },
    { key: 'groups', label: 'Groups' },
    { key: 'scoring', label: 'Scoring Rules' },
    { key: 'golden_boot', label: 'Golden Boot' },
  ]

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
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2 text-sm font-medium rounded-lg transition ${
                activeTab === tab.key
                  ? 'bg-black text-white'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'matches' && <MatchResultsTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'groups' && <GroupsTab />}
        {activeTab === 'scoring' && <ScoringRulesTab />}
        {activeTab === 'golden_boot' && <GoldenBootTab />}
      </main>
    </>
  )
}
