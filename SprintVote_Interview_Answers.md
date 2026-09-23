# SprintVote interview answer guide

Use these as speaking notes, not a script. State what the project does today first, then distinguish a production improvement clearly. That honesty is stronger than claiming an unimplemented feature.

## 1. Project overview and product thinking

### What problem does SprintVote solve?

SprintVote gives an Agile team a shared, real-time place to estimate a user story using Planning Poker. Without a tool, teams often estimate verbally and senior or vocal people can anchor everyone else. In SprintVote, each participant selects a card privately, the moderator reveals all selections together, and the team can discuss disagreement with a visible record of the round. It combines the live part of estimating with persisted history rather than treating a vote as an isolated UI interaction.

### Who is it for, and why Planning Poker?

The immediate users are product-development teams: developers, QA engineers, designers, and an Agile facilitator or team lead acting as moderator. Planning Poker was a good domain because it has a clear workflow and meaningful real-time requirements: membership, private intermediate state, a privileged reveal action, a reset cycle, and historical records. It therefore demonstrates ordinary REST-based product operations as well as event-driven collaboration.

### Walk through a complete user journey.

1. A new user signs up with name, email, and password, then logs in. Login returns a JWT and user details; the frontend stores them locally so a refresh can restore the session UI.
2. A signed-in user creates a room by entering a user story. The API creates a random room code, persists the room and creator membership, and marks the creator as moderator.
3. The creator shares the code. Another authenticated user joins through the room API, which creates membership unless it already exists.
4. The Room screen opens one Socket.IO connection and emits `join-room`. The server loads room players and current Redis vote state and broadcasts `room-state`, including only whether each player has voted.
5. Each participant chooses a card. Their vote is stored in Redis and the room receives `player-voted`; before reveal, nobody receives the chosen value.
6. The moderator emits `reveal-votes`. The server reads votes, calculates the numeric average, saves the completed round to MySQL, and broadcasts all votes and the average.
7. The moderator may reset. Redis live votes are deleted, clients clear their round state, and durable history remains available.
8. A signed-in member can open history to retrieve rounds only for rooms in which that user is a recorded player.

### What is in the MVP, and what would you add next?

The MVP is account creation/login, protected room create/join/read operations, live voting, moderator-only reveal/reset in the current implementation, a Fibonacci-like deck including `?`, and persisted revealed-round history. The next sprint would focus first on production readiness rather than decorative features: secure password hashing, authenticated Socket.IO handshakes, server-side input validation, environment-based configuration, automated tests, and error/retry UX. Product additions after that would be story editing or a backlog, custom decks, a final agreed estimate, invite-only rooms, presence, and discussion notes.

### Why hidden estimates, `?`, and an average?

Hidden votes protect independent judgment and reduce anchoring bias. `?` means “I cannot responsibly estimate this yet”—for example, the story is unclear, unknown work is too large, or a dependency needs investigation. It is deliberately excluded from the arithmetic average. The average is a quick signal of the center of numeric selections, rounded to two decimals, but it is not the decision: Planning Poker is a consensus conversation. A median, the spread, and the reason behind outliers are often more useful. If every vote is `?`, the current utility returns `0`; in a production UI I would return `null`/“no numeric estimate” instead, because zero misleadingly suggests an estimate.

### Scope trade-offs and differentiation

I kept the first version deliberately focused on one active round per room and simple membership. That avoided premature complexity such as organizations, invitations, presence, multi-story backlogs, and distributed socket scaling. SprintVote is not trying to outperform mature Planning Poker products today; its value as a project is a clean full-stack demonstration of temporary private state in Redis, durable history in MySQL, and real-time room broadcasts. A product differentiator I would pursue is an audit-friendly estimation workflow: agreed estimate, discussion rationale, and historical estimation accuracy by team.

## 2. Architecture and technology choices

### Describe the architecture.

