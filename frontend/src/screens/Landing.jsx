export default function Landing({ user, onGoLogin, onGoRegister, onGoApp, onLogout }) {
  return (
    <div className="landing">

      {/* Nav */}
      <nav className="landing-nav">
        <div className="landing-logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="28" height="28" rx="8" fill="#4f46e5"/>
            <path d="M7 10h10M17 10l-3-3M17 10l-3 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21 18H11M11 18l3-3M11 18l3 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>SwapNShift</span>
        </div>
        <div className="landing-nav-actions">
          {user ? (
            <>
              <span className="nav-user">{user.name} · Shift {user.shift}</span>
              <button className="nav-cta-btn" onClick={onGoApp}>Go to app</button>
              <button className="nav-link-btn" onClick={onLogout}>Sign out</button>
            </>
          ) : (
            <>
              <button className="nav-link-btn" onClick={onGoLogin}>Sign in</button>
              <button className="nav-cta-btn" onClick={onGoRegister}>Register</button>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-badge">Built by G. Rhodes, specifically for AGR grafters — you're welcome.</div>
          <h1 className="hero-title">
            Swap shifts.<br />No hassle.
          </h1>
          <p className="hero-sub">
            Because life's too short to spend your days off texting round the whole team
            asking who can cover a Thursday night. Post your swap, get notified, sorted.
            You're welcome, AGR.
          </p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={onGoRegister}>Get started</button>
            <button className="btn-ghost" onClick={onGoLogin}>I already have an account</button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <h3>Your rota at a glance</h3>
            <p>See your shift schedule for the next 14 days the moment you log in. Days, nights, and days off — all in one view.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 1l4 4-4 4"/>
                <path d="M3 11V9a4 4 0 014-4h14"/>
                <path d="M7 23l-4-4 4-4"/>
                <path d="M21 13v2a4 4 0 01-4 4H3"/>
              </svg>
            </div>
            <h3>Post and accept swaps</h3>
            <p>Need cover? Post your shift in seconds. Want to pick up extra hours? Browse open requests and accept with one click.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
            </div>
            <h3>Instant notifications</h3>
            <p>Get an email the moment a swap is posted so you never miss an opportunity to pick up a shift.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} SwapNShift</span>
      </footer>

    </div>
  );
}
