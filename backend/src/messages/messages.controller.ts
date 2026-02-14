import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { AddReactionDto } from './dto/add-reaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Messages')
@Controller('messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('channel/:channelId')
  @ApiOperation({ summary: 'Send a message to a channel' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  create(
    @Param('channelId') channelId: string,
    @Body() createMessageDto: CreateMessageDto,
    @Request() req,
  ) {
    return this.messagesService.create(createMessageDto, channelId, req.user.id);
  }

  @Get('channel/:channelId')
  @ApiOperation({ summary: 'Get messages from a channel' })
  @ApiQuery({ name: 'take', required: false, description: 'Number of messages to fetch' })
  @ApiQuery({ name: 'skip', required: false, description: 'Number of messages to skip' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  findAll(
    @Param('channelId') channelId: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
    @Request() req = { user: { id: '' } },
  ) {
    return this.messagesService.findAll(
      channelId,
      req.user.id,
      take ? parseInt(take, 10) : undefined,
      skip ? parseInt(skip, 10) : undefined,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a message' })
  @ApiResponse({ status: 200, description: 'Message updated successfully' })
  update(
    @Param('id') id: string,
    @Body() updateMessageDto: UpdateMessageDto,
    @Request() req,
  ) {
    return this.messagesService.update(id, updateMessageDto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a message' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  remove(@Param('id') id: string, @Request() req) {
    return this.messagesService.remove(id, req.user.id);
  }

  @Post(':id/reactions')
  @ApiOperation({ summary: 'Add/remove reaction to a message' })
  @ApiResponse({ status: 200, description: 'Reaction added/removed successfully' })
  addReaction(
    @Param('id') messageId: string,
    @Body() addReactionDto: AddReactionDto,
    @Request() req,
  ) {
    return this.messagesService.addReaction(messageId, addReactionDto, req.user.id);
  }
}