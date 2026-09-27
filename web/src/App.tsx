import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Nav from './components/Nav'
import Jobs from './routes/Jobs'
import Library from './routes/Library'
import Ingest from './routes/Ingest'
import Machines from './routes/Machines'
import Video from './routes/Video'

export default function App() {
  return (
    <BrowserRouter>
      <div className="shell">
        <header className="header">
          <div className="brand">
            <span className="rec-dot" aria-hidden="true" />
            <h1>YT Studio</h1>
          </div>
          <span className="mono muted">v2</span>
        </header>
        <main className="stack">
          <Routes>
            <Route path="/" element={<Jobs />} />
            <Route path="/library" element={<Library />} />
            <Route path="/add" element={<Ingest />} />
            <Route path="/video/:id" element={<Video />} />
            <Route path="/machines" element={<Machines />} />
          </Routes>
        </main>
        <Nav />
      </div>
    </BrowserRouter>
  )
}
