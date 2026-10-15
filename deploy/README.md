# Mail deployment on Dokploy

This Compose file runs the fork's published container with PostgreSQL, Redis, MinIO, and an internal ntfy instance. GitHub Actions builds the application so the VPS does not need build-time memory.

## Dokploy configuration

Create a Mail project and a Docker Compose service. Use `deploy/docker-compose.yml` as the raw Compose source. Store all values in the service's Environment panel, not in Git.

Required variables:

- `MAIL_IMAGE`: an immutable commit tag, such as `ghcr.io/yegor-klymenchuk/mail:sha-0f8a016`
- `DB_PASSWORD`, `S3_PASSWORD`, `JWT_SECRET`: independent random secrets
- `AWS_SES_ACCESS_KEY_ID`, `AWS_SES_SECRET_ACCESS_KEY`: the restricted `mail-ses` user's key
- `API_DOMAIN`, `DASHBOARD_DOMAIN`, `LANDING_DOMAIN`, `WIKI_DOMAIN`, `ASSETS_DOMAIN`: bare hostnames
- `COOKIE_DOMAIN`: the common parent hostname belonging to this instance
- `DISABLE_SIGNUPS`: keep `true` after initial account setup

For the temporary deployment, use `mail-2-31-24-4.sslip.io` as the parent hostname. The API, dashboard, docs, and assets use the `api`, `app`, `docs`, and `assets` subdomains. This hostname resolves to the VPS without registrar DNS changes.

Add HTTPS domains in Dokploy using Let's Encrypt:

- Dashboard, API, and docs: service `mail`, container port `80`
- Assets: service `minio`, container port `9000`, path `/uploads`, without stripping the path

Do not expose PostgreSQL, Redis, the MinIO console, or ntfy through host ports. SMTP ports are not published in this initial deployment. Applications can send through the HTTPS API once SES access is ready.

The landing app is bundled upstream. Review its branding, pricing claims, and links before exposing it as this mail service's public website.

## Initial access and SES

Keep the initial signup route restricted to the owner's IP while creating the first account, then disable signups. Configure subsequent projects and sender domains through the mail dashboard. Each domain still needs its own DNS verification records.

The AWS account currently uses Frankfurt and remains in the SES sandbox. The Compose file caps sending at one message per second. The existing configuration sets are `plunk-tracking` and `plunk-no-tracking`. Subscribe the deployed HTTPS API's `/webhooks/sns` endpoint to `plunk-ses-events`, then verify SNS reports the subscription as confirmed.

Do not request production access until the public website, recipient practices, and bounce/complaint handling are confirmed. Adjust the rate cap only after AWS approves a higher quota.

## Validation and updates

Check the API `/health`, dashboard login, authenticated project access, upload delivery, container health, and the SNS subscription. Confirm the app cookie is scoped to this instance's parent hostname.

Every push to `next` builds commit-tagged images. Update `MAIL_IMAGE` to the successful build's tag and deploy through Dokploy. Automatic redeployment is not configured yet. The fork's upstream npm publishing and release automation are disabled to avoid publishing upstream packages unintentionally.

Before an update, back up PostgreSQL and uploaded assets. Retain the previous image tag. For an application rollback, restore `MAIL_IMAGE` and redeploy without deleting volumes. Database migrations may require a matching database backup, so check migration changes before downgrading. Configure off-server backups before storing production data.
