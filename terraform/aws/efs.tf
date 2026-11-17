# Shared file storage (ReadWriteMany) for uploaded images across API replicas.
resource "aws_efs_file_system" "uploads" {
  creation_token = "${var.name}-${var.environment}-uploads"
  encrypted      = true
  lifecycle_policy { transition_to_ia = "AFTER_30_DAYS" }
  tags = { Name = "${var.name}-${var.environment}-uploads" }
}

resource "aws_security_group" "efs" {
  name   = "${var.name}-${var.environment}-efs"
  vpc_id = module.vpc.vpc_id

  ingress {
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [module.eks.node_security_group_id]
  }
}

resource "aws_efs_mount_target" "uploads" {
  count           = length(local.azs)
  file_system_id  = aws_efs_file_system.uploads.id
  subnet_id       = module.vpc.private_subnets[count.index]
  security_groups = [aws_security_group.efs.id]
}

module "efs_csi_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 6.8"

  role_name             = "${var.name}-${var.environment}-efs-csi"
  attach_efs_csi_policy = true

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["kube-system:efs-csi-controller-sa"]
    }
  }
}
