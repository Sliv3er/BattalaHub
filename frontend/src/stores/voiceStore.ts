import { create } from 'zustand'
import { io, Socket } from 'socket.io-client'
import { useSettingsStore } from './settingsStore'

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:4000'

interface VoiceUser {
  id: string
  username: string
  displayName: string
  avatar?: string
  isMuted?: boolean
  isDeafened?: boolean
  isScreenSharing?: boolean
}

interface VoiceState {
  voiceSocket: Socket | null
  currentChannelId: string | null
  connectedUsers: VoiceUser[]
  isMuted: boolean
  isDeafened: boolean
  isScreenSharing: boolean
  peerConnections: Map<string, RTCPeerConnection>
  localStream: MediaStream | null
  screenStream: MediaStream | null
  pingMs: number | null
  connectionQuality: 'good' | 'medium' | 'poor'
  userVolumes: Record<string, number>
  gainNodes: Map<string, GainNode>
  streamQuality: { fps: number; height: number }
  isSpeaking: boolean
  speakingUsers: Set<string>
  remoteStreams: Map<string, MediaStream>
  watchingUserId: string | null
  setStreamQuality: (fps: number, height: number) => void
  setWatchingUser: (userId: string | null) => void
  initVoiceSocket: () => void
  joinVoice: (channelId: string) => Promise<void>
  leaveVoice: () => void
  toggleMute: () => void
  toggleDeafen: () => void
  toggleScreenShare: () => Promise<void>
  setUserVolume: (userId: string, volume: number) => void
}

// Sound generation using Web Audio API (shared context)
let audioCtx: AudioContext | null = null
const getAudioContext = (): AudioContext => {
  if (!audioCtx) audioCtx = new AudioContext()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

const playTone = async (frequencies: [number, number][], duration: number, volume = 0.3) => {
  try {
    const ctx = getAudioContext()
    if (ctx.state === 'suspended') await ctx.resume()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    let t = ctx.currentTime
    for (const [freq, dur] of frequencies) {
      osc.frequency.setValueAtTime(freq, t)
      t += dur
    }
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
  } catch (e) { console.warn('[Sound] playTone failed:', e) }
}

// Ensure AudioContext is resumed on first user interaction
if (typeof window !== 'undefined') {
  const resumeCtx = () => {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume()
    document.removeEventListener('click', resumeCtx)
    document.removeEventListener('keydown', resumeCtx)
  }
  document.addEventListener('click', resumeCtx)
  document.addEventListener('keydown', resumeCtx)
}

export const playJoinSound = () => playTone([[400, 0.07], [600, 0.07], [800, 0.06]], 0.2, 0.25)
export const playLeaveSound = () => playTone([[600, 0.07], [400, 0.07], [300, 0.06]], 0.2, 0.25)
export const playDisconnectSound = () => playTone([[300, 0.1], [200, 0.15]], 0.25, 0.3)
export const playScreenShareSound = () => playTone([[500, 0.05], [700, 0.05], [900, 0.05], [1100, 0.05]], 0.2, 0.2)
export const playMuteSound = () => playTone([[400, 0.06], [300, 0.06]], 0.15, 0.15)
export const playUnmuteSound = () => playTone([[300, 0.06], [400, 0.06]], 0.15, 0.15)
export const playDeafenSound = () => playTone([[500, 0.06], [350, 0.06], [250, 0.06]], 0.15, 0.18)
export const playUndeafenSound = () => playTone([[250, 0.06], [350, 0.06], [500, 0.06]], 0.15, 0.18)
export const playStreamStopSound = () => playTone([[800, 0.06], [500, 0.06], [300, 0.08]], 0.15, 0.2)
export const playStreamWatchSound = () => playTone([[600, 0.05], [800, 0.05], [1000, 0.05]], 0.12, 0.15)
export const playNotificationSound = () => playTone([[880, 0.06], [1100, 0.06]], 0.12, 0.2)

let iceServers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]
let statsInterval: ReturnType<typeof setInterval> | null = null

