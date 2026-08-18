# ClassSync — AWS Cloud Hosting & Infrastructure Guide

This guide provides complete instructions for deploying ClassSync **100% on AWS Cloud** using automated Infrastructure-as-Code (**Terraform**) and CI/CD via **GitHub Actions**.

---

## Architecture Overview

```mermaid
flowchart TB
    subgraph Internet["Internet / External Clients"]
        Users["Web Browsers & Mobile PWAs"]
    end

    subgraph AWS["AWS Cloud Infrastructure"]
        subgraph Edge["Edge & Load Balancing"]
            CF["CloudFront CDN / Route 53 (Optional Domain)"]
            ALB["Application Load Balancer (ALB)"]
        end

        subgraph VPC["AWS VPC (10.0.0.0/16)"]
            subgraph PublicSubnets["Public Subnets (2 AZs)"]
                NAT["NAT Gateway (EIP)"]
            end

            subgraph PrivateSubnets["Private Subnets (2 AZs)"]
                subgraph ECSCluster["ECS Cluster (Fargate)"]
                    WebApp["Next.js 16 Web App\n(Port 3000)"]
                    WorkerService["Hono Worker Service\n(Port 3001)"]
                end

                CloudMap["AWS CloudMap Private DNS\n(worker.classsync.local:3001)"]

                subgraph DatabaseTier["Managed Data Tier"]
                    RDS[("RDS PostgreSQL 16\n(Multi-AZ)")]
                    Redis[("ElastiCache Redis 7\n(Rate Limit & Cache)")]
                end
            end
        end

        subgraph AWSServices["Managed AWS Cloud Services"]
            S3["AWS S3 Upload Bucket\n(Encrypted & Presigned URLs)"]
            Rekognition["AWS Rekognition\n(Cloud Face Verification)"]
            SecretsManager["AWS Secrets Manager\n(App Credentials & Keys)"]
            CloudWatch["AWS CloudWatch\n(Logs & Metrics)"]
            ECR["AWS ECR\n(Web & Worker Repos)"]
        end
    end

    Users --> CF --> ALB
    ALB --> WebApp
    WebApp -- "Internal HTTP Call" --> CloudMap --> WorkerService
    WebApp & WorkerService --> RDS
    WebApp & WorkerService --> Redis
    WebApp & WorkerService --> S3
    WebApp & WorkerService --> Rekognition
    ECSCluster --> SecretsManager
    ECSCluster --> CloudWatch
```

---

## Infrastructure Services Summary

| Component | AWS Managed Service | Purpose & Details |
| :--- | :--- | :--- |
| **Database** | AWS RDS PostgreSQL 16 | Fully managed relational DB in private subnets with automated backups, encryption, and optional Multi-AZ failover. |
| **Cache** | AWS ElastiCache for Redis 7 | Managed Redis cluster in private subnets for web app rate limiting and idempotency. |
| **Storage** | AWS S3 | Encrypted object storage bucket for documents and student/staff attendance photo verification. |
| **Face AI** | AWS Rekognition | Serverless cloud face verification and vector comparison engine. |
| **Web App** | AWS ECS Fargate | Containerized Next.js 16 standalone server running behind Application Load Balancer in private subnets. |
| **Worker Service** | AWS ECS Fargate | Standalone Hono worker service container running in private subnets, registered in private Service Discovery (`worker.classsync.local`). |
| **Container Registry** | AWS ECR | ECR repositories (`classsync-web`, `classsync-worker`) with container vulnerability scanning. |
| **Networking** | AWS VPC | Private VPC across 2 Availability Zones with public/private subnets, Internet Gateway, and NAT Gateway. |
| **Secrets & Security** | AWS Secrets Manager & IAM | Centralized secret management and strict IAM roles (Task Execution Role & App Task Role). |
| **Logs & Monitoring** | AWS CloudWatch | Container log aggregation and performance insights with 30-day log retention. |
| **CI/CD Pipeline** | GitHub Actions | Automated linting, testing, Docker image build/push to ECR, DB migration execution, and zero-downtime rolling deployment. |

---

## Prerequisites

Before deploying to AWS, ensure you have:

1. **AWS Account & IAM User / Credentials** with permissions for VPC, RDS, ElastiCache, S3, ECR, ECS, IAM, and Secrets Manager.
2. **AWS CLI v2** installed and configured (`aws configure`).
3. **Terraform >= 1.5.0** installed (`terraform -v`).
4. **Docker Desktop** installed and running (`docker -v`).
5. **Node.js 20+** installed locally.

---

## Quick Start Deployment

### 1. Configure Infrastructure Variables

