import { IsString, IsOptional, IsObject, IsDateString, MinLength, MaxLength, IsNotEmpty, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class CriarActoPiqueteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  tipoActoCodigo!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  piqueteId!: string;

  @IsString()
  @MinLength(20, { message: 'Os factos devem ter pelo menos 20 caracteres.' })
  @MaxLength(20000)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  factos!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  localFactos?: string | null;

  @IsOptional()
  @IsDateString()
  dataHoraFactos?: string | null;

  @IsOptional()
  @IsObject()
  dados?: Record<string, unknown>;
}

export class RespostaActoPiqueteDto {
  acto: any;
  _links?: {
    self: string;
    processo: string | null;
  };
}
