const axios = require('axios');
const nodemailer = require('nodemailer');

const GMAIL_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

const getCandidateErrors = (error) => {
    const seen = new Set();
    const candidates = [];

    const push = (candidate) => {
        if (!candidate || seen.has(candidate)) return;
        seen.add(candidate);
        candidates.push(candidate);
    };

    push(error?.primaryError);
    push(error?.transportErrors?.gmailApi);
    push(error?.secondaryError);
    push(error?.transportErrors?.smtp);
    push(error);

    return candidates;
};

const getPrimaryEmailError = (error) => {
    return getCandidateErrors(error)[0] || error;
};

const encodeBase64Url = (input) => {
    return Buffer.from(input, 'utf-8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
};

const buildRawMessage = (mailOptions) => {
    const subject = `=?UTF-8?B?${Buffer.from(mailOptions.subject, 'utf-8').toString('base64')}?=`;
    const headers = [
        `From: ${mailOptions.from}`,
        `To: ${mailOptions.to}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset="UTF-8"',
        'Content-Transfer-Encoding: 7bit'
    ];

    return encodeBase64Url(`${headers.join('\r\n')}\r\n\r\n${mailOptions.html}`);
};

const createTokenRequestBody = (creds) => {
    const params = new URLSearchParams();
    params.set('client_id', creds.clientId);
    params.set('client_secret', creds.clientSecret);
    params.set('refresh_token', creds.refreshToken);
    params.set('grant_type', 'refresh_token');
    return params.toString();
};

const getEmailErrorMessage = (error) => {
    for (const candidate of getCandidateErrors(error)) {
        const message =
            candidate.response?.data?.error?.message ||
            candidate.response?.data?.error_description ||
            candidate.response?.data?.message ||
            candidate.message;

        if (message) {
            return message;
        }
    }

    return 'Unknown error';
};

const getEmailErrorCode = (error) => {
    for (const candidate of getCandidateErrors(error)) {
        const code =
            candidate.response?.data?.error?.status ||
            candidate.response?.data?.error ||
            candidate.code ||
            candidate.response?.status;

        if (code) {
            return code;
        }
    }

    return 'UNKNOWN';
};

const isEmailTimeoutError = (error) => {
    const primaryError = getPrimaryEmailError(error);
    if (!primaryError) return false;

    const message = getEmailErrorMessage(primaryError).toLowerCase();
    const code = String(getEmailErrorCode(primaryError)).toLowerCase();

    return (
        code === 'etimedout' ||
        code === 'econnreset' ||
        code === 'esocket' ||
        message.includes('timeout') ||
        message.includes('timed out')
    );
};

const isEmailAuthError = (error) => {
    const primaryError = getPrimaryEmailError(error);
    if (!primaryError) return false;

    const message = getEmailErrorMessage(primaryError).toLowerCase();
    const code = String(getEmailErrorCode(primaryError)).toLowerCase();

    return (
        code === 'eauth' ||
        code === 'unauthenticated' ||
        code === 'invalid_grant' ||
        message.includes('invalid login') ||
        message.includes('invalid grant') ||
        message.includes('unauthorized') ||
        message.includes('insufficient permission')
    );
};

const isEmailApiDisabledError = (error) => {
    const primaryError = getPrimaryEmailError(error);
    if (!primaryError) return false;

    const message = getEmailErrorMessage(primaryError).toLowerCase();

    return (
        message.includes('gmail api has not been used') ||
        message.includes('gmail.googleapis.com') && message.includes('disabled') ||
        message.includes('access not configured')
    );
};

const getGmailAccessToken = async (creds) => {
    const response = await axios.post(GMAIL_TOKEN_URL, createTokenRequestBody(creds), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 15000
    });

    const accessToken = response.data?.access_token;
    if (!accessToken) {
        const error = new Error('Google OAuth token response did not include an access token');
        error.code = 'TOKEN_MISSING';
        throw error;
    }

    return accessToken;
};

const sendViaGmailApi = async (creds, mailOptions) => {
    const accessToken = await getGmailAccessToken(creds);
    const raw = buildRawMessage(mailOptions);

    const response = await axios.post(
        GMAIL_SEND_URL,
        { raw },
        {
            headers: {
                Authorization: `Bearer ${accessToken}`
            },
            timeout: 15000
        }
    );

    return response.data;
};

const sendViaSmtp = async (creds, mailOptions) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            type: 'OAuth2',
            user: creds.email,
            clientId: creds.clientId,
            clientSecret: creds.clientSecret,
            refreshToken: creds.refreshToken
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000
    });

    return transporter.sendMail(mailOptions);
};

const sendEmail = async (creds, mailOptions) => {
    let gmailApiError;

    try {
        const info = await sendViaGmailApi(creds, mailOptions);
        return { success: true, provider: 'gmail-api', info };
    } catch (error) {
        gmailApiError = error;
    }

    try {
        const info = await sendViaSmtp(creds, mailOptions);
        return { success: true, provider: 'smtp', info };
    } catch (smtpError) {
        const error = new Error(
            `Gmail API failed: ${getEmailErrorMessage(gmailApiError)}; SMTP failed: ${getEmailErrorMessage(smtpError)}`
        );
        error.primaryError = gmailApiError || smtpError;
        error.secondaryError = smtpError;
        error.code = getEmailErrorCode(smtpError) || getEmailErrorCode(gmailApiError);
        error.transportErrors = {
            gmailApi: gmailApiError,
            smtp: smtpError
        };
        throw error;
    }
};

module.exports = {
    getPrimaryEmailError,
    getEmailErrorCode,
    getEmailErrorMessage,
    isEmailApiDisabledError,
    isEmailAuthError,
    isEmailTimeoutError,
    sendEmail
};
