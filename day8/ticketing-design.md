# TicketHub — Ticketing System Design

## 1. Requirements

### Functional Requirements

TicketHub is a website where users can browse events, select seats, purchase tickets, and view their purchased tickets.

The system must:

1. Allow users to register, log in, and manage their accounts.
2. Display upcoming concerts and events with details such as venue, date, time, price, and available seats.
3. Allow users to view a seating plan and see which seats are available, temporarily held, or sold.
4. Allow users to temporarily hold available seats while completing checkout.
5. Process payments securely and confirm successful purchases.
6. Generate tickets associated with the correct user, event, and seat.
7. Allow users to view their orders and purchased tickets.
8. Release held seats automatically when the hold expires or checkout fails.
9. Prevent two users from purchasing the same seat.
10. Provide an orderly and fair process for users during popular ticket sales.

### Non-Functional Requirements

**Speed and performance**
- Event listings and event details should load within 2 seconds under normal conditions.
- Seat availability should update quickly and accurately.
- The system should respond to most normal API requests within 500 milliseconds, excluding external payment processing.
- The system should scale to handle sudden increases in traffic.

**Correctness and consistency**
- A seat must never be sold to more than one customer.
- An order must not be marked as paid unless payment has been confirmed.
- Seat status, order status, and payment status must remain consistent.
- Repeated payment requests must not create duplicate charges or tickets.

**Fairness**
- Users should enter a virtual waiting room when demand exceeds available capacity.
- Users should be admitted in a controlled order, using queue-entry time as the primary criterion.
- The system should apply rate limits to prevent automated requests from overwhelming the sale.
- Everyone in the queue should receive clear information about their position and progress.
- A seat should remain held for a limited period, such as 10 minutes, so users have a fair opportunity to complete checkout.

**Availability and reliability**
- The website should remain usable during traffic spikes.
- Failed requests should be retryable without creating duplicate orders or payments.
- The system should recover from application-server failures without losing confirmed orders.
- Database backups and recovery procedures should protect important transaction records.

**Security and privacy**
- Authentication and authorization must protect customer accounts and tickets.
- Payment details must be handled by a trusted payment provider rather than stored as raw card information.
- All communication should use HTTPS.
- Input validation, rate limiting, and access controls should protect the API from abuse.

## 2. Traffic Estimates

TicketHub has 2 million registered users.

### Normal daily traffic

Given:
- Daily visitors: 50,000
- Pages viewed per visitor: 10
- Tickets sold per day: 5,000

**Daily page views**

50,000 visitors × 10 pages = **500,000 page views per day**

Assuming traffic is evenly distributed over 24 hours:

- Average page views per second: 500,000 ÷ 86,400 = approximately **5.8 requests per second**, if each page view generates one request.
- Average visitors per second: 50,000 ÷ 86,400 = approximately **0.58 visitors per second**.
- Average ticket sales per second: 5,000 ÷ 86,400 = approximately **0.058 tickets per second**.

These are averages, not maximum loads. Real traffic can be much higher during busy periods.

### Popular concert sale

Given:
- People attempting to buy tickets: 200,000
- Available seats: 20,000
- Sale window: 10 minutes (600 seconds)

**Average arrival rate**

200,000 ÷ 600 = approximately **333 purchase attempts per second**.

The system receives demand for ten times the available seats:

200,000 people ÷ 20,000 seats = **10 people per seat**.

If 200,000 people each generate one request per second during the sale, the request rate would be much higher. Therefore, the 333 attempts per second figure represents an average arrival rate, not the total API request rate.

### Comparison

| Measurement | Normal day | Popular sale |
|---|---:|---:|
| Visitors or purchase attempts | 50,000 per day | 200,000 in 10 minutes |
| Average visitor/attempt arrival rate | 0.58 per second | 333 per second |
| Page views | 500,000 per day | Depends on browsing behavior |
| Ticket demand | 5,000 sold per day | 200,000 people competing for 20,000 seats |
| Main challenge | Consistent performance | Traffic spikes, fairness, and seat contention |

