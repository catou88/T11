import React, { createContext, useContext, useEffect, useState} from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

async function fetchCurrentUser(token) {
    const res = await fetch(`${BACKEND_URL}/user/me`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
        return null;
    }
    const data = await res.json();
    return data.user;
}

/*
 * This provider should export a `user` context state that is 
 * set (to non-null) when:
 *     1. a hard reload happens while a user is logged in.
 *     2. the user just logged in.
 * `user` should be set to null when:
 *     1. a hard reload happens when no users are logged in.
 *     2. the user just logged out.
 */
export const AuthProvider = ({ children }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const restoreSession = async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                setUser(null);
                return;
            }
            const u = await fetchCurrentUser(token);
            if (u) {
                setUser(u);
            } else {
                localStorage.removeItem("token");
                setUser(null);
            }
        };
        restoreSession();
    }, []);

    /*
     * Logout the currently authenticated user.
     *
     * @remarks This function will always navigate to "/".
     */
    const logout = () => {
        localStorage.removeItem("token");
        setUser(null);
        navigate("/");
    };

    /**
     * Login a user with their credentials.
     *
     * @remarks Upon success, navigates to "/profile". 
     * @param {string} username - The username of the user.
     * @param {string} password - The password of the user.
     * @returns {string} - Upon failure, Returns an error message.
     */
    const login = async (username, password) => {
        let res;
        try {
            res = await fetch(`${BACKEND_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });
        } catch {
            return "Network error";
        }
        let data = {};
        try {
            data = await res.json();
        } catch {
            /* ignore */
        }
        if (!res.ok) {
            return data.message || "Login failed";
        }
        localStorage.setItem("token", data.token);
        const u = await fetchCurrentUser(data.token);
        if (!u) {
            localStorage.removeItem("token");
            return "Could not load profile";
        }
        setUser(u);
        navigate("/profile");
    };

    /**
     * Registers a new user. 
     * 
     * @remarks Upon success, navigates to "/success".
     * @param {Object} userData - The data of the user to register.
     * @returns {string} - Upon failure, returns an error message.
     */
    const register = async (userData) => {
        const { username, firstname, lastname, password } = userData;
        let res;
        try {
            res = await fetch(`${BACKEND_URL}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, firstname, lastname, password }),
            });
        } catch {
            return "Network error";
        }
        let data = {};
        try {
            data = await res.json();
        } catch {
            /* ignore */
        }
        if (!res.ok) {
            return data.message || "Registration failed";
        }
        navigate("/success");
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, register }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
