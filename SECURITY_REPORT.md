# TechSync 2026 - Security & Architecture Report

## Architecture Overview
The **Tech Gadget Suggestor (TechSync 2026)** is implemented as a modern React application utilizing Vite, Tailwind CSS, and standard web technologies.

- **Frontend:** Hosted securely on GitHub Pages as static assets to eliminate traditional server-side attack vectors. Data feeds are dynamically sourced via API requests to the database backend.
- **Backend Storage:** Firebase Firestore.
- **Automation Pipeline:** A custom Node.js execution script (`scripts/updateInventory.js`) performs routine bulk upserts to the Firestore database. This action runs dynamically within an encrypted GitHub Actions CI/CD environment securely utilizing `FIREBASE_SERVICE_ACCOUNT` credentials without exposing them to the Web.

## Applied Security Controls

### 1. Code Review & SAST (Static Application Security Testing)
- **CodeQL (Advanced SAST):** Activated by `.github/workflows/security.yml` to automatically trace data flows across the Typescript architecture. Analyzes semantic vulnerabilities inside the codebase. Any discovered flaws (e.g. cross-site-scripting possibilities, insecure dependencies) will appear in your GitHub Security Tab.
- **Linting & Secure Practices:** Strict checking with Oxlint (the fast rust-based linter utilized in Vite setups) blocks insecure code paradigms prior to any deploy run.

### 2. DAST (Dynamic Application Security Testing)
- The pipeline utilizes **OWASP ZAP** (Zed Attack Proxy).
- **Process:** During the security workflow, a temporary production server replicates the GitHub Pages environment (`npm run build && npx serve -s dist -l 3000`). ZAP runs an active baseline scan across the domain, simulating attacks and recording responses.
- **Report Delivery:** ZAP compiles the output as `report_html.html` which is uploaded as an artifact named **ZAP-DAST-Report**. You can download this attached run report directly from the *GitHub Actions tab* for full vulnerability classification. 

### 3. CI/CD & Secret Management
To prevent secret leakage:
- Frontend Firebase parameters (Public Keys, Project Id) which are safely exposed in client contexts use GitHub Action standard repo secrets (`VITE_FIREBASE_API_KEY`, etc.) allowing deterministic injection only at build time.
- Backend automation secrets (`FIREBASE_SERVICE_ACCOUNT`) are passed dynamically to isolated Runner Jobs preventing them from entering the final Page deployment. 

## Next Steps for the Principal Owner:

1. Setup your remote GitHub repo and push these contents.
2. In your repo settings, go to **Settings > Secrets and Variables > Actions** and populate:
   - `VITE_FIREBASE_API_KEY` 
   - `VITE_FIREBASE_PROJECT_ID`
   - `FIREBASE_SERVICE_ACCOUNT` (Required for the `updateInventory` Node.js CRON job)
3. Navigate to **Actions** in GitHub after a push to view real time SAST & DAST analysis!
