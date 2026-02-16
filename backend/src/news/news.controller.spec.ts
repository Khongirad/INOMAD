import { Test, TestingModule } from '@nestjs/testing';
import { NewsController } from './news.controller';
import { NewsMediaService } from './news.service';

describe('NewsController', () => {
  let controller: NewsController;
  let service: any;
  const req = { user: { id: 'u1' } };

  beforeEach(async () => {
    const mockService = {
      createArticle: jest.fn().mockResolvedValue({ id: 'a1' }),
      getArticles: jest.fn().mockResolvedValue({ items: [] }),
      getTrending: jest.fn().mockResolvedValue([]),
      getAnnouncements: jest.fn().mockResolvedValue([]),
      getCategories: jest.fn().mockResolvedValue([]),
      getArticle: jest.fn().mockResolvedValue({ id: 'a1' }),
      togglePin: jest.fn().mockResolvedValue({ pinned: true }),
      archiveArticle: jest.fn().mockResolvedValue({ archived: true }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NewsController],
      providers: [{ provide: NewsMediaService, useValue: mockService }],
    }).compile();
    controller = module.get(NewsController);
    service = module.get(NewsMediaService);
  });

  it('should be defined', () => expect(controller).toBeDefined());
  it('createArticle', async () => { await controller.createArticle(req, { title: 'T' }); expect(service.createArticle).toHaveBeenCalledWith(expect.objectContaining({ authorId: 'u1' })); });
  it('getArticles', async () => { await controller.getArticles('NEWS', 'true', 'test', '1', '10'); expect(service.getArticles).toHaveBeenCalledWith({ category: 'NEWS', isOfficial: true, search: 'test', page: 1, limit: 10 }); });
  it('getArticles default', async () => { await controller.getArticles(); expect(service.getArticles).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 20 })); });
  it('getTrending', async () => { await controller.getTrending('5'); expect(service.getTrending).toHaveBeenCalledWith(5); });
  it('getAnnouncements', async () => { await controller.getAnnouncements(); expect(service.getAnnouncements).toHaveBeenCalledWith(20); });
  it('getCategories', async () => { await controller.getCategories(); expect(service.getCategories).toHaveBeenCalled(); });
  it('getArticle', async () => { await controller.getArticle('a1'); expect(service.getArticle).toHaveBeenCalledWith('a1'); });
  it('togglePin', async () => { await controller.togglePin('a1'); expect(service.togglePin).toHaveBeenCalledWith('a1'); });
  it('archiveArticle', async () => { await controller.archiveArticle('a1'); expect(service.archiveArticle).toHaveBeenCalledWith('a1'); });
});
