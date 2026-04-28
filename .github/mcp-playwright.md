Playwright MCP server notes

Goal: Provide a repeatable way to expose the built app at http://localhost:8080 (or another port) so remote agents or CI can run Playwright E2E tests against it.

Recommended local server (dev & CI parity)

1) Build the app

  npm ci
  npm run build

2) Quick local server (dev & testing)

  # serve the "www" folder on port 8080 (start foreground)
  npx serve -p 8080 www

  # or use python (bundled on CI runners)
  python3 -m http.server 8080 --directory www

3) Running Playwright against the server

  # in a separate terminal (or CI step)
  npx playwright test

4) Background / detached server (Linux)

  # detach with nohup
  nohup npx serve -p 8080 www &

  # or use tmux/screen
  tmux new -d -s e2e-server "npx serve -p 8080 www"

5) Docker example (serve built files)

  # Dockerfile (minimal)
  # FROM nginx:stable-alpine
  # COPY www/ /usr/share/nginx/html
  # EXPOSE 8080
  # CMD ["nginx", "-g", "daemon off;"]

  # Build and run
  docker build -t pantry-ai-static .
  docker run -p 8080:80 pantry-ai-static

6) Notes for MCP server configuration

- Playwright's config (playwright.config.js) already includes a webServer entry that will start a simple static server when running tests locally; in CI the webServer will run the command specified (see playwright.config.js). If you prefer to manage the server yourself, set PLAYWRIGHT_WEB_SERVER_CMD to "" and start the server externally.
- Ensure the server port (default 8080) is reachable from the environment running tests.
- For automated MCP servers (cloud runners) prefer using the GitHub Actions workflow (.github/workflows/playwright-e2e.yml) created in this repo. It installs dependencies, builds assets, installs browsers and runs the Playwright CI command.

If you'd like, I can also add a reusable workflow or a Docker Compose file to start a local MCP stack (web server + Playwright runner). Which further automation do you prefer?