import { useState, useEffect, useRef } from 'react'
import { PaperAirplaneIcon, PaperClipIcon, FaceSmileIcon, HashtagIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { clsx } from 'clsx'
import client from '../api/client'
import { useSocketStore } from '../stores/socketStore'
import { useAuthStore } from '../stores/authStore'
import { useSettingsStore } from '../stores/settingsStore'
import { playNotificationSound } from '../stores/voiceStore'
import { format } from 'date-fns'

interface Message {
  id: string
  content: string
  author: {
    id: string
    username: string
    displayName: string
    avatar?: string
  }
  createdAt: string
  editedAt?: string
}

interface Emoji {
  id: string
  name: string
  url: string
}

interface ChatAreaProps {
  channelId: string | null
  serverId?: string | null
}

const ChatArea = ({ channelId, serverId }: ChatAreaProps) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [channelName, setChannelName] = useState('')
  const [channelDesc, setChannelDesc] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojis, setEmojis] = useState<Emoji[]>([])
  const [emojiError, setEmojiError] = useState(false)
  const [previewFile, setPreviewFile] = useState<{ file: File; url: string } | null>(null)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [channelMembers, setChannelMembers] = useState<{ id: string; user: { id: string; username: string; displayName: string; avatar?: string } }[]>([])
  const [mentionIndex, setMentionIndex] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const emojiRef = useRef<HTMLDivElement>(null)
  const mentionRef = useRef<HTMLDivElement>(null)
  const { socket, sendMessage, editMessage, deleteMessage, joinChannel, leaveChannel } = useSocketStore()
  const { user } = useAuthStore()

  useEffect(() => {
    if (channelId) {
      fetchMessages()
      fetchChannelInfo()
      joinChannel(channelId)
      client.get(`/channels/${channelId}/members`).then(r => setChannelMembers(r.data)).catch(() => {})
      return () => { leaveChannel(channelId) }
    }
  }, [channelId])

  useEffect(() => {
    if (serverId) {
      setEmojiError(false)
      console.log('[ChatArea] Fetching emojis for server:', serverId)
      client.get(`/emojis/${serverId}`).then(r => { console.log('[ChatArea] Emojis loaded:', r.data.length); setEmojis(r.data) }).catch((err) => { console.error('[ChatArea] Emoji fetch failed:', err); setEmojis([]); setEmojiError(true) })
    }
  }, [serverId])

  useEffect(() => {
    if (socket) {
      const handleNew = (message: Message) => {
        setMessages(prev => [...prev, message])
        if (message.author.id !== user?.id) {
          const isMentioned = user?.username && message.content.includes(`@${user.username}`)
          // Always play sound on mention, otherwise respect settings
          if (isMentioned || useSettingsStore.getState().notificationSounds) {
            playNotificationSound()
          }
        }
      }
      socket.on('new_message', handleNew)
      socket.on('message_updated', (message: Message) => setMessages(prev => prev.map(m => m.id === message.id ? message : m)))
      socket.on('message_deleted', (data: { messageId: string }) => setMessages(prev => prev.filter(m => m.id !== data.messageId)))
      return () => { socket.off('new_message', handleNew); socket.off('message_updated'); socket.off('message_deleted') }
    }
  }, [socket, user?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmojiPicker(false)
    }
    if (showEmojiPicker) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showEmojiPicker])

  const fetchChannelInfo = async () => {
    if (!channelId) return
  }

  const fetchMessages = async () => {
    if (!channelId) return
    setIsLoading(true)
    try {
      const response = await client.get(`/messages/channel/${channelId}`)
      setMessages(response.data)
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !channelId) return
    sendMessage(channelId, newMessage.trim())
    setNewMessage('')
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !channelId) return
    const isImage = file.type.startsWith('image/')
    if (isImage) {
      const url = URL.createObjectURL(file)
      setPreviewFile({ file, url })
    } else {
      uploadAndSend(file)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const uploadAndSend = async (file: File) => {
    if (!channelId) return
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await client.post('/storage/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      const fileUrl = response.data.url || response.data.path
      sendMessage(channelId, fileUrl)
    } catch (error) {
      console.error('Failed to upload file:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const handlePreviewSend = () => {
    if (previewFile) {
      uploadAndSend(previewFile.file)
      URL.revokeObjectURL(previewFile.url)
      setPreviewFile(null)
    }
  }

  const handlePreviewCancel = () => {
    if (previewFile) {
      URL.revokeObjectURL(previewFile.url)
      setPreviewFile(null)
    }
  }

  const insertEmoji = (emoji: Emoji) => {
    setNewMessage(prev => prev + `:${emoji.name}:`)
    setShowEmojiPicker(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setNewMessage(val)
    const lastAt = val.lastIndexOf('@')
    if (lastAt !== -1 && (lastAt === 0 || val[lastAt - 1] === ' ')) {
      const query = val.slice(lastAt + 1)
      if (!query.includes(' ')) {
        setMentionFilter(query.toLowerCase())
        setMentionIndex(0)
        setShowMentions(true)
        return
      }
    }
    setShowMentions(false)
  }

  const filteredMembers = channelMembers.filter(m =>
    m.user.username.toLowerCase().includes(mentionFilter) ||
    m.user.displayName.toLowerCase().includes(mentionFilter)
  ).slice(0, 8)

  const insertMention = (username: string) => {
    const lastAt = newMessage.lastIndexOf('@')
    setNewMessage(newMessage.slice(0, lastAt) + '@' + username + ' ')
    setShowMentions(false)
  }

  const handleMentionKey = (e: React.KeyboardEvent) => {
    if (!showMentions || filteredMembers.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => (i + 1) % filteredMembers.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex(i => (i - 1 + filteredMembers.length) % filteredMembers.length) }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(filteredMembers[mentionIndex].user.username) }
    else if (e.key === 'Escape') { setShowMentions(false) }
  }

  if (!channelId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-dark-400">
        <div className="text-center text-gray-400">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-dark-300 flex items-center justify-center">
            <HashtagIcon className="w-12 h-12 text-gray-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Welcome to Battala Hub!</h2>
          <p>Select a channel to start chatting</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-dark-400 min-h-0 overflow-hidden">
      {/* Channel Header */}
      <div className="h-12 border-b border-dark-100 flex items-center px-4 bg-dark-400/80 backdrop-blur-sm flex-shrink-0">
        <HashtagIcon className="w-5 h-5 text-gray-400 mr-2" />
        <span className="font-semibold text-white">{channelName || 'channel'}</span>
        {channelDesc && (
          <>
            <div className="w-px h-5 bg-dark-100 mx-3" />
            <span className="text-sm text-gray-400 truncate">{channelDesc}</span>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400">Loading messages...</div>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((message) => (
              <MessageItem key={message.id} message={message} serverEmojis={emojis}
                isOwn={message.author.id === user?.id}
                currentUsername={user?.username}
                channelMembers={channelMembers}
                onEdit={(content) => editMessage(message.id, content)}
                onDelete={() => deleteMessage(message.id)} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-dark-300 rounded-2xl p-5 max-w-lg animate-scaleIn">
            <img src={previewFile.url} alt="Preview" className="max-h-80 rounded-lg mb-4 object-contain" />
            <div className="flex justify-end gap-3">
              <button onClick={handlePreviewCancel} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={handlePreviewSend} className="btn-primary px-4 py-2" disabled={isUploading}>
                {isUploading ? 'Uploading...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mention Autocomplete */}
      {showMentions && filteredMembers.length > 0 && (
        <div ref={mentionRef} className="mx-4 mb-1 bg-dark-300 rounded-xl shadow-2xl border border-dark-100 overflow-hidden animate-scaleIn">
          <div className="text-xs font-semibold text-gray-400 uppercase px-3 pt-2 pb-1">Members</div>
          <div className="max-h-48 overflow-y-auto scrollbar-thin">
            {filteredMembers.map((m, i) => (
              <div key={m.id} onClick={() => insertMention(m.user.username)}
                className={clsx('flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors',
                  i === mentionIndex ? 'bg-primary-600/30' : 'hover:bg-dark-200')}>
                <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0">
                  {m.user.avatar ? <img src={m.user.avatar} className="w-6 h-6 rounded-full object-cover" /> : m.user.displayName.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-white">{m.user.displayName}</span>
                <span className="text-xs text-gray-500">@{m.user.username}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 flex-shrink-0">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-dark-200 rounded-xl px-4 py-2 border border-dark-100 focus-within:border-primary-500/50 transition-colors">
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip" />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading}
            className="p-1.5 text-gray-400 hover:text-white transition-colors disabled:opacity-50 rounded-lg hover:bg-dark-100" title="Attach file">
            <PaperClipIcon className="w-5 h-5" />
          </button>
          <input type="text" value={newMessage} onChange={handleInputChange} onKeyDown={handleMentionKey}
            placeholder={isUploading ? 'Uploading file...' : 'Type a message...'}
            className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none text-sm" maxLength={2000} disabled={isUploading} />
          
          {/* Emoji button */}
          <div className="relative" ref={emojiRef}>
            <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-dark-100">
              <FaceSmileIcon className="w-5 h-5" />
            </button>
            {showEmojiPicker && (
              <div className="absolute bottom-full right-0 mb-2 w-64 bg-dark-300 rounded-xl shadow-2xl border border-dark-100 p-3 animate-scaleIn">
                <div className="text-xs font-semibold text-gray-400 uppercase mb-2">Server Emojis</div>
                {emojiError ? (
                  <p className="text-sm text-gray-500">Failed to load emojis</p>
                ) : emojis.length === 0 ? (
                  <p className="text-sm text-gray-500">No emojis yet</p>
                ) : (
                  <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto scrollbar-thin">
                    {emojis.map(emoji => (
                      <button key={emoji.id} onClick={() => insertEmoji(emoji)} title={`:${emoji.name}:`}
                        className="p-1.5 rounded-lg hover:bg-dark-200 transition-colors">
                        <img src={emoji.url} alt={emoji.name} className="w-9 h-9 object-contain" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button type="submit" disabled={!newMessage.trim() || isUploading}
            className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 transition-colors rounded-lg hover:bg-primary-600 disabled:hover:bg-transparent">
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  )
}

interface MessageItemProps {
  message: Message
  serverEmojis: Emoji[]
  isOwn: boolean
  currentUsername?: string
  channelMembers?: { id: string; user: { id: string; username: string; displayName: string; avatar?: string } }[]
  onEdit: (content: string) => void
  onDelete: () => void
}

const MessageItem = ({ message, serverEmojis, isOwn, currentUsername, channelMembers = [], onEdit, onDelete }: MessageItemProps) => {
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [mentionProfile, setMentionProfile] = useState<{ username: string; x: number; y: number } | null>(null)
  const mentionProfileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (mentionProfileRef.current && !mentionProfileRef.current.contains(e.target as Node)) setMentionProfile(null)
    }
    if (mentionProfile) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [mentionProfile])
  const isImage = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(message.content)
  const isFileUrl = /^https?:\/\//.test(message.content) || message.content.startsWith('/uploads/')

  const handleEditSave = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit(editContent.trim())
    }
    setEditing(false)
  }

  const handleEditKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleEditSave()
    if (e.key === 'Escape') { setEditing(false); setEditContent(message.content) }
  }

  const handleDelete = () => {
    onDelete()
    setShowDeleteConfirm(false)
  }

  const renderMentions = (text: string, keyPrefix: string) => {
    const parts = text.split(/(@\w+)/g)
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const username = part.slice(1)
        const isSelf = username === currentUsername
        return <span key={`${keyPrefix}-m${i}`} onClick={(e) => {
          e.stopPropagation()
          setMentionProfile({ username, x: e.clientX, y: e.clientY })
        }} className={clsx('px-1 rounded font-medium cursor-pointer',
          isSelf ? 'bg-yellow-500/30 text-yellow-300' : 'bg-primary-500/30 text-primary-300 hover:underline')}>
          {part}
        </span>
      }
      return <span key={`${keyPrefix}-m${i}`}>{part}</span>
    })
  }

  const renderContent = (content: string) => {
    if (isImage || isFileUrl) return null
    const parts = content.split(/:([a-zA-Z0-9_]+):/g)
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        const emoji = serverEmojis.find(e => e.name === part)
        if (emoji) return <img key={i} src={emoji.url} alt={`:${part}:`} className="inline-block w-8 h-8 align-middle" />
      }
      return <span key={i}>{renderMentions(part, `${i}`)}</span>
    })
  }

  return (
    <div className="message-item group rounded-lg relative">
      {/* Edit/Delete buttons for own messages */}
      {isOwn && !editing && (
        <div className="absolute right-2 top-1 hidden group-hover:flex items-center gap-1 bg-dark-300 rounded-lg border border-dark-100 p-0.5">
          <button onClick={() => { setEditing(true); setEditContent(message.content) }}
            className="p-1 text-gray-400 hover:text-white rounded transition-colors" title="Edit">
            <PencilIcon className="w-4 h-4" />
          </button>
          <button onClick={() => setShowDeleteConfirm(true)}
            className="p-1 text-gray-400 hover:text-red-400 rounded transition-colors" title="Delete">
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="absolute right-2 top-1 flex items-center gap-2 bg-dark-300 rounded-lg border border-dark-100 p-2 z-10">
          <span className="text-xs text-gray-400">Delete?</span>
          <button onClick={handleDelete} className="text-xs text-red-400 hover:text-red-300 font-medium">Yes</button>
          <button onClick={() => setShowDeleteConfirm(false)} className="text-xs text-gray-400 hover:text-white">No</button>
        </div>
      )}

      {/* Mention profile popover */}
      {mentionProfile && (() => {
        const member = channelMembers.find(m => m.user.username === mentionProfile.username)
        return (
          <div ref={mentionProfileRef} className="fixed z-50 bg-dark-300 rounded-xl shadow-2xl border border-dark-100 p-4 w-56 animate-scaleIn"
            style={{ left: mentionProfile.x, top: mentionProfile.y - 10, transform: 'translateY(-100%)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0">
                {member?.user.avatar ? <img src={member.user.avatar} className="w-full h-full object-cover" /> : (member?.user.displayName || mentionProfile.username).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">{member?.user.displayName || mentionProfile.username}</div>
                <div className="text-xs text-gray-400 truncate">@{mentionProfile.username}</div>
              </div>
            </div>
            {!member && <div className="text-xs text-gray-500">User not in this channel</div>}
          </div>
        )
      })()}

      <div className="flex items-start space-x-3">
        <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
          {message.author.avatar ? (
            <img src={message.author.avatar} alt={message.author.displayName} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            message.author.displayName.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline space-x-2">
            <span className="font-medium text-white hover:underline cursor-pointer">{message.author.displayName}</span>
            <span className="text-xs text-gray-500">
              {format(new Date(message.createdAt), 'MMM d, yyyy h:mm a')}
              {message.editedAt && <span className="text-gray-600 ml-1">(edited)</span>}
            </span>
          </div>
          <div className="mt-0.5 text-gray-200 break-words text-[15px] leading-relaxed">
            {editing ? (
              <input type="text" value={editContent} onChange={e => setEditContent(e.target.value)}
                onKeyDown={handleEditKey} autoFocus
                className="w-full bg-dark-200 text-white rounded-lg px-3 py-1.5 outline-none border border-dark-100 focus:border-primary-500/50 text-sm" />
            ) : isImage ? (
              <img src={message.content} alt="attachment" className="max-w-md rounded-lg mt-1 hover:shadow-lg transition-shadow" />
            ) : isFileUrl ? (
              <a href={message.content} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline">{message.content}</a>
            ) : (
              renderContent(message.content)
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatArea
