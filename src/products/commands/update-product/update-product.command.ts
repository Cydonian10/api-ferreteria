export class UpdateProductCommand {
  constructor(
    public data: {
      id: number;
      name?: string;
      price?: number;
      stock?: number;
      description?: string;
    },
  ) {}
}
