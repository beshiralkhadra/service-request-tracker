# Requests feature

This feature owns service-request creation, role-filtered queries, assignment,
the request lifecycle State pattern, SLA policy, and immutable status history.

Code is organized by `domain`, `application`, `infrastructure`, and
`presentation`. The application service owns RBAC and ownership policies, the
State pattern owns exact transitions, and the Prisma repository atomically
updates requests with their audit events.
