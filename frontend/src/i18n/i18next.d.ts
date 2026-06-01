import "i18next";
import type tr from "./locales/tr";

declare module "i18next" {
    interface CustomTypeOptions {
        defaultNS: "common";
        resources: { common: typeof tr };
    }
}
