package com.pdfdata.pdf_etl_pipeline.service;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import io.minio.RemoveObjectArgs;
import io.minio.GetObjectArgs;
import java.io.InputStream;
import java.util.Optional;

import java.io.ByteArrayInputStream;

@Slf4j
@Service
public class S3StorageService {

    @Value("${minio.url}")
    private String endpoint;

    @Value("${minio.access-key}")
    private String accessKey;

    @Value("${minio.secret-key}")
    private String secretKey;

    @Value("${minio.bucket}")
    private String bucketName;

    private MinioClient minioClient;

    @PostConstruct
    public void init() {
        this.minioClient = MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .region("eu-west-1")
                .build();

        ensureBucketExists();
    }
    public Optional<byte[]> downloadBytes(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) return Optional.empty();
        try (InputStream stream = minioClient.getObject(
                GetObjectArgs.builder()
                        .bucket(bucketName)
                        .object(objectKey)
                        .build()
        )) {
            return Optional.of(stream.readAllBytes());
        } catch (Exception e) {
            log.warn("No se pudo recuperar '{}' desde S3: {}", objectKey, e.getMessage());
            return Optional.empty();
        }
    }

    private void ensureBucketExists() {
        try {
            boolean exists = minioClient.bucketExists(
                    BucketExistsArgs.builder().bucket(bucketName).build()
            );
            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
                log.info("Bucket S3 creado automáticamente en LocalStack: {}", bucketName);
            } else {
                log.info("Bucket S3 verificado: {}", bucketName);
            }
        } catch (Exception e) {
            log.error("Error inicializando el bucket S3 '{}': {}", bucketName, e.getMessage());
        }
    }

    public String uploadBytes(String objectKey, byte[] content, String contentType) throws Exception {
        try (ByteArrayInputStream inputStream = new ByteArrayInputStream(content)) {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectKey)
                            .stream(inputStream, content.length, -1)
                            .contentType(contentType)
                            .build()
            );
        }
        return objectKey;
    }

    public void deleteObject(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) return;
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectKey)
                            .build()
            );
            log.info("Objeto eliminado de S3: {}", objectKey);
        } catch (Exception e) {
            // Si LocalStack se reinició y el archivo ya no existe, no bloqueamos el borrado en PostgreSQL
            log.warn("No se pudo eliminar '{}' de S3: {}", objectKey, e.getMessage());
        }
    }
}