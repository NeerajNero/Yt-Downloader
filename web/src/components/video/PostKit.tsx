interface Props { kit: { title?: string; description?: string; hashtags?: string[] } }

export default function PostKit({ kit }: Props) {
  const tags = (kit.hashtags ?? []).map((h) => `#${h}`).join(' ')
  const copy = (t: string) => void navigator.clipboard?.writeText(t)
  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="postkit-row">
      <span className="muted small postkit-label">{label}</span>
      <span className="postkit-val">{value}</span>
      <button className="btn small" onClick={() => copy(value)}>Copy</button>
    </div>
  )
  return (
    <div className="postkit">
      {kit.title && <Row label="Title" value={kit.title} />}
      {kit.description && <Row label="Desc" value={kit.description} />}
      {tags && <Row label="Tags" value={tags} />}
    </div>
  )
}
