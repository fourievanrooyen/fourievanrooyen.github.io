# Fourie van Rooyen - Portfolio Website

A clean, professional single-page portfolio showcasing aerospace engineering projects and experience.

## Files Overview

```
portfolio/
├── index.html          # Main page (all content here)
├── style.css           # Styling (customize colors here)
├── README.md           # This file
├── profile.png         # Your profile photo
├── evtol.png           # Capstone project image
├── propeller.png       # A.A.E.R.O. project image
├── rocket.png          # Rocketry project image
├── simulation.png      # Drone simulation image
├── Fourie_Resume.pdf              # Your resume
├── Fourie_van_Rooyen_cover_letter.pdf
├── Letter_of_Recommendation.pdf
└── URCA_Poster_2025.pdf
```

## Quick Edits

### Change Colors
Open `style.css` and modify the CSS variables at the top (lines 20-40):

```css
:root {
  --color-primary: #00b4d8;        /* Main accent color */
  --color-bg-dark: #0a1628;        /* Dark background */
  --color-bg-main: #0d1f35;        /* Main background */
  /* etc... */
}
```

### Update Content
Open `index.html` and find the section you want to edit:

- **About**: Search for `id="about"`
- **Projects**: Search for `id="projects"`
- **Experience**: Search for `id="experience"`
- **Documents**: Search for `id="documents"`
- **Contact**: Search for `id="contact"`

### Add a New Project
Copy an existing project card in `index.html`:

```html
<article class="project-card">
  <div class="project-image">
    <img src="YOUR_IMAGE.png" alt="Project Name">
  </div>
  <div class="project-content">
    <span class="project-label">Organization • Role</span>
    <h3>Project Title</h3>
    <p>Brief description of the project.</p>
    <ul class="project-highlights">
      <li>Key achievement 1</li>
      <li>Key achievement 2</li>
    </ul>
    <div class="project-tags">
      <span>Tag1</span>
      <span>Tag2</span>
    </div>
  </div>
</article>
```

### Add Work Experience
Add a new timeline item:

```html
<div class="timeline-item">
  <div class="timeline-marker"></div>
  <div class="timeline-content">
    <div class="timeline-header">
      <h3>Job Title</h3>
      <span class="timeline-company">Company Name</span>
      <span class="timeline-date">Date Range</span>
    </div>
    <ul>
      <li>Responsibility 1</li>
      <li>Responsibility 2</li>
    </ul>
  </div>
</div>
```

### Update Skills
Find the skills section in `index.html` and add/remove skill tags:

```html
<span class="skill-tag">New Skill</span>
```

### Update Contact Info
Search for `id="contact"` and update the email, phone, LinkedIn, and GitHub links.

## Deployment

### GitHub Pages
1. Push all files to your GitHub repository
2. Go to Settings → Pages
3. Select "main" branch and click Save
4. Your site will be at: `https://yourusername.github.io/repository-name/`

### Other Hosting
Simply upload all files to your web host's public directory.

## Required Files
Make sure these images are in the same folder:
- `profile.png` - Your profile photo
- `evtol.png` - eVTOL project image
- `propeller.png` - Propeller project image
- `rocket.png` - Rocket project image
- `simulation.png` - Simulation project image

And these PDFs:
- `Fourie_Resume.pdf`
- `Fourie_van_Rooyen_cover_letter.pdf`
- `Letter_of_Recommendation.pdf`
- `URCA_Poster_2025.pdf`

## Color Theme Ideas

### Current (Aerospace Blue)
```css
--color-primary: #00b4d8;
--color-bg-dark: #0a1628;
```

### Alternative - Crimson (Alabama)
```css
--color-primary: #9e1b32;
--color-bg-dark: #1a0a0f;
```

### Alternative - Tech Green
```css
--color-primary: #00ff87;
--color-bg-dark: #0a1a14;
```

### Alternative - Gold Accent
```css
--color-primary: #ffd700;
--color-bg-dark: #1a1508;
```

---

Built with HTML, CSS, and vanilla JavaScript. No frameworks or build tools required.
