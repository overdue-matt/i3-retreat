# Cookie.fun API 1.0 - Documentation

## Overview

The ProjectsV3 section of the Cookie.fun API provides comprehensive data about crypto projects, Twitter accounts, mindshare metrics, and social media analytics. These endpoints enable users to retrieve detailed information about projects, accounts, and their performance metrics in the crypto space.

## Base URL

All endpoints are relative to the base API URL.

## Authentication

All API requests require authentication using one of the following headers:

- `x-api-key`: Your API key for standard access

## Common Responses

All API responses follow a standard format:

```json
{
  "ok": { /* Response data if successful */ },
  "success": true, /* Boolean indicating success */
  "error": { /* Error details if unsuccessful */ }
}
```

Error details include:

- `errorType`: Category of error
- `errorMessage`: Human-readable error description
- `errorData`: Additional error context (if applicable)

---

# Endpoints

## Sectors

### Get All Sectors

Retrieves all available sectors in the system.

```
GET /v3/sectors
```

#### Response

Returns a list of sectors with their details:

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier for the sector |
| name | string | Display name of the sector |
| slug | string | URL-friendly identifier for the sector |
| description | string | Detailed description of the sector |

#### Example Request

```
GET /v3/sectors
```

---

## Twitter Accounts

### Get Account

Retrieves detailed information about a Twitter account by username or user ID.

```
POST /v3/account
```

#### Request Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| username | string | One of username or userId must be provided | Twitter username (without @) |
| userId | string | One of username or userId must be provided | Twitter user ID |

#### Example Request

```json
{
  "username": "elonmusk"
}
```

#### Response

Returns comprehensive account information including:

- Basic account details (username, display name, profile image, etc.)
- Follower and following counts
- Engagement metrics for various time periods (7 days, 30 days, 90 days)
- Smart metrics and mindshare data
- Account verification status

---

### Get Smart Followers of an Account

Retrieves the top smart followers for a given Twitter account.

```
POST /v3/account/smart-followers
```

#### Request Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| username | string | One of username or userId must be provided | Twitter username (without @) |
| userId | string | One of username or userId must be provided | Twitter user ID |

#### Example Request

```json
{
  "username": "blknoiz06"
}
```

#### Response

Returns a list of the most influential followers of the specified account, with details about each follower.

---

### Get Account Feed

Retrieves a Twitter account's feed with various filtering options.

```
POST /v3/account/feed
```

#### Request Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| username | string | One of username or userId must be provided | Twitter username (without @) |
| userId | string | One of username or userId must be provided | Twitter user ID |
| startDate | datetime | No | Start date for the feed range |
| endDate | datetime | No | End date for the feed range |
| type | enum | No | Tweet type filter: "Original", "Reply", or "Quote" |
| hasMedia | boolean | No | Filter for tweets with media |
| sortBy | enum | No | Sort by: "CreatedDate" or "Impressions" |
| sortOrder | enum | No | Sort order: "Ascending" or "Descending" |

#### Example Request

```json
{
  "username": "elonmusk",
  "startDate": "2023-01-01T00:00:00Z",
  "endDate": "2023-01-31T23:59:59Z",
  "type": "Original",
  "hasMedia": true,
  "sortBy": "Impressions",
  "sortOrder": "Descending"
}
```

#### Limitations

- Results are limited to 20 items per request
- The time range between StartDate and EndDate cannot exceed 180 days

#### Response

Returns a paginated list of tweets from the account's feed, including engagement metrics for each tweet.

---

### Search Twitter Accounts by Tweet Content

Searches for Twitter accounts that authored tweets matching specific search criteria.

```
POST /v3/account/query
```

#### Request Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| searchQuery | string | Yes | Search term to match in tweets |
| type | enum | No | Tweet type filter: "Original", "Reply", or "Quote" |
| startDate | datetime | No | Start date for the search range |
| endDate | datetime | No | End date for the search range |
| sortBy | enum | No | Sort by: "SmartEngagementPoints", "Impressions", or "MatchingTweetsCount" |
| sortOrder | enum | No | Sort order: "Ascending" or "Descending" |

#### Example Request

```json
{
  "searchQuery": "crypto",
  "type": "Original",
  "startDate": "2023-01-01T00:00:00Z",
  "endDate": "2023-12-31T23:59:59Z",
  "sortBy": "MatchingTweetsCount",
  "sortOrder": "Descending"
}
```

#### Limitations

- Results are limited to 20 items per request
- The time range between StartDate and EndDate cannot exceed 180 days

#### Response

Returns a paginated list of Twitter accounts that authored tweets matching the search criteria, along with relevant metrics.

---

### Get Account Mindshare Graph

Retrieves mindshare data over time for a Twitter account.

```
POST /v3/account/mindshare-graph
```

#### Request Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| username | string | One of username or userId must be provided | Twitter username (without @) |
| userId | string | One of username or userId must be provided | Twitter user ID |
| startDate | datetime | No | Start date for the graph range |
| endDate | datetime | No | End date for the graph range |
| granulation | enum | Yes | Time granularity: "_1Hour" or "_24Hours" |
| projectSlug | string | No | Specific project context for mindshare |

