# S3 Streaming Setup

This project now supports online movie playback from S3 through backend-signed URLs.

## 1. S3 Object

Upload each movie as one playable browser file when possible:

```text
movies/the-flash/the-flash.mp4
movies/mystery/mystery-night.mp4
```

In Admin or Staff movie edit form:

```text
Stream provider: S3
S3 object key: movies/the-flash/the-flash.mp4
```

If `streamKey` is a full `https://...` URL, backend returns it directly. If it is an S3 object key, backend signs a temporary private URL.

## 2. Backend Environment

Set these variables for the backend:

```env
STREAMING_S3_BUCKET=your-bucket-name
STREAMING_S3_REGION=ap-southeast-1
STREAMING_S3_ACCESS_KEY=your-iam-access-key
STREAMING_S3_SECRET_KEY=your-iam-secret-key
STREAMING_URL_TTL_SECONDS=300
```

For local development, put them in `BE2/.env`. For Railway, put them in the backend service variables.

## 3. IAM Permission

The IAM user only needs read access to movie objects:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::your-bucket-name/movies/*"
    }
  ]
}
```

## 4. S3 CORS

Configure CORS on the S3 bucket so the browser can load video from signed URLs:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": [
      "http://localhost:5173",
      "https://your-frontend-domain.vercel.app"
    ],
    "ExposeHeaders": ["Accept-Ranges", "Content-Length", "Content-Range", "ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

## 5. Access Rules

`GET /api/member/movies/{movieId}/stream`

Members get a stream URL only when:

- They are logged in.
- They have a `CONFIRMED` booking for that movie.
- The current time is inside that booking's showtime window: `startTime <= now <= endTime`.

The pre-signed URL is short-lived. The default TTL is 300 seconds, so when it expires the frontend must call the backend again and the backend checks the booking plus showtime window again.

Staff/Admin can fetch for testing without a booking.

`GET /api/member/watch-parties/{roomId}/stream`

Watch party gets a stream URL only when the current user has paid and all room members are ready.

## 6. HLS Note

Private HLS (`.m3u8` with `.ts` or `.m4s` segments) needs either public segment access, CloudFront signed cookies, or a backend playlist proxy. A single pre-signed `.m3u8` URL is not enough because segment URLs inside the playlist also need authorization.

For the current implementation, MP4/WebM S3 objects are the simplest reliable setup.
