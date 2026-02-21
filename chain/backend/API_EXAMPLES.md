# INOMAD Backend API Examples

This file contains example API requests for testing the backend.

## Authentication

All requests require the `x-seat-id` header.

Test credentials from seed data:
- `SEAT_001` - Leader role, has ALTAN balance of 1000
- `SEAT_002` - Citizen role, has ALTAN balance of 500
- `SEAT_003` - Citizen role, has ALTAN balance of 100

---

## 1. Khural (Governance) API

### Create Arbad Group

```bash
curl -X POST http://localhost:3001/api/khural \
  -H "Content-Type: application/json" \
  -H "x-seat-id: SEAT_001" \
  -d '{
    "level": "ARBAD",
    "name": "Northern Arbad Unit"
  }'
```

**Response:**
```json
{
  "id": "uuid",
  "level": "ARBAD",
  "name": "Northern Arbad Unit",
  "seats": [
    {
      "id": "uuid",
      "index": 0,
      "isLeaderSeat": true,
      "occupantUserId": null,
      "occupant": null
    },
    // ... 9 more seats
  ]
}
```

### Get Group (Circle-Ready Format)

```bash
curl http://localhost:3001/api/khural/{group-id} \
  -H "x-seat-id: SEAT_001"
```

### Apply for Empty Seat

```bash
curl -X POST http://localhost:3001/api/khural/{group-id}/apply-seat \
  -H "Content-Type: application/json" \
  -H "x-seat-id: SEAT_002" \
  -d '{
    "seatIndex": 5
  }'
```

### Assign Seat (Leader Only)

```bash
curl -X POST http://localhost:3001/api/khural/{group-id}/assign-seat \
  -H "Content-Type: application/json" \
  -H "x-seat-id: SEAT_001" \
  -d '{
    "seatIndex": 3,
    "userId": "user-uuid"
  }'
```

### List All Groups

```bash
# All groups
curl http://localhost:3001/api/khural \
  -H "x-seat-id: SEAT_001"

# Filter by level
curl "http://localhost:3001/api/khural?level=ARBAD" \
  -H "x-seat-id: SEAT_001"
```

---

## 2. Guilds API

### Create Profession Guild

```bash
curl -X POST http://localhost:3001/api/guilds \
  -H "Content-Type: application/json" \
  -H "x-seat-id: SEAT_001" \
  -d '{
    "type": "PROFESSION",
    "name": "Engineers Guild",
    "description": "Professional association of engineers",
    "professionId": "{profession-uuid}"
  }'
```

### Create Clan

```bash
curl -X POST http://localhost:3001/api/guilds \
  -H "Content-Type: application/json" \
  -H "x-seat-id: SEAT_001" \
  -d '{
    "type": "CLAN",
    "name": "Borjigin Clan",
    "description": "Traditional kinship group"
  }'
```

### List Guilds

```bash
# All guilds
curl http://localhost:3001/api/guilds \
  -H "x-seat-id: SEAT_001"

# Filter by type
curl "http://localhost:3001/api/guilds?type=PROFESSION" \
  -H "x-seat-id: SEAT_001"
```

### Get Guild Details

```bash
curl http://localhost:3001/api/guilds/{guild-id} \
  -H "x-seat-id: SEAT_001"
```

### Join Guild

```bash
curl -X POST http://localhost:3001/api/guilds/{guild-id}/join \
  -H "x-seat-id: SEAT_002"
```

### Get Guild Members

```bash
curl http://localhost:3001/api/guilds/{guild-id}/members \
  -H "x-seat-id: SEAT_001"
```

---

## 3. Professions API

### Create Profession

```bash
curl -X POST http://localhost:3001/api/professions \
  -H "Content-Type: application/json" \
  -H "x-seat-id: SEAT_001" \
  -d '{
    "name": "Engineer",
    "description": "Designs and builds technical systems"
  }'
```

### List All Professions

```bash
curl http://localhost:3001/api/professions \
  -H "x-seat-id: SEAT_001"
```

### Get Profession Details

```bash
curl http://localhost:3001/api/professions/{profession-id} \
  -H "x-seat-id: SEAT_001"
```

---

## 4. Tasks API

### Create Task

```bash
curl -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -H "x-seat-id: SEAT_001" \
  -d '{
    "title": "Build irrigation system",
    "description": "Construct water distribution for agricultural zone",
    "professionId": "{profession-uuid}",
    "rewardAltan": 500,
    "postedByGuildId": "{guild-uuid}"
  }'
```

