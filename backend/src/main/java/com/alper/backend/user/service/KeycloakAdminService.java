package com.alper.backend.user.service;

import com.alper.backend.common.exception.ExternalApiException;
import com.alper.backend.common.exception.ServiceType;
import com.alper.backend.user.dto.KeycloakUser;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.log4j.Log4j2;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.Instant;
import java.util.HashMap;
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
}