import * as nodemailer from 'nodemailer';
import { fetchMeta } from '../misc/fetch-meta';
import Logger from './logger';
import config from '../config/index';

export const logger = new Logger('email');

export async function sendEmail(to: string, subject: string, html: string, text: string) {
	const meta = await fetchMeta(true);

	const iconUrl = `${config.url}/static-assets/ayuskey.png`;
	//const emailSettingUrl = `${config.url}/settings/email`;
	const emailSettingUrl = '';

	const enableAuth = meta.smtpUser != null && meta.smtpUser !== '';

	const transporter = nodemailer.createTransport({
		host: meta.smtpHost,
		port: meta.smtpPort,
		secure: meta.smtpSecure,
		ignoreTLS: !enableAuth,
		proxy: config.proxySmtp,
		auth: enableAuth ? {
			user: meta.smtpUser,
			pass: meta.smtpPass
		} : undefined
	} as any);

	try {
		const info = await transporter.sendMail({
			from: meta.email!,
			to: to,
			subject: subject,
			text: text,
			html: `<!doctype html>
			<html style="background: #eee;">
				<head>
					<meta charset="utf-8">
					<title>${ subject }</title>
					
				</head>
				<body style="padding: 16px; margin: 0; font-family: sans-serif; font-size: 14px;">
					<main style="max-width: 500px; margin: 0 auto; background: #fff; color: #555;">
						<header style="padding: 32px; background: #26D9B4;">
							<img src="${ meta.logoImageUrl || meta.iconUrl || iconUrl }" style="max-width: 128px; max-height: 28px; vertical-align: bottom;"/>
						</header>
						<article style="padding: 32px;">
							<h1 style="margin: 0 0 1em 0;">${ subject }</h1>
							<div>${ html }</div>
						</article>
						<footer style="padding: 32px; border-top: solid 1px #eee;">
						<!--
							<a href="${ emailSettingUrl }">${ 'Email setting' }</a>
						-->
						</footer>
					</main>
					<nav style="box-sizing: border-box; max-width: 500px; margin: 16px auto 0 auto; padding: 0 32px;">
						<a href="${ config.url }" style="text-decoration: none; color: #888;">${ config.host }</a>
					</nav>
				</body>
			</html>
			`
		});

		logger.info('Message sent: %s', info.messageId);
	} catch (e) {
		logger.error(e);
		throw e;
	}
}
