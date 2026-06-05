---
name: image-generation
description: >-
  Generate AI images with corporate OpenAI or Gemini API credentials. Saves
  generated images to the workspace and returns markdown paths for display.
---

# Image Generation

Generate images using the `mcp__image__image_generate` MCP tool.

## When to Use

Use this skill when the user asks to:
- Create, generate, or make an image, illustration, icon, poster, banner,
  logo concept, product mockup, or visual asset
- Produce a picture from a text prompt
- Try OpenAI or Gemini image generation from inside Omni

## Prerequisites

Image generation requires corporate API key credentials:
- OpenAI: corporate `api_key` credential label `openai-api-key`
- Gemini: corporate `api_key` credential label `gemini-api-key`

If neither credential is configured, tell the user that the corporate has not
configured `openai-api-key` or `gemini-api-key`, so image generation is
unavailable until a corporate admin adds one in Corporate Settings.

## Workflow

Use `provider: "auto"` unless the user explicitly asks for OpenAI or Gemini.
Auto mode tries OpenAI first and falls back to Gemini when the OpenAI corporate
credential is missing.

```text
Tool: mcp__image__image_generate
Input:
  prompt: "A clean product mockup of a smart water bottle on a white desk"
  provider: "auto"        # auto, openai, gemini
  n: 1                    # 1-4
  output_filename: "water-bottle.png"
```

For OpenAI-specific controls:

```text
Tool: mcp__image__image_generate
Input:
  provider: "openai"
  prompt: "A square app icon for an AI developer assistant, no text"
  model: "gpt-image-1"
  size: "1024x1024"       # auto, 1024x1024, 1536x1024, 1024x1536
  quality: "high"         # auto, low, medium, high
  output_format: "png"    # png, jpeg, webp
  background: "auto"      # auto, transparent, opaque
```

For Gemini-specific controls:

```text
Tool: mcp__image__image_generate
Input:
  provider: "gemini"
  prompt: "A 16:9 cinematic image of a developer dashboard in a quiet office"
  model: "gemini-3.1-flash-image"
  aspect_ratio: "16:9"
  image_size: "1K"        # optional: 0.5K, 1K, 2K, 4K
```

## Displaying Results

The tool saves generated images inside the workspace and returns `relative_path`
and `markdown` fields. After a successful generation, show the image with the
returned markdown, for example:

```markdown
![Generated image](water-bottle.png)
```

Do not paste base64 image data into the chat.

## Error Handling

- If the tool reports that `openai-api-key` is missing, explain that OpenAI
  image generation is unavailable for this corporate until that credential is
  configured.
- If the tool reports that `gemini-api-key` is missing, explain that Gemini
  image generation is unavailable for this corporate until that credential is
  configured.
- If `provider: "auto"` reports both are missing, do not try another image
  provider. Tell the user which credential labels are required.
- If an API returns a policy, quota, or billing error, report the provider
  error and ask whether to adjust the prompt or use the other configured
  provider.
