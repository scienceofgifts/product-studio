# Security Specification for Firebase Firestore Rules

## 1. Data Invariants
- Each user can ONLY access and modify documents within their own user path: `/users/{userId}/...` where `{userId} == request.auth.uid`.
- Unauthenticated requests are strictly denied across all paths.
- All documents written must conform to structural type boundaries.
- Cross-user data reads or writes are strictly blocked.
- Deletions or tombstone updates for writing examples can only be performed by the owning user.

## 2. Dirty Dozen Test Scenarios
1. Anonymous write to `/users/user123/settings/business_brain` -> Expected: PERMISSION_DENIED.
2. Authenticated `userA` reading `/users/userB/settings/business_brain` -> Expected: PERMISSION_DENIED.
3. Authenticated `userA` writing to `/users/userB/settings/writing_guidelines` -> Expected: PERMISSION_DENIED.
4. Authenticated `userA` deleting `/users/userB/writing_examples/ex1` -> Expected: PERMISSION_DENIED.
5. Authenticated `userA` writing valid `business_brain` document to `/users/userA/settings/business_brain` -> Expected: ALLOWED.
6. Authenticated `userA` writing valid `writing_guidelines` document to `/users/userA/settings/writing_guidelines` -> Expected: ALLOWED.
7. Authenticated `userA` writing valid example to `/users/userA/writing_examples/ex1` -> Expected: ALLOWED.
8. Authenticated `userA` listing examples at `/users/userA/writing_examples` -> Expected: ALLOWED.
9. Authenticated `userA` listing examples at `/users/userB/writing_examples` -> Expected: PERMISSION_DENIED.
10. Attempting to write arbitrary ghost keys outside allowed schema on `business_brain` -> Expected: PERMISSION_DENIED.
11. Injecting invalid document ID with special characters into `/users/userA/writing_examples/{exampleId}` -> Expected: PERMISSION_DENIED.
12. Attempting to access non-existent top-level collections like `/products` or `/admin` -> Expected: PERMISSION_DENIED.