export const useVoiceStore = create<VoiceState>((set, get) => ({
  voiceSocket: null,
  currentChannelId: null,
  connectedUsers: [],
  isMuted: false,
  isDeafened: false,
  isScreenSharing: false,
  peerConnections: new Map(),
  localStream: null,
  screenStream: null,
  pingMs: null,
  connectionQuality: 'good',
  userVolumes: {},
  gainNodes: new Map(),
  streamQuality: { fps: 30, height: 720 },
  isSpeaking: false,
  speakingUsers: new Set<string>(),
  remoteStreams: new Map<string, MediaStream>(),
  watchingUserId: null,

  setWatchingUser: (userId: string | null) => {
    if (userId) playStreamWatchSound(); else playStreamStopSound()
    set({ watchingUserId: userId })
  },

  setStreamQuality: (fps: number, height: number) => {
    set({ streamQuality: { fps, height } })
    useSettingsStore.getState().setStreamQuality(fps, height)
  },

  setUserVolume: (userId: string, volume: number) => {
    const gainNode = get().gainNodes.get(userId)
    if (gainNode) gainNode.gain.value = volume
    set({ userVolumes: { ...get().userVolumes, [userId]: volume } })
  },

  initVoiceSocket: () => {
    const existing = get().voiceSocket
    if (existing?.connected) return

    const token = localStorage.getItem('token')
    if (!token) return

    const socket = io(`${WS_URL}/voice`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => console.log('🎤 Voice socket connected'))

    socket.on('ice_servers', (servers: RTCIceServer[]) => {
      iceServers = servers
    })

    socket.on('user_joined_voice', ({ user, channelId }: { user: VoiceUser; channelId: string }) => {
      const state = get()
      if (state.currentChannelId === channelId) {
        set({ connectedUsers: [...state.connectedUsers.filter(u => u.id !== user.id), user] })
        playJoinSound()
        // Create peer connection to new user
        createPeerConnection(user.id, true, socket, state)
      }
    })

    socket.on('user_left_voice', ({ userId, channelId }: { userId: string; channelId: string }) => {
      const state = get()
      if (state.currentChannelId === channelId) {
        set({ connectedUsers: state.connectedUsers.filter(u => u.id !== userId) })
        playLeaveSound()
        const pc = state.peerConnections.get(userId)
        if (pc) { pc.close(); state.peerConnections.delete(userId) }
      }
    })

    socket.on('webrtc_offer', async ({ offer, fromUserId, targetUserId }: any) => {
      const state = get()
      const myId = JSON.parse(atob(token.split('.')[1])).sub
      if (targetUserId !== myId) return
      const pc = createPeerConnection(fromUserId, false, socket, state)
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      socket.emit('webrtc_answer', {
        answer,
        targetUserId: fromUserId,
        channelId: state.currentChannelId,
      })
    })

    socket.on('webrtc_answer', async ({ answer, fromUserId, targetUserId }: any) => {
      const myId = JSON.parse(atob(token.split('.')[1])).sub
      if (targetUserId !== myId) return
      const pc = get().peerConnections.get(fromUserId)
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer))
    })

    socket.on('voice_state_update', ({ userId, channelId, isMuted, isDeafened, isScreenSharing }: any) => {
      const state = get()
      if (state.currentChannelId === channelId) {
        set({
          connectedUsers: state.connectedUsers.map(u =>
            u.id === userId ? { ...u, isMuted, isDeafened, isScreenSharing } : u
          ),
        })
      }
    })

    socket.on('webrtc_ice_candidate', async ({ candidate, fromUserId, targetUserId }: any) => {
      const myId = JSON.parse(atob(token.split('.')[1])).sub
      if (targetUserId !== myId) return
      const pc = get().peerConnections.get(fromUserId)
      if (pc && candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate))
    })

    socket.on('voice_speaking', ({ userId, isSpeaking }: { userId: string; isSpeaking: boolean }) => {
      const s = get().speakingUsers
      const next = new Set(s)
      if (isSpeaking) next.add(userId); else next.delete(userId)
      set({ speakingUsers: next })
    })

    socket.on('force_disconnect', ({ userId: targetId }: { userId: string }) => {
      const myId = JSON.parse(atob(token.split('.')[1])).sub
      if (targetId === myId) get().leaveVoice()
    })

    socket.on('server_mute', ({ userId: targetId }: { userId: string }) => {
      const myId = JSON.parse(atob(token.split('.')[1])).sub
      if (targetId === myId && !get().isMuted) get().toggleMute()
    })

    socket.on('server_deafen', ({ userId: targetId }: { userId: string }) => {
      const myId = JSON.parse(atob(token.split('.')[1])).sub
      if (targetId === myId && !get().isDeafened) get().toggleDeafen()
    })

    set({ voiceSocket: socket })
  },

  joinVoice: async (channelId: string) => {
    const state = get()
    if (state.currentChannelId === channelId) return  // Already in this channel
    if (state.currentChannelId) state.leaveVoice()

    state.initVoiceSocket()
    const { voiceSocket } = get()
    if (!voiceSocket) return

    const micId = useSettingsStore.getState().selectedMic
    const constraints: MediaStreamConstraints = { audio: micId ? { deviceId: { exact: micId } } : true }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      set({ localStream: stream, currentChannelId: channelId, connectedUsers: [] })
      voiceSocket.emit('join_voice', { channelId })

      // Speaking detection via audio analyser
      try {
        const actx = getAudioContext()
        const src = actx.createMediaStreamSource(stream)
        const analyser = actx.createAnalyser()
        analyser.fftSize = 512
        analyser.smoothingTimeConstant = 0.4
        src.connect(analyser)
        const dataArr = new Uint8Array(analyser.frequencyBinCount)
        const speakCheck = setInterval(() => {
          if (!get().currentChannelId) { clearInterval(speakCheck); return }
          analyser.getByteFrequencyData(dataArr)
          const avg = dataArr.reduce((a, b) => a + b, 0) / dataArr.length
          const speaking = avg > 15 && !get().isMuted
          if (speaking !== get().isSpeaking) {
            set({ isSpeaking: speaking })
            // Broadcast speaking state to others
            get().voiceSocket?.emit('voice_speaking', { channelId: get().currentChannelId, isSpeaking: speaking })
          }
        }, 100)
      } catch {}

      // Start stats polling
      if (statsInterval) clearInterval(statsInterval)
      statsInterval = setInterval(async () => {
        const pcs = get().peerConnections
        for (const pc of pcs.values()) {
          try {
            const stats = await pc.getStats()
            stats.forEach((report: any) => {
              if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                const rtt = report.currentRoundTripTime
                if (rtt != null) {
                  const ms = Math.round(rtt * 1000)
                  set({
                    pingMs: ms,
                    connectionQuality: ms < 100 ? 'good' : ms < 250 ? 'medium' : 'poor',
                  })
                }
              }
            })
          } catch {}
        }
      }, 2000)
    } catch (err) {
      console.error('Failed to get mic:', err)
    }
  },

  leaveVoice: () => {
    playDisconnectSound()
    const { voiceSocket, localStream, screenStream, peerConnections, currentChannelId, gainNodes } = get()
    gainNodes.clear()
    if (statsInterval) { clearInterval(statsInterval); statsInterval = null }
    localStream?.getTracks().forEach(t => t.stop())
    screenStream?.getTracks().forEach(t => t.stop())
    peerConnections.forEach(pc => pc.close())
    if (voiceSocket && currentChannelId) voiceSocket.emit('leave_voice', {})
    set({
      currentChannelId: null,
      connectedUsers: [],
      localStream: null,
      screenStream: null,
      peerConnections: new Map(),
      isMuted: false,
      isDeafened: false,
      isScreenSharing: false,
      pingMs: null,
      remoteStreams: new Map(),
      watchingUserId: null,
    })
  },

  toggleMute: () => {
    const { localStream, isMuted, voiceSocket, currentChannelId, isDeafened, isScreenSharing } = get()
    if (localStream) {
      localStream.getAudioTracks().forEach(t => { t.enabled = isMuted })
    }
    const newMuted = !isMuted
    if (newMuted) playMuteSound(); else playUnmuteSound()
    set({ isMuted: newMuted })
    if (voiceSocket && currentChannelId) {
      voiceSocket.emit('voice_state_update', { channelId: currentChannelId, isMuted: newMuted, isDeafened, isScreenSharing })
    }
  },

  toggleDeafen: () => {
    const { isDeafened, peerConnections, voiceSocket, currentChannelId, isMuted, isScreenSharing } = get()
    peerConnections.forEach(pc => {
      pc.getReceivers().forEach(r => {
        if (r.track?.kind === 'audio') r.track.enabled = isDeafened
      })
    })
    const newDeafened = !isDeafened
    if (newDeafened) playDeafenSound(); else playUndeafenSound()
    set({ isDeafened: newDeafened })
    if (voiceSocket && currentChannelId) {
      voiceSocket.emit('voice_state_update', { channelId: currentChannelId, isMuted, isDeafened: newDeafened, isScreenSharing })
    }
  },

  toggleScreenShare: async () => {
    const { isScreenSharing, peerConnections, screenStream, voiceSocket, currentChannelId, isMuted, isDeafened } = get()
    if (isScreenSharing) {
      screenStream?.getTracks().forEach(t => t.stop())
      playStreamStopSound()
      set({ isScreenSharing: false, screenStream: null })
      if (voiceSocket && currentChannelId) {
        voiceSocket.emit('voice_state_update', { channelId: currentChannelId, isMuted, isDeafened, isScreenSharing: false })
      }
    } else {
      try {
        const { fps, height } = get().streamQuality
        const display = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: fps, height: { ideal: height } }, audio: true })
        playScreenShareSound()
        const videoTrack = display.getVideoTracks()[0]
        const socket = get().voiceSocket
        peerConnections.forEach((pc, peerId) => {
          pc.addTrack(videoTrack, display)
          // Renegotiate to send the new track
          pc.createOffer().then(offer => {
            pc.setLocalDescription(offer)
            socket?.emit('webrtc_offer', {
              offer,
              targetUserId: peerId,
              channelId: currentChannelId,
            })
          })
        })
        videoTrack.onended = () => {
          set({ isScreenSharing: false, screenStream: null })
          if (voiceSocket && currentChannelId) {
            voiceSocket.emit('voice_state_update', { channelId: currentChannelId, isMuted: get().isMuted, isDeafened: get().isDeafened, isScreenSharing: false })
          }
        }
        set({ isScreenSharing: true, screenStream: display })
        if (voiceSocket && currentChannelId) {
          voiceSocket.emit('voice_state_update', { channelId: currentChannelId, isMuted, isDeafened, isScreenSharing: true })
        }
      } catch {}
    }
  },
}))

