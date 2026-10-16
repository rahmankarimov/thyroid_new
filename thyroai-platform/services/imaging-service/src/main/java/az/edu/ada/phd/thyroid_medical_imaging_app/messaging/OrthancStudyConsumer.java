package az.edu.ada.phd.thyroid_medical_imaging_app.messaging;

import az.edu.ada.phd.thyroid_medical_imaging_app.service.OrthancStudyImportService;
import com.rabbitmq.client.Channel;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
@Slf4j
public class OrthancStudyConsumer {
    private final ObjectMapper objectMapper;
    private final OrthancStudyImportService importService;

    public OrthancStudyConsumer(
            ObjectMapper objectMapper,
            OrthancStudyImportService importService
    ) {
        this.objectMapper = objectMapper;
        this.importService = importService;
    }


    @RabbitListener(
            queues = "${app.rabbitmq.queue}",
            containerFactory = "manualAckListenerFactory"
    )
    public void consume(String payload, Message message, Channel channel) throws Exception {
        long deliveryTag = message.getMessageProperties().getDeliveryTag();

        try {
            log.info("Received message from RabbitMQ: {}", payload);

            JsonNode json = objectMapper.readTree(payload);
            String studyId = json.get("orthanc_study_id").asString();
            log.info("Stable study: {}", studyId);

            importService.importStudy(studyId);

            channel.basicAck(deliveryTag, false);
        } catch (HttpClientErrorException ex) {
            // A 4xx from ThyroAI is permanent — a bad ingest key, or a payload it will
            // never accept. Requeueing spins this message forever, so drop it (to the
            // dead-letter exchange if one is configured) and surface it in the logs.
            log.error("ThyroAI rejected study permanently ({}): {}. Dropping message.",
                    ex.getStatusCode(), ex.getResponseBodyAsString());
            channel.basicNack(deliveryTag, false, false);
        } catch (IllegalStateException ex) {
            // Malformed study (no series) or missing ingest configuration — also permanent.
            log.error("Cannot process study, dropping message: {}", ex.getMessage());
            channel.basicNack(deliveryTag, false, false);
        } catch (Exception ex) {
            // Transient: Orthanc down, object storage unreachable, ThyroAI 5xx. Retry.
            log.error("Transient failure processing Orthanc study, requeueing: {}", ex.getMessage(), ex);
            channel.basicNack(deliveryTag, false, true);
        }
    }
}
