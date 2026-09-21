package com.demandforecast.auth.bootstrap;

import com.demandforecast.user.model.UserEntity;
import com.demandforecast.user.model.UserRole;
import com.demandforecast.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Component
public class BootstrapAdminInitializer
        implements ApplicationRunner {

    private static final Logger log =
            LoggerFactory.getLogger(
                    BootstrapAdminInitializer.class
            );

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    private final boolean enabled;
    private final String name;
    private final String email;
    private final String password;

    public BootstrapAdminInitializer(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,

            @Value("${app.bootstrap-admin.enabled}")
            boolean enabled,

            @Value("${app.bootstrap-admin.name}")
            String name,

            @Value("${app.bootstrap-admin.email}")
            String email,

            @Value("${app.bootstrap-admin.password}")
            String password
    ) {
        this.userRepository =
                userRepository;

        this.passwordEncoder =
                passwordEncoder;

        this.enabled = enabled;
        this.name = name;
        this.email = email;
        this.password = password;
    }

    @Override
    @Transactional
    public void run(
            ApplicationArguments args
    ) {
        if (!enabled) {
            return;
        }

        String normalizedName =
                name == null
                        ? ""
                        : name.trim();

        String normalizedEmail =
                email == null
                        ? ""
                        : email
                        .trim()
                        .toLowerCase(
                                Locale.ROOT
                        );

        if (
                normalizedName.isBlank() ||
                        normalizedEmail.isBlank() ||
                        password == null ||
                        password.isBlank()
        ) {
            throw new IllegalStateException(
                    "Bootstrap admin is enabled, "
                            + "but its configuration is incomplete"
            );
        }

        if (password.length() < 8) {
            throw new IllegalStateException(
                    "Bootstrap admin password "
                            + "must contain at least 8 characters"
            );
        }

        if (
                userRepository
                        .existsByEmailIgnoreCase(
                                normalizedEmail
                        )
        ) {
            log.info(
                    "Bootstrap administrator already exists: {}",
                    normalizedEmail
            );

            return;
        }

        UserEntity admin =
                UserEntity.create(
                        normalizedName,
                        normalizedEmail,
                        passwordEncoder.encode(password),
                        UserRole.ADMIN
                );

        userRepository.save(admin);

        log.info(
                "Bootstrap administrator created: {}",
                normalizedEmail
        );
    }
}