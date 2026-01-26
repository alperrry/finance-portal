FROM quay.io/keycloak/keycloak:26.0.8 AS builder
WORKDIR /opt/keycloak

COPY ./keycloak/providers/finance-portal-theme.jar /opt/keycloak/providers/finance-portal-theme.jar
RUN /opt/keycloak/bin/kc.sh build

FROM quay.io/keycloak/keycloak:26.0.8
COPY --from=builder /opt/keycloak/ /opt/keycloak/

ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start-dev"]
