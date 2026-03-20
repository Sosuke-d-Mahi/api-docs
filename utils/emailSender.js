const axios = require('axios');

const DEFAULT_MAIL_API_URL = 'https://egret-driving-cattle.ngrok-free.app/api/sendmail';

const getMailApiUrl = () => {
    return process.env.MAIL_API_URL || DEFAULT_MAIL_API_URL;
};

const stripHtml = (html = '') => {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};

const getEmailErrorMessage = (error) => {
    if (!error) return 'Unknown error';

    return (
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Unknown error'
    );
};

const getEmailErrorCode = (error) => {
    if (!error) return 'UNKNOWN';

    return error.code || error.response?.status || 'UNKNOWN';
};

const isEmailTimeoutError = (error) => {
    if (!error) return false;

    const message = getEmailErrorMessage(error).toLowerCase();
    const code = String(getEmailErrorCode(error)).toLowerCase();

    return (
        code === 'etimedout' ||
        code === 'econnaborted' ||
        code === 'econnreset' ||
        message.includes('timeout') ||
        message.includes('timed out')
    );
};

const isEmailConfigured = () => {
    return Boolean(getMailApiUrl());
};

const sendEmail = async (mailOptions) => {
    const response = await axios.get(getMailApiUrl(), {
        params: {
            to: mailOptions.to,
            subject: mailOptions.subject,
            text: mailOptions.text || stripHtml(mailOptions.html)
        },
        headers: {
            'ngrok-skip-browser-warning': 'true'
        },
        timeout: 20000
    });

    if (response.data?.ok !== true) {
        const error = new Error(response.data?.message || 'External email API rejected the request');
        error.code = 'MAIL_API_REJECTED';
        error.response = {
            status: response.status,
            data: response.data
        };
        throw error;
    }

    return {
        success: true,
        provider: 'external-mail-api',
        info: response.data
    };
};

module.exports = {
    getEmailErrorCode,
    getEmailErrorMessage,
    getMailApiUrl,
    isEmailConfigured,
    isEmailTimeoutError,
    sendEmail
};
