import { supabase } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import type { CreateUserDto, UpdateUserDto } from '../../../../../packages/shared/types';

export class UsersRepository {
  static async findByEmail(email: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    if (error && error.code !== 'PGRST116') throw new AppError(error.message, 500);
    return data;
  }

  static async findById(id: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new AppError(error.message, 500);
    return data;
  }

  static async create(dto: CreateUserDto) {
    const { data, error } = await supabase
      .from('users')
      .insert({
        email: dto.email,
        display_name: dto.displayName,
        password_hash: dto.passwordHash,
        budget_reset_day: dto.budgetResetDay ?? 1,
      })
      .select()
      .single();
    if (error) throw new AppError(error.message, 500);
    return data;
  }

  static async update(id: string, dto: UpdateUserDto) {
    const mapped: Record<string, unknown> = {};
    if (dto.displayName !== undefined) mapped.display_name = dto.displayName;
    if (dto.currency !== undefined) mapped.currency = dto.currency;
    if (dto.notificationMode !== undefined) mapped.notification_mode = dto.notificationMode;
    if (dto.alertFrequency !== undefined) mapped.alert_frequency = dto.alertFrequency;
    if (dto.budgetResetDay !== undefined) mapped.budget_reset_day = dto.budgetResetDay;
    if (dto.phoneNumber !== undefined) mapped.phone_number = dto.phoneNumber;

    const { data, error } = await supabase
      .from('users')
      .update({ ...mapped, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new AppError(error.message, 500);
    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw new AppError(error.message, 500);
  }
}
