export class CreateUserCommand {
  constructor(
    public readonly data: {
      name: string;
      email: string;
      phone: string;
    },
  ) {}
}
