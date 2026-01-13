import { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('easir_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            const res = await axios.post('/api/auth/login', { username, password });
            if (res.data.status) {
                const userData = res.data.user;
                userData.token = res.data.token;
                setUser(userData);
                localStorage.setItem('easir_user', JSON.stringify(userData));
                localStorage.setItem('adminKey', password);
                return { success: true };
            }
            return { success: false, message: res.data.message };
        } catch (err) {
            return { success: false, message: err.response?.data?.message || "Login Failed" };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('easir_user');
        localStorage.removeItem('adminKey');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
