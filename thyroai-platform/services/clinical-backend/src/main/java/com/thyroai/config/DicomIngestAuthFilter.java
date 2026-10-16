package com.thyroai.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

@Component
@Slf4j
public class DicomIngestAuthFilter extends OncePerRequestFilter {

    private static final String INGEST_PATH = "/api/v1/dicom/ingest";
    private static final String HEADER = "X-Ingest-Key";

    @Value("${thyroai.dicom.ingest-key:}")
    private String ingestKey;

    @Value("${thyroai.dicom.ingest-enabled:true}")
    private boolean ingestEnabled;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        if (!INGEST_PATH.equals(request.getServletPath())) {
            chain.doFilter(request, response);
            return;
        }

        if (!ingestEnabled || ingestKey == null || ingestKey.isBlank()) {
            log.warn("Rejected DICOM ingest from {}: ingest is disabled or no ingest key is configured",
                    request.getRemoteAddr());
            chain.doFilter(request, response);
            return;
        }

        String provided = request.getHeader(HEADER);
        if (provided != null && MessageDigest.isEqual(
                provided.getBytes(StandardCharsets.UTF_8),
                ingestKey.getBytes(StandardCharsets.UTF_8))) {
            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    "dicom-pipeline", null, List.of(new SimpleGrantedAuthority("ROLE_DICOM_INGEST")));
            SecurityContextHolder.getContext().setAuthentication(auth);
        } else {
            log.warn("Rejected DICOM ingest from {}: missing or invalid {}",
                    request.getRemoteAddr(), HEADER);
        }

        chain.doFilter(request, response);
    }
}
