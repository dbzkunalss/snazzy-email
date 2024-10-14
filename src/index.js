import PostalMime from 'postal-mime';

export default {
  async email(message, env, ctx) {
    const email = await PostalMime.parse(message.raw);

    console.log('Subject', email.subject);

    // Redact personal information using Workers AI
    const redactedHtml = await env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
      messages: [
        { role: 'system', content: 'You are a helpful assistant that redacts personal information from text. Replace names, addresses, phone numbers, and other personal identifiers with [REDACTED].' },
        { role: 'user', content: `Redact personal information from this HTML:\n${email.html}` }
      ]
    });

    // Generate a one-line summary using Workers AI
    const summary = await env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
      messages: [
        { role: 'system', content: 'You are a helpful assistant that summarizes emails in one line.' },
        { role: 'user', content: `Summarize this email in one line:\nSubject: ${email.subject}\nBody: ${redactedHtml.response}` }
      ]
    });

    console.log('Email Summary:', summary.response);

    // Create an HTML page with the original and redacted email content side by side
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Comparison: Original vs Redacted</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
          h1, h2 { color: #333; }
          .summary { font-style: italic; color: #666; margin-bottom: 20px; }
          .email-container { display: flex; gap: 20px; }
          .email-content { flex: 1; border: 1px solid #ddd; padding: 20px; max-width: 45%; }
          .highlight { background-color: #ffff00; }
        </style>
      </head>
      <body>
        <h1>Email Comparison: Original vs Redacted</h1>
        <div class="summary">Summary: ${summary.response}</div>
        <div class="email-container">
          <div class="email-content">
            <h2>Original Email</h2>
            ${email.html}
          </div>
          <div class="email-content">
            <h2>Redacted Email</h2>
            ${redactedHtml.response}
          </div>
        </div>
        <script>
          // Highlight differences
          const original = document.querySelectorAll('.email-content')[0];
          const redacted = document.querySelectorAll('.email-content')[1];
          const redactedText = redacted.innerText;
          original.innerHTML = original.innerHTML.replace(/\\[REDACTED\\]/g, match => \`<span class="highlight">\${match}</span>\`);
        </script>
      </body>
      </html>
    `;

    // Store the HTML content in Cloudflare KV
    const key = `email_${Date.now()}`;
    await env.EMAIL_CONTENT.put(key, htmlContent);

    // Return a response with the URL to access the stored email
    return new Response(`Email stored. Access it at: https://snazzy-newoffcord.workers.dev/email/${key}`, {
      headers: { 'Content-Type': 'text/plain' }
    });
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const segments = url.pathname.split('/').filter(segment => segment);

    console.log('Accessed URL:', url.toString());
    console.log('URL segments:', segments);

    // Check if we're accessing an email
    if (segments[0] === 'email' && segments[1]) {
      const key = segments[1];
      console.log('Attempting to retrieve email with key:', key);
      const content = await env.EMAIL_CONTENT.get(key);
      if (content === null) {
        console.log('Email not found for key:', key);
        return new Response('Email not found', { status: 404 });
      }
      console.log('Email content retrieved successfully');
      return new Response(content, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // If not accessing an email, return a simple index page
    console.log('Returning index page');
    return new Response(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Redaction Service</title>
      </head>
      <body>
        <h1>Email Redaction Service</h1>
        <p>This service redacts personal information from emails and stores them securely.</p>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
};