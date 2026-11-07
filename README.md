# Subtitle Pro

Subtitle Pro ni web app ya kutafsiri subtitle files (.srt, .vtt, .ass) kutoka lugha moja hadi nyingine kwa kutumia API za kutafsiri kutoka browser.

## Features
- Upload subtitle files
- Support for SRT, VTT, and ASS
- Language source and target selection
- Batch translation processing
- Download translated subtitle file
- Responsive modern UI

## Local development

Option 1: Python

```bash
cd sabtitle-app
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Deployment to GitHub

1. Create a new GitHub repository.
2. Push the project files:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

## Deployment to Render

This project is configured as a static site for Render.

### Steps
1. Log in to https://dashboard.render.com
2. Click "New" → "Static Site"
3. Connect your GitHub repository
4. Choose this project folder
5. Use the defaults
6. Deploy

Render will use the `render.yaml` file included in the project.

## Notes
- This app runs fully in the browser.
- Translation depends on third-party translation services.
- For production use, consider adding a backend proxy if you want more control, rate limiting, and API reliability.
