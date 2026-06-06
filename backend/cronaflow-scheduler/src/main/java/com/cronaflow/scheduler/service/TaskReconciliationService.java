package com.cronaflow.scheduler.service;

import com.cronaflow.scheduler.domain.Task;
import com.cronaflow.scheduler.domain.TaskStatus;
import com.cronaflow.scheduler.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Slf4j
@RequiredArgsConstructor
@Service
public class TaskReconciliationService {
    private final TaskRepository taskRepository;

    @Scheduled(fixedRate = 60000)
    public void recoverTasks() {
        Instant fiveMinutesAgo = Instant.now().minus(5, ChronoUnit.MINUTES);
        List<Task> stuckTasks = taskRepository.findByStatusAndUpdatedAtLessThan(TaskStatus.QUEUED, fiveMinutesAgo);
        if(!stuckTasks.isEmpty()) {
            log.warn(" Found {} tasks stuck in QUEUED state. Reverting to PENDING...", stuckTasks.size());
            for(Task stuckTask : stuckTasks) {
                stuckTask.setStatus(TaskStatus.PENDING);
                stuckTask.setUpdatedAt(Instant.now());
                taskRepository.save(stuckTask);
            }
            log.info("Successfully recovered {} tasks.", stuckTasks.size());

        }
    }



}
