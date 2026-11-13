terraform {
  required_version = ">= 1.6"

  required_providers {
    aws    = { source = "hashicorp/aws", version = "~> 5.70" }
    random = { source = "hashicorp/random", version = "~> 3.6" }
    helm   = { source = "hashicorp/helm", version = "~> 2.15" }
  }

  # Remote, encrypted, locked state (create the bucket once, then uncomment).
  # backend "s3" {
  #   bucket       = "campusfind-terraform-state"
  #   key          = "aws/terraform.tfstate"
  #   region       = "us-east-1"
  #   encrypt      = true
  #   use_lockfile = true
  # }
}
