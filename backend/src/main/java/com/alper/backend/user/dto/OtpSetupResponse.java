package com.alper.backend.user.dto;

public record OtpSetupResponse(String qrCodeDataUrl, String secret) {
}
