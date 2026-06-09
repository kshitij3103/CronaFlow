package com.cronaflow.scheduler.service;

import com.cronaflow.scheduler.domain.Task;
import com.cronaflow.scheduler.domain.TaskStatus;
import com.cronaflow.scheduler.dto.TaskRequest;
import com.cronaflow.scheduler.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class TaskService {
    private final TaskRepository taskRepository;
    public Task scheduleTask(TaskRequest taskRequest) {
        TaskStatus initialStatus = TaskStatus.PENDING;
        List<String> parentIds= taskRequest.getDependsOnTaskIds();
        if(parentIds!=null && !parentIds.isEmpty() ) {
            int completedParentsCount = 0;
            for(String parentId : parentIds) {
                Task parentTask = taskRepository.findById(parentId)
                        .orElse(null);
                if(parentTask!=null && parentTask.getStatus() == TaskStatus.COMPLETED) {
                    completedParentsCount++;
                }

            }
            if(completedParentsCount<parentIds.size()) {
                initialStatus=TaskStatus.WAITING;

            }
            else{
                log.info("All parents are already completed! Scheduling task as PENDING immediately.");
            }



        }









        Task task = Task.builder()
                .id(taskRequest.getTaskId())
                .taskType(taskRequest.getTaskType())
                .payload(taskRequest.getPayload())
                .executeAt(taskRequest.getExecuteAt() !=null ? taskRequest.getExecuteAt()
                        : Instant.now())
                .status(initialStatus)
                .maxRetries(taskRequest.getMaxRetries()!=null ? taskRequest.getMaxRetries(): 3)
                .currentRetries(0)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .dependsOnTaskIds(taskRequest.getDependsOnTaskIds())
                .build();

        return taskRepository.save(task);

    }
    public List<Task> getAllTasks() {
        return taskRepository.findAll();
    }

    public void deleteAllTasks() {
        taskRepository.deleteAll();
    }

    public void deleteTaskById(String id) {
        taskRepository.deleteById(id);
    }

}
