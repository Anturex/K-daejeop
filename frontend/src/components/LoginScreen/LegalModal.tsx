import { createPortal } from 'react-dom'

interface LegalModalProps {
  type: 'terms' | 'privacy'
  onClose: () => void
}

export function LegalModal({ type, onClose }: LegalModalProps) {
  return createPortal(
    <div
      className="fixed inset-0 z-[10003] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="relative mx-4 max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-4 top-4 text-xl text-text-muted hover:text-text-primary"
          onClick={onClose}
        >
          &times;
        </button>
        <h2 className="mb-4 font-serif text-lg font-bold text-dark">
          {type === 'terms' ? '이용약관' : '개인정보처리방침'}
        </h2>
        <div className="space-y-3 text-sm leading-relaxed text-text-primary">
          {type === 'terms' ? <TermsContent /> : <PrivacyContent />}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function TermsContent() {
  return (
    <>
      <p className="font-semibold">제1조 (목적)</p>
      <p>
        이 약관은 K-daejeop(이하 &quot;서비스&quot;)의 이용조건 및 절차에 관한
        사항을 규정합니다.
      </p>
      <p className="font-semibold">제2조 (서비스 내용)</p>
      <p>
        서비스는 음식점·카페·관광명소 리뷰 기록 및 추천 기능을 제공합니다.
      </p>
      <p className="font-semibold">제3조 (회원가입)</p>
      <p>Google OAuth를 통해 가입하며, 가입 시 이 약관에 동의한 것으로 봅니다.</p>
      <p className="font-semibold">제4조 (콘텐츠 이용 허락)</p>
      <p>
        사용자가 작성한 리뷰·사진 등의 콘텐츠에 대해 서비스 운영자에게
        비독점적·무상·영구적 이용권을 부여합니다.
      </p>
      <p className="font-semibold">제5조 (금지 행위)</p>
      <p>
        허위 리뷰 작성, 타인 비방, 저작권 침해 등의 행위를 금지합니다.
      </p>
      <p className="text-xs text-text-muted">
        운영자: 대접주 (hawng0065@naver.com)
      </p>
    </>
  )
}

function PrivacyContent() {
  return (
    <>
      <p className="font-semibold">1. 수집 항목</p>
      <p>Google 프로필(이메일, 이름, 프로필 사진), 리뷰 데이터, 위치 정보</p>
      <p className="font-semibold">2. 수집 목적</p>
      <p>서비스 제공, 사용자 인증, 맛집 추천 기능 운영</p>
      <p className="font-semibold">3. 보유 기간</p>
      <p>회원 탈퇴 시까지 보유하며, 탈퇴 후 즉시 파기합니다.</p>
      <p className="font-semibold">4. 제3자 제공</p>
      <p>원칙적으로 제3자에게 제공하지 않으며, 법적 요구 시 예외로 합니다.</p>
      <p className="font-semibold">5. 데이터 저장</p>
      <p>Supabase(AWS) 클라우드 인프라에 암호화 저장됩니다.</p>
      <p className="text-xs text-text-muted">
        운영자: 대접주 (hawng0065@naver.com)
      </p>
    </>
  )
}
