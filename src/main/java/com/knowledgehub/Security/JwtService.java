package com.knowledgehub.Security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtService {
    private final SecretKey secretKey;
    private final long expiryMillis;

    public JwtService(@Value("${docmind.jwt.secret}") String secret,
                      @Value("${docmind.jwt.expiry-hours:24}") long expiryHours){

        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if(bytes.length < 32){
            throw new IllegalArgumentException("docmind.jwt.secret must be at least 32 characters long");
        }

        this.secretKey = Keys.hmacShaKeyFor(bytes);
        this.expiryMillis = expiryHours * 3_600_000L;
    }

    public String generate(Long userid, String email){
        Date now = new Date();

        return Jwts.builder()
                .subject(String.valueOf(userid))
                .claim("email", email)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expiryMillis))
                .signWith(secretKey)
                .compact();
    }

    public AuthUser parse(String token) throws JwtException{
        Claims c = Jwts.parser().verifyWith(secretKey).build().parseSignedClaims(token).getPayload();
        return new AuthUser(Long.valueOf(c.getSubject()), c.get("email", String.class));
    }
}
