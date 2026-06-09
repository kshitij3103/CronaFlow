package com.cronaflow.scheduler.controller;

import com.cronaflow.scheduler.service.LeetcodeService;
import com.cronaflow.scheduler.service.TaskService;
import com.cronaflow.scheduler.domain.Task;
import com.cronaflow.scheduler.dto.TaskRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import java.util.List;

@CrossOrigin(origins = "*")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/tasks")
public class TaskController {
    private final TaskService taskService;
    private final LeetcodeService leetcodeService;

    @PostMapping
    public ResponseEntity<Task> scheduleTask(@Valid @RequestBody TaskRequest request) {
        Task savedTask = taskService.scheduleTask(request);
        return ResponseEntity.ok(savedTask);
    }

    @GetMapping
    public ResponseEntity<List<Task>> getAllTasks() {
        return ResponseEntity.ok(taskService.getAllTasks());
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteAllTasks() {
        taskService.deleteAllTasks();
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTaskById(@org.springframework.web.bind.annotation.PathVariable String id) {
        taskService.deleteTaskById(id);
        return ResponseEntity.ok().build();
    }
    @PostMapping("/leetcode")
    public ResponseEntity<String> triggerLeetcodeCheck() {
        // 1. Get the email of the logged-in user who clicked the button!
        String email = SecurityContextHolder.getContext().getAuthentication().getName();

        // 2. Trigger the check for their specific email
        leetcodeService.checkLeetCode(email);

        return ResponseEntity.ok("LeetCode check triggered for: " + email);
    }

}
