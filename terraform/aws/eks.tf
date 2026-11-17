# Container orchestration: Amazon EKS (managed Kubernetes control plane).
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 21.29"

  cluster_name    = "${var.name}-${var.environment}"
  cluster_version = var.kubernetes_version

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  cluster_endpoint_public_access           = true
  enable_cluster_creator_admin_permissions = true
  enable_irsa                              = true

  # Encrypt Kubernetes Secrets at rest with a KMS key
  cluster_encryption_config = { resources = ["secrets"] }

  cluster_addons = {
    coredns                = {}
    kube-proxy             = {}
    vpc-cni                = { before_compute = true, configuration_values = jsonencode({ enableNetworkPolicy = "true" }) }
    eks-pod-identity-agent = {}
    aws-efs-csi-driver     = { service_account_role_arn = module.efs_csi_irsa.iam_role_arn }
  }

  eks_managed_node_groups = {
    default = {
      instance_types = var.node_instance_types
      min_size       = 1
      max_size       = 5
      desired_size   = var.node_desired_size
      capacity_type  = "ON_DEMAND"
    }
  }

  access_entries = merge(
    {
      github_deployer = {
        principal_arn = aws_iam_role.github_deployer.arn

        policy_associations = {
          campusfind = {
            policy_arn   = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSEditPolicy"
            access_scope = { type = "namespace", namespaces = ["campusfind"] }
          }
        }
      }
    },
    { for i, arn in var.cluster_admin_arns : "admin-${i}" => {
      principal_arn = arn

      policy_associations = {
        admin = {
          policy_arn   = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
          access_scope = { type = "cluster" }
        }
      }
    } }
  )
}
