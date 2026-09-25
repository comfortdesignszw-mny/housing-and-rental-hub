# Security Specification & Test Cases

## 1. Data Invariants
1. **User Identity & Roles (RBAC)**: Users can only write their own profile (`request.auth.uid == userId`). Users cannot escalate their own role or tamper with `role` during updates without admin privileges. Admin status is determined by document existence in `/admins/$(request.auth.uid)`.
2. **Property Ownership**: Only verified landlords, property managers, or admins can create or update properties. `landlordId` must match `request.auth.uid` on creation and cannot be changed on update.
3. **Application Security**: Rental applications can only be created by the applicant (`applicantId == request.auth.uid`). Only the assigned landlord or admin can approve or reject the application.
4. **Encrypted Messaging Privacy**: Chat messages can only be read by participants (`request.auth.uid == senderId || request.auth.uid == recipientId`). Messages can only be created by `senderId == request.auth.uid`. No blanket reads allowed.
5. **Admin Access**: Bootstrap admin email `comfort.designszw@gmail.com` and records in `/admins/{uid}` have administrative oversight over users, properties, and applications.
6. **Denial of Wallet Protection**: All string fields must have bounded `.size() <= MAX` constraints. Unbounded lists are forbidden.
7. **Temporal Integrity**: New records cannot forge timestamps in the far future or past.
8. **Catch-All Default Deny**: Any unmatched paths are strictly denied.

## 2. The Dirty Dozen Payloads (Designed to Fail)
1. **Identity Spoofing in User Profile**: An attacker attempts to create a user document with someone else's UID (`id != auth.uid`).
2. **Privilege Escalation on Signup**: An attacker attempts to self-assign `role: "admin"` directly in `users/{uid}` without admin document or authorized bootstrap email.
3. **Ghost Field Injection (Shadow Update)**: An attacker adds `isAdmin: true` or `shadowBypass: true` during profile update.
4. **Cross-Tenant Property Hijacking**: User A tries to edit or delete Property B where `landlordId` belongs to User B.
5. **Message Eavesdropping (Blanket Read)**: Attacker queries messages where they are neither `senderId` nor `recipientId`.
6. **Message Sender Impersonation**: Attacker attempts to post a message with `senderId` set to a landlord's ID.
7. **Application State Tampering**: An applicant attempts to set their own application status to `approved`.
8. **Resource Exhaustion Attack (Payload Bomb)**: An attacker attempts to post a message with 2MB content string.
9. **Lease Tampering by Unauthorized User**: Non-landlord user attempts to modify rent amount or lease dates.
10. **Admin Record Forgery**: Non-admin attempts to create a record in `/admins/{attackerUid}`.
11. **Maintenance Ticket Injection**: Random user without tenancy attempts to modify maintenance records of another property.
12. **Unverified Email Write**: Unauthenticated or unverified actor attempts to write to `/properties`.
