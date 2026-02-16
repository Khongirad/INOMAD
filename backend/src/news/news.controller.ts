import { ApiTags } from '@nestjs/swagger';
import { Controller, Get, Post, Body, Param, Query, Req } from '@nestjs/common';
import { NewsMediaService } from './news.service';

@ApiTags('Organizations')
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsMediaService) {}

  @Post()
  async createArticle(@Req() req: any, @Body() body: any) {
    return this.newsService.createArticle({
      ...body,
      authorId: req.user.id,
    });
  }

  @Get()
  async getArticles(
    @Query('category') category?: string,
    @Query('official') official?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.newsService.getArticles({
      category,
      isOfficial: official === 'true' ? true : undefined,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('trending')
  async getTrending(@Query('limit') limit?: string) {
    return this.newsService.getTrending(limit ? parseInt(limit, 10) : 10);
  }

  @Get('announcements')
  async getAnnouncements(@Query('limit') limit?: string) {
    return this.newsService.getAnnouncements(limit ? parseInt(limit, 10) : 20);
  }

  @Get('categories')
  async getCategories() {
    return this.newsService.getCategories();
  }

  @Get(':id')
  async getArticle(@Param('id') id: string) {
    return this.newsService.getArticle(id);
  }

  @Post(':id/pin')
  async togglePin(@Param('id') id: string) {
    return this.newsService.togglePin(id);
  }

  @Post(':id/archive')
  async archiveArticle(@Param('id') id: string) {
    return this.newsService.archiveArticle(id);
  }
}
