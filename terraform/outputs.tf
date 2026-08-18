output "alb_dns_name" {
  description = "Public DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "ecr_web_repository_url" {
  description = "URL of the ECR repository for Next.js Web App"
  value       = aws_ecr_repository.web.repository_url
}

output "ecr_worker_repository_url" {
  description = "URL of the ECR repository for Worker service"
  value       = aws_ecr_repository.worker.repository_url
}

output "s3_bucket_name" {
  description = "Name of the created AWS S3 storage bucket"
  value       = aws_s3_bucket.uploads.bucket
}

output "rds_endpoint" {
  description = "RDS PostgreSQL database endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "elasticache_endpoint" {
  description = "ElastiCache Redis cluster primary endpoint"
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address
}

output "ecs_cluster_name" {
  description = "Name of the ECS Cluster"
  value       = aws_ecs_cluster.main.name
}

output "web_service_name" {
  description = "Name of the Web App ECS Service"
  value       = aws_ecs_service.web.name
}

output "worker_service_name" {
  description = "Name of the Worker ECS Service"
  value       = aws_ecs_service.worker.name
}

output "aws_region" {
  description = "Deployed AWS region"
  value       = var.aws_region
}
