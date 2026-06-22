package com.alper.backend.common.web;

/**
 * REST endpoint'lerinin döndürdüğü ortak yanıt zarfı.
 *
 * @param <T>     taşınan veri tipi
 * @param success işlemin başarılı olup olmadığı
 * @param data    yanıt gövdesi
 */
public record ApiResponse<T>(
    boolean success,
    T data
) {
    /**
     * Başarılı bir yanıt zarfı oluşturur.
     *
     * @param data taşınacak veri
     * @param <T>  veri tipi
     * @return {@code success=true} olarak işaretlenmiş yanıt
     */
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, data);
    }
}
