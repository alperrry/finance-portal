package com.alper.backend.market.common;

import com.alper.backend.common.exception.ExternalApiException;
import com.alper.backend.common.exception.ServiceType;
import lombok.RequiredArgsConstructor;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

@RequiredArgsConstructor
public abstract class BaseHttpClient {

    protected final OkHttpClient okHttpClient;

    protected abstract ServiceType getServiceType();

    protected String execute(Request request) {
        try (Response response = okHttpClient.newCall(request).execute()) {
            if (!response.isSuccessful() || response.body() == null) {
                throw new ExternalApiException(
                        "Geçersiz yanıt. HTTP: " + response.code(), getServiceType());
            }
            return response.body().string();
        } catch (ExternalApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ExternalApiException("Bağlantı hatası.", e, getServiceType());
        }
    }
}