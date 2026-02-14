import { useState } from 'react'
import ServersSidebar from '../components/ServersSidebar'
import ChannelsSidebar from '../components/ChannelsSidebar'
import ChatArea from '../components/ChatArea'
import VoiceChannel from '../components/VoiceChannel'
import MembersList from '../components/MembersList'

const DashboardPage = () => {
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null)
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [selectedChannelType, setSelectedChannelType] = useState<'TEXT' | 'VOICE'>('TEXT')
  const [selectedChannelName, setSelectedChannelName] = useState('')

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
        {selectedChannelType === 'VOICE' && selectedChannelId ? (
          <VoiceChannel channelId={selectedChannelId} channelName={selectedChannelName} />
        ) : (
          <ChatArea channelId={selectedChannelId} serverId={selectedServerId} />
        )}
      </div>
      <div className="w-60 flex-shrink-0">
        <MembersList channelId={selectedChannelId} />
      </div>
    </div>
  )
}

export default DashboardPage
