import { create } from 'zustand'

interface Keybinds {
  mute: string
  deafen: string
  disconnect: string
}

interface SettingsState {
  notificationSounds: boolean
  keybinds: Keybinds
  selectedMic: string
  selectedHeadset: string
  toggleNotificationSounds: () => void
  setKeybind: (action: keyof Keybinds, combo: string) => void
  setSelectedMic: (deviceId: string) => void
  setSelectedHeadset: (deviceId: string) => void
}

const loadFromStorage = <T>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch { return fallback }
}

export const useSettingsStore = create<SettingsState>((set) => ({
  notificationSounds: loadFromStorage('settings:notificationSounds', true),
  keybinds: loadFromStorage<Keybinds>('settings:keybinds', { mute: 'KeyM', deafen: 'KeyD', disconnect: 'KeyE' }),
  selectedMic: loadFromStorage('settings:selectedMic', ''),
  selectedHeadset: loadFromStorage('settings:selectedHeadset', ''),

  toggleNotificationSounds: () => set(s => {
    const v = !s.notificationSounds
    localStorage.setItem('settings:notificationSounds', JSON.stringify(v))
    return { notificationSounds: v }
  }),

  setKeybind: (action, combo) => set(s => {
    const keybinds = { ...s.keybinds, [action]: combo }
    localStorage.setItem('settings:keybinds', JSON.stringify(keybinds))
    return { keybinds }
  }),

  setSelectedMic: (deviceId) => set(() => {
    localStorage.setItem('settings:selectedMic', JSON.stringify(deviceId))
    return { selectedMic: deviceId }
  }),

  setSelectedHeadset: (deviceId) => set(() => {
    localStorage.setItem('settings:selectedHeadset', JSON.stringify(deviceId))
    return { selectedHeadset: deviceId }
  }),
}))
