import { useAuth } from "../auth/AuthProvider";

export default function Portfolio() {
    const { logout } = useAuth();

    return (
        <div style={{ padding: 24 }}>
            <h1>Portföy</h1>
            <p>Bu sayfa portföy sayfası olacak.</p>

            <button onClick={logout} style={{ marginTop: 12 }}>
                Logout
            </button>
        </div>
    );
}
