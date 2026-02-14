import { useState, useEffect } from 'react'
import ServersSidebar from '../components/ServersSidebar'
import ChannelsSidebar from '../components/ChannelsSidebar'
import ChatArea from '../components/ChatArea'
import VoiceChannel from '../components/VoiceChannel'
import MembersList from '../components/MembersList'
import { useAuthStore } from '../stores/authStore'
import { useVoiceStore } from '../stores/voiceStore'
import client from '../api/client'

const DashboardPage = () => {
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null)
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [selectedChannelType, setSelectedChannelType] = useState<'TEXT' | 'VOICE'>('TEXT')
  const [selectedChannelName, setSelectedChannelName] = useState('')
  const [myRoles, setMyRoles] = useState<any[]>([])
  const [serverOwnerId, setServerOwnerId] = useState<string>('')
  const { user } = useAuthStore()
  const voiceChannelId = useVoiceStore(s => s.currentChannelId)

  // Fetch current user's roles for selected server
  useEffect(() => {
    if (!selectedServerId || !user) { setMyRoles([]); return }
    client.get(`/servers/${selectedServerId}`).then(r => {
      setServerOwnerId(r.data.ownerId || '')
      const myMember = r.data.members?.find((m: any) => m.user?.id === user.id || m.userId === user.id)
      if (r.data.ownerId === user.id) {
        // Owner has all permissions implicitly
        setMyRoles([{ role: { permissions: ['ADMINISTRATOR'] } }])
      } else if (myMember?.roles && myMember.roles.length > 0) {
        setMyRoles(myMember.roles)
      } else {
        setMyRoles([])
      }
    }).catch(() => setMyRoles([]))
  }, [selectedServerId, user])

  const handleSelectChannel = (channelId: string, type: 'TEXT' | 'VOICE' = 'TEXT', name: string = '') => {
    setSelectedChannelId(channelId)
    setSelectedChannelType(type)
    setSelectedChannelName(name)
  }

  return (
    <div className="flex h-screen bg-dark-400">
      <div className="w-20 flex-shrink-0">
        <ServersSidebar selectedServerId={selectedServerId} onSelectServer={setSelectedServerId} />
      </div>
      <div className="w-60 flex-shrink-0">
        <ChannelsSidebar
          serverId={selectedServerId}
          selectedChannelId={selectedChannelId}
          onSelectChannel={handleSelectChannel}
        />
      </div>
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {(selectedChannelType === 'VOICE' || (voiceChannelId && voiceChannelId === selectedChannelId)) && selectedChannelId ? (
          <VoiceChannel channelId={selectedChannelId} channelName={selectedChannelName} serverId={selectedServerId ?? undefined} myRoles={myRoles} />
        ) : (
          <ChatArea channelId={selectedChannelId} serverId={selectedServerId} />
        )}
      </div>
      <div className="w-60 flex-shrink-0">
        <MembersList channelId={selectedChannelId} serverId={selectedServerId ?? undefined} myRoles={myRoles} />
      </div>
    </div>
  )
}

export default DashboardPage
