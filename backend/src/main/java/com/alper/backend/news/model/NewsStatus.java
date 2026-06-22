package com.alper.backend.news.model;

/**
 * Haber yaşam döngüsü durumları: yayında, arşivlenmiş ve kaldırılmış.
 *
 * <p>Değerler veritabanında küçük harfle saklandığından enum adları da küçüktür.</p>
 */
public enum NewsStatus {
    published, archived, removed
}
