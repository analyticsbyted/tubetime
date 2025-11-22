# Phase 6 Enhancement Proposal: Automated Testing

**Submitted:** Nov 20, 2025
**Status:** Pending Team Review

### 1. Proposal

Now that the functional implementation of the transcription pipeline is complete, it is the ideal time to add a suite of automated tests. This was not part of the original Phase 6 plan, which focused on manual testing, but is proposed now as a valuable enhancement to ensure long-term quality, prevent regressions, and validate the complex logic before deployment.

### 2. Rationale

*   **Validate Complex Logic:** Automatically verify the state machine (caching, retries, failures) without extensive manual setup.
*   **Prevent Regressions:** Create a safety net that protects the transcription feature from being broken by future code changes.
*   **Increase Confidence:** Provide high confidence in the backend's robustness before beginning manual QA and deployment.

### 3. Recommended Test Plan

#### A. Unit Tests for `src/services/transcriptionService.js`

*   **Goal:** To test the service in isolation by mocking the `fetch` call to the external worker.
*   **Test Cases:**
    1.  **Success:** Verify that on a `200 OK` response, the service returns the correct JSON payload.
    2.  **Timeout:** Confirm that the service throws a `TranscriptionServiceError` with `retryable: true` when a request times out.
    3.  **Retryable API Errors:** Simulate `500` (Server Error) and `429` (Too Many Requests) responses and assert that the service throws an error with `retryable: true`.
    4.  **Permanent API Errors:** Simulate a `404` (Not Found) response and assert that the service throws an error with `retryable: false`.

#### B. Integration Tests for `app/api/transcription-worker/route.js`

*   **Goal:** To test the full API route logic, including database interactions, using a test database. The transcription service itself will be mocked.
*   **Test Cases:**
    1.  **Happy Path:** A pending queue item is correctly moved from `pending` -> `processing` -> `completed`, and a `Transcript` record is created in the database.
    2.  **Caching Logic:** A queue item for a video that already has a transcript is immediately moved to `completed` without calling the transcription service.
    3.  **Retry Logic:** A job that fails with a *retryable* error is correctly moved back to `pending`, and its `retryCount` is incremented.
    4.  **Failure Logic:** A job that exhausts its three retries is correctly moved to the `failed` state.
    5.  **Permanent Failure:** A job that fails with a *non-retryable* error is immediately moved to the `failed` state, with `retryCount` at 1.
    6.  **Security:** An unauthenticated request to the endpoint (missing or invalid secret) is rejected with a `401 Unauthorized` status.

### 4. Next Steps

Upon approval, the implementation will begin, starting with the creation of the test file for `src/services/transcriptionService.js`.
---

## Agent's Feedback & Refined Testing Strategy

Thank you for the excellent and detailed questions. This feedback is crucial for refining the test plan into an actionable strategy. Here is a summary of the confirmed approach based on your questions and my recommendations.

### 1. Database Strategy

*   **Decision:** We will use **Prisma Mocking** (Option A).
*   **Rationale:** This approach is faster, requires no setup, and is sufficient for testing the API route's business logic, as we can trust the Prisma client itself works.

### 2. Test Case Expansion

*   **Decision:** All suggested test cases will be included.
*   **Scope:**
    *   `getWorkerHealth()` function (timeout and error handling).
    *   `GET /api/transcription-worker` endpoint (health check and queue statistics).
    *   Specific tests for video duration validation (15-minute limit).
    *   Boundary tests for the `maxItems` parameter (1, 5, >5).
    *   Logic tests for the `queueItemId` parameter (single vs. batch processing).
    *   Edge case tests for handling an empty queue.

### 3. Test File Structure

*   **Decision:** The proposed file structure is approved.
*   **Paths:**
    *   `src/services/__tests__/transcriptionService.test.js`
    *   `app/api/transcription-worker/__tests__/route.test.js`

### 4. Environment Variables in Tests

*   **Decision:** We will mock the environment variables in our test setup.
*   **Action:** We will use test-specific values for `TRANSCRIPTION_WORKER_URL` and `TRANSCRIPTION_WORKER_SECRET` and include a specific test case to ensure the application throws an error if these variables are missing.

### 5. Prisma Mocking Approach

*   **Decision:** We will use a library like **`vitest-mock-extended`** to mock specific Prisma methods.
*   **Rationale:** This provides fine-grained control for each test, allowing us to simulate different database states (e.g., a transcript exists for the caching test, it returns `null` for a new transcription).

### 6. Error Message Assertions

*   **Decision:** We will assert both the error type/status code and the exact error message.
*   **Rationale:** This ensures technical correctness (correct error type) and a good user experience (clear, human-readable messages). We will prioritize asserting exact messages for errors that are surfaced to the user.

### Implementation Order

*   **Decision:** The proposed order is approved.
    1.  **Unit Tests** for `transcriptionService.js`.
    2.  **Integration Tests** for `/api/transcription-worker/route.js`.

---

The testing strategy is now finalized and robust. I am ready to begin implementation upon the team's final approval of this consolidated plan.
