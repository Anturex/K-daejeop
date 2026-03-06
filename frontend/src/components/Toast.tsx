import { useUiStore } from '../stores/uiStore'

export function Toast() {
  const toast = useUiStore((s) => s.toast)

  if (!toast) return null

  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-[10002] -translate-x-1/2 animate-toast-in">
      <div className="rounded-full bg-dark/90 px-5 py-2.5 text-sm font-medium text-white shadow-lg">
        {toast.message}
      </div>
    </div>
  )
}
