import { Injectable } from '@nestjs/common';
import { argon2id, hash, verify } from 'argon2';

@Injectable()
export class PasswordService {
  hash(password: string) {
    return hash(password, { type: argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 });
  }
  verify(encoded: string, password: string) {
    return verify(encoded, password);
  }
}
