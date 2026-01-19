import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/tasks.dto';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import { Request } from '@nestjs/common';

@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Post()
  createTask(@Body() dto: CreateTaskDto, @Request() req: AuthenticatedRequest) {
    return this.tasksService.createTask(dto, req.user.id);
  }

  @Get()
  listTasks(
    @Query('status') status?: string,
    @Query('professionId') professionId?: string,
  ) {
    return this.tasksService.listTasks(status, professionId);
  }

  @Get(':id')
  getTask(@Param('id') id: string) {
    return this.tasksService.getTask(id);
  }

  @Post(':id/accept')
  acceptTask(@Param('id') taskId: string, @Request() req: AuthenticatedRequest) {
    return this.tasksService.acceptTask(taskId, req.user.id);
  }

  @Post(':id/complete')
  completeTask(@Param('id') taskId: string, @Request() req: AuthenticatedRequest) {
    return this.tasksService.completeTask(taskId, req.user.id);
  }
}
