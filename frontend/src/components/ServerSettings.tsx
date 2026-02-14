import { useState, useEffect, useRef } from 'react'
import { XMarkIcon, CameraIcon, TrashIcon, PlusIcon, CheckIcon } from '@heroicons/react/24/outline'
import client from '../api/client'
import toast from 'react-hot-toast'
import { PERMISSIONS } from '../utils/permissions'

interface Emoji {
  id: string
  name: string
  url: string
}

interface Role {
  id: string
  name: string
  color: string
  permissions: string[]
  isDefault: boolean
  _count?: { members: number }
}

interface ServerMember {
  id: string
  user: { id: string; username: string; displayName: string; avatar?: string }
  roles: { role: { id: string; name: string; color: string } }[]
}

interface ServerSettingsProps {
  serverId: string
  onClose: () => void
  onUpdated?: () => void
}

const ServerSettings = ({ serverId, onClose, onUpdated }: ServerSettingsProps) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [emojis, setEmojis] = useState<Emoji[]>([])
  const [emojiName, setEmojiName] = useState('')
  const [isUploadingIcon, setIsUploadingIcon] = useState(false)
  const [isUploadingEmoji, setIsUploadingEmoji] = useState(false)
  const iconInputRef = useRef<HTMLInputElement>(null)
  const emojiInputRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<'general' | 'emojis' | 'roles'>('general')
  const [roles, setRoles] = useState<Role[]>([])
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [roleName, setRoleName] = useState('')
  const [roleColor, setRoleColor] = useState('#ffffff')
  const [rolePerms, setRolePerms] = useState<string[]>([])
  const [members, setMembers] = useState<ServerMember[]>([])
  const [showMemberAssign, setShowMemberAssign] = useState<string | null>(null)

  useEffect(() => {
    fetchServer()
    fetchEmojis()
    fetchRoles()
  }, [serverId])

  const fetchServer = async () => {
    try {
      const res = await client.get(`/servers/${serverId}`)
      setName(res.data.name)
      setDescription(res.data.description || '')
      setIcon(res.data.icon || '')
    } catch { }
  }

  const fetchEmojis = async () => {
    try {
      const res = await client.get(`/emojis/${serverId}`)
      setEmojis(res.data)
    } catch { }
  }

  const fetchRoles = async () => {
    try {
      const res = await client.get(`/roles/${serverId}`)
      setRoles(res.data)
    } catch { }
  }

  const fetchServerMembers = async () => {
    try {
      const res = await client.get(`/servers/${serverId}`)
      setMembers(res.data.members || [])
    } catch { }
  }

  const handleSaveRole = async () => {
    try {
      if (editingRole) {
        await client.patch(`/roles/${editingRole.id}`, { name: roleName, color: roleColor, permissions: rolePerms })
        toast.success('Role updated')
      } else {
        await client.post(`/roles/${serverId}`, { name: roleName, color: roleColor, permissions: rolePerms })
        toast.success('Role created')
      }
      setEditingRole(null); setRoleName(''); setRoleColor('#ffffff'); setRolePerms([])
      fetchRoles()
    } catch { toast.error('Failed to save role') }
  }

  const handleDeleteRole = async (id: string) => {
    try {
      await client.delete(`/roles/${id}`)
      toast.success('Role deleted')
      fetchRoles()
    } catch { toast.error('Failed to delete role') }
  }

  const handleToggleRoleAssign = async (memberId: string, roleId: string, hasRole: boolean) => {
    try {
      if (hasRole) {
        await client.delete(`/roles/${roleId}/assign/${memberId}`)
      } else {
        await client.post(`/roles/${roleId}/assign/${memberId}`)
      }
      fetchServerMembers()
    } catch { toast.error('Failed to update role') }
  }

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingIcon(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await client.post('/storage/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setIcon(res.data.url)
    } catch { toast.error('Upload failed') }
    finally { setIsUploadingIcon(false) }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await client.patch(`/servers/${serverId}`, { name, description, icon })
      toast.success('Server updated')
      onUpdated?.()
      onClose()
    } catch { toast.error('Failed to update server') }
    finally { setIsSaving(false) }
  }

  const handleEmojiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !emojiName.trim()) { toast.error('Enter emoji name first'); return }
    setIsUploadingEmoji(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', emojiName.trim())
      await client.post(`/emojis/${serverId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setEmojiName('')
      toast.success('Emoji added')
      fetchEmojis()
    } catch { toast.error('Failed to upload emoji') }
    finally { setIsUploadingEmoji(false) }
  }

  const handleDeleteEmoji = async (id: string) => {
    try {
      await client.delete(`/emojis/${id}`)
      setEmojis(prev => prev.filter(e => e.id !== id))
      toast.success('Emoji deleted')
    } catch { toast.error('Failed to delete emoji') }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fadeIn" onClick={onClose}>
      <div className="bg-dark-300 rounded-xl w-[500px] max-h-[80vh] shadow-2xl animate-scaleIn flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-dark-100">
          <h3 className="text-white font-bold text-lg">Server Settings</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-100">
          {(['general', 'emojis', 'roles'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === t ? 'text-white border-b-2 border-primary-500' : 'text-gray-400 hover:text-gray-200'}`}>
              {t === 'general' ? 'General' : t === 'emojis' ? 'Emojis' : 'Roles'}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto scrollbar-thin flex-1">
          {tab === 'general' && (
            <>
              <div className="flex justify-center mb-6">
                <div className="relative group cursor-pointer" onClick={() => iconInputRef.current?.click()}>
                  <div className="w-20 h-20 rounded-2xl bg-primary-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                    {icon ? <img src={icon} alt="Icon" className="w-full h-full object-cover" /> : name.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <CameraIcon className="w-6 h-6 text-white" />
                  </div>
                  <input ref={iconInputRef} type="file" className="hidden" accept="image/*" onChange={handleIconUpload} />
                </div>
              </div>

              <label className="block text-sm font-medium text-gray-300 mb-1">Server Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full input mb-4" maxLength={100} />

              <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full input mb-6 resize-none h-24" maxLength={500} />

              <div className="flex justify-end">
                <button onClick={handleSave} disabled={isSaving} className="btn-primary px-6 py-2 disabled:opacity-50">
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </>
          )}
          {tab === 'emojis' && (
            <>
              <div className="flex items-end gap-2 mb-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Emoji Name</label>
                  <input type="text" value={emojiName} onChange={e => setEmojiName(e.target.value)} className="w-full input" placeholder=":emoji_name:" maxLength={32} />
                </div>
                <button onClick={() => emojiInputRef.current?.click()} disabled={!emojiName.trim() || isUploadingEmoji}
                  className="btn-primary px-4 py-2 disabled:opacity-50 flex items-center gap-1">
                  <PlusIcon className="w-4 h-4" /> Upload
                </button>
                <input ref={emojiInputRef} type="file" className="hidden" accept="image/*" onChange={handleEmojiUpload} />
              </div>

              <div className="grid grid-cols-4 gap-3">
                {emojis.map(emoji => (
                  <div key={emoji.id} className="bg-dark-200 rounded-lg p-3 flex flex-col items-center gap-2 group relative">
                    <img src={emoji.url} alt={emoji.name} className="w-10 h-10 object-contain" />
                    <span className="text-xs text-gray-400 truncate w-full text-center">:{emoji.name}:</span>
                    <button onClick={() => handleDeleteEmoji(emoji.id)}
                      className="absolute top-1 right-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {emojis.length === 0 && <p className="col-span-4 text-center text-gray-500 py-8">No custom emojis yet</p>}
              </div>
            </>
          )}
          {tab === 'roles' && (
            <>
              {/* Role Form */}
              <div className="bg-dark-200 rounded-xl p-4 mb-4">
                <h4 className="text-white font-semibold text-sm mb-3">{editingRole ? 'Edit Role' : 'Create Role'}</h4>
                <div className="flex gap-2 mb-3">
                  <input type="text" value={roleName} onChange={e => setRoleName(e.target.value)} placeholder="Role name" className="flex-1 input" />
                  <input type="color" value={roleColor} onChange={e => setRoleColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-dark-100" />
                </div>
                <div className="text-xs text-gray-400 uppercase font-semibold mb-2">Permissions</div>
                <div className="grid grid-cols-2 gap-1 mb-3 max-h-40 overflow-y-auto scrollbar-thin">
                  {PERMISSIONS.map(p => (
                    <label key={p} className="flex items-center gap-2 text-xs text-gray-300 hover:text-white cursor-pointer py-1">
                      <input type="checkbox" checked={rolePerms.includes(p)}
                        onChange={() => setRolePerms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                        className="accent-primary-500" />
                      {p.replace(/_/g, ' ')}
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveRole} disabled={!roleName.trim()} className="btn-primary px-4 py-1.5 text-sm disabled:opacity-50">
                    {editingRole ? 'Update' : 'Create'}
                  </button>
                  {editingRole && (
                    <button onClick={() => { setEditingRole(null); setRoleName(''); setRoleColor('#ffffff'); setRolePerms([]) }}
                      className="px-4 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
                  )}
                </div>
              </div>

              {/* Roles List */}
              <div className="space-y-2 mb-4">
                {roles.map(role => (
                  <div key={role.id} className="flex items-center gap-3 p-3 bg-dark-200 rounded-xl group">
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: role.color }} />
                    <span className="text-white text-sm font-medium flex-1">{role.name}</span>
                    <span className="text-xs text-gray-500">{role._count?.members ?? 0} members</span>
                    {!role.isDefault && (
                      <>
                        <button onClick={() => { setShowMemberAssign(showMemberAssign === role.id ? null : role.id); if (!members.length) fetchServerMembers() }}
                          className="text-xs text-gray-400 hover:text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity">Assign</button>
                        <button onClick={() => { setEditingRole(role); setRoleName(role.name); setRoleColor(role.color); setRolePerms(role.permissions) }}
                          className="text-xs text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">Edit</button>
                        <button onClick={() => handleDeleteRole(role.id)}
                          className="text-xs text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {showMemberAssign === role.id && (
                      <div className="absolute right-8 mt-32 w-52 bg-dark-300 rounded-xl shadow-2xl border border-dark-100 p-2 z-50 max-h-48 overflow-y-auto">
                        {members.map(m => {
                          const has = m.roles.some(r => r.role.id === role.id)
                          return (
                            <button key={m.id} onClick={() => handleToggleRoleAssign(m.id, role.id, has)}
                              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-gray-300 hover:bg-dark-100 rounded-lg">
                              {has && <CheckIcon className="w-4 h-4 text-green-400" />}
                              <span className={has ? '' : 'ml-6'}>{m.user.displayName}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ServerSettings
