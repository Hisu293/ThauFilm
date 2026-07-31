package com.filmticket.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final CustomUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt) && jwtTokenProvider.validateToken(jwt)) {
                String username = jwtTokenProvider.getUsernameFromToken(jwt);
                String role = jwtTokenProvider.getRoleFromToken(jwt);
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                List<SimpleGrantedAuthority> authorities = role != null
                        ? List.of(new SimpleGrantedAuthority("ROLE_" + role))
                        : userDetails.getAuthorities().stream()
                                .map(authority -> new SimpleGrantedAuthority(authority.getAuthority()))
                                .toList();

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(userDetails, null, authorities);
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);

                log.info("Đã xác thực yêu cầu: đường dẫn={}, người dùng={}, quyền={}", request.getServletPath(), username, authorities);
            } else if (StringUtils.hasText(jwt) && !isPublicRequest(request)) {
                log.warn("JWT không hợp lệ cho đường dẫn={}", request.getServletPath());
            }
        } catch (Exception ex) {
            log.error("Không thể thiết lập xác thực người dùng trong ngữ cảnh bảo mật", ex);
        }

        filterChain.doFilter(request, response);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return isPublicRequest(request);
    }

    private boolean isPublicRequest(HttpServletRequest request) {
        String path = request.getServletPath();
        String method = request.getMethod();

        return HttpMethod.OPTIONS.matches(method)
                || path.startsWith("/api/auth/register")
                || path.startsWith("/api/auth/forgot-password/")
                || path.startsWith("/api/auth/login")
                || path.startsWith("/api/auth/google")
                || path.startsWith("/api/auth/refresh")
                || path.startsWith("/api/auth/logout")
                || path.equals("/api/payments/webhooks") || path.startsWith("/api/payments/webhooks/")
                || path.equals("/api/movie-chatbot") || path.startsWith("/api/movie-chatbot/")
                || path.equals("/api/showtimes") || path.startsWith("/api/showtimes/")
                || path.equals("/api/events/movies")
                || path.equals("/actuator/health")
                || path.equals("/actuator/info")
                || (HttpMethod.GET.matches(method) && path.startsWith("/api/favorite-lists/public/"))
                || path.startsWith("/swagger-ui")
                || path.startsWith("/v3/api-docs");
    }
}
