package com.thyroai.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Sliding-window rate limiter: max 10 login attempts per IP per minute.
 * Uses only JDK classes — no external dependency needed.
 */
@Component
@Order(1)
public class RateLimitFilter implements Filter {

    private static final int MAX_REQUESTS = 10;
    private static final long WINDOW_MS = 60_000L;

    private final ConcurrentHashMap<String, Deque<Long>> windows = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        String path = httpRequest.getServletPath();
        if ("/api/v1/auth/login".equals(path) && "POST".equalsIgnoreCase(httpRequest.getMethod())) {
            String ip = getClientIp(httpRequest);
            long now = System.currentTimeMillis();

            Deque<Long> timestamps = windows.computeIfAbsent(ip, k -> new ArrayDeque<>());
            synchronized (timestamps) {
                long cutoff = now - WINDOW_MS;
                while (!timestamps.isEmpty() && timestamps.peekFirst() < cutoff) {
                    timestamps.pollFirst();
                }
                if (timestamps.size() >= MAX_REQUESTS) {
                    long oldestInWindow = timestamps.peekFirst();
                    long waitMs = (oldestInWindow + WINDOW_MS) - now;
                    httpResponse.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                    httpResponse.setContentType("application/json");
                    objectMapper.writeValue(httpResponse.getWriter(),
                            Map.of("success", false,
                                    "error", "Too many login attempts. Please wait " + (waitMs / 1000 + 1) + " seconds.",
                                    "timestamp", now));
                    return;
                }
                timestamps.addLast(now);
            }
        }
        chain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
