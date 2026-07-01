package com.filmticket.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class JwtTokenProvider {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.access-expiration}")
    private long accessTokenExpiration;

    @Value("${jwt.refresh-expiration}")
    private long refreshTokenExpiration;

    private final ConcurrentHashMap<String, Long> blacklist = new ConcurrentHashMap<>();

    private SecretKey getSigningKey() {
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateAccessToken(String username, String role) {
        return generateToken(username, role, accessTokenExpiration);
    }

    public String generateRefreshToken(String username, String role) {
        return generateToken(username, role, refreshTokenExpiration);
    }

    public long getRefreshTokenExpiration() {
        return refreshTokenExpiration;
    }

    private String generateToken(String username, String role, long expirationMillis) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationMillis);

        return Jwts.builder()
                .subject(username)
                .claim("role", role)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey())
                .compact();
    }

    public String getUsernameFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return claims.getSubject();
    }

    public String getRoleFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
        Object role = claims.get("role");
        return role != null ? role.toString() : null;
    }

    public boolean validateToken(String token) {
        try {
            if (blacklist.containsKey(token)) {
                log.debug("Token is blacklisted");
                return false;
            }
            Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (ExpiredJwtException e) {
            log.error("JWT token is expired");
        } catch (MalformedJwtException e) {
            log.error("Invalid JWT token");
        } catch (UnsupportedJwtException e) {
            log.error("JWT token is unsupported");
        } catch (JwtException e) {
            log.warn("Invalid JWT token: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            log.error("JWT claims string is empty");
        }
        return false;
    }

    public void blacklistToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            long remaining = claims.getExpiration().getTime() - System.currentTimeMillis();
            if (remaining > 0) {
                blacklist.put(token, remaining);
                log.info("Token blacklisted, will expire in {}ms", remaining);
            }
        } catch (Exception e) {
            log.warn("Could not blacklist token: {}", e.getMessage());
        }
    }
}
