# ── Build aşaması ──────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -q -DskipTests package

# ── OTel Agent indir (ayrı stage — layer cache'e girer) ────
FROM eclipse-temurin:21-jre AS agent
# Spesifik versiyon pin'li — latest kullanma, her build farklı versiyon getirir
ADD https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/download/v2.12.0/opentelemetry-javaagent.jar \
    /opentelemetry-javaagent.jar

# ── Runtime aşaması ────────────────────────────────────────
FROM eclipse-temurin:21-jre
WORKDIR /app

# Uygulama jar'ı
COPY --from=build /app/target/*.jar app.jar

# OTel agent — build stage'den kopyalanıyor, her seferinde GitHub'dan indirilmiyor
COPY --from=agent /opentelemetry-javaagent.jar /opentelemetry-javaagent.jar

EXPOSE 8081

# JAVA_TOOL_OPTIONS docker-compose.yml'den geliyor (-javaagent:/opentelemetry-javaagent.jar)
# Burada tekrar yazılmıyor, compose env'i ezmesin diye
ENTRYPOINT ["java", "-jar", "/app/app.jar"]