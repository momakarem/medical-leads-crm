import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import type { CreateUserDto, ListUsersQueryDto, ResetUserPasswordDto, UpdateUserDto } from '../dto/manage-users.dto';

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  customRoleId: true,
  customRole: {
    select: {
      id: true,
      name: true,
      description: true,
      baseRole: true,
      permissions: true,
      isSystem: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  isActive: true,
  maxActiveLeads: true,
  preferredLanguage: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type ManagedUser = Prisma.UserGetPayload<{ select: typeof safeUserSelect }>;

@Injectable()
export class ManageUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListUsersQueryDto): Promise<{ data: ManagedUser[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.UserWhereInput = { deletedAt: null };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.role) where.role = query.role;
    if (query.status) where.isActive = query.status === 'active';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, select: safeUserSelect, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.user.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async create(dto: CreateUserDto): Promise<ManagedUser> {
    const roleData = await this.resolveRoleData(dto.role as UserRole, dto.customRoleId);
    const password = await argon2.hash(dto.password, { type: argon2.argon2id });
    try {
      return await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          password,
          role: roleData.role,
          customRoleId: roleData.customRoleId,
          isActive: dto.isActive ?? true,
          maxActiveLeads: dto.maxActiveLeads ?? 50,
          preferredLanguage: dto.preferredLanguage ?? 'en',
        },
        select: safeUserSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Email already exists.');
      throw error;
    }
  }

  async update(id: string, dto: UpdateUserDto): Promise<ManagedUser> {
    const existing = await this.ensureExists(id);
    const roleData = await this.resolveRoleData((dto.role ?? existing.role) as UserRole, dto.customRoleId === undefined ? existing.customRoleId : dto.customRoleId);
    try {
      return await this.prisma.user.update({
        where: { id },
        data: {
          name: dto.name,
          email: dto.email,
          role: roleData.role,
          customRoleId: roleData.customRoleId,
          isActive: dto.isActive,
          maxActiveLeads: dto.maxActiveLeads,
          preferredLanguage: dto.preferredLanguage,
        },
        select: safeUserSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Email already exists.');
      throw error;
    }
  }

  async updateStatus(id: string, isActive: boolean): Promise<ManagedUser> {
    await this.ensureExists(id);
    return this.prisma.user.update({ where: { id }, data: { isActive }, select: safeUserSelect });
  }

  async resetPassword(id: string, dto: ResetUserPasswordDto): Promise<{ success: true }> {
    await this.ensureExists(id);
    const password = await argon2.hash(dto.password, { type: argon2.argon2id });
    await this.prisma.user.update({ where: { id }, data: { password } });
    return { success: true };
  }

  async deactivate(id: string): Promise<ManagedUser> {
    const user = await this.ensureExists(id);
    if (user.role === UserRole.admin) {
      const activeAdmins = await this.prisma.user.count({ where: { role: UserRole.admin, isActive: true, deletedAt: null } });
      if (activeAdmins <= 1) throw new BadRequestException('Cannot deactivate the last active admin.');
    }
    return this.prisma.user.update({ where: { id }, data: { isActive: false, deletedAt: new Date() }, select: safeUserSelect });
  }

  private async ensureExists(id: string): Promise<ManagedUser> {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null }, select: safeUserSelect });
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  private async resolveRoleData(baseRole: UserRole, customRoleId?: string | null): Promise<{ role: UserRole; customRoleId: string | null }> {
    if (!customRoleId) return { role: baseRole, customRoleId: null };

    const customRole = await this.prisma.customRole.findUnique({ where: { id: customRoleId }, select: { id: true, baseRole: true } });
    if (!customRole) throw new BadRequestException('Selected role profile was not found.');

    return { role: customRole.baseRole, customRoleId: customRole.id };
  }
}