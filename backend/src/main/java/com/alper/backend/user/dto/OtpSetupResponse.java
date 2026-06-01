package com.alper.backend.user.dto;

/**
 * TOTP kurulum sürecinde istemciye gönderilen QR kodu ve gizli anahtarı içerir.
 */
public record OtpSetupResponse(String qrCodeDataUrl, String secret) {
}
