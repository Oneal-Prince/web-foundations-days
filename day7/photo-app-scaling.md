# SnapShare: Photo App Scaling Plan

## 1. Assumptions

SnapShare is a photo-sharing application where users upload photos and scroll through a feed containing photos from people they follow.

The following assumptions are used for the calculations:

* Registered users: 10 million.
* Daily active users (DAU): 10% of registered users.
* Each daily active user uploads 1 photo per day.
* Each daily active user views 50 feed pages per day.
* Average original photo size: 2 MB.
* Average thumbnail size: 50 KB.
* A day has 86,400 seconds.
* A year has 365 days.
* Traffic is distributed across the day for average-rate calculations.
* Peak feed traffic is five times the average rate.
* Every uploaded photo produces one thumbnail.
* Storage estimates exclude replicas, backups, database records, logs, and temporary files.
* For simplicity, MB and GB use decimal units: 1 MB = 1,000 KB and 1 GB = 1,000 MB.
* All daily active users are assumed to upload one photo and view 50 feed pages each day.

### Daily Active Users

Daily active users are 10% of the 10 million registered users.

DAU = 10,000,000 × 0.10

**DAU = 1,000,000 users**

Therefore, SnapShare has an estimated one million daily active users.

## 2. Traffic and Storage Estimates

### A. Photo Uploads per Day

Each daily active user uploads one photo per day.

Daily uploads = 1,000,000 × 1

**Daily uploads = 1,000,000 photos**

### B. Uploads per Second

Average uploads per second = Daily uploads ÷ Seconds per day

= 1,000,000 ÷ 86,400

**Average uploads ≈ 11.57 photos per second**

This is an average; actual upload traffic may be higher during busy periods.

### C. Feed Views per Day

Each daily active user views 50 feed pages per day.

Daily feed views = 1,000,000 × 50

**Daily feed views = 50,000,000 pages**

### D. Average Feed Views per Second

Average feed views per second = Daily feed views ÷ Seconds per day

= 50,000,000 ÷ 86,400

**Average feed views ≈ 578.70 pages per second**

### E. Peak Feed Views per Second

Peak traffic is estimated at five times the average rate.

Peak feed views per second = 578.70 × 5

**Peak feed views ≈ 2,894 pages per second**

The architecture should therefore be designed to handle approximately 2,900 feed-page requests per second during peak periods, with additional headroom for unexpected spikes.

### F. Photo Storage per Day

Original photo storage:

1,000,000 × 2 MB = 2,000,000 MB = 2,000 GB = 2 TB per day.

Thumbnail storage:

1,000,000 × 50 KB = 50,000,000 KB = 50 GB per day.

Total new photo storage:

2,000 GB + 50 GB = 2,050 GB.

**Total new photo storage ≈ 2.05 TB per day.**

### G. Photo Storage per Year

Original photos:

2 TB × 365 = 730 TB per year.

Thumbnails:

50 GB × 365 = 18,250 GB = 18.25 TB per year.

Total annual storage:

730 TB + 18.25 TB = 748.25 TB.

**Total photo storage ≈ 748.25 TB per year**, or approximately 0.75 PB.

This estimate assumes every photo and thumbnail is retained for the entire year and excludes replication, backups, and storage overhead.

## 3. Is SnapShare Read-Heavy or Write-Heavy?

SnapShare is a **read-heavy system** because users view 50 feed pages per day but upload only one photo per day.

The application processes approximately 50 million feed-page views per day compared with one million photo uploads. Feed-page views are 50 times as frequent as uploads.

This means the design should prioritize fast feed loading and efficient delivery of frequently requested content. A CDN can serve cached photos and thumbnails close to users, while an application cache can reduce repeated database queries. Database read replicas can handle read traffic without sending every query to the primary database. Upload processing should still be reliable, but read performance is the main scaling priority.

## 4. Why Photos Should Not Be Stored in the Database

Original photos and thumbnails should be stored in object storage rather than directly inside the relational database.

Photo files are large binary objects, and storing them in database rows would increase database size, backup time, storage costs, and the amount of data that must be transferred during database operations. It would also mix large media delivery workloads with queries for structured data such as users, follows, and photo metadata.

Object storage is designed for durable, scalable file storage. The database should store metadata such as the photo ID, owner ID, object-storage key, upload time, and thumbnail key. The application can then retrieve the metadata from the database and use a CDN to deliver the actual images efficiently.

## 5. Architecture Diagram

