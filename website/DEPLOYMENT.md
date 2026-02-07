# INOMAD KHURAL Investor Website - Deployment Guide

## 📍 Quick Start

Your investor presentation website is located at:
```
/Users/inomadinc/inomad-client/website/
```

## 🌐 Deployment Options

### Option 1: GitHub Pages (Recommended - Free)

1. **Create a new repository for the website:**
```bash
cd /Users/inomadinc/inomad-client/website
git init
git add .
git commit -m "Initial investor website"
```

2. **Push to GitHub:**
```bash
# Create a new repo on GitHub: https://github.com/new
# Then run:
git remote add origin https://github.com/Khongirad/inomad-website.git
git branch -M main
git push -u origin main
```

3. **Enable GitHub Pages:**
   - Go to repository Settings → Pages
   - Source: Deploy from a branch
   - Branch: main / (root)
   - Click Save

Your site will be live at: `https://khongirad.github.io/inomad-website/`

---

### Option 2: Netlify (Easiest - Free)

1. **Install Netlify CLI:**
```bash
npm install -g netlify-cli
```

2. **Deploy:**
```bash
cd /Users/inomadinc/inomad-client/website
netlify deploy
# Follow prompts: create new site, select ./website folder
# For production:
netlify deploy --prod
```

Your site will get a URL like: `https://inomad-khural.netlify.app/`

---

### Option 3: Vercel (Fast - Free)

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Deploy:**
```bash
cd /Users/inomadinc/inomad-client/website
vercel
# For production:
vercel --prod
```

Your site will get a URL like: `https://inomad-website.vercel.app/`

---

### Option 4: Custom Domain

After deploying to any platform above:

1. **Get a domain** (recommended: `inomad.life` or `khural.io`)
2. **Add DNS records:**
   - Go to your domain provider (Namecheap, GoDaddy, etc.)
   - Add CNAME or A records pointing to your hosting platform
3. **Update platform settings:**
   - Add custom domain in GitHub Pages/Netlify/Vercel settings

---

## 📁 Website Files

```
website/
├── index.html          # Main HTML structure
├── styles.css          # White & blue styling
├── script.js           # Smooth scrolling & animations
├── architecture.png    # System architecture diagram
└── metrics.png         # Project metrics visualization (optional)
```

---

## 🔧 Customization

### Update Contact Information
Edit `index.html` line ~328:
```html
<a href="mailto:your-email@inomad.life">your-email@inomad.life</a>
```

### Change Color Scheme
Edit `styles.css` lines 7-15:
```css
:root {
    --primary-blue: #0066FF;  /* Main blue color */
    --dark-blue: #0047B3;     /* Darker blue */
    --light-blue: #3385FF;    /* Lighter blue */
}
```

### Add Custom Domain
After deployment, update:
1. Platform settings (GitHub/Netlify/Vercel)
2. DNS records at domain provider

---

## ✅ Pre-Deployment Checklist

- [x] All content accurate and up-to-date
- [x] Images loading correctly
- [x] Navigation links working
- [x] Contact emails correct
- [x] GitHub repository link updated
- [ ] Choose hosting platform
- [ ] Deploy to production
- [ ] Test live website
- [ ] (Optional) Add custom domain
- [ ] (Optional) Add analytics

---

## 📊 Optional Enhancements

### Add Google Analytics
Add before `</head>` in index.html:
```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### Add Open Graph Tags
For better social media sharing, add to `<head>`:
```html
<meta property="og:title" content="INOMAD KHURAL - Digital Nation Infrastructure">
<meta property="og:description" content="Comprehensive blockchain platform for the Siberian Confederation">
<meta property="og:image" content="https://your-domain.com/preview-image.png">
<meta property="og:url" content="https://your-domain.com">
```

---

## 🚀 Deployment Commands Summary

**GitHub Pages:**
```bash
cd /Users/inomadinc/inomad-client/website
git init && git add . && git commit -m "Initial website"
git remote add origin https://github.com/Khongirad/inomad-website.git
git push -u origin main
# Then enable Pages in GitHub settings
```

**Netlify:**
```bash
cd /Users/inomadinc/inomad-client/website
netlify deploy --prod
```

**Vercel:**
```bash
cd /Users/inomadinc/inomad-client/website
vercel --prod
```

---

## 📞 Support

For questions or issues:
- Email: dev@inomad.life
- GitHub: https://github.com/Khongirad/INOMAD

---

*Deployment guide created February 5, 2026*
