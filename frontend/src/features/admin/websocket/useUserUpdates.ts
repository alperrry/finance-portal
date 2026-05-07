import { useCallback, useEffect, useState } from "react";
import { subscribeAdminQueryInvalidation } from "../api/adminQueryBus";

export function useUserUpdates() {
    const [highlightedUserId, setHighlightedUserId] = useState<number | null>(null);

    useEffect(() => subscribeAdminQueryInvalidation((detail) => {
        if (detail.scope !== "user-detail" || !detail.userId) return;
        setHighlightedUserId(detail.userId);
        window.setTimeout(() => setHighlightedUserId((current) => (current === detail.userId ? null : current)), 2200);
    }), []);

    const isHighlighted = useCallback((userId: number) => highlightedUserId === userId, [highlightedUserId]);

    return { highlightedUserId, isHighlighted };
}
