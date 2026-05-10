import { useEffect, useState } from "react";

export function usePortfolioDarkMode(): [boolean, React.Dispatch<React.SetStateAction<boolean>>] {
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem("portfolio-dark-mode") === "true");

    useEffect(() => {
        localStorage.setItem("portfolio-dark-mode", String(darkMode));
    }, [darkMode]);

    return [darkMode, setDarkMode];
}
