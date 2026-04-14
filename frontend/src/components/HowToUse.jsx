export default function HowToUse({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>How to use SwapNShift</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <ol className="how-to-list">
            <li>
              <strong>Register</strong>
              <p>Sign up with your name, email, and shift group (J/K/L/M/N). Your account will be pending until an admin approves it — you'll get an email when you're in.</p>
            </li>
            <li>
              <strong>Check your rota</strong>
              <p>The Rota tab shows your next 14 days at a glance, plus a full 6-month calendar colour-coded by Day, Night, and Off.</p>
            </li>
            <li>
              <strong>Post a swap</strong>
              <p>Go to the Swaps tab. Pick the date (or a date range) and whether it's a Day or Night shift, then hit Post. Everyone else on the app gets an email notification.</p>
            </li>
            <li>
              <strong>Accept a swap</strong>
              <p>See a shift you can cover? Tap "Accept & propose swap" and enter the date and shift type you'd like covered in return.</p>
            </li>
            <li>
              <strong>Confirm the deal</strong>
              <p>The person who posted the swap will see your counter-offer and can accept or decline. If they accept, you'll both get a confirmation email and the swap is done.</p>
            </li>
            <li>
              <strong>View history</strong>
              <p>The History tab shows all completed swaps from the last 12 months so you can keep track of who covered what.</p>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
