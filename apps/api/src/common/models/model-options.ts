import type { Schema } from 'mongoose';

export function applySafeJson<TSchema>(schema: Schema<TSchema>): void {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (_document, value: Record<string, unknown>) => {
      value.id = String(value._id);
      delete value._id;
      delete value.passwordHash;
      delete value.tokenHash;
      return value;
    },
  });
}
