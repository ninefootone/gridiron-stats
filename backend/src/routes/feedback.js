const express = require('express');
const router = express.Router();

router.post('/', async (req, res, next) => {
  const { name, message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: 'Gridiron Stats', email: 'hello@gridiron-stats.app' },
        to: [{ email: 'hello@gridiron-stats.app' }],
        replyTo: { email: 'hello@gridiron-stats.app' },
        subject: `Feedback from ${name || 'Anonymous'}`,
        textContent: `Name: ${name || 'Not provided'}\n\nMessage:\n${message}`,
        htmlContent: `
          <h2>Gridiron Stats Feedback</h2>
          <p><strong>From:</strong> ${name || 'Not provided'}</p>
          <hr />
          <p>${message.replace(/\n/g, '<br/>')}</p>
        `,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Brevo error:', err);
      return res.status(500).json({ error: 'Failed to send feedback' });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;