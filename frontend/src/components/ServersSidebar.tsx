import { useState, useEffect } from 'react'
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import client from '../api/client'

interface Server {
  id: string
  name: string
  icon?: string
}

interface ServersSidebarProps {
  selectedServerId: string | null
  onSelectServer: (serverId: string) => void
}

const ServersSidebar = ({ selectedServerId, onSelectServer }: ServersSidebarProps) => {
  const [servers, setServers] = useState<Server[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchServers()
  }, [])

  const fetchServers = async () => {
    try {
      const response = await client.get('/servers')
      setServers(response.data)
      
      // Auto-select first server
      if (response.data.length > 0 && !selectedServerId) {
        onSelectServer(response.data[0].id)
      }
    } catch (error) {
      toast.error('Failed to load servers')
    } finally {
      setIsLoading(false)
    }
  }

  const createServer = async (name: string) => {
    try {
      const response = await client.post('/servers', { name })
      const newServer = response.data
      setServers(prev => [...prev, newServer])
      onSelectServer(newServer.id)
      toast.success('Server created successfully!')
    } catch (error) {
      toast.error('Failed to create server')
    }
  }

  if (isLoading) {
    return (
      <div className="sidebar h-full bg-dark-300">
        <div className="p-4">
          <div className="w-12 h-12 bg-dark-200 rounded-lg animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="sidebar h-full bg-dark-300">
      <div className="p-4 space-y-3">
        {/* Servers */}
        {servers.map((server) => (
          <button
            key={server.id}
            onClick={() => onSelectServer(server.id)}
            className={clsx(
              'w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg transition-all duration-200',
              selectedServerId === server.id
                ? 'bg-primary-600'
                : 'bg-dark-200 hover:bg-dark-100'
            )}
            title={server.name}
          >
            {server.icon ? (
              <img 
                src={server.icon} 
                alt={server.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              server.name.charAt(0).toUpperCase()
            )}
          </button>
        ))}

        {/* Add Server Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-12 h-12 rounded-lg bg-dark-200 hover:bg-primary-600 flex items-center justify-center transition-colors duration-200 group"
          title="Create Server"
        >
          <PlusIcon className="w-6 h-6 text-gray-400 group-hover:text-white" />
        </button>

        {/* Join Server Button */}
        <button
          onClick={() => setShowJoinModal(true)}
          className="w-12 h-12 rounded-lg bg-dark-200 hover:bg-green-600 flex items-center justify-center transition-colors duration-200 group"
          title="Join Server"
        >
          <MagnifyingGlassIcon className="w-6 h-6 text-gray-400 group-hover:text-white" />
        </button>
      </div>

      {/* Create Server Modal */}
      {showCreateModal && (
        <CreateServerModal
          onClose={() => setShowCreateModal(false)}
          onCreateServer={createServer}
        />
      )}

      {/* Join Server Modal */}
      {showJoinModal && (
        <JoinServerModal
          onClose={() => setShowJoinModal(false)}
          onJoined={(server) => {
            setServers(prev => [...prev, server])
            onSelectServer(server.id)
          }}
        />
      )}
    </div>
  )
}

interface CreateServerModalProps {
  onClose: () => void
  onCreateServer: (name: string) => void
}

const CreateServerModal = ({ onClose, onCreateServer }: CreateServerModalProps) => {
  const [serverName, setServerName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!serverName.trim()) return

    setIsLoading(true)
    try {
      await onCreateServer(serverName.trim())
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-200 rounded-lg p-6 w-96">
        <h2 className="text-xl font-bold text-white mb-4">Create Server</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Server Name
            </label>
            <input
              type="text"
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              placeholder="Enter server name"
              className="input"
              maxLength={100}
              required
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !serverName.trim()}
              className="btn-primary"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface JoinServerModalProps {
  onClose: () => void
  onJoined: (server: Server) => void
}

const JoinServerModal = ({ onClose, onJoined }: JoinServerModalProps) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ id: string; name: string; icon?: string; _count?: { members: number } }[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [joiningId, setJoiningId] = useState<string | null>(null)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const timeout = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await client.get('/servers/search', { params: { name: query.trim() } })
        setResults(res.data)
      } catch { setResults([]) }
      finally { setIsSearching(false) }
    }, 300)
    return () => clearTimeout(timeout)
  }, [query])

  const handleJoin = async (serverId: string) => {
    setJoiningId(serverId)
    try {
      await client.post(`/servers/${serverId}/join`)
      const server = results.find(r => r.id === serverId)
      if (server) onJoined({ id: server.id, name: server.name, icon: server.icon })
      toast.success('Joined server!')
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to join server')
    } finally { setJoiningId(null) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-200 rounded-lg p-6 w-96">
        <h2 className="text-xl font-bold text-white mb-4">Join a Server</h2>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by server name..."
          className="input w-full mb-4"
          autoFocus
        />
        <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
          {isSearching && <p className="text-gray-400 text-sm text-center">Searching...</p>}
          {!isSearching && query.trim() && results.length === 0 && (
            <p className="text-gray-400 text-sm text-center">No servers found</p>
          )}
          {results.map(server => (
            <div key={server.id} className="flex items-center gap-3 p-3 bg-dark-300 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold">
                {server.icon ? <img src={server.icon} alt="" className="w-10 h-10 rounded-lg object-cover" /> : server.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium truncate">{server.name}</div>
                <div className="text-xs text-gray-400">{server._count?.members || 0} members</div>
              </div>
              <button
                onClick={() => handleJoin(server.id)}
                disabled={joiningId === server.id}
                className="btn-primary px-3 py-1 text-sm"
              >
                {joiningId === server.id ? 'Joining...' : 'Join'}
              </button>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default ServersSidebar