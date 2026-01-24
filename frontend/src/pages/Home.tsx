import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function Home() {
    const { ready, authenticated, login, register } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (ready && authenticated) {
            navigate("/portfolio", { replace: true });
        }
    }, [ready, authenticated, navigate]);

    if (!ready) return <div style={{ padding: 24 }}>Yükleniyor...</div>;

    return (
        <div style={{ padding: 24 }}>
            <h1>Ana Sayfa</h1>
            <p>Login/Register sonrası Portföy sayfasına yönlendirileceksin.</p>

            {authenticated ? (

                <p>Giriş yapıldı, portföy sayfasına yönlendiriliyorsun...</p>
                ) : (
                <div style={{ display: "flex", gap: 12 }}>
            <button onClick={login}>Login</button>
            <button onClick={register}>Register</button>
        </div>
    )}
</div>
);
}
