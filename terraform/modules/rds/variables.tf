variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "instance_class" {
  type = string
}

variable "allocated_storage" {
  type = number
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "db_security_group_id" {
  type = string
}

variable "enable_monitoring" {
  type = bool
  default = true
}

variable "tags" {
  type = map(string)
  default = {}
}
