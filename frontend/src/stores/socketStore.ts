import { create } from 'zustand'
import { io, Socket } from 'socket.io-client'
import toast from 'react-hot-toast'
import { User } from './authStore'

interface SocketState {
  socket: Socket | null
  isConnected: boolean
  connect: (user: User) => void
  disconnect: () => void
  joinChannel: (channelId: string) => void
  leaveChannel: (channelId: string) => void
  sendMessage: (channelId: string, content: string) => void
  editMessage: (messageId: string, content: string) => void
  deleteMessage: (messageId: string) => void
  addReaction: (messageId: string, emoji: string) => void
  startTyping: (channelId: string) => void
  stopTyping: (channelId: string) => void
}

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:4000'

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,

  connect: (user: User) => {
    const { socket: existingSocket } = get()
    
    if (existingSocket?.connected) {
      return
    }

    const token = localStorage.getItem('token')
    if (!token) return

    const socket = io(WS_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      console.log('🔌 Connected to server')
      set({ socket, isConnected: true })
    })

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from server')
      set({ isConnected: false })
    })

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error)
      toast.error('Failed to connect to server')
    })

    socket.on('error', (error) => {
      console.error('Socket error:', error)
      toast.error(error.message || 'An error occurred')
    })

    // Message events
    socket.on('new_message', (message) => {
      // Handle new message (will be handled by message store)
      console.log('📨 New message:', message)
    })

    socket.on('message_updated', (message) => {
      console.log('✏️ Message updated:', message)
    })

    socket.on('message_deleted', (data) => {
      console.log('🗑️ Message deleted:', data)
    })

    socket.on('reaction_updated', (data) => {
      console.log('😀 Reaction updated:', data)
    })

    // Typing events
    socket.on('user_typing', (data) => {
      console.log('⌨️ User typing:', data)
    })

    socket.on('user_stopped_typing', (data) => {
      console.log('⌨️ User stopped typing:', data)
    })

    set({ socket, isConnected: false })
  },

  disconnect: () => {
    const { socket } = get()
    if (socket) {
      socket.disconnect()
      set({ socket: null, isConnected: false })
    }
  },

  joinChannel: (channelId: string) => {
    const { socket } = get()
    if (socket?.connected) {
      socket.emit('join_channel', { channelId })
    }
  },

  leaveChannel: (channelId: string) => {
    const { socket } = get()
    if (socket?.connected) {
      socket.emit('leave_channel', { channelId })
    }
  },

  sendMessage: (channelId: string, content: string) => {
    const { socket } = get()
    if (socket?.connected) {
      socket.emit('send_message', { channelId, content })
    }
  },

  editMessage: (messageId: string, content: string) => {
    const { socket } = get()
    if (socket?.connected) {
      socket.emit('edit_message', { messageId, content })
    }
  },

  deleteMessage: (messageId: string) => {
    const { socket } = get()
    if (socket?.connected) {
      socket.emit('delete_message', { messageId })
    }
  },

  addReaction: (messageId: string, emoji: string) => {
    const { socket } = get()
    if (socket?.connected) {
      socket.emit('add_reaction', { messageId, emoji })
    }
  },

  startTyping: (channelId: string) => {
    const { socket } = get()
    if (socket?.connected) {
      socket.emit('typing_start', { channelId })
    }
  },

  stopTyping: (channelId: string) => {
    const { socket } = get()
    if (socket?.connected) {
      socket.emit('typing_stop', { channelId })
    }
  },
}))