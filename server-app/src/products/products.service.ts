import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { ActionType } from '../common/enums/action-type.enum';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async create(dto: CreateProductDto, userId: string) {
    // Enforce unique SKU
    const existing = await this.productRepo.findOne({
      where: { sku: dto.sku.toUpperCase().trim() },
    });
    if (existing) {
      throw new ConflictException(
        `Product with SKU "${dto.sku}" already exists`,
      );
    }

    const product = this.productRepo.create({
      ...dto,
      sku: dto.sku.toUpperCase().trim(),
    });
    const saved = await this.productRepo.save(product);

    await this.activityLogService.log({
      user_id: userId,
      action_type: ActionType.PRODUCT_CREATE,
      entity_type: 'Product',
      entity_id: saved.id,
      new_data: { name: saved.name, sku: saved.sku, price: saved.price },
    });

    return saved;
  }

  async findAll(options: {
    page?: number;
    limit?: number;
    search?: string;
    is_active?: boolean;
  }) {
    const page = options.page || 1;
    const limit = options.limit || 20;

    const qb = this.productRepo
      .createQueryBuilder('product')
      .orderBy('product.created_at', 'DESC');

    if (options.search) {
      qb.andWhere('(product.name ILIKE :search OR product.sku ILIKE :search)', {
        search: `%${options.search}%`,
      });
    }
    if (options.is_active !== undefined) {
      qb.andWhere('product.is_active = :is_active', {
        is_active: options.is_active,
      });
    }

    const total = await qb.getCount();
    const data = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(id: string) {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto, userId: string) {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const oldData = {
      name: product.name,
      price: product.price,
      cost_price: product.cost_price,
      is_active: product.is_active,
    };

    Object.assign(product, dto);
    const saved = await this.productRepo.save(product);

    await this.activityLogService.log({
      user_id: userId,
      action_type: ActionType.PRODUCT_UPDATE,
      entity_type: 'Product',
      entity_id: saved.id,
      old_data: oldData,
      new_data: {
        name: saved.name,
        price: saved.price,
        is_active: saved.is_active,
      },
    });

    return saved;
  }

  async softDelete(id: string, userId: string) {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    product.is_active = false;
    await this.productRepo.save(product);

    await this.activityLogService.log({
      user_id: userId,
      action_type: ActionType.PRODUCT_DELETE,
      entity_type: 'Product',
      entity_id: id,
      old_data: { name: product.name, sku: product.sku, is_active: true },
      new_data: { is_active: false },
    });

    return { message: 'Product deactivated successfully' };
  }
}
