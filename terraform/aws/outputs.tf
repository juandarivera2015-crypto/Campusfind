output "region" { value = var.region }
output "cluster_name" { value = module.eks.cluster_name }
output "rds_endpoint" { value = aws_db_instance.mysql.address }
output "efs_file_system_id" { value = aws_efs_file_system.uploads.id }
output "ecr_registry" { value = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.region}.amazonaws.com" }
output "ecr_repositories" { value = { for k, r in aws_ecr_repository.this : k => r.repository_url } }
output "app_secret_arn" { value = aws_secretsmanager_secret.app.arn }
output "external_secrets_role_arn" { value = module.external_secrets_irsa.iam_role_arn }
output "github_deployer_role_arn" { value = aws_iam_role.github_deployer.arn }
output "kubeconfig_command" { value = "aws eks update-kubeconfig --region ${var.region} --name ${module.eks.cluster_name}" }
