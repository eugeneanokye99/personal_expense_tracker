import bcrypt from 'bcryptjs';
import { UsersRepository } from './users.repository';
import { AppError } from '../../middleware/errorHandler';
import type { UpdateUserDto } from '../../../../../packages/shared/types';

export class UsersService {
  static async getById(client: any, id: string) {
    const user = await UsersRepository.findById(client, id);
    if (!user) throw new AppError('User not found', 404);
    return UsersService.sanitize(user);
  }

  static async update(client: any, id: string, dto: UpdateUserDto) {
    const updated = await UsersRepository.update(client, id, dto);
    return UsersService.sanitize(updated);
  }

  static async deleteAccount(client: any, id: string, password: string): Promise<void> {
    const user = await UsersRepository.findById(client, id);
    if (!user) throw new AppError('User not found', 404);
    const valid = await bcrypt.compare(password, user.password_hash ?? '');
    if (!valid) throw new AppError('Invalid password', 401);
    await UsersRepository.delete(client, id);
  }

  private static sanitize(user: Record<string, unknown>) {
    const { password_hash, ...safe } = user;
    return safe;
  }
}
