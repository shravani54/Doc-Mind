package com.knowledgehub.Chat;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.knowledgehub.Security.AuthUser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.vectorstore.QuestionAnswerAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * The RAG "read path". Every token is sent as a JSON string (so spaces and newlines survive),
 * followed by one "sources" event with the citations.
 */
@Service
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);
    private static final String NOT_FOUND = "I couldn't find anything about that in your documents.";

    private final ChatClient chatClient;
    private final VectorStore vectorStore;
    private final ObjectMapper mapper;
    private final int topK;
    private final double threshold;

    public ChatService(ChatClient chatClient, VectorStore vectorStore, ObjectMapper mapper,
                       @Value("${docmind.rag.top-k}") int topK,
                       @Value("${docmind.rag.similarity-threshold}") double threshold) {
        this.chatClient = chatClient;
        this.vectorStore = vectorStore;
        this.mapper = mapper;
        this.topK = topK;
        this.threshold = threshold;
    }

    public Flux<ServerSentEvent<String>> stream(AuthUser user, ChatRequest req) {
        // Only this user's chunks (and only the selected documents, if any) can ever be retrieved.
        String filter = buildFilter(user.id(), req.documentIds());

        // Retrieve once here to build citations and to refuse early when nothing relevant exists.
        List<Document> hits = vectorStore.similaritySearch(SearchRequest.builder()
                .query(req.message()).topK(topK).similarityThreshold(threshold).filterExpression(filter).build());
        if (hits.isEmpty()) {
            return Flux.just(token(NOT_FOUND));
        }
        List<SourceDto> sources = toSources(hits);

        String conversationKey = user.id() + ":" + req.conversationId();   // scoped per user

        Flux<ServerSentEvent<String>> tokens = chatClient.prompt()
                .user(req.message())
                .advisors(a -> a
                        .param(ChatMemory.CONVERSATION_ID, conversationKey)
                        .param(QuestionAnswerAdvisor.FILTER_EXPRESSION, filter))
                .stream()
                .content()
                .map(this::token);

        return tokens
                .concatWith(Mono.fromSupplier(() -> sourcesEvent(sources)))
                .onErrorResume(e -> {
                    log.error("Chat stream failed", e);
                    return Flux.just(token("\n\n[The answer could not be completed. Please try again.]"));
                });
    }

    /** IDs are typed as numbers, so nothing a client sends can change the structure of this expression. */
    private static String buildFilter(Long userId, List<Long> documentIds) {
        String filter = "userId == " + userId;
        if (documentIds != null) {
            String ids = documentIds.stream().filter(Objects::nonNull).map(String::valueOf).collect(Collectors.joining(","));
            if (!ids.isEmpty()) filter += " && documentId in [" + ids + "]";
        }
        return filter;
    }

    private static List<SourceDto> toSources(List<Document> hits) {
        Map<String, SourceDto> unique = new LinkedHashMap<>();
        for (Document d : hits) {
            Object fn = d.getMetadata().get("filename");
            Object pg = d.getMetadata().get("page_number");
            String filename = fn == null ? "Document" : fn.toString();
            Integer page = pg instanceof Number n ? n.intValue() : null;
            unique.putIfAbsent(filename + "#" + page, new SourceDto(filename, page));
        }
        return List.copyOf(unique.values());
    }

    private ServerSentEvent<String> token(String text) {
        return ServerSentEvent.<String>builder(json(text)).build();
    }

    private ServerSentEvent<String> sourcesEvent(List<SourceDto> sources) {
        return ServerSentEvent.<String>builder(json(sources)).event("sources").build();
    }

    private String json(Object value) {
        try {
            return mapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }
}