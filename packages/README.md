# packages/

Place split configuration "packages" here.  Each `.yaml` file in this folder
is merged into the main configuration automatically thanks to the
`!include_dir_named packages` directive in `configuration.yaml`.

**Example — `packages/presence.yaml`**

```yaml
# packages/presence.yaml
zone:
  - name: Work
    latitude: !secret work_latitude
    longitude: !secret work_longitude
    radius: 200
    icon: mdi:briefcase

automation:
  - id: arrived_at_work
    alias: "Notify: Arrived at work"
    trigger:
      - platform: state
        entity_id: person.example_person
        to: Work
    action:
      - service: notify.mobile_app
        data:
          message: "You arrived at work."
```
