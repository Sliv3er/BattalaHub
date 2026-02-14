import { useState, useEffect, useRef } from 'react'
import { HashtagIcon, SpeakerWaveIcon, PlusIcon, XMarkIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import { clsx } from 'clsx'
import client from '../api/client'
import { useAuthStore } from '../stores/authStore'
import { useVoiceStore } from '../stores/voiceStore'
import ProfileSettings from './ProfileSettings'
import ServerSettings from './ServerSettings'
import AppSettings from './AppSettings'

interface Channel {
  id: string
  name: string
  type: 'TEXT' | 'VOICE'
}

interface VoiceUser {
  id: string
  displayName: string
  avatar?: string
  isMuted?: boolean
  isDeafened?: boolean
  isScreenSharing?: boolean
}

interface ChannelsSidebarProps {
  serverId: string | null
  selectedChannelId: string | null
  onSelectChannel: (channelId: string, type: 'TEXT' | 'VOICE', name: string) => void
}

const ChannelsSidebar = ({ serverId, selectedChannelId, onSelectChannel }: ChannelsSidebarProps) => {
  const [channels, setChannels] = useState<Channel[]>([])
  const [serverName, setServerName] = useState('')
  const [serverOwnerId, setServerOwnerId] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [newChannelType, setNewChannelType] = useState<'TEXT' | 'VOICE'>('TEXT')
  const [isCreating, setIsCreating] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showServerSettings, setShowServerSettings] = useState(false)
  const [showAppSettings, setShowAppSettings] = useState(false)
  const [voiceUsers, setVoiceUsers] = useState<Record<string, VoiceUser[]>>({})
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; channel: Channel } | null>(null)
  const [editModal, setEditModal] = useState<Channel | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<Channel | null>(null)
  const contextRef = useRef<HTMLDivElement>(null)
  const { user, logout } = useAuthStore()
  const { currentChannelId, connectedUsers, isSpeaking, speakingUsers } = useVoiceStore()

  useEffect(() => {
    if (serverId) fetchChannels()
  }, [serverId])

  // Fetch voice users for each voice channel
  useEffect(() => {
    const voiceChannels = channels.filter(c => c.type === 'VOICE')
    voiceChannels.forEach(ch => {
      client.get(`/voice/channels/${ch.id}/users`).then(r => {
        // API returns { user: { id, displayName, avatar, ... } } — flatten it
        const users = r.data.map((s: any) => s.user || s)
        setVoiceUsers(prev => ({ ...prev, [ch.id]: users }))
      }).catch(() => {})
    })
  }, [channels, currentChannelId, connectedUsers])

  // Close context menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (contextRef.current && !contextRef.current.contains(e.target as Node)) setContextMenu(null)
    }
    if (contextMenu) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [contextMenu])

  const fetchChannels = async () => {
    if (!serverId) return
    try {
      const [channelsResponse, serverResponse] = await Promise.all([
        client.get(`/channels/server/${serverId}`),
        client.get(`/servers/${serverId}`)
      ])
      setChannels(channelsResponse.data)
      setServerName(serverResponse.data.name)
      setServerOwnerId(serverResponse.data.ownerId)
      if (channelsResponse.data.length > 0 && !selectedChannelId) {
        const ch = channelsResponse.data[0]
        onSelectChannel(ch.id, ch.type, ch.name)
      }
    } catch (error) {
      console.error('Failed to fetch channels:', error)
    }
  }

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChannelName.trim() || !serverId) return
    setIsCreating(true)
    try {
      await client.post(`/channels/${serverId}`, { name: newChannelName.trim(), type: newChannelType })
      setNewChannelName('')
      setShowModal(false)
      await fetchChannels()
    } catch (error) {
      console.error('Failed to create channel:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const openCreateModal = (type: 'TEXT' | 'VOICE') => {
    setNewChannelType(type)
    setNewChannelName('')
    setShowModal(true)
  }

  const handleContextMenu = (e: React.MouseEvent, channel: Channel) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, channel })
  }

  const handleEditChannel = async () => {
    if (!editModal || !editName.trim()) return
    try {
      await client.patch(`/channels/${editModal.id}`, { name: editName.trim() })
      setEditModal(null)
      await fetchChannels()
    } catch (error) {
      console.error('Failed to edit channel:', error)
    }
  }

  const handleDeleteChannel = async () => {
    if (!deleteConfirm) return
    try {
      await client.delete(`/channels/${deleteConfirm.id}`)
      setDeleteConfirm(null)
      await fetchChannels()
    } catch (error) {
      console.error('Failed to delete channel:', error)
    }
  }

  if (!serverId) {
    return (
      <div className="sidebar h-full bg-dark-200">
        <div className="p-4 text-center text-gray-400">Select a server to view channels</div>
      </div>
    )
  }

  const isOwner = user?.id === serverOwnerId

  return (
    <div className="sidebar h-full bg-dark-200">
      {/* Server Header */}
      <div className="p-4 border-b border-dark-100 flex items-center justify-between group">
        <h2 className="font-bold text-white truncate flex-1">{serverName}</h2>
        {isOwner && (
          <button onClick={() => setShowServerSettings(true)}
            className="text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
            <Cog6ToothIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Text Channels</div>
            <button onClick={() => openCreateModal('TEXT')} className="text-gray-400 hover:text-white transition-colors" title="Create Text Channel">
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>
          {channels.filter(c => c.type === 'TEXT').map(channel => (
            <button key={channel.id}
              onClick={() => onSelectChannel(channel.id, 'TEXT', channel.name)}
              onContextMenu={e => handleContextMenu(e, channel)}
              className={clsx('channel-item', selectedChannelId === channel.id && 'active')}>
              <HashtagIcon className="w-5 h-5 mr-2" /><span>{channel.name}</span>
            </button>
          ))}

          <div className="flex items-center justify-between mb-2 mt-6">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Voice Channels</div>
            <button onClick={() => openCreateModal('VOICE')} className="text-gray-400 hover:text-white transition-colors" title="Create Voice Channel">
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>
          {channels.filter(c => c.type === 'VOICE').map(channel => (
            <div key={channel.id}>
              <button
                onClick={() => onSelectChannel(channel.id, 'VOICE', channel.name)}
                onContextMenu={e => handleContextMenu(e, channel)}
                className={clsx('channel-item', selectedChannelId === channel.id && 'active')}>
                <SpeakerWaveIcon className="w-5 h-5 mr-2" /><span>{channel.name}</span>
              </button>
              {/* Voice users under channel */}
              {(voiceUsers[channel.id] || []).map(vu => {
                const isUserSpeaking = speakingUsers.has(vu.id) || (vu.id === user?.id && isSpeaking)
                return (
                  <div key={vu.id} className="flex items-center gap-2 pl-9 py-1 text-xs text-gray-400">
                    <div className={clsx(
                      'w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold overflow-hidden flex-shrink-0 transition-all duration-150',
                      isUserSpeaking ? 'ring-2 ring-green-500 bg-green-600' : 'bg-primary-600'
                    )}>
                      {vu.avatar ? <img src={vu.avatar} alt="" className="w-full h-full object-cover" /> : vu.displayName?.charAt(0).toUpperCase()}
                    </div>
                    <span className={clsx('truncate', isUserSpeaking && 'text-green-400')}>{vu.displayName}</span>
                    {vu.isScreenSharing && <span className="text-[9px] font-bold text-green-400 bg-green-400/10 px-1 rounded">LIVE</span>}
                    {vu.isMuted && <span className="text-red-400 text-[10px]">🔇</span>}
                    {vu.isDeafened && <span className="text-red-400 text-[10px]">🔈</span>}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* User Area */}
      <div className="p-3 border-t border-dark-100 bg-dark-300/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-bold overflow-hidden flex-shrink-0">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              user?.displayName?.charAt(0).toUpperCase() || '?'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{user?.displayName}</div>
            <div className="text-xs text-gray-400 truncate">@{user?.username}</div>
          </div>
          <button onClick={() => setShowAppSettings(true)} className="text-gray-400 hover:text-white transition-colors p-1" title="App Settings">
            <Cog6ToothIcon className="w-5 h-5" />
          </button>
          <button onClick={() => setShowProfile(true)} className="text-gray-400 hover:text-white transition-colors p-1" title="Profile Settings">
            <Cog6ToothIcon className="w-5 h-5" />
          </button>
          <button onClick={logout} className="text-gray-400 hover:text-red-400 transition-colors p-1" title="Sign Out">
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div ref={contextRef} className="fixed bg-dark-300 rounded-lg shadow-2xl border border-dark-100 py-1 z-50 animate-scaleIn min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}>
          <button onClick={() => { setEditName(contextMenu.channel.name); setEditModal(contextMenu.channel); setContextMenu(null) }}
            className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-dark-200 hover:text-white">Edit Channel</button>
          <button onClick={() => { setDeleteConfirm(contextMenu.channel); setContextMenu(null) }}
            className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-dark-200 hover:text-red-300">Delete Channel</button>
        </div>
      )}

      {/* Edit Channel Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-300 rounded-lg p-6 w-80 animate-scaleIn">
            <h3 className="text-white font-bold mb-4">Edit Channel</h3>
            <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
              className="w-full input mb-4" autoFocus onKeyDown={e => e.key === 'Enter' && handleEditChannel()} />
            <div className="flex justify-end space-x-2">
              <button onClick={() => setEditModal(null)} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
              <button onClick={handleEditChannel} className="btn-primary px-4 py-2">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-300 rounded-lg p-6 w-80 animate-scaleIn">
            <h3 className="text-white font-bold mb-2">Delete Channel</h3>
            <p className="text-gray-400 mb-4">Are you sure you want to delete <strong className="text-white">#{deleteConfirm.name}</strong>? This cannot be undone.</p>
            <div className="flex justify-end space-x-2">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
              <button onClick={handleDeleteChannel} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showProfile && <ProfileSettings onClose={() => setShowProfile(false)} />}
      {showServerSettings && serverId && (
        <ServerSettings serverId={serverId} onClose={() => setShowServerSettings(false)} onUpdated={fetchChannels} />
      )}
      {showAppSettings && <AppSettings onClose={() => setShowAppSettings(false)} />}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-300 rounded-lg p-6 w-80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">Create {newChannelType === 'TEXT' ? 'Text' : 'Voice'} Channel</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateChannel}>
              <input type="text" value={newChannelName} onChange={e => setNewChannelName(e.target.value)}
                placeholder="Channel name" className="w-full input mb-4" autoFocus maxLength={100} />
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={!newChannelName.trim() || isCreating} className="btn-primary px-4 py-2 disabled:opacity-50">
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChannelsSidebar
