package com.filmticket.util;

import com.filmticket.entity.Booking;
import com.filmticket.entity.Seat;
import com.filmticket.entity.Showtime;
import com.filmticket.entity.Ticket;
import com.lowagie.text.Image;
import com.lowagie.text.Rectangle;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Chunk;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.net.URL;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

public class TicketPdfGenerator {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    public static byte[] generateTicketPdf(Booking booking, List<Ticket> tickets) throws Exception {
        Document document = new Document(PageSize.A4, 40, 40, 40, 40);
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        PdfWriter.getInstance(document, outputStream);
        document.open();

        addBrandHeader(document, booking);
        addMetaTable(document, booking);
        addTicketTable(document, booking, tickets);
        addAmountTable(document, booking);
        addQrSection(document, buildTicketPayload(booking, tickets));

        document.close();
        return outputStream.toByteArray();
    }

    private static void addBrandHeader(Document document, Booking booking) throws Exception {
        Paragraph paragraph = new Paragraph("VE XEM PHIM", createHeaderFont());
        paragraph.setAlignment(Element.ALIGN_CENTER);
        paragraph.setSpacingAfter(6);
        document.add(paragraph);

        String title = booking.getShowtime().getMovie().getTitle();
        Paragraph movieTitle = new Paragraph(title, createSubHeaderFont());
        movieTitle.setAlignment(Element.ALIGN_CENTER);
        movieTitle.setSpacingAfter(10);
        document.add(movieTitle);

        addPoster(document, booking);
    }

    private static void addPoster(Document document, Booking booking) throws Exception {
        String posterUrl = booking.getShowtime().getMovie().getPosterUrl();
        if (posterUrl == null || posterUrl.isBlank()) {
            return;
        }

        BufferedImage posterImage;
        if (posterUrl.startsWith("data:image")) {
            String base64 = posterUrl.substring(posterUrl.indexOf(",") + 1);
            posterImage = ImageIO.read(new ByteArrayInputStream(Base64.getDecoder().decode(base64)));
        } else {
            posterImage = ImageIO.read(new URL(posterUrl));
        }

        if (posterImage == null) {
            return;
        }

        BufferedImage resized = resizeAndFrame(posterImage, 260, 180);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(resized, "png", baos);
        Image image = Image.getInstance(baos.toByteArray());
        image.scaleToFit(220, 220);
        image.setAlignment(Image.ALIGN_CENTER);
        document.add(image);
        document.add(Chunk.NEWLINE);
    }

    private static BufferedImage resizeAndFrame(BufferedImage source, int maxWidth, int maxHeight) {
        int width = Math.min(source.getWidth(), maxWidth);
        int height = Math.min(source.getHeight(), maxHeight);
        BufferedImage resized = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = resized.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.drawImage(source, 0, 0, width, height, null);
        g.setColor(new Color(210, 210, 210));
        g.drawRect(0, 0, width - 1, height - 1);
        g.dispose();
        return resized;
    }

    private static void addMetaTable(Document document, Booking booking) throws Exception {
        Showtime showtime = booking.getShowtime();
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{1.2f, 2.8f});
        table.setSpacingBefore(10);
        table.setSpacingAfter(10);
        table.getDefaultCell().setBorder(Rectangle.NO_BORDER);
        table.getDefaultCell().setPadding(5);

        table.addCell(createLabelCell("RAP"));
        table.addCell(createValueCell(showtime.getCinemaRoom().getName()));
        table.addCell(createLabelCell("SUAT CHIEU"));
        table.addCell(createValueCell(showtime.getStartTime().format(DATE_TIME_FORMATTER)));
        table.addCell(createLabelCell("MA DAT VE"));
        table.addCell(createValueCell(booking.getConfirmationCode()));

