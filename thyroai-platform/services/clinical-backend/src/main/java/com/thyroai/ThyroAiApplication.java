package com.thyroai;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class ThyroAiApplication {
    public static void main(String[] args) {
        SpringApplication.run(ThyroAiApplication.class, args);
    }
}
