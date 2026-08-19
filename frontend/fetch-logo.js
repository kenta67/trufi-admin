const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');

const iconsDir = path.join(__dirname, 'public', 'icons');

// Obtener la URL del logo desde el backend local
http.get('http://localhost:3000/api/settings', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const settings = JSON.parse(data);
      const logoUrl = settings.system_logo_url;
      
      if (!logoUrl) {
        console.error('No se encontró system_logo_url en las configuraciones.');
        return;
      }

      console.log('Descargando logo desde:', logoUrl);
      
      // Descargar la imagen
      https.get(logoUrl, (imgRes) => {
        const imgData = [];
        imgRes.on('data', chunk => imgData.push(chunk));
        imgRes.on('end', () => {
          const buffer = Buffer.concat(imgData);
          
          const sizes = ['72x72', '96x96', '128x128', '144x144', '152x152', '192x192', '384x384', '512x512'];
          sizes.forEach(size => {
            fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), buffer);
          });
          
          console.log('✅ Íconos PWA actualizados con el logo más reciente de Supabase.');
        });
      }).on('error', err => console.error('Error descargando imagen:', err.message));

    } catch (e) {
      console.error('Error parseando JSON de settings:', e);
    }
  });
}).on('error', err => {
  console.error('Error llamando al API:', err.message);
});
