import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateFlowRunDto {
  @IsUUID()
  flowId: string;

  @IsString()
  @IsNotEmpty()
  username: string;
}
