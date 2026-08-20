import type { UserEntity } from '../../domain/user.entity';
import type { UserRole } from '../../domain/user-role.enum';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  findByEmail(email: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  findFirstActiveByRole(role: UserRole): Promise<UserEntity | null>;
  findActiveAgentById(id: string): Promise<UserEntity | null>;
  existsActiveUserById(id: string): Promise<boolean>;
  existsActiveUserByIdAndRole(id: string, role: UserRole): Promise<boolean>;
  listActiveAgents(): Promise<UserEntity[]>;
  updateMaxActiveLeads(id: string, maxActiveLeads: number): Promise<UserEntity | null>;
}
