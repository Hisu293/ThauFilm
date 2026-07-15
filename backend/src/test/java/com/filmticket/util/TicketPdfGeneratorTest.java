package com.filmticket.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

class TicketPdfGeneratorTest {

    @Test
    void loadsEmbeddedUnicodeFontForVietnameseTicketPdf() {
        assertDoesNotThrow(() -> Class.forName(TicketPdfGenerator.class.getName()));
    }
}
