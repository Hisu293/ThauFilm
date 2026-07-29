package com.filmticket.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

@Configuration
public class AwsS3Config {
    private static final Logger log = LoggerFactory.getLogger(AwsS3Config.class);

    @Bean
    public S3Client s3Client(
            @Value("${app.file-upload.s3.region}") String region,
            @Value("${app.file-upload.s3.access-key:}") String accessKey,
            @Value("${app.file-upload.s3.secret-key:}") String secretKey,
            @Value("${AWS_REGION:}") String awsRegion,
            @Value("${AWS_ACCESS_KEY_ID:}") String awsAccessKey,
            @Value("${AWS_SECRET_ACCESS_KEY:}") String awsSecretKey
    ) {
        String resolvedAccessKey = firstNonBlank(accessKey, awsAccessKey, System.getenv("AWS_ACCESS_KEY_ID"));
        String resolvedSecretKey = firstNonBlank(secretKey, awsSecretKey, System.getenv("AWS_SECRET_ACCESS_KEY"));
        String resolvedRegion = firstNonBlank(region, awsRegion, System.getenv("AWS_REGION"), "ap-southeast-1");
        log.info("Đang khởi tạo máy khách S3: khu vực={}, đã cấu hình khóa truy cập={}, đã cấu hình khóa bí mật={}",
                resolvedRegion, resolvedAccessKey != null, resolvedSecretKey != null);
        AwsCredentialsProvider credentialsProvider = resolvedAccessKey != null
                && resolvedSecretKey != null
                ? StaticCredentialsProvider.create(AwsBasicCredentials.create(resolvedAccessKey, resolvedSecretKey))
                : DefaultCredentialsProvider.create();

        return S3Client.builder()
                .region(Region.of(resolvedRegion))
                .credentialsProvider(credentialsProvider)
                .build();
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.trim().isBlank()) return value.trim();
        }
        return null;
    }
}
