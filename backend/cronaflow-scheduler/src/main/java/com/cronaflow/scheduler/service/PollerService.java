package com.cronaflow.scheduler.service;

import com.cronaflow.scheduler.domain.Task;
import com.cronaflow.scheduler.domain.TaskStatus;
import com.cronaflow.scheduler.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.stream.StreamRecords;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class PollerService {
    private final TaskRepository taskRepository;
    private final StringRedisTemplate stringRedisTemplate;

    @Scheduled(fixedRate = 1000)
    public void pollTasks(){
        List<Task> dueTasks= taskRepository.findByStatusAndExecuteAtLessThanEqual(
                TaskStatus.PENDING, Instant.now());
        if(!dueTasks.isEmpty()){
            log.info("found {} due tasks to schedule",dueTasks.size());
            for(Task task:dueTasks){
                log.info("queuing {} taks | type:{}",task.getId(),task.getTaskType());
                task.setStatus(TaskStatus.QUEUED);
                task.setUpdatedAt(Instant.now());
                taskRepository.save(task);
                var record = StreamRecords.string(Map.of(
                        "taskId", task.getId(),
                        "taskType" , task.getTaskType()

                )).withStreamKey("cronaflow:task:stream");
                stringRedisTemplate.opsForStream().add(record);
                log.info("Successfully pushed task {} to Redis Stream",task.getId());
            }

        }


    }



}
