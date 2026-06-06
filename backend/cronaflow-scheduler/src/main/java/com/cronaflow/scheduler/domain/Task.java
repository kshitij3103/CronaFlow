package com.cronaflow.scheduler.domain;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Document(collection = "tasks")
public class Task {

    private String id;
    private String taskType;
    private Map<String,Object> payload;
    private Instant executeAt;
    private TaskStatus status;
    private int maxRetries;
    private int currentRetries;
    private List<String> dependsOnTaskIds; // The IDs of the tasks this task depends on
    private String lastErrorMsg;

    private Instant createdAt;
    private Instant updatedAt;

}
