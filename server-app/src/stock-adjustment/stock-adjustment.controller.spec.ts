import { Test, TestingModule } from '@nestjs/testing';
import { StockAdjustmentController } from './stock-adjustment.controller';

describe('StockAdjustmentController', () => {
  let controller: StockAdjustmentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StockAdjustmentController],
    }).compile();

    controller = module.get<StockAdjustmentController>(StockAdjustmentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
