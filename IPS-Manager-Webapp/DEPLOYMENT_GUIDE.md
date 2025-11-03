## IPS-Manager Webapp: Deployment Guide (Ubuntu + Nginx + Spring Boot)

This guide gets your React frontend and Spring Boot backend working together on a single Ubuntu host with Nginx, avoiding CORS in production.

Assumptions
- Frontend built with Create React App, this repo.
- Backend Spring Boot running on port 8080 on the same VM.
- Public IP or LAN IP is 192.168.100.34 (replace as needed).

---

## 1) Pull latest code and build frontend

On the server:

```bash
cd /opt/IPS-Manager-Webapp  # or your project path
git pull

# Install deps and build
npm ci
npm run build
```

What this does
- The build uses `.env.production` which sets `REACT_APP_API_BASE=/api`.
- In production, the frontend will call `/api/...` (same-origin) and Nginx will proxy to Spring Boot (no CORS).

Deploy build to Nginx web root:

```bash
sudo rm -rf /var/www/html/*
sudo cp -r build/* /var/www/html/
```

---

## 2) Nginx config

Create or edit `/etc/nginx/sites-available/ips-manager`:

```nginx
server {
		listen 80;
		server_name _;

		root /var/www/html;
		index index.html;

		# Cache static assets
		location ~* \.(?:js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
				expires 6M;
				access_log off;
				add_header Cache-Control "public";
		}

		# Proxy API -> Spring Boot (port 8080)
		# Frontend calls /api/... ; backend receives ... without the /api prefix
		location /api/ {
				proxy_pass http://localhost:8080/;  # trailing slash preserves path sans /api
				proxy_set_header Host $host;
				proxy_set_header X-Real-IP $remote_addr;
				proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
				proxy_http_version 1.1;
				client_max_body_size 20m; # optional: for file uploads
		}

		# React SPA fallback
		location / {
				try_files $uri /index.html;
		}
}
```

Enable and reload:

```bash
sudo ln -sf /etc/nginx/sites-available/ips-manager /etc/nginx/sites-enabled/ips-manager
sudo nginx -t
sudo systemctl reload nginx
```

Note on API prefix
- If your Spring controllers are actually mapped under `/api/...` already, change the proxy to `proxy_pass http://localhost:8080/api/;` so the `/api` prefix is preserved.

---

## 3) Spring Boot CORS (for local dev and direct API calls)

Production via Nginx is same-origin, so CORS isn’t needed. But for local dev (React on 3000 → backend on 8080) and direct testing, add this to your Security config:

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
		// add JWT filter here if applicable
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

---

## 4) Verify

Browser (production):
- Open `http://192.168.100.34`.
- Use the app (login, lists, uploads). There should be no CORS errors in DevTools console.

Quick API check from browser console:

```js
fetch('/api/auth/login', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({ mail: 'test@example.com', password: 'x' })
}).then(r => r.status)
```

Local dev (optional):
- Run Spring Boot on 8080; run React dev server on 3000.
- CORS should allow `http://localhost:3000` automatically.

---

## 5) Troubleshooting

- If you see `/api/api/...` in requests, ensure `.env.production` contains `REACT_APP_API_BASE=/api` and your code calls `authFetch('/path', ...)` not `'/api/path'` directly. Only Excel uploads should use `${API_BASE}/excel/upload`.
- If your backend routes are prefixed with `/api`, change Nginx `proxy_pass` to `http://localhost:8080/api/` or adjust the frontend paths accordingly.
- After changing env files, rebuild the frontend (`npm run build`) and redeploy the build folder to `/var/www/html`.

