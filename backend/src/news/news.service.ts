import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * NewsMediaService — State-level news and media management.
 *
 * Features:
 *   • Create/publish/archive news articles
 *   • Categories (Politics, Economy, Culture, Sports, Judicial, ZAGS)
 *   • Official state announcements vs citizen journalism
 *   • Trending and pinned articles
 */

export interface CreateArticleDto {
  authorId: string;
  title: string;
  content: string;
  summary?: string;
  category: string;
  tags?: string[];
  isOfficial?: boolean;
  imageUrl?: string;
}

@Injectable()
export class NewsMediaService {
  private readonly logger = new Logger(NewsMediaService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new article.
   */
  async createArticle(data: CreateArticleDto) {
    const article = await this.prisma.newsArticle.create({
      data: {
        authorId: data.authorId,
        title: data.title,
        content: data.content,
        summary: data.summary || data.content.substring(0, 200),
        category: data.category,
        tags: data.tags || [],
        isOfficial: data.isOfficial || false,
        imageUrl: data.imageUrl,
        status: 'PUBLISHED',
      },
      include: {
        author: { select: { id: true, seatId: true, username: true } },
      },
    });

    this.logger.log(`📰 Article "${data.title}" created by ${data.authorId}`);
    return article;
  }

  /**
   * Get a single article.
   */
  async getArticle(id: string) {
    const article = await this.prisma.newsArticle.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, seatId: true, username: true } },
      },
    });

    if (!article) throw new NotFoundException('Article not found');

    // Increment view count
    await this.prisma.newsArticle.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return article;
  }

  /**
   * Get all published articles with filters.
   */
  async getArticles(filters?: {
    category?: string;
    isOfficial?: boolean;
    authorId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const where: any = { status: 'PUBLISHED' };

    if (filters?.category) where.category = filters.category;
    if (filters?.isOfficial !== undefined) where.isOfficial = filters.isOfficial;
    if (filters?.authorId) where.authorId = filters.authorId;
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { content: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [articles, total] = await Promise.all([
      this.prisma.newsArticle.findMany({
        where,
        orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          author: { select: { id: true, seatId: true, username: true } },
        },
      }),
      this.prisma.newsArticle.count({ where }),
    ]);

    return {
      articles,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get trending articles (by view count in last 7 days).
   */
  async getTrending(limit = 10) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    return this.prisma.newsArticle.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { gte: weekAgo },
      },
      orderBy: { viewCount: 'desc' },
      take: limit,
      include: {
        author: { select: { id: true, seatId: true, username: true } },
      },
    });
  }

  /**
   * Get official announcements.
   */
  async getAnnouncements(limit = 20) {
    return this.prisma.newsArticle.findMany({
      where: { isOfficial: true, status: 'PUBLISHED' },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
      take: limit,
      include: {
        author: { select: { id: true, seatId: true, username: true } },
      },
    });
  }

  /**
   * Pin/unpin an article.
   */
  async togglePin(articleId: string) {
    const article = await this.prisma.newsArticle.findUnique({ where: { id: articleId } });
    if (!article) throw new NotFoundException('Article not found');

    return this.prisma.newsArticle.update({
      where: { id: articleId },
      data: { isPinned: !article.isPinned },
    });
  }

  /**
   * Archive an article.
   */
  async archiveArticle(articleId: string) {
    return this.prisma.newsArticle.update({
      where: { id: articleId },
      data: { status: 'ARCHIVED' },
    });
  }

  /**
   * Get news categories with article counts.
   */
  async getCategories() {
    const categories = await this.prisma.newsArticle.groupBy({
      by: ['category'],
      where: { status: 'PUBLISHED' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    return categories.map((c) => ({
      name: c.category,
      count: c._count.id,
    }));
  }
}
