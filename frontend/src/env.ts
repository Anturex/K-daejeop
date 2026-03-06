/** Environment variable helpers with type safety */

export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  kakaoJsKey: import.meta.env.VITE_KAKAO_JS_KEY as string,
  kakaoSdkUrl: (import.meta.env.VITE_KAKAO_SDK_URL as string) ||
    'https://dapi.kakao.com/v2/maps/sdk.js',
} as const
