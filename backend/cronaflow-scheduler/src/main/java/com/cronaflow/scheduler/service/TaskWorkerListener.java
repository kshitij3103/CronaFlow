package com.cronaflow.scheduler.service;

import com.cronaflow.scheduler.domain.Task;
import com.cronaflow.scheduler.domain.TaskStatus;
import com.cronaflow.scheduler.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Range;
import org.springframework.data.redis.connection.stream.*;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.stream.StreamListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Slf4j
@Service
public class TaskWorkerListener implements StreamListener<String, MapRecord<String,String,String>> {
    private static final String STREAM_KEY = "cronaflow:task:stream";
    private static final String GROUP_NAME = "cronaflow-group";

    private final TaskRepository taskRepository;
    private final StringRedisTemplate redisTemplate;
    private final LeaderElectionService leaderElectionService;
    private final EmailService emailService;
    private final LeetcodeService leetCodeService;
    private final AiService aiService;


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
            
            // === REAL TASK EXECUTION ===
            switch (task.getTaskType()) {
                case "SEND_EMAIL":
                    String toEmail = (String) task.getPayload().get("email");
                    String subject = (String) task.getPayload().get("subject");
                    String body = (String) task.getPayload().get("body");
                    
                    log.info(" Handing off to EmailService for: {}", toEmail);
                    emailService.sendEmail(toEmail, subject, body);
                    break;
                case "LEETCODE_CONTEST":
                    String userEmail = (String) task.getPayload().get("email");

                    // Check if testMode was passed in the JSON, default to false if missing
                    boolean testMode = task.getPayload().containsKey("testMode")
                            && (Boolean) task.getPayload().get("testMode");

                    log.info("🚀 Handing off to LeetCodeService to schedule reminder for {}", userEmail);
                    leetCodeService.scheduleContestReminder(userEmail, testMode);
                    break;

                case "AI_SUMMARY":
                    log.info(" Handing off to AiService...");
                    aiService.generateSummary(task);
                    break;
                    
                case "PAYMENT_PROCESS":
                    log.info("💳 Charging credit card...");
                    if (task.getPayload() != null && task.getPayload().containsKey("throwError")) {
                        throw new RuntimeException("Card declined! Insufficient funds.");
                    }
                    Thread.sleep(500); // Simulate fast payment gateway
                    break;
                    
                default:
                    log.warn("Unknown task type: {}", task.getTaskType());
            }

            // --- UNIVERSAL NOTIFICATION CHECK ---
            if (task.getPayload() != null && 
                task.getPayload().containsKey("emailNotification") && 
                Boolean.TRUE.equals(task.getPayload().get("emailNotification"))) {
                
                String targetEmail = (String) task.getPayload().get("targetEmail");
                if (targetEmail != null) {
                    String subject = "CronaFlow: Task Completed [" + task.getTaskType() + "]";
                    String body = "Hello,\n\nYour scheduled task has finished executing successfully.\n\n" +
                                  "Task ID: " + task.getId() + "\n" +
                                  "Type: " + task.getTaskType() + "\n\n" +
                                  "Best,\nCronaFlow Scheduler";
                    
                    log.info("📧 Sending completion notification email to {}", targetEmail);
                    emailService.sendEmail(targetEmail, subject, body);
                }
            }

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
            task.setCurrentRetries(task.getCurrentRetries()+1);
            task.setLastErrorMsg(e.getMessage());
            task.setUpdatedAt(Instant.now());

            if(task.getCurrentRetries()>=task.getMaxRetries()){
                log.error(" Task {} has exhausted all retries. MOVED to DLQ (FAILED).", task.getId());
                task.setStatus(TaskStatus.FAILED);

            }
            else{
                log.warn(" Retrying task {} (Attempt {}/{}). Scheduling for 30s from now...",
                        task.getId(), task.getCurrentRetries(), task.getMaxRetries());
                task.setStatus(TaskStatus.PENDING);
                task.setExecuteAt(Instant.now().plusSeconds(30));
            }
            taskRepository.save(task);
            redisTemplate.opsForStream().acknowledge(STREAM_KEY,GROUP_NAME,record.getId());
        }

    }
    @Scheduled(fixedRate = 60000)
    public void rescueAbandonedTasks(){
        if(!leaderElectionService.isLeader()) return;
        PendingMessagesSummary pendingMessagesSummary =
                redisTemplate.opsForStream().pending(STREAM_KEY,GROUP_NAME);
        if(pendingMessagesSummary==null || pendingMessagesSummary.getTotalPendingMessages()==0){
            return ;
        }
        PendingMessages pendingMessages = redisTemplate.opsForStream()
                .pending(
                        STREAM_KEY,
                        GROUP_NAME,
                        Range.unbounded(),
                        100
                );

        for(PendingMessage message : pendingMessages){
            long elapsedMinutes = message.getElapsedTimeSinceLastDelivery().toMinutes();
            if(elapsedMinutes>=2){
                log.warn(" Found abandoned task in PEL (idle for {} min). Stealing ownership...", elapsedMinutes);

                List<MapRecord<String,Object,Object>> claimedMessages =
                        redisTemplate.opsForStream().claim(
                                STREAM_KEY,
                                GROUP_NAME,
                                "leader-rescuer",
                                Duration.ofMinutes(2),
                                message.getId()
                        );
                for(MapRecord<String,Object,Object> claimed:claimedMessages){
                    MapRecord<String,String,String> stringRecord =
                            StreamRecords.string(
                                    claimed.getValue().entrySet().stream()
                                            .collect(Collectors.toMap(
                                                    e-> String.valueOf(e.getKey()),
                                                    e-> String.valueOf(e.getValue())
                                            ))

                            ).withStreamKey(claimed.getStream()).withId(claimed.getId());
                    onMessage(stringRecord);

                }

            }

        }
    }
}
