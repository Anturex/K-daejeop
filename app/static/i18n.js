/**
 * 다국어(i18n) 모듈
 *
 * 1. 4개 언어 번역 사전 (ko, en, ja, zh)
 * 2. t(key) / tf(key, ...args) API
 * 3. data-i18n / data-i18n-html / data-i18n-placeholder DOM 워커
 * 4. 언어 선택 드롭다운 컴포넌트
 * 5. localStorage 영속 저장 + lang:changed 이벤트
 */

const LANG_STORAGE_KEY = "k_lang";
const SUPPORTED_LANGS = ["ko", "en", "ja", "zh"];
const LANG_LABELS = { ko: "한국어", en: "English", ja: "日本語", zh: "中文" };
const LANG_SHORT = { ko: "KO", en: "EN", ja: "JA", zh: "ZH" };

/* ===== 번역 사전 ===== */
const TRANSLATIONS = {
  ko: {
    // 로그인 화면
    "login.subtitle": "내 리뷰를 쌓으면,<br/>나와 취향이 비슷한 사람들의 맛집을 볼 수 있어요",
    "login.feature.search": "음식점·카페·관광명소 실시간 검색",
    "login.feature.rating": "3단계 별점 리뷰 시스템",
    "login.feature.unlock": "리뷰 10개 작성 → 추천 장소 해금",
    "login.google": "Google 계정으로 시작하기",
    "login.footer": '로그인하면 <a href="#terms">이용약관</a> 및 <a href="#privacy">개인정보처리방침</a>에 동의하게 됩니다.',

    // 튜토리얼
    "tutorial.step1.title": "K-daejeop에 오신 걸 환영해요! 👋",
    "tutorial.step1.body": "맛집·카페·관광명소를 기록하고,\n리뷰 10개를 쌓으면 다른 사용자의\n추천 장소를 받아볼 수 있어요.",
    "tutorial.step2.title": "장소를 검색하세요 🔍",
    "tutorial.step2.body": "상단 검색창에 음식점·카페·관광명소\n이름이나 키워드를 입력하면\n실시간으로 추천 결과가 나타나요.",
    "tutorial.step3.title": "별점은 세 단계 ⭐",
    "tutorial.step3.body": "⭐ 동네 맛집 — 가볍게 다시 찾을 곳\n⭐⭐ 추천 맛집 — 일부러 찾아갈 맛\n⭐⭐⭐ 인생 맛집 — 두고두고 생각나는 맛",
    "tutorial.step4.title": "사진 한 장은 필수! 📸",
    "tutorial.step4.body": "리뷰를 남길 때 사진 한 장을\n꼭 첨부해 주세요.\n간단한 리뷰도 함께 적으면\n나중에 기억하기 좋아요.",
    "tutorial.step5.title": "리뷰 10개 → 추천 장소 해금 🎉",
    "tutorial.step5.body": "리뷰를 10개 이상 기여하면\n다른 사용자의 추천 장소를\n받아볼 수 있어요!\n나의 기록이 곧 혜택이 됩니다.",
    "tutorial.btn.next": "다음",
    "tutorial.btn.prev": "이전",
    "tutorial.btn.skip": "건너뛰기",
    "tutorial.btn.start": "시작하기 🚀",

    // 유저 메뉴
    "menu.tutorial": "튜토리얼 다시 보기",
    "menu.logout": "로그아웃",
    "menu.language": "언어",

    // 카테고리 필터
    "category.all": "전체",
    "category.restaurant": "식당",
    "category.cafe": "카페",
    "category.attraction": "관광명소",
    "category.etc": "기타",

    // 광고
    "ad.sponsored": "광고",

    // Auth 알림
    "auth.noSetup": "로그인 기능이 설정되지 않았습니다.",
    "auth.loginFailed": "로그인에 실패했습니다: {0}",

    // 검색
    "search.placeholder": "음식점·카페·관광명소 검색",
    "search.noResults": '"{0}" 검색 결과가 없습니다',
    "search.error": "검색 중 오류가 발생했습니다",
    "search.sdkError": "지도 SDK 로딩에 실패했습니다",
    "search.resultsStatus": '"{0}" 근처 {1}개 결과',
    "search.suggestionsHeader": "추천 장소 {0}건",
    "search.emptyTitle": '"{0}" 결과 없음',
    "search.emptySub": "다른 키워드를 입력해보세요",

    // 인포윈도우
    "iw.reviewBtn": "리뷰 남기기",
    "iw.detailLink": "상세보기 →",
    "iw.reviewedOnce": "내가 리뷰한 곳",
    "iw.reviewedMulti": "{0}번 방문한 곳",

    // 내 맛집
    "myReviews.title": "내 맛집",

    // 리뷰 모달
    "review.title": "리뷰 남기기",
    "review.ratingLabel": "별점",
    "review.required": "필수",
    "review.rating1.title": "동네 맛집",
    "review.rating1.desc": "가볍게 다시 찾을 곳",
    "review.rating2.title": "추천 맛집",
    "review.rating2.desc": "일부러 찾아갈 맛",
    "review.rating3.title": "인생 맛집",
    "review.rating3.desc": "두고두고 생각나는 맛",
    "review.photoLabel": "사진",
    "review.photoPrompt": "클릭하거나 드래그하여 사진 첨부",
    "review.photoHint": "JPG, PNG, HEIC (최대 10MB)",
    "review.textLabel": "리뷰",
    "review.textPlaceholder": "맛, 분위기, 서비스 등 자유롭게 작성해 주세요",
    "review.dateLabel": "방문 날짜",
    "review.dateHint": "스크롤하여 날짜를 선택하세요 (기본: 오늘)",
    "review.cancel": "취소",
    "review.submit": "리뷰 저장하기",
    "review.submitting": "저장 중…",
    "review.visitBadge": "🍽️ {0}번째 방문",
    "review.saved": "리뷰가 저장되었습니다! 🎉",
    "review.delete": "삭제",
    "review.deleteConfirm": "이 리뷰를 삭제하시겠습니까?",
    "review.deleted": "리뷰가 삭제되었습니다",

    // 리뷰 에러
    "review.err.rating": "별점을 선택해 주세요.",
    "review.err.photo": "사진을 한 장 첨부해 주세요.",
    "review.err.text": "리뷰를 간략히 작성해 주세요.",
    "review.err.login": "로그인이 필요합니다.",
    "review.err.session": "로그인 세션이 만료되었습니다.",
    "review.err.upload": "사진 업로드 실패: {0}",
    "review.err.insert": "리뷰 저장 실패: {0}",
    "review.err.generic": "리뷰 저장에 실패했습니다.",
    "review.err.fileSize": "파일 크기는 10MB 이하여야 합니다.",
    "review.err.imageOnly": "이미지 파일만 첨부할 수 있습니다.",
    "review.err.heicLib": "HEIC 변환 라이브러리를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    "review.err.heicFail": "HEIC 변환에 실패했습니다. iPhone에서 직접 올리거나, Mac 미리보기 앱에서 JPG로 내보내기 후 업로드해 주세요.",
    "review.heicConverting": "HEIC 변환 중…",

    // 날짜 형식
    "date.yearFmt": "{0}년",
    "date.monthFmt": "{0}월",
    "date.dayFmt": "{0}일",
  },

  en: {
    "login.subtitle": "Write reviews and discover<br/>hidden gems from people who share your taste",
    "login.feature.search": "Search restaurants, cafes & attractions",
    "login.feature.rating": "3-tier star rating system",
    "login.feature.unlock": "Write 10 reviews → unlock recommendations",
    "login.google": "Continue with Google",
    "login.footer": 'By signing in, you agree to the <a href="#terms">Terms of Service</a> and <a href="#privacy">Privacy Policy</a>.',

    "tutorial.step1.title": "Welcome to K-daejeop! 👋",
    "tutorial.step1.body": "Rate restaurants, cafes & attractions.\nContribute 10 reviews to unlock\nrecommendations from other users.",
    "tutorial.step2.title": "Search for places 🔍",
    "tutorial.step2.body": "Type a restaurant, cafe, or attraction\nname in the search bar to get\nreal-time suggestions.",
    "tutorial.step3.title": "Three-tier ratings ⭐",
    "tutorial.step3.body": "⭐ Local gem — Worth a casual revisit\n⭐⭐ Recommended — Worth a detour\n⭐⭐⭐ Top-tier — Truly unforgettable",
    "tutorial.step4.title": "A photo is a must! 📸",
    "tutorial.step4.body": "Please attach at least one photo\nwith your review.\nA short note helps you\nremember later.",
    "tutorial.step5.title": "10 reviews → unlock picks 🎉",
    "tutorial.step5.body": "Contribute 10 or more reviews\nto unlock recommendations\nfrom other users!\nYour reviews earn you rewards.",
    "tutorial.btn.next": "Next",
    "tutorial.btn.prev": "Back",
    "tutorial.btn.skip": "Skip",
    "tutorial.btn.start": "Let's go! 🚀",

    "menu.tutorial": "View tutorial again",
    "menu.logout": "Sign out",
    "menu.language": "Language",

    "category.all": "All",
    "category.restaurant": "Restaurant",
    "category.cafe": "Cafe",
    "category.attraction": "Attraction",
    "category.etc": "Other",

    "ad.sponsored": "Sponsored",

    "auth.noSetup": "Sign-in is not configured.",
    "auth.loginFailed": "Sign-in failed: {0}",

    "search.placeholder": "Search restaurants, cafes, attractions",
    "search.noResults": 'No results for "{0}"',
    "search.error": "An error occurred while searching",
    "search.sdkError": "Failed to load map SDK",
    "search.resultsStatus": '{1} results near "{0}"',
    "search.suggestionsHeader": "{0} suggested places",
    "search.emptyTitle": 'No results for "{0}"',
    "search.emptySub": "Try a different keyword",

    "iw.reviewBtn": "Write review",
    "iw.detailLink": "Details →",
    "iw.reviewedOnce": "Reviewed by me",
    "iw.reviewedMulti": "Visited {0} times",

    "myReviews.title": "My Picks",

    "review.title": "Write a Review",
    "review.ratingLabel": "Rating",
    "review.required": "Required",
    "review.rating1.title": "Local gem",
    "review.rating1.desc": "Worth a casual revisit",
    "review.rating2.title": "Recommended",
    "review.rating2.desc": "Worth a detour",
    "review.rating3.title": "Top-tier",
    "review.rating3.desc": "Truly unforgettable",
    "review.photoLabel": "Photo",
    "review.photoPrompt": "Click or drag to attach a photo",
    "review.photoHint": "JPG, PNG, HEIC (max 10MB)",
    "review.textLabel": "Review",
    "review.textPlaceholder": "Share your thoughts on taste, ambience, service, etc.",
    "review.dateLabel": "Date visited",
    "review.dateHint": "Scroll to select a date (default: today)",
    "review.cancel": "Cancel",
    "review.submit": "Save Review",
    "review.submitting": "Saving…",
    "review.visitBadge": "🍽️ Visit #{0}",
    "review.saved": "Review saved! 🎉",
    "review.delete": "Delete",
    "review.deleteConfirm": "Delete this review?",
    "review.deleted": "Review deleted",

    "review.err.rating": "Please select a rating.",
    "review.err.photo": "Please attach a photo.",
    "review.err.text": "Please write a brief review.",
    "review.err.login": "Please sign in first.",
    "review.err.session": "Your session has expired.",
    "review.err.upload": "Photo upload failed: {0}",
    "review.err.insert": "Review save failed: {0}",
    "review.err.generic": "Failed to save review.",
    "review.err.fileSize": "File must be 10MB or smaller.",
    "review.err.imageOnly": "Only image files are allowed.",
    "review.err.heicLib": "HEIC converter not loaded. Please try again.",
    "review.err.heicFail": "HEIC conversion failed. Try exporting as JPG first.",
    "review.heicConverting": "Converting HEIC…",

    "date.yearFmt": "{0}",
    "date.monthFmt": "{0}",
    "date.dayFmt": "{0}",
  },

  ja: {
    "login.subtitle": "レビューを書くと、<br/>あなたと好みが似た人のおすすめが見られます",
    "login.feature.search": "飲食店・カフェ・観光地をリアルタイム検索",
    "login.feature.rating": "3段階の星評価システム",
    "login.feature.unlock": "レビュー10件投稿 → おすすめ解放",
    "login.google": "Googleアカウントで始める",
    "login.footer": 'ログインすると<a href="#terms">利用規約</a>および<a href="#privacy">プライバシーポリシー</a>に同意したことになります。',

    "tutorial.step1.title": "K-daejeopへようこそ！👋",
    "tutorial.step1.body": "飲食店・カフェ・観光地を記録して、\nレビュー10件投稿で他のユーザーの\nおすすめスポットが解放されます。",
    "tutorial.step2.title": "お店を検索しよう 🔍",
    "tutorial.step2.body": "上部の検索バーに飲食店・カフェ・\n観光地の名前やキーワードを入力すると\nリアルタイムで候補が表示されます。",
    "tutorial.step3.title": "星評価は3段階 ⭐",
    "tutorial.step3.body": "⭐ 近所の名店 — また行きたいお店\n⭐⭐ おすすめ — わざわざ行く価値あり\n⭐⭐⭐ 最高の一店 — 忘れられない味",
    "tutorial.step4.title": "写真は必須！📸",
    "tutorial.step4.body": "レビューには写真を1枚\n必ず添付してください。\n簡単なメモも一緒に書くと\n後で思い出しやすくなります。",
    "tutorial.step5.title": "レビュー10件 → おすすめ解放 🎉",
    "tutorial.step5.body": "レビューを10件以上投稿すると\n他のユーザーのおすすめスポットが\n解放されます！\nあなたの記録が特典になります。",
    "tutorial.btn.next": "次へ",
    "tutorial.btn.prev": "前へ",
    "tutorial.btn.skip": "スキップ",
    "tutorial.btn.start": "始めよう！🚀",

    "menu.tutorial": "チュートリアルを再表示",
    "menu.logout": "ログアウト",
    "menu.language": "言語",

    "category.all": "すべて",
    "category.restaurant": "レストラン",
    "category.cafe": "カフェ",
    "category.attraction": "観光地",
    "category.etc": "その他",

    "ad.sponsored": "広告",

    "auth.noSetup": "ログイン機能が設定されていません。",
    "auth.loginFailed": "ログインに失敗しました：{0}",

    "search.placeholder": "飲食店・カフェ・観光地を検索",
    "search.noResults": '「{0}」の検索結果がありません',
    "search.error": "検索中にエラーが発生しました",
    "search.sdkError": "地図SDKの読み込みに失敗しました",
    "search.resultsStatus": '「{0}」付近の{1}件の結果',
    "search.suggestionsHeader": "おすすめ{0}件",
    "search.emptyTitle": '「{0}」の結果なし',
    "search.emptySub": "別のキーワードをお試しください",

    "iw.reviewBtn": "レビューを書く",
    "iw.detailLink": "詳細 →",
    "iw.reviewedOnce": "レビュー済み",
    "iw.reviewedMulti": "{0}回訪問",

    "myReviews.title": "マイグルメ",

    "review.title": "レビューを書く",
    "review.ratingLabel": "評価",
    "review.required": "必須",
    "review.rating1.title": "近所の名店",
    "review.rating1.desc": "また行きたいお店",
    "review.rating2.title": "おすすめ",
    "review.rating2.desc": "わざわざ行く価値あり",
    "review.rating3.title": "最高の一店",
    "review.rating3.desc": "忘れられない味",
    "review.photoLabel": "写真",
    "review.photoPrompt": "クリックまたはドラッグで写真を添付",
    "review.photoHint": "JPG, PNG, HEIC（最大10MB）",
    "review.textLabel": "レビュー",
    "review.textPlaceholder": "味、雰囲気、サービスなど自由にお書きください",
    "review.dateLabel": "訪問日",
    "review.dateHint": "スクロールで日付を選択（デフォルト：今日）",
    "review.cancel": "キャンセル",
    "review.submit": "レビューを保存",
    "review.submitting": "保存中…",
    "review.visitBadge": "🍽️ {0}回目の訪問",
    "review.saved": "レビューを保存しました！🎉",
    "review.delete": "削除",
    "review.deleteConfirm": "このレビューを削除しますか？",
    "review.deleted": "レビューを削除しました",

    "review.err.rating": "評価を選択してください。",
    "review.err.photo": "写真を1枚添付してください。",
    "review.err.text": "簡単なレビューを書いてください。",
    "review.err.login": "ログインが必要です。",
    "review.err.session": "セッションが切れました。",
    "review.err.upload": "写真アップロード失敗：{0}",
    "review.err.insert": "レビュー保存失敗：{0}",
    "review.err.generic": "レビューの保存に失敗しました。",
    "review.err.fileSize": "ファイルサイズは10MB以下にしてください。",
    "review.err.imageOnly": "画像ファイルのみ添付できます。",
    "review.err.heicLib": "HEIC変換ライブラリを読み込めませんでした。しばらくしてからお試しください。",
    "review.err.heicFail": "HEIC変換に失敗しました。JPGで書き出してからアップロードしてください。",
    "review.heicConverting": "HEIC変換中…",

    "date.yearFmt": "{0}年",
    "date.monthFmt": "{0}月",
    "date.dayFmt": "{0}日",
  },

  zh: {
    "login.subtitle": "写下你的评价，<br/>发现与你口味相似的人推荐的美食",
    "login.feature.search": "实时搜索餐厅·咖啡厅·景点",
    "login.feature.rating": "三星评分系统",
    "login.feature.unlock": "写10条评价 → 解锁推荐",
    "login.google": "使用Google账号登录",
    "login.footer": '登录即表示您同意<a href="#terms">服务条款</a>和<a href="#privacy">隐私政策</a>。',

    "tutorial.step1.title": "欢迎来到K-daejeop！👋",
    "tutorial.step1.body": "记录餐厅·咖啡厅·景点，\n写满10条评价即可解锁\n其他用户的推荐好店。",
    "tutorial.step2.title": "搜索地点 🔍",
    "tutorial.step2.body": "在顶部搜索栏输入餐厅·\n咖啡厅·景点名称或关键词，\n即可获得实时推荐。",
    "tutorial.step3.title": "三星评分 ⭐",
    "tutorial.step3.body": "⭐ 社区美食 — 值得再去\n⭐⭐ 推荐美食 — 值得专程前往\n⭐⭐⭐ 顶级美食 — 终生难忘",
    "tutorial.step4.title": "照片必不可少！📸",
    "tutorial.step4.body": "写评价时请务必\n附上一张照片。\n简短的文字记录\n有助于日后回忆。",
    "tutorial.step5.title": "10条评价 → 解锁推荐 🎉",
    "tutorial.step5.body": "贡献10条以上评价，\n即可解锁其他用户的\n推荐好店！\n你的记录就是你的福利。",
    "tutorial.btn.next": "下一步",
    "tutorial.btn.prev": "上一步",
    "tutorial.btn.skip": "跳过",
    "tutorial.btn.start": "开始吧！🚀",

    "menu.tutorial": "重新查看教程",
    "menu.logout": "退出登录",
    "menu.language": "语言",

    "category.all": "全部",
    "category.restaurant": "餐厅",
    "category.cafe": "咖啡厅",
    "category.attraction": "景点",
    "category.etc": "其他",

    "ad.sponsored": "广告",

    "auth.noSetup": "登录功能未配置。",
    "auth.loginFailed": "登录失败：{0}",

    "search.placeholder": "搜索餐厅·咖啡厅·景点",
    "search.noResults": '未找到"{0}"的结果',
    "search.error": "搜索时出现错误",
    "search.sdkError": "地图SDK加载失败",
    "search.resultsStatus": '"{0}"附近{1}个结果',
    "search.suggestionsHeader": "推荐{0}处",
    "search.emptyTitle": '"{0}"无结果',
    "search.emptySub": "请尝试其他关键词",

    "iw.reviewBtn": "写评价",
    "iw.detailLink": "详情 →",
    "iw.reviewedOnce": "我评价过的店",
    "iw.reviewedMulti": "去过{0}次",

    "myReviews.title": "我的美食",

    "review.title": "写评价",
    "review.ratingLabel": "评分",
    "review.required": "必填",
    "review.rating1.title": "社区美食",
    "review.rating1.desc": "值得再去",
    "review.rating2.title": "推荐美食",
    "review.rating2.desc": "值得专程前往",
    "review.rating3.title": "顶级美食",
    "review.rating3.desc": "终生难忘",
    "review.photoLabel": "照片",
    "review.photoPrompt": "点击或拖拽添加照片",
    "review.photoHint": "JPG, PNG, HEIC（最大10MB）",
    "review.textLabel": "评价",
    "review.textPlaceholder": "请分享味道、氛围、服务等方面的感受",
    "review.dateLabel": "到访日期",
    "review.dateHint": "滑动选择日期（默认：今天）",
    "review.cancel": "取消",
    "review.submit": "保存评价",
    "review.submitting": "保存中…",
    "review.visitBadge": "🍽️ 第{0}次到访",
    "review.saved": "评价已保存！🎉",
    "review.delete": "删除",
    "review.deleteConfirm": "确定删除此评价吗？",
    "review.deleted": "评价已删除",

    "review.err.rating": "请选择评分。",
    "review.err.photo": "请添加一张照片。",
    "review.err.text": "请简要写一下评价。",
    "review.err.login": "请先登录。",
    "review.err.session": "登录已过期。",
    "review.err.upload": "照片上传失败：{0}",
    "review.err.insert": "评价保存失败：{0}",
    "review.err.generic": "评价保存失败。",
    "review.err.fileSize": "文件大小不能超过10MB。",
    "review.err.imageOnly": "只能上传图片文件。",
    "review.err.heicLib": "HEIC转换库未加载，请稍后重试。",
    "review.err.heicFail": "HEIC转换失败，请先导出为JPG后上传。",
    "review.heicConverting": "正在转换HEIC…",

    "date.yearFmt": "{0}年",
    "date.monthFmt": "{0}月",
    "date.dayFmt": "{0}日",
  },
};

