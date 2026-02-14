# 🏰 Battala Hub

A production-grade Discord alternative featuring real-time chat, voice channels with WebRTC, file uploads, custom emojis, and more. Built with modern web technologies and fully containerized with Docker.

![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)
![WebRTC](https://img.shields.io/badge/WebRTC-333333?style=flat&logo=webrtc&logoColor=white)

## ✨ Features

### 💬 Real-Time Chat
- Instant messaging with Socket.IO WebSockets
- Edit and delete your own messages (inline editing)
- Image/file attachments with preview before sending
- Custom emoji system per server (`:emoji_name:` syntax)
- Typing indicators
- Message notifications with toggleable sounds

### 🎤 Voice Channels
- WebRTC peer-to-peer voice communication
- Mute / Deafen / Disconnect controls
- Screen sharing with stream viewing
- Connection quality indicator (ping, packet loss)
- Join/leave/disconnect sound effects
- Users visible under voice channels in sidebar

### 🖥️ Server Management
- Create and manage multiple servers
- Server settings (name, description, icon upload)
- Create, edit, and delete text/voice channels
- Invite system with shareable codes
- Role-based membership

### 👤 User Profiles
- Profile settings with avatar upload
- Discord-style member profile popovers
- Online/offline status indicators
- Display name customization

### ⚙️ App Settings
- **Audio**: Microphone and headset selection, mic test with volume meter
- **Keybinds**: Configurable shortcuts for mute, deafen, disconnect
- **Notifications**: Toggle message notification sounds

### 🎨 Design
- Dark theme inspired by Discord
- Responsive layout with proper scrolling
- Smooth animations and transitions
- Custom scrollbars

## 🏗️ Architecture

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│   Frontend   │────▶│   Backend    │────▶│ PostgreSQL  │
│  React+Vite  │     │   NestJS     │     │   (Prisma)  │
│  Port 3000   │     │  Port 4000   │     │  Port 5432  │
└─────────────┘     └──────┬───────┘     └────────────┘
                           │
                    ┌──────┴───────┐
                    │              │
              ┌─────▼─────┐ ┌─────▼─────┐
              │   MinIO    │ │  Coturn   │
              │ S3 Storage │ │ TURN/STUN │
              │ Port 9000  │ │ Port 3478 │
              └───────────┘ └───────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Zustand |
| Backend | NestJS, TypeScript, Prisma ORM, Socket.IO |
| Database | PostgreSQL 15 |
| Storage | MinIO (S3-compatible) |
| Voice/Video | WebRTC + Coturn TURN/STUN server |
| Deployment | Docker Compose |

## 🚀 Quick Start

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/Sliv3er/BattalaHub.git
cd BattalaHub

# Start all services
docker compose up -d

# Wait for services to be healthy, then open:
# Frontend: http://localhost:3000
# Backend API: http://localhost:4000/api/docs (Swagger)
# MinIO Console: http://localhost:9001
```

### Default Ports

| Service | Port |
|---------|------|
| Frontend | 3000 |
| Backend API | 4000 |
| PostgreSQL | 5432 |
| MinIO API | 9000 |
| MinIO Console | 9001 |
| Coturn STUN/TURN | 3478 |

## 📁 Project Structure

```
battala-hub/
├── backend/                 # NestJS API server
│   ├── prisma/
│   │   └── schema.prisma    # Database schema (12+ models)
│   ├── src/
│   │   ├── auth/            # JWT authentication
│   │   ├── channels/        # Channel CRUD
│   │   ├── database/        # Prisma service
│   │   ├── emojis/          # Custom emoji system
│   │   ├── messages/        # Message CRUD + reactions
│   │   ├── servers/         # Server management + invites
│   │   ├── storage/         # MinIO file uploads
│   │   ├── users/           # User profiles
│   │   ├── voice/           # Voice channel management
│   │   ├── websocket/       # Socket.IO gateways (chat + voice)
│   │   └── main.ts          # App bootstrap
│   └── Dockerfile
├── frontend/                # React SPA
│   ├── src/
│   │   ├── api/             # Axios client
│   │   ├── components/      # UI components
│   │   │   ├── AppSettings.tsx
│   │   │   ├── ChannelsSidebar.tsx
│   │   │   ├── ChatArea.tsx
│   │   │   ├── MembersList.tsx
│   │   │   ├── ProfileSettings.tsx
│   │   │   ├── ServerSettings.tsx
│   │   │   └── VoiceChannel.tsx
│   │   ├── pages/           # Route pages
│   │   ├── stores/          # Zustand state management
│   │   │   ├── authStore.ts
│   │   │   ├── settingsStore.ts
│   │   │   ├── socketStore.ts
│   │   │   └── voiceStore.ts
│   │   └── main.tsx
│   └── Dockerfile
├── coturn/                  # TURN server config
├── docker-compose.yml       # Full stack orchestration
└── README.md
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login
- `POST /api/auth/logout` — Logout
- `GET /api/auth/me` — Get current user

### Servers
- `POST /api/servers` — Create server
- `GET /api/servers` — List user's servers
- `GET /api/servers/:id` — Get server details
- `PATCH /api/servers/:id` — Update server
- `DELETE /api/servers/:id` — Delete server
- `POST /api/servers/:id/join` — Join server
- `POST /api/servers/:id/invites` — Create invite
- `POST /api/servers/join/:inviteCode` — Join via invite

### Channels
- `POST /api/channels/:serverId` — Create channel
- `GET /api/channels/server/:serverId` — List channels
- `PATCH /api/channels/:id` — Update channel
- `DELETE /api/channels/:id` — Delete channel

### Messages
- `POST /api/messages/channel/:channelId` — Send message
- `GET /api/messages/channel/:channelId` — Get messages
- `PATCH /api/messages/:id` — Edit message
- `DELETE /api/messages/:id` — Delete message
- `POST /api/messages/:id/reactions` — Add reaction

### Voice
- `GET /api/voice/ice-servers` — Get ICE servers
- `POST /api/voice/channels/:channelId/join` — Join voice
- `DELETE /api/voice/leave` — Leave voice
- `GET /api/voice/channels/:channelId/users` — Get voice users

### Emojis
- `POST /api/emojis/:serverId` — Upload custom emoji
- `GET /api/emojis/:serverId` — List server emojis
- `DELETE /api/emojis/:id` — Delete emoji

### Storage
- `POST /api/storage/upload` — Upload file (max 10MB)

## 🔧 WebSocket Events

### Chat Namespace (default)
| Event | Direction | Description |
|-------|-----------|-------------|
| `join_channel` | Client → Server | Join a text channel |
| `leave_channel` | Client → Server | Leave a text channel |
| `send_message` | Client → Server | Send a message |
| `edit_message` | Client → Server | Edit a message |
| `delete_message` | Client → Server | Delete a message |
| `add_reaction` | Client → Server | Add emoji reaction |
| `typing_start` | Client → Server | Start typing indicator |
| `new_message` | Server → Client | New message received |
| `message_updated` | Server → Client | Message was edited |
| `message_deleted` | Server → Client | Message was deleted |
| `user_typing` | Server → Client | User is typing |

### Voice Namespace (`/voice`)
| Event | Direction | Description |
|-------|-----------|-------------|
| `join_voice` | Client → Server | Join voice channel |
| `leave_voice` | Client → Server | Leave voice channel |
| `webrtc_offer` | Bidirectional | WebRTC SDP offer |
| `webrtc_answer` | Bidirectional | WebRTC SDP answer |
| `webrtc_ice_candidate` | Bidirectional | ICE candidate exchange |
| `user_joined_voice` | Server → Client | User joined voice |
| `user_left_voice` | Server → Client | User left voice |

## 🗃️ Database Schema

Key models: **User**, **Server**, **ServerMember**, **Role**, **Channel** (TEXT/VOICE), **Message**, **Reaction**, **Attachment**, **Emoji**, **Invite**, **VoiceSession**, **TypingIndicator**

See `backend/prisma/schema.prisma` for full schema.

## 🔒 Environment Variables

All configured via `docker-compose.yml`. Key variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Set in compose |
| `JWT_SECRET` | JWT signing key | Set in compose |
| `MINIO_ENDPOINT` | MinIO internal hostname | `minio` |
| `MINIO_PUBLIC_URL` | MinIO public URL for browser | `http://localhost:9000` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |
| `TURN_SERVER_URL` | Coturn TURN server URL | `turn:coturn:3478` |

## 📜 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
