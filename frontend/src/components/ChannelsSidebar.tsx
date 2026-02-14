import { useState, useEffect, useRef } from 'react'
import { HashtagIcon, SpeakerWaveIcon, PlusIcon, XMarkIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { MicrophoneIcon as MicSolid, SpeakerXMarkIcon as SpeakerSolid, PhoneXMarkIcon, ComputerDesktopIcon } from '@heroicons/react/24/solid'
import { clsx } from 'clsx'
import client from '../api/client'
import { useAuthStore } from '../stores/authStore'
import { useVoiceStore } from '../stores/voiceStore'
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
  const [showServerSettings, setShowServerSettings] = useState(false)
  const [showAppSettings, setShowAppSettings] = useState(false)
  const [voiceUsers, setVoiceUsers] = useState<Record<string, VoiceUser[]>>({})
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; channel: Channel } | null>(null)
  const [editModal, setEditModal] = useState<Channel | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<Channel | null>(null)
  const [sidebarVoicePopover, setSidebarVoicePopover] = useState<{ userId: string; displayName: string; x: number; y: number } | null>(null)
  const contextRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const { user, logout } = useAuthStore()
  const { currentChannelId, connectedUsers, isSpeaking, speakingUsers, isMuted, isDeafened, isScreenSharing, pingMs, connectionQuality, userVolumes } = useVoiceStore()

  useEffect(() => {
    if (serverId) fetchChannels()
  }, [serverId])

  // Fetch voice users for each voice channel
  useEffect(() => {
    const voiceChannels = channels.filter(c => c.type === 'VOICE')
    voiceChannels.forEach(ch => {
      client.get(`/voice/channels/${ch.id}/users`).then(r => {
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

  // Close voice popover on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setSidebarVoicePopover(null)
    }
    if (sidebarVoicePopover) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [sidebarVoicePopover])

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

  // Get current voice channel name
  const currentVoiceChannelName = channels.find(c => c.id === currentChannelId)?.name || ''

  if (!serverId) {
    return (
      <div className="sidebar h-full bg-dark-200">
        <div className="p-4 text-center text-gray-400">Select a server to view channels</div>
      </div>
    )
  }

  const isOwner = user?.id === serverOwnerId

  return (
    <div className="sidebar h-full bg-dark-200 flex flex-col">
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
              className={clsx('channel-item group', selectedChannelId === channel.id && 'active')}>
              <HashtagIcon className="w-5 h-5 mr-2" /><span className="truncate">{channel.name}</span>
              <div className="ml-auto hidden group-hover:flex items-center gap-1">
                <PencilIcon className="w-3.5 h-3.5 text-gray-400 hover:text-white" onClick={(e) => { e.stopPropagation(); setEditName(channel.name); setEditModal(channel) }} />
                <TrashIcon className="w-3.5 h-3.5 text-gray-400 hover:text-red-400" onClick={(e) => { e.stopPropagation(); setDeleteConfirm(channel) }} />
              </div>
            </button>
          ))}

          <div className="flex items-center justify-between mb-2 mt-6">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Voice Channels</div>
            <button onClick={() => openCreateModal('VOICE')} className="text-gray-400 hover:text-white transition-colors" title="Create Voice Channel">
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>
          {channels.filter(c => c.type === 'VOICE').map(channel => {
            const fetchedUsers = voiceUsers[channel.id] || []
            const mergedUsers = fetchedUsers.map(vu => {
              const storeUser = connectedUsers.find(u => u.id === vu.id)
              return { ...vu, isMuted: storeUser?.isMuted, isDeafened: storeUser?.isDeafened, isScreenSharing: storeUser?.isScreenSharing }
            })
            const channelVoiceUsers = currentChannelId === channel.id && user && !mergedUsers.some(u => u.id === user.id)
              ? [...mergedUsers, { id: user.id, displayName: user.displayName, avatar: user.avatar, isMuted, isDeafened, isScreenSharing }]
              : mergedUsers.map(vu => vu.id === user?.id ? { ...vu, isMuted, isDeafened, isScreenSharing } : vu)
            return (
            <div key={channel.id}>
              <button
                onClick={() => { onSelectChannel(channel.id, 'VOICE', channel.name); useVoiceStore.getState().joinVoice(channel.id) }}
                onContextMenu={e => handleContextMenu(e, channel)}
                className={clsx('channel-item group', selectedChannelId === channel.id && 'active')}>
                <SpeakerWaveIcon className="w-5 h-5 mr-2" /><span className="truncate">{channel.name}</span>
                <div className="ml-auto hidden group-hover:flex items-center gap-1">
                  <PencilIcon className="w-3.5 h-3.5 text-gray-400 hover:text-white" onClick={(e) => { e.stopPropagation(); setEditName(channel.name); setEditModal(channel) }} />
                  <TrashIcon className="w-3.5 h-3.5 text-gray-400 hover:text-red-400" onClick={(e) => { e.stopPropagation(); setDeleteConfirm(channel) }} />
                </div>
              </button>
              {/* Voice users under channel */}
              {channelVoiceUsers.map(vu => {
                const isUserSpeaking = speakingUsers.has(vu.id) || (vu.id === user?.id && isSpeaking)
                return (
                  <div key={vu.id}
                    onClick={(e) => setSidebarVoicePopover({ userId: vu.id, displayName: vu.displayName, x: e.clientX, y: e.clientY })}
                    className="flex items-center gap-2 pl-9 py-1 text-xs text-gray-400 cursor-pointer hover:bg-dark-100/50 rounded">
                    <div className={clsx(
                      'w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold overflow-hidden flex-shrink-0 transition-all duration-150',
                      isUserSpeaking ? 'ring-2 ring-green-500 bg-green-600' : 'bg-primary-600'
                    )}>
                      {vu.avatar ? <img src={vu.avatar} alt="" className="w-full h-full object-cover" /> : vu.displayName?.charAt(0).toUpperCase()}
                    </div>
                    <span className={clsx('truncate', isUserSpeaking && 'text-green-400')}>{vu.displayName}</span>
                    {vu.isScreenSharing && <span className="text-[9px] font-bold text-green-400 bg-green-400/10 px-1 rounded">LIVE</span>}
                    {vu.isMuted && <MicSolid className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                    {vu.isDeafened && <SpeakerSolid className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                  </div>
                )
              })}
            </div>
            )
          })}
        </div>
      </div>

      {/* Voice Connection Info Panel */}
      {currentChannelId && (
        <div className="px-3 py-2 border-t border-dark-100 bg-dark-300/80">
          <div className="flex items-center justify-between">
            <div className="relative group/stats">
              <div className="flex items-center gap-1.5">
                <div className={clsx('w-2 h-2 rounded-full', connectionQuality === 'good' ? 'bg-green-500' : connectionQuality === 'medium' ? 'bg-yellow-500' : 'bg-red-500')} />
                <span className={clsx('text-xs font-semibold', connectionQuality === 'good' ? 'text-green-400' : connectionQuality === 'medium' ? 'text-yellow-400' : 'text-red-400')}>
                  Voice Connected
                </span>
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                {pingMs != null ? `${pingMs}ms` : '—'} • {currentVoiceChannelName}
              </div>
              {/* Hover tooltip */}
              <div className="absolute bottom-full left-0 mb-2 hidden group-hover/stats:block bg-dark-100 rounded-lg p-3 shadow-xl border border-dark-100 w-48 z-50">
                <div className="text-xs font-semibold text-white mb-2">Connection Info</div>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between"><span className="text-gray-400">Ping</span><span className="text-white">{pingMs != null ? `${pingMs}ms` : 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Quality</span><span className={clsx(connectionQuality === 'good' ? 'text-green-400' : connectionQuality === 'medium' ? 'text-yellow-400' : 'text-red-400')}>{connectionQuality === 'good' ? 'Good' : connectionQuality === 'medium' ? 'Medium' : 'Poor'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Protocol</span><span className="text-white">WebRTC</span></div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => useVoiceStore.getState().toggleMute()} className={clsx('p-1 rounded', isMuted ? 'text-red-400' : 'text-gray-400 hover:text-white')}>
                <MicSolid className="w-4 h-4" />
              </button>
              <button onClick={() => useVoiceStore.getState().toggleDeafen()} className={clsx('p-1 rounded', isDeafened ? 'text-red-400' : 'text-gray-400 hover:text-white')}>
                <SpeakerSolid className="w-4 h-4" />
              </button>
              <button onClick={() => useVoiceStore.getState().toggleScreenShare()} className={clsx('p-1 rounded', isScreenSharing ? 'text-green-400' : 'text-gray-400 hover:text-white')}>
                <ComputerDesktopIcon className="w-4 h-4" />
              </button>
              <button onClick={() => useVoiceStore.getState().leaveVoice()} className="p-1 rounded text-gray-400 hover:text-red-400">
                <PhoneXMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

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
          <button onClick={() => setShowAppSettings(true)} className="text-gray-400 hover:text-white transition-colors p-1" title="Settings">
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

      {/* Voice User Popover */}
      {sidebarVoicePopover && (
        <div ref={popoverRef} className="fixed bg-dark-300 rounded-lg shadow-2xl border border-dark-100 p-3 z-50 animate-scaleIn w-52"
          style={{ left: sidebarVoicePopover.x, top: sidebarVoicePopover.y - 80 }}>
          <div className="text-sm text-white font-medium mb-2">{sidebarVoicePopover.displayName}</div>
          <label className="text-xs text-gray-400 mb-1 block">Volume: {Math.round((userVolumes[sidebarVoicePopover.userId] ?? 1) * 100)}%</label>
          <input type="range" min="0" max="200" value={Math.round((userVolumes[sidebarVoicePopover.userId] ?? 1) * 100)}
            onChange={(e) => useVoiceStore.getState().setUserVolume(sidebarVoicePopover.userId, parseInt(e.target.value) / 100)}
            className="w-full accent-primary-500" />
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
