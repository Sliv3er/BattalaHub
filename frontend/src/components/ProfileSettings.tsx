import { useState, useRef } from 'react'
import { XMarkIcon, CameraIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '../stores/authStore'
import client from '../api/client'
import toast from 'react-hot-toast'

interface ProfileSettingsProps {
  onClose: () => void
}

const ProfileSettings = ({ onClose }: ProfileSettingsProps) => {
  const { user, updateUser } = useAuthStore()
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [avatar, setAvatar] = useState(user?.avatar || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await client.post('/storage/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setAvatar(res.data.url)
      toast.success('Avatar uploaded')
    } catch {
      toast.error('Failed to upload avatar')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await client.patch('/users/me', { displayName, avatar })
      updateUser({ displayName: res.data.displayName, avatar: res.data.avatar })
      toast.success('Profile updated')
      onClose()
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fadeIn" onClick={onClose}>
      <div className="bg-dark-300 rounded-xl p-6 w-96 shadow-2xl animate-scaleIn" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-bold text-lg">Profile Settings</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Avatar */}
        <div className="flex justify-center mb-6">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-24 h-24 rounded-full bg-primary-600 flex items-center justify-center text-white text-3xl font-bold overflow-hidden ring-4 ring-dark-200">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.displayName?.charAt(0).toUpperCase() || '?'
              )}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <CameraIcon className="w-8 h-8 text-white" />
            </div>
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
          </div>
        </div>
        {isUploading && <p className="text-center text-sm text-gray-400 mb-4">Uploading...</p>}

        {/* Display Name */}
        <label className="block text-sm font-medium text-gray-300 mb-1">Display Name</label>
        <input
          type="text"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          className="w-full input mb-4"
          maxLength={50}
        />

        <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
        <input type="text" value={user?.username || ''} disabled className="w-full input mb-6 opacity-50 cursor-not-allowed" />

        <div className="flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={isSaving} className="btn-primary px-6 py-2 disabled:opacity-50">
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProfileSettings
