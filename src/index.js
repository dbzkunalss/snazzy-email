import PostalMime from 'postal-mime';

export default {
  async email(message, env, ctx) {
    const email = await PostalMime.parse(message.raw);

    console.log('Subject', email.subject);
    console.log('HTML', email.html);

    email.attachments.forEach((attachment) => {
      let decoder = new TextDecoder('utf-8');
      console.log('Attachment', attachment.filename, 
        decoder.decode(attachment.content));
    });
  },
};