        document.add(table);
    }

    private static void addTicketTable(Document document, Booking booking, List<Ticket> tickets) throws Exception {
        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{0.8f, 1.2f, 1.8f, 1.2f});
        table.setSpacingBefore(4);
        table.setSpacingAfter(10);

        table.addCell(createHeaderCell("STT"));
        table.addCell(createHeaderCell("GHE"));
        table.addCell(createHeaderCell("MA VE"));
        table.addCell(createHeaderCell("LOAI"));

        for (int i = 0; i < tickets.size(); i++) {
            Ticket ticket = tickets.get(i);
            Seat seat = findSeat(booking, ticket.getSeatId());

            table.addCell(createDataCell(String.valueOf(i + 1)));
            table.addCell(createDataCell(seat != null ? (seat.getRowName() + seat.getSeatNumber()) : ticket.getSeatId().toString()));
            table.addCell(createDataCell(ticket.getTicketCode()));
            table.addCell(createDataCell(seat != null ? seat.getType().toDisplayValue() : "Thuong"));

            if (i == 0) {
                table.setHeaderRows(1);
            }
        }

        document.add(table);
    }

    private static void addAmountTable(Document document, Booking booking) throws Exception {
        BigDecimal discountAmount = BigDecimal.ZERO;
        BigDecimal finalAmount = booking.getTotalAmount();

        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{2.6f, 1.4f});
        table.setSpacingBefore(8);
        table.setSpacingAfter(14);
        table.getDefaultCell().setBorder(Rectangle.NO_BORDER);
        table.getDefaultCell().setPadding(5);

        table.addCell(createLabelCell("TONG TIEN"));
        table.addCell(createValueCell(formatMoney(booking.getTotalAmount()) + " VND"));

        if (discountAmount.compareTo(BigDecimal.ZERO) > 0) {
            table.addCell(createLabelCell("GIAM GIA"));
            table.addCell(createValueCell("-" + formatMoney(discountAmount) + " VND"));
            table.addCell(createLabelCell("THANH TOAN"));
            table.addCell(createValueCell(formatMoney(finalAmount) + " VND", true));
        } else {
            table.addCell(createLabelCell("THANH TOAN"));
            table.addCell(createValueCell(formatMoney(finalAmount) + " VND", true));
        }

        document.add(table);
    }

    private static void addQrSection(Document document, String payload) throws Exception {
        String qrBase64 = TicketQrGenerator.generateQrBase64(payload, 200);
        byte[] qrBytes = Base64.getDecoder().decode(qrBase64);
        Image image = Image.getInstance(qrBytes);
        image.scaleToFit(140, 140);
        image.setAlignment(Image.ALIGN_CENTER);

        Paragraph paragraph = new Paragraph();
        paragraph.setAlignment(Element.ALIGN_CENTER);
        paragraph.setSpacingBefore(8);
        paragraph.setSpacingAfter(8);
        paragraph.add(new Phrase("Quet ma de xem chi tiet ve", createLabelFont()));
        paragraph.add(Chunk.NEWLINE);
        paragraph.add(image);
        document.add(paragraph);
    }

    private static Seat findSeat(Booking booking, UUID seatId) {
        if (booking.getBookingSeats() == null) {
            return null;
        }
        return booking.getBookingSeats().stream()
                .filter(bs -> bs.getSeat().getId().equals(seatId))
                .map(bs -> bs.getSeat())
                .findFirst()
                .orElse(null);
    }

    private static String formatMoney(BigDecimal value) {
        BigDecimal rounded = value.setScale(0, RoundingMode.HALF_UP);
        NumberFormat format = NumberFormat.getNumberInstance(new Locale("vi", "VN"));
        format.setMaximumFractionDigits(0);
        format.setMinimumFractionDigits(0);
        return format.format(rounded);
    }

    private static String buildTicketPayload(Booking booking, List<Ticket> tickets) {
        StringBuilder builder = new StringBuilder();
        builder.append("TICKET|");
        builder.append(booking.getConfirmationCode()).append("|");
        builder.append(booking.getShowtime().getMovie().getTitle()).append("|");
        builder.append(booking.getShowtime().getStartTime().format(DATE_TIME_FORMATTER)).append("|");
        builder.append(booking.getShowtime().getCinemaRoom().getName()).append("|");
        for (int i = 0; i < tickets.size(); i++) {
            Ticket ticket = tickets.get(i);
            Seat seat = findSeat(booking, ticket.getSeatId());
            builder.append(ticket.getTicketCode()).append("=");
            builder.append(seat != null ? (seat.getRowName() + seat.getSeatNumber()) : ticket.getSeatId().toString());
            if (i < tickets.size() - 1) {
                builder.append(";");
            }
        }
        return builder.toString();
    }

    private static PdfPCell createHeaderCell(String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text, createLabelFont()));
        cell.setBackgroundColor(new Color(240, 243, 247));
        cell.setPadding(7);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        return cell;
    }

    private static PdfPCell createDataCell(String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text, createInfoFont()));
        cell.setPadding(7);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        return cell;
    }

    private static PdfPCell createLabelCell(String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text, createLabelFont()));
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPadding(7);
        return cell;
    }

    private static PdfPCell createValueCell(String text) {
        return createValueCell(text, false);
    }

    private static PdfPCell createValueCell(String text, boolean highlight) {
        PdfPCell cell = new PdfPCell(new Phrase(text, createInfoFont()));
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPadding(7);
        cell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        if (highlight) {
            cell.setPhrase(new Phrase(text, createHighlightFont()));
        }
        return cell;
    }

    private static com.lowagie.text.Font createHeaderFont() {
        return new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 18, com.lowagie.text.Font.BOLD, new Color(15, 30, 70));
    }

    private static com.lowagie.text.Font createSubHeaderFont() {
        return new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 13, com.lowagie.text.Font.BOLD, new Color(45, 45, 45));
    }

    private static com.lowagie.text.Font createLabelFont() {
        return new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 11, com.lowagie.text.Font.BOLD, new Color(90, 90, 100));
    }

    private static com.lowagie.text.Font createInfoFont() {
        return new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 11, com.lowagie.text.Font.NORMAL, new Color(50, 50, 55));
    }

    private static com.lowagie.text.Font createHighlightFont() {
        return new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 12, com.lowagie.text.Font.BOLD, new Color(200, 45, 60));
    }
}