SprintVote is a React/Vite single-page client and an Express/Node backend. Axios uses REST for durable request/response operations; Socket.IO uses the Node HTTP server for live room events. MySQL is the system of record for users, rooms, membership, revealed sessions, and votes. Redis holds only the active round’s mutable vote state. On startup, the server connects Redis before it begins listening, then composes Express JSON parsing and CORS, mounts auth/room/history routes, creates Socket.IO with matching CORS policy, and installs its event handlers.

The main flow is:

```text
React UI --Axios + JWT--> Express routes -> controllers/services -> MySQL
React Room --Socket.IO----> socket handlers -> Redis (live votes) -> room broadcast
                                                    | on reveal
                                                    v
                                                 MySQL history
```

### Why client-server, React, Vite, Express, REST plus Socket.IO?

A frontend-only app would not safely support shared membership, authorization, multi-user state, or durable history. React fits a UI with independently changing pieces of state—room, players, local selected card, reveal status, and results—and reusable components (`VotingCards`, `PlayerList`, `Results`). Vite gives a quick modern React development/build setup. Express is lightweight and a natural fit for JSON APIs and middleware. REST is ideal for explicit resource operations such as signup, login, create/join/get room, and history; Socket.IO is appropriate for low-latency fan-out events where polling would add delay and unnecessary requests.

### What is stored where?

MySQL holds data that must survive restart and be queried later: users, rooms and stories, players/membership and moderator flag, voting sessions, and votes belonging to a revealed session. Redis holds `votes:<roomCode>` as a hash whose fields are user IDs and whose values are JSON containing the name and card. A hash makes one user’s later choice overwrite the old choice naturally. `EXPIRE 3600` provides cleanup for abandoned active rounds; each new vote refreshes that one-hour TTL. Reset deletes the hash. The trade-off is that a Redis restart or TTL expiry loses an in-progress round; that is acceptable for this MVP but should be explicitly handled or persisted in a production reliability design.

### Why backend layers and dependency direction?

Routes define the HTTP surface and apply middleware. Controllers translate HTTP requests into application operations and responses. Services contain database/Redis work and reusable domain logic. Middleware performs cross-cutting checks such as JWT authentication. Utilities contain focused helpers such as room-code generation. The dependency direction should be routes → controllers → services/data clients, not the reverse; it keeps HTTP details out of persistence logic and makes services more testable. Socket handlers are another transport adapter and should call the same domain services rather than duplicating rules.

### Deployment and scale answer

I would host the static Vite build on a CDN/object store or frontend service, the API behind HTTPS and a reverse proxy, and use managed MySQL and managed Redis in private network paths. Secrets and endpoint URLs belong in environment configuration/secret management, not source. With multiple Node instances, the current in-memory Socket.IO room registry no longer reaches clients connected to another process. The solution is the Socket.IO Redis adapter for cross-instance fan-out plus sticky sessions at the load balancer for transport continuity. I would also make every socket authenticate during the handshake, validate membership on join, and use shared Redis rather than any process-local room state.

## 3. Frontend and React

### Routing, access, and restored state

React Router controls screen navigation. The app initializes the user from a locally stored user object, so guarded routes can redirect an unauthenticated visitor to login using `Navigate`; on login the app state is updated, and on logout token/user/current-room values should be removed to prevent stale access UI. The Room component also stores `currentRoom` and `currentStory` locally, enabling it to reconnect after refresh. This is convenience state, not authority: the server must re-authorize each protected API request and socket event.

### Why `useState`, `useRef`, and `useEffect`?

`useState` is for data that affects rendering: players, my vote, revealed votes, average, moderator status, errors, and room mode. The socket instance is imperative mutable infrastructure, so it lives in `useRef`; replacing it must not trigger a render. `useEffect` reconnects when restoring a saved room and disconnects on cleanup. Before creating a replacement socket, the code disconnects an existing one, and cleanup nulls the ref. This avoids duplicate open sockets and duplicate event deliveries. In development, React Strict Mode may mount, clean up, and remount effects to expose unsafe side effects; cleanup and listener management are therefore essential.

