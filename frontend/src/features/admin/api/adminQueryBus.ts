type AdminQueryScope =
    | "users"
    | "user-detail"
    | "audit-trail"
    | "news-sources"
    | "news-list"
    | "news-audit"
    | "categories"
    | "category-audit"
    | "market-audit";

type AdminQueryInvalidation = {
    scope: AdminQueryScope;
    userId?: number;
};

const EVENT_NAME = "admin:query-invalidated";

export function invalidateAdminQuery(detail: AdminQueryInvalidation) {
    window.dispatchEvent(new CustomEvent<AdminQueryInvalidation>(EVENT_NAME, { detail }));
}

export function subscribeAdminQueryInvalidation(handler: (detail: AdminQueryInvalidation) => void) {
    const listener = (event: Event) => handler((event as CustomEvent<AdminQueryInvalidation>).detail);
    window.addEventListener(EVENT_NAME, listener);
    return () => window.removeEventListener(EVENT_NAME, listener);
}
