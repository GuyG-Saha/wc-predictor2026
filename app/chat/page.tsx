'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/app/components/Navbar'
import { formatDate, formatTime } from '@/lib/utils'
import { User } from '@supabase/supabase-js'

type Message = {
  id: string
  content: string
  created_at: string
  user_id: string
  users: {
    display_name: string
  }
}

type Group = {
  id: string
  name: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [groupsLoading, setGroupsLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Load user and their groups on mount
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setGroupsLoading(false); return }
      setUser(user)

      const { data } = await supabase
        .from('group_members')
        .select('group_id, groups(id, name)')
        .eq('user_id', user.id)

      if (data) {
        const userGroups = data
          .map((row: any) => row.groups)
          .filter(Boolean) as Group[]
        setGroups(userGroups)
        if (userGroups.length > 0) {
          setSelectedGroupId(userGroups[0].id)
        }
      }
      setGroupsLoading(false)
    }
    init()
  }, [])

  // Load messages and subscribe when selected group changes
  useEffect(() => {
    if (!selectedGroupId) return

    setLoading(true)
    setMessages([])

    // Unsubscribe from previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    // Load existing messages for this group
    const loadMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('id, content, created_at, user_id, users(display_name)')
        .eq('group_id', selectedGroupId)
        .order('created_at', { ascending: true })

      if (!error) setMessages((data as unknown as Message[]) || [])
      setLoading(false)
    }

    loadMessages()

    // Subscribe to new messages for this group only
    const channel = supabase
      .channel(`group-chat-${selectedGroupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${selectedGroupId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('messages')
            .select('id, content, created_at, user_id, users(display_name)')
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setMessages((prev) => [...prev, data as unknown as Message])
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedGroupId])

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !selectedGroupId || sending) return
    setSending(true)

    const { error } = await supabase
      .from('messages')
      .insert({
        group_id: selectedGroupId,
        user_id: user.id,
        content: newMessage.trim(),
      })

    if (!error) setNewMessage('')
    setSending(false)
    inputRef.current?.focus()
  }

  // Group messages by date for date separators
  const groupedMessages = messages.reduce<{ date: string; messages: Message[] }[]>(
    (acc, msg) => {
      const date = formatDate(msg.created_at)
      const last = acc[acc.length - 1]
      if (last && last.date === date) {
        last.messages.push(msg)
      } else {
        acc.push({ date, messages: [msg] })
      }
      return acc
    },
    []
  )

  const selectedGroup = groups.find((g) => g.id === selectedGroupId)

  return (
    <>
      <Navbar />
      <main className="flex flex-col h-[calc(100vh-57px)]">
        {/* Header */}
        <div className="border-b px-4 py-3 bg-white space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">💬</span>
            <h1 className="font-bold text-lg">
              {selectedGroup ? `${selectedGroup.name} Chat` : 'Chat'}
            </h1>
          </div>

          {/* Group tabs — only shown if user is in multiple groups */}
          {groups.length > 1 && (
            <div className="flex gap-1 bg-gray-50 border rounded-xl p-1">
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroupId(group.id)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${
                    selectedGroupId === group.id
                      ? 'bg-black text-white'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  {group.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {groupsLoading || loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              You are not in any group yet.
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              No messages yet. Say something! 👋
            </div>
          ) : (
            groupedMessages.map(({ date, messages: dayMessages }) => (
              <div key={date}>
                {/* Date separator */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs text-gray-400">{date}</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>

                <div className="space-y-3">
                  {dayMessages.map((msg) => {
                    const isOwn = msg.user_id === user?.id
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                      >
                        {!isOwn && (
                          <span className="text-xs text-gray-400 mb-1 ml-1">
                            {msg.users.display_name}
                          </span>
                        )}
                        <div
                          className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                            isOwn
                              ? 'bg-black text-white rounded-br-sm'
                              : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                          }`}
                        >
                          {msg.content}
                        </div>
                        <span className="text-xs text-gray-300 mt-1 mx-1">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {groups.length > 0 && (
          <div className="border-t p-3 bg-white flex gap-2 items-center">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message…"
              className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:border-gray-400"
            />
            <button
              onClick={handleSend}
              disabled={sending || !newMessage.trim()}
              className="w-9 h-9 bg-black text-white rounded-full flex items-center justify-center
                hover:bg-gray-800 transition disabled:opacity-40 text-lg"
            >
              ↑
            </button>
          </div>
        )}
      </main>
    </>
  )
}
