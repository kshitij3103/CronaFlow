package com.cronaflow.scheduler.service;

import com.cronaflow.scheduler.domain.Task;
import com.cronaflow.scheduler.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiService {
    private final TaskRepository taskRepository;
    @Value("${gemini.api-key}")
    private String geminiApiKey;

    public void generateSummary(Task task) {
        String topic = (String) task.getPayload().get("topic");
        log.info(" Reaching out to Gemini API to summarize: {}", topic);
        try {
            WebClient webClient = WebClient.builder().build();
            String urlStr = "https://apihub.agnes-ai.com/v1/chat/completions";
            
            String prompt = "Give me a summary about this topic in Exactly 5 points: " + topic;
            Map<String, Object> requestBody = Map.of(
                "model", "agnes-2.0-flash",
                "messages", List.of(
                    Map.of("role", "user", "content", prompt)
                )
            );

            Map response = webClient.post()
                    .uri(urlStr)
                    .header("Authorization", "Bearer " + geminiApiKey.trim())
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
            log.info(" Successfully generated summary from Agnes API!");
            
            List choices = (List) response.get("choices");
            Map firstChoice = (Map) choices.get(0);
            Map message = (Map) firstChoice.get("message");
            String aiSummary = (String) message.get("content");
            
            log.info("AI Summary : {}", aiSummary);
            task.setResult(aiSummary);
            log.info("Successfully saved summary to Task result in MongoDB!");
        }
        catch  (Exception e) {
            log.error(" Failed to fetch from Gemini API", e);
            throw new RuntimeException("Gemini API failed", e);
        }


    }
}
