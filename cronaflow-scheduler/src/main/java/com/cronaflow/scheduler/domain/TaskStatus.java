package com.cronaflow.scheduler.domain;

public enum TaskStatus {
    PENDING,      // Saved in MongoDB, waiting for its scheduled time
    QUEUED,       // Poller found it and pushed it to Redis Streams
    IN_PROGRESS,  // A worker picked it up and is executing it
    COMPLETED,    // Worker finished it successfully
    FAILED,       // Worker failed, but might retry
    DEAD_LETTER   // Worker failed too many times, needs human review

}
