import { useEffect, useState } from "react";
import { fetchSecurityStatus, type SecurityStatusResponse } from "../../profile/api/userApi";
import { resolveProfileError } from "../utils/settingsFormatters";

export function useSecurityStatus() {
    const [securityStatus, setSecurityStatus] = useState<SecurityStatusResponse | null>(null);
    const [securityLoading, setSecurityLoading] = useState(true);
    const [securityError, setSecurityError] = useState<string | null>(null);

    const loadSecurityStatus = async () => {
        setSecurityLoading(true);
        setSecurityError(null);
        try {
            setSecurityStatus(await fetchSecurityStatus());
        } catch (err) {
            setSecurityError(resolveProfileError(err));
        } finally {
            setSecurityLoading(false);
        }
    };

    useEffect(() => { void loadSecurityStatus(); }, []);

    return { securityStatus, setSecurityStatus, securityLoading, securityError, loadSecurityStatus };
}