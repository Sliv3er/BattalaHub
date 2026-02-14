import { useState, useEffect, useRef } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { clsx } from 'clsx'
import { format } from 'date-fns'
import client from '../api/client'
import toast from 'react-hot-toast'
import { hasPermission } from '../utils/permissions'

interface Member {
  id: string
  joinedAt: string
  user: {
    id: string
    username: string
    displayName: string
    avatar?: string
    isOnline: boolean
    createdAt?: string
  }
  roles?: { role: { id: string; name: string; color: string } }[]
}

interface MembersListProps {
  channelId: string | null
  serverId?: string
  myRoles?: any[]
}

const MembersList = ({ channelId, serverId, myRoles = [] }: MembersListProps) => {
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [popoverPos, setPopoverPos] = useState({ top: 0 })
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (channelId) fetchMembers()
  }, [channelId])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setSelectedMember(null)
      }
    }
    if (selectedMember) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [selectedMember])

  const fetchMembers = async () => {
    if (!channelId) return
    setIsLoading(true)
    try {
      const response = await client.get(`/channels/${channelId}/members`)
      setMembers(response.data)
    } catch (error) {
      console.error('Failed to fetch members:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMemberClick = (member: Member, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPopoverPos({ top: rect.top })
    setSelectedMember(member)
  }

  const onlineMembers = members.filter(m => m.user.isOnline)
  const offlineMembers = members.filter(m => !m.user.isOnline)

  if (!channelId) {
    return (
      <div className="sidebar h-full bg-dark-200">
        <div className="p-4 text-center text-gray-400 text-sm">No channel selected</div>
      </div>
    )
  }

  return (
    <div className="sidebar h-full bg-dark-200 relative">
      <div className="p-4 border-b border-dark-100">
        <h3 className="font-semibold text-white text-sm">Members — {members.length}</h3>
      </div>

      {isLoading ? (
        <div className="p-4 text-center text-gray-400 text-sm">Loading...</div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {onlineMembers.length > 0 && (
            <div className="p-3">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Online — {onlineMembers.length}</div>
              <div className="space-y-1">
                {onlineMembers.map(m => <MemberItem key={m.id} member={m} onClick={handleMemberClick} />)}
              </div>
            </div>
          )}
          {offlineMembers.length > 0 && (
            <div className="p-3">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Offline — {offlineMembers.length}</div>
              <div className="space-y-1">
                {offlineMembers.map(m => <MemberItem key={m.id} member={m} onClick={handleMemberClick} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Profile Popover */}
      {selectedMember && (
        <div ref={popoverRef}
          className="absolute right-full mr-2 w-72 bg-dark-300 rounded-xl shadow-2xl border border-dark-100 overflow-hidden animate-scaleIn z-50"
          style={{ top: Math.min(popoverPos.top, window.innerHeight - 320) }}>
          {/* Banner */}
          <div className="h-16 bg-gradient-to-r from-primary-600 to-primary-800" />
          <div className="px-4 -mt-8">
            <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden ring-4 ring-dark-300">
              {selectedMember.user.avatar ? (
                <img src={selectedMember.user.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                selectedMember.user.displayName.charAt(0).toUpperCase()
              )}
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-white font-bold text-lg">{selectedMember.user.displayName}</h4>
              <span className={clsx('w-3 h-3 rounded-full', selectedMember.user.isOnline ? 'bg-green-500' : 'bg-gray-500')} />
            </div>
            <p className="text-gray-400 text-sm mb-3">@{selectedMember.user.username}</p>
            <div className="border-t border-dark-100 pt-3 space-y-2">
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase">Member Since</div>
                <div className="text-sm text-gray-200">{format(new Date(selectedMember.joinedAt), 'MMM d, yyyy')}</div>
              </div>
              {selectedMember.roles && selectedMember.roles.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase mb-1">Roles</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedMember.roles.map(r => (
                      <span key={r.role.id} className="px-2 py-0.5 rounded-full text-xs font-medium border" style={{ borderColor: r.role.color, color: r.role.color }}>
                        {r.role.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Moderation Actions */}
            {serverId && (hasPermission(myRoles, 'MUTE_MEMBERS') || hasPermission(myRoles, 'DEAFEN_MEMBERS') || hasPermission(myRoles, 'KICK_MEMBERS')) && (
              <div className="border-t border-dark-100 pt-3 mt-2">
                <div className="text-xs font-semibold text-gray-400 uppercase mb-2">Moderation</div>
                <div className="flex gap-2">
                  {hasPermission(myRoles, 'MUTE_MEMBERS') && (
                    <button onClick={async () => { try { await client.post(`/moderation/${serverId}/mute/${selectedMember.user.id}`); toast.success('User muted') } catch { toast.error('Failed') } }}
                      className="px-3 py-1 text-xs bg-dark-100 hover:bg-yellow-600/20 text-yellow-400 rounded-lg transition-colors">Mute</button>
                  )}
                  {hasPermission(myRoles, 'DEAFEN_MEMBERS') && (
                    <button onClick={async () => { try { await client.post(`/moderation/${serverId}/deafen/${selectedMember.user.id}`); toast.success('User deafened') } catch { toast.error('Failed') } }}
                      className="px-3 py-1 text-xs bg-dark-100 hover:bg-orange-600/20 text-orange-400 rounded-lg transition-colors">Deafen</button>
                  )}
                  {hasPermission(myRoles, 'KICK_MEMBERS') && (
                    <button onClick={async () => { try { await client.post(`/moderation/${serverId}/kick/${selectedMember.user.id}`); toast.success('User kicked'); setSelectedMember(null); fetchMembers() } catch { toast.error('Failed') } }}
                      className="px-3 py-1 text-xs bg-dark-100 hover:bg-red-600/20 text-red-400 rounded-lg transition-colors">Kick</button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface MemberItemProps {
  member: Member
  onClick: (member: Member, e: React.MouseEvent) => void
}

const MemberItem = ({ member, onClick }: MemberItemProps) => {
  return (
    <div onClick={e => onClick(member, e)}
      className="flex items-center px-2 py-1.5 rounded-lg hover:bg-dark-100/50 transition-all duration-150 cursor-pointer group">
      <div className="relative">
        <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-bold overflow-hidden">
          {member.user.avatar ? (
            <img src={member.user.avatar} alt={member.user.displayName} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            member.user.displayName.charAt(0).toUpperCase()
          )}
        </div>
        <div className={clsx(
          'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-dark-200',
          member.user.isOnline ? 'bg-green-500' : 'bg-gray-500'
        )} />
      </div>
      <div className="ml-3 flex-1 min-w-0">
        <div className={clsx('text-sm font-medium truncate', member.user.isOnline ? 'text-white' : 'text-gray-400')}>
          {member.user.displayName}
        </div>
        <div className="text-xs text-gray-500 truncate">@{member.user.username}</div>
      </div>
    </div>
  )
}

export default MembersList
