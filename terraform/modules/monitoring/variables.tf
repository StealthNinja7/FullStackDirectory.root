variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "enable_enabled" {
  type = bool
  default = true
}

variable "eks_cluster_name" {
  type = string
}

variable "rds_instance_id" {
  type = string
}

variable "redis_cluster_id" {
  type = string
}

variable "tags" {
  type = map(string)
  default = {}
}
