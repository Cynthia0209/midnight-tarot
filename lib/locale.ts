export type Locale = "en" | "zh";

export const localeName: Record<Locale, string> = {
  en: "English",
  zh: "中文",
};

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "zh";
}
