package com.demandforecast.auth.security;

import com.demandforecast.user.model.UserEntity;
import com.demandforecast.user.model.UserStatus;
import com.demandforecast.user.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String AUTHORIZATION_HEADER =
            "Authorization";

    private static final String BEARER_PREFIX =
            "Bearer ";

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(
            JwtService jwtService,
            UserRepository userRepository
    ) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String authorization =
                request.getHeader(AUTHORIZATION_HEADER);

        if (
                authorization == null ||
                        !authorization.startsWith(BEARER_PREFIX)
        ) {
            filterChain.doFilter(request, response);
            return;
        }

        String token =
                authorization.substring(
                        BEARER_PREFIX.length()
                );

        Optional<Long> userId =
                jwtService.extractUserId(token);

        if (userId.isEmpty()) {
            filterChain.doFilter(request, response);
            return;
        }

        if (
                SecurityContextHolder
                        .getContext()
                        .getAuthentication() != null
        ) {
            filterChain.doFilter(request, response);
            return;
        }

        Optional<UserEntity> userOptional =
                userRepository.findById(
                        userId.get()
                );

        if (userOptional.isEmpty()) {
            filterChain.doFilter(request, response);
            return;
        }

        UserEntity user = userOptional.get();

        /*
         * The current status is always checked in PostgreSQL.
         *
         * Therefore an old valid JWT cannot be used after
         * the administrator blocks the user.
         */
        if (user.getStatus() != UserStatus.ACTIVE) {
            filterChain.doFilter(request, response);
            return;
        }

        AuthenticatedUser principal =
                new AuthenticatedUser(
                        user.getId(),
                        user.getEmail(),
                        user.getRole()
                );

        SimpleGrantedAuthority authority =
                new SimpleGrantedAuthority(
                        "ROLE_" +
                                user.getRole().name()
                );

        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(
                        principal,
                        null,
                        List.of(authority)
                );

        authentication.setDetails(
                new WebAuthenticationDetailsSource()
                        .buildDetails(request)
        );

        SecurityContextHolder
                .getContext()
                .setAuthentication(authentication);

        filterChain.doFilter(request, response);
    }
}