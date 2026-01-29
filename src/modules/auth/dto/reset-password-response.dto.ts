export class ResetPasswordUserDto {
  id!: string;
  email!: string;
  fullname!: string;
  role!: string;
}

export class ResetPasswordDataDto {
  accessToken!: string;
  user!: ResetPasswordUserDto;
}

export class ResetPasswordResponseDto {
  message!: string;
  data!: ResetPasswordDataDto;
}