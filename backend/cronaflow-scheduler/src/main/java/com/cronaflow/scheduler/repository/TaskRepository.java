package com.cronaflow.scheduler.repository;

import com.cronaflow.scheduler.domain.Task;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TaskRepository extends MongoRepository<Task, String> {


}
