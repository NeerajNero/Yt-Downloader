import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Nav from './components/Nav'
import Jobs from './routes/Jobs'
import Library from './routes/Library'
import Ingest from './routes/Ingest'
import Machines from './routes/Machines'
import More from './routes/More'
import Recipes from './routes/Recipes'
import Review from './routes/Review'
import Styles from './routes/Styles'
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
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/review" element={<Review />} />
            <Route path="/styles" element={<Styles />} />
            <Route path="/more" element={<More />} />
          </Routes>
        </main>
        <Nav />
      </div>
    </BrowserRouter>
  )
}
