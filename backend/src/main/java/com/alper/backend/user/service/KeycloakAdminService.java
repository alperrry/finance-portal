package com.alper.backend.user.service;

import com.alper.backend.common.exception.ExternalApiException;
import com.alper.backend.common.exception.ServiceType;
import com.alper.backend.user.dto.KeycloakUser;
import com.alper.backend.user.dto.SecurityStatusResponse;
import com.alper.backend.user.model.UserRole;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.log4j.Log4j2;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Log4j2
public class KeycloakAdminService {

    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;

    private final String realm;
    private final String internalUrl;
    private final String clientId;
    private final String clientSecret;

    // Token cache
    private String cachedToken;
    private Instant tokenExpiresAt;

    public KeycloakAdminService(
            OkHttpClient httpClient,
            ObjectMapper objectMapper,
            @Value("${keycloak.realm}") String realm,
            @Value("${keycloak.internal-url}") String internalUrl,
            @Value("${keycloak.admin.client-id}") String clientId,
            @Value("${keycloak.admin.client-secret}") String clientSecret
    ) {
        this.httpClient = httpClient;
        this.objectMapper = objectMapper;
        this.realm = realm;
        this.internalUrl = internalUrl;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    /**
     * Keycloak'taki bir kullanıcının bilgilerini günceller.
     * Sadece null olmayan alanlar gönderilir (partial update).
     */
    public void updateUser(String keycloakId, String firstName, String lastName, String email) {
        String token = getAdminToken();

        Map<String, Object> body = new HashMap<>();
        if (firstName != null) body.put("firstName", firstName);
        if (lastName != null) body.put("lastName", lastName);
        if (email != null) {
            body.put("email", email);
            body.put("emailVerified", false);
        }

        if (body.isEmpty()) {
            log.debug("Güncellenecek alan yok | keycloakId={}", keycloakId);
            return;
        }

        String url = String.format("%s/admin/realms/%s/users/%s", internalUrl, realm, keycloakId);
        String json = toJson(body);

        Request request = new Request.Builder()
                .url(url)
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .put(RequestBody.create(json, MediaType.parse("application/json")))
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "";
                log.error("Keycloak user update başarısız | keycloakId={} | status={} | body={}",
                        keycloakId, response.code(), errorBody);
                throw new ExternalApiException(
                        "Kullanıcı bilgileri güncellenemedi: HTTP " + response.code(),
                        ServiceType.KEYCLOAK);
            }
            log.info("Keycloak kullanıcısı güncellendi | keycloakId={}", keycloakId);
        } catch (IOException e) {
            log.error("Keycloak user update I/O hatası | keycloakId={}", keycloakId, e);
            throw new ExternalApiException(
                    "Keycloak Admin API'ye erişilemedi",
                    e,
                    ServiceType.KEYCLOAK);
        }
    }
    public KeycloakUser getUserById(String keycloakId) {
        String token = getAdminToken();

        String url = String.format("%s/admin/realms/%s/users/%s", internalUrl, realm, keycloakId);

        Request request = new Request.Builder()
                .url(url)
                .header("Authorization", "Bearer " + token)
                .get()
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "";
                log.error("Keycloak user fetch başarısız | keycloakId={} | status={} | body={}",
                        keycloakId, response.code(), errorBody);
                throw new ExternalApiException(
                        "Kullanıcı bilgileri alınamadı: HTTP " + response.code(),
                        ServiceType.KEYCLOAK);
            }

            String responseBody = response.body().string();
            JsonNode json = objectMapper.readTree(responseBody);

            return KeycloakUser.builder()
                    .keycloakId(json.get("id").asText())
                    .username(json.has("username") ? json.get("username").asText() : null)
                    .email(json.has("email") ? json.get("email").asText() : null)
                    .firstName(json.has("firstName") ? json.get("firstName").asText() : null)
                    .lastName(json.has("lastName") ? json.get("lastName").asText() : null)
                    .build();
        } catch (IOException e) {
            log.error("Keycloak user fetch I/O hatası | keycloakId={}", keycloakId, e);
            throw new ExternalApiException(
                    "Keycloak Admin API'ye erişilemedi",
                    e,
                    ServiceType.KEYCLOAK);
        }
    }

    public void resetPassword(String keycloakId, String newPassword) {
        String token = getAdminToken();
        String url = String.format("%s/admin/realms/%s/users/%s/reset-password",
                internalUrl, realm, encodePath(keycloakId));

        Map<String, Object> body = new HashMap<>();
        body.put("type", "password");
        body.put("value", newPassword);
        body.put("temporary", false);

        Request request = new Request.Builder()
                .url(url)
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .put(RequestBody.create(toJson(body), MediaType.parse("application/json")))
                .build();

        executeNoContent(request, "Keycloak password reset başarısız", keycloakId);
        log.info("Keycloak kullanıcısının şifresi güncellendi | keycloakId={}", keycloakId);
    }

    public SecurityStatusResponse getSecurityStatus(String keycloakId) {
        List<SecurityStatusResponse.OtpCredential> otpCredentials = getOtpCredentials(keycloakId);
        return new SecurityStatusResponse(!otpCredentials.isEmpty(), otpCredentials);
    }

    public void createOtpCredential(String keycloakId, String secret) {
        String token = getAdminToken();
        // Keycloak 26'da POST /credentials endpoint'i yok; PUT /users/{id} body'sindeki
        // credentials dizisi ile createCredential akisi tetiklenir.
        String url = String.format("%s/admin/realms/%s/users/%s", internalUrl, realm, encodePath(keycloakId));

        Map<String, Object> credential = new HashMap<>();
        credential.put("type", "otp");
        credential.put("userLabel", "Authenticator App");
        credential.put("secretData", String.format("{\"value\":\"%s\"}", secret));
        credential.put("credentialData", "{\"subType\":\"totp\",\"digits\":6,\"counter\":0,\"period\":30,\"algorithm\":\"HmacSHA1\"}");

        Map<String, Object> body = new HashMap<>();
        body.put("credentials", List.of(credential));

        Request request = new Request.Builder()
                .url(url)
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .put(RequestBody.create(toJson(body), MediaType.parse("application/json")))
                .build();

        executeNoContent(request, "Keycloak OTP credential olusturma basarisiz", keycloakId);
        log.info("Keycloak OTP credential olusturuldu | keycloakId={}", keycloakId);
    }

    public void deleteOtpCredential(String keycloakId, String credentialId) {
        List<SecurityStatusResponse.OtpCredential> otpCredentials = getOtpCredentials(keycloakId);
        boolean belongsToUser = otpCredentials.stream().anyMatch((credential) -> credential.id().equals(credentialId));

        if (!belongsToUser) {
            throw new ExternalApiException("OTP credential bulunamadı.", ServiceType.KEYCLOAK);
        }

        String token = getAdminToken();
        String url = String.format("%s/admin/realms/%s/users/%s/credentials/%s",
                internalUrl, realm, encodePath(keycloakId), encodePath(credentialId));

        Request request = new Request.Builder()
                .url(url)
                .header("Authorization", "Bearer " + token)
                .delete()
                .build();

        executeNoContent(request, "Keycloak OTP credential silme başarısız", keycloakId);
        log.info("Keycloak OTP credential silindi | keycloakId={} | credentialId={}", keycloakId, credentialId);
    }

    private List<SecurityStatusResponse.OtpCredential> getOtpCredentials(String keycloakId) {
        String token = getAdminToken();
        String url = String.format("%s/admin/realms/%s/users/%s/credentials",
                internalUrl, realm, encodePath(keycloakId));

        Request request = new Request.Builder()
                .url(url)
                .header("Authorization", "Bearer " + token)
                .get()
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "";
                log.error("Keycloak credential fetch başarısız | keycloakId={} | status={} | body={}",
                        keycloakId, response.code(), errorBody);
                throw new ExternalApiException(
                        "Güvenlik bilgileri alınamadı: HTTP " + response.code(),
                        ServiceType.KEYCLOAK);
            }

            String responseBody = response.body().string();
            JsonNode credentials = objectMapper.readTree(responseBody);
            List<SecurityStatusResponse.OtpCredential> result = new ArrayList<>();

            if (!credentials.isArray()) {
                return result;
            }

            for (JsonNode credential : credentials) {
                String type = credential.path("type").asText("");
                if (!"otp".equalsIgnoreCase(type)) {
                    continue;
                }

                String id = credential.path("id").asText("");
                if (id.isBlank()) {
                    continue;
                }

                String label = credential.path("userLabel").asText("Authenticator");
                Long createdAt = credential.hasNonNull("createdDate") ? credential.path("createdDate").asLong() : null;
                result.add(new SecurityStatusResponse.OtpCredential(id, label, createdAt));
            }

            return result;
        } catch (IOException e) {
            log.error("Keycloak credential fetch I/O hatası | keycloakId={}", keycloakId, e);
            throw new ExternalApiException(
                    "Keycloak Admin API'ye erişilemedi",
                    e,
                    ServiceType.KEYCLOAK);
        }
    }

    private void executeNoContent(Request request, String logMessage, String keycloakId) {
        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "";
                log.error("{} | keycloakId={} | status={} | body={}",
                        logMessage, keycloakId, response.code(), errorBody);
                throw new ExternalApiException(
                        logMessage + ": HTTP " + response.code(),
                        ServiceType.KEYCLOAK);
            }
        } catch (IOException e) {
            log.error("{} I/O hatası | keycloakId={}", logMessage, keycloakId, e);
            throw new ExternalApiException(
                    "Keycloak Admin API'ye erişilemedi",
                    e,
                    ServiceType.KEYCLOAK);
        }
    }

    private String encodePath(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }

    /**
     * Service account client credentials ile admin token alır.
     * Token cache'lenir, süresi dolmadan tekrar istek atılmaz.
     */
    private synchronized String getAdminToken() {
        if (cachedToken != null && tokenExpiresAt != null
                && Instant.now().isBefore(tokenExpiresAt.minusSeconds(10))) {
            return cachedToken;
        }

        String url = String.format("%s/realms/%s/protocol/openid-connect/token",
                internalUrl, realm);

        RequestBody formBody = new FormBody.Builder()
                .add("grant_type", "client_credentials")
                .add("client_id", clientId)
                .add("client_secret", clientSecret)
                .build();

        Request request = new Request.Builder()
                .url(url)
                .post(formBody)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "";
                log.error("Keycloak admin token alınamadı | status={} | body={}",
                        response.code(), errorBody);
                throw new ExternalApiException(
                        "Keycloak admin token alınamadı: HTTP " + response.code(),
                        ServiceType.KEYCLOAK);
            }

            assert response.body() != null;
            String responseBody = response.body().string();
            JsonNode json = objectMapper.readTree(responseBody);

            String accessToken = json.get("access_token").asText();
            int expiresIn = json.get("expires_in").asInt();

            this.cachedToken = accessToken;
            this.tokenExpiresAt = Instant.now().plusSeconds(expiresIn);

            log.debug("Yeni Keycloak admin token alındı | expiresIn={}sn", expiresIn);
            return accessToken;
        } catch (IOException e) {
            log.error("Keycloak token endpoint'ine erişilemedi", e);
            throw new ExternalApiException(
                    "Keycloak token endpoint'ine erişilemedi",
                    e,
                    ServiceType.KEYCLOAK);
        }
    }

    private String toJson(Map<String, Object> map) {
        try {
            return objectMapper.writeValueAsString(map);
        } catch (Exception e) {
            throw new RuntimeException("JSON serialize hatası", e);
        }
    }


    public void setEnabled(String keycloakId, boolean enabled) {
        String token = getAdminToken();

        Map<String, Object> body = new HashMap<>();
        body.put("enabled", enabled);

        String url = String.format("%s/admin/realms/%s/users/%s",
                internalUrl, realm, encodePath(keycloakId));

        Request request = new Request.Builder()
                .url(url)
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .put(RequestBody.create(toJson(body), MediaType.parse("application/json")))
                .build();

        executeNoContent(request, "Keycloak enabled flag güncelleme başarısız", keycloakId);
        log.info("Keycloak kullanıcı durumu güncellendi | keycloakId={} | enabled={}",
                keycloakId, enabled);
    }


    public void syncRole(String keycloakId, UserRole newRole) {
        String token = getAdminToken();
        String roleMappingsUrl = String.format("%s/admin/realms/%s/users/%s/role-mappings/realm",
                internalUrl, realm, encodePath(keycloakId));

        // 1. Mevcut realm rollerini çek
        List<JsonNode> currentManagedRoles = fetchManagedRoles(roleMappingsUrl, token, keycloakId);

        // 2. Eğer kullanıcıda zaten doğru tek rol varsa, hiçbir şey yapma
        boolean alreadyHasOnlyTargetRole = currentManagedRoles.size() == 1
                && newRole.name().equals(currentManagedRoles.get(0).path("name").asText());
        if (alreadyHasOnlyTargetRole) {
            log.debug("Keycloak rolü zaten doğru | keycloakId={} | role={}", keycloakId, newRole);
            return;
        }

        // 3. Mevcut yönetilen rolleri kaldır (NORMAL_USER ve/veya ADMIN)
        if (!currentManagedRoles.isEmpty()) {
            deleteRealmRoles(roleMappingsUrl, token, currentManagedRoles, keycloakId);
        }

        // 4. Hedef rolün representation'ını available listesinden al
        //    (GET /roles/{name} view-realm gerektirir; available sadece manage-users ile çalışır)
        JsonNode newRoleRepresentation = fetchAvailableRoleRepresentation(
                roleMappingsUrl + "/available", token, newRole.name(), keycloakId);

        // 5. Yeni rolü ekle
        addRealmRole(roleMappingsUrl, token, newRoleRepresentation, keycloakId);

        log.info("Keycloak kullanıcı rolü güncellendi | keycloakId={} | newRole={}",
                keycloakId, newRole);
    }

