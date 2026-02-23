terraform {
  required_version = ">= 1.5"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
  backend "gcs" {
    bucket = "medichips-link-terraform-state"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  default = "medichips-new"
}

variable "region" {
  default = "asia-northeast3"
}

variable "environment" {
  default = "production"
}

# ==================== VPC ====================

resource "google_compute_network" "vpc" {
  name                    = "medichips-link-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "main" {
  name          = "medichips-link-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id
}

resource "google_vpc_access_connector" "connector" {
  name          = "link-vpc-connector"
  region        = var.region
  ip_cidr_range = "10.8.0.0/28"
  network       = google_compute_network.vpc.name
}

# ==================== Cloud SQL (PostgreSQL) ====================

resource "google_sql_database_instance" "postgres" {
  name             = "medichips-link-db"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier              = "db-custom-4-16384" # 4 vCPU, 16GB
    availability_type = "REGIONAL"          # HA

    backup_configuration {
      enabled                        = true
      start_time                     = "02:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
    }

    database_flags {
      name  = "max_connections"
      value = "200"
    }

    insights_config {
      query_insights_enabled = true
    }
  }

  deletion_protection = true
}

resource "google_sql_database" "main" {
  name     = "medichips_link"
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "app" {
  name     = "medichips_link_app"
  instance = google_sql_database_instance.postgres.name
  password = "CHANGE_ME_USE_SECRET_MANAGER"
}

# ==================== Redis (Memorystore) ====================

resource "google_redis_instance" "cache" {
  name           = "medichips-link-redis"
  tier           = "STANDARD_HA"
  memory_size_gb = 5
  region         = var.region
  redis_version  = "REDIS_7_0"

  authorized_network = google_compute_network.vpc.id

  redis_configs = {
    maxmemory-policy = "allkeys-lru"
  }
}

# ==================== GCS Buckets ====================

resource "google_storage_bucket" "media" {
  name          = "medichips-link-media"
  location      = var.region
  force_destroy = false
  storage_class = "STANDARD"

  cors {
    origin          = ["https://link.medichips.ai"]
    method          = ["GET", "PUT"]
    response_header = ["Content-Type"]
    max_age_seconds = 3600
  }
}

resource "google_storage_bucket" "uploads" {
  name          = "medichips-link-uploads"
  location      = var.region
  force_destroy = false
  storage_class = "STANDARD"

  lifecycle_rule {
    condition { age = 90 }
    action { type = "SetStorageClass" storage_class = "NEARLINE" }
  }
}

resource "google_storage_bucket" "certs" {
  name          = "medichips-link-certs"
  location      = var.region
  force_destroy = false
  storage_class = "STANDARD"
}

resource "google_storage_bucket" "backups" {
  name          = "medichips-link-backups"
  location      = var.region
  force_destroy = false
  storage_class = "NEARLINE"

  lifecycle_rule {
    condition { age = 90 }
    action { type = "Delete" }
  }
}

# ==================== Cloud CDN ====================

resource "google_compute_backend_bucket" "media_cdn" {
  name        = "medichips-link-media-cdn"
  bucket_name = google_storage_bucket.media.name
  enable_cdn  = true

  cdn_policy {
    cache_mode                   = "CACHE_ALL_STATIC"
    default_ttl                  = 86400
    max_ttl                      = 604800
    signed_url_cache_max_age_sec = 7200
  }
}

# ==================== Cloud Run - Web ====================

resource "google_cloud_run_v2_service" "web" {
  name     = "medichips-link-web"
  location = var.region

  template {
    scaling {
      min_instance_count = 1
      max_instance_count = 20
    }

    containers {
      image = "asia-northeast3-docker.pkg.dev/${var.project_id}/medichips-link/web:latest"

      resources {
        limits = {
          cpu    = "2"
          memory = "2Gi"
        }
      }

      startup_probe {
        http_get { path = "/api/v1/health" }
        initial_delay_seconds = 5
      }

      liveness_probe {
        http_get { path = "/api/v1/health" }
        period_seconds = 30
      }
    }

    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

# ==================== Cloud Run - API ====================

resource "google_cloud_run_v2_service" "api" {
  name     = "medichips-link-api"
  location = var.region

  template {
    scaling {
      min_instance_count = 2
      max_instance_count = 50
    }

    containers {
      image = "asia-northeast3-docker.pkg.dev/${var.project_id}/medichips-link/api:latest"

      resources {
        limits = {
          cpu    = "2"
          memory = "4Gi"
        }
      }

      startup_probe {
        http_get { path = "/api/v1/health" }
        initial_delay_seconds = 5
      }
    }

    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

# ==================== IAM ====================

resource "google_cloud_run_v2_service_iam_member" "web_public" {
  name     = google_cloud_run_v2_service.web.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "api_public" {
  name     = google_cloud_run_v2_service.api.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ==================== Artifact Registry ====================

resource "google_artifact_registry_repository" "docker" {
  location      = var.region
  repository_id = "medichips-link"
  format        = "DOCKER"
}

# ==================== Cloud Armor (WAF) ====================

resource "google_compute_security_policy" "waf" {
  name = "medichips-link-waf"

  rule {
    action   = "deny(403)"
    priority = 1000
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('sqli-v33-stable')"
      }
    }
    description = "Block SQL injection"
  }

  rule {
    action   = "deny(403)"
    priority = 1001
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('xss-v33-stable')"
      }
    }
    description = "Block XSS"
  }

  rule {
    action   = "throttle"
    priority = 2000
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      rate_limit_threshold {
        count        = 100
        interval_sec = 60
      }
    }
    description = "Rate limit 100 req/min per IP"
  }

  rule {
    action   = "allow"
    priority = 2147483647
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Default allow"
  }
}

# ==================== Outputs ====================

output "web_url" {
  value = google_cloud_run_v2_service.web.uri
}

output "api_url" {
  value = google_cloud_run_v2_service.api.uri
}

output "db_connection" {
  value     = google_sql_database_instance.postgres.connection_name
  sensitive = true
}

output "redis_host" {
  value = google_redis_instance.cache.host
}
