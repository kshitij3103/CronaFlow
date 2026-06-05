package com.cronaflow.scheduler.config;

import com.cronaflow.scheduler.service.TaskWorkerListener;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.stream.Consumer;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.stream.StreamMessageListenerContainer;
import org.springframework.data.redis.stream.Subscription;

import java.time.Duration;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class RedisStreamConfig {

    private static final String STREAM_KEY = "cronaflow:task:stream";
    private static final String GROUP_NAME = "cronaflow-group";
    private static final String CONSUMER_NAME = "worker-1";

    private final StringRedisTemplate redisTemplate;

    @Bean
    public Subscription subscription(
            RedisConnectionFactory connectionFactory, 
            TaskWorkerListener taskWorkerListener
    ) {
        createConsumerGroup();

        StreamMessageListenerContainer.StreamMessageListenerContainerOptions<String, MapRecord<String, String, String>> containerOptions =
                StreamMessageListenerContainer.StreamMessageListenerContainerOptions.builder()
                        .pollTimeout(Duration.ofSeconds(1))
                        .executor(taskExecutor())
                        .build();

        StreamMessageListenerContainer<String, MapRecord<String, String, String>> container =
                StreamMessageListenerContainer.create(connectionFactory, containerOptions);

        Subscription subscription = container.receive(
                Consumer.from(GROUP_NAME, CONSUMER_NAME),
                StreamOffset.create(STREAM_KEY, ReadOffset.lastConsumed()),
                taskWorkerListener
        );

        container.start();
        log.info("Redis Stream Container started. Listening on stream: {} | Group: {}", STREAM_KEY, GROUP_NAME);

        return subscription;
    }

    @Bean
    public Executor taskExecutor() {
        return Executors.newFixedThreadPool(5);
    }

    private void createConsumerGroup() {
        try {
            redisTemplate.opsForStream().createGroup(STREAM_KEY, ReadOffset.latest(), GROUP_NAME);
            log.info("Successfully created Redis Consumer Group: {}", GROUP_NAME);
        } catch (Exception e) {
            log.debug("Consumer group {} already exists or stream not initialized", GROUP_NAME);
        }
    }
}