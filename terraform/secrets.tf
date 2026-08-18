# AWS Secrets Manager Secret for Application Environment Variables
resource "aws_secretsmanager_secret" "app_secrets" {
  name                    = "${var.app_name}/${var.environment}/secrets"
  recovery_window_in_days = 0 # Instant deletion for clean terraform destroy during dev/testing

  tags = {
    Name = "${var.app_name}-${var.environment}-secrets"
  }
}

resource "aws_secretsmanager_secret_version" "app_secrets_val" {
  secret_id = aws_secretsmanager_secret.app_secrets.id

  secret_string = jsonencode({
    DATABASE_URL            = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.endpoint}/${var.db_name}"
    REDIS_URL               = "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:6379"
    AUTH_SECRET             = var.auth_secret
    ENCRYPTION_KEY          = var.encryption_key
    WORKER_SECRET           = var.worker_secret
    FACE_PROVIDER           = "aws"
    S3_BUCKET               = aws_s3_bucket.uploads.bucket
    AWS_REGION              = var.aws_region
    VAPID_PUBLIC_KEY        = var.vapid_public_key
    VAPID_PRIVATE_KEY       = var.vapid_private_key
    VAPID_SUBJECT           = var.vapid_subject
    RAZORPAY_PLATFORM_KEY   = var.razorpay_platform_key
  })
}
