export class CreateProductCommand {
  constructor(
    public readonly data: {
      name: string;
      price: number;
      stock?: number;
      description?: string;
    },
  ) {}
}
