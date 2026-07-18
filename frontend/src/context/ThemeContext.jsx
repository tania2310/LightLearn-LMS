import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem("theme") || "system";
    });

    useEffect(() => {
        localStorage.setItem("theme", theme);
        
        const root = document.documentElement;
        
        if (theme === "system") {
            root.setAttribute("data-theme", "system");
        } else {
            root.setAttribute("data-theme", theme);
        }
    }, [theme]);

    // Listener to re-render when system preferences change
    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = () => {
            if (theme === "system") {
                // Force a minor DOM layout trigger or React state update if needed
                const root = document.documentElement;
                root.setAttribute("data-theme", "system");
            }
        };

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
