/** Skeleton per sezioni caricate in lazy (code-split). */
export default function ViewFallback({ label = 'Caricamento sezione…', tall = false }) {
  return (
    <div className={`view-fallback ${tall ? 'view-fallback--tall' : ''}`} aria-busy="true">
      <div className="view-fallback__shimmer skeleton skeleton--block" />
      <div className="skeleton skeleton--line" />
      <div className="skeleton skeleton--line view-fallback__line--short" />
      <p className="view-fallback__label">{label}</p>
    </div>
  );
}
