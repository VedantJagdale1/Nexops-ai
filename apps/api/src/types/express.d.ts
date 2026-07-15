import type { AuthenticatedUserDto } from '@nexops/shared';

declare global {
  namespace Express {
    interface Request {
      id: string;
      auth?: AuthenticatedUserDto;
    }
  }
}

export {};