### Local state versus server state

Local-only state includes typed story/code, current UI mode, selected personal card, transient error, and the socket reference. Shared state—membership, who has voted, revealed card values, and persisted history—comes from the server. The UI disables voting after `revealed` and visually marks the locally selected card. The server must duplicate that protection: client-side disabling is a usability feature, not a security boundary.

### Improvements to UI quality

I would add a connecting/reconnecting indicator, operation-specific loading states, friendly API/socket errors, empty-history guidance, and retry actions. Accessibility improvements include real `<label>` elements, keyboard-operable cards with visible focus, semantic button states, `aria-live` announcements for reveal/reset, good contrast, and announcing validation messages. For mobile, use a responsive card grid, flexible header, touch targets at least roughly 44px, and avoid width assumptions. `Room` can be tested by mocking API methods and Socket.IO, asserting emitted payloads, state updates for each server event, cleanup on unmount, and disabled moderator/non-moderator interactions.

### localStorage risk

localStorage is simple and lets state survive refresh, but any successful XSS can read a JWT from it. For a production browser app I would prefer short-lived access tokens held in memory and rotate refresh tokens in secure, `HttpOnly`, `Secure`, `SameSite` cookies, along with CSP and careful output handling. Cookie authentication requires CSRF controls; bearer tokens in headers reduce classic CSRF exposure but do not remove XSS risk.

## 4. REST API

### Endpoint inventory and semantics

| Endpoint | Auth | Purpose |
|---|---:|---|
| `POST /api/auth/signup` | No | Create a user from name, email, password; returns 201 with account message and user ID. |
| `POST /api/auth/login` | No | Validate credentials; returns a JWT and user object. |
| `POST /api/rooms` | Yes | Create a room for a story; creator becomes moderator. |
| `POST /api/rooms/:roomCode/join` | Yes | Join a room or return existing membership. |
| `GET /api/rooms/:roomCode` | Yes | Retrieve room information. |
| `GET /api/history` | Yes | Retrieve the caller’s allowed historical sessions. |
| `GET /api/history/:sessionId` | Yes | Retrieve one authorized session and its votes. |

POST communicates an action that creates state—room, membership, account, or login session/token—while GET is read-only retrieval. Axios adds `Authorization: Bearer <token>` through a request interceptor whenever a token exists. API modules (`authApi`, `roomApi`, `historyApi`) isolate HTTP concerns from React components.

### Status and error answer

I use or would standardize: 201 for successful creation, 200 for successful reads/login/join, 400 for malformed or missing input, 401 for missing/invalid/expired credentials, 403 for an authenticated user lacking permission, 404 for a missing room/session, 409 for a duplicate email or uniqueness conflict, and 500 for unexpected server failures. The response shape should be consistent, for example `{ error: { code, message, requestId } }`, so the frontend never has to infer errors from arbitrary strings. Details safe for logs should be structured with a generated request ID; internal stack/database details must not be exposed to clients.

### API evolution and protection

I would publish an OpenAPI document describing schemas, auth, examples, status responses, and error format, then serve Swagger UI in non-production or behind access controls. Version the API at a stable boundary such as `/api/v1`, keeping a migration period for breaking changes. Validate request bodies with a schema library such as Zod/Joi/express-validator at route boundaries. Add IP/account-aware rate limits and progressive backoff to signup/login, plus sensible limits to join requests and payload size.

## 5. Authentication and authorization

### Signup and login, end to end

Signup checks required fields and minimum password length, verifies the email is not already registered using a parameterized query, inserts the user, and returns 201. Login finds the user by email, checks the password, signs a JWT containing user ID, name, and email, with a two-hour expiry, and returns it with a user object. The client interceptor sends it in subsequent REST calls. Authentication middleware verifies the JWT signature and expiry, looks up the user again, then attaches the verified identity to `req.user`.

