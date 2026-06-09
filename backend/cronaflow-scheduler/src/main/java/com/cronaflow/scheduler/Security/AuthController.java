package com.cronaflow.scheduler.Security;

import com.cronaflow.scheduler.domain.User;
import com.cronaflow.scheduler.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    @PostMapping("/register")
    public ResponseEntity<String> register(@RequestBody Map<String,String>request) {
        String email =  request.get("email");
        String rawPassword =  request.get("password");

        if(userRepository.findByEmail(email).isPresent()){
            return ResponseEntity.badRequest().body("Email is already registered");

        }
        User user  =  User.builder()
                .email(email)
                .password(passwordEncoder.encode(rawPassword))
                .role("USER")
                .build();

        userRepository.save(user);
        return ResponseEntity.ok().body("User registered successfully");
    }
    @PostMapping("/login")
        public ResponseEntity<String> login(@RequestBody Map<String,String> request){
        String email =  request.get("email");
        String password =  request.get("password");
        try{
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, password));
                    String token = jwtUtil.generateToken(email);
                    return ResponseEntity.ok(token);

        }
        catch (Exception e){
            return ResponseEntity.status(401).body("Invalid username or password");
        }



    }
}
