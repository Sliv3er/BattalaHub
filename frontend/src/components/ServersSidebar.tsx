import { useState, useEffect } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'
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
      </div>

      {/* Create Server Modal */}
      {showCreateModal && (
        <CreateServerModal
          onClose={() => setShowCreateModal(false)}
          onCreateServer={createServer}
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

export default ServersSidebar