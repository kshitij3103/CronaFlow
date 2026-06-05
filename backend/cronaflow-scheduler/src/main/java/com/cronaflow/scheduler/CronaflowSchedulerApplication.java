package com.cronaflow.scheduler;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CronaflowSchedulerApplication {

	public static void main(String[] args) {
		SpringApplication.run(CronaflowSchedulerApplication.class, args);
	}

}
