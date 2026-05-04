# www/

Files placed here are served by Home Assistant at the `/local/` URL path.

Use this folder for:
- Custom Lovelace card JavaScript files
- Images / icons referenced in your dashboard
- Any other static assets

**Example Lovelace resource reference** (in your dashboard YAML):

```yaml
resources:
  - url: /local/my-custom-card.js
    type: module
```
