const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'SwapNShift <noreply@swapnshift.com>';

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendWelcomeEmail({ name, email }) {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Your SwapNShift account has been approved',
    html: `
      <p>Hi ${esc(name)},</p>
      <p>Your SwapNShift account has been approved. You can now log in and start posting or accepting shift swaps.</p>
      <p>— The SwapNShift team</p>
    `,
  });
}

async function sendSwapNotificationEmail({ users, swap, requesterName }) {
  if (!users.length) return;

  await Promise.all(
    users.map(({ name, email }) =>
      resend.emails.send({
        from: FROM,
        to: email,
        subject: `New shift swap available — ${swap.shift_date}`,
        html: `
          <p>Hi ${esc(name)},</p>
          <p><strong>${esc(requesterName)}</strong> is looking for someone to cover their shift:</p>
          <ul>
            <li><strong>Date:</strong> ${esc(swap.shift_date)}</li>
            <li><strong>Time:</strong> ${esc(swap.shift_time)}</li>
            ${swap.notes ? `<li><strong>Notes:</strong> ${esc(swap.notes)}</li>` : ''}
          </ul>
          <p>Log in to SwapNShift to accept this request.</p>
          <p>— The SwapNShift team</p>
        `,
      })
    )
  );
}

async function sendSwapAcceptedEmails({ requester, acceptor, swap }) {
  const date = new Date(swap.shift_date).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  const counterDate = new Date(swap.counter_date).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  await Promise.all([
    // Email to the person who posted the swap
    resend.emails.send({
      from: FROM,
      to: requester.email,
      subject: `Your shift has been covered — ${swap.shift_date}`,
      html: `
        <p>Hi ${esc(requester.name)},</p>
        <p><strong>${esc(acceptor.name)}</strong> will cover your ${esc(swap.shift_time)} shift on <strong>${esc(date)}</strong>.</p>
        <p>In return, you've agreed to cover their <strong>${esc(swap.counter_shift_time)} shift on ${esc(counterDate)}</strong>.</p>
        ${swap.notes ? `<p>Notes: ${esc(swap.notes)}</p>` : ''}
        <p>— The SwapNShift team</p>
      `,
    }),
    // Email to the person accepting the swap
    resend.emails.send({
      from: FROM,
      to: acceptor.email,
      subject: `Shift swap confirmed — ${swap.shift_date}`,
      html: `
        <p>Hi ${esc(acceptor.name)},</p>
        <p>You've agreed to cover <strong>${esc(requester.name)}</strong>'s ${esc(swap.shift_time)} shift on <strong>${esc(date)}</strong>.</p>
        <p>In return, <strong>${esc(requester.name)}</strong> will cover your <strong>${esc(swap.counter_shift_time)} shift on ${esc(counterDate)}</strong>.</p>
        ${swap.notes ? `<p>Notes: ${esc(swap.notes)}</p>` : ''}
        <p>— The SwapNShift team</p>
      `,
    }),
  ]);
}

async function sendCounterOfferEmail({ requester, acceptor, swap, counter_date, counter_shift_time }) {
  const swapDate = new Date(swap.shift_date).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  const counterDate = new Date(counter_date).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  return resend.emails.send({
    from: FROM,
    to: requester.email,
    subject: `${esc(acceptor.name)} has offered to cover your shift — response needed`,
    html: `
      <p>Hi ${esc(requester.name)},</p>
      <p><strong>${esc(acceptor.name)}</strong> has offered to cover your ${esc(swap.shift_time)} shift on <strong>${esc(swapDate)}</strong>.</p>
      <p>In return, they are asking you to cover their <strong>${esc(counter_shift_time)} shift on ${esc(counterDate)}</strong>.</p>
      <p>Log in to SwapNShift to accept or decline this offer.</p>
      <p>— The SwapNShift team</p>
    `,
  });
}

async function sendCounterRejectedEmail({ acceptor, requesterName, swap }) {
  const swapDate = new Date(swap.shift_date).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  return resend.emails.send({
    from: FROM,
    to: acceptor.email,
    subject: `Your swap offer was not accepted`,
    html: `
      <p>Hi ${esc(acceptor.name)},</p>
      <p><strong>${esc(requesterName)}</strong> has declined your offer to swap shifts for the ${esc(swap.shift_time)} shift on <strong>${esc(swapDate)}</strong>.</p>
      <p>The shift is back on the open swap board if you'd like to make a different offer.</p>
      <p>— The SwapNShift team</p>
    `,
  });
}

async function sendAdminRegistrationEmail({ name, email, shift }) {
  return resend.emails.send({
    from: FROM,
    to: process.env.ADMIN_EMAIL,
    subject: `New registration — ${esc(name)} is awaiting approval`,
    html: `
      <p>A new user has registered on SwapNShift and is awaiting your approval:</p>
      <ul>
        <li><strong>Name:</strong> ${esc(name)}</li>
        <li><strong>Email:</strong> ${esc(email)}</li>
        <li><strong>Shift group:</strong> ${esc(shift)}</li>
      </ul>
      <p>Log in to the admin panel to approve or reject their account.</p>
      <p>— SwapNShift</p>
    `,
  });
}

module.exports = { sendWelcomeEmail, sendSwapNotificationEmail, sendSwapAcceptedEmails, sendCounterOfferEmail, sendCounterRejectedEmail, sendAdminRegistrationEmail };
