import { Injectable } from '@nestjs/common';
import type { User, UserRole as PrismaUserRole } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import type { UserRepository } from '../application/ports/user.repository';
import type { UserEntity } from '../domain/user.entity';
import { UserRole } from '../domain/user-role.enum';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findFirst({ where: { email, deletedAt: null } });
    return user ? this.toDomain(user) : null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    return user ? this.toDomain(user) : null;
  }


  async findFirstActiveByRole(role: UserRole): Promise<UserEntity | null> {
    const user = await this.prisma.user.findFirst({ where: { role, isActive: true, deletedAt: null }, orderBy: { createdAt: 'asc' } });
    return user ? this.toDomain(user) : null;
  }
  async findActiveAgentById(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findFirst({
      where: { id, isActive: true, role: 'agent', deletedAt: null },
    });
    return user ? this.toDomain(user) : null;
  }

  async existsActiveUserById(id: string): Promise<boolean> {
    const count = await this.prisma.user.count({ where: { id, isActive: true, deletedAt: null } });
    return count > 0;
  }

  async existsActiveUserByIdAndRole(id: string, role: UserRole): Promise<boolean> {
    const count = await this.prisma.user.count({ where: { id, isActive: true, role, deletedAt: null } });
    return count > 0;
  }


  async listActiveAgents(): Promise<UserEntity[]> {
    const users = await this.prisma.user.findMany({ where: { role: 'agent', isActive: true, deletedAt: null }, orderBy: { name: 'asc' } });
    return users.map((user) => this.toDomain(user));
  }

  async updateMaxActiveLeads(id: string, maxActiveLeads: number): Promise<UserEntity | null> {
    const user = await this.prisma.user.update({ where: { id }, data: { maxActiveLeads } }).catch(() => null);
    return user ? this.toDomain(user) : null;
  }
  private toDomain(user: User): UserEntity {
    return { ...user, role: this.toDomainRole(user.role) };
  }

  private toDomainRole(role: PrismaUserRole): UserRole {
    const roles: Record<PrismaUserRole, UserRole> = {
      admin: UserRole.Admin,
      manager: UserRole.Manager,
      agent: UserRole.Agent,
      marketing: UserRole.Marketing,
    };
    return roles[role];
  }
}