The popular sale attracts four times as many people as a normal day's visitors in only 10 minutes. Its average arrival rate is approximately 576 times the normal daily visitor arrival rate.

I would design the sale system to handle at least 1,000 requests per second on the critical ticketing path as an initial capacity target, then validate and adjust that target through load testing. This is a planning estimate, not a measured capacity guarantee.

## 3. API Design

TicketHub uses a REST API. JSON is used for request and response bodies, and HTTPS protects communication.

| Method and endpoint | Purpose |
|---|---|
| `GET /api/events` | Browse and search events, with pagination and filters. |
| `GET /api/events/:eventId` | View event details, venue, date, and ticket prices. |
| `GET /api/events/:eventId/seats` | View seats and their current availability. |
| `POST /api/seat-holds` | Temporarily hold one or more available seats for the authenticated user. |
| `DELETE /api/seat-holds/:holdId` | Release a hold when the user cancels checkout. |
| `POST /api/orders` | Create a pending order from valid seat holds. |
| `POST /api/orders/:orderId/payment` | Initiate payment through the payment provider. |
| `POST /api/payments/webhook` | Receive and verify payment-provider notifications. |
| `GET /api/me/tickets` | View tickets belonging to the authenticated user. |
| `GET /api/me/orders/:orderId` | View an order's status and details. |

### Example: Holding seats

Request:

`POST /api/seat-holds`

```json
{
  "eventId": 42,
  "seatIds": [101, 102]
}
```

Successful response:

```json
{
  "holdId": "hold_abc123",
  "status": "held",
  "expiresAt": "2026-10-17T20:10:00Z"
}
```

The server must check and reserve the seats atomically. If either requested seat is unavailable, the system should reject the entire request rather than partially reserve the seats.

The example expiry is illustrative; the server should calculate the actual expiry time.

### Important API behavior

- `200 OK` or `201 Created`: successful request.
- `400 Bad Request`: invalid input.
- `401 Unauthorized`: the user is not authenticated.
- `404 Not Found`: the event, seat, hold, or order does not exist.
- `409 Conflict`: a seat is no longer available or the hold has expired.
- `429 Too Many Requests`: the client has exceeded its rate limit.
- `503 Service Unavailable`: temporary overload or service failure.

Payment and order-creation requests should support idempotency keys. Repeating the same request with the same key must not create another order or charge.

## 4. Data Model

The database uses a relational database such as PostgreSQL because ticket sales require reliable transactions, relationships, and uniqueness constraints.

### Table 1: `users`

| Column | Type | Description |
|---|---|---|
| `id` | BIGINT, primary key | Unique user ID |
| `name` | VARCHAR | Customer name |
| `email` | VARCHAR, unique | Login email |
| `password_hash` | VARCHAR | Secure password hash |
| `created_at` | TIMESTAMP | Account creation time |

### Table 2: `events`

| Column | Type | Description |
|---|---|---|
| `id` | BIGINT, primary key | Unique event ID |
| `name` | VARCHAR | Event name |
| `venue` | VARCHAR | Venue name |
| `starts_at` | TIMESTAMP | Event start time |
| `status` | VARCHAR | Draft, published, or cancelled |

### Table 3: `seats`

Each seat belongs to one event.

| Column | Type | Description |
|---|---|---|
| `id` | BIGINT, primary key | Unique seat ID |
| `event_id` | BIGINT, foreign key | References `events.id` |
| `seat_label` | VARCHAR | Seat identifier, such as A12 |
| `price` | DECIMAL | Ticket price |
| `status` | VARCHAR | Available, held, or sold |
| `held_by_order_id` | BIGINT, nullable | References `orders.id` |
| `hold_expires_at` | TIMESTAMP, nullable | Expiration time for the hold |

Add a unique constraint on `(event_id, seat_label)` so an event cannot contain duplicate seat labels.

### Table 4: `orders`

