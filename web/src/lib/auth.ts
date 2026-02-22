import { useCookies } from "@vueuse/integrations/useCookies";

export default function getBearer() {
    const cookies = useCookies(["auth_token"]);
    return 'Bearer ' + (cookies.get("auth_token") || null);
}