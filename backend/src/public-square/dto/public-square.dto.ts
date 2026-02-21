import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HierarchyLevel, SquarePostType } from '@prisma/client';

export class CreatePublicSquarePostDto {
  @ApiProperty({ enum: HierarchyLevel })
  @IsEnum(HierarchyLevel)
  level: HierarchyLevel;

  @ApiProperty({ description: 'ID of the Arbad/Zun/Myangad/Tumed/Republic this post belongs to' })
  @IsString()
  scopeId: string;

  @ApiProperty({ description: 'Display name of the scope' })
  @IsString()
  scopeName: string;

  @ApiProperty({ enum: SquarePostType })
  @IsEnum(SquarePostType)
  postType: SquarePostType;

  @ApiProperty({ example: 'Нужна дорога в Арбан-7' })
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Signature threshold to escalate; 0 = no escalation' })
  @IsOptional()
  @IsInt()
  @Min(0)
  requiredSupport?: number;
}

export class VotePublicSquareDto {
  @ApiProperty()
  @IsUUID()
  postId: string;

  @ApiProperty()
  support: boolean;
}

export class EscalatePostDto {
  @ApiProperty()
  @IsUUID()
  postId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  escalationNote?: string;
}