### List Tasks

```bash
# All tasks
curl http://localhost:3001/api/tasks \
  -H "x-seat-id: SEAT_001"

# Filter by status
curl "http://localhost:3001/api/tasks?status=OPEN" \
  -H "x-seat-id: SEAT_001"

# Filter by profession
curl "http://localhost:3001/api/tasks?professionId={uuid}" \
  -H "x-seat-id: SEAT_001"

# Combined filters
curl "http://localhost:3001/api/tasks?status=OPEN&professionId={uuid}" \
  -H "x-seat-id: SEAT_001"
```

### Get Task Details

```bash
curl http://localhost:3001/api/tasks/{task-id} \
  -H "x-seat-id: SEAT_001"
```

### Accept Task

```bash
curl -X POST http://localhost:3001/api/tasks/{task-id}/accept \
  -H "x-seat-id: SEAT_002"
```

### Complete Task (Triggers ALTAN Reward)

```bash
curl -X POST http://localhost:3001/api/tasks/{task-id}/complete \
  -H "x-seat-id: SEAT_002"
```

---

## 5. ALTAN API

### Get My Balance

```bash
curl http://localhost:3001/api/altan/balance \
  -H "x-seat-id: SEAT_001"
```

**Response:**
```json
1000
```

### Get User Balance

```bash
curl http://localhost:3001/api/altan/balance/{user-id} \
  -H "x-seat-id: SEAT_001"
```

### Mint ALTAN (Test Only)

```bash
curl -X POST http://localhost:3001/api/altan/mint \
  -H "Content-Type: application/json" \
  -H "x-seat-id: SEAT_001" \
  -d '{
    "amount": 1000
  }'
```

### Sync from Blockchain (Placeholder)

```bash
curl -X POST http://localhost:3001/api/altan/sync \
  -H "x-seat-id: SEAT_001"
```

---

## Complete Workflow Example

### Scenario: Create a task, accept it, and complete it

```bash
# 1. Create a task (as SEAT_001 - Leader)
TASK_ID=$(curl -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -H "x-seat-id: SEAT_001" \
  -d '{
    "title": "Test Task",
    "description": "This is a test task",
    "rewardAltan": 100
  }' | jq -r '.id')

echo "Created task: $TASK_ID"

# 2. Check SEAT_002 balance before
curl http://localhost:3001/api/altan/balance \
  -H "x-seat-id: SEAT_002"

# 3. Accept task (as SEAT_002 - Citizen)
curl -X POST http://localhost:3001/api/tasks/$TASK_ID/accept \
  -H "x-seat-id: SEAT_002"

# 4. Complete task (as SEAT_002)
curl -X POST http://localhost:3001/api/tasks/$TASK_ID/complete \
  -H "x-seat-id: SEAT_002"

# 5. Check SEAT_002 balance after (should be +100)
curl http://localhost:3001/api/altan/balance \
  -H "x-seat-id: SEAT_002"
```

---

## Error Responses

### Missing Authentication

```bash
curl http://localhost:3001/api/khural
```

**Response (401):**
```json
{
  "statusCode": 401,
  "message": "Missing x-seat-id header"
}
```

### Invalid Seat ID

```bash
curl http://localhost:3001/api/khural \
  -H "x-seat-id: INVALID_SEAT"
```

**Response (401):**
```json
{
  "statusCode": 401,
  "message": "Invalid seat ID"
}
```

### Forbidden Action

```bash
# Try to assign seat as non-leader
curl -X POST http://localhost:3001/api/khural/{group-id}/assign-seat \
  -H "Content-Type: application/json" \
  -H "x-seat-id: SEAT_002" \
  -d '{
    "seatIndex": 3,
    "userId": "user-uuid"
  }'
```

**Response (403):**
```json
{
  "statusCode": 403,
  "message": "Only group leader can assign seats"
}
```

---

## Testing with Postman

Import these examples into Postman:

1. Create a new collection
2. Set collection variable `BASE_URL` = `http://localhost:3001/api`
3. Set collection variable `SEAT_ID` = `SEAT_001`
4. Add header `x-seat-id: {{SEAT_ID}}` to collection
5. Import individual requests from above

---

## Notes

- All timestamps are in ISO 8601 format
- UUIDs are generated by the database
- Decimal values (ALTAN) are returned as strings to preserve precision
- Circle seats are always returned in order (index 0-9)
