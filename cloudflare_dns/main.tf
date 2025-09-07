resource "cloudflare_record" "render_cname" {
  zone_id = var.cf_zone_id
  name    = var.subdomain
  type    = "CNAME"
  value   = var.render_target
  proxied = var.proxied
  ttl     = 1
}
