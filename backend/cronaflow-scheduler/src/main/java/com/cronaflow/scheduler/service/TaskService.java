package com.cronaflow.scheduler.service;

import com.cronaflow.scheduler.domain.Task;
import com.cronaflow.scheduler.domain.TaskStatus;
import com.cronaflow.scheduler.dto.TaskRequest;
import com.cronaflow.scheduler.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class TaskService {
    private final TaskRepository taskRepository;
    public Task scheduleTask(TaskRequest taskRequest) {
        Task task = Task.builder()
                .taskType(taskRequest.getTaskType())
                .payload(taskRequest.getPayload())
                .executeAt(taskRequest.getExecuteAt() !=null ? taskRequest.getExecuteAt()
                        : Instant.now())
                .status(TaskStatus.PENDING)
                .maxRetries(taskRequest.getMaxRetries()!=null ? taskRequest.getMaxRetries(): 3)
                .currentRetries(0)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        return taskRepository.save(task);

    }

}
