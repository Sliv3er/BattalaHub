import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ServersService } from './servers.service';
import { CreateServerDto } from './dto/create-server.dto';
import { UpdateServerDto } from './dto/update-server.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Servers')
@Controller('servers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ServersController {
  constructor(private readonly serversService: ServersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new server' })
  @ApiResponse({ status: 201, description: 'Server created successfully' })
  create(@Body() createServerDto: CreateServerDto, @Request() req) {
    return this.serversService.create(createServerDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all servers the user is a member of' })
  @ApiResponse({ status: 200, description: 'Servers retrieved successfully' })
  findAll(@Request() req) {
    return this.serversService.findAll(req.user.id);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search servers by name' })
  @ApiResponse({ status: 200, description: 'Search results' })
  searchServers(@Query('name') name: string, @Request() req) {
    return this.serversService.searchByName(name, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get server by ID' })
  @ApiResponse({ status: 200, description: 'Server found' })
  @ApiResponse({ status: 404, description: 'Server not found' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.serversService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update server (owner only)' })
  @ApiResponse({ status: 200, description: 'Server updated successfully' })
  @ApiResponse({ status: 403, description: 'Only server owner can update' })
  update(
    @Param('id') id: string,
    @Body() updateServerDto: UpdateServerDto,
    @Request() req,
  ) {
    return this.serversService.update(id, updateServerDto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete server (owner only)' })
  @ApiResponse({ status: 200, description: 'Server deleted successfully' })
  @ApiResponse({ status: 403, description: 'Only server owner can delete' })
  remove(@Param('id') id: string, @Request() req) {
    return this.serversService.remove(id, req.user.id);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join a server directly' })
  @ApiResponse({ status: 201, description: 'Joined server successfully' })
  @ApiResponse({ status: 400, description: 'Already a member' })
  joinServer(@Param('id') serverId: string, @Request() req) {
    return this.serversService.joinServer(serverId, req.user.id);
  }

  @Delete(':id/leave')
  @ApiOperation({ summary: 'Leave a server' })
  @ApiResponse({ status: 200, description: 'Left server successfully' })
  @ApiResponse({ status: 400, description: 'Server owner cannot leave' })
  leaveServer(@Param('id') serverId: string, @Request() req) {
    return this.serversService.leaveServer(serverId, req.user.id);
  }

  @Get(':id/invites')
  @ApiOperation({ summary: 'Get server invites' })
  @ApiResponse({ status: 200, description: 'Invites retrieved successfully' })
  getInvites(@Param('id') serverId: string, @Request() req) {
    return this.serversService.getInvites(serverId, req.user.id);
  }

  @Post(':id/invites')
  @ApiOperation({ summary: 'Create an invite for the server' })
  @ApiResponse({ status: 201, description: 'Invite created successfully' })
  createInvite(
    @Param('id') serverId: string,
    @Body() createInviteDto: CreateInviteDto,
    @Request() req,
  ) {
    return this.serversService.createInvite(serverId, createInviteDto, req.user.id);
  }

  @Post('join/:inviteCode')
  @ApiOperation({ summary: 'Join a server by invite code' })
  @ApiResponse({ status: 201, description: 'Joined server successfully' })
  @ApiResponse({ status: 404, description: 'Invalid invite code' })
  @ApiResponse({ status: 400, description: 'Invite expired or maxed out' })
  joinByInvite(@Param('inviteCode') inviteCode: string, @Request() req) {
    return this.serversService.joinByInvite(inviteCode, req.user.id);
  }
}