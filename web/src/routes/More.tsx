import { Link } from 'react-router-dom'

export default function More() {
  return (
    <section className="panel stack">
      <div className="panel-head"><h2>More</h2></div>
      <Link to="/machines" className="btn">Machines</Link>
      <Link to="/recipes" className="btn">Recipes</Link>
      <Link to="/styles" className="btn">Styles — clone a Short's edit</Link>
    </section>
  )
}
