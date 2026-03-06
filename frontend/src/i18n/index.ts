import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ko from './locales/ko.json'
import en from './locales/en.json'
import ja from './locales/ja.json'
import zh from './locales/zh.json'

const LANG_STORAGE_KEY = 'k_lang'
const SUPPORTED_LANGS = ['ko', 'en', 'ja', 'zh'] as const

export type SupportedLang = (typeof SUPPORTED_LANGS)[number]

export const LANG_LABELS: Record<SupportedLang, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  zh: '中文',
}

export const LANG_SHORT: Record<SupportedLang, string> = {
  ko: 'KO',
  en: 'EN',
  ja: 'JA',
  zh: 'ZH',
}

function getSavedLang(): SupportedLang {
  const saved = localStorage.getItem(LANG_STORAGE_KEY)
  if (saved && SUPPORTED_LANGS.includes(saved as SupportedLang)) {
    return saved as SupportedLang
  }
  return 'ko'
}

i18n.use(initReactI18next).init({
  resources: {
    ko: { translation: ko },
    en: { translation: en },
    ja: { translation: ja },
    zh: { translation: zh },
  },
  lng: getSavedLang(),
  fallbackLng: 'ko',
  interpolation: {
    escapeValue: false,
  },
})

// Persist language change
i18n.on('languageChanged', (lng) => {
  localStorage.setItem(LANG_STORAGE_KEY, lng)
  document.documentElement.lang = lng === 'zh' ? 'zh-CN' : lng
})

// Set initial html lang
document.documentElement.lang =
  i18n.language === 'zh' ? 'zh-CN' : i18n.language

export { SUPPORTED_LANGS }
export default i18n
