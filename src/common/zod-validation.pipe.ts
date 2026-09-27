import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  public constructor(private readonly schema: ZodType<T>) {}

  public transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'The request payload is invalid',
        details: result.error.flatten(),
      });
    }
    return result.data;
  }
}
