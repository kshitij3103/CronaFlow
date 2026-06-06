package com.cronaflow.scheduler.repository;

import com.cronaflow.scheduler.domain.Task;
import com.cronaflow.scheduler.domain.TaskStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface TaskRepository extends MongoRepository<Task, String> {
    List<Task> findByStatusAndExecuteAtLessThanEqual(TaskStatus status, Instant executeAtBefore);
    List<Task> findByDependsOnTaskIdsAndStatus(String dependsOnTaskId, TaskStatus status);
    long countByIdInAndStatus(List<String> ids, TaskStatus status);
    // Add to TaskRepository.java
    List<Task> findByStatusAndUpdatedAtLessThan(TaskStatus status, Instant threshold);



}