#### Example Request

```json
{
  "username": "elonmusk",
  "startDate": "2023-01-01T00:00:00Z",
  "endDate": "2023-01-31T23:59:59Z",
  "granulation": "_24Hours",
  "projectSlug": "bitcoin"
}
```

#### Limitations

- The time range between StartDate and EndDate cannot exceed 180 days

#### Response

Returns time-series data of mindshare metrics for the specified account, with each data point containing a date and value.

---

### Get Account Mindshare Leaderboard

Retrieves a leaderboard of Twitter accounts ranked by mindshare.

```
POST /v3/account/mindshare-leaderboard
```

#### Request Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| mindshareTimeframe | enum | Yes | Timeframe for mindshare calculation: "_7Days", "_14Days", or "_30Days" |
| projectSlug | string | No | Filter for accounts related to a specific project |
| sortBy | enum | No | Sort by: "Mindshare" or "MindshareDelta" |
| sortOrder | enum | No | Sort order: "Ascending" or "Descending" |

#### Example Request

```json
{
  "mindshareTimeframe": "_30Days",
  "projectSlug": "bitcoin",
  "sortBy": "Mindshare",
  "sortOrder": "Descending"
}
```

#### Limitations

- Results are limited to 20 items per request

#### Response

Returns a ranked list of Twitter accounts based on mindshare metrics, including mindshare values and deltas.

---

## Projects

### Get Project Details

Retrieves detailed information about a specific crypto project.

```
POST /v3/project
```

#### Request Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| slug | string | One of slug or contractAddress must be provided | Project slug identifier |
| contractAddress | string | One of slug or contractAddress must be provided | Contract address of the project |

#### Example Request

```json
{
  "slug": "bitcoin"
}
```

#### Response

Returns comprehensive project information including:

- Basic details (name, slug, symbol)
- Contract addresses across different chains
- Twitter usernames associated with the project
- Market data (market cap, volume)
- Sector classifications

---

### Search Projects

Searches for projects based on a query string.

```
POST /v3/project/search
```

#### Request Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | No | Search term (min 2 characters if provided) |
| page | integer | Yes | Page number (minimum 1) |
| limit | integer | Yes | Results per page (between 1 and 100) |

#### Example Request

```json
{
  "query": "bitcoin",
  "page": 1,
  "limit": 20
}
```

#### Response

Returns a paginated list of projects matching the search criteria.

---

### Get Project Mindshare Graph

Retrieves mindshare data over time for a specific project.

```
POST /v3/project/mindshare-graph
```

#### Request Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| projectSlug | string | Yes | Project slug identifier |
| startDate | datetime | No | Start date for the graph range |
| endDate | datetime | No | End date for the graph range |
| granulation | enum | Yes | Time granularity: "_1Hour" or "_24Hours" |
| sectorSlug | string | No | Sector for normalizing mindshare values |

#### Example Request

```json
{
  "projectSlug": "bitcoin",
  "startDate": "2023-01-01T00:00:00Z",
  "endDate": "2023-01-31T23:59:59Z",
  "granulation": "_24Hours"
}
```

#### Example Request with Sector Normalization

```json
{
  "projectSlug": "bitcoin",
  "startDate": "2023-01-01T00:00:00Z",
  "endDate": "2023-01-31T23:59:59Z",
  "granulation": "_24Hours",
  "sectorSlug": "defi"
}
```

#### Limitations

- The time range between StartDate and EndDate cannot exceed 180 days
- If sectorSlug is provided, the project must belong to that sector

#### Response

Returns time-series data of mindshare metrics for the specified project, with each data point containing a date and value.

---

### Get Project Mindshare Leaderboard

Retrieves a leaderboard of projects ranked by mindshare.

```
POST /v3/project/mindshare-leaderboard
```

#### Request Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| mindshareTimeframe | enum | Yes | Timeframe for mindshare calculation: "_24Hours", "_3Days", "_7Days", "_14Days", or "_30Days" |
| sectorSlug | string | No | Filter for projects in a specific sector and normalize mindshare within that sector |
| sortBy | enum | No | Sort by: "Mindshare" or "MindshareDelta" |
| sortOrder | enum | No | Sort order: "Ascending" or "Descending" |

#### Example Request

```json
{
  "mindshareTimeframe": "_30Days",
  "sortBy": "Mindshare",
  "sortOrder": "Descending"
}
```

#### Example Request with Sector Filter

```json
{
  "mindshareTimeframe": "_30Days",
  "sortBy": "Mindshare",
  "sortOrder": "Descending",
  "sectorSlug": "defi"
}
```

#### Limitations

- Results are limited to 20 items per request

#### Response

Returns a ranked list of projects based on mindshare metrics, including mindshare values and deltas.

---

## Metrics

### Get Twitter Metrics

