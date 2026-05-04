# themes/

Place Lovelace theme YAML files here.  They are loaded automatically via the
`!include_dir_merge_named themes` directive in `configuration.yaml`.

**Example — `themes/dark_mode.yaml`**

```yaml
Dark Mode:
  primary-color: "#03a9f4"
  accent-color: "#ff9800"
  paper-card-background-color: "#1c1c1c"
  primary-background-color: "#121212"
  primary-text-color: "#e0e0e0"
```

After adding a theme file, reload themes in Home Assistant:
*Developer Tools → YAML → Reload themes* (or call the
`frontend.reload_themes` service).