function createPeerConnection(userId: string, initiator: boolean, socket: Socket, state: VoiceState): RTCPeerConnection {
  const existing = state.peerConnections.get(userId)
  if (existing) return existing

  const pc = new RTCPeerConnection({ iceServers })

  // Add local tracks
  if (state.localStream) {
    state.localStream.getTracks().forEach(track => pc.addTrack(track, state.localStream!))
  }

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit('webrtc_ice_candidate', {
        candidate: e.candidate,
        targetUserId: userId,
        channelId: state.currentChannelId,
      })
    }
  }

  pc.ontrack = (e) => {
    const store = useVoiceStore.getState()
    if (e.track.kind === 'video') {
      const streams = new Map(store.remoteStreams)
      streams.set(userId, e.streams[0])
      useVoiceStore.setState({ remoteStreams: streams })
    }
    if (e.track.kind === 'audio') {
      try {
        const ctx = getAudioContext()
        const source = ctx.createMediaStreamSource(e.streams[0])
        const gainNode = ctx.createGain()
        gainNode.gain.value = store.userVolumes[userId] || 1.0
        source.connect(gainNode)
        gainNode.connect(ctx.destination)
        store.gainNodes.set(userId, gainNode)
      } catch {
        const audio = new Audio()
        audio.srcObject = e.streams[0]
        audio.play().catch(() => {})
      }
    }
  }

  state.peerConnections.set(userId, pc)

  if (initiator) {
    pc.createOffer().then(offer => {
      pc.setLocalDescription(offer)
      socket.emit('webrtc_offer', {
        offer,
        targetUserId: userId,
        channelId: state.currentChannelId,
      })
    })
  }

  return pc
}
