package com.filmticket.util;

import com.filmticket.entity.*;
import com.filmticket.repository.*;
import com.filmticket.service.S3PresignedUrlService;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Chunk;
import com.lowagie.text.Rectangle;
import com.lowagie.text.Image;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.lowagie.text.pdf.BaseFont;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.List;
import java.util.Locale;

@Component
@RequiredArgsConstructor
@Slf4j
public class TicketPdfGenerator {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final String UNICODE_FONT_RESOURCE = "font-fallback/LiberationSans-Regular.ttf";
    private static final BaseFont UNICODE_BASE_FONT = loadUnicodeBaseFont();

    private final ShowtimeRepository showtimeRepository;
    private final MovieRepository movieRepository;
    private final CinemaRoomRepository cinemaRoomRepository;
    private final SeatRepository seatRepository;
    private final PaymentRepository paymentRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final S3PresignedUrlService s3PresignedUrlService;

    public byte[] generateTicketPdf(Booking booking, List<Ticket> tickets) throws Exception {
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

    private void addBrandHeader(Document document, Booking booking) throws Exception {
        Paragraph paragraph = new Paragraph("VÉ XEM PHIM", createHeaderFont());
        paragraph.setAlignment(Element.ALIGN_CENTER);
        paragraph.setSpacingAfter(6);
        document.add(paragraph);

        String title = getMovieTitle(booking);
        Paragraph movieTitle = new Paragraph(title, createSubHeaderFont());
        movieTitle.setAlignment(Element.ALIGN_CENTER);
        movieTitle.setSpacingAfter(10);
        document.add(movieTitle);

        try {
            addPoster(document, booking);
        } catch (Exception ex) {
            log.warn("Không thể tải poster khi tạo PDF vé cho booking {}; tiếp tục không có poster (loại lỗi={})",
                    booking.getId(), ex.getClass().getSimpleName());
        }
    }

    private String getMovieTitle(Booking booking) {
        return showtimeRepository.findById(booking.getShowtimeId())
                .map(s -> movieRepository.findById(s.getMovieId())
                        .map(movie -> displayMovieTitle(s, movie.getTitle()))
                        .orElse("Phim"))
                .orElse("Phim");
    }

    private String getMoviePosterUrl(Booking booking) {
        return showtimeRepository.findById(booking.getShowtimeId())
                .filter(s -> !isMysteryLocked(s))
                .map(s -> movieRepository.findById(s.getMovieId())
                        .map(Movie::getPosterUrl)
                        .orElse(null))
                .orElse(null);
    }

    private String displayMovieTitle(Showtime showtime, String realTitle) {
        return isMysteryLocked(showtime) ? "Mystery Movie Night" : realTitle;
    }

    private boolean isMysteryLocked(Showtime showtime) {
        if (showtime == null || !showtime.isMystery()) return false;
        LocalDateTime unlockAt = showtime.getMysteryUnlockAt() != null ? showtime.getMysteryUnlockAt() : showtime.getStartTime();
        return LocalDateTime.now().isBefore(unlockAt);
    }

    private void addPoster(Document document, Booking booking) throws Exception {
        String posterUrl = s3PresignedUrlService.resolvePosterUrl(getMoviePosterUrl(booking));
        if (posterUrl == null || posterUrl.isBlank()) {
            return;
        }

        BufferedImage posterImage;
        if (posterUrl.startsWith("data:image")) {
            String base64 = posterUrl.substring(posterUrl.indexOf(",") + 1);
            posterImage = ImageIO.read(new ByteArrayInputStream(Base64.getDecoder().decode(base64)));
        } else {
            posterImage = ImageIO.read(new URI(posterUrl).toURL());
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

    private BufferedImage resizeAndFrame(BufferedImage source, int maxWidth, int maxHeight) {
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

    private void addMetaTable(Document document, Booking booking) throws Exception {
        String cinemaName = "ThauFilm Cinema";
        String showtimeStr = "";

        Showtime s = showtimeRepository.findById(booking.getShowtimeId()).orElse(null);
        if (s != null) {
            if (s.isOnline()) {
                cinemaName = "ThauFilm Online";
            } else if (s.getCinemaRoomId() != null) {
                CinemaRoom room = cinemaRoomRepository.findById(s.getCinemaRoomId()).orElse(null);
                if (room != null) {
                    cinemaName = room.getName();
                }
            }
            showtimeStr = s.getStartTime().format(DATE_TIME_FORMATTER);
        }

        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[] { 1.2f, 2.8f });
        table.setSpacingBefore(10);
        table.setSpacingAfter(10);
        table.getDefaultCell().setBorder(Rectangle.NO_BORDER);
        table.getDefaultCell().setPadding(5);

        table.addCell(createLabelCell("RẠP / PHÒNG CHIẾU"));
        table.addCell(createValueCell(cinemaName));
        table.addCell(createLabelCell("SUẤT CHIẾU"));
        table.addCell(createValueCell(showtimeStr));
        table.addCell(createLabelCell("MÃ ĐẶT VÉ"));
        table.addCell(createValueCell(booking.getConfirmationCode()));

        document.add(table);
    }

    private void addTicketTable(Document document, Booking booking, List<Ticket> tickets) throws Exception {
        PdfPTable table = new PdfPTable(5);
        table.setWidthPercentage(100);
        table.setWidths(new float[] { 0.7f, 1.1f, 1.7f, 1.1f, 1.4f });
        table.setSpacingBefore(4);
        table.setSpacingAfter(10);

        table.addCell(createHeaderCell("STT"));
        table.addCell(createHeaderCell("GHẾ"));
        table.addCell(createHeaderCell("MÃ VÉ"));
        table.addCell(createHeaderCell("LOẠI GHẾ"));
        table.addCell(createHeaderCell("GIÁ"));

        java.util.Map<java.util.UUID, BigDecimal> seatPriceById = bookingSeatRepository
                .findByBookingId(booking.getId())
                .stream()
                .collect(java.util.stream.Collectors.toMap(
                        BookingSeat::getSeatId,
                        bs -> bs.getPriceAtBooking() != null ? bs.getPriceAtBooking() : BigDecimal.ZERO,
                        (a, b) -> a));

        for (int i = 0; i < tickets.size(); i++) {
            Ticket ticket = tickets.get(i);
            Seat seat = seatRepository.findById(ticket.getSeatId()).orElse(null);
            String seatInfo = seat != null
                    ? seat.getRowName() + seat.getSeatNumber()
                    : ticket.getSeatId().toString();
            String seatType = seat != null ? getSeatTypeLabel(seat.getType()) : "Không rõ";

            table.addCell(createDataCell(String.valueOf(i + 1)));
            table.addCell(createDataCell(seatInfo));
            table.addCell(createDataCell(ticket.getTicketCode()));
            table.addCell(createDataCell(seatType));
            table.addCell(createDataCell(formatMoney(seatPriceById.getOrDefault(ticket.getSeatId(), BigDecimal.ZERO)) + " đ"));

            if (i == 0) {
                table.setHeaderRows(1);
            }
        }

        document.add(table);
    }

    private void addAmountTable(Document document, Booking booking) throws Exception {
        BigDecimal finalAmount = paymentRepository.findByBookingId(booking.getId())
                .map(Payment::getAmount)
                .orElse(booking.getTotalAmount());
        BigDecimal discountAmount = booking.getTotalAmount().subtract(finalAmount).max(BigDecimal.ZERO);
        BigDecimal seatTotal = bookingSeatRepository.findByBookingId(booking.getId())
                .stream()
                .map(bs -> bs.getPriceAtBooking() != null ? bs.getPriceAtBooking() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal comboTotal = booking.getTotalAmount().subtract(seatTotal).max(BigDecimal.ZERO);
        boolean onlineBooking = showtimeRepository.findById(booking.getShowtimeId())
                .map(Showtime::isOnline)
                .orElse(false);

        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[] { 2.6f, 1.4f });
        table.setSpacingBefore(8);
        table.setSpacingAfter(14);
        table.getDefaultCell().setBorder(Rectangle.NO_BORDER);
        table.getDefaultCell().setPadding(5);

        table.addCell(createLabelCell(onlineBooking ? "VÉ XEM ONLINE" : "TIỀN GHẾ"));
        table.addCell(createValueCell(formatMoney(onlineBooking ? booking.getTotalAmount() : seatTotal) + " đ"));

        if (!onlineBooking && comboTotal.compareTo(BigDecimal.ZERO) > 0) {
            table.addCell(createLabelCell("COMBO BẮP NƯỚC"));
            table.addCell(createValueCell(formatMoney(comboTotal) + " đ"));
        }

        table.addCell(createLabelCell("TỔNG TRƯỚC GIẢM"));
        table.addCell(createValueCell(formatMoney(booking.getTotalAmount()) + " đ"));

        if (discountAmount.compareTo(BigDecimal.ZERO) > 0) {
            table.addCell(createLabelCell("GIẢM GIÁ"));
            table.addCell(createValueCell("-" + formatMoney(discountAmount) + " đ"));
            table.addCell(createLabelCell("THANH TOÁN"));
            table.addCell(createValueCell(formatMoney(finalAmount) + " đ", true));
        } else {
            table.addCell(createLabelCell("THANH TOÁN"));
            table.addCell(createValueCell(formatMoney(finalAmount) + " đ", true));
        }

        document.add(table);
    }

    private void addQrSection(Document document, String payload) throws Exception {
        String qrBase64 = TicketQrGenerator.generateQrBase64(payload, 200);
        byte[] qrBytes = Base64.getDecoder().decode(qrBase64);
        Image image = Image.getInstance(qrBytes);
        image.scaleToFit(140, 140);
        image.setAlignment(Image.ALIGN_CENTER);

        Paragraph paragraph = new Paragraph();
        paragraph.setAlignment(Element.ALIGN_CENTER);
        paragraph.setSpacingBefore(8);
        paragraph.setSpacingAfter(8);
        paragraph.add(new Phrase("Quét mã để xem chi tiết vé", createLabelFont()));
        paragraph.add(Chunk.NEWLINE);
        paragraph.add(image);
        document.add(paragraph);
    }

    private String buildTicketPayload(Booking booking, List<Ticket> tickets) {
        StringBuilder builder = new StringBuilder();
        builder.append("TICKET|");
        builder.append(booking.getConfirmationCode()).append("|");
        builder.append(getMovieTitle(booking)).append("|");

        Showtime s = showtimeRepository.findById(booking.getShowtimeId()).orElse(null);
        if (s != null) {
            builder.append(s.getStartTime().format(DATE_TIME_FORMATTER)).append("|");
            CinemaRoom room = s.getCinemaRoomId() == null
                    ? null
                    : cinemaRoomRepository.findById(s.getCinemaRoomId()).orElse(null);
            builder.append(s.isOnline() ? "ThauFilm Online" : room != null ? room.getName() : "Rạp").append("|");
        } else {
            builder.append("|");
        }

        for (int i = 0; i < tickets.size(); i++) {
            Ticket ticket = tickets.get(i);
            builder.append(ticket.getTicketCode()).append("=");
            builder.append(seatRepository.findById(ticket.getSeatId())
                    .map(seat -> seat.getRowName() + seat.getSeatNumber())
                    .orElse(ticket.getSeatId().toString()));
            if (i < tickets.size() - 1) {
                builder.append(";");
            }
        }
        return builder.toString();
    }

    private String getSeatTypeLabel(Seat.Type type) {
        if (type == null) return "Thường";
        return switch (type) {
            case VIP -> "VIP";
            case COUPLE -> "Ghế đôi";
            case STANDARD -> "Thường";
        };
    }

    private String formatMoney(BigDecimal value) {
        BigDecimal rounded = value.setScale(0, RoundingMode.HALF_UP);
        NumberFormat format = NumberFormat.getNumberInstance(Locale.forLanguageTag("vi-VN"));
        format.setMaximumFractionDigits(0);
        format.setMinimumFractionDigits(0);
        return format.format(rounded);
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

    private static BaseFont loadUnicodeBaseFont() {
        try (InputStream input = TicketPdfGenerator.class.getClassLoader().getResourceAsStream(UNICODE_FONT_RESOURCE)) {
            if (input == null) {
                throw new IllegalStateException("Không tìm thấy font Unicode cho PDF: " + UNICODE_FONT_RESOURCE);
            }
            byte[] fontBytes = input.readAllBytes();
            return BaseFont.createFont(
                    "LiberationSans-Regular.ttf",
                    BaseFont.IDENTITY_H,
                    BaseFont.EMBEDDED,
                    true,
                    fontBytes,
                    null
            );
        } catch (Exception ex) {
            throw new IllegalStateException("Không thể khởi tạo font Unicode cho PDF vé", ex);
        }
    }

    private static com.lowagie.text.Font createHeaderFont() {
        return new com.lowagie.text.Font(UNICODE_BASE_FONT, 18, com.lowagie.text.Font.BOLD,
                new Color(15, 30, 70));
    }

    private static com.lowagie.text.Font createSubHeaderFont() {
        return new com.lowagie.text.Font(UNICODE_BASE_FONT, 13, com.lowagie.text.Font.BOLD,
                new Color(45, 45, 45));
    }

    private static com.lowagie.text.Font createLabelFont() {
        return new com.lowagie.text.Font(UNICODE_BASE_FONT, 11, com.lowagie.text.Font.BOLD,
                new Color(90, 90, 100));
    }

    private static com.lowagie.text.Font createInfoFont() {
        return new com.lowagie.text.Font(UNICODE_BASE_FONT, 11, com.lowagie.text.Font.NORMAL,
                new Color(50, 50, 55));
    }

    private static com.lowagie.text.Font createHighlightFont() {
        return new com.lowagie.text.Font(UNICODE_BASE_FONT, 12, com.lowagie.text.Font.BOLD,
                new Color(200, 45, 60));
    }
}
