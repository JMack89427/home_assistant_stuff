# Home Assistant Configuration

This repository contains the complete Home Assistant configuration for my smart home setup.

## Structure

```
.
├── configuration.yaml      # Main entry-point — loads all other config files
├── automations.yaml        # Automation rules
├── scripts.yaml            # Reusable scripts
├── scenes.yaml             # Scene definitions
├── customize.yaml          # Entity customization (friendly names, icons, etc.)
├── secrets.yaml.example    # Template for secrets.yaml (the real file is git-ignored)
├── packages/               # Optional split configuration packages
├── custom_components/      # Custom integrations (HACS or hand-rolled)
└── www/                    # Files served at /local/ (Lovelace cards, images, etc.)
```

## Getting Started

1. **Copy `secrets.yaml.example` → `secrets.yaml`** and fill in your real values.
   `secrets.yaml` is listed in `.gitignore` and will never be committed.

2. **Check `configuration.yaml`** and adjust the settings marked with
   `# TODO` comments for your environment.

3. **Restart Home Assistant** after making changes:
   *Settings → System → Restart* (or `ha core restart` on the CLI).

## Updating

Pull the latest changes and restart Home Assistant:

```bash
git pull
ha core restart
```

## Contributing / Notes

- Keep secrets **out** of YAML files — use `!secret <key>` references instead.
- Put large, logically grouped blocks of config in the `packages/` folder so
  `configuration.yaml` stays readable.
- Custom Lovelace resources (JS cards, images) belong in `www/`.