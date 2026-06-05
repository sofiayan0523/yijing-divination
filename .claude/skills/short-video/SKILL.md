---
name: short-video
description: >-
  Generate short AI videos using Google Vertex AI (Veo). Supports text-to-video
  and image-to-video workflows with async generation, status polling, and
  automatic download to workspace.
---

# Short Video Generation

Generate short AI videos (up to 8 seconds) using Google Vertex AI Veo models.

## When to Use

Activate this skill when the user:
- Asks to **create**, **generate**, or **make** a video or short clip
- Wants to turn a **text description** into a video (text-to-video)
- Wants to **animate an image** or turn an image into a video (image-to-video)
- Asks for a **product demo video**, **social media clip**, or **promotional video**
- Mentions **Veo**, **AI video**, or **short-form video content**

## Prerequisites

This skill requires **GCP credentials** with Vertex AI API access configured in the Space settings. If the `mcp__video__*` tools are not available, inform the user that GCP credentials need to be configured first.

## Workflow (3-Step Async Process)

Video generation is asynchronous. Always follow this exact sequence:

### Step 1: Generate

Use `mcp__video__video_generate` to start a generation job.

```
Tool: mcp__video__video_generate
Input:
  prompt: "A golden retriever running on a beach at sunset, cinematic slow motion"
  model: "veo-3"           # Options: veo-2, veo-3, veo-3-fast, veo-3.1, veo-3.1-fast, veo-3.1-lite
  aspect_ratio: "16:9"     # Options: 16:9, 9:16, 1:1
  duration_seconds: 8      # Only 4, 6, or 8 seconds (default 8)
```

Returns an `operation_name` — save this for the next step.

### Step 2: Poll Status

Use `mcp__video__video_check_status` to check if the video is ready. Poll every 15-30 seconds. Generation typically takes 1-3 minutes.

```
Tool: mcp__video__video_check_status
Input:
  operation_name: "<from step 1>"
```

Returns `status: "running"` (keep polling) or `status: "completed"` (proceed to download).

### Step 3: Download

Use `mcp__video__video_download` to save the completed video to the workspace.

```
Tool: mcp__video__video_download
Input:
  operation_name: "<from step 1>"
  output_filename: "my_video.mp4"    # Optional, defaults to generated_video.mp4
```

The video file is saved to the workspace root directory.

## Displaying the Result

After downloading, show the video to the user using standard Markdown image syntax. The frontend automatically renders `.mp4` and `.webm` files as playable `<video>` elements with controls.

```markdown
![Video description](my_video.mp4)
```

**Always use a relative path** from the workspace root (no leading `/`).

## Model Selection Guide

| Model | Speed | Quality | Best For |
|-------|-------|---------|----------|
| `veo-3.1-fast` | Fastest | High | Quick previews, fast iterations |
| `veo-3-fast` | Fast | Good | Quick previews, iterations |
| `veo-3` | Medium | High | General purpose, recommended default |
| `veo-3.1` | Medium | Highest | Final production quality, native audio |
| `veo-3.1-lite` | Fast | Good | Cost-optimized generation |
| `veo-2` | Slow | Good | Legacy compatibility |

**Default recommendation**: Use `veo-3` for most requests. Use `veo-3.1` for highest quality with native audio. Use `veo-3.1-fast` or `veo-3-fast` when the user wants quick results or is iterating on prompts.

## Aspect Ratio Guide

| Ratio | Resolution | Best For |
|-------|------------|----------|
| `16:9` | Landscape | YouTube, presentations, desktop |
| `9:16` | Portrait | Instagram Reels, TikTok, YouTube Shorts |
| `1:1` | Square | Instagram feed, social media |

Ask the user which platform they are targeting if not specified. Default to `16:9` for general requests.

## Image-to-Video

To animate an existing image, include the `image_uri` parameter:

```
Tool: mcp__video__video_generate
Input:
  prompt: "The person in the photo waves and smiles at the camera"
  image_uri: "gs://bucket/image.jpg"    # Must be a GCS URI
  model: "veo-3"
  aspect_ratio: "16:9"
```

The image must be uploaded to Google Cloud Storage first. If the user provides a local image, help them upload it to GCS using `gsutil cp` before starting the video generation.

## Prompt Crafting Tips

Good video prompts are **descriptive and specific**. Include:

1. **Subject**: What is in the scene (person, animal, object, landscape)
2. **Action**: What is happening (running, rotating, zooming)
3. **Style**: Visual style (cinematic, anime, photorealistic, watercolor)
4. **Camera**: Camera movement (slow zoom, pan left, aerial shot, close-up)
5. **Lighting**: Lighting conditions (golden hour, neon lights, studio lighting)
6. **Mood**: Emotional tone (dramatic, peaceful, energetic)

### Example Prompts

- "A steaming cup of coffee on a wooden table, soft morning light streaming through a window, gentle steam rising, cozy atmosphere, close-up shot"
- "Aerial drone shot of a winding mountain road at sunset, cars passing below, golden clouds, cinematic color grading"
- "A 3D product shot of a sneaker rotating 360 degrees on a white pedestal, studio lighting, clean commercial look"

## Error Handling

- If `video_generate` fails with a credentials error, inform the user their GCP service account may not have Vertex AI API access enabled.
- If `video_check_status` returns `status: "failed"`, report the error message and suggest the user try a different prompt or model.
- If the generation seems stuck (>5 minutes), check status one more time and report to the user.

## GCS Storage (Optional)

To save videos directly to Google Cloud Storage instead of the workspace, use the `storage_uri` parameter:

```
Tool: mcp__video__video_generate
Input:
  prompt: "..."
  storage_uri: "gs://my-bucket/videos/"
  model: "veo-3"
```

When `storage_uri` is provided, the video is stored in GCS and `video_download` will download it from there.

## Limitations

- Maximum duration: 8 seconds per clip (only 4, 6, or 8 seconds supported)
- Audio: veo-3.1 and veo-3.1-fast generate native audio; other models produce silent video
- Image-to-video requires GCS URI (no local file paths)
- Generation takes 1-3 minutes per clip
- Subject to Vertex AI usage quotas and pricing