/* ===== 현재 언어 ===== */
let currentLang = "ko";

function getLang() {
  return currentLang;
}

function setLang(code) {
  if (!SUPPORTED_LANGS.includes(code)) return;
  currentLang = code;
  localStorage.setItem(LANG_STORAGE_KEY, code);
  document.documentElement.lang = code === "zh" ? "zh-CN" : code;
  applyTranslations();
  window.dispatchEvent(new CustomEvent("lang:changed", { detail: { lang: code } }));
}

/* ===== 번역 함수 ===== */
function t(key) {
  return TRANSLATIONS[currentLang]?.[key] ?? TRANSLATIONS.ko[key] ?? key;
}

function tf(key, ...args) {
  let str = t(key);
  args.forEach((arg, i) => {
    str = str.replace(`{${i}}`, arg);
  });
  return str;
}

/* ===== DOM 워커 ===== */
function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  // 언어 셀렉터 버튼 텍스트 업데이트
  document.querySelectorAll(".lang-selector__label").forEach((el) => {
    el.textContent = LANG_SHORT[currentLang];
  });
  document.querySelectorAll(".lang-selector__option").forEach((el) => {
    el.classList.toggle("is-active", el.dataset.lang === currentLang);
  });
  // 유저 메뉴 언어 현재값 표시
  const langMenuCurrent = document.getElementById("lang-menu-current");
  if (langMenuCurrent) {
    langMenuCurrent.textContent = LANG_LABELS[currentLang];
  }
}

