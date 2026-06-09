package com.cronaflow.scheduler.service;

import com.cronaflow.scheduler.domain.Task;
import com.cronaflow.scheduler.domain.TaskStatus;
import com.cronaflow.scheduler.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class LeetcodeService {
    private final TaskRepository taskRepository;
    // No @Scheduled annotation! This only runs when the Button is clicked.
    public void checkLeetCode(String targetEmail) {
        log.info("Manual-Watcher: Checking LeetCode for new contests for user {}...", targetEmail);
        scheduleContestReminder(targetEmail, false);
    }
    public void scheduleContestReminder(String targetEmail,boolean testMode){


        log.info(" Reaching out to LeetCode Official GraphQL API...");
        try{
            WebClient webClient = WebClient.builder()
                    .baseUrl("https://leetcode.com")
                    .build();

            String graphQlQuery = "{\"query\":\"query { upcomingContests { title startTime } }\"}";
            Map<String,Object> response  = webClient.post()
                    .uri("/graphql")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(graphQlQuery)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            log.info("Successfully fetched Data from Leetcode using Webclient");
            Map<String, Object> data = (Map<String, Object>) response.get("data");
            List<Map<String, Object>> contests = (List<Map<String, Object>>) data.get("upcomingContests");
            if(contests==null || contests.size()==0){
                log.warn("No upcoming LeetCode contests in 24 Hours found.");
                return;

            }
            Map<String, Object> nextContest = contests.get(0);
            String title = (String) nextContest.get("title");
            long startTimeUnix = Long.parseLong(String.valueOf(nextContest.get("startTime")));
            Instant contestStartTime = Instant.ofEpochSecond(startTimeUnix);
            // Calculate exact time (24 hours before)
            Instant executionTime = contestStartTime.minus(Duration.ofHours(24));

            if (testMode) {
                executionTime = Instant.now().plusSeconds(60);
                log.info(" TEST MODE: Scheduling email for 1 minute from now instead of 24 hours before.");

            }
            log.info(" Next Contest: {} starts at {}. Reminder scheduled for {}", title, contestStartTime, executionTime);
            String deterministicId ="LEETCODE-"+ title.replaceAll("[^a-zA-Z0-9]", "");
            if(taskRepository.existsById(deterministicId)){
                log.info("Email reminder for {} is already scheduled. Skipping.", title);
                return;
            }

            Task reminderTask = Task.builder()
                    .id(deterministicId)
                    .taskType("SEND_EMAIL")
                    .payload(Map.of(
                    "email", targetEmail,
                    "subject", "LeetCode Contest Reminder: " + title,
                    "body", "Get ready! The " + title + " starts in exactly 24 hours! Get to your keyboard."
            ))
                    .status(TaskStatus.PENDING)
                    .maxRetries(3)
                    .currentRetries(0)
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .executeAt(executionTime)
                    .build();
            taskRepository.save(reminderTask);
            log.info(" Master Plan Scheduled! New SEND_EMAIL task injected into database.");
        } catch (Exception e) {
            log.error("Failed to fetch from LeetCode via WebClient", e);
            throw new RuntimeException("LeetCode API failed", e);
        }






        }



}
