insert into public.guides_library (id, creators, updated_at, updated_by)
values (
  'main',
  '[
    {
      "id": "bbp",
      "name": "BigBoiPinoy",
      "shortName": "BBP",
      "channelUrl": "https://www.youtube.com/@BigBoiPnoy",
      "description": "OG Relic Manipulation Guide Creator",
      "color": "amber",
      "videos": [
        {
          "id": "QrqPENtcFus",
          "title": "Relic Manipulation Changed?",
          "description": "Latest update on how relic manipulation works after patches",
          "featured": true
        },
        {
          "id": "swghREiYFPo",
          "title": "Relic Manipulation Weight Method",
          "description": "Relic Manipulation Weight Method Tips",
          "featured": false
        },
        {
          "id": "G0j3imbKw7M",
          "title": "How to Manipulate Relics",
          "description": "Original comprehensive guide on relic manipulation (8 months ago)",
          "featured": false
        }
      ]
    },
    {
      "id": "ciet",
      "name": "Ciet",
      "shortName": "Ciet",
      "channelUrl": "https://www.youtube.com/@iiciet",
      "description": "Svarog Tracer Creator & Developer",
      "color": "purple",
      "videos": [
        {
          "id": "nUUx7ur-yUY",
          "title": "Ultimate Guide: How to Use Svarog Tracer",
          "description": "Complete walkthrough of the Svarog Tracer site and all its features",
          "featured": true
        },
        {
          "id": "v6geY8A6L_s",
          "title": "Caverns Times Guide",
          "description": "how to use caverns times",
          "featured": false
        },
        {
          "id": "AzFPACZmHCY",
          "title": "New Kiyo Mode Guide",
          "description": "how to use kiyo mode new update",
          "featured": false
        },
        {
          "id": "oLe7R_fmM8o",
          "title": "New Changes on Site + Rolling Session",
          "description": "New changes on site + rolling session",
          "featured": false
        },
        {
          "id": "74IFhjLqwZA",
          "title": "Discord Bot Guide",
          "description": "How to use discord bot",
          "featured": false
        }
      ]
    }
  ]'::jsonb,
  now(),
  null
)
on conflict (id) do update
set creators = excluded.creators,
    updated_at = now(),
    updated_by = excluded.updated_by;
