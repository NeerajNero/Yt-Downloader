import Machines from './routes/Machines'

export default function App() {
  return (
    <div className="shell">
      <header className="header">
        <div className="brand">
          <span className="rec-dot" aria-hidden="true" />
          <h1>YT Studio</h1>
        </div>
        <span className="mono muted">v2</span>
      </header>
      <Machines />
    </div>
  )
}
