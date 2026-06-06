package com.cronaflow.scheduler.service;

import com.cronaflow.scheduler.domain.Task;
import com.cronaflow.scheduler.domain.TaskStatus;
import com.cronaflow.scheduler.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.stream.StreamListener;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RequiredArgsConstructor
@Slf4j
@Service
public class TaskWorkerListener implements StreamListener<String, MapRecord<String,String,String>> {
    private static final String STREAM_KEY = "cronaflow:task:stream";
    private static final String GROUP_NAME = "cronaflow-group";

    private final TaskRepository taskRepository;
    private final StringRedisTemplate redisTemplate;


    @Override
    public void onMessage(MapRecord<String, String, String> record) {
        Map<String, String> value = record.getValue();
        String taskId = value.get("taskId");
        String taskType = value.get("taskType");


        Optional<Task> taskOpt = taskRepository.findById(taskId);
        if(taskOpt.isEmpty()){
            log.error("Task {} not found in Database",taskId);
            redisTemplate.opsForStream().acknowledge(STREAM_KEY,GROUP_NAME,record.getId());
            return;
        }
        Task task = taskOpt.get();
        try{
            log.info("Executing task :{} | Payload: {}",task.getId(),task.getPayload());
            Thread.sleep(1000);
            task.setStatus(TaskStatus.COMPLETED);
            task.setUpdatedAt(Instant.now());
            taskRepository.save(task);



            List<Task> dependents = taskRepository.findByDependsOnTaskIdsAndStatus(task.getId(),TaskStatus.WAITING);
            if(!dependents.isEmpty()){
                for(Task dependent:dependents){
                    List<String> parentIds = dependent.getDependsOnTaskIds();
                    long completedParentsCount = taskRepository.countByIdInAndStatus(parentIds,TaskStatus.COMPLETED);
                    if(completedParentsCount==parentIds.size()){
                        log.info("All dependencies met. Unlocking Dependent Task: {}", dependent.getId());
                        dependent.setStatus(TaskStatus.PENDING);
                        dependent.setUpdatedAt(Instant.now());
                        taskRepository.save(dependent);

                    }
                    else{
                        log.info("Dependent Task {} is still waiting. Completed parents: {}/{}",
                                dependent.getId(), completedParentsCount, parentIds.size());

                    }
                }
            }

            redisTemplate.opsForStream().acknowledge(STREAM_KEY,GROUP_NAME,record.getId());
            log.info("Successfully executed task and acknowledged {}",task.getId());
        } catch (Exception e) {
            log.error("Failed to execute task {}",task.getId(),e);
            throw new RuntimeException("Task execution failed",e);
        }

    }
}
