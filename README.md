# CronaFlow ⏱️

**CronaFlow** is an enterprise-grade, distributed Task Orchestration and Scheduling Engine. Built with Java, Spring Boot, MongoDB, and Redis Streams, it is designed to handle complex background job execution with absolute fault tolerance, zero data loss, and seamless horizontal scaling.

It is heavily inspired by industry-standard orchestration systems like Netflix Conductor and Temporal.

---

## 🚀 Key Architectural Features

### 1. Directed Acyclic Graph (DAG) Orchestration
CronaFlow supports complex multi-parent task dependencies. Child tasks are guaranteed to wait out-of-order until all requisite parent tasks reach a `COMPLETED` state before being queued for execution.

### 2. Distributed Leader Election
When scaling horizontally across multiple nodes (or containers), CronaFlow uses a Redis-backed distributed locking mechanism (`SETNX` with TTL heartbeats). This guarantees that only one "Leader" node polls the database and schedules background jobs, completely preventing race conditions and duplicated work across the cluster.

### 3. Zero-Data-Loss Resilience (Dual-Write Protection)
Updating a database and publishing to a message broker (Redis) introduces a "Dual-Write Problem". If a node crashes after updating the database but *before* publishing to the stream, the task is lost. CronaFlow implements a **Task Reconciliation Service** that routinely sweeps the database to detect and recover tasks stuck in this "limbo" state.

### 4. Worker Crash Recovery (PEL Rescue)
CronaFlow utilizes Redis Streams for task consumption. If a worker pulls a task but the JVM crashes mid-execution (before sending an `XACK`), the task is trapped in the Pending Entries List (PEL). A background `XAUTOCLAIM` service automatically detects abandoned tasks and securely transfers ownership to healthy workers.

### 5. Distributed Rate Limiting
To protect external third-party APIs (like Email providers) from being overwhelmed by the poller, CronaFlow implements a **Fixed-Window Distributed Rate Limiter** directly in Redis. The engine gracefully defers tasks that exceed the defined throughput limit (e.g., 50 tasks per second).

### 6. Dead Letter Queue (DLQ) 
Tasks that continually fail due to permanent errors (e.g., malformed payloads, permanent 400 responses from external APIs) are moved to a Dead Letter Queue (`FAILED` status) after a configured `maxRetries` threshold. This prevents the pipeline from getting clogged with unprocessable tasks, allowing for manual inspection later.

---

## 🛠️ Technology Stack
* **Java 21+** & **Spring Boot 3+**
* **MongoDB** (Primary Persistence & State Machine)
* **Redis Streams** (High-Throughput Message Broker)
* **Redis** (Distributed Locking & Rate Limiting)

---

## ⚙️ How it Works
1. **Submit**: A task payload and schedule (`executeAt`) is saved to MongoDB.
2. **Poll**: The currently elected Leader node queries MongoDB for `PENDING` tasks that are due.
3. **Rate Limit**: The Leader checks the Redis Rate Limiter. If limits are hit, tasks are safely deferred.
4. **Queue**: The Leader updates the task to `QUEUED` and pushes the payload to the Redis Stream.
5. **Execute**: Any available Worker node pulls the task from the stream and processes it.
6. **Acknowledge**: Upon success, the Worker `XACK`s the stream and updates MongoDB to `COMPLETED`, triggering any dependent child tasks in the DAG.

---

*Architected and developed by Kshitij.*
