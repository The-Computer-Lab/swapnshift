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

module.exports = { sendWelcomeEmail, sendSwapNotificationEmail };
