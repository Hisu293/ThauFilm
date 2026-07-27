package com.filmticket.dto;

public record UploadFileResponse(
        String fileName,
        String fileUrl,
        String contentType,
        long fileSize
) {
}
