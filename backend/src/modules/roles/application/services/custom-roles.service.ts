import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import type { SaveCustomRoleDto } from '../dto/save-custom-role.dto';

const customRoleInclude = {
  _count: { select: { users: true } },
} satisfies Prisma.CustomRoleInclude;

type CustomRoleRecord = Prisma.CustomRoleGetPayload<{ include: typeof customRoleInclude }>;

export interface CustomRoleResponse {
  id: string;
  name: string;
  description: string | null;
  baseRole: UserRole;
  permissions: Prisma.JsonValue;
  isSystem: boolean;
  usersCount: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CustomRolesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<CustomRoleResponse[]> {
    const roles = await this.prisma.customRole.findMany({
      include: customRoleInclude,
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
    return roles.map((role) => this.toResponse(role));
  }

  async create(dto: SaveCustomRoleDto): Promise<CustomRoleResponse> {
    try {
      const role = await this.prisma.customRole.create({
        data: {
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          baseRole: dto.baseRole as UserRole,
          permissions: dto.permissions,
          isSystem: false,
        },
        include: customRoleInclude,
      });
      return this.toResponse(role);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Role name already exists.');
      }
      throw error;
    }
  }

  async update(id: string, dto: SaveCustomRoleDto): Promise<CustomRoleResponse> {
    const existing = await this.prisma.customRole.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Role not found.');

    try {
      const role = await this.prisma.customRole.update({
        where: { id },
        data: {
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          baseRole: existing.isSystem ? existing.baseRole : (dto.baseRole as UserRole),
          permissions: dto.permissions,
        },
        include: customRoleInclude,
      });

      if (!existing.isSystem && existing.baseRole !== role.baseRole) {
        await this.prisma.user.updateMany({ where: { customRoleId: id }, data: { role: role.baseRole } });
      }

      return this.toResponse(role);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Role name already exists.');
      }
      throw error;
    }
  }

  async delete(id: string): Promise<{ success: true }> {
    const existing = await this.prisma.customRole.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Role not found.');
    if (existing.isSystem) throw new BadRequestException('System roles cannot be deleted.');

    await this.prisma.$transaction([
      this.prisma.user.updateMany({ where: { customRoleId: id }, data: { customRoleId: null } }),
      this.prisma.customRole.delete({ where: { id } }),
    ]);
    return { success: true };
  }

  private toResponse(role: CustomRoleRecord): CustomRoleResponse {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      baseRole: role.baseRole,
      permissions: role.permissions,
      isSystem: role.isSystem,
      usersCount: role._count.users,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }
}