The database lookup after signature verification is useful because a correctly signed token can outlive user deletion or account disablement; it ensures the principal remains valid. A missing, malformed, expired, invalid, or deleted-user token is rejected. Authentication answers “who is this?”; authorization answers “may this identity do this?” In SprintVote, room membership authorizes participation and the `is_moderator` membership flag authorizes reveal/reset.

### Important candid security answer: passwords

The current code has `bcrypt.hash` and `bcrypt.compare` commented out, so it appears to store and compare plaintext passwords. That is a serious defect and would block release. My first remediation is to enable bcrypt (or preferably Argon2id where available) with an appropriate cost factor; never log passwords; normalize email; enforce a reasonable password policy; and use generic login failures. Existing plaintext accounts require a controlled forced-reset or first-login migration plan—never simply keep plaintext indefinitely. I would add tests proving that the stored value is not the supplied password and that compare is required for login.

### JWT, secrets, logout, and refresh

The JWT secret is cryptographic key material and must be a long random production secret from a secret manager, rotated with a key-ID strategy. A fallback secret is acceptable only for local development; silently using one in production is unsafe. Client-only logout removes local credentials, but server-side invalidation needs state: short access-token lifetimes plus refresh-token records, a revocation/deny list keyed by token ID, session versioning on the user, or a combination. Refresh tokens should be opaque, rotating, stored hashed server-side, bound to device/session metadata, and delivered only through secure HttpOnly cookies.

### Why current socket auth is not sufficient

The current client emits a plain `userId` in `join-room`, and the server trusts it to associate the socket. A malicious client could claim another ID or join a room without the REST membership flow. Production design: send the access token in Socket.IO handshake auth; verify it in `io.use`; put the verified user ID on `socket.data`; then, on `join-room`, query/verify membership and derive moderator status server-side. Every event must use `socket.data.roomCode` and identity rather than client-provided authority, enforce payload schemas and allowed card values, and reject cross-room or unauthorized actions. Frontend route guards never replace these server checks.

## 6. Rooms and domain model

### What is a room and who is moderator?

A room represents one collaborative estimation context: a unique room code, user story, creator/moderator membership, participants, and its voting history. The creator is automatically made moderator because the creator initiates the session and needs an actor allowed to reveal/reset. Membership belongs in a `players` table rather than a serialized room field because it is a many-to-many-like relation with metadata—moderator flag and join details—and needs constraints and authorization queries.

### Codes, collisions, and membership edge cases

Room codes are generated using `crypto.randomBytes`, which is cryptographically stronger and less predictable than `Math.random()`. A 16-character hexadecimal string has 64 bits of space: collisions are exceptionally unlikely at modest scale, but probability is not zero. The database must enforce `UNIQUE(room_code)`, and creation should retry a duplicate-key error a bounded number of times. Joining is idempotent in the current intent: if the user already belongs, return existing membership rather than insert another player row. Enforce `UNIQUE(room_code, user_id)` so multiple tabs cannot create duplicate membership. A user can be in multiple rooms unless business rules say otherwise.

### Future domain rules

I would define moderator departure explicitly: transfer to a chosen eligible member, elect the longest-present member, or retain the role while allowing an owner/admin recovery flow. Private rooms should use an invite record or signed, expiring invitation rather than relying solely on a secret code. Rooms can expire via `expires_at`/archived status plus Redis-key cleanup. Multiple stories are best modeled as stories/backlog items and rounds linked to a story ID, not by mutating a single room story. Organizations, teams, and memberships need explicit organization/team/user join tables and authorization scoped to them.

## 7. Socket.IO and real-time behaviour

### Events and room flow

On `join-room`, the current code joins a Socket.IO room keyed by room code, loads players from MySQL and votes from Redis, derives `voted` flags, and emits `room-state` to that Socket.IO room. Clients emit `join-room`, `vote`, `reveal-votes`, and `reset-votes`. The server emits `room-state`, `player-voted` (identity/status only), `votes-revealed` (values and average), and `votes-reset`. `io.to(roomCode)` targets only interested participants rather than broadcasting to every connected user.

