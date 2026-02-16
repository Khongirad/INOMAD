import { Test, TestingModule } from '@nestjs/testing';
import { NewsMediaService } from './news.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NewsMediaService', () => {
  let service: NewsMediaService;
  let prisma: any;

  const mockArticle = {
    id: 'a1', title: 'Test News', content: 'Lorem ipsum', summary: 'Lorem',
    category: 'Politics', tags: ['test'], isOfficial: false, isPinned: false,
    status: 'PUBLISHED', viewCount: 42, imageUrl: null, publishedAt: new Date(),
    authorId: 'u1',
    author: { id: 'u1', seatId: 'SEAT-1', username: 'reporter' },
  };

  beforeEach(async () => {
    const mockPrisma = {
      newsArticle: {
        create: jest.fn().mockResolvedValue(mockArticle),
        findUnique: jest.fn().mockResolvedValue(mockArticle),
        findMany: jest.fn().mockResolvedValue([mockArticle]),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ ...mockArticle, ...data }),
        ),
        count: jest.fn().mockResolvedValue(1),
        groupBy: jest.fn().mockResolvedValue([
          { category: 'Politics', _count: { id: 5 } },
          { category: 'Economy', _count: { id: 3 } },
        ]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsMediaService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(NewsMediaService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('createArticle', () => {
    it('creates article with PUBLISHED status', async () => {
      const r = await service.createArticle({
        authorId: 'u1', title: 'Breaking News', content: 'Content here',
        category: 'Politics',
      });
      expect(r.title).toBe('Test News');
      expect(prisma.newsArticle.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PUBLISHED' }),
        }),
      );
    });
    it('uses content substring as summary when not provided', async () => {
      await service.createArticle({
        authorId: 'u1', title: 'News', content: 'Short content',
        category: 'Economy',
      });
      expect(prisma.newsArticle.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ summary: 'Short content' }),
        }),
      );
    });
  });

  describe('getArticle', () => {
    it('returns article and increments view count', async () => {
      const r = await service.getArticle('a1');
      expect(r.id).toBe('a1');
      expect(prisma.newsArticle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { viewCount: { increment: 1 } },
        }),
      );
    });
    it('throws when not found', async () => {
      prisma.newsArticle.findUnique.mockResolvedValue(null);
      await expect(service.getArticle('bad')).rejects.toThrow('not found');
    });
  });

  describe('getArticles', () => {
    it('returns paginated articles with no filters', async () => {
      const r = await service.getArticles();
      expect(r.articles).toHaveLength(1);
      expect(r.pagination.page).toBe(1);
    });
    it('applies all filters', async () => {
      await service.getArticles({
        category: 'Politics', isOfficial: true,
        authorId: 'u1', search: 'test', page: 2, limit: 5,
      });
      expect(prisma.newsArticle.findMany).toHaveBeenCalled();
    });
  });

  describe('getTrending', () => {
    it('returns trending articles from last 7 days', async () => {
      const r = await service.getTrending(5);
      expect(r).toHaveLength(1);
      expect(prisma.newsArticle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });
  });

  describe('getAnnouncements', () => {
    it('returns official announcements', async () => {
      const r = await service.getAnnouncements();
      expect(prisma.newsArticle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isOfficial: true, status: 'PUBLISHED' },
        }),
      );
    });
  });

  describe('togglePin', () => {
    it('toggles pin status', async () => {
      const r = await service.togglePin('a1');
      expect(prisma.newsArticle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isPinned: true },
        }),
      );
    });
    it('throws when article not found', async () => {
      prisma.newsArticle.findUnique.mockResolvedValue(null);
      await expect(service.togglePin('bad')).rejects.toThrow('not found');
    });
  });

  describe('archiveArticle', () => {
    it('archives article', async () => {
      const r = await service.archiveArticle('a1');
      expect(prisma.newsArticle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'ARCHIVED' },
        }),
      );
    });
  });

  describe('getCategories', () => {
    it('returns categories with counts', async () => {
      const r = await service.getCategories();
      expect(r).toEqual([
        { name: 'Politics', count: 5 },
        { name: 'Economy', count: 3 },
      ]);
    });
  });
});
