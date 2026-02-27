import { NavLink } from "react-router-dom";

function Sidebar() {
    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <span className="sidebar-brand-text">Pharmacy CRM</span>
                <span className="sidebar-brand-dot"></span>
            </div>
            <nav className="sidebar-nav">
                <NavLink to="/" end className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                    <span className="nav-icon">📊</span> Dashboard
                </NavLink>
                <NavLink to="/inventory" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                    <span className="nav-icon">📦</span> Inventory
                </NavLink>
            </nav>
            <div className="sidebar-bottom">
                <button className="sidebar-settings">
                    <span className="nav-icon">⚙️</span> Settings
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;