When a participant changes a choice before reveal, Redis `HSET` replaces their field, so one current vote remains. A reconnecting/late-joining member receives status reconstructed from Redis. Values remain hidden because only a voted flag is broadcast until reveal.

### Races, idempotency, and delivery

Today, repeated reveal can save duplicate sessions because revealed state is not atomically marked, and a reveal/reset race can produce confusing results. In a stronger model, maintain a round/session state machine (`open → revealing → revealed → reset/closed`) with a version number. Use an atomic Redis Lua script or transaction/lock to compare-and-transition open to revealing once; persist with a database transaction and an idempotency key/unique constraint such as one `(room_id, round_number)` session; finally mark and broadcast the durable result. Reset also needs a defined transition and version check. Clients include a round/version and ignore stale events.

Socket.IO acknowledgements can confirm that the server accepted an event, but they are not a guarantee that every client rendered it. On reconnect, fetch or emit authoritative `room-state` and latest round state, making events recoverable. Add explicit `connect_error`, reconnect/backoff UI, request correlation IDs, and telemetry for connection, reconnect, event failure, and end-to-end reveal latency.

### Scale and presence

For many Node processes, use sticky sessions plus a Socket.IO Redis adapter. Presence cannot equal one socket equals one person: a user can have many tabs and transient disconnects. Track per-user connection counts with a short heartbeat/grace period and broadcast presence only on meaningful transitions. Test the socket layer with real Socket.IO clients against an isolated server/Redis, covering unauthorized join, secret pre-reveal values, vote replacement, moderator denial, reconnect, duplicate reveal, and reset races.

## 8. Redis and voting

`votes:<roomCode>` is a Redis hash. The user ID field makes replacement O(1) and naturally prevents multiple current votes per user. JSON allows the current MVP to retain name and string card together, although user identity should ideally be authoritative from MySQL and vote schema should be validated. `getVotes` should catch malformed JSON and report/skip a corrupt entry rather than crash the whole room handler. Namespacing should include environment and tenant, for example `prod:tenant-42:votes:ABC123`.

Redis is faster and more appropriate than MySQL for frequently overwritten, short-lived live state. The cost is weaker durability. If Redis is unavailable, the service should fail the vote/reveal gracefully, return a retryable error, alert operators, and never pretend a vote succeeded. For stronger durability, persist a draft round/event stream or Redis persistence/replication, then reconcile with MySQL. Monitor availability, memory/evictions, command latency, errors, TTL/key counts, hit rate where relevant, and reconnects. Cleanup should expire inactive rooms and delete their associated keys.

## 9. Database and persistence

### Likely schema and constraints

Core tables are `users`, `rooms`, `players`, `voting_sessions`, and `votes`. Typical relationships are users → players ← rooms; rooms → voting_sessions → votes. Give each table a primary key; use foreign keys for membership, session-room, and vote-session relationships. Add `UNIQUE(users.email)`, `UNIQUE(rooms.room_code)`, and `UNIQUE(players.room_code, players.user_id)` (or a room ID equivalent). Index `rooms(room_code)`, `players(room_code, user_id)`, `voting_sessions(room_code, created_at DESC)`, and `votes(session_id)`. Parameterized SQL (`?` placeholders) is important because it separates values from query syntax and prevents SQL injection; all incoming values must use it.

### Authorization and transactional reveal

History should join/filter through `players` using the authenticated user, so a user only sees sessions for rooms they joined. Detail lookup must perform the same ownership/membership check, not merely fetch by session ID. The current reveal saves the session then inserts votes with separate queries. If one vote insert fails, history can contain a partial round; if a network retry occurs after persistence, a duplicate session is possible. The improvement is one database transaction: lock/create the unique session idempotently, insert session and all votes, commit, then broadcast. On failure roll back and send no “revealed” event. Use migrations (for example, versioned SQL via a migration tool), tested backups, point-in-time recovery, and periodic restore drills.

