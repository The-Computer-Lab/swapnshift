const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'SwapNShift <noreply@swapnshift.com>';

async function sendWelcomeEmail({ name, email }) {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Your SwapNShift account has been approved',
    html: `
      <p>Hi ${name},</p>
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
          <p>Hi ${name},</p>
          <p><strong>${requesterName}</strong> is looking for someone to cover their shift:</p>
          <ul>
            <li><strong>Date:</strong> ${swap.shift_date}</li>
            <li><strong>Time:</strong> ${swap.shift_time}</li>
            ${swap.notes ? `<li><strong>Notes:</strong> ${swap.notes}</li>` : ''}
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

  await Promise.all([
    // Email to the person who posted the swap
    resend.emails.send({
      from: FROM,
      to: requester.email,
      subject: `Your shift has been covered — ${swap.shift_date}`,
      html: `
        <p>Hi ${requester.name},</p>
        <p><strong>${acceptor.name}</strong> has accepted your request to cover your ${swap.shift_time} shift on <strong>${date}</strong>.</p>
        ${swap.notes ? `<p>Notes: ${swap.notes}</p>` : ''}
        <p>— The SwapNShift team</p>
      `,
    }),
    // Email to the person accepting the swap
    resend.emails.send({
      from: FROM,
      to: acceptor.email,
      subject: `Shift swap confirmed — ${swap.shift_date}`,
      html: `
        <p>Hi ${acceptor.name},</p>
        <p>You have agreed to cover <strong>${requester.name}</strong>'s ${swap.shift_time} shift on <strong>${date}</strong>.</p>
        ${swap.notes ? `<p>Notes: ${swap.notes}</p>` : ''}
        <p>— The SwapNShift team</p>
      `,
    }),
  ]);
}

module.exports = { sendWelcomeEmail, sendSwapNotificationEmail, sendSwapAcceptedEmails };
