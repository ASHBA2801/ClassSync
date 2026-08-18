# S3 Bucket for ClassSync File Uploads
resource "aws_s3_bucket" "uploads" {
  bucket        = "${var.app_name}-${var.environment}-uploads-${random_id.suffix.hex}"
  force_destroy = false

  tags = {
    Name = "${var.app_name}-${var.environment}-uploads"
  }
}

# Bucket Server-Side Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block all public access by default (all uploads accessed via presigned URLs or S3 API)
resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CORS Configuration for direct browser uploads (presigned URLs)
resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "HEAD"]
    allowed_origins = ["*"] # In strict production, set to var.domain_name or ALB endpoint
    max_age_seconds = 3000
  }
}
