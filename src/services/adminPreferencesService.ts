import { supabase } from '../config/supabaseClient';

const TABLE = 'admin_preferences';

export const getVariantsTutorialDismissed = async (userId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('variants_tutorial_dismissed')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error('No pudimos leer tus preferencias de ayuda.');
  return data?.variants_tutorial_dismissed ?? false;
};

export const setVariantsTutorialDismissed = async (userId: string, dismissed: boolean): Promise<void> => {
  const { error } = await supabase
    .from(TABLE)
    .upsert({ user_id: userId, variants_tutorial_dismissed: dismissed }, { onConflict: 'user_id' });
  if (error) throw new Error('No pudimos guardar tu preferencia. Reintentá en unos segundos.');
};
