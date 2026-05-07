import { Link } from "react-router-dom";

export function ForbiddenPage() {
    return (
        <main className="admin-forbidden">
            <section>
                <span>403</span>
                <h1>Yetkisiz erişim</h1>
                <p>Bu sayfayı görüntülemek için admin yetkisi gerekir.</p>
                <Link to="/portfolio">Piyasalara dön</Link>
            </section>
        </main>
    );
}
