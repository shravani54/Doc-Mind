package com.knowledgehub.Config;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;

import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.memory.ChatMemoryRepository;
import org.springframework.ai.chat.memory.MessageWindowChatMemory;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.ai.chat.client.advisor.vectorstore.QuestionAnswerAdvisor;

@Configuration
public class AiConfig {

    private static final String SYSTEM_PROMPT = """
            You are DocMind, an assistant that answers questions about the user's uploaded documents.
            Use ONLY the context provided with each question. Never use outside knowledge.
            If the context does not contain the answer, reply exactly:
            "I couldn't find that in your documents."
            Keep answers clear and concise, in short paragraphs.""";

    @Bean
    public ChatMemory chatMemory(ChatMemoryRepository chatMemoryRepository){
        return MessageWindowChatMemory.builder()
                .chatMemoryRepository(chatMemoryRepository)
                .maxMessages(20)
                .build();
    }

    @Bean
    public ChatClient chatClient(ChatClient.Builder builder,
                                 ChatMemory chatMemory,
                                 VectorStore vectorStore,
                                 @Value("${docmind.rag.top-k}") int topK,
                                 @Value("${docmind.rag.similarity-threshold}") double threshold) {

        QuestionAnswerAdvisor rag = QuestionAnswerAdvisor.builder(vectorStore)
                .searchRequest(SearchRequest.builder().topK(topK).similarityThreshold(threshold).build())
                .build();

        return builder
                .defaultSystem(SYSTEM_PROMPT)
                .defaultAdvisors(MessageChatMemoryAdvisor.builder(chatMemory).build(), rag)
                .build();
    }
}