For privacy/deletion, minimize personal data in historic votes. Prefer snapshotting an anonymized display name or user reference according to policy, retain only what is necessary, provide export/deletion workflows, and account for records that must be anonymized rather than blindly deleted if audit retention applies. Credentials and connection settings must use environment configuration and a secret manager; hard-coded database credentials are not production-safe.

## 10. Voting rules and edge cases

The deck `1, 2, 3, 5, 8, 13, 21, ?` uses widening Fibonacci-like gaps because uncertainty grows as work gets larger. Numeric cards are parsed and averaged; `?` becomes non-numeric and is filtered out. No votes also produces zero in the current function, but I would model it as no result. A user may vote repeatedly before reveal; their latest vote replaces the old one. The UI prevents post-reveal votes and lets the moderator reset at any time, but the server should enforce a round state so these rules cannot be bypassed.

I would not require every player to vote before reveal because a team may knowingly proceed without someone. Instead, the moderator sees “waiting” versus “voted” status without values. A better result screen shows individual cards, numeric average, median, min/max or spread, number of `?`/abstentions, and a field for the final agreed estimate. Add custom decks per team and an explicit “abstain/coffee break” card whose semantics are separate from uncertainty.

## 11. Security review: strongest answer

The highest-priority current risks are plaintext password handling, trusting client-supplied socket identity and room data, a fallback JWT secret, hard-coded database configuration, hard-coded local endpoints, localStorage token exposure, insufficient server-side socket validation/authorization, and absent visible rate-limiting/security headers/test coverage. Before launch I would:

1. Fix password hashing and credential migration; move all secrets/configuration to secret-managed environment variables.
2. Require HTTPS; restrict CORS to exact production origins; configure security headers such as Helmet and a content-security policy.
3. Authenticate Socket.IO handshake, authorize room membership/moderator actions server-side, validate every REST/socket payload and cap payload sizes.
4. Add rate limits, login monitoring, generic auth errors, audit events for moderator actions, and secure logging that excludes tokens/passwords.
5. Use unpredictable codes plus rate limits and membership/invites to resist room-code enumeration.

Bearer tokens in localStorage are not normally sent automatically cross-site, so classic CSRF is lower than with cookies; however, XSS can steal the token. CSP, output escaping, dependency hygiene, no dangerous HTML injection, and an HttpOnly-cookie token strategy reduce the risk. Cookies introduce CSRF concerns, handled by SameSite, CSRF tokens/origin checks, and correct CORS. Secrets must be excluded from source control and rotated if exposed.

## 12. Reliability, performance, and scaling

On join the code retrieves all players and all Redis votes, then calls `votes.some(...)` for each player. With P players and V votes, that is O(P×V). Convert votes to a `Set` of user IDs once, making the membership lookup O(P+V). Cache stable room/player metadata cautiously, paginate history with cursor or `(created_at, id)` keyset pagination, and add appropriate indexes.

If MySQL or Redis slows down, use explicit timeouts, bounded retries only for safe/idempotent operations, circuit-breaker/health signals, user-visible retry feedback, and alerts rather than hanging silently. Cross-store atomicity cannot be made fully transactional by wishful thinking; use a clear source of truth and an outbox/saga or state machine. For example, persist an idempotent revealed session transactionally in MySQL and use a durable outbox event to broadcast/reconcile if the process crashes.

Metrics should include HTTP request rate/latency/error by route, DB/Redis latency and connection failures, socket connections/reconnects/event error rate, active rooms, votes/reveal latency, duplicate/idempotency conflicts, and history-query performance. Alert on availability, sustained 5xx, authentication anomalies, DB/Redis saturation, high Redis evictions, and socket disconnect spikes. Load test realistic cases—such as 1,000 simultaneous joins—using isolated environments, measure p95/p99 latency and fan-out correctness, then scale API/socket instances, MySQL read replicas where safe, Redis HA/cluster, and the socket adapter.

## 13. Testing and quality

