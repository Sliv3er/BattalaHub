import { useState, useEffect, useRef } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { clsx } from 'clsx'
import { useSettingsStore } from '../stores/settingsStore'

interface AppSettingsProps {
  onClose: () => void
}

type Tab = 'audio' | 'keybinds' | 'notifications'

const AppSettings = ({ onClose }: AppSettingsProps) => {
  const [tab, setTab] = useState<Tab>('audio')

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-dark-300 rounded-2xl w-[640px] max-h-[80vh] flex flex-col animate-scaleIn">
        <div className="flex items-center justify-between p-5 border-b border-dark-100">
          <h2 className="text-xl font-bold text-white">App Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><XMarkIcon className="w-6 h-6" /></button>
        </div>
        <div className="flex border-b border-dark-100">
          {(['audio', 'keybinds', 'notifications'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={clsx('px-5 py-3 text-sm font-medium capitalize transition-colors',
                tab === t ? 'text-white border-b-2 border-primary-500' : 'text-gray-400 hover:text-white')}>
              {t}
            </button>
          ))}
        </div>
        <div className="p-5 overflow-y-auto flex-1">
          {tab === 'audio' && <AudioTab />}
          {tab === 'keybinds' && <KeybindsTab />}
          {tab === 'notifications' && <NotificationsTab />}
        </div>
      </div>
    </div>
  )
}

const AudioTab = () => {
  const { selectedMic, selectedHeadset, setSelectedMic, setSelectedHeadset } = useSettingsStore()
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

  return (
    <div className="space-y-5">
      <div>
        <label className="text-sm text-gray-400 mb-1 block">Input Device (Microphone)</label>
        <select value={selectedMic} onChange={e => setSelectedMic(e.target.value)}
          className="w-full input bg-dark-200 text-white">
          <option value="">Default</option>
          {inputs.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Microphone'}</option>)}
        </select>
      </div>
      <div>
        <label className="text-sm text-gray-400 mb-1 block">Output Device (Headset/Speakers)</label>
        <select value={selectedHeadset} onChange={e => setSelectedHeadset(e.target.value)}
          className="w-full input bg-dark-200 text-white">
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
