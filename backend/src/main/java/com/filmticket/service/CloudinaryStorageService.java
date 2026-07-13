package com.filmticket.service;

import com.filmticket.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Set;

@Service
public class CloudinaryStorageService {
    private static final long MAX_IMAGE_SIZE = 8L * 1024 * 1024;
    private static final Set<String> SUPPORTED_TYPES = Set.of("image/jpeg", "image/png", "image/webp");

    private final String cloudName;
    private final String apiKey;
    private final String apiSecret;
    private final String folder;
    private final RestClient restClient;

    public CloudinaryStorageService(
            @Value("${app.cloudinary.cloud-name:}") String cloudName,
            @Value("${app.cloudinary.api-key:}") String apiKey,
            @Value("${app.cloudinary.api-secret:}") String apiSecret,
            @Value("${app.cloudinary.folder:thau-film/community}") String folder) {
        this.cloudName = cloudName == null ? "" : cloudName.trim();
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.apiSecret = apiSecret == null ? "" : apiSecret.trim();
        this.folder = folder == null || folder.isBlank() ? "thau-film/community" : folder.trim();
        this.restClient = RestClient.builder().baseUrl("https://api.cloudinary.com/v1_1").build();
    }

    public UploadedImage upload(MultipartFile file) {
        validateConfiguration();
        validateFile(file);
        try {
            MultiValueMap<String, Object> parts = new LinkedMultiValueMap<>();
            parts.add("file", new NamedByteArrayResource(file.getBytes(), safeFilename(file)));
            parts.add("folder", folder);
            parts.add("resource_type", "image");
            parts.add("unique_filename", "true");
            parts.add("overwrite", "false");

            Map<?, ?> result = restClient.post()
                    .uri("/{cloudName}/image/upload", cloudName)
                    .headers(headers -> headers.setBasicAuth(apiKey, apiSecret, StandardCharsets.UTF_8))
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(parts)
                    .retrieve()
                    .body(Map.class);
            if (result == null || result.get("secure_url") == null || result.get("public_id") == null) {
                throw new BadRequestException("Cloudinary không trả về thông tin hình ảnh hợp lệ");
            }
            return new UploadedImage(result.get("secure_url").toString(), result.get("public_id").toString());
        } catch (IOException exception) {
            throw new BadRequestException("Không thể đọc hình ảnh tải lên");
        } catch (BadRequestException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new BadRequestException("Không thể tải hình ảnh lên Cloudinary");
        }
    }

    public void deleteQuietly(String publicId) {
        if (publicId == null || publicId.isBlank() || !configured()) return;
        try {
            MultiValueMap<String, Object> parts = new LinkedMultiValueMap<>();
            parts.add("public_id", publicId);
            parts.add("invalidate", "true");
            restClient.post()
                    .uri("/{cloudName}/image/destroy", cloudName)
                    .headers(headers -> headers.setBasicAuth(apiKey, apiSecret, StandardCharsets.UTF_8))
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(parts)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception ignored) {
            // A failed cleanup must not make an already-saved post unusable.
        }
    }

    private void validateConfiguration() {
        if (!configured()) {
            throw new BadRequestException("Backend chưa được cấu hình Cloudinary");
        }
    }

    private boolean configured() {
        return !cloudName.isBlank() && !apiKey.isBlank() && !apiSecret.isBlank();
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new BadRequestException("Hình ảnh không được để trống");
        if (file.getSize() > MAX_IMAGE_SIZE) throw new BadRequestException("Hình ảnh không được vượt quá 8 MB");
        if (!SUPPORTED_TYPES.contains(file.getContentType())) {
            throw new BadRequestException("Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP");
        }
    }

    private String safeFilename(MultipartFile file) {
        String original = file.getOriginalFilename();
        if (original == null || original.isBlank()) return "community-image";
        return original.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private static final class NamedByteArrayResource extends ByteArrayResource {
        private final String filename;

        private NamedByteArrayResource(byte[] byteArray, String filename) {
            super(byteArray);
            this.filename = filename;
        }

        @Override
        public String getFilename() {
            return filename;
        }
    }

    public record UploadedImage(String secureUrl, String publicId) {}
}