Retrieves Twitter metrics data over time for projects or search queries.

```
POST /v3/metrics
```

#### Request Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| metricType | enum | Yes | Type of metric: "Engagements", "Impressions", "SmartEngagements", "EngagementRate", or "Mentions" |
| granulation | enum | Yes | Time granularity: "_1Hour" or "_24Hours" |
| projectSlug | string | At least one of projectSlug or searchQuery must be provided | Project slug identifier |
| searchQuery | string | At least one of projectSlug or searchQuery must be provided | Search term for tweets |
| startDate | datetime | No | Start date for the metrics range |
| endDate | datetime | No | End date for the metrics range |

#### Example Request with Project

```json
{
  "metricType": "Engagements",
  "granulation": "_24Hours",
  "projectSlug": "bitcoin",
  "startDate": "2023-01-01T00:00:00Z",
  "endDate": "2023-01-31T23:59:59Z"
}
```

#### Example Request with Search Query

```json
{
  "metricType": "Impressions",
  "granulation": "_24Hours",
  "searchQuery": "bitcoin OR $BTC",
  "startDate": "2023-01-01T00:00:00Z",
  "endDate": "2023-01-31T23:59:59Z"
}
```

#### Example Request with Both (AND condition)

```json
{
  "metricType": "SmartEngagements",
  "granulation": "_24Hours",
  "projectSlug": "bitcoin",
  "searchQuery": "halving",
  "startDate": "2023-01-01T00:00:00Z",
  "endDate": "2023-01-31T23:59:59Z"
}
```

#### Limitations

- The time range between StartDate and EndDate cannot exceed 180 days
- At least one of projectSlug or searchQuery must be provided

#### Response

Returns time-series data of the specified metric, with each data point containing a date and value.

---

## Feed

### Search Tweets

Searches for tweets based on various criteria.

```
POST /v3/feed/query
```

#### Request Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| searchQuery | string | At least one of searchQuery or projectSlug must be provided | Search term for tweets |
| projectSlug | string | At least one of searchQuery or projectSlug must be provided | Project slug identifier |
| hasMedia | boolean | No | Filter for tweets with media |
| language | string | No | Filter by Twitter language code (e.g., "en", "es") |
| type | enum | No | Tweet type filter: "Original", "Reply", or "Quote" |
| startDate | datetime | No | Start date for the search range |
| endDate | datetime | No | End date for the search range |
| sortBy | enum | No | Sort by: "CreatedAt", "LikesCount", or "RetweetsCount" |
| sortOrder | enum | No | Sort order: "Ascending" or "Descending" |

#### Example Request with Search Query

```json
{
  "searchQuery": "bitcoin",
  "hasMedia": true,
  "language": "en",
  "type": "Original",
  "startDate": "2023-01-01T00:00:00Z",
  "endDate": "2023-01-31T23:59:59Z",
  "sortBy": "CreatedAt",
  "sortOrder": "Descending"
}
```

#### Example Request with Project

```json
{
  "projectSlug": "bitcoin",
  "hasMedia": true,
  "language": "en",
  "startDate": "2023-01-01T00:00:00Z",
  "endDate": "2023-01-31T23:59:59Z"
}
```

#### Example Request with Both (AND condition)

```json
{
  "searchQuery": "halving",
  "projectSlug": "bitcoin",
  "type": "Original",
  "startDate": "2023-01-01T00:00:00Z",
  "endDate": "2023-01-31T23:59:59Z"
}
```

#### Limitations

- Results are limited to 20 items per request
- The time range between StartDate and EndDate cannot exceed 180 days
- At least one of searchQuery or projectSlug must be provided

#### Response

Returns a paginated list of tweets matching the search criteria, including author information and engagement metrics.

---

# Data Models

## Common Models

### GraphEntry

```json
{
  "date": "2023-01-01T00:00:00Z",
  "value": 0.75
}
```

### SimpleGraph

```json
{
  "entries": [
    { "date": "2023-01-01T00:00:00Z", "value": 0.75 },
    { "date": "2023-01-02T00:00:00Z", "value": 0.80 }
  ]
}
```

### ChainContract

```json
{
  "chain": 1,
  "contractAddress": "0x1234567890abcdef1234567890abcdef12345678"
}
```

### Sector

```json
{
  "id": "123",
  "name": "Decentralized Finance",
  "slug": "defi",
  "description": "Financial services on blockchain without central intermediaries"
}
```

---

## Rate Limiting

API requests are subject to rate limiting based on your API key's configuration. When you exceed your rate limit, the API will return a `429 Too Many Requests` status code.

## Best Practices

1. **Minimize API Calls**: Cache responses when appropriate to reduce API usage.
2. **Use Specific Filters**: Narrow your search parameters to get more relevant results.
3. **Time Range Optimization**: Keep your date ranges as narrow as possible for faster responses.
4. **Error Handling**: Implement proper error handling to manage API failures gracefully.

## Support

For additional assistance or to report issues, please contact our support team.
