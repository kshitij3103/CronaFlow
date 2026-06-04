package com.cronaflow.scheduler.controller;

import com.cronaflow.scheduler.service.TaskService;
import com.cronaflow.scheduler.domain.Task;
import com.cronaflow.scheduler.dto.TaskRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/tasks")
public class TaskController {
    private final TaskService taskService;

    @PostMapping
    public ResponseEntity<Task> scheduleTask(@Valid @RequestBody TaskRequest request) {
        Task savedTask = taskService.scheduleTask(request);
        return ResponseEntity.ok(savedTask);
    }

}
