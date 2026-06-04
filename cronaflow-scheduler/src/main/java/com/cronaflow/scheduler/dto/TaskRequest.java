package com.cronaflow.scheduler.dto;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Map;

@Data
public class TaskRequest {
    @NotBlank(message = "Task Type cannot be blank")
    private String taskType;

    private Map<String,Object> payload;

    @FutureOrPresent(message = "Execution Time must be Present or Future")
    private Instant executeAt;


    private Integer maxRetries;


}
