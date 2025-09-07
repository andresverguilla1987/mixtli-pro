output "public_ip"    { value = aws_eip.mixtli[0].public_ip  condition = var.associate_eip }
output "instance_ip"  { value = aws_instance.mixtli.public_ip }
output "instance_id"  { value = aws_instance.mixtli.id }
