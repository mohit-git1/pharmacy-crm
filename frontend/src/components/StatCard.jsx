function StatCard({ title, value, badge, badgeColor, icon, iconBg, accentColor }) {
    return (
        <div className="stat-card" style={{ '--stat-accent': accentColor || badgeColor }}>
            <div className="stat-card-top">
                <div className="stat-card-icon" style={{ background: iconBg }}>
                    {icon}
                </div>
                <span className="stat-card-badge" style={{ background: badgeColor + "1a", color: badgeColor }}>
                    {badge}
                </span>
            </div>
            <div className="stat-card-info">
                <span className="stat-card-value">{value}</span>
                <span className="stat-card-title">{title}</span>
            </div>
        </div>
    );
}

export default StatCard;