// ---------------------------------------------------------------------------
// syncRole yardımcı metodları — sınıfın altına private olarak ekle
// ---------------------------------------------------------------------------

    /**
     * Kullanıcının mevcut realm rolleri arasında NORMAL_USER ve ADMIN olanları döner.
     * Diğer teknik roller filtrelenir.
     */
    private List<JsonNode> fetchManagedRoles(String roleMappingsUrl, String token, String keycloakId) {
        Request request = new Request.Builder()
                .url(roleMappingsUrl)
                .header("Authorization", "Bearer " + token)
                .get()
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "";
                log.error("Keycloak role-mappings fetch başarısız | keycloakId={} | status={} | body={}",
                        keycloakId, response.code(), errorBody);
                throw new ExternalApiException(
                        "Kullanıcı rolleri alınamadı: HTTP " + response.code(),
                        ServiceType.KEYCLOAK);
            }

            assert response.body() != null;
            JsonNode roles = objectMapper.readTree(response.body().string());
            List<JsonNode> managed = new ArrayList<>();
            if (!roles.isArray()) {
                return managed;
            }
            for (JsonNode role : roles) {
                String name = role.path("name").asText("");
                if (UserRole.NORMAL_USER.name().equals(name) || UserRole.ADMIN.name().equals(name)) {
                    managed.add(role);
                }
            }
            return managed;
        } catch (IOException e) {
            log.error("Keycloak role-mappings fetch I/O hatası | keycloakId={}", keycloakId, e);
            throw new ExternalApiException("Keycloak Admin API'ye erişilemedi",
                    e, ServiceType.KEYCLOAK);
        }
    }

    /**
     * Kullanıcıya atanabilir (available) roller arasından hedef rolü bulur.
     * GET /role-mappings/realm/available — sadece manage-users yetkisi gerektirir;
     * GET /roles/{name} yerine bu kullanılır çünkü o view-realm ister.
     */
    private JsonNode fetchAvailableRoleRepresentation(String availableUrl, String token,
                                                      String roleName, String keycloakId) {
        Request request = new Request.Builder()
                .url(availableUrl)
                .header("Authorization", "Bearer " + token)
                .get()
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "";
                log.error("Keycloak available roles fetch başarısız | keycloakId={} | status={} | body={}",
                        keycloakId, response.code(), errorBody);
                throw new ExternalApiException(
                        "Kullanıcıya atanabilir roller alınamadı: HTTP " + response.code(),
                        ServiceType.KEYCLOAK);
            }

            assert response.body() != null;
            JsonNode roles = objectMapper.readTree(response.body().string());
            if (roles.isArray()) {
                for (JsonNode role : roles) {
                    if (roleName.equals(role.path("name").asText(""))) {
                        return role;
                    }
                }
            }

            log.error("Hedef rol available listesinde bulunamadı | keycloakId={} | role={}",
                    keycloakId, roleName);
            throw new ExternalApiException("Rol bulunamadı: " + roleName, ServiceType.KEYCLOAK);
        } catch (IOException e) {
            log.error("Keycloak available roles fetch I/O hatası | keycloakId={}", keycloakId, e);
            throw new ExternalApiException("Keycloak Admin API'ye erişilemedi",
                    e, ServiceType.KEYCLOAK);
        }
    }

    /**
     * Verilen rolleri kullanıcıdan kaldırır.
     */
    private void deleteRealmRoles(String roleMappingsUrl, String token,
                                  List<JsonNode> rolesToRemove, String keycloakId) {
        String body = toJsonArray(rolesToRemove);

        Request request = new Request.Builder()
                .url(roleMappingsUrl)
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .delete(RequestBody.create(body, MediaType.parse("application/json")))
                .build();

        executeNoContent(request, "Keycloak role-mapping silme başarısız", keycloakId);
    }

    /**
     * Verilen rolü kullanıcıya ekler.
     */
    private void addRealmRole(String roleMappingsUrl, String token,
                              JsonNode roleRepresentation, String keycloakId) {
        String body = "[" + roleRepresentation.toString() + "]";

        Request request = new Request.Builder()
                .url(roleMappingsUrl)
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .post(RequestBody.create(body, MediaType.parse("application/json")))
                .build();

        executeNoContent(request, "Keycloak role-mapping ekleme başarısız", keycloakId);
    }

    /**
     * JsonNode listesini JSON array string'e çevirir.
     */
    private String toJsonArray(List<JsonNode> nodes) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < nodes.size(); i++) {
            if (i > 0) sb.append(",");
            sb.append(nodes.get(i).toString());
        }
        sb.append("]");
        return sb.toString();
    }
}
