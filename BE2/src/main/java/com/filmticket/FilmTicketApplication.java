package com.filmticket;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FilmTicketApplication {
    public static void main(String[] args) {
        SpringApplication.run(FilmTicketApplication.class, args);
    }
}
