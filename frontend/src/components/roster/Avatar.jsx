// Always a generic silhouette — profiles never carry a real photo.
// `tone="dark"` (default) is for the chrome roster panel; "light" is for use
// on the light form panel (e.g. the "now editing" chip).
export default function Avatar({ size = 34, tone = 'dark' }) {
  const toneClasses =
    tone === 'dark'
      ? 'border-white/15 bg-white/10 text-white/70'
      : 'border-brand-200 bg-brand-100 text-brand-700'
  return (
    <span
      className={`flex flex-none items-center justify-center rounded-full border ${toneClasses}`}
      style={{ height: size, width: size }}
    >
      <svg width={size * 0.47} height={size * 0.47} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4 20c1.6-4 5-6 8-6s6.4 2 8 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </span>
  )
}
