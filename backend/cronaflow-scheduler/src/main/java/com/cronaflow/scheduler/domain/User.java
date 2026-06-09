package com.cronaflow.scheduler.domain;

import lombok.Builder;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Builder
@Document(collection = "users")
public class User {
    @Id
    private String id;
    private String email;
    private String password; // We will store this encrypted!
    private String role;     // e.g., "ROLE_USER" or "ROLE_ADMIN"
}