/* ===== 언어 선택 컴포넌트 ===== */
function createLangSelector() {
  const wrapper = document.createElement("div");
  wrapper.className = "lang-selector";

  // 버튼
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "lang-selector__btn";
  btn.setAttribute("aria-label", "Language");
  btn.innerHTML = `
    <svg class="lang-selector__globe" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
    <span class="lang-selector__label">${LANG_SHORT[currentLang]}</span>
  `;

  // 드롭다운
  const dropdown = document.createElement("div");
  dropdown.className = "lang-selector__dropdown";
  dropdown.hidden = true;

  SUPPORTED_LANGS.forEach((code) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "lang-selector__option";
    option.dataset.lang = code;
    if (code === currentLang) option.classList.add("is-active");
    option.textContent = LANG_LABELS[code];
    option.addEventListener("click", (e) => {
      e.stopPropagation();
      setLang(code);
      dropdown.hidden = true;
    });
    dropdown.appendChild(option);
  });

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.hidden = !dropdown.hidden;
  });

  // 바깥 클릭 닫기
  document.addEventListener("mousedown", (e) => {
    if (!wrapper.contains(e.target)) {
      dropdown.hidden = true;
    }
  });

  wrapper.appendChild(btn);
  wrapper.appendChild(dropdown);
  return wrapper;
}

