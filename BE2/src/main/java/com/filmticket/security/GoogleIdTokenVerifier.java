package com.filmticket.security;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.Optional;

@Slf4j
@Component
public class GoogleIdTokenVerifier {

    @Value("${spring.security.oauth2.client.registration.google.client-id}")
    private String clientId;

    public Optional<GoogleIdToken.Payload> verify(String idToken) {
        try {
            com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier verifier =
                    new com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier.Builder(
                            new NetHttpTransport(), new GsonFactory())
                            .setAudience(Collections.singletonList(clientId))
                            .build();

            GoogleIdToken token = verifier.verify(idToken);
            if (token != null) {
                return Optional.of(token.getPayload());
            }
        } catch (Exception e) {
            log.error("Google ID token verification failed: {}", e.getMessage());
        }
        return Optional.empty();
    }
}
