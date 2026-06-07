package com.cronaflow.scheduler.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j

public class LeaderElectionService {
    private static final String LOCK_KEY = "cronaflow:leader:lock";
    private static final Duration LOCK_TTL = Duration.ofSeconds(15);

    private final String serverId = UUID.randomUUID().toString();
    private final StringRedisTemplate redisTemplate;
    private boolean isLeader = false;

    @Scheduled(fixedRate = 5000)
    public void tryAcquireOrRenewLock() {
        Boolean acquired = redisTemplate.opsForValue().setIfAbsent(LOCK_KEY, serverId, LOCK_TTL);
        if(Boolean.TRUE.equals(acquired)) {
            if(!isLeader) {
                log.info("New Leader Elected Server Id :{}",serverId);
                isLeader = true;
            }
        }
        else{
            String currentLeaderId = redisTemplate.opsForValue().get(LOCK_KEY);
            if(serverId.equals(currentLeaderId)) {
                redisTemplate.expire(LOCK_KEY, LOCK_TTL);
                isLeader = true;
            }
            else{
                if(isLeader) {
                    log.warn("Leader Expired");
                }
                isLeader = false;
            }

        }
    }
    public boolean isLeader() {
        return isLeader;
    }

}
