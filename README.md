# CronaFlow - Resilient Distributed Task Scheduler

CronaFlow is a highly resilient, full-stack distributed task scheduling engine designed to manage, persist, and execute asynchronous background workloads. Engineered with a decentralized polling architecture, CronaFlow guarantees at-least-once execution semantics for arbitrary jobs, API polling, and scheduled integrations (such as the built-in LeetCode GraphQL scraper).

---

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Concurrency and State Management](#concurrency-and-state-management)
3. [Technical Stack](#technical-stack)
4. [Deployment Prerequisites](#deployment-prerequisites)
5. [Local Environment Setup](#local-environment-setup)
6. [REST API Specification](#rest-api-specification)
7. [Directory Structure](#directory-structure)
8. [GraphQL Integration Subsystem](#graphql-integration-subsystem)

---

## System Architecture

CronaFlow implements a Database-Backed Distributed Polling Architecture to achieve horizontal scalability and fault tolerance.

1. **Task Ingestion:** The client layer submits asynchronous task definitions via the REST API. The payload is serialized into JSON and persisted into a central NoSQL document database (MongoDB).
2. **Persistence Layer:** The database acts as the central source of truth, storing state transitions, raw payloads, execution timestamps, and retry counters.
3. **Decentralized Worker Nodes:** Spring Boot instances operate as independent worker nodes. Each node runs background threads (via `@Scheduled` and `TaskExecutor`) that actively poll the database for eligible tasks (`executeAt <= NOW() && status == PENDING`).
4. **Execution and Acknowledgment:** Upon acquiring a task, the worker locks the record, invokes the corresponding business logic handler (e.g., SMTP dispatch or WebClient HTTP requests), and synchronously updates the state machine to `COMPLETED` or `FAILED`.

Because state is decoupled from the application memory, the system scales horizontally. Multiple nodes can poll concurrently without duplicating work, provided isolation levels and database-level locking are maintained.

---

## Concurrency and State Management

CronaFlow relies on strict state transitions to handle distributed race conditions:
- **PENDING:** The task is queued and awaiting an available worker.
- **PROCESSING:** The task has been acquired by a node. This prevents other concurrent nodes from pulling the same task during the polling cycle.
- **COMPLETED:** The worker successfully processed the payload.
- **FAILED:** The worker encountered a terminal exception or exceeded the maximum configured retry threshold.

If a worker node crashes mid-execution (resulting in a hung `PROCESSING` state), external dead-letter recovery mechanisms can revert the task to `PENDING` to ensure high availability.

---

## Technical Stack

### Backend Infrastructure
- **Java 21:** Utilizing modern language specifications, including virtual threads and pattern matching.
- **Spring Boot 3.x:** Core application framework managing dependency injection and servlet containers.
- **Spring Data MongoDB:** Document-Object Mapping for task persistence and seamless integration.
- **Spring WebFlux (WebClient):** Non-blocking, reactive HTTP client utilized for asynchronous third-party integrations.
- **NoSQL (MongoDB):** Document storage engine managing the distributed queue and state persistence.
- **JJWT:** Stateless, cryptographically signed JSON Web Tokens for authentication authorization.

### Client Infrastructure
- **React 18:** Component-driven user interface.
- **Vite:** High-performance build tool utilizing native ES modules.
- **React Router v6:** Client-side route resolution.
- **CSS Variables:** Custom, framework-agnostic design system implementing a high-contrast dark mode aesthetic.

---

## Deployment Prerequisites

The application requires the following toolchain for compilation and execution:
- Java Development Kit (JDK) 21+
- Apache Maven 3.8+
- Node.js 18.x LTS and npm 9.x+

---

## Local Environment Setup

### Backend Initialization
Initialize the Spring Boot server to spin up the embedded Tomcat container and worker threads:

```bash
cd backend/cronaflow-scheduler
mvn clean install
mvn spring-boot:run
```
The REST API and internal scheduler daemon will initialize on `http://localhost:8080`. Collections are auto-provisioned by MongoDB upon document insertion.

### Frontend Initialization
Compile and serve the React SPA using the Vite dev server:

```bash
cd frontend
npm install
npm run dev
```
The client application will bind to `http://localhost:5173`. Cross-Origin Resource Sharing (CORS) is configured on the backend to accept traffic from this origin.

---

## REST API Specification

### Authentication Module
- `POST /api/auth/register` - Registers a principal and issues a JWT access token.
- `POST /api/auth/login` - Authenticates credentials and issues a JWT access token.

### Task Management Module
- `GET /api/tasks` - Returns a JSON array of all tasks mapped to the authenticated principal.
- `POST /api/tasks` - Ingests a new custom task payload into the distributed queue.
- `DELETE /api/tasks/{id}` - Executes a hard delete on a specific task record.

### Subsystem Triggers
- `POST /api/tasks/leetcode` - Manually invokes the GraphQL integration service to fetch external data and append a programmatic reminder to the queue.

---

## Directory Structure

```text
CronaFlow/
├── backend/
│   └── cronaflow-scheduler/
│       ├── src/main/java/com/cronaflow/scheduler/
│       │   ├── config/       # Security filter chains and CORS policies
│       │   ├── controller/   # REST endpoints mapping HTTP to services
│       │   ├── domain/       # Document entities representing MongoDB collections
│       │   ├── repository/   # MongoRepository interfaces
│       │   └── service/      # Transactional business logic and worker daemons
│       └── pom.xml           # Maven build lifecycle definitions
└── frontend/
    ├── src/
    │   ├── components/       # Functional React components
    │   ├── contexts/         # React Context providers for global state
    │   ├── pages/            # Primary routing views (Dashboard, Auth)
    │   ├── index.css         # Global CSSOM properties and variables
    │   └── App.jsx           # Root component and route declarations
    └── package.json          # Node execution scripts and dependencies
```

---

## GraphQL Integration Subsystem

CronaFlow includes a specialized integration pipeline targeting the official LeetCode GraphQL API. 

When invoked, the backend instantiates a `WebClient` to dispatch an outbound `POST` request to `https://leetcode.com/graphql`. The service passes a localized GraphQL query string (`{ upcomingContests { title startTime } }`) to scrape the Unix epoch timestamps of future contests.

Upon parsing the JSON response via Jackson, the subsystem dynamically calculates a timestamp (`T - 24 hours`) and injects a deterministic `SEND_EMAIL` task into the MongoDB cluster. This allows the primary CronaFlow worker nodes to independently handle the actual SMTP dispatch strictly 24 hours before the target event.