The visible frontend scripts include build and lint, but no test command is visible; the backend similarly lacks visible test tooling. I would add a test runner (Vitest/Jest), Supertest for HTTP, Socket.IO client integration tests, testcontainers or disposable MySQL/Redis instances, and Playwright/Cypress for end-to-end journeys.

First unit tests: `calculateAverage` for normal numbers, `?`, mixed cards, all `?`, empty input, decimal/string values, invalid payloads, and rounding; room-code generation; validation schemas; and JWT middleware for no token, malformed/expired token, missing DB user, and valid user. Service/controller tests mock data adapters where unit isolation is useful, while integration tests use a clean real database and Redis. Socket integration tests should prove vote values are not broadcast before reveal, non-moderators cannot reveal/reset, rejoin reconstructs status, and reset clears only live state. Seed data through migrations/factories, isolate each test, and clean/reset between cases. CI should run install, lint, unit/integration tests, production build, dependency scanning, static analysis, and coverage thresholds appropriate to critical paths.

## 14. Defending implementation decisions and technical debt

Some database methods wrap callback-style MySQL APIs in Promises because the selected driver is callback based. It works, but I would refactor to a promise-native pool and `async/await` for linear error flow, transactions, proper connection release, and simpler tests. SQL joins in history are preferable to multiple application queries because the database can join efficiently and authorization can be enforced in one query.

Current room state is duplicated between React memory and localStorage so the screen works live and can restore after refresh. The durable authority remains server state. Live votes are ephemeral because they change often and are private until reveal; revealed results become durable product history. Reset deliberately deletes only Redis state because it starts a new round and should not erase an already recorded decision. Saving history before broadcasting reveal aims to avoid showing users a result that cannot be retrieved later—but it must become transactional and idempotent, with a defined failure response.

My first refactor for maintainability is a promise-native data layer plus shared validation/domain services used by HTTP and Socket.IO. For security it is password hashing plus socket handshake auth. For observability it is structured logs, request/event IDs, metrics, health checks, and error reporting. For deployment it is environment configuration, secrets, migrations, containerization, HTTPS, and a CI/CD pipeline with health-checked rollout.

## 15. Closing answers

### What did you learn and what are you proud of?

The main learning was that REST and real-time events solve different parts of the same product. REST gives clear request/response semantics for identity and durable resources; Socket.IO gives immediate room updates, but it also introduces lifecycle, reconnection, authorization, ordering, and scaling concerns. I am proud of the deliberate separation of live Redis vote state from MySQL history and of keeping pre-reveal values hidden at the broadcast level. The hardest consistency issue is reveal: it bridges Redis, MySQL, and a room broadcast, so production correctness requires an idempotent state transition rather than just sequential calls.

### What would you do differently, and what must be fixed before launch?

I would design authentication and the round state machine earlier, then introduce tests before feature growth. Before launch, password security, configuration/secrets, socket authentication/authorization, request/event validation, rate limiting, HTTPS/security headers, transactional/idempotent reveal, observability, and automated tests are non-negotiable. I would estimate a production-readiness effort by turning those into separately scoped stories after an architecture/security review, rather than giving one unsupported number; for a small team it is a multi-sprint hardening effort, not a last-day polish task.

### Explain SprintVote to different audiences.

To a product manager: “It lets a team privately estimate a story together, reveal at the same time to avoid bias, discuss differences, and retain the result.”

To a staff engineer: “It is a React/Express collaborative round application: MySQL owns identities, room membership, and immutable revealed history; Redis owns ephemeral per-room votes; Socket.IO fans out state changes. The next architecture work is authenticated sockets, idempotent round transitions, and distributed socket fan-out.”

### How would you measure success and collect feedback?

Track activation (created room and first completed reveal), completed rounds per active team, median time from room creation to consensus, disagreement distribution, repeat team usage, reconnect/error rate, and qualitative feedback on whether the result aided discussion. Do not treat individual vote values as general analytics by default. Use aggregated, privacy-minimized metrics, disclose collection, honor retention/deletion policy, and give teams a direct feedback channel that does not require sharing confidential story content.
