package com.filmticket.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class DatabaseRoleConstraintConfig {

    private final JdbcTemplate jdbcTemplate;

    @Bean
    public CommandLineRunner ensureUserRoleConstraint() {
        return args -> {
            jdbcTemplate.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
            jdbcTemplate.execute("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('ADMIN', 'MEMBER', 'STAFF'))");
            log.info("Ensured users_role_check supports ADMIN, MEMBER, and STAFF");
        };
    }
}