/* ===== 초기화 ===== */
function initI18n() {
  // localStorage에서 저장된 언어 복원
  const saved = localStorage.getItem(LANG_STORAGE_KEY);
  if (saved && SUPPORTED_LANGS.includes(saved)) {
    currentLang = saved;
  }
  document.documentElement.lang = currentLang === "zh" ? "zh-CN" : currentLang;

  // 로그인 카드에 언어 셀렉터 삽입
  const loginCard = document.querySelector(".login-card");
  if (loginCard) {
    loginCard.appendChild(createLangSelector());
  }

  // 튜토리얼 카드에 언어 셀렉터 삽입
  const tutorialCard = document.getElementById("tutorial-card");
  if (tutorialCard) {
    tutorialCard.appendChild(createLangSelector());
  }

  // 유저 메뉴 언어 변경 항목 셋업
  const langMenuItem = document.getElementById("lang-menu-item");
  const langMenuCurrent = document.getElementById("lang-menu-current");
  if (langMenuItem && langMenuCurrent) {
    langMenuCurrent.textContent = LANG_LABELS[currentLang];

    // 인라인 드롭다운 생성 (메뉴 아이템 클릭 시 토글)
    const langSubMenu = document.createElement("div");
    langSubMenu.className = "user-menu__lang-submenu";
    langSubMenu.hidden = true;
    SUPPORTED_LANGS.forEach((code) => {
      const opt = document.createElement("button");
      opt.type = "button";
      opt.className = "user-menu__lang-option";
      opt.dataset.lang = code;
      if (code === currentLang) opt.classList.add("is-active");
      opt.textContent = LANG_LABELS[code];
      opt.addEventListener("click", (e) => {
        e.stopPropagation();
        setLang(code);
        langSubMenu.hidden = true;
      });
      langSubMenu.appendChild(opt);
    });
    langMenuItem.after(langSubMenu);

    langMenuItem.addEventListener("click", (e) => {
      e.stopPropagation();
      langSubMenu.hidden = !langSubMenu.hidden;
    });

    // lang:changed → 서브메뉴 active 상태 갱신
    window.addEventListener("lang:changed", () => {
      langSubMenu.querySelectorAll(".user-menu__lang-option").forEach((el) => {
        el.classList.toggle("is-active", el.dataset.lang === currentLang);
      });
    });
  }

  // 초기 번역 적용
  if (currentLang !== "ko") {
    applyTranslations();
  }
}

// 글로벌 API 노출
window.__i18n = { t, tf, setLang, getLang, applyTranslations };

document.addEventListener("DOMContentLoaded", initI18n);