| Column | Type | Description |
|---|---|---|
| `id` | BIGINT, primary key | Unique order ID |
| `user_id` | BIGINT, foreign key | References `users.id` |
| `status` | VARCHAR | Pending, paid, cancelled, or expired |
| `total_amount` | DECIMAL | Total order price |
| `idempotency_key` | VARCHAR, unique | Prevents duplicate order creation |
| `created_at` | TIMESTAMP | Order creation time |

### Table 5: `order_items`

This table connects orders to seats and records the price agreed upon at checkout.

| Column | Type | Description |
|---|---|---|
| `id` | BIGINT, primary key | Unique order-item ID |
| `order_id` | BIGINT, foreign key | References `orders.id` |
| `seat_id` | BIGINT, foreign key | References `seats.id` |
| `unit_price` | DECIMAL | Price at purchase time |

For this design, a seat can appear in only one active or completed purchase. A suitable database constraint or equivalent transaction-safe reservation design must enforce that rule; historical cancelled attempts should not permanently prevent a seat from being purchased again.

### Table 6: `payments`

| Column | Type | Description |
|---|---|---|
| `id` | BIGINT, primary key | Unique payment ID |
| `order_id` | BIGINT, foreign key | References `orders.id` |
| `provider_reference` | VARCHAR, unique | Payment provider transaction reference |
| `amount` | DECIMAL | Amount paid |
| `status` | VARCHAR | Pending, successful, or failed |
| `created_at` | TIMESTAMP | Payment creation time |

### Relationships

- One user can have many orders.
- One event can have many seats.
- One order can have many order items.
- Each order item refers to one seat.
- One order can have one or more payment attempts, depending on the payment policy.
- Each payment belongs to one order.

The foreign keys protect referential integrity. Unique constraints prevent duplicate emails, duplicate event seat labels, and duplicate idempotency keys.

## 5. Preventing Double-Booking

The most important rule is that **a seat can have only one valid owner at a time**.

Checking availability in the frontend is not enough. Two customers might see the same seat as available before either submits a request. Therefore, the database must enforce ownership.

### Step 1: Begin a transaction

When a user requests a seat hold, the server starts a database transaction.

### Step 2: Lock and check the requested seats

The server selects the requested seat rows using a row-level lock, such as `SELECT ... FOR UPDATE`, in a consistent order.

It checks that every seat is available or has a hold that has expired.

### Step 3: Reserve the seats atomically

The server changes all requested seats to `held`, records the hold owner and expiration time, and creates the corresponding order or hold record within the same transaction.

### Step 4: Commit or roll back

If every seat can be reserved, the server commits the transaction. If any seat is unavailable, it rolls back the transaction and tells the customer that the seats are no longer available.

### Step 5: Complete payment

The customer pays before the hold expires. After the payment provider confirms the payment, the server uses another transaction to verify that the order and hold are still valid, marks the order as paid, and marks the seats as sold.

The payment callback must be verified and processed idempotently. If the payment succeeds after a hold has expired and the seats have been reassigned, the system must not sell those seats twice; it should follow a defined recovery process, such as refunding the payment.

### Step 6: Expire unused holds

A background worker finds expired holds and releases their seats. It must verify that the hold still belongs to the same order before changing the seat back to available.

### Why this works

Imagine two customers try to reserve seat A12 simultaneously.

- Customer 1 locks A12 and reserves it.
- Customer 2 must wait for the lock or receives a conflict after checking the updated state.
- After Customer 1's transaction commits, Customer 2 sees that A12 is held and cannot reserve it.

Row-level locks, transactions, and appropriate database constraints make the database the final authority. The frontend only displays the latest known availability.

## 6. Architecture Diagram and Explanation

