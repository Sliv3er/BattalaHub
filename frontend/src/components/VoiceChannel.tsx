import { useEffect, useState, useRef } from 'react'
import {
  MicrophoneIcon,
  SpeakerXMarkIcon,
  PhoneXMarkIcon,
  ComputerDesktopIcon,
  SignalIcon,
} from '@heroicons/react/24/solid'
import { MicrophoneIcon as MicOff } from '@heroicons/react/24/outline'
import { clsx } from 'clsx'
import { useVoiceStore } from '../stores/voiceStore'
import client from '../api/client'
import toast from 'react-hot-toast'
import { hasPermission } from '../utils/permissions'

interface VoiceChannelProps {
  channelId: string
  channelName?: string
  serverId?: string
  myRoles?: any[]
}

const VoiceChannel = ({ channelId, channelName, serverId, myRoles = [] }: VoiceChannelProps) => {
  const {
    currentChannelId, connectedUsers, isMuted, isDeafened, isScreenSharing,
    pingMs, connectionQuality, joinVoice, leaveVoice, toggleMute, toggleDeafen, toggleScreenShare,
    screenStream, userVolumes, setUserVolume, isSpeaking, speakingUsers,
  } = useVoiceStore()

  const [contextUser, setContextUser] = useState<string | null>(null)
  const [contextPos, setContextPos] = useState({ x: 0, y: 0 })
  const contextRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (contextRef.current && !contextRef.current.contains(e.target as Node)) setContextUser(null)
    }
    if (contextUser) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [contextUser])

  const handleUserClick = (userId: string, e: React.MouseEvent) => {
    e.preventDefault()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setContextPos({ x: rect.right + 8, y: rect.top })
    setContextUser(userId)
  }

  const handleModAction = async (action: string, userId: string) => {
    if (!serverId) return
    try {
      await client.post(`/moderation/${serverId}/${action}/${userId}`)
      toast.success(`${action} successful`)
    } catch { toast.error(`Failed to ${action}`) }
    setContextUser(null)
  }

  const isConnected = currentChannelId === channelId

  useEffect(() => {
    if (isConnected) {
      // Fetch current users
      client.get(`/voice/channels/${channelId}/users`).then(r => {
        const users = r.data.map((s: any) => s.user || s)
        useVoiceStore.setState({ connectedUsers: users })
      }).catch(() => {})
    }
  }, [channelId, isConnected])

  const qualityColor = connectionQuality === 'good' ? 'text-green-400' : connectionQuality === 'medium' ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="flex-1 flex flex-col bg-dark-400">
      {/* Header */}
      <div className="h-12 border-b border-dark-100 flex items-center px-4 bg-dark-400/80 backdrop-blur-sm flex-shrink-0">
        <SignalIcon className="w-5 h-5 text-gray-400 mr-2" />
        <span className="font-semibold text-white">{channelName || 'Voice Channel'}</span>
        {isConnected && pingMs != null && (
          <span className={clsx('ml-3 text-xs font-mono', qualityColor)}>{pingMs}ms</span>
        )}
      </div>

      {/* Users in voice */}
      <div className="flex-1 overflow-y-auto p-6">
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <SignalIcon className="w-16 h-16 mb-4 text-gray-600" />
            <h2 className="text-xl font-bold mb-2 text-white">Voice Channel</h2>
            <p className="mb-6">Click to join this voice channel</p>
            <button onClick={() => joinVoice(channelId)}
              className="btn-primary px-6 py-3 rounded-xl font-semibold text-lg">
              Join Voice
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {connectedUsers.length === 0 && (
              <p className="text-gray-500 text-center mt-8">No other users in this channel</p>
            )}
            {connectedUsers.map(user => {
              const isUserSpeaking = speakingUsers.has(user.id)
              return (
                <div key={user.id} onClick={(e) => handleUserClick(user.id, e)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-dark-300/50 animate-fadeIn cursor-pointer hover:bg-dark-300/80 transition-colors">
                  <div className={clsx(
                    'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0 transition-all duration-150',
                    isUserSpeaking ? 'ring-[3px] ring-green-500 bg-green-600' : 'bg-primary-600'
                  )}>
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                    ) : user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className={clsx('font-medium flex-1', isUserSpeaking ? 'text-green-400' : 'text-white')}>{user.displayName}</span>
                  {user.isScreenSharing && <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">LIVE</span>}
                  {user.isMuted && <MicOff className="w-4 h-4 text-red-400" />}
                  {user.isDeafened && <SpeakerXMarkIcon className="w-4 h-4 text-red-400" />}
                </div>
              )
            })}

            {/* User Context Menu */}
            {contextUser && (
              <div ref={contextRef} className="fixed z-50 bg-dark-300 rounded-xl shadow-2xl border border-dark-100 p-3 w-56 animate-scaleIn"
                style={{ left: Math.min(contextPos.x, window.innerWidth - 240), top: contextPos.y }}>
                <div className="text-xs text-gray-400 uppercase font-semibold mb-2">User Volume</div>
                <input type="range" min="0" max="200" value={(userVolumes[contextUser] ?? 1) * 100}
                  onChange={e => setUserVolume(contextUser, Number(e.target.value) / 100)}
                  className="w-full accent-primary-500 mb-1" />
                <div className="text-xs text-gray-400 text-center mb-3">{Math.round((userVolumes[contextUser] ?? 1) * 100)}%</div>
                {hasPermission(myRoles, 'MUTE_MEMBERS') && (
                  <button onClick={() => handleModAction('mute', contextUser)}
                    className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-dark-100 rounded-lg transition-colors">
                    Server Mute
                  </button>
                )}
                {hasPermission(myRoles, 'DEAFEN_MEMBERS') && (
                  <button onClick={() => handleModAction('deafen', contextUser)}
                    className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-dark-100 rounded-lg transition-colors">
                    Server Deafen
                  </button>
                )}
                {hasPermission(myRoles, 'MOVE_MEMBERS') && (
                  <button onClick={() => handleModAction('disconnect', contextUser)}
                    className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-dark-100 rounded-lg transition-colors">
                    Disconnect
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Screen Share Preview */}
      {isConnected && isScreenSharing && screenStream && screenStream.getVideoTracks().length > 0 && (
        <div className="mx-6 mb-4 rounded-xl overflow-hidden border border-dark-100 bg-black">
          <div className="text-xs text-green-400 px-3 py-1 bg-dark-300/80">Screen Preview</div>
          <video ref={el => { if (el && screenStream) { el.srcObject = new MediaStream(screenStream.getVideoTracks()); el.play().catch(() => {}) }}}
            autoPlay muted className="w-full max-h-48 object-contain" />
        </div>
      )}

      {/* Controls */}
      {isConnected && (
        <div className="p-4 border-t border-dark-100 bg-dark-300/50">
          <div className="flex items-center justify-center gap-3">
            <button onClick={toggleMute}
              className={clsx('p-3 rounded-full transition-colors', isMuted ? 'bg-red-500/20 text-red-400' : 'bg-dark-200 text-gray-300 hover:text-white hover:bg-dark-100')}>
              {isMuted ? <MicOff className="w-6 h-6" /> : <MicrophoneIcon className="w-6 h-6" />}
            </button>
            <button onClick={toggleDeafen}
              className={clsx('p-3 rounded-full transition-colors', isDeafened ? 'bg-red-500/20 text-red-400' : 'bg-dark-200 text-gray-300 hover:text-white hover:bg-dark-100')}>
              <SpeakerXMarkIcon className="w-6 h-6" />
            </button>
            <button onClick={toggleScreenShare}
              className={clsx('p-3 rounded-full transition-colors', isScreenSharing ? 'bg-green-500/20 text-green-400' : 'bg-dark-200 text-gray-300 hover:text-white hover:bg-dark-100')}>
              <ComputerDesktopIcon className="w-6 h-6" />
            </button>
            <button onClick={leaveVoice}
              className="p-3 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors">
              <PhoneXMarkIcon className="w-6 h-6" />
            </button>
          </div>
          {pingMs != null && (
            <div className="text-center mt-2">
              <span className={clsx('text-xs font-mono', qualityColor)}>
                {connectionQuality === 'good' ? '●' : connectionQuality === 'medium' ? '●' : '●'} {pingMs}ms
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default VoiceChannel
