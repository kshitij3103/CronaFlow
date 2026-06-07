package com.cronaflow.scheduler.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class RateLimiterService {
    private final StringRedisTemplate stringRedisTemplate;
    public boolean isAllowed(String taskType){
        long currentMinute = Instant.now().getEpochSecond()/60;
        String key = "rate:" + taskType + ":" + currentMinute;
        long count = stringRedisTemplate.opsForValue().increment(key);
        if(count==1){
            stringRedisTemplate.expire(key,60, TimeUnit.SECONDS);

        }
        if(count>2){
            log.warn("Exceeding Current Rate Limits");
            return false;
        }
        else{
            return true;
        }
    }
}
