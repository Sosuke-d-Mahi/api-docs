export const getSessionHeaders = (user) => (
    user?.token ? { Authorization: `Bearer ${user.token}` } : {}
);

export const getApiKeyHeaders = (user) => (
    user?.apikey ? { 'x-api-key': user.apikey } : {}
);