```text
                    +----------------------+
                    |      Users / Apps    |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    |         CDN          |
                    | Cached photos/feed   |
                    | images and thumbnails|
                    +----+-------------+---+
                         |             |
               Cache hit |             | Cache miss / API request
                         |             v
                         |    +----------------------+
                         |    |    Load Balancer     |
                         |    +----------+-----------+
                         |               |
                         |               v
                         |    +----------------------+
                         |    |    App Servers       |
                         |    | Feed API / Upload API|
                         |    +---+--------+---------+
                         |        |        |
                         |        |        +------------------+
                         |        |                           |
                         |        v                           v
                         |  +-------------+          +----------------+
                         |  |    Cache    |          |  Message Queue |
                         |  | Feed / data |          | Thumbnail jobs |
                         |  +------+------+          +-------+--------+
                         |         |                         |
                         |         v                         v
                         |  +-------------+          +----------------+
                         |  |  Database   |          | Thumbnail      |
                         |  | Primary DB  |          | Worker         |
                         |  +------+------+          +-------+--------+
                         |         |                         |
                         |         v                         v
                         |  +-------------+          +----------------+
                         |  | Read Replica|          | Object Storage |
                         |  | Read queries|          | Originals and  |
                         |  +-------------+          | thumbnails     |
                         |                            +-------+--------+
                         |                                    |
                         +------------------------------------+
                                      Images served through CDN
```

**Note:** The CDN primarily serves cached image assets. Feed API requests and other dynamic requests go through the load balancer to the application servers. The queue and worker handle thumbnail generation asynchronously, and generated thumbnails are stored in object storage for delivery through the CDN.

## 6. Components and the Problems They Solve

* **Users / Apps:** Allow users to upload photos, follow others, and browse their feeds.
* **CDN (Content Delivery Network):** Delivers cached photos and thumbnails from locations closer to users, reducing latency and origin-server traffic.
* **Load Balancer:** Distributes incoming API requests across multiple application servers to prevent one server from becoming overloaded.
* **App Servers:** Run the application logic for authentication, photo uploads, feed generation, follow relationships, and metadata operations.
* **Cache:** Stores frequently requested feed data and metadata in memory to reduce database queries and improve response times.
* **Primary Database:** Stores structured data such as users, follows, photo metadata, and feed-related records while handling writes.
* **Read Replica:** Serves read queries separately from the primary database, increasing read capacity; replication may introduce a short delay before new data appears.
* **Object Storage:** Stores original photos and generated thumbnails durably without placing large image files inside database rows.
* **Message Queue:** Holds thumbnail-generation jobs so photo uploads do not have to wait for image processing to finish.
* **Thumbnail Worker:** Consumes queued jobs, resizes original photos into thumbnails, and saves the generated files to object storage.

## 7. Step-by-Step Photo Upload Flow

1. **User selects a photo:** The user chooses a photo in the SnapShare application and starts the upload.

2. **Upload request reaches the application:** The client sends an authenticated upload request to the application through the load balancer.

3. **Validate the request:** An app server checks the user's permissions, file type, file size, and other upload rules.

4. **Store the original photo:** The original image is uploaded to object storage, using a unique object key to identify it.

5. **Save photo metadata:** The app server records the photo ID, owner ID, object key, upload time, and processing status in the primary database.

6. **Queue a thumbnail job:** The app server publishes a message containing the photo ID and object key to the message queue.

7. **Confirm the upload:** Once the original photo and metadata are safely stored and the thumbnail job is durably queued, the application can confirm the upload without waiting for thumbnail generation.

8. **Process the thumbnail:** A thumbnail worker takes a job from the queue, reads the original image from object storage, and creates a smaller 50 KB thumbnail.

9. **Store the thumbnail:** The worker uploads the thumbnail to object storage and updates the photo's processing status and thumbnail key in the database.

10. **Deliver the photo:** When users view the photo, the application provides the relevant image URL or CDN path. The CDN serves cached images where available and retrieves missing images from object storage through the configured origin path.

11. **Handle failures:** If thumbnail generation fails, the job can be retried. Failed jobs should eventually be recorded for investigation rather than being silently discarded.

## 8. Trade-Offs

### Trade-Off 1: CDN Caching vs. Freshness

A CDN makes photo delivery faster and reduces load on object storage. However, cached content may remain available after an image is changed or deleted. SnapShare should use versioned object keys or suitable cache-control settings and have a strategy for invalidating sensitive or outdated content.

### Trade-Off 2: Read Replicas vs. Data Consistency

Read replicas increase read capacity and reduce the load on the primary database. However, replication is often asynchronous, so recently uploaded photos or updated metadata might not appear immediately in every feed. The application may need to read recent changes from the primary database or use cache invalidation for important updates.

### Trade-Off 3: Asynchronous Thumbnails vs. Immediate Availability

A message queue and background worker let users finish uploading without waiting for thumbnail processing. However, the thumbnail might not be ready immediately after upload, and the system must handle delayed jobs, retries, and failures. The feed can display a placeholder until the thumbnail becomes available.

### Trade-Off 4: Object Storage vs. Operational Complexity

Object storage scales well for large photo collections and separates media delivery from database workloads. However, the application must manage object permissions, metadata references, orphaned files, deletion workflows, and storage lifecycle policies.

## 9. Conclusion

SnapShare has an estimated one million daily active users, approximately 11.57 uploads per second, 578.70 average feed-page views per second, and a peak of approximately 2,894 feed-page views per second. It needs approximately 748.25 TB of additional photo and thumbnail storage per year under the stated assumptions.

Because the system is read-heavy, the design prioritizes CDN delivery, caching, and database read replicas. Object storage handles photo files, while a message queue and background worker generate thumbnails asynchronously. This architecture separates media storage, application processing, and database workloads so that each can scale independently.