Copy the example configuration file:

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform/terraform.tfvars` and set secure values:

```hcl
aws_region            = "ap-south-1"
environment           = "production"
app_name              = "classsync"

db_username           = "classsync_admin"
db_password           = "YourSuperSecurePassword123!"

auth_secret           = "Generate32ByteSecretForAuthJs"
encryption_key        = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
worker_secret         = "GenerateRandomWorkerSecret"
```

### 2. Provision Infrastructure with Terraform

Initialize and apply Terraform:

```bash
cd terraform
terraform init
terraform apply -auto-approve
```

Terraform will create all VPC subnets, RDS PostgreSQL database, ElastiCache Redis, S3 bucket, ECR repos, IAM roles, ALB, and ECS Fargate services.

*Outputs from `terraform apply` will display the Application Load Balancer DNS name and ECR Repository URLs.*

### 3. Deploy Application Containers

Run the PowerShell deployment helper script from the root directory:

```powershell
.\scripts\deploy-aws.ps1 -Action deploy
```

This script will:
1. Log in to AWS ECR.
2. Build the Next.js Web App container (`Dockerfile`) and Worker container (`worker/Dockerfile`).
3. Push both images to Amazon ECR.
4. Trigger an ECS Fargate zero-downtime rolling update for both Web and Worker services.

---

## Automated CI/CD Pipeline (GitHub Actions)

The repository includes a ready-to-use GitHub Actions workflow located at `.github/workflows/deploy-aws.yml`.

### Setting up GitHub Secrets

Add the following secrets in your GitHub repository (**Settings → Secrets and variables → Actions**):

| Secret Name | Description | Example / Source |
| :--- | :--- | :--- |
| `AWS_ACCESS_KEY_ID` | AWS IAM User Access Key ID | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM User Secret Access Key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_REGION` | AWS Region | `ap-south-1` |
| `ECS_CLUSTER_NAME` | ECS Cluster Name | `classsync-production-cluster` |
| `ECS_WEB_SERVICE` | Next.js Web App Service Name | `classsync-production-web` |
| `ECS_WORKER_SERVICE` | Worker Service Name | `classsync-production-worker` |
| `ECS_MIGRATION_TASK` | One-off DB Migration Task Def | `classsync-production-migration` |
| `ECR_WEB_REPO` | Web ECR Repository Name | `classsync-web` |
| `ECR_WORKER_REPO` | Worker ECR Repository Name | `classsync-worker` |

### How the CI/CD Pipeline Works

On every push to the `main` branch (or manual trigger):

1. **Test Job**: Runs `npm run lint` and `npm test` (Vitest).
2. **Build & Push Job**:
   - Builds production Docker images for Next.js Web App and Hono Worker.
   - Tags and pushes images to Amazon ECR.
3. **Database Migration Job**:
   - Executes an AWS ECS Fargate one-off migration task that runs `npx prisma migrate deploy` and applies PostgreSQL Row-Level Security (`001_enable_rls.sql`).
4. **Deploy Job**:
   - Updates ECS Web and Worker services with `--force-new-deployment`.
   - Waits until health checks pass and services reach steady state.

---

## Production Database Seeding & Setup

To seed initial demo accounts or setup initial data in production RDS PostgreSQL:

Run an ECS task command or connect via AWS SSM / Bastion / temporary container:

```bash
# Obtain Database URL from AWS Secrets Manager
DATABASE_URL=$(aws secretsmanager get-secret-value --secret-id classsync/production/secrets --query SecretString --output text | jq -r .DATABASE_URL)

# Run seed locally or via one-off runner
DATABASE_URL=$DATABASE_URL npx prisma db seed
```

---

## Custom Domain & SSL (Optional)

1. **Request SSL Certificate in AWS ACM**:
   Create a public certificate in AWS Certificate Manager for `app.yourdomain.com` in your deployment region.

2. **Update Terraform configuration**:
   Set `domain_name` and `certificate_arn` in `terraform/terraform.tfvars`:

   ```hcl
   domain_name     = "app.yourdomain.com"
   certificate_arn = "arn:aws:acm:ap-south-1:123456789012:certificate/abc-12345"
   ```

3. **Point Route 53 or DNS CNAME**:
   Create a CNAME record pointing `app.yourdomain.com` to the Application Load Balancer DNS name (`alb_dns_name`).

---

## Monitoring & Operations

- **Logs**: View live application logs in AWS CloudWatch under log groups `/ecs/classsync-production-web` and `/ecs/classsync-production-worker`.
- **Health Check**: Access `http://<ALB-DNS-NAME>/api/health` to monitor web application health.
- **Worker Health**: Web app checks worker health at `http://worker.classsync.local:3001/health` internally via AWS CloudMap private service discovery.
