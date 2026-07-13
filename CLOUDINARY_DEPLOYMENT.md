# Cloudinary, Railway and Vercel setup

Community post images are uploaded by the Spring Boot backend using Cloudinary's authenticated API. The browser never receives `CLOUDINARY_API_SECRET`.

## 1. Cloudinary

Create or open a Cloudinary product environment and copy these values from **Settings > API Keys**:

- Cloud name
- API key
- API secret

The backend accepts JPEG, PNG and WebP images up to 8 MB. Images are stored under `thau-film/community` by default. The database stores only the secure Cloudinary URL and public ID. Replacing or deleting a post image also requests deletion of the old Cloudinary asset.

## 2. Railway backend variables

In the Railway backend service, open **Variables** and add:

```text
CLOUDINARY_CLOUD_NAME=<cloud-name>
CLOUDINARY_API_KEY=<api-key>
CLOUDINARY_API_SECRET=<api-secret>
CLOUDINARY_FOLDER=thau-film/community
FRONTEND_URL=https://<vercel-domain>
BACKEND_URL=https://<railway-domain>
CORS_ORIGINS=https://<vercel-domain>
```

Keep the existing database, JWT, payment and other service variables. Redeploy the backend after saving. The health check is `/actuator/health`.

## 3. Vercel frontend variable

In the Vercel project, open **Settings > Environment Variables** and set this for Production, Preview and Development as needed:

```text
VITE_API_URL=https://<railway-domain>
```

Do not put `CLOUDINARY_API_SECRET` or any backend credential in Vercel. Redeploy the frontend after changing `VITE_API_URL` because Vite embeds public environment variables at build time.
