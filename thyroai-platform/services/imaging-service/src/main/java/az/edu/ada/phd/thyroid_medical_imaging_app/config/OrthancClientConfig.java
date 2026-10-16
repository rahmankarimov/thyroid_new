package az.edu.ada.phd.thyroid_medical_imaging_app.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class OrthancClientConfig {
    @Bean
    RestClient orthancRestClient(
            @Value("${orthanc.base-url}") String baseUrl,
            @Value("${orthanc.username}") String username,
            @Value("${orthanc.password}") String password
    ) {
        return RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeaders(headers -> headers.setBasicAuth(username, password))
                .build();
    }
}
