import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'Gabriel Pérez' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'gabriel@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+34600111222' })
  @IsString()
  @IsNotEmpty()
  phone: string;
}
