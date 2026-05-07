package com.alper.backend.admin.websocket;

public final class AdminWebSocketTopics {

    public static final String PREFIX = "/topic/admin/";

    public static final String AUDIT = PREFIX + "audit";
    public static final String USERS = PREFIX + "users";
    public static final String NEWS = PREFIX + "news";
    public static final String JOBS = PREFIX + "jobs";
    public static final String TRADES = PREFIX + "trades";
    public static final String NOTIFICATIONS = PREFIX + "notifications";

    private AdminWebSocketTopics() {
    }
}