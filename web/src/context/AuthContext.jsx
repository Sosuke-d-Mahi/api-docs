import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const STORAGE_KEY = 'easir_user';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const restoreSession = async () => {
            const storedUser = localStorage.getItem(STORAGE_KEY);
            if (!storedUser) {
                setLoading(false);
                return;
            }

            try {
                const parsedUser = JSON.parse(storedUser);
                if (!parsedUser?.token) {
                    localStorage.removeItem(STORAGE_KEY);
                    setLoading(false);
                    return;
                }

                const res = await axios.get('/api/auth/me', {
                    headers: {
                        Authorization: `Bearer ${parsedUser.token}`
                    }
                });

                if (res.data.status) {
                    const nextUser = {
                        ...res.data.user,
                        token: parsedUser.token
                    };
                    setUser(nextUser);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
                } else {
                    localStorage.removeItem(STORAGE_KEY);
                }
            } catch (error) {
                localStorage.removeItem(STORAGE_KEY);
            } finally {
                setLoading(false);
            }
        };

        restoreSession();
    }, []);

    const login = async (username, password) => {
        try {
            const res = await axios.post('/api/auth/login', { username, password });
            if (res.data.status) {
                const userData = {
                    ...res.data.user,
                    token: res.data.token
                };
                setUser(userData);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
                return { success: true, user: userData };
            }
            return { success: false, message: res.data.message };
        } catch (err) {
            return { success: false, message: err.response?.data?.message || "Login Failed" };
        }
    };

    const completeAuth = (payload) => {
        if (!payload?.token || !payload?.user) {
            return;
        }

        const nextUser = {
            ...payload.user,
            token: payload.token
        };
        setUser(nextUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem(STORAGE_KEY);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, completeAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
