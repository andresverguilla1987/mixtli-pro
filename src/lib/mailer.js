import fs from 'fs';
import path from 'path';
import handlebars from 'handlebars';

const useSendGrid = !!process.env.SENDGRID_API_KEY;

let transport;
if (useSendGrid) {
  const sgMail = (await import('@sendgrid/mail')).default;
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  transport = async ({to, subject, html}) =>
    sgMail.send({to, from: {email: process.env.MAIL_FROM_EMAIL, name: process.env.MAIL_FROM_NAME}, subject, html});
} else {
  const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses');
  const ses = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });
  transport = async ({to, subject, html}) => ses.send(new SendEmailCommand({
    Destination: { ToAddresses: [to] },
    Source: `${process.env.MAIL_FROM_NAME} <${process.env.MAIL_FROM_EMAIL}>`,
    Message: { Subject: { Data: subject }, Body: { Html: { Data: html } } }
  }));
}

function getTemplatePath(name) {
  return path.join(process.cwd(), 'emails', `${name}.hbs`);
}

function renderTemplate(name, vars) {
  const file = fs.readFileSync(getTemplatePath(name), 'utf8');
  const baseFile = fs.readFileSync(getTemplatePath('base'), 'utf8');
  const base = handlebars.compile(baseFile);
  handlebars.registerPartial('base', base);
  const tpl = handlebars.compile(file);
  return tpl(vars);
}

export async function sendTemplate(to, templateName, subject, vars) {
  const html = renderTemplate(templateName, vars);
  return transport({ to, subject, html });
}
