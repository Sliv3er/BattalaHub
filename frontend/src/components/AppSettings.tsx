import { useState, useEffect, useRef } from 'react'
import { XMarkIcon, CameraIcon } from '@heroicons/react/24/outline'
import { clsx } from 'clsx'
import { useSettingsStore } from '../stores/settingsStore'
import { useAuthStore } from '../stores/authStore'
import client from '../api/client'
import toast from 'react-hot-toast'

interface AppSettingsProps {
  onClose: () => void
}

type Tab = 'account' | 'audio' | 'keybinds' | 'notifications'

const AppSettings = ({ onClose }: AppSettingsProps) => {
  const [tab, setTab] = useState<Tab>('account')

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-dark-400 rounded-2xl w-[800px] max-h-[85vh] flex animate-scaleIn overflow-hidden">
        {/* Left sidebar */}
        <div className="w-[180px] bg-dark-300 p-3 flex flex-col flex-shrink-0">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">User Settings</div>
          {([
            { id: 'account' as Tab, label: 'My Account' },
            { id: 'audio' as Tab, label: 'Audio & Video' },
            { id: 'keybinds' as Tab, label: 'Keybinds' },
            { id: 'notifications' as Tab, label: 'Notifications' },
          ]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={clsx('w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5',
                tab === t.id ? 'bg-primary-600/20 text-white' : 'text-gray-400 hover:text-white hover:bg-dark-200')}>
              {t.label}
            </button>
          ))}
        </div>
        {/* Right content */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between p-5 border-b border-dark-100">
            <h2 className="text-xl font-bold text-white">
              {tab === 'account' ? 'My Account' : tab === 'audio' ? 'Audio & Video' : tab === 'keybinds' ? 'Keybinds' : 'Notifications'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white"><XMarkIcon className="w-6 h-6" /></button>
          </div>
          <div className="p-5 overflow-y-auto flex-1">
            {tab === 'account' && <AccountTab />}
            {tab === 'audio' && <AudioTab />}
            {tab === 'keybinds' && <KeybindsTab />}
            {tab === 'notifications' && <NotificationsTab />}
          </div>
        </div>
      </div>
    </div>
  )
}

