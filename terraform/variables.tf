variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Deployment environment (e.g. production, staging)"
  type        = string
  default     = "production"
}

variable "app_name" {
  description = "Name of the application"
  type        = string
  default     = "classsync"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24"]
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "RDS auto-scaling maximum storage in GB"
  type        = number
  default     = 100
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "classsync"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "classsync_admin"
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "redis_node_type" {
  description = "ElastiCache Redis node instance type"
  type        = string
  default     = "cache.t4g.micro"
}

variable "auth_secret" {
  description = "Auth.js secret key"
  type        = string
  sensitive   = true
}

variable "encryption_key" {
  description = "32-byte hex encryption key for tenant API keys"
  type        = string
  sensitive   = true
}

variable "worker_secret" {
  description = "Shared secret between web app and worker service"
  type        = string
  sensitive   = true
}

variable "domain_name" {
  description = "Custom domain name (optional, e.g. classsync.app)"
  type        = string
  default     = ""
}

variable "certificate_arn" {
  description = "ACM SSL Certificate ARN for custom domain on ALB (optional)"
  type        = string
  default     = ""
}

variable "vapid_public_key" {
  description = "Web Push VAPID Public Key"
  type        = string
  default     = ""
}

variable "vapid_private_key" {
  description = "Web Push VAPID Private Key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "vapid_subject" {
  description = "Web Push VAPID Subject"
  type        = string
  default     = "mailto:admin@classsync.app"
}

variable "razorpay_platform_key" {
  description = "Razorpay Platform Key (optional)"
  type        = string
  default     = ""
}

variable "google_maps_api_key" {
  description = "Google Maps API Key (optional)"
  type        = string
  default     = ""
}

variable "google_maps_map_id" {
  description = "Google Maps Map ID (optional)"
  type        = string
  default     = ""
}

variable "ecs_web_cpu" {
  description = "CPU units for Next.js Web ECS task (256 = 0.25 vCPU)"
  type        = number
  default     = 512
}

variable "ecs_web_memory" {
  description = "Memory for Next.js Web ECS task (MB)"
  type        = number
  default     = 1024
}

variable "ecs_worker_cpu" {
  description = "CPU units for Worker ECS task (256 = 0.25 vCPU)"
  type        = number
  default     = 512
}

variable "ecs_worker_memory" {
  description = "Memory for Worker ECS task (MB)"
  type        = number
  default     = 1024
}

variable "ecs_web_desired_count" {
  description = "Desired number of Next.js web tasks"
  type        = number
  default     = 2
}

variable "ecs_worker_desired_count" {
  description = "Desired number of worker tasks"
  type        = number
  default     = 1
}
