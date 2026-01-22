
## How to Use

This section explains the standard workflow for setting up, updating, and running the production environment.

---

### 🟢 Initial Setup (First Time Only)

Run this once when deploying the project for the very first time.  
It prepares the environment, creates required folders, and initializes core services.

```bash
docker/scripts/prod/setup.sh
````

---

### 🔄 Update Everything

Use this whenever you pull new changes from the repository or want to refresh all services.

This step will update code, images, and dependencies.

```bash
docker/scripts/prod/update.sh
```

---

### 🚀 Build and Start

Build all Docker images and start the full production stack.

Run this after setup or update.

```bash
docker/scripts/prod/bootstrap.sh
```

---

## What Happens Automatically

When you run the above commands, the system will automatically:

* Pull the latest Docker images
* Build all required services
* Create and configure Docker networks
* Create and mount persistent volumes
* Run database migrations
* Apply database seeders (if configured)
* Start all containers in the correct dependency order
* Perform basic health checks

---

## Result

After completion:

* All services are running
* The database is up-to-date
* The environment is consistent and reproducible
* The system is ready for production use

This workflow guarantees a **stable, repeatable, and production-safe deployment process**.

```