```text
             Customers / Browsers
                      |
                      v
              CDN and WAF
       (static files, protection)
                      |
                      v
             Load Balancer
                      |
                      v
              API Application
        (authentication, validation)
                      |
           +----------+----------+
           |          |          |
           v          v          v
       Event API   Queue /    Order and
       and Cache   Waiting    Seat-Hold
                    Room       Service
                                 |
                                 v
                         PostgreSQL Database
                         (transactions, locks,
                          constraints, records)
                                 |
                    +------------+------------+
                    |                         |
                    v                         v
             Background Workers        Payment Provider
             (expire holds,            (external payment
              reconcile orders)         processing)
                    |                         |
                    +------------+------------+
                                 |
                                 v
                       Verified Payment Webhook
```

### Component explanations

**1. Customers and browsers**

Users browse events, select seats, enter the waiting room, and complete checkout.

**2. CDN and Web Application Firewall (WAF)**

The CDN serves static assets such as images, CSS, and JavaScript from locations closer to users. The WAF helps filter malicious traffic. Neither should be trusted to enforce seat ownership.

**3. Load balancer**

Distributes requests across multiple application instances so one server does not handle all incoming traffic.

**4. API application**

Authenticates users, validates inputs, enforces rate limits, and exposes event, seat, order, and ticket endpoints.

**5. Event API and cache**

Frequently requested event details can be cached to reduce database reads. Seat availability is more sensitive and must be revalidated against the authoritative database before a hold is confirmed.

**6. Queue and waiting room**

During the popular sale, the waiting room limits how many customers enter the ticketing flow at once. It can use a fair, timestamp-based queue policy, subject to documented rules and anti-bot controls.

**7. Order and seat-hold service**

Coordinates seat reservations and checkout using database transactions and constraints. This service is responsible for preventing double-booking.

**8. PostgreSQL database**

Stores users, events, seats, orders, order items, and payments. Transactions, row locks, foreign keys, and unique constraints preserve correctness.

**9. Payment provider**

Processes payments without requiring TicketHub to store raw card details. Payment confirmation is handled through verified webhooks and idempotent processing.

**10. Background workers**

Release expired holds, reconcile payment status, retry safe background operations, and help recover from interrupted workflows.

### How the architecture survives a big sale

- The waiting room controls the rate at which users enter the checkout system.
- The load balancer and multiple application instances distribute incoming requests.
- The CDN and cache reduce repeated reads for static content and event details.
- The database remains the source of truth for seat ownership.
- Rate limits and bounded queues protect the database from excessive concurrent work.
- Monitoring and load testing help identify bottlenecks before a major concert sale.
- Background workers process hold expiration and payment reconciliation without blocking ordinary browsing requests.

Scaling the application servers horizontally helps handle more requests, but it does not automatically increase database transaction capacity. Database performance and lock contention must be tested under realistic concurrent purchase attempts.

## 7. Trade-Offs

### Trade-off 1: Strong consistency vs. performance

Using database transactions and row-level locks prevents double-booking, but competing requests for the same seats may wait and increase response times.

**Decision:** Correctness takes priority over accepting a potentially conflicting purchase. I would keep seat-reservation transactions short, lock only the required rows, and use a waiting room to reduce contention.

### Trade-off 2: Fairness vs. immediate access

A virtual waiting room adds waiting time and makes the purchase flow more complex. However, allowing all 200,000 users to access checkout simultaneously could overwhelm the system and favor clients with faster or more aggressive request patterns.

**Decision:** Use a transparent, controlled queue with clear rules and rate limits. This improves stability and fairness, although customers may have to wait even when some seats remain available.

### Trade-off 3: Caching vs. fresh seat availability

Caching improves speed and reduces database load, but cached seat information can become outdated during a sale.

**Decision:** Cache event descriptions and static content, but confirm seat availability in the database when placing a hold. A seat shown as available in the interface is never a guarantee that it can still be reserved.

## Conclusion

TicketHub must support ordinary browsing while protecting the system during a high-demand concert sale. The design combines a scalable application architecture, a fair waiting room, and a relational database with transactions and constraints. The most important principle is that every successful seat reservation must be confirmed atomically by the database, and payment must be reconciled safely before a ticket is issued.