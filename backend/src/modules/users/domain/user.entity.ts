import type { UserRole } from './user-role.enum';

export interface UserEntity {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  maxActiveLeads: number;
  preferredLanguage: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SafeUser = Omit<UserEntity, 'password'>;

export function toSafeUser(user: UserEntity): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    maxActiveLeads: user.maxActiveLeads,
    preferredLanguage: user.preferredLanguage,
    deletedAt: user.deletedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
