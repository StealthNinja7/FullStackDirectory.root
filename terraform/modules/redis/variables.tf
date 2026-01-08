variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "node_type" {
  type = string
}

variable "num_cache_clusters" {
  type = number
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "cache_security_group_id" {
  type = string
}

variable "tags" {
  type = map(string)
  default = {}
}
