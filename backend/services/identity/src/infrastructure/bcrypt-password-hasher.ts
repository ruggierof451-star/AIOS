import * as bcrypt from 'bcrypt';
import { PasswordHasher } from '../application/ports';

const SALT_ROUNDS = 12;

export class BcryptPasswordHasher implements PasswordHasher {
  async hash(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, SALT_ROUNDS);
  }

  async verify(plainPassword: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hash);
  }
}
