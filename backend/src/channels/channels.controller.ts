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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Channels')
@Controller('channels')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post(':serverId')
  @ApiOperation({ summary: 'Create a channel in a server' })
  @ApiResponse({ status: 201, description: 'Channel created successfully' })
  create(
    @Param('serverId') serverId: string,
    @Body() createChannelDto: CreateChannelDto,
    @Request() req,
  ) {
    return this.channelsService.create(createChannelDto, serverId, req.user.id);
  }

  @Get('server/:serverId')
  @ApiOperation({ summary: 'Get all channels in a server' })
  @ApiResponse({ status: 200, description: 'Channels retrieved successfully' })
  findAll(@Param('serverId') serverId: string, @Request() req) {
    return this.channelsService.findAll(serverId, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get channel by ID' })
  @ApiResponse({ status: 200, description: 'Channel found' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.channelsService.findOne(id, req.user.id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get channel members' })
  @ApiResponse({ status: 200, description: 'Members retrieved successfully' })
  getMembers(@Param('id') id: string, @Request() req) {
    return this.channelsService.getChannelMembers(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update channel (server owner only)' })
  @ApiResponse({ status: 200, description: 'Channel updated successfully' })
  @ApiResponse({ status: 403, description: 'Only server owner can update' })
  update(
    @Param('id') id: string,
    @Body() updateChannelDto: UpdateChannelDto,
    @Request() req,
  ) {
    return this.channelsService.update(id, updateChannelDto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete channel (server owner only)' })
  @ApiResponse({ status: 200, description: 'Channel deleted successfully' })
  @ApiResponse({ status: 403, description: 'Only server owner can delete' })
  remove(@Param('id') id: string, @Request() req) {
    return this.channelsService.remove(id, req.user.id);
  }
}