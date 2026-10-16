package az.edu.ada.phd.thyroid_medical_imaging_app;

import io.github.cdimascio.dotenv.Dotenv;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.File;

@SpringBootApplication
public class ThyroidMedicalImagingAppApplication {

    private static final Logger log = LoggerFactory.getLogger(ThyroidMedicalImagingAppApplication.class);

    // Load .env file before Spring initializes (for local development)
    static {
        log.info("Loading Dotenv variables...");
        File dotenvFile = new File("../.env");
        System.out.println(dotenvFile.getAbsolutePath());
        if (dotenvFile.exists()) {
            Dotenv dotenv = Dotenv.configure()
                    .directory("../")
                    .ignoreIfMissing()
                    .load();
            dotenv.entries().forEach(entry -> {
                        System.out.println(entry.getKey() + ": " + entry.getValue());
                        System.setProperty(entry.getKey(), entry.getValue());
                    }
            );
        }
    }

    public static void main(String[] args) {
        SpringApplication.run(ThyroidMedicalImagingAppApplication.class, args);
    }

}
