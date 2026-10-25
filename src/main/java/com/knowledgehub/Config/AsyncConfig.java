package com.knowledgehub.Config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean("ingestionExecutor")
    public Executor ingestionExecutor(){
        ThreadPoolTaskExecutor ex = new ThreadPoolTaskExecutor();

        ex.setCorePoolSize(2);
        ex.setMaxPoolSize(4);
        ex.setQueueCapacity(50);
        ex.setThreadNamePrefix("ingest-");
        ex.initialize();
        return ex;
    }
}
