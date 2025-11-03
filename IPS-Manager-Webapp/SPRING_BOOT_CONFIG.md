## Spring Boot Security + CORS reference

Use this if you develop the React app on a different origin (e.g., :3000) or test the API directly from a browser. In production behind Nginx, calls are same-origin (`/api`) and won’t hit CORS.

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		http
			.csrf(csrf -> csrf.disable())
			.cors(Customizer.withDefaults())
			.sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			.authorizeHttpRequests(auth -> auth
				.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll() // preflight
				.requestMatchers("/auth/login", "/auth/forgot-password", "/auth/reset-password").permitAll()
				.anyRequest().authenticated()
			);
		return http.build();
	}

	@Bean
	CorsConfigurationSource corsConfigurationSource() {
		CorsConfiguration config = new CorsConfiguration();
		config.setAllowCredentials(true);
		config.setAllowedOriginPatterns(Arrays.asList(
			"http://localhost:*",
			"http://127.0.0.1:*",
			"http://192.168.*:*"
		));
		config.setAllowedMethods(Arrays.asList("GET","POST","PUT","PATCH","DELETE","OPTIONS"));
		config.setAllowedHeaders(Arrays.asList("*"));
		config.setExposedHeaders(Arrays.asList("Authorization","Content-Type","Content-Disposition"));

		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", config);
		return source;
	}
}
```

Notes
- Use `allowedOriginPatterns` when `allowCredentials(true)` is set.
- Permit `OPTIONS /**` so preflight succeeds.
- Keep sessions stateless for JWT.

