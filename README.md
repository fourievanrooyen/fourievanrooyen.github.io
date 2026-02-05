# Fourie van Rooyen - Portfolio

A clean, dark-themed single-page portfolio inspired by Eliel Smith's design.

## Files

```
portfolio/
├── index.html              # Main page
├── style.css               # Styling
├── profile.png             # Your profile photo
├── evtol.png               # Capstone project image
├── propeller.png           # A.A.E.R.O. project image
├── rocket.png              # Rocketry project image
├── simulation.png          # Simulation project image
├── Fourie_Resume.pdf
├── Fourie_van_Rooyen_cover_letter.pdf
├── Letter_of_Recommendation.pdf
└── URCA_Poster_2025.pdf
```

## Customization

### Change Colors

Edit the CSS variables at the top of `style.css`:

```css
:root {
  /* Primary accent color */
  --accent: #00a8e8;           /* Your blue */
  --accent-hover: #00c2ff;
  
  /* Background colors */
  --bg-body: #0d1117;          /* Darkest */
  --bg-card: #1c2128;          /* Cards */
  
  /* Text colors */
  --text-primary: #e6edf3;     /* Main text */
  --text-secondary: #8b949e;   /* Muted text */
}
```

### Alternative Color Schemes

**Alabama Crimson:**
```css
--accent: #9e1b32;
--accent-hover: #c41e3a;
```

**Electric Purple:**
```css
--accent: #8b5cf6;
--accent-hover: #a78bfa;
```

**Teal:**
```css
--accent: #14b8a6;
--accent-hover: #2dd4bf;
```

### Edit Content

All content is in `index.html`. Key sections:

- **Hero**: `id="hero"` - Update tagline, title, subtitle
- **About**: `id="about"` - Edit bio, interests
- **Projects**: `id="projects"` - Add/remove project cards
- **Experience**: `id="experience"` - Update work history
- **Skills**: `id="skills"` - Modify skill tags
- **Education**: `id="education"` - Update coursework
- **Contact**: `id="contact"` - Update contact info

### Add a New Project

Copy this template inside `.projects-grid`:

```html
<article class="project-card" data-category="research">
  <div class="project-image">
    <img src="YOUR_IMAGE.png" alt="Project Name">
  </div>
  <h3>Project Title — Your Role</h3>
  <div class="project-meta">
    <span class="tag tag-sm">Category</span>
    <span class="project-date">Date Range</span>
  </div>
  <p>Brief description of the project.</p>
  <div class="tags">
    <span class="tag tag-sm">Tag1</span>
    <span class="tag tag-sm">Tag2</span>
  </div>
  <div class="project-actions">
    <button class="btn btn-sm btn-primary" onclick="toggleDetails(this)">Details</button>
    <a href="#contact" class="btn-link">Contact →</a>
  </div>
  <div class="project-details">
    <ul>
      <li>Detail 1</li>
      <li>Detail 2</li>
    </ul>
  </div>
</article>
```

### Project Categories

Projects can be filtered by category. Use `data-category`:
- `capstone` - Capstone projects
- `research` - Research/extracurricular
- `personal` - Personal projects

## Deployment

### GitHub Pages
1. Push all files to your repository
2. Go to Settings → Pages
3. Select branch and save
4. Site will be at: `https://username.github.io/repo-name/`

## Features

- ✓ Dark theme with blue accents
- ✓ Responsive design
- ✓ Project filtering
- ✓ Expandable project details
- ✓ Contact form (opens email client)
- ✓ Scroll animations
- ✓ Sticky navigation
- ✓ Mobile-friendly
