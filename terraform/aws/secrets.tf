# Secret management: values are generated here and stored in AWS Secrets Manager;
# the cluster reads them through External Secrets (IRSA). Keep the Terraform state encrypted.
resource "random_password" "db" {
  length           = 32
  special          = true
  override_special = "_-."
}

resource "random_password" "jwt" {
  length  = 64
  special = false
}

resource "random_password" "django" {
  length  = 64
  special = false
}

resource "aws_kms_key" "secrets" {
  description         = "${var.name} application secrets"
  enable_key_rotation = true
}

resource "aws_secretsmanager_secret" "app" {
  name                    = "${var.name}/app"
  description             = "CampusFind application secrets (DB password, JWT signing key, Django key)"
  kms_key_id              = aws_kms_key.secrets.arn
  recovery_window_in_days = var.environment == "production" ? 30 : 0
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id

  secret_string = jsonencode({
    DB_PASSWORD       = random_password.db.result
    JWT_SECRET        = random_password.jwt.result
    DJANGO_SECRET_KEY = random_password.django.result
  })
}

# IRSA role used by the External Secrets "SecretStore" service account
module "external_secrets_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 6.8"

  role_name                                          = "${var.name}-${var.environment}-external-secrets"
  attach_external_secrets_policy                     = true
  external_secrets_secrets_manager_arns              = [aws_secretsmanager_secret.app.arn]
  external_secrets_kms_key_arns                      = [aws_kms_key.secrets.arn]
  external_secrets_secrets_manager_create_permission = false

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["campusfind:external-secrets-campusfind"]
    }
  }
}
