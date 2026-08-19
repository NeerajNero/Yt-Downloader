import React, { useEffect, useRef, useState } from 'react'
import DownloadPanel from './DownloadPanel.jsx'
import JobsPanel from './JobsPanel.jsx'
import Library from './Library.jsx'
import { getConfig, getJobs, getLibrary } from './api.js'

export default function App() {
  const [config, setConfig] = useState(null)
  const [jobs, setJobs] = useState([])
  const [library, setLibrary] = useState([])
  const doneSeen = useRef(new Set())

  const refreshLibrary = () => getLibrary().then(setLibrary).catch(() => {})

  useEffect(() => {
    getConfig().then(setConfig).catch(() => {})
    refreshLibrary()

    const tick = () =>
      getJobs()
        .then((list) => {
          setJobs(list)
          let refetch = false
          for (const j of list) {
            if (j.status === 'done' && !doneSeen.current.has(j.id)) {
              doneSeen.current.add(j.id)
              refetch = true
            }
          }
          if (refetch) refreshLibrary()
        })
        .catch(() => {})

    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="shell">
      <header className="header">
        <div className="brand">
          <span className="rec-dot" aria-hidden="true" />
          <h1>YT Studio</h1>
        </div>
        {config && <span className="mono muted">{config.download_dir}</span>}
      </header>

      <DownloadPanel />
      {jobs.length > 0 && <JobsPanel jobs={jobs} />}
      <Library
        items={library}
        jobs={jobs}
        downloadDir={config?.download_dir}
        onChanged={refreshLibrary}
      />
    </div>
  )
}
