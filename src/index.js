import PostalMime from 'postal-mime';

export default {
  async email(message, env, ctx) {
    const email = await PostalMime.parse(message.raw);

    console.log('Subject', email.subject);
    console.log('HTML', email.html);

    // Generate a one-line summary using Workers AI with Llama 3.1
    const ai = new env.AI();
    const summary = await ai.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        { role: 'system', content: 'You are a helpful assistant that summarizes emails in one line.' },
        { role: 'user', content: `Summarize this email in one line:\nSubject: ${email.subject}\nBody: ${email.html}` }
      ]
    });

    console.log('Email Summary:', summary.response);

    // email.attachments.forEach((attachment) => {
    //   let decoder = new TextDecoder('utf-8');
    //   console.log('Attachment', attachment.filename, 
    //     decoder.decode(attachment.content));
    // });
  },
};
