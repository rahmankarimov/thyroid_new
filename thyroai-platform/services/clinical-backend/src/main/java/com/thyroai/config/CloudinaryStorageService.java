package com.thyroai.config;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@Slf4j
public class CloudinaryStorageService {

    @Value("${CLOUDINARY_URL:}")
    private String cloudinaryUrl;

    private Cloudinary cloudinary;

    @PostConstruct
    public void init() {
        if (cloudinaryUrl != null && !cloudinaryUrl.isBlank()) {
            cloudinary = new Cloudinary(cloudinaryUrl);
            log.info("Cloudinary storage enabled.");
        }
    }

    public boolean isEnabled() {
        return cloudinary != null;
    }

    /**
     * Uploads a file to Cloudinary and returns its secure HTTPS URL.
     */
    public String upload(String filename, byte[] data) {
        if (!isEnabled()) {
            throw new IllegalStateException("Cloudinary is not configured.");
        }
        try {
            String publicId = "thyroid/" + (filename.contains(".")
                    ? filename.substring(0, filename.lastIndexOf('.')) : filename);
            @SuppressWarnings("unchecked")
            Map<String, Object> result = cloudinary.uploader().upload(data, ObjectUtils.asMap(
                    "public_id", publicId,
                    "resource_type", "auto",
                    "overwrite", true
            ));
            return (String) result.get("secure_url");
        } catch (Exception e) {
            log.error("Cloudinary upload failed for {}: {}", filename, e.getMessage());
            throw new RuntimeException("Failed to upload image: " + e.getMessage(), e);
        }
    }
}
