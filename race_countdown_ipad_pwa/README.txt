TRACK COMPETITION PROGRAMME PLANNER - IPAD PWA

DEPLOY TO NETLIFY
1. Unzip this package.
2. Sign in to Netlify.
3. Open the Sites page and drag the entire unzipped folder into the deployment area.
4. Wait for deployment, then open the generated HTTPS address in Safari on the iPad.
5. In Safari, tap Share, choose Add to Home Screen, then tap Add.
6. Launch Race Planner from the new Home Screen icon.

FILES
- countdown.html: complete application and PWA entry point
- manifest.webmanifest: install metadata
- sw.js: offline application-shell caching
- icons/: iPad and PWA icons
- _redirects and netlify.toml: Netlify deployment configuration

NOTES
- The planner saves its state in localStorage on each device. Clearing Safari website data or removing the web app can remove that saved state.
- The main planner can work from the cached app shell after it has been opened once.
- PDF generation loads the html2pdf library from cdnjs, so the Download PDF feature requires network access unless that library has already been cached by the browser. Print remains available as a fallback.
- To publish an update, deploy the replacement files to the same Netlify site.
