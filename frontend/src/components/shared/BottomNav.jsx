export default function BottomNav({ items, activeKey }) {
  return (
    <>
      <nav className="bottom-nav">
        {items.map(item => (
          <button
            key={item.key}
            className={`bottom-nav-item ${activeKey === item.key ? 'bottom-nav-active' : ''}`}
            onClick={item.onClick}
          >
            <svg className="bottom-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {item.icon}
            </svg>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="bottom-nav-padding" />
    </>
  );
}