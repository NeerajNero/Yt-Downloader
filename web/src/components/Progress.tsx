export default function Progress({ value, active }: { value: number | null | undefined; active: boolean }) {
  const indeterminate = active && value == null
  return (
    <div className={`bar ${indeterminate ? 'indeterminate' : ''}`} role="progressbar"
         aria-valuenow={value ?? undefined} aria-valuemin={0} aria-valuemax={100}>
      <div className="bar-fill" style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} />
    </div>
  )
}