const AccountTab = () => {
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
      const res = await client.post('/storage/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setAvatar(res.data.url)
      toast.success('Avatar uploaded')
    } catch { toast.error('Failed to upload avatar') }
    finally { setIsUploading(false) }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await client.patch('/users/me', { displayName, avatar })
      updateUser({ displayName: res.data.displayName, avatar: res.data.avatar })
      toast.success('Profile updated')
    } catch { toast.error('Failed to update profile') }
    finally { setIsSaving(false) }
  }

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="flex items-center gap-6">
        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden ring-4 ring-dark-200">
            {avatar ? <img src={avatar} alt="Avatar" className="w-full h-full object-cover" /> : user?.displayName?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <CameraIcon className="w-6 h-6 text-white" />
          </div>
          <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
        </div>
        <div>
          <div className="text-white font-semibold text-lg">{user?.displayName}</div>
          <div className="text-gray-400 text-sm">@{user?.username}</div>
        </div>
      </div>
      {isUploading && <p className="text-sm text-gray-400">Uploading...</p>}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Display Name</label>
        <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full input" maxLength={50} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
        <input type="text" value={user?.username || ''} disabled className="w-full input opacity-50 cursor-not-allowed" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
        <input type="text" value={(user as any)?.email || ''} disabled className="w-full input opacity-50 cursor-not-allowed" />
      </div>
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={isSaving} className="btn-primary px-6 py-2 disabled:opacity-50">
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

const AudioTab = () => {
  const { selectedMic, selectedHeadset, setSelectedMic, setSelectedHeadset, streamFps, streamHeight, setStreamQuality } = useSettingsStore()
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [testing, setTesting] = useState(false)
  const [volume, setVolume] = useState(0)
  const streamRef = useRef<MediaStream | null>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(setDevices).catch(() => {})
    return () => { stopTest() }
  }, [])

  const inputs = devices.filter(d => d.kind === 'audioinput')
  const outputs = devices.filter(d => d.kind === 'audiooutput')

  const startTest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: selectedMic ? { deviceId: { exact: selectedMic } } : true })
      streamRef.current = stream
      setTesting(true)
      const ctx = new AudioContext()
      const src = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      src.connect(analyser)
      // Loopback: play mic audio through speakers so user can hear themselves
      src.connect(ctx.destination)
      const data = new Uint8Array(analyser.frequencyBinCount)
      const poll = () => {
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((a, b) => a + b, 0) / data.length
        setVolume(Math.min(100, Math.round(avg * 1.5)))
        animRef.current = requestAnimationFrame(poll)
      }
      poll()
    } catch {}
  }

  const stopTest = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    cancelAnimationFrame(animRef.current)
    setTesting(false)
    setVolume(0)
  }

  const qualityOptions = [
    { label: '720p 15 FPS', fps: 15, height: 720 },
    { label: '720p 30 FPS', fps: 30, height: 720 },
    { label: '1080p 30 FPS', fps: 30, height: 1080 },
    { label: '1080p 60 FPS', fps: 60, height: 1080 },
  ]

  return (
    <div className="space-y-5">
      <div>
        <label className="text-sm text-gray-400 mb-1 block">Input Device (Microphone)</label>
        <select value={selectedMic} onChange={e => setSelectedMic(e.target.value)} className="w-full input bg-dark-200 text-white">
          <option value="">Default</option>
          {inputs.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Microphone'}</option>)}
        </select>
      </div>
      <div>
        <label className="text-sm text-gray-400 mb-1 block">Output Device (Headset/Speakers)</label>
        <select value={selectedHeadset} onChange={e => setSelectedHeadset(e.target.value)} className="w-full input bg-dark-200 text-white">
          <option value="">Default</option>
          {outputs.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Speaker'}</option>)}
        </select>
      </div>
      <div>
        <button onClick={testing ? stopTest : startTest}
          className={clsx('px-4 py-2 rounded-lg font-medium text-sm', testing ? 'bg-red-600 text-white' : 'btn-primary')}>
          {testing ? 'Stop Test' : 'Test Microphone'}
        </button>
        {testing && (
          <div className="mt-3 h-3 bg-dark-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 transition-all duration-75 rounded-full" style={{ width: `${volume}%` }} />
          </div>
        )}
      </div>
      <div>
        <label className="text-sm text-gray-400 mb-2 block">Default Stream Quality</label>
        <div className="grid grid-cols-2 gap-2">
          {qualityOptions.map(opt => (
            <button key={opt.label} onClick={() => setStreamQuality(opt.fps, opt.height)}
              className={clsx('px-4 py-3 rounded-xl text-sm font-medium transition-colors border',
                streamFps === opt.fps && streamHeight === opt.height
                  ? 'border-primary-500 bg-primary-600/20 text-white'
                  : 'border-dark-100 bg-dark-200 text-gray-300 hover:text-white hover:border-gray-500')}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

const KeybindsTab = () => {
  const { keybinds, setKeybind } = useSettingsStore()
  const [recording, setRecording] = useState<string | null>(null)

  useEffect(() => {
    if (!recording) return
    const handler = (e: KeyboardEvent) => {
      e.preventDefault()
      const parts: string[] = []
      if (e.ctrlKey) parts.push('Ctrl')
      if (e.shiftKey) parts.push('Shift')
      if (e.altKey) parts.push('Alt')
      if (!['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) parts.push(e.code)
      if (parts.length > 0) {
        setKeybind(recording as any, parts.join('+'))
        setRecording(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [recording])

  return (
    <div className="space-y-3">
      {(Object.keys(keybinds) as Array<keyof typeof keybinds>).map(action => (
        <div key={action} className="flex items-center justify-between p-3 bg-dark-200 rounded-xl">
          <span className="text-white capitalize font-medium">{action}</span>
          <button onClick={() => setRecording(action)}
            className={clsx('px-3 py-1.5 rounded-lg text-sm font-mono',
              recording === action ? 'bg-primary-600 text-white animate-pulse' : 'bg-dark-100 text-gray-300 hover:text-white')}>
            {recording === action ? 'Press a key...' : keybinds[action]}
          </button>
        </div>
      ))}
    </div>
  )
}

const NotificationsTab = () => {
  const { notificationSounds, toggleNotificationSounds } = useSettingsStore()
  return (
    <div className="flex items-center justify-between p-3 bg-dark-200 rounded-xl">
      <div>
        <div className="text-white font-medium">Message Notification Sounds</div>
        <div className="text-sm text-gray-400">Play a sound when you receive a new message</div>
      </div>
      <button onClick={toggleNotificationSounds}
        className={clsx('w-12 h-7 rounded-full transition-colors relative',
          notificationSounds ? 'bg-primary-600' : 'bg-dark-100')}>
        <div className={clsx('w-5 h-5 bg-white rounded-full absolute top-1 transition-transform',
          notificationSounds ? 'translate-x-6' : 'translate-x-1')} />
      </button>
    </div>
  )
}

export default AppSettings
