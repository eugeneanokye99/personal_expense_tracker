import { supabase } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

export class AchievementsRepository {
  static async listByUser(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);

    if (error) throw new AppError(error.message, 500);
    return (data ?? []).map((r: any) => r.achievement_id);
  }

  static async unlock(userId: string, achievementId: string): Promise<void> {
    const { error } = await supabase
      .from('user_achievements')
      .upsert({
        user_id: userId,
        achievement_id: achievementId,
      }, { onConflict: 'user_id,achievement_id' });

    if (error) throw new AppError(error.message, 500);
  }
}
