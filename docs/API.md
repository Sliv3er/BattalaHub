# Battala Hub API Documentation

## Base URL
```
http://localhost:3001/api
```

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Authentication

#### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123",
  "displayName": "Test User"
}
```

**Response:**
```json
{
  "accessToken": "jwt-token-here",
  "user": {
    "id": "user-id",
    "username": "testuser",
    "email": "test@example.com",
    "displayName": "Test User",
    "avatar": null,
    "isOnline": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### POST /auth/login
Login with existing credentials.

**Request Body:**
```json
{
  "identifier": "testuser", // username or email
  "password": "password123"
}
```

#### GET /auth/me
Get current user profile (requires auth).

### Servers

#### GET /servers
Get all servers the user is a member of.

#### POST /servers
Create a new server.

**Request Body:**
```json
{
  "name": "My Gaming Server",
  "description": "A place for gamers",
  "isPublic": false
}
```

#### GET /servers/:id
Get server details by ID.

#### PATCH /servers/:id
Update server (owner only).

#### DELETE /servers/:id
Delete server (owner only).

#### POST /servers/:id/invites
Create an invite for the server.

#### POST /servers/join/:inviteCode
Join a server by invite code.

### Channels

#### GET /channels/server/:serverId
Get all channels in a server.

#### POST /channels/:serverId
Create a channel in a server.

**Request Body:**
```json
{
  "name": "general",
  "type": "TEXT", // TEXT or VOICE
  "description": "General discussion",
  "isPrivate": false
}
```

#### GET /channels/:id
Get channel details.

#### GET /channels/:id/members
Get channel/server members.

### Messages

#### GET /messages/channel/:channelId
Get messages from a channel.

Query Parameters:
- `take`: Number of messages to fetch (default: 50)
- `skip`: Number of messages to skip (default: 0)

#### POST /messages/channel/:channelId
Send a message to a channel.

**Request Body:**
```json
{
  "content": "Hello everyone! 👋",
  "type": "USER"
}
```

#### PATCH /messages/:id
Edit a message (author only, within 10 minutes).

#### DELETE /messages/:id
Delete a message (author or server owner).

#### POST /messages/:id/reactions
Add/remove reaction to a message.

**Request Body:**
```json
{
  "emoji": "👍"
}
```

### Voice

#### GET /voice/ice-servers
Get ICE servers configuration for WebRTC.

#### POST /voice/channels/:channelId/join
Join a voice channel.

#### DELETE /voice/leave
Leave current voice channel.

#### GET /voice/channels/:channelId/users
Get users in a voice channel.

### File Upload

#### POST /storage/upload
Upload a file.

**Request:** Multipart form data with `file` field.

**Response:**
```json
{
  "url": "http://localhost:9000/battala-uploads/user-id/file.png",
  "filename": "image.png",
  "size": 12345,
  "mimeType": "image/png"
}
```

## WebSocket Events

Connect to: `ws://localhost:3001`

### Client → Server Events

#### join_channel
```json
{ "channelId": "channel-id" }
```

#### leave_channel
```json
{ "channelId": "channel-id" }
```

#### send_message
```json
{
  "channelId": "channel-id",
  "content": "Hello world!"
}
```

#### edit_message
```json
{
  "messageId": "message-id",
  "content": "Updated message"
}
```

#### delete_message
```json
{ "messageId": "message-id" }
```

#### add_reaction
```json
{
  "messageId": "message-id",
  "emoji": "👍"
}
```

#### typing_start
```json
{ "channelId": "channel-id" }
```

#### typing_stop
```json
{ "channelId": "channel-id" }
```

### Server → Client Events

#### new_message
Received when a new message is sent.
```json
{
  "id": "message-id",
  "content": "Hello!",
  "author": {
    "id": "user-id",
    "username": "testuser",
    "displayName": "Test User",
    "avatar": null,
    "isOnline": true
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "reactions": [],
  "attachments": []
}
```

#### message_updated
#### message_deleted
#### reaction_updated
#### user_typing
#### user_stopped_typing

## Voice WebSocket (Separate namespace: `/voice`)

### Client → Server Events

#### join_voice
```json
{ "channelId": "channel-id" }
```

#### leave_voice
No data required.

#### webrtc_offer
```json
{
  "offer": { /* WebRTC offer */ },
  "targetUserId": "user-id",
  "channelId": "channel-id"
}
```

#### webrtc_answer
#### webrtc_ice_candidate

### Server → Client Events

#### user_joined_voice
#### user_left_voice
#### ice_servers
#### webrtc_offer
#### webrtc_answer
#### webrtc_ice_candidate

## Error Responses

All endpoints may return these error formats:

**400 Bad Request:**
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

**401 Unauthorized:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**403 Forbidden:**
```json
{
  "statusCode": 403,
  "message": "You don't have permission to perform this action"
}
```

**404 Not Found:**
```json
{
  "statusCode": 404,
  "message": "Resource not found"
}
```

## Rate Limits

- **Short**: 3 requests per second
- **Medium**: 20 requests per 10 seconds  
- **Long**: 100 requests per minute

Rate limit headers are included in responses:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`