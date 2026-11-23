# Genera los recursos gráficos a partir del logo azul original.
# Uso (PowerShell, desde la carpeta pre-analisis):  .\tools\procesar-logo.ps1 [ruta-logo.jpg]
# Salida en assets/: logo.png (cabecera), icon-64.png, icon-180.png, og-image.png (vista previa al compartir)
param([string]$Origen = "assets\logo-original-azul.jpg")
$ErrorActionPreference = "Stop"
$Raiz = Split-Path -Parent $PSScriptRoot
[System.IO.Directory]::SetCurrentDirectory($Raiz); Set-Location $Raiz
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System; using System.Drawing; using System.Drawing.Imaging; using System.Runtime.InteropServices;
public static class LogoTool {
  // Convierte la tinta del logo en un PNG monocromo (color de marca) con transparencia.
  public static Bitmap Ink(Bitmap src, Color brand, double bgLum, double inkLum, out Rectangle bbox, out int splitX) {
    int w = src.Width, h = src.Height;
    var outBmp = new Bitmap(w, h, PixelFormat.Format32bppArgb);
    var r = new Rectangle(0,0,w,h);
    var sd = src.LockBits(r, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    var od = outBmp.LockBits(r, ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
    byte[] s = new byte[sd.Stride*h]; byte[] o = new byte[od.Stride*h];
    Marshal.Copy(sd.Scan0, s, 0, s.Length);
    int minX=w,minY=h,maxX=0,maxY=0; int[] col = new int[w];
    for (int y=0;y<h;y++) for (int x=0;x<w;x++) {
      int i = y*sd.Stride + x*4;
      double lum = 0.114*s[i] + 0.587*s[i+1] + 0.299*s[i+2];
      double a = (bgLum - lum) / (bgLum - inkLum); if (a<0) a=0; if (a>1) a=1;
      byte A = (byte)Math.Round(a*255);
      o[i]=brand.B; o[i+1]=brand.G; o[i+2]=brand.R; o[i+3]=A;
      if (A > 40) { if(x<minX)minX=x; if(y<minY)minY=y; if(x>maxX)maxX=x; if(y>maxY)maxY=y; col[x]++; }
    }
    Marshal.Copy(o, 0, od.Scan0, o.Length);
    src.UnlockBits(sd); outBmp.UnlockBits(od);
    bbox = Rectangle.FromLTRB(minX, minY, maxX+1, maxY+1);
    // separación entre monograma y texto: hueco de columnas vacías más ancho en la mitad izquierda
    int best=0, bestStart=-1, run=0;
    for (int x=minX; x<minX+(maxX-minX)*6/10; x++) { if (col[x]==0) { run++; if (run>best){best=run; bestStart=x-run+1;} } else run=0; }
    splitX = bestStart>0 ? bestStart + best/2 : minX + (maxX-minX)/3;
    return outBmp;
  }
  public static Bitmap Crop(Bitmap b, Rectangle rc, int pad) {
    var rr = Rectangle.FromLTRB(Math.Max(0,rc.Left-pad), Math.Max(0,rc.Top-pad), Math.Min(b.Width,rc.Right+pad), Math.Min(b.Height,rc.Bottom+pad));
    return b.Clone(rr, PixelFormat.Format32bppArgb);
  }
  public static Bitmap Resize(Image b, int w, int h, Color? bg) {
    var o = new Bitmap(w, h, PixelFormat.Format32bppArgb);
    using (var g = Graphics.FromImage(o)) {
      g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
      g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.HighQuality;
      g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.HighQuality;
      if (bg.HasValue) g.Clear(bg.Value); else g.Clear(Color.Transparent);
      g.DrawImage(b, 0, 0, w, h);
    }
    return o;
  }
  // Coloca una imagen centrada en un lienzo cuadrado con margen
  public static Bitmap Square(Image b, int size, double padFrac, Color? bg) {
    var o = new Bitmap(size, size, PixelFormat.Format32bppArgb);
    using (var g = Graphics.FromImage(o)) {
      g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
      g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.HighQuality;
      if (bg.HasValue) g.Clear(bg.Value); else g.Clear(Color.Transparent);
      double avail = size*(1-2*padFrac); double sc = Math.Min(avail/b.Width, avail/b.Height);
      int w=(int)(b.Width*sc), h=(int)(b.Height*sc);
      g.DrawImage(b, (size-w)/2, (size-h)/2, w, h);
    }
    return o;
  }
}
"@

$brand = [System.Drawing.Color]::FromArgb(24, 68, 116)   # #184474, azul medido en el logo
$src = [System.Drawing.Bitmap]::FromFile((Resolve-Path $Origen))
$bbox = [System.Drawing.Rectangle]::Empty; $split = 0
$ink = [LogoTool]::Ink($src, $brand, 228.0, 60.0, [ref]$bbox, [ref]$split)
"bbox: $bbox  split: $split"

# 1) Logo horizontal completo (para cabecera), 2x para pantallas retina
$full = [LogoTool]::Crop($ink, $bbox, 6)
$W = 720; $H = [int]([double]$full.Height * $W / $full.Width)
$logo = [LogoTool]::Resize($full, $W, $H, $null); $logo.Save("assets\logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
"logo.png ${W}x${H}"

# 2) Monograma (icono)
$monoRect = [System.Drawing.Rectangle]::FromLTRB($bbox.Left, $bbox.Top, $split, $bbox.Bottom)
$mono = [LogoTool]::Crop($ink, $monoRect, 4)
$i64 = [LogoTool]::Square($mono, 64, 0.04, $null); $i64.Save("assets\icon-64.png", [System.Drawing.Imaging.ImageFormat]::Png)
$i180 = [LogoTool]::Square($mono, 180, 0.12, [System.Drawing.Color]::White); $i180.Save("assets\icon-180.png", [System.Drawing.Imaging.ImageFormat]::Png)

# 3) Imagen Open Graph 1200x630
$og = New-Object System.Drawing.Bitmap 1200, 630
$g = [System.Drawing.Graphics]::FromImage($og)
$g.SmoothingMode = 'HighQuality'; $g.InterpolationMode = 'HighQualityBicubic'; $g.TextRenderingHint = 'AntiAliasGridFit'
$g.Clear([System.Drawing.Color]::White)
$light = [System.Drawing.Color]::FromArgb(232, 238, 246)
$g.FillRectangle((New-Object System.Drawing.SolidBrush $light), 0, 560, 1200, 70)
$g.FillRectangle((New-Object System.Drawing.SolidBrush $brand), 0, 556, 1200, 4)
$lw = 560; $lh = [int]([double]$full.Height * $lw / $full.Width)
$g.DrawImage($full, [int]((1200 - $lw) / 2), 70, $lw, $lh)
$fTitle = New-Object System.Drawing.Font "Cambria", 50, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$fSub = New-Object System.Drawing.Font "Segoe UI", 27, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
$fBand = New-Object System.Drawing.Font "Segoe UI", 23, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
$sf = New-Object System.Drawing.StringFormat; $sf.Alignment = 'Center'
$ink2 = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(20, 36, 58))
$muted = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(74, 90, 110))
$y = 70 + $lh + 40
$g.DrawString("Pre-análisis financiero", $fTitle, (New-Object System.Drawing.SolidBrush $brand), (New-Object System.Drawing.RectangleF 0, $y, 1200, 70), $sf)
$g.DrawString("Ve tu situación con semáforos antes de nuestra reunión", $fSub, $ink2, (New-Object System.Drawing.RectangleF 0, ($y + 78), 1200, 40), $sf)
$g.DrawString("Anónimo  ·  De 3 a 10 minutos  ·  Tus respuestas no se guardan en ningún servidor", $fBand, $muted, (New-Object System.Drawing.RectangleF 0, 578, 1200, 40), $sf)
$g.Dispose()
$og.Save("assets\og-image.png", [System.Drawing.Imaging.ImageFormat]::Png)
"og-image.png 1200x630"
Get-ChildItem assets\*.png | Select Name, Length
