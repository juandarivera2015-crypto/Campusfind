variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (staging, production...)"
  type        = string
  default     = "production"
}

variable "name" {
  description = "Base name for all resources"
  type        = string
  default     = "campusfind"
}

variable "vpc_cidr" {
  type    = string
  default = "10.40.0.0/16"
}

variable "kubernetes_version" {
  type    = string
  default = "1.31"
}

variable "node_instance_types" {
  type    = list(string)
  default = ["t3.medium"]
}

variable "node_desired_size" {
  type    = number
  default = 2
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "db_multi_az" {
  description = "High availability for RDS (recommended in production)"
  type        = bool
  default     = false
}

variable "github_repository" {
  description = "owner/repo allowed to deploy through GitHub Actions OIDC"
  type        = string
}

variable "cluster_admin_arns" {
  description = "Extra IAM principals with cluster-admin access"
  type        = list(string)
  default     = []
}
