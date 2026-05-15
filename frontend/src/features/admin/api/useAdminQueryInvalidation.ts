import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { subscribeAdminQueryInvalidation } from "./adminQueryBus";

export function useAdminQueryInvalidation() {
    const queryClient = useQueryClient();

    useEffect(() => subscribeAdminQueryInvalidation((detail) => {
        if (detail.scope === "users") {
            void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
        }
        if (detail.scope === "user-detail" && detail.userId) {
            void queryClient.invalidateQueries({ queryKey: ["admin", "user-detail", detail.userId] });
        }
        if (detail.scope === "audit-trail" && detail.userId) {
            void queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs", ["user"]] });
        }
        if (detail.scope === "news-sources") {
            void queryClient.invalidateQueries({ queryKey: ["admin", "news-sources"] });
        }
        if (detail.scope === "news-list") {
            void queryClient.invalidateQueries({ queryKey: ["admin", "news"] });
        }
        if (detail.scope === "news-audit") {
            void queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs", ["source", "news"]] });
        }
        if (detail.scope === "categories") {
            void queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
            void queryClient.invalidateQueries({ queryKey: ["news", "categories"] });
        }
        if (detail.scope === "category-audit") {
            void queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs", ["category"]] });
        }
        if (detail.scope === "market-audit") {
            void queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs", ["market"]] });
        }
    }), [queryClient]);
}
