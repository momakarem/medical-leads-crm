import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

export type FollowUpListFilter = 'today' | 'upcoming' | 'overdue' | 'completed';

export class ListFollowUpsQueryDto {
  @IsOptional()
  @IsIn(['today', 'upcoming', 'overdue', 'completed'])
  filter?: FollowUpListFilter;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value ?? 1))
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value ?? 20))
  @IsInt()
  @IsIn([5, 20, 50, 100])
  limit = 5;
}