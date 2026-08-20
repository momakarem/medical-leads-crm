import { IsEnum } from 'class-validator';
import { AssignmentMethod } from '../../domain/assignment-settings.entity';

export class UpdateAssignmentMethodDto {
  @IsEnum(AssignmentMethod)
  method!: AssignmentMethod;
}