import { Test, TestingModule } from '@nestjs/testing';
import { BuilderInfoService } from './builder-info.service';

describe('BuilderInfoService', () => {
  let service: BuilderInfoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BuilderInfoService],
    }).compile();

    service = module.get<BuilderInfoService>(BuilderInfoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should set and get the builder image correctly', () => {
    const testBuilderImage = 'test-image:latest';
    service.setBuilderImage(testBuilderImage);
    expect(service.getBuilderImage()).toBe(testBuilderImage);
  });

  it('should log the builder image when it is set', () => {
    const testBuilderImage = 'test-image:latest';
    const spy = jest.spyOn(service['logger'], 'log');
    service.setBuilderImage(testBuilderImage);
    expect(spy).toHaveBeenCalledWith(`Builder image: ${testBuilderImage}`);
  });
});
