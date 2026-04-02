import React, { createContext, useContext, useEffect, useState} from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

function normalizeBaseUrl(raw, fallback) {
    let s = String(raw ?? fallback).trim();
    if (
        (s.startsWith('"') && s.endsWith('"')) ||
        (s.startsWith("'") && s.endsWith("'"))
    ) {
        s = s.slice(1, -1).trim();
    }
    return s.replace(/\/+$/, "");
}

const BACKEND_URL = normalizeBaseUrl(
    import.meta.env.VITE_BACKEND_URL,
    "http://localhost:3000",
);

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
        try {
            const res = await fetch(`${BACKEND_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                return data.message != null ? String(data.message) : "Login failed";
            }
            if (!data.token) {
                return data.message != null ? String(data.message) : "Login failed";
            }
            localStorage.setItem("token", data.token);
            const u = await fetchCurrentUser(data.token);
            if (!u) {
                localStorage.removeItem("token");
                return "Could not load profile";
            }
            setUser(u);
            navigate("/profile");
        } catch {
            return "Network error";
        }
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
        try {
            const res = await fetch(`${BACKEND_URL}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, firstname, lastname, password }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                if (data.message != null && String(data.message) !== "") {
                    return String(data.message);
                }
                return `Registration failed (HTTP ${res.status})`;
            }
            if (res.status !== 201) {
                if (res.status === 200) {
                    const ct = (res.headers.get("content-type") || "").toLowerCase();
                    if (!ct.includes("application/json")) {
                        return "Registration failed: got a web page instead of JSON. Set Railway variable VITE_BACKEND_URL to your backend https URL (not your frontend site), then redeploy the frontend.";
                    }
                    return "Registration failed: server returned 200 instead of 201. VITE_BACKEND_URL is probably your frontend URL—use your Express backend URL from Railway.";
                }
                return `Registration failed (HTTP ${res.status})`;
            }
            navigate("/success");
        } catch {
            return "Network error";
        }
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
