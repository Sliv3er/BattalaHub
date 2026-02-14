# Battala Hub Installation Guide

This guide will help you get Battala Hub running locally with `docker compose up`.

## Prerequisites

- **Docker** (version 20.10 or higher)
- **Docker Compose** (version 2.0 or higher)
- **Git** (for cloning the repository)

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd battala-hub
   ```

2. **Start all services:**
   ```bash
   docker compose up -d
   ```

3. **Wait for services to start** (this may take a few minutes on first run)

4. **Access the application:**
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:3001
   - **API Documentation**: http://localhost:3001/api/docs
   - **MinIO Console**: http://localhost:9001 (admin/password123)

## User Flow Testing

Once the application is running, test the complete user flow:

### 1. Register Account
- Navigate to http://localhost:3000
- Click "Sign up"
- Fill in the registration form:
  - Username: `testuser`
  - Email: `test@example.com`
  - Password: `password123`
  - Display Name: `Test User`
- Click "Create Account"

### 2. Create Server
- After successful login, you'll see the main interface
- Click the "+" button in the servers sidebar (leftmost panel)
- Enter server name: `My Gaming Server`
- Click "Create"

### 3. Create Channel
- The server will be created with a default "general" channel
- Additional channels can be created by server owners

### 4. Send Message
- Click on a channel in the channels sidebar
- Type a message in the input field at the bottom
- Press Enter or click the send button
- Your message appears in real-time

### 5. Upload Image
- In a channel, click the attachment button (if implemented)
- Select an image file
- The image uploads to MinIO and displays in chat

### 6. React to Message
- Hover over any message
- Click the reaction button
- Select an emoji
- The reaction appears on the message

### 7. Join Voice Channel
- Click on a voice channel (speaker icon)
- Your browser will request microphone permission
- Accept the permission to join the voice chat
- Other users in the same voice channel can hear you

### 8. Talk in Voice
- Once connected to a voice channel, speak into your microphone
- Other users will hear you in real-time via WebRTC
- The voice chat uses STUN/TURN servers for connectivity

## Architecture Overview

### Services

- **Frontend** (Port 3000): React + TypeScript + TailwindCSS
- **Backend** (Port 3001): NestJS + Socket.io + WebRTC
- **Database** (Port 5432): PostgreSQL with full schema
- **Storage** (Port 9000): MinIO for file uploads
- **TURN Server** (Port 3478): Coturn for WebRTC connectivity

### Real-time Features

- **WebSocket Communication**: Socket.io for real-time messaging
- **WebRTC Voice Chat**: Peer-to-peer voice communication
- **Typing Indicators**: See who's typing in real-time
- **Online Status**: Live user presence updates
- **Message Reactions**: Real-time emoji reactions

### Security Features

- **JWT Authentication**: Secure token-based auth
- **bcrypt Password Hashing**: Industry-standard password security
- **CORS Protection**: Configured for development
- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Comprehensive data validation

## Development

### Backend Development
```bash
cd backend
npm install
npm run start:dev
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

### Database Management
```bash
# Generate Prisma client
cd backend
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Reset database (development)
npx prisma migrate reset
```

## Environment Variables

The application works out of the box with Docker Compose, but you can customize these environment variables:

### Backend (.env)
```env
NODE_ENV=production
DATABASE_URL=postgresql://battala:battala123@postgres:5432/battala_hub
JWT_SECRET=super-secret-jwt-key-change-in-production
JWT_EXPIRATION=24h
CORS_ORIGIN=http://localhost:3000
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=password123
MINIO_BUCKET=battala-uploads
MINIO_USE_SSL=false
TURN_SERVER_URL=turn:coturn:3478
TURN_SERVER_USERNAME=battala
TURN_SERVER_CREDENTIAL=battala123
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_WS_URL=ws://localhost:3001
```

## Troubleshooting

### Services Won't Start
```bash
# Check service logs
docker compose logs backend
docker compose logs frontend
docker compose logs postgres

# Restart services
docker compose restart
```

### Database Issues
```bash
# Reset database
docker compose down -v
docker compose up -d postgres
# Wait for postgres to start
docker compose up -d
```

### Voice Chat Not Working
1. Ensure browser permissions for microphone
2. Check that coturn service is running:
   ```bash
   docker compose logs coturn
   ```
3. For production, configure proper TURN server credentials

### File Uploads Failing
1. Check MinIO service status:
   ```bash
   docker compose logs minio
   ```
2. Verify bucket creation:
   ```bash
   docker compose logs createbucket
   ```

## Production Deployment

For production deployment:

1. **Change all default passwords and secrets**
2. **Configure proper CORS origins**
3. **Set up SSL certificates**
4. **Configure external TURN server**
5. **Use managed database service**
6. **Set up proper backup strategy**
7. **Configure monitoring and logging**

## API Documentation

Once running, visit http://localhost:3001/api/docs for comprehensive API documentation with interactive testing capabilities.

---

## Support

If you encounter any issues:

1. Check the logs: `docker compose logs [service-name]`
2. Ensure all prerequisites are installed
3. Verify Docker and Docker Compose are running
4. Try restarting services: `docker compose restart`

The application should be fully functional with all features working after following this guide!