package com.filmticket.service;

import com.filmticket.dto.UploadFileResponse;
import com.filmticket.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class S3Service {
    private static final long MAX_IMAGE_SIZE = 5L * 1024 * 1024;
    private static final long MAX_VIDEO_SIZE = 200L * 1024 * 1024;
    private static final Set<String> ALLOWED_FOLDERS = Set.of("images", "posters", "trailers");
    private static final Set<String> IMAGE_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");
    private static final Set<String> VIDEO_EXTENSIONS = Set.of("mp4", "mov");

    private final S3Client s3Client;
    private final String bucket;
    private final String region;
    private final String publicBaseUrl;

    public S3Service(
            S3Client s3Client,
            @Value("${app.file-upload.s3.bucket:}") String bucket,
            @Value("${app.file-upload.s3.region:ap-southeast-1}") String region,
            @Value("${app.file-upload.s3.public-base-url:}") String publicBaseUrl
    ) {
        this.s3Client = s3Client;
        this.bucket = normalize(bucket);
        this.region = normalize(region);
        this.publicBaseUrl = publicBaseUrl == null || publicBaseUrl.isBlank() ? null : publicBaseUrl.trim();
    }

    public UploadFileResponse upload(MultipartFile file, String requestedFolder) {
        validateConfiguration();
        FileInfo fileInfo = validateFile(file);
        String folder = resolveFolder(requestedFolder, fileInfo.extension());
        String objectKey = folder + "/" + UUID.randomUUID() + "." + fileInfo.extension();

        try {
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(objectKey)
                    .contentType(fileInfo.contentType())
                    .contentLength(file.getSize())
                    .build();
            s3Client.putObject(request, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
            return new UploadFileResponse(
                    fileInfo.originalName(),
                    publicUrl(objectKey),
                    fileInfo.contentType(),
                    file.getSize()
            );
        } catch (IOException exception) {
            throw new BadRequestException("Không thể đọc file upload");
        } catch (S3Exception exception) {
            throw new BadRequestException("Không thể upload file lên Amazon S3");
        } catch (SdkClientException exception) {
            throw new BadRequestException("Không thể kết nối Amazon S3. Kiểm tra bucket, region và AWS credentials trên Railway");
        }
    }

    private FileInfo validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File upload không được để trống");
        }

        String originalName = file.getOriginalFilename() == null ? "file" : file.getOriginalFilename();
        String extension = extensionOf(originalName);
        if (!IMAGE_EXTENSIONS.contains(extension) && !VIDEO_EXTENSIONS.contains(extension)) {
            throw new BadRequestException("Chỉ hỗ trợ file JPG, JPEG, PNG, WebP, MP4 hoặc MOV");
        }

        boolean video = VIDEO_EXTENSIONS.contains(extension);
        long maxSize = video ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
        if (file.getSize() > maxSize) {
            throw new BadRequestException(video
                    ? "Video không được vượt quá 200MB"
                    : "Ảnh không được vượt quá 5MB");
        }

        String contentType = contentTypeOf(extension);
        return new FileInfo(safeName(originalName), extension, contentType);
    }

    private String resolveFolder(String requestedFolder, String extension) {
        String folder = normalize(requestedFolder);
        if (folder == null) {
            return videoExtension(extension) ? "trailers" : "images";
        }
        if (!ALLOWED_FOLDERS.contains(folder)) {
            throw new BadRequestException("Folder upload không hợp lệ");
        }
        return folder;
    }

    private String publicUrl(String objectKey) {
        String base = publicBaseUrl != null
                ? publicBaseUrl.replaceAll("/+$", "")
                : "https://" + bucket + ".s3." + region + ".amazonaws.com";
        return base + "/" + encodePath(objectKey);
    }

    private void validateConfiguration() {
        if (bucket == null || bucket.isBlank()) {
            throw new BadRequestException("S3 bucket chưa được cấu hình");
        }
    }

    private String contentTypeOf(String extension) {
        return switch (extension) {
            case "jpg", "jpeg" -> "image/jpeg";
            case "png" -> "image/png";
            case "webp" -> "image/webp";
            case "mp4" -> "video/mp4";
            case "mov" -> "video/quicktime";
            default -> "application/octet-stream";
        };
    }

    private boolean videoExtension(String extension) {
        return VIDEO_EXTENSIONS.contains(extension);
    }

    private String extensionOf(String fileName) {
        int dot = fileName.lastIndexOf('.');
        if (dot < 0 || dot == fileName.length() - 1) {
            throw new BadRequestException("File phải có phần mở rộng hợp lệ");
        }
        return fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private String safeName(String fileName) {
        return fileName.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private String encodePath(String objectKey) {
        return java.util.Arrays.stream(objectKey.split("/"))
                .map(part -> URLEncoder.encode(part, StandardCharsets.UTF_8).replace("+", "%20"))
                .reduce((left, right) -> left + "/" + right)
                .orElse(objectKey);
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private record FileInfo(String originalName, String extension, String contentType) {}
}
