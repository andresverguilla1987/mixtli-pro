# Next Steps Workflows (Notify + Smoke)

This pack adds two GitHub Actions:

## 1) `Demo Refresh Notify`
- **Trigger:** automatically after the workflow **"Demo Refresh (14:00 MX)"** completes.
- **What it does:** sends a Slack and/or Discord message with the result (success/failure).
- **Setup:**
  - In your repo: **Settings → Secrets and variables → Actions**
    - Secrets:
      - `SLACK_WEBHOOK_URL` *(optional)*
      - `DISCORD_WEBHOOK_URL` *(optional)*
    - Variables:
      - `DEMO_REFRESH_URL` *(optional, used only to display the URL in the message)*

## 2) `Demo Smoke`
- **Trigger:** manual (`Run workflow` from the Actions tab).
- **Inputs:**
  - `baseUrl` (default comes from `DEMO_BASE_URL` repo variable if present)
  - `authToken` *(optional)* for Bearer-auth endpoints
- **What it does:**
  - GET `${baseUrl}/salud` → expect 200
  - GET `${baseUrl}/` → expect 200 or 204
  - If repo var `DEMO_REFRESH_URL` is set, it also tries a POST to that URL.

---

### How to add these to your repo
1. Unzip at the repository root; it will create:
   - `.github/workflows/demo-refresh-notify.yml`
   - `.github/workflows/demo-smoke.yml`
   - `README-ACTIONS-NEXT.md` (this file)
2. Commit & push to `main`.
3. Configure any required secrets/variables (see above).

### Notes
- If your refresh endpoint requires GET instead of POST, edit the step in **Demo Smoke** accordingly.
- If your refresh workflow has a different name, update the `workflows: ["Demo Refresh (14:00 MX)"]` line in **Demo Refresh Notify**.
