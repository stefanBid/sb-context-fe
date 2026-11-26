# Stack blocks

The steps of the `build` job after `Checkout code`. Same shape on every stack: setup of the toolchain with its cache, an install locked on the lockfile, one command per step named after what it checks.

## Node

The template (`workflows/build-check.yml`) has the npm block. Use only the scripts that exist in `package.json`, with their exact name (`typecheck`, `type-check`, `build`, `generate`, …); never `--if-present`, which hides a renamed script.

Toolchain version from a project file: `node-version-file: '.nvmrc'` (or `.node-version`, `.tool-versions`, or `package.json` when it has `engines.node` / `volta`). None of them → ask which version, and suggest adding `.nvmrc`.

| Lockfile | Package manager | Setup | Install | Run |
|---|---|---|---|---|
| `package-lock.json` | npm | `actions/setup-node@v5` with `cache: 'npm'` | `npm ci` | `npm run <script>` |
| `pnpm-lock.yaml` | pnpm | `pnpm/action-setup@v4` **before** `setup-node`, then `cache: 'pnpm'` | `pnpm install --frozen-lockfile` | `pnpm run <script>` |
| `yarn.lock` | yarn | `setup-node` with `cache: 'yarn'` (Yarn berry: `corepack enable` first) | `yarn install --immutable` | `yarn <script>` |

Nuxt: `nuxt prepare` usually runs in `postinstall`; if the project has no `postinstall`, the type check needs it first (`npx nuxi prepare` step, named `Prepare Nuxt`). A Vue + Vite library: the build is what produces `dist/`, keep it last.

Long independent commands (e2e tests, Storybook build): **ask** whether they go in a separate job parallel to `build`, with `needs: changes` and the same `if: needs.changes.outputs.code == 'true'`. The new job name is a status check too: ask whether it becomes required.

## Maven

```yaml
      # Install JDK <version> (matches java.version in pom.xml)
      - name: Setup JDK <version>
        uses: actions/setup-java@v5
        with:
          java-version: '<version>'
          distribution: 'temurin'
          cache: 'maven'

      # verify = surefire (unit tests) + failsafe (*IT, integration tests)
      - name: Build and test with Maven
        run: mvn -B clean verify
```

With the Maven wrapper use `./mvnw`. Integration tests on Testcontainers need no DB service: `ubuntu-latest` already has Docker (write it in a comment).

## Gradle

```yaml
      - name: Setup JDK <version>
        uses: actions/setup-java@v5
        with:
          java-version: '<version>'
          distribution: 'temurin'
          cache: 'gradle'

      - name: Build and test with Gradle
        run: ./gradlew build --no-daemon
```

## Docker image

Only when the repo has a `Dockerfile` that goes to production. A job next to `build` in `build-check.yml`, not after it:

```yaml
  # Builds the production image from the Dockerfile without pushing it anywhere: a broken Dockerfile, a path
  # missing from the build context (.dockerignore) or a renamed artifact fails the PR instead of the deploy.
  # Runs next to `build`, not after it: the Dockerfile builds the project on its own.
  docker-image:
    needs: changes
    if: needs.changes.outputs.code == 'true'
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v5

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      # Layers cached in the GitHub Actions cache: the dependency layer is reused until the build file changes.
      - name: Build the Docker image
        uses: docker/build-push-action@v6
        with:
          context: .
          push: false
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

## Paths filter

The `code` filter of the `changes` job excludes only `**/*.md`, `LICENSE` and `.claude/**`. Add folders that **certainly** do not affect build and tests (`postman/**`, `docs/**` when the docs are not compiled: a VitePress or Storybook docs site is compiled). Never exclude `.github/**`, the build files or the `Dockerfile`.
