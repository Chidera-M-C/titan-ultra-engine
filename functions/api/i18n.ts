import en from './locales/en';
import ar from './locales/ar';
import hi from './locales/hi';
import ur from './locales/ur';
import bn from './locales/bn';
import ru from './locales/ru';
import es from './locales/es';

const translations: Record<string, Record<string, string>> = {
  en,
  ar,
  hi,
  ur,
  bn,
  ru,
  es,
};

export function t(
  key: string,
  lang: string = 'en',
  vars: Record<string, string | number> = {}
): string {
  const dict = translations[lang] || translations.en;
  let text = dict[key] || translations.en[key] || key;

  for (const [k, v] of Object.entries(vars)) {
    text = text.replaceAll(`{{${k}}}`, String(v));
  }

  return text;
}

export async function getUserLanguage(
  supabase: any,
  telegramUserId: string
): Promise<string> {
  const { data } = await supabase
    .from('telegram_users')
    .select('language')
    .eq('telegram_user_id', telegramUserId)
    .maybeSingle();

  return data?.language || 'en';
}
