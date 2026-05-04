package com.alper.backend.user.service;

import com.alper.backend.common.exception.BadRequestException;
import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.user.model.User;
import com.alper.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

/**
 * Kullanıcı bakiyesini yöneten servis.
 * Tüm portföyler bu tek bakiyeden harcama yapar.
 */
@Service
@RequiredArgsConstructor
@Log4j2
public class UserBalanceService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public BigDecimal getBalance(Long userId) {
        return userRepository.findById(userId)
                .map(User::getBalance)
                .orElseThrow(() -> new NotFoundException("user"));
    }

    /**
     * BUY için bakiye yeterliliğini kontrol eder.
     */
    @Transactional(readOnly = true)
    public void verifySufficientBalance(Long userId, BigDecimal requiredAmount) {
        BigDecimal currentBalance = getBalance(userId);
        if (currentBalance.compareTo(requiredAmount) < 0) {
            throw new BadRequestException(
                    String.format("Yetersiz bakiye. Mevcut: %s TL, gereken: %s TL",
                            currentBalance, requiredAmount));
        }
    }

    /**
     * Bakiyeyi günceller. BUY için negatif delta, SELL için pozitif delta kullanılır.
     */
    @Transactional
    public void adjustBalance(Long userId, BigDecimal delta) {
        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new NotFoundException("user"));
        BigDecimal newBalance = user.getBalance().add(delta);
        if (newBalance.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException(
                    String.format("Bakiye negatife düşemez. Mevcut: %s, delta: %s",
                            user.getBalance(), delta));
        }
        user.setBalance(newBalance);
        userRepository.save(user);
        log.debug("Kullanıcı bakiyesi güncellendi. userId={}, delta={}, newBalance={}",
                userId, delta, newBalance);
    }

    /**
     * PENDING BUY emirleri için tutarı emir anında harcanabilir bakiyeden düşer.
     */
    @Transactional
    public void reserveBalance(Long userId, BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Bloke edilecek tutar 0'dan büyük olmalı");
        }

        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new NotFoundException("user"));
        if (user.getBalance().compareTo(amount) < 0) {
            throw new BadRequestException(
                    String.format("Yetersiz bakiye. Mevcut: %s TL, bloke edilecek: %s TL",
                            user.getBalance(), amount));
        }

        BigDecimal newBalance = user.getBalance().subtract(amount);
        user.setBalance(newBalance);
        userRepository.save(user);
        log.debug("Kullanıcı bakiyesi bloke edildi. userId={}, reservedAmount={}, newBalance={}",
                userId, amount, newBalance);
    }
